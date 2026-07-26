# Subtleway

**Ride your subtitles your way.**

Subtleway is a free Chrome extension that gives you live, intuitive control over
the subtitles on **Netflix** and **Prime Video** — colour, font, size, outline,
background, position, and language — with every change applied on screen
instantly.

A free product by **BuildCraft Labs**.

---

## ✨ Features

| | |
|---|---|
| 🎨 **Colour** | Any text colour + adjustable opacity |
| 🔤 **Font** | Seven curated, system-safe font styles |
| 📏 **Size** | 12–72px, live |
| 🅱️ **Style** | Bold, italic, UPPERCASE, letter spacing, line height |
| 🟦 **Background box** | Colour, opacity and padding behind the text |
| ✏️ **Edge & outline** | Drop shadow, outline, raised, depressed, glow |
| 📍 **Position** | Vertical / horizontal sliders **and drag-to-place on screen** |
| 🌐 **Language** | Switch subtitle track on Netflix using your own subscription |
| ⚡ **Live** | No “apply” button — everything updates as you tune it |
| 🎬 **Presets** | Netflix, Cinema, High-contrast, Neon, Clean |

Everything is stored locally with `chrome.storage` and re-applied automatically
as titles change or you move between episodes.

---

## 🚀 Install (developer / unpacked)

Subtleway is a standard, unbundled Manifest V3 extension — no build step.

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome (or any Chromium browser).
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** and select the repository folder.
5. Pin **Subtleway** to your toolbar.
6. Open Netflix or Prime Video, turn subtitles on in the player, then click the
   Subtleway icon and start tuning.

> The extension only ever runs on Netflix and Amazon/Prime Video pages — see the
> `host_permissions` in [`manifest.json`](manifest.json).

---

## 🧭 How it works

- A **content script** injects a small stylesheet that restyles the subtitle
  nodes the streaming site already renders. Because streaming players set their
  caption styles inline, Subtleway uses `!important` rules so your preferences
  win — without touching the video or the player’s own layout logic.
- **Positioning** translates the whole caption container, so text moves smoothly
  without breaking the platform’s centering maths. “Drag on screen” lets you
  grab the subtitles and drop them anywhere.
- **Language** on Netflix uses the player’s own public track API
  (`getTextTrackList` / `setTextTrack`) from the page context — it simply
  switches between the subtitle tracks **your account already provides**. On
  Prime Video, language is changed through the player’s built-in subtitle menu.

```
src/
├── common/subtleway-core.js   # settings schema + CSS builder (shared)
├── content/adapters.js        # per-platform detection & selectors
├── content/content.js         # injects styles, drag mode, messaging
├── content/page-bridge.js     # Netflix track API (runs in page context)
├── background/service-worker.js
└── popup/                      # Netflix-styled control panel
```

---

## 🎛️ The panel

The popup is styled in a familiar streaming-app dark theme with a live preview
so you can see your look before you even hit play. Adjust any control and the
subtitles on the tab update immediately.

---

## ⚖️ Disclaimer

**Subtleway works with your own legitimate subscription only.** It restyles the
subtitles a service already displays to you and switches between the subtitle
tracks your account already includes.

Subtleway does **not** enable, encourage, or support piracy, account sharing, or
bypassing any paid service in any way. It does not download, host, redistribute,
or inject external subtitle content, and it does not remove or defeat any
content protection. Please support creators with a genuine subscription.

Netflix, Prime Video, Amazon, and Subway are trademarks of their respective
owners. Subtleway is an independent project and is not affiliated with,
endorsed by, or sponsored by any of them.

---

## 📄 License

Released under the [MIT License](LICENSE).

## 🔒 Privacy

Subtleway collects nothing and sends nothing anywhere. See [PRIVACY.md](PRIVACY.md).

---

<p align="center"><sub>Built with ☕ by <b>BuildCraft Labs</b></sub></p>
