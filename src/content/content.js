/*
 * Subtleway — content script (isolated world)
 * -------------------------------------------
 * Injects a live stylesheet that restyles the streaming site's own subtitles,
 * keeps it in sync with saved settings, handles drag-to-reposition, and relays
 * language/track requests to the page-context bridge.
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

  function loadSettings() {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      settings = Object.assign({}, SUBTLEWAY.DEFAULT_SETTINGS, data[STORAGE_KEY] || {});
      applyStyles();
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEY]) {
      settings = Object.assign({}, SUBTLEWAY.DEFAULT_SETTINGS, changes[STORAGE_KEY].newValue || {});
      applyStyles();
      if (dragMode) refreshDragHandle();
    }
  });

  function saveSettings(partial) {
    settings = Object.assign({}, settings, partial);
    chrome.storage.local.set({ [STORAGE_KEY]: settings });
    applyStyles();
  }

  // ---------------------------------------------------------------------------
  // Drag-to-reposition
  // ---------------------------------------------------------------------------
  //
  // When drag mode is on we place an invisible catcher over the subtitle
  // container. Dragging updates offsetX/offsetY live and persists them.

  let handle = null;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let baseX = 0;
  let baseY = 0;

  function firstContainer() {
    for (const sel of adapter.containerSelectors) {
      const node = document.querySelector(sel);
      if (node) return node;
    }
    return null;
  }

  function refreshDragHandle() {
    const target = firstContainer();
    if (!target || !handle) return;
    const rect = target.getBoundingClientRect();
    handle.style.top = rect.top + 'px';
    handle.style.left = rect.left + 'px';
    handle.style.width = rect.width + 'px';
    handle.style.height = Math.max(rect.height, 48) + 'px';
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

  function enableDragMode() {
    if (dragMode) return;
    dragMode = true;
    handle = document.createElement('div');
    handle.id = 'subtleway-drag-handle';
    Object.assign(handle.style, {
      position: 'fixed', zIndex: '2147483647', cursor: 'grab',
      border: '2px dashed #e50914', borderRadius: '6px',
      background: 'rgba(229,9,20,0.08)', boxSizing: 'border-box',
    });
    const hint = document.createElement('div');
    hint.textContent = '⤢ Drag to position subtitles';
    Object.assign(hint.style, {
      position: 'absolute', top: '-26px', left: '50%', transform: 'translateX(-50%)',
      background: '#e50914', color: '#fff', font: '600 12px/1 "Helvetica Neue",Arial,sans-serif',
      padding: '5px 10px', borderRadius: '4px', whiteSpace: 'nowrap',
    });
    handle.appendChild(hint);
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
    document.body.appendChild(handle);
    refreshDragHandle();
    window.addEventListener('resize', refreshDragHandle, true);
    window.addEventListener('scroll', refreshDragHandle, true);
    // Follow the container as playback re-renders captions.
    dragRefreshTimer = setInterval(refreshDragHandle, 400);
  }

  let dragRefreshTimer = null;
  function disableDragMode() {
    dragMode = false;
    if (dragRefreshTimer) clearInterval(dragRefreshTimer);
    if (handle && handle.parentNode) handle.parentNode.removeChild(handle);
    handle = null;
    window.removeEventListener('resize', refreshDragHandle, true);
    window.removeEventListener('scroll', refreshDragHandle, true);
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
      // Fail open if the page bridge never answers.
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
        if (msg.on) enableDragMode();
        else disableDragMode();
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
})();
