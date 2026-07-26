/*
 * Subtleway — page bridge (MAIN world)
 * ------------------------------------
 * Runs in the page's own JS context so it can reach the streaming player's
 * global API. It ONLY reads the subtitle tracks the user's legitimate account
 * already provides and switches between them — it never fetches, injects, or
 * shares external subtitle data.
 *
 * Talks to the isolated-world content script over window.postMessage.
 */
(function () {
  'use strict';

  function getNetflixPlayer() {
    try {
      const api = window.netflix.appContext.state.playerApp.getAPI().videoPlayer;
      const sessionIds = api.getAllPlayerSessionIds();
      const active = sessionIds.find((id) => /watch/.test(id)) || sessionIds[0];
      if (!active) return null;
      return api.getVideoPlayerBySessionId(active);
    } catch (_e) {
      return null;
    }
  }

  function listNetflixTracks() {
    const player = getNetflixPlayer();
    if (!player) return { supported: false, tracks: [] };
    try {
      const current = player.getTextTrack && player.getTextTrack();
      const list = (player.getTextTrackList && player.getTextTrackList()) || [];
      const tracks = list.map((t) => ({
        id: t.trackId != null ? String(t.trackId) : (t.displayName || ''),
        language: t.bcp47 || t.language || '',
        label: t.displayName || t.language || 'Off',
        isForced: !!t.isForcedNarrative,
        active: current && (t.trackId === current.trackId),
      }));
      return { supported: true, tracks };
    } catch (_e) {
      return { supported: false, tracks: [] };
    }
  }

  function setNetflixTrack(id) {
    const player = getNetflixPlayer();
    if (!player) return { ok: false };
    try {
      const list = (player.getTextTrackList && player.getTextTrackList()) || [];
      const match = list.find((t) => String(t.trackId) === String(id))
        || list.find((t) => (t.displayName || '') === id);
      if (!match) return { ok: false };
      player.setTextTrack(match);
      return { ok: true };
    } catch (_e) {
      return { ok: false };
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.source !== 'subtleway') return;

    let payload;
    if (msg.action === 'getTracks') {
      payload = listNetflixTracks();
    } else if (msg.action === 'setTrack') {
      payload = setNetflixTrack(msg.data && msg.data.id);
    } else {
      return;
    }

    window.postMessage(
      { source: 'subtleway-page', reqId: msg.reqId, payload },
      '*'
    );
  });
})();
