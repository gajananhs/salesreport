#!/usr/bin/env python3
"""Generate the PWA icon set for Sales Reporter.

Usage:  python3 scripts/generate-icons.py
Needs:  Pillow  (pip install pillow)

Writes PNGs into public/assets/icons/. The mark is a rising trend line
ending in an amber dot, set inside a thin amber arc on the deep-green
brand background (same palette as the app: --deep #16302C, --amber #D9A22C,
--cream #FAF7F0).
"""
from pathlib import Path
from PIL import Image, ImageDraw

DEEP = (22, 48, 44, 255)
DEEP_2 = (31, 63, 57, 255)
AMBER = (217, 162, 44, 255)
CREAM = (250, 247, 240, 255)

OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "icons"
SS = 4  # supersampling factor for smooth edges


def gradient(size):
    img = Image.new("RGBA", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(int(DEEP[i] + (DEEP_2[i] - DEEP[i]) * t) for i in range(3)) + (255,)
    return img


def draw_mark(draw, size, safe):
    """Draw the mark inside a centred square of side `safe` (px)."""
    c = size / 2
    r = safe / 2
    # amber arc (open at bottom-left, like a dial)
    w = max(2, int(safe * 0.045))
    draw.arc([c - r, c - r, c + r, c + r], start=200, end=520 - 30, fill=AMBER, width=w)
    # trend line
    pts = [(-0.55, 0.32), (-0.18, -0.02), (0.08, 0.18), (0.48, -0.30)]
    pts = [(c + x * r, c + y * r) for x, y in pts]
    lw = max(3, int(safe * 0.075))
    draw.line(pts, fill=CREAM, width=lw, joint="curve")
    for p in pts[:-1]:
        draw.ellipse([p[0] - lw / 2, p[1] - lw / 2, p[0] + lw / 2, p[1] + lw / 2], fill=CREAM)
    d = safe * 0.11
    ex, ey = pts[-1]
    draw.ellipse([ex - d, ey - d, ex + d, ey + d], fill=AMBER)


def make(size, maskable=False, rounded=True):
    big = size * SS
    bg = gradient(big)
    mask = Image.new("L", (big, big), 0)
    md = ImageDraw.Draw(mask)
    if maskable or not rounded:
        md.rectangle([0, 0, big, big], fill=255)
    else:
        md.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * 0.22), fill=255)
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    img.paste(bg, (0, 0), mask)
    draw = ImageDraw.Draw(img)
    # maskable icons must keep content inside the central 80% safe zone
    safe = big * (0.50 if maskable else 0.62)
    draw_mark(draw, big, safe)
    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    make(192).save(OUT / "icon-192.png")
    make(512).save(OUT / "icon-512.png")
    make(512, maskable=True).save(OUT / "icon-512-maskable.png")
    make(192, maskable=True).save(OUT / "icon-192-maskable.png")
    make(180, rounded=False).save(OUT / "apple-touch-icon.png")
    make(32).save(OUT / "favicon-32.png")
    make(16).save(OUT / "favicon-16.png")
    print("Icons written to", OUT)


if __name__ == "__main__":
    main()
