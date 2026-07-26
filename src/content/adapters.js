/*
 * Subtleway — platform adapters
 * -----------------------------
 * Each adapter knows how to recognise a streaming site and which DOM nodes
 * carry its subtitles. Selectors are intentionally broad so they survive the
 * frequent (hashed) class-name churn on these single-page apps.
 */
(function (root) {
  'use strict';

  const ADAPTERS = {
    netflix: {
      id: 'netflix',
      label: 'Netflix',
      matches: (host) => /(^|\.)netflix\.com$/.test(host),
      // The <span>s that actually hold caption text.
      textSelectors: [
        '.player-timedtext-text-container span',
        '.player-timedtext span',
      ],
      // The container we translate to reposition the whole caption block.
      containerSelectors: ['.player-timedtext'],
      alignSelectors: ['.player-timedtext-text-container'],
      // Netflix exposes a real subtitle-track API in page context.
      supportsTrackApi: true,
    },

    prime: {
      id: 'prime',
      label: 'Prime Video',
      matches: (host) =>
        /(^|\.)primevideo\.com$/.test(host) || /(^|\.)amazon\./.test(host),
      textSelectors: [
        '.atvwebplayersdk-captions-overlay span',
        '.atvwebplayersdk-captions-text',
      ],
      containerSelectors: ['.atvwebplayersdk-captions-overlay'],
      alignSelectors: ['.atvwebplayersdk-captions-overlay'],
      // Prime does not expose a stable programmatic track switcher — language
      // is changed through its own on-player subtitle menu.
      supportsTrackApi: false,
    },
  };

  /** Return the adapter for the current document, or null. */
  function detectAdapter(host) {
    const h = host || location.hostname;
    for (const key of Object.keys(ADAPTERS)) {
      if (ADAPTERS[key].matches(h)) return ADAPTERS[key];
    }
    return null;
  }

  root.SUBTLEWAY_ADAPTERS = { ADAPTERS, detectAdapter };
})(typeof globalThis !== 'undefined' ? globalThis : this);
