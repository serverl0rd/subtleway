/*
 * Subtleway — background service worker (MV3)
 * -------------------------------------------
 * Seeds default settings on install so the very first popup open is populated.
 * Deliberately tiny: all live work happens in the content script + popup.
 */

const STORAGE_KEY = 'subtleway:settings';

const DEFAULT_SETTINGS = {
  enabled: true,
  fontFamily: 'default',
  fontSizePx: 30,
  color: '#ffffff',
  opacity: 100,
  bold: false,
  italic: false,
  uppercase: false,
  letterSpacing: 0,
  lineHeight: 1.35,
  boxColor: '#000000',
  boxOpacity: 45,
  boxPaddingX: 10,
  boxPaddingY: 2,
  boxRadius: 4,
  edgeStyle: 'dropshadow',
  edgeColor: '#000000',
  offsetX: 0,
  offsetY: 0,
  align: 'center',
};

chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.local.get(STORAGE_KEY);
  if (!existing[STORAGE_KEY]) {
    await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
  }
  if (details.reason === 'install') {
    // First-run: open the little welcome / usage page.
    chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/welcome.html') });
  }
});
