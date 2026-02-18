#!/usr/bin/env python3
"""
QB Auto-Paste Listener Service
Runs locally on Windows and listens for clipboard data from web app.

Usage:
    python qb_listener.py

Then in web app, click "Auto-Paste to QB" and data will be pasted automatically.
"""

from flask import Flask, request, jsonify
import pyperclip
import subprocess
import time
import sys
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('qb_listener.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Get the directory where this script lives
SCRIPT_DIR = Path(__file__).parent
SPECIAL_PASTE_EXE = SCRIPT_DIR / 'SpecialPaste.exe'
QB_SECTIONS_AU3 = SCRIPT_DIR / 'qb_sections.au3'


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint - tells web app if listener is running."""
    return jsonify({
        "status": "running",
        "service": "QB Auto-Paste Listener"
    }), 200


@app.route('/paste', methods=['POST'])
def paste_to_qb():
    """
    Receives clipboard data and pastes it into QB.
    
    Expected JSON:
    {
        "data": "part_number||size||quantity\npart_number2||size2||quantity2",
        "delete_old": false
    }
    """
    try:
        payload = request.get_json() or {}
        data = payload.get('data')
        delete_old = payload.get('delete_old', False)
        
        if not data:
            logger.warning("Paste request received with no data")
            return jsonify({"error": "Missing 'data' field"}), 400
        
        logger.info(f"Received clipboard data: {len(data)} characters")
        
        # STEP 1: Optional - Delete old packing slip section
        if delete_old:
            if not QB_SECTIONS_AU3.exists():
                logger.error(f"qb_sections.au3 not found at {QB_SECTIONS_AU3}")
                return jsonify({
                    "error": "qb_sections.au3 not found",
                    "path": str(QB_SECTIONS_AU3)
                }), 404
            
            try:
                logger.info("Launching qb_sections.au3 to delete old section...")
                subprocess.Popen(str(QB_SECTIONS_AU3))
                time.sleep(2.5)
                logger.info("qb_sections.au3 executed")
            except Exception as e:
                logger.error(f"Failed to launch qb_sections.au3: {str(e)}")
                return jsonify({
                    "error": "Failed to delete old section",
                    "detail": str(e)
                }), 500
        
        # STEP 2: Copy data to clipboard
        try:
            pyperclip.copy(data)
            logger.info("Data copied to clipboard")
        except Exception as e:
            logger.error(f"Failed to copy to clipboard: {str(e)}")
            return jsonify({
                "error": "Failed to copy to clipboard",
                "detail": str(e)
            }), 500
        
        # STEP 3: Launch SpecialPaste.exe to auto-paste
        if not SPECIAL_PASTE_EXE.exists():
            logger.error(f"SpecialPaste.exe not found at {SPECIAL_PASTE_EXE}")
            # Return success anyway - data is in clipboard even if macro not found
            return jsonify({
                "status": "success_no_macro",
                "message": "Data copied to clipboard. SpecialPaste.exe not found - you can paste manually.",
                "warning": f"SpecialPaste.exe not found at {SPECIAL_PASTE_EXE}"
            }), 200
        
        try:
            logger.info("Launching SpecialPaste.exe...")
            subprocess.Popen(str(SPECIAL_PASTE_EXE))
            time.sleep(1)
            logger.info("SpecialPaste.exe launched successfully")
            
            return jsonify({
                "status": "success",
                "message": "Data copied and SpecialPaste.exe launched",
                "steps": [
                    "✓ Data copied to clipboard",
                    "✓ SpecialPaste.exe launched",
                    "→ Make sure QB window is in focus",
                    "→ Press Ctrl+Shift+V (or wait for auto-paste)",
                    "→ Press Ctrl+Q to stop if needed"
                ]
            }), 200
        
        except Exception as e:
            logger.error(f"Failed to launch SpecialPaste.exe: {str(e)}")
            return jsonify({
                "status": "success_no_macro",
                "message": "Data copied to clipboard but macro failed",
                "error": str(e)
            }), 200
    
    except Exception as e:
        logger.error(f"Unexpected error in paste endpoint: {str(e)}")
        return jsonify({
            "error": "Unexpected server error",
            "detail": str(e)
        }), 500


@app.route('/status', methods=['GET'])
def status():
    """Get status of macro files."""
    return jsonify({
        "listener_running": True,
        "special_paste_found": SPECIAL_PASTE_EXE.exists(),
        "qb_sections_found": QB_SECTIONS_AU3.exists(),
        "script_directory": str(SCRIPT_DIR)
    }), 200


if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("QB Auto-Paste Listener Service Starting")
    logger.info("=" * 60)
    logger.info(f"Script directory: {SCRIPT_DIR}")
    logger.info(f"SpecialPaste.exe: {SPECIAL_PASTE_EXE} ({'FOUND' if SPECIAL_PASTE_EXE.exists() else 'NOT FOUND'})")
    logger.info(f"qb_sections.au3: {QB_SECTIONS_AU3} ({'FOUND' if QB_SECTIONS_AU3.exists() else 'NOT FOUND'})")
    logger.info("Listening on http://localhost:5000")
    logger.info("=" * 60)
    
    # Run on localhost:5000
    app.run(host='localhost', port=5000, debug=False)
