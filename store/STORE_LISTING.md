# Chrome Web Store — submission kit

Everything you need to paste into the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
Upload package: **`subtleway.zip`** (built by `python3 tools/package.py`).

---

## Item listing

**Title**
> Subtleway — Subtitle Control for Netflix & Prime

**Summary** (max 132 chars)
> Live subtitle control for Netflix & Prime Video: colour, font, size, outline, position & language. Free by BuildCraft Labs.

**Category:** Entertainment  (alternative: Accessibility)
**Language:** English

**Detailed description**
```
Take the wheel on your subtitles.

Subtleway gives you instant, intuitive control over the subtitles on Netflix and
Prime Video — and every change appears on screen live, with no "apply" button.

WHAT YOU CAN DO
• Colour & opacity — pick any subtitle colour
• Font — seven clean, readable font styles
• Size — from subtle to big-screen readable
• Style — bold, italic, UPPERCASE, letter spacing, line height
• Background box — colour, opacity and padding behind the text
• Outline & edge — drop shadow, outline, raised, depressed or glow
• Position — vertical & horizontal sliders, or drag the subtitles anywhere on screen
• Language — switch subtitle track on Netflix using the tracks your own account provides
• Presets — Netflix, Cinema, High-contrast, Neon, Clean
• Live preview right in the popup

PRIVATE BY DESIGN
Subtleway collects nothing and sends nothing anywhere. Your preferences are stored
locally on your device. No analytics, no tracking, no accounts.

IMPORTANT
Subtleway works with your own legitimate subscription only. It simply restyles the
subtitles the service already displays to you and switches between the subtitle
tracks your account already includes. It does NOT enable, encourage, or support
piracy, account sharing, or bypassing any paid service, and it does not download,
host, or inject external subtitle content or defeat any content protection.

Netflix, Prime Video and Amazon are trademarks of their respective owners.
Subtleway is an independent project and is not affiliated with, endorsed by, or
sponsored by any of them.

A free product by BuildCraft Labs.
```

---

## Single purpose

> Subtleway has one purpose: to let viewers customise the appearance and on-screen
> position of the subtitles shown by Netflix and Prime Video, and to switch between
> the subtitle tracks their own subscription already provides.

---

## Permission justifications

| Permission | Justification |
|---|---|
| `storage` | Save the user's subtitle appearance preferences locally on their device so they persist between sessions. No data leaves the device. |
| Host access to `*.netflix.com` | Run the content script that restyles and repositions the subtitles Netflix renders, and read/switch subtitle tracks through Netflix's own player API. |
| Host access to `*.primevideo.com` and `*.amazon.*` | Run the content script that restyles and repositions the subtitles Prime Video renders. Prime Video is served under primevideo.com and regional amazon.* domains, so those hosts are required for the feature to work. |
| Remote code | **Not used.** All code is contained in the package. |

---

## Data usage disclosures (Privacy practices tab)

- **Does this item collect user data?** → the honest answer is **No**.
  Subtleway stores only styling preferences, locally, via `chrome.storage`, and
  transmits nothing.
- Certify: does **not** sell/transfer data to third parties; does **not** use data
  for unrelated purposes; does **not** use data for creditworthiness/lending.
- **Privacy policy URL:** host `PRIVACY.md` and paste the link. Quickest options:
  - Enable **GitHub Pages** (Settings → Pages) and link the rendered file, or
  - Use the direct file URL, e.g.
    `https://github.com/serverl0rd/subtleway/blob/main/PRIVACY.md`
    (make sure the branch you point at actually contains the file).

---

## Graphics assets (already generated, in `store/`)

| Asset | Size | File |
|---|---|---|
| Store icon | 128×128 | `assets/icons/icon-128.png` |
| Screenshot 1 | 1280×800 | `store/screenshots/screenshot-1.png` |
| Screenshot 2 | 1280×800 | `store/screenshots/screenshot-2.png` |
| Screenshot 3 | 1280×800 | `store/screenshots/screenshot-3.png` |
| Small promo tile | 440×280 | `store/promo-tile-440x280.png` |

(At least one screenshot is required; the promo tile is optional but recommended.)

---

## Submission steps

1. Create/sign in to the Developer Dashboard and pay the one-time **US$5** fee.
2. Click **Add new item** and upload `subtleway.zip`.
3. Fill in the listing fields above; upload the icon, screenshots and promo tile.
4. Complete the **Privacy practices** tab (permission justifications + data
   disclosures + privacy-policy URL).
5. Choose visibility (Public, Unlisted, or Private) and distribution regions.
6. **Submit for review.** First reviews typically take from a few hours to a few
   business days.

> Reviewer-facing note you can add in the "Notes for reviewer" box: *"Subtleway is
> purely cosmetic. It restyles the captions the streaming site already renders and,
> on Netflix, switches between the subtitle tracks the user's own subscription
> exposes via the player's public API. It downloads no subtitle content and
> circumvents no content protection."*
