/*
 * Subtleway — popup controller
 * ----------------------------
 * Renders the controls, mirrors them into a live preview, and persists every
 * change to chrome.storage.local. The content script listens on storage and
 * repaints the real subtitles instantly, so there is no explicit "apply".
 */
(function () {
  'use strict';

  const { DEFAULT_SETTINGS, FONT_LABELS, PRESETS, computeTextStyle } = SUBTLEWAY;
  const STORAGE_KEY = 'subtleway:settings';

  let settings = Object.assign({}, DEFAULT_SETTINGS);
  let dragOn = false;

  const $ = (id) => document.getElementById(id);
  const app = document.querySelector('.app');

  // Controls that map 1:1 to a settings key.
  const RANGE_KEYS = [
    'fontSizePx', 'opacity', 'letterSpacing', 'lineHeight',
    'boxOpacity', 'boxPaddingX', 'offsetY', 'offsetX',
  ];
  const RANGE_SUFFIX = {
    fontSizePx: 'px', opacity: '%', letterSpacing: 'px', lineHeight: '',
    boxOpacity: '%', boxPaddingX: 'px', offsetY: 'px', offsetX: 'px',
  };
  const COLOR_KEYS = ['color', 'boxColor', 'edgeColor'];
  const SELECT_KEYS = ['fontFamily', 'edgeStyle', 'align'];
  const FLAG_KEYS = ['bold', 'italic', 'uppercase'];

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  function save() {
    chrome.storage.local.set({ [STORAGE_KEY]: settings });
    renderPreview();
  }

  function update(partial) {
    settings = Object.assign({}, settings, partial);
    save();
  }

  // ---------------------------------------------------------------------------
  // Preview
  // ---------------------------------------------------------------------------

  function renderPreview() {
    const span = $('previewText');
    const style = computeTextStyle(settings);
    Object.keys(style).forEach((k) => { span.style[k] = style[k]; });
    $('previewStage').style.opacity = settings.enabled ? '1' : '0.4';
    app.classList.toggle('disabled', !settings.enabled);
  }

  // ---------------------------------------------------------------------------
  // Render controls from current settings
  // ---------------------------------------------------------------------------

  function reflect() {
    $('enabled').checked = !!settings.enabled;

    RANGE_KEYS.forEach((k) => {
      const input = $(k);
      if (!input) return;
      input.value = settings[k];
      const badge = $(k + 'Val');
      if (badge) badge.textContent = settings[k] + (RANGE_SUFFIX[k] || '');
    });

    COLOR_KEYS.forEach((k) => { if ($(k)) $(k).value = settings[k]; });
    SELECT_KEYS.forEach((k) => { if ($(k)) $(k).value = settings[k]; });
    FLAG_KEYS.forEach((k) => {
      const btn = $(k);
      if (btn) btn.classList.toggle('active', !!settings[k]);
    });

    renderPreview();
  }

  // ---------------------------------------------------------------------------
  // Build dynamic controls
  // ---------------------------------------------------------------------------

  function buildFontOptions() {
    const sel = $('fontFamily');
    Object.keys(FONT_LABELS).forEach((key) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = FONT_LABELS[key];
      sel.appendChild(opt);
    });
  }

  function buildPresets() {
    const wrap = $('presets');
    Object.keys(PRESETS).forEach((key) => {
      const preset = PRESETS[key];
      const btn = document.createElement('button');
      btn.className = 'preset';
      btn.innerHTML = '<span>Aa</span><br>' + preset.label;
      // Give each preset chip a tiny taste of its own look.
      const s = Object.assign({}, DEFAULT_SETTINGS, preset.settings);
      const st = computeTextStyle(s);
      const chip = btn.querySelector('span');
      chip.style.color = st.color;
      chip.style.fontFamily = st.fontFamily;
      chip.style.textShadow = st.textShadow;
      chip.style.fontWeight = st.fontWeight;
      chip.style.fontSize = '20px';
      btn.addEventListener('click', () => {
        update(preset.settings);
        reflect();
      });
      wrap.appendChild(btn);
    });
  }

  // ---------------------------------------------------------------------------
  // Wire up inputs
  // ---------------------------------------------------------------------------

  function bindInputs() {
    $('enabled').addEventListener('change', (e) => {
      update({ enabled: e.target.checked });
    });

    RANGE_KEYS.forEach((k) => {
      const input = $(k);
      if (!input) return;
      input.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        const badge = $(k + 'Val');
        if (badge) badge.textContent = val + (RANGE_SUFFIX[k] || '');
        update({ [k]: val });
      });
    });

    COLOR_KEYS.forEach((k) => {
      const input = $(k);
      if (!input) return;
      input.addEventListener('input', (e) => update({ [k]: e.target.value }));
    });

    SELECT_KEYS.forEach((k) => {
      const sel = $(k);
      if (!sel) return;
      sel.addEventListener('change', (e) => update({ [k]: e.target.value }));
    });

    FLAG_KEYS.forEach((k) => {
      const btn = $(k);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const next = !settings[k];
        btn.classList.toggle('active', next);
        update({ [k]: next });
      });
    });

    $('resetPos').addEventListener('click', () => {
      update({ offsetX: 0, offsetY: 0 });
      reflect();
    });

    $('resetAll').addEventListener('click', () => {
      settings = Object.assign({}, DEFAULT_SETTINGS);
      save();
      reflect();
    });

    $('dragBtn').addEventListener('click', toggleDrag);

    $('trackSelect').addEventListener('change', (e) => {
      sendToTab({ type: 'subtleway:setTrack', trackId: e.target.value });
    });
  }

  // ---------------------------------------------------------------------------
  // Active-tab messaging (status, tracks, drag)
  // ---------------------------------------------------------------------------

  function withActiveTab(cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) cb(tabs[0]);
    });
  }

  function sendToTab(message, cb) {
    withActiveTab((tab) => {
      chrome.tabs.sendMessage(tab.id, message, (res) => {
        // Swallow "no receiving end" when not on a supported site.
        void chrome.runtime.lastError;
        if (cb) cb(res);
      });
    });
  }

  function setStatus(state, text) {
    const dot = $('statusDot');
    dot.className = 'dot' + (state ? ' ' + state : '');
    $('statusText').textContent = text;
  }

  function toggleDrag() {
    dragOn = !dragOn;
    $('dragBtn').classList.toggle('active', dragOn);
    $('dragBtn').textContent = dragOn ? '✓ Positioning…' : '⤢ Drag on screen';
    sendToTab({ type: 'subtleway:setDragMode', on: dragOn });
    if (dragOn) window.close(); // popup closing lets the user grab the subtitle
  }

  function loadStatus() {
    sendToTab({ type: 'subtleway:getStatus' }, (res) => {
      if (!res) {
        setStatus('off', 'Open Netflix or Prime Video to use Subtleway.');
        populateTracks(null);
        return;
      }
      setStatus('on', 'Connected to ' + res.platformLabel + '.');
      populateTracks(res);
    });
  }

  function populateTracks(res) {
    const sel = $('trackSelect');
    const note = $('langNote');
    sel.innerHTML = '';

    if (!res || !res.supportsTrackApi) {
      const opt = document.createElement('option');
      opt.textContent = res && res.platform === 'prime'
        ? 'Use the player’s own subtitle menu'
        : 'Not available here';
      sel.appendChild(opt);
      sel.disabled = true;
      note.textContent = res && res.platform === 'prime'
        ? 'Prime handles language in-player'
        : '';
      return;
    }

    if (!res.tracks || !res.tracks.length) {
      const opt = document.createElement('option');
      opt.textContent = 'Start playing a title first';
      sel.appendChild(opt);
      sel.disabled = true;
      note.textContent = '';
      return;
    }

    note.textContent = 'From your subscription';
    res.tracks.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.label + (t.isForced ? ' (forced)' : '');
      if (t.active) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.disabled = false;
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  function init() {
    buildFontOptions();
    buildPresets();
    bindInputs();
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      settings = Object.assign({}, DEFAULT_SETTINGS, data[STORAGE_KEY] || {});
      reflect();
    });
    loadStatus();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
