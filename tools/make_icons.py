#!/usr/bin/env python3
"""Generate Subtleway extension icons.

A Netflix-dark rounded tile framing a caption "screen". Inside, three subtitle
bars in the brand palette — Subway gold + green with a Netflix-red frame —
read clearly as "subtitles" even at 16px.
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "icons")
SIZES = [16, 32, 48, 128]

BG = (20, 20, 20, 255)        # Netflix #141414
SCREEN = (0, 0, 0, 255)
RED = (229, 9, 20, 255)       # Netflix #e50914
GOLD = (255, 198, 0, 255)     # Subway #ffc600
GREEN = (0, 150, 59, 255)     # Subway #00963b
WHITE = (255, 255, 255, 255)

S = 512  # master canvas, downscaled with LANCZOS


def make_master():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Rounded tile background.
    d.rounded_rectangle([8, 8, S - 8, S - 8], radius=112, fill=BG)

    # Caption "screen" with a red frame.
    sx0, sy0, sx1, sy1 = 74, 150, S - 74, S - 150
    d.rounded_rectangle([sx0, sy0, sx1, sy1], radius=40, fill=SCREEN,
                        outline=RED, width=14)

    # Three subtitle bars (gold, white, green) — centered.
    cx = S / 2
    bar_h = 34
    gap = 40
    widths = [(0.52, GOLD), (0.72, WHITE), (0.40, GREEN)]
    total = len(widths) * bar_h + (len(widths) - 1) * gap
    y = (sy0 + sy1) / 2 - total / 2
    for frac, color in widths:
        w = (sx1 - sx0 - 80) * frac
        x0 = cx - w / 2
        x1 = cx + w / 2
        d.rounded_rectangle([x0, y, x1, y + bar_h], radius=bar_h / 2, fill=color)
        y += bar_h + gap

    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    master = make_master()
    for size in SIZES:
        icon = master.resize((size, size), Image.LANCZOS)
        path = os.path.join(OUT, f"icon-{size}.png")
        icon.save(path)
        print("wrote", os.path.relpath(path))
    # Also keep the full-res master for the store listing.
    master.save(os.path.join(OUT, "icon-512.png"))
    print("wrote", os.path.relpath(os.path.join(OUT, "icon-512.png")))


if __name__ == "__main__":
    main()
