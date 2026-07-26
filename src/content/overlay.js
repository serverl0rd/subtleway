/*
 * Subtleway — on-page overlay (isolated world)
 * --------------------------------------------
 * A floating Subtleway button that behaves like the native player controls:
 * it fades in when the viewer moves the mouse or pauses, and fades out a few
 * seconds after playback resumes. Clicking it opens a compact on-screen panel
 * for the most-used controls, so viewers never have to leave the video.
 *
 * Relies on the API published by content.js at window.__SUBTLEWAY_CONTENT.
 */
(function () {
  'use strict';

  function boot() {
    const API = window.__SUBTLEWAY_CONTENT;
    if (!API || !API.adapter) return;

    const ICON_URL = chrome.runtime.getURL('assets/icons/icon-48.png');
    const WORDMARK_URL = chrome.runtime.getURL('assets/logo/wordmark.png');
    const PRESETS = SUBTLEWAY.PRESETS;
    let panelOpen = false;
    let hideTimer = null;

    // ---- Styles (scoped, self-contained) ----
    const style = document.createElement('style');
    style.textContent = `
      #sw-overlay-root { position: fixed; z-index: 2147483646; right: 24px; bottom: 92px;
        display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
        opacity: 0; transform: translateY(8px); pointer-events: none;
        transition: opacity .25s ease, transform .25s ease;
        font-family: "Netflix Sans","Helvetica Neue",Arial,sans-serif; }
      #sw-overlay-root.sw-visible { opacity: 1; transform: none; pointer-events: auto; }
      #sw-floater { width: 52px; height: 52px; border-radius: 50%; cursor: pointer;
        background: #141414 center/60% no-repeat; border: 2px solid #e50914;
        box-shadow: 0 6px 20px rgba(0,0,0,.55); display: flex; align-items: center;
        justify-content: center; transition: transform .15s ease; }
      #sw-floater:hover { transform: scale(1.08); }
      #sw-floater img { width: 30px; height: 30px; border-radius: 7px; }
      #sw-panel { width: 300px; background: #181818; border: 1px solid #333;
        border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,.7); overflow: hidden;
        display: none; color: #fff; }
      #sw-panel.sw-open { display: block; }
      .sw-head { display: flex; align-items: center; justify-content: space-between;
        padding: 12px 14px; border-bottom: 1px solid #2a2a2a; }
      .sw-brand-logo { height: 22px; width: auto; display: block; }
      .sw-x { background: none; border: none; color: #999; font-size: 20px; cursor: pointer; line-height: 1; }
      .sw-x:hover { color: #fff; }
      .sw-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 14px; }
      .sw-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
      .sw-row label { font-size: 13px; color: #ddd; }
      .sw-slider { -webkit-appearance: none; width: 150px; height: 4px; border-radius: 4px; background: #4d4d4d; }
      .sw-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 15px; height: 15px;
        border-radius: 50%; background: #e50914; cursor: pointer; }
      .sw-presets { display: flex; flex-wrap: wrap; gap: 6px; }
      .sw-preset { flex: 1 1 auto; min-width: 52px; padding: 7px 4px; border: 1px solid #333;
        border-radius: 6px; background: #000; color: #fff; font-size: 11px; cursor: pointer; }
      .sw-preset:hover { border-color: #e50914; }
      .sw-color { width: 40px; height: 26px; border: 1px solid #333; border-radius: 6px;
        overflow: hidden; padding: 0; background: none; cursor: pointer; }
      .sw-btn { flex: 1; padding: 8px; border: 1px solid #333; border-radius: 6px;
        background: #262626; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
      .sw-btn:hover { border-color: #666; }
      .sw-btn.red { background: #e50914; border-color: #e50914; }
      .sw-select { width: 100%; background: #262626; color: #fff; border: 1px solid #333;
        border-radius: 6px; padding: 7px; font-size: 12px; }
      .sw-toggle { position: relative; width: 42px; height: 24px; }
      .sw-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
      .sw-sw { position: absolute; inset: 0; background: #4d4d4d; border-radius: 24px; transition: .2s; }
      .sw-sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
        border-radius: 50%; background: #fff; transition: .2s; }
      .sw-toggle input:checked + .sw-sw { background: #e50914; }
      .sw-toggle input:checked + .sw-sw::after { transform: translateX(18px); }
      .sw-cap { font-size: 10px; letter-spacing: 1px; color: #777; text-transform: uppercase; font-weight: 700; }
      .sw-foot { padding: 8px 14px 12px; font-size: 10.5px; color: #777; text-align: center;
        border-top: 1px solid #2a2a2a; }
      .sw-foot b { color: #e50914; }
    `;
    document.documentElement.appendChild(style);

    // ---- DOM ----
    const root = document.createElement('div');
    root.id = 'sw-overlay-root';
    root.innerHTML = `
      <div id="sw-panel" role="dialog" aria-label="Subtleway controls">
        <div class="sw-head">
          <img class="sw-brand-logo" src="${WORDMARK_URL}" alt="Subtleway" />
          <button class="sw-x" id="sw-close" aria-label="Close">×</button>
        </div>
        <div class="sw-body">
          <div class="sw-row">
            <label>Subtleway</label>
            <span class="sw-toggle"><input type="checkbox" id="sw-enabled"><span class="sw-sw"></span></span>
          </div>
          <div>
            <div class="sw-cap" style="margin-bottom:6px">Presets</div>
            <div class="sw-presets" id="sw-presets"></div>
          </div>
          <div class="sw-row">
            <label>Colour</label>
            <input type="color" class="sw-color" id="sw-color">
          </div>
          <div class="sw-row">
            <label>Size</label>
            <input type="range" class="sw-slider" id="sw-size" min="12" max="72" step="1">
          </div>
          <div id="sw-lang-wrap" style="display:none">
            <div class="sw-cap" style="margin-bottom:6px">Language</div>
            <select class="sw-select" id="sw-lang"></select>
          </div>
          <div class="sw-row" style="gap:8px">
            <button class="sw-btn red" id="sw-drag">⤢ Position on screen</button>
            <button class="sw-btn" id="sw-reset" style="flex:0 0 auto">Reset</button>
          </div>
        </div>
        <div class="sw-foot">A free product by <b>BuildCraft Labs</b></div>
      </div>
      <div id="sw-floater" title="Subtleway"><img src="${ICON_URL}" alt="Subtleway"></div>
    `;
    document.body.appendChild(root);

    const $ = (id) => root.querySelector(id);
    const panel = $('#sw-panel');
    const floater = $('#sw-floater');

    // ---- Visibility (mirror native controls) ----
    function videoEl() {
      const vids = Array.from(document.querySelectorAll('video'));
      return vids.sort((a, b) => (b.clientWidth * b.clientHeight) - (a.clientWidth * a.clientHeight))[0] || null;
    }
    function isPlaying() { const v = videoEl(); return v && !v.paused && !v.ended && v.readyState > 2; }
    // Only surface over the real player, not small browse-page preview videos.
    function bigVideo() {
      const v = videoEl();
      if (!v) return null;
      const r = v.getBoundingClientRect();
      return (r.width * r.height) > (window.innerWidth * window.innerHeight * 0.35) ? v : null;
    }
    function show() {
      if (!bigVideo()) return;
      root.classList.add('sw-visible');
      clearTimeout(hideTimer);
      if (!panelOpen && isPlaying()) hideTimer = setTimeout(hide, 3500);
    }
    function hide() { if (!panelOpen) root.classList.remove('sw-visible'); }

    let lastMove = 0;
    document.addEventListener('mousemove', () => {
      const now = Date.now();
      if (now - lastMove > 150) { lastMove = now; show(); }
    }, true);
    // Media events don't bubble but are delivered in the capture phase.
    document.addEventListener('pause', show, true);
    document.addEventListener('play', show, true);
    document.addEventListener('seeking', show, true);

    // Keep visible across fullscreen and re-mount inside the fullscreen element.
    document.addEventListener('fullscreenchange', () => {
      (document.fullscreenElement || document.body).appendChild(root);
      show();
    }, true);

    // ---- Panel wiring ----
    function openPanel() { panelOpen = true; panel.classList.add('sw-open'); show(); }
    function closePanel() { panelOpen = false; panel.classList.remove('sw-open'); show(); }
    floater.addEventListener('click', () => (panelOpen ? closePanel() : openPanel()));
    $('#sw-close').addEventListener('click', closePanel);

    // Presets
    const presetsWrap = $('#sw-presets');
    Object.keys(PRESETS).forEach((key) => {
      const b = document.createElement('button');
      b.className = 'sw-preset';
      b.textContent = PRESETS[key].label;
      b.addEventListener('click', () => API.saveSettings(PRESETS[key].settings));
      presetsWrap.appendChild(b);
    });

    // Controls -> settings
    $('#sw-enabled').addEventListener('change', (e) => API.saveSettings({ enabled: e.target.checked }));
    $('#sw-color').addEventListener('input', (e) => API.saveSettings({ color: e.target.value }));
    $('#sw-size').addEventListener('input', (e) => API.saveSettings({ fontSizePx: Number(e.target.value) }));
    $('#sw-reset').addEventListener('click', () => API.saveSettings({ offsetX: 0, offsetY: 0 }));
    $('#sw-drag').addEventListener('click', () => {
      closePanel();           // get the panel out of the way
      API.setDragMode(true);  // drag handle has its own Save/Done control
    });

    // Language (Netflix)
    const langWrap = $('#sw-lang-wrap');
    const langSel = $('#sw-lang');
    langSel.addEventListener('change', (e) => API.callPageBridge('setTrack', { id: e.target.value }));
    function refreshTracks() {
      if (!API.adapter.supportsTrackApi) { langWrap.style.display = 'none'; return; }
      API.callPageBridge('getTracks').then((res) => {
        const tracks = (res && res.tracks) || [];
        if (!tracks.length) { langWrap.style.display = 'none'; return; }
        langWrap.style.display = 'block';
        langSel.innerHTML = '';
        tracks.forEach((t) => {
          const o = document.createElement('option');
          o.value = t.id;
          o.textContent = t.label + (t.isForced ? ' (forced)' : '');
          if (t.active) o.selected = true;
          langSel.appendChild(o);
        });
      });
    }

    // Reflect current settings into the panel (and stay in sync with the popup).
    function reflect(s) {
      $('#sw-enabled').checked = !!s.enabled;
      $('#sw-color').value = s.color;
      $('#sw-size').value = s.fontSizePx;
      $('#sw-drag').textContent = API.isDragMode() ? '✓ Positioning…' : '⤢ Position on screen';
    }
    API.onChange.push(reflect);
    reflect(API.getSettings());
    refreshTracks();

    // Refresh tracks whenever the panel is opened (title may have changed).
    floater.addEventListener('click', () => { if (panelOpen) refreshTracks(); });
  }

  // content.js may initialise slightly after us; wait for its ready signal.
  if (window.__SUBTLEWAY_CONTENT && window.__SUBTLEWAY_CONTENT.ready) boot();
  else document.addEventListener('subtleway:ready', boot, { once: true });
})();
