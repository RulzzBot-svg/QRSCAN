#!/usr/bin/env python3
"""Build home-screen icons from the AFC mark on brand blue."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
MARK = PUBLIC / "afc-mark-bw.png"
BG = (10, 77, 140, 255)  # #0A4D8C
# Stay inside Android maskable safe zone (~80% of the square).
FILL = 0.72


def white_mark(path):
    gray = Image.open(path).convert("L")
    rgba = Image.new("RGBA", gray.size)
    src = gray.load()
    dst = rgba.load()
    for y in range(gray.height):
        for x in range(gray.width):
            ink = 255 - src[x, y]
            if ink < 16:
                dst[x, y] = (255, 255, 255, 0)
            else:
                dst[x, y] = (255, 255, 255, ink)
    bbox = rgba.getbbox()
    return rgba.crop(bbox) if bbox else rgba


def make_icon(mark, size, fill=FILL):
    canvas = Image.new("RGBA", (size, size), BG)
    ratio = min((size * fill) / mark.width, (size * fill) / mark.height)
    nw = max(1, int(mark.width * ratio))
    nh = max(1, int(mark.height * ratio))
    placed = mark.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.alpha_composite(placed, ((size - nw) // 2, (size - nh) // 2))
    return canvas.convert("RGB")


def main():
    mark = white_mark(MARK)
    sizes = {
        "pwa-512x512.png": 512,
        "pwa-192x192.png": 192,
        "apple-touch-icon.png": 180,
    }
    for name, size in sizes.items():
        make_icon(mark, size).save(PUBLIC / name, "PNG", optimize=True)
        print(f"wrote {name} ({size}x{size})")

    favicon = make_icon(mark, 48)
    favicon.save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print("wrote favicon.ico")
    colors = Image.open(PUBLIC / "pwa-512x512.png").getcolors(100000)
    if not colors or len(colors) < 8:
        raise SystemExit("pwa-512x512.png looks empty or solid; expected the AFC mark")


if __name__ == "__main__":
    main()
