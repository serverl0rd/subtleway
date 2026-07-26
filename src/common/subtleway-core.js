/*
 * Subtleway — shared core
 * ------------------------
 * Single source of truth for the settings schema, presets, and the functions
 * that turn a settings object into real CSS. Loaded in BOTH the content script
 * (isolated world) and the popup, so styling logic never drifts between the
 * live subtitles and the popup preview.
 *
 * This file is a plain script (no ES modules) so it can be shared verbatim by
 * a manifest content_scripts entry and by a <script src> tag in the popup.
 * Everything hangs off the global `SUBTLEWAY`.
 */
(function (root) {
  'use strict';

  /** Default settings applied on first run and by "Reset all". */
  const DEFAULT_SETTINGS = {
    enabled: true,
    // Text
    fontFamily: 'default',
    fontSizePx: 30,
    color: '#ffffff',
    opacity: 100,
    bold: false,
    italic: false,
    uppercase: false,
    letterSpacing: 0,
    lineHeight: 1.35,
    // Background box
    boxColor: '#000000',
    boxOpacity: 45,
    boxPaddingX: 10,
    boxPaddingY: 2,
    boxRadius: 4,
    // Edge / outline
    edgeStyle: 'dropshadow', // none | dropshadow | outline | raised | depressed | glow
    edgeColor: '#000000',
    // Position
    offsetX: 0, // px, right is positive
    offsetY: 0, // px, up is positive
    align: 'center', // left | center | right
  };

  /** Curated font stacks. No font files are bundled — all are system-safe. */
  const FONT_FAMILIES = {
    default: '"Netflix Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    sans: 'Arial, Helvetica, "Segoe UI", sans-serif',
    serif: 'Georgia, "Times New Roman", Times, serif',
    mono: '"SF Mono", "Courier New", Courier, monospace',
    rounded: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    condensed: '"Arial Narrow", "Roboto Condensed", "Bebas Neue", sans-serif',
    casual: '"Comic Sans MS", "Comic Neue", "Chalkboard SE", cursive',
  };

  const FONT_LABELS = {
    default: 'Netflix Sans',
    sans: 'Sans-serif',
    serif: 'Serif',
    mono: 'Monospace',
    rounded: 'Rounded',
    condensed: 'Condensed',
    casual: 'Casual',
  };

  /** One-tap looks. Each is a partial that gets merged over the current text. */
  const PRESETS = {
    netflix: {
      label: 'Netflix',
      settings: {
        color: '#ffffff', fontFamily: 'default', fontSizePx: 30,
        boxOpacity: 0, edgeStyle: 'dropshadow', edgeColor: '#000000',
        bold: false, uppercase: false, letterSpacing: 0,
      },
    },
    cinema: {
      label: 'Cinema',
      settings: {
        color: '#f5c518', fontFamily: 'serif', fontSizePx: 34,
        boxOpacity: 0, edgeStyle: 'outline', edgeColor: '#000000',
        bold: false, uppercase: false, letterSpacing: 0.3,
      },
    },
    contrast: {
      label: 'High contrast',
      settings: {
        color: '#ffffff', fontFamily: 'sans', fontSizePx: 32,
        boxColor: '#000000', boxOpacity: 95, boxPaddingX: 14, boxPaddingY: 4,
        edgeStyle: 'none', bold: true,
      },
    },
    neon: {
      label: 'Neon',
      settings: {
        color: '#39ff14', fontFamily: 'rounded', fontSizePx: 32,
        boxOpacity: 0, edgeStyle: 'glow', edgeColor: '#00b3ff', bold: true,
      },
    },
    clean: {
      label: 'Clean',
      settings: {
        color: '#ffffff', fontFamily: 'sans', fontSizePx: 28,
        boxOpacity: 0, edgeStyle: 'none', bold: false, letterSpacing: 0,
      },
    },
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** #rrggbb + 0..100 alpha -> rgba() string. */
  function hexToRgba(hex, alphaPercent) {
    const clean = String(hex || '#000000').replace('#', '');
    const full = clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16) || 0;
    const g = parseInt(full.slice(2, 4), 16) || 0;
    const b = parseInt(full.slice(4, 6), 16) || 0;
    const a = Math.max(0, Math.min(100, Number(alphaPercent))) / 100;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  /** Build the text-shadow declaration for a given edge style. */
  function edgeShadow(edgeStyle, edgeColor) {
    const c = edgeColor || '#000000';
    switch (edgeStyle) {
      case 'none':
        return 'none';
      case 'outline':
        // Solid outline in every direction.
        return [
          `-1.5px -1.5px 0 ${c}`, `1.5px -1.5px 0 ${c}`,
          `-1.5px 1.5px 0 ${c}`, `1.5px 1.5px 0 ${c}`,
          `0 -1.5px 0 ${c}`, `0 1.5px 0 ${c}`,
          `-1.5px 0 0 ${c}`, `1.5px 0 0 ${c}`,
        ].join(', ');
      case 'raised':
        return `1px 1px 0 ${c}, 2px 2px 2px rgba(0,0,0,0.6)`;
      case 'depressed':
        return `-1px -1px 0 ${c}, -2px -2px 2px rgba(0,0,0,0.6)`;
      case 'glow':
        return `0 0 6px ${c}, 0 0 12px ${c}, 0 0 20px ${c}`;
      case 'dropshadow':
      default:
        return '2px 2px 4px rgba(0,0,0,0.9)';
    }
  }

  /**
   * Compute the set of CSS declarations for the subtitle TEXT itself.
   * Returned as a plain object of camelCase -> value so it can be applied to a
   * DOM element's .style (popup preview) or serialised into a rule (content).
   */
  function computeTextStyle(s) {
    const settings = Object.assign({}, DEFAULT_SETTINGS, s || {});
    const font = FONT_FAMILIES[settings.fontFamily] || FONT_FAMILIES.default;
    const box = Number(settings.boxOpacity) > 0
      ? hexToRgba(settings.boxColor, settings.boxOpacity)
      : 'transparent';

    return {
      color: hexToRgba(settings.color, settings.opacity),
      fontFamily: font,
      fontSize: settings.fontSizePx + 'px',
      fontWeight: settings.bold ? '700' : '400',
      fontStyle: settings.italic ? 'italic' : 'normal',
      textTransform: settings.uppercase ? 'uppercase' : 'none',
      letterSpacing: settings.letterSpacing + 'px',
      lineHeight: String(settings.lineHeight),
      textShadow: edgeShadow(settings.edgeStyle, settings.edgeColor),
      backgroundColor: box,
      padding: settings.boxPaddingY + 'px ' + settings.boxPaddingX + 'px',
      borderRadius: settings.boxRadius + 'px',
      boxDecorationBreak: 'clone',
      WebkitBoxDecorationBreak: 'clone',
    };
  }

  /** camelCase -> kebab-case for CSS property names. */
  function kebab(prop) {
    return prop.replace(/([A-Z])/g, '-$1').replace(/^Webkit/, '-webkit')
      .replace(/^ms/, '-ms').toLowerCase();
  }

  /**
   * Serialise a style object into `prop: value !important;` declarations.
   * `!important` is essential — the platforms set their subtitle styles inline,
   * and only an important stylesheet rule can beat a non-important inline style.
   */
  function toImportantDeclarations(styleObj) {
    return Object.keys(styleObj)
      .map((prop) => `  ${kebab(prop)}: ${styleObj[prop]} !important;`)
      .join('\n');
  }

  /**
   * Build the full stylesheet string for a platform adapter.
   * `adapter` provides { textSelectors: [], containerSelectors: [], alignSelectors: [] }.
   */
  function buildStylesheet(s, adapter) {
    const settings = Object.assign({}, DEFAULT_SETTINGS, s || {});
    if (!settings.enabled) return '';

    const textDecl = toImportantDeclarations(computeTextStyle(settings));
    const rules = [];

    if (adapter.textSelectors && adapter.textSelectors.length) {
      rules.push(`${adapter.textSelectors.join(',\n')} {\n${textDecl}\n}`);
    }

    // Reposition the whole subtitle container (moves text without touching the
    // platform's own layout maths). Up is positive, so Y is negated.
    if (adapter.containerSelectors && adapter.containerSelectors.length) {
      const translate = `translate(${settings.offsetX}px, ${-settings.offsetY}px)`;
      rules.push(
        `${adapter.containerSelectors.join(',\n')} {\n` +
        `  transform: ${translate} !important;\n` +
        `  transition: transform 0.08s linear !important;\n}`
      );
    }

    // Horizontal alignment of the text block.
    if (adapter.alignSelectors && adapter.alignSelectors.length) {
      const justify = settings.align === 'left' ? 'flex-start'
        : settings.align === 'right' ? 'flex-end' : 'center';
      const textAlign = settings.align;
      rules.push(
        `${adapter.alignSelectors.join(',\n')} {\n` +
        `  justify-content: ${justify} !important;\n` +
        `  text-align: ${textAlign} !important;\n}`
      );
    }

    return rules.join('\n\n');
  }

  root.SUBTLEWAY = {
    DEFAULT_SETTINGS,
    FONT_FAMILIES,
    FONT_LABELS,
    PRESETS,
    hexToRgba,
    edgeShadow,
    computeTextStyle,
    buildStylesheet,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
