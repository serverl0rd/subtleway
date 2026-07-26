# Changelog

All notable changes to Subtleway are documented here.

## [1.1.0] — 2026

### Added
- **On-screen floating control** that appears with the player and auto-hides a
  few seconds after playback resumes (mirrors the native Netflix/Prime controls),
  opening a compact in-page panel for presets, colour, size, position and language.
- **Save / Done** control (and `Esc`) on the drag-to-position guide, so it can
  always be dismissed and is never left stuck on screen.
- The real **SUBTLEWAY** wordmark logo across the popup, welcome page, on-screen
  panel and marketing site.
- In-depth marketing landing page (`docs/index.html`).

### Changed
- The floating control only appears over the main player, not small browse-page
  preview videos.

## [1.0.0] — 2026

Initial release.

### Added
- Live subtitle restyling on **Netflix** and **Prime Video**.
- Text controls: colour, opacity, font family (7 styles), size, bold, italic,
  uppercase, letter spacing, line height.
- Background box: colour, opacity, padding.
- Edge & outline styles: none, drop shadow, outline, raised, depressed, glow.
- Positioning: vertical / horizontal sliders and **drag-to-place on screen**.
- Language / subtitle-track switching on Netflix via the player's own API
  (uses only the tracks your subscription provides).
- Five one-tap presets: Netflix, Cinema, High-contrast, Neon, Clean.
- Netflix-styled popup with a live preview.
- First-run welcome page.
- Local-only settings storage; no telemetry, no network calls.
