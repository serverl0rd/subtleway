# Subtleway v1.0.0

**Ride your subtitles your way.** The first release of Subtleway — a free
**BuildCraft Labs** Chrome extension (Manifest V3) for live subtitle control on
**Netflix** and **Prime Video**.

## Highlights
- 🎨 **Live restyling** — colour, opacity, 7 fonts, size, bold / italic / UPPERCASE, letter spacing, line height
- 🟦 **Background box** — colour, opacity, padding
- ✏️ **Outline & edge** — drop shadow, outline, raised, depressed, glow
- 📍 **Positioning** — vertical / horizontal sliders **and** drag-to-place on screen
- 🌐 **Language** — Netflix subtitle-track switching via the player's own API (your subscription's own tracks)
- 🎬 **Presets** — Netflix, Cinema, High-contrast, Neon, Clean
- ⚡ Netflix-styled popup with a live preview; local-only settings, no telemetry

## Install (unpacked)
1. Download `subtleway.zip` (below) and unzip it, **or** clone the repo.
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select the folder.
4. Open Netflix or Prime Video, turn subtitles on, and click the Subtleway icon.

## Chrome Web Store
A ready-to-submit listing kit (copy, screenshots, promo tile, permission
justifications, data-disclosure answers) is in [`store/STORE_LISTING.md`](../store/STORE_LISTING.md).
Build the upload ZIP with `python3 tools/package.py`.

## Disclaimer
Subtleway works with your **own legitimate subscription only**. It restyles the
subtitles a service already displays and switches between the tracks your account
already includes. It does not enable or support piracy, account sharing, or
bypassing any paid service, and downloads/injects no external subtitle content.
Not affiliated with Netflix, Amazon/Prime Video, or Subway.

---
_A free product by BuildCraft Labs._
