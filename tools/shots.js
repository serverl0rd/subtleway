// Generate 1280x800 Chrome Web Store listing screenshots.
const { chromium } = require('playwright-core');
const path = require('path');

const REPO = path.join(__dirname, '..');
const promoUrl = 'file://' + path.join(REPO, 'store', 'promo.html');
const OUT = path.join(REPO, 'store', 'screenshots');

// Three variants: headline, scene-caption text, and the caption's inline style.
const VARIANTS = [
  {
    file: 'screenshot-1.png',
    hl: 'Your subtitles, <span class="accent">your way.</span>',
    sub: 'Colour, font, size, outline and position — changed live on Netflix &amp; Prime Video.',
    caption: 'This is exactly how your subtitles will look.',
    style: { color: '#ffffff', fontSize: '38px', fontWeight: '400',
             textShadow: '2px 2px 4px rgba(0,0,0,0.9)', fontFamily: 'Arial, sans-serif' },
  },
  {
    file: 'screenshot-2.png',
    hl: 'Big, bold, <span class="accent">readable.</span>',
    sub: 'Boost size, add an outline, pick your colour — no more squinting at tiny captions.',
    caption: 'Every word, crystal clear.',
    style: { color: '#f5c518', fontSize: '46px', fontWeight: '700',
             textShadow: '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 -1.5px 0 #000, 0 1.5px 0 #000, -1.5px 0 0 #000, 1.5px 0 0 #000',
             fontFamily: 'Georgia, serif' },
  },
  {
    file: 'screenshot-3.png',
    hl: 'Drag them <span class="accent">anywhere.</span>',
    sub: 'One-tap presets, a live preview, and drag-to-place positioning right on the screen.',
    caption: 'Put the subtitles where you want them.',
    style: { color: '#39ff14', fontSize: '40px', fontWeight: '700',
             textShadow: '0 0 6px #00b3ff, 0 0 12px #00b3ff, 0 0 20px #00b3ff',
             fontFamily: '"Trebuchet MS", sans-serif' },
  },
];

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--force-device-scale-factor=1'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Stub chrome.* for the popup iframe (addInitScript applies to every frame).
  await page.addInitScript(() => {
    const store = {};
    window.chrome = {
      runtime: { lastError: null },
      storage: {
        local: {
          get: (key, cb) => cb({ [key]: store[key] }),
          set: (obj, cb) => { Object.assign(store, obj); cb && cb(); },
        },
        onChanged: { addListener: () => {} },
      },
      tabs: {
        query: (_q, cb) => cb([{ id: 1 }]),
        sendMessage: (_id, msg, cb) => {
          if (msg.type === 'subtleway:getStatus') {
            cb({ platform: 'netflix', platformLabel: 'Netflix', supportsTrackApi: true,
                 tracks: [
                   { id: '1', label: 'English', active: true },
                   { id: '2', label: 'English [CC]' },
                   { id: '3', label: 'Spanish' },
                 ] });
          } else { cb && cb({ ok: true }); }
        },
      },
    };
  });

  await page.goto(promoUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });

  for (const v of VARIANTS) {
    await page.evaluate((vv) => {
      document.getElementById('hl').innerHTML = vv.hl;
      document.getElementById('sub').innerHTML = vv.sub;
      const cap = document.getElementById('caption');
      cap.textContent = vv.caption;
      Object.assign(cap.style, vv.style);
    }, v);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, v.file) });
    console.log('wrote store/screenshots/' + v.file);
  }

  await browser.close();
})();
