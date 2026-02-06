"""Generate QR codes with an embedded logo for printing.

Usage:
  python generate_qr_label.py --value "https://example.com/abc" --logo path/to/logo.png --out qr_with_logo.png --size 600 --format png

This script creates a high-resolution PNG or an SVG QR code with the provided logo overlaid
using error correction level H. SVG is preferred for vector output (logo will be embedded as raster).

Dependencies (add to requirements.txt): segno, Pillow
"""
import argparse
import os
from pathlib import Path
import sys

import segno
from PIL import Image

# for DB access when generating for all AHUs
from app import create_app
from models import AHU
from db import db


def make_qr_svg(value: str, out_path: str, error: str = 'h', border: int = 4):
    qr = segno.make(value, error=error)
    qr.save(out_path, kind='svg', xmldecl=False)
    print(f"Wrote SVG QR to {out_path}")


def make_qr_png(value: str, out_path: str, scale: int = 10, border: int = 4, error: str = 'h'):
    qr = segno.make(value, error=error)
    qr.save(out_path, kind='png', scale=scale, border=border)
    print(f"Wrote PNG QR to {out_path}")


def overlay_logo_on_png(qr_png_path: str, logo_path: str, out_path: str, logo_ratio: float = 0.18, padding: int = 6):
    """Overlay `logo_path` centered on `qr_png_path` and save to `out_path`.

    - logo_ratio: fraction of QR width for logo (0.18 = 18%)
    - padding: white padding (px) around logo to improve contrast
    """
    qr = Image.open(qr_png_path).convert('RGBA')
    logo = Image.open(logo_path).convert('RGBA')

    w, h = qr.size
    logo_w = int(w * logo_ratio)
    # maintain aspect ratio
    logo_h = int(logo_w * (logo.height / logo.width))
    logo = logo.resize((logo_w, logo_h), Image.LANCZOS)

    # optional white background to improve contrast
    bg = Image.new('RGBA', (logo_w + padding * 2, logo_h + padding * 2), (255, 255, 255, 255))
    bg.paste(logo, (padding, padding), logo)

    # paste centered
    pos = ((w - bg.width) // 2, (h - bg.height) // 2)
    qr.paste(bg, pos, bg)
    qr.save(out_path)
    print(f"Wrote QR+logo PNG to {out_path}")


def generate(args):
    tmp_png = None
    out_path = Path(args.out)

    if args.format.lower() == 'svg':
        # create svg; if logo provided we rasterize temporarily to PNG and overlay, then save PNG instead
        if args.logo:
            # render a large temporary PNG then overlay logo
            tmp_png = out_path.with_suffix('.tmp.png')
            make_qr_png(args.value, str(tmp_png), scale=args.scale, border=args.border, error=args.error)
            overlay_logo_on_png(str(tmp_png), args.logo, str(out_path))
            tmp_png.unlink(missing_ok=True)
        else:
            make_qr_svg(args.value, str(out_path), error=args.error, border=args.border)
    else:
        # PNG flow: generate PNG then overlay logo if requested
        tmp_png = out_path if not args.logo else out_path.with_suffix('.tmp.png')
        make_qr_png(args.value, str(tmp_png), scale=args.scale, border=args.border, error=args.error)
        if args.logo:
            overlay_logo_on_png(str(tmp_png), args.logo, str(out_path), logo_ratio=args.logo_ratio, padding=args.padding)
            if tmp_png != out_path:
                tmp_png.unlink(missing_ok=True)


def find_default_logo():
    # look for commonly named logo files relative to this script
    candidates = [
        Path(__file__).parent / 'afc_logo.png',
        Path(__file__).parent / 'logo.png',
        Path(__file__).parent / '..' / 'assets' / 'afc_logo.png',
        Path(__file__).parent / '..' / 'assets' / 'logo.png',
    ]
    for p in candidates:
        if p.exists():
            return str(p)
    return None


def generate_for_all_ahus(args):
    # create app context and query AHUs
    app = create_app()
    with app.app_context():
        ahus = AHU.query.all()

    # determine base URL
    base = args.base_url or os.getenv('QR_BASE_URL') or 'https://qrscan-8ql2.onrender.com'

    out_path = Path(args.out)
    # if out path is a directory, ensure it exists
    if out_path.exists() and not out_path.is_dir():
        print(f"Out path {out_path} exists and is not a directory", file=sys.stderr)
        return
    out_path.mkdir(parents=True, exist_ok=True)

    # choose logo
    logo = args.logo or find_default_logo()
    if not logo:
        print('No logo found; proceeding without logo')

    for ahu in ahus:
        value = f"{base.rstrip('/')}/ahu/{ahu.id}"
        filename = out_path / f"qr_{ahu.id}.png"
        # build minimal args object for generate()
        class A: pass
        a = A()
        a.value = value
        a.logo = logo
        a.out = str(filename)
        a.format = 'png'
        a.scale = args.scale
        a.border = args.border
        a.error = args.error
        a.logo_ratio = args.logo_ratio
        a.padding = args.padding
        generate(a)
    print(f"Generated {len(ahus)} QR files in {out_path}")


def main():
    p = argparse.ArgumentParser(description='Generate QR code with optional embedded logo')
    p.add_argument('--value', required=False, help='The string or URL to encode')
    p.add_argument('--logo', required=False, help='Path to logo image (PNG/JPG) to embed')
    p.add_argument('--out', required=True, help='Output path (png or svg)')
    p.add_argument('--format', default='png', choices=['png', 'svg'], help='Output format')
    p.add_argument('--scale', type=int, default=10, help='Scale for PNG rendering (segno scale)')
    p.add_argument('--border', type=int, default=4, help='Quiet zone in modules')
    p.add_argument('--error', default='h', choices=['l', 'm', 'q', 'h'], help='QR error correction level')
    p.add_argument('--logo-ratio', dest='logo_ratio', type=float, default=0.18, help='Logo size as fraction of QR width')
    p.add_argument('--padding', type=int, default=6, help='White padding around logo in px')
    p.add_argument('--all-ahus', dest='all_ahus', action='store_true', help='Generate QR files for all AHUs in DB')
    p.add_argument('--base-url', dest='base_url', help='Base URL to prefix AHU paths when using --all-ahus')

    args = p.parse_args()
    if args.all_ahus:
        generate_for_all_ahus(args)
        return

    if not args.value:
        print('Either --value or --all-ahus must be provided', file=sys.stderr)
        sys.exit(2)

    generate(args)


if __name__ == '__main__':
    main()
