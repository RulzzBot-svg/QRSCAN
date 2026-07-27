@echo off
cd /d "%~dp0"
echo ============================================================
echo  QRSCAN QuickBooks paste tools
echo ============================================================
echo.
echo Installing Python deps (if needed)...
python -m pip install pyperclip flask flask-cors pyautogui -q
echo.
echo Starting QB listener on http://localhost:5001
echo.
echo OPTIONAL - for manual Ctrl+Shift+V paste:
echo   Double-click SpecialPaste.exe and leave it running
echo   (Only needed if you use the hotkey instead of Auto-Paste)
echo.
echo Keep this window open while using the admin web app.
echo ============================================================
python qb_listener.py
pause
