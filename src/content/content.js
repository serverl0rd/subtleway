/*
 * Subtleway — content script (isolated world)
 * -------------------------------------------
 * Injects a live stylesheet that restyles the streaming site's own subtitles,
 * keeps it in sync with saved settings, handles drag-to-reposition (with an
 * on-screen Save/Done control), and relays language/track requests to the
 * page-context bridge.
 *
 * Exposes a small API on window.__SUBTLEWAY_CONTENT so the on-page overlay
 * (overlay.js, same isolated world) can drive the same settings + drag logic.
 */
(function () {
  'use strict';

  const { detectAdapter } = SUBTLEWAY_ADAPTERS;
  const adapter = detectAdapter();
  if (!adapter) return; // Not a supported streaming site.

  const STYLE_ID = 'subtleway-injected-style';
  const STORAGE_KEY = 'subtleway:settings';
  let settings = Object.assign({}, SUBTLEWAY.DEFAULT_SETTINGS);
  let dragMode = false;

  // Shared API for overlay.js (and anything else in this isolated world).
  const API = (window.__SUBTLEWAY_CONTENT = {
    adapter,
    getSettings: () => Object.assign({}, settings),
    saveSettings,
    isDragMode: () => dragMode,
    setDragMode: (on) => (on ? enableDragMode() : disableDragMode()),
    callPageBridge,
    onChange: [], // listeners notified whenever settings change
  });

  // ---------------------------------------------------------------------------
  // Stylesheet injection
  // ---------------------------------------------------------------------------

  function ensureStyleEl() {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      el.setAttribute('data-subtleway', 'true');
      (document.head || document.documentElement).appendChild(el);
    }
    return el;
  }

  function applyStyles() {
    const el = ensureStyleEl();
    el.textContent = settings.enabled
      ? SUBTLEWAY.buildStylesheet(settings, adapter)
      : '';
  }

  // The SPA can tear down and rebuild <head>; keep our style alive.
  const headObserver = new MutationObserver(() => {
    if (!document.getElementById(STYLE_ID)) applyStyles();
  });
  headObserver.observe(document.documentElement, { childList: true, subtree: true });

  // ---------------------------------------------------------------------------
  // Settings load + live sync
  // ---------------------------------------------------------------------------

  function notifyChange() {
    API.onChange.forEach((fn) => { try { fn(Object.assign({}, settings)); } catch (_e) {} });
  }

  function loadSettings() {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      settings = Object.assign({}, SUBTLEWAY.DEFAULT_SETTINGS, data[STORAGE_KEY] || {});
      applyStyles();
      notifyChange();
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEY]) {
      settings = Object.assign({}, SUBTLEWAY.DEFAULT_SETTINGS, changes[STORAGE_KEY].newValue || {});
      applyStyles();
      if (dragMode) refreshDragHandle();
      notifyChange();
    }
  });

  function saveSettings(partial) {
    settings = Object.assign({}, settings, partial);
    chrome.storage.local.set({ [STORAGE_KEY]: settings });
    applyStyles();
    notifyChange();
  }

  // ---------------------------------------------------------------------------
  // Drag-to-reposition (with an on-screen Save/Done control)
  // ---------------------------------------------------------------------------

  let handle = null;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let baseX = 0;
  let baseY = 0;
  let dragRefreshTimer = null;

  function firstContainer() {
    for (const sel of adapter.containerSelectors) {
      const node = document.querySelector(sel);
      if (node) return node;
    }
    return null;
  }

  function dragParent() {
    // In fullscreen, fixed elements outside the fullscreen node are invisible,
    // so mount inside it.
    return document.fullscreenElement || document.body;
  }

  function refreshDragHandle() {
    if (!handle) return;
    const target = firstContainer();
    const rect = target
      ? target.getBoundingClientRect()
      : { top: window.innerHeight * 0.6, left: window.innerWidth * 0.2,
          width: window.innerWidth * 0.6, height: 60 };
    handle.style.top = rect.top + 'px';
    handle.style.left = rect.left + 'px';
    handle.style.width = Math.max(rect.width, 120) + 'px';
    handle.style.height = Math.max(rect.height, 52) + 'px';
  }

  function onPointerMove(e) {
    if (!dragging) return;
    saveSettings({
      offsetX: Math.round(baseX + (e.clientX - startX)),
      offsetY: Math.round(baseY - (e.clientY - startY)), // up = positive
    });
    refreshDragHandle();
  }

  function onPointerUp() {
    dragging = false;
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && dragMode) {
      e.preventDefault();
      disableDragMode();
    }
  }

  function enableDragMode() {
    if (dragMode) return;
    dragMode = true;

    handle = document.createElement('div');
    handle.id = 'subtleway-drag-handle';
    Object.assign(handle.style, {
      position: 'fixed', zIndex: '2147483647', cursor: 'grab',
      border: '2px dashed #e50914', borderRadius: '6px',
      background: 'rgba(229,9,20,0.08)', boxSizing: 'border-box',
      touchAction: 'none',
    });

    // Toolbar with instructions + a Save/Done button so the user is never stuck.
    const bar = document.createElement('div');
    Object.assign(bar.style, {
      position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap',
      background: '#141414', border: '1px solid #333', color: '#fff',
      font: '600 12px/1 "Helvetica Neue",Arial,sans-serif',
      padding: '7px 8px 7px 12px', borderRadius: '8px',
      boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
    });
    const label = document.createElement('span');
    label.textContent = '⤢ Drag the subtitles — then Save';
    label.style.opacity = '0.85';
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '✓ Save';
    Object.assign(saveBtn.style, {
      background: '#e50914', color: '#fff', border: 'none', borderRadius: '5px',
      padding: '6px 12px', font: '700 12px/1 "Helvetica Neue",Arial,sans-serif',
      cursor: 'pointer',
    });
    const stop = (e) => { e.stopPropagation(); };
    saveBtn.addEventListener('pointerdown', stop);
    saveBtn.addEventListener('click', (e) => { stop(e); disableDragMode(); });
    bar.addEventListener('pointerdown', stop); // clicks on the bar never start a drag
    bar.appendChild(label);
    bar.appendChild(saveBtn);
    handle.appendChild(bar);

    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      baseX = settings.offsetX;
      baseY = settings.offsetY;
      handle.style.cursor = 'grabbing';
      document.addEventListener('pointermove', onPointerMove, true);
      document.addEventListener('pointerup', onPointerUp, true);
      e.preventDefault();
    });

    dragParent().appendChild(handle);
    refreshDragHandle();
    window.addEventListener('resize', refreshDragHandle, true);
    window.addEventListener('scroll', refreshDragHandle, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('fullscreenchange', reparentHandle, true);
    dragRefreshTimer = setInterval(refreshDragHandle, 400);
  }

  function reparentHandle() {
    if (handle) { dragParent().appendChild(handle); refreshDragHandle(); }
  }

  function disableDragMode() {
    if (!dragMode) return;
    dragMode = false;
    if (dragRefreshTimer) clearInterval(dragRefreshTimer);
    dragRefreshTimer = null;
    if (handle && handle.parentNode) handle.parentNode.removeChild(handle);
    handle = null;
    window.removeEventListener('resize', refreshDragHandle, true);
    window.removeEventListener('scroll', refreshDragHandle, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('fullscreenchange', reparentHandle, true);
    notifyChange();
  }

  // ---------------------------------------------------------------------------
  // Language / track bridge (page context)
  // ---------------------------------------------------------------------------

  const pendingTrackRequests = new Map();
  let trackReqId = 0;

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.source !== 'subtleway-page') return;
    const pending = pendingTrackRequests.get(msg.reqId);
    if (pending) {
      pendingTrackRequests.delete(msg.reqId);
      pending(msg.payload);
    }
  });

  function callPageBridge(action, data) {
    return new Promise((resolve) => {
      if (!adapter.supportsTrackApi) {
        resolve({ supported: false, tracks: [] });
        return;
      }
      const reqId = ++trackReqId;
      pendingTrackRequests.set(reqId, resolve);
      window.postMessage({ source: 'subtleway', action, reqId, data }, '*');
      setTimeout(() => {
        if (pendingTrackRequests.has(reqId)) {
          pendingTrackRequests.delete(reqId);
          resolve({ supported: false, tracks: [] });
        }
      }, 1500);
    });
  }

  // ---------------------------------------------------------------------------
  // Popup messaging
  // ---------------------------------------------------------------------------

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg && msg.type) {
      case 'subtleway:getStatus':
        callPageBridge('getTracks').then((res) => {
          sendResponse({
            platform: adapter.id,
            platformLabel: adapter.label,
            supportsTrackApi: adapter.supportsTrackApi,
            tracks: (res && res.tracks) || [],
          });
        });
        return true; // async

      case 'subtleway:setTrack':
        callPageBridge('setTrack', { id: msg.trackId }).then((res) => {
          sendResponse(res || { ok: false });
        });
        return true;

      case 'subtleway:setDragMode':
        API.setDragMode(!!msg.on);
        sendResponse({ ok: true, dragMode });
        return false;

      default:
        return false;
    }
  });

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  loadSettings();
  API.ready = true;
  document.dispatchEvent(new CustomEvent('subtleway:ready'));
})();
