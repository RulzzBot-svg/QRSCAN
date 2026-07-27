#!/usr/bin/env python3
"""
Type QB packing-slip clipboard data (||-delimited fields with TAB between them).

Usage:
  python qb_paste_now.py              # read from clipboard, 3s delay
  python qb_paste_now.py --delay 5    # longer delay to focus QuickBooks
  python qb_paste_now.py --data "4||HVP12242||||||||||"

Requires: pip install pyautogui pyperclip
"""
import argparse
import sys
import time

try:
    import pyautogui
    import pyperclip
except ImportError:
    print("Missing dependency. Run: pip install pyautogui pyperclip")
    sys.exit(1)

# Safety: move mouse to corner to abort
pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0.02


def paste_data(data: str) -> None:
    parts = data.split("||")
    for i, part in enumerate(parts):
        if part:
            pyautogui.write(part, interval=0.005)
        if i < len(parts) - 1:
            pyautogui.press("tab")
            time.sleep(0.02)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", help="Paste string (default: read clipboard)")
    parser.add_argument("--delay", type=float, default=3.0, help="Seconds before typing")
    args = parser.parse_args()

    data = args.data if args.data is not None else pyperclip.paste()
    if not data or not str(data).strip():
        print("Nothing to paste — clipboard is empty.")
        sys.exit(1)

    print(f"Switch to QuickBooks and click the first cell. Pasting in {args.delay:.0f}s...")
    print("(Move mouse to top-left corner to cancel)")
    time.sleep(args.delay)
    paste_data(str(data))
    print("Done.")


if __name__ == "__main__":
    main()
