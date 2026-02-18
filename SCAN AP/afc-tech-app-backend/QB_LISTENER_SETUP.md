# QB Auto-Paste Listener Setup

This guide explains how to set up automatic pasting to QuickBooks from the QRSCAN web app.

## What It Does

Once running, the `qb_listener.py` service allows you to:
1. Select filters in the web app
2. Click **"⚡ Auto-Paste to QB"**
3. Data automatically pastes into QuickBooks packing slip
4. No manual copying/pasting needed!

---

## Setup (One-time)

### Step 1: Install Python Dependencies

Navigate to the backend folder and install `pyperclip`:

```powershell
cd "C:\Users\AFC5admin\Documents\QRSCAN\QRSCAN\SCAN AP\afc-tech-app-backend"
pip install pyperclip flask
```

### Step 2: Place Your AutoIt Macros

Make sure these files are in the backend directory (same folder as `qb_listener.py`):
- `SpecialPaste.exe` - Auto-pastes data into QB
- `qb_sections.au3` - (Optional) Deletes old packing slip sections

```
afc-tech-app-backend/
├── qb_listener.py          ← You just created this
├── SpecialPaste.exe        ← Should be here
├── qb_sections.au3         ← Should be here
├── app.py
└── ...
```

### Step 3: Start the Listener

Run this in PowerShell (Windows Terminal):

```powershell
cd "C:\Users\AFC5admin\Documents\QRSCAN\QRSCAN\SCAN AP\afc-tech-app-backend"
python qb_listener.py
```

You should see:

```
============================================================
QB Auto-Paste Listener Service Starting
============================================================
Script directory: C:\Users\AFC5admin\Documents\QRSCAN\QRSCAN\SCAN AP\afc-tech-app-backend
SpecialPaste.exe: ... (FOUND)
qb_sections.au3: ... (FOUND)
Listening on http://localhost:5000
============================================================
```

**Leave this window open while using the app!**

---

## Usage

### In the Web App:

1. Navigate to **Admin → AHUs**
2. Open an AHU's filter table
3. **Check ☑️ the checkboxes** for filters you want to add
4. Click **"⚡ Auto-Paste to QB"** button
5. **Switch to QuickBooks and make sure it's in focus**
6. The listener will:
   - Copy data to clipboard
   - Launch SpecialPaste.exe
   - Auto-paste into the focused QB window

---

## Troubleshooting

### Button says "📋 Copy to Clipboard" instead of "⚡ Auto-Paste to QB"

**Issue:** The listener service isn't running

**Fix:** 
- Start `python qb_listener.py` in PowerShell
- Refresh the web app (F5)
- Button should now say "⚡ Auto-Paste to QB"

### "SpecialPaste.exe not found"

**Issue:** The macro file is in the wrong location

**Fix:**
- Move `SpecialPaste.exe` to the backend directory
- Run `/status` endpoint to verify: http://localhost:5000/status

### Data pastes but in wrong QB field

**Issue:** QB window wasn't in focus or cursor was in wrong location

**Fix:**
- Click in the QB field where you want the data BEFORE clicking "Auto-Paste"
- Make sure QB window is fully visible and focused

### "pyperclip" module not found

**Issue:** Dependencies not installed

**Fix:**
```powershell
pip install pyperclip flask
```

---

## Advanced: Auto-Start on Windows Boot

To automatically start the listener when you boot your computer:

1. Open **Task Scheduler** (search in Windows)
2. **Create Basic Task** → Name it "QB Listener"
3. **Trigger:** "At startup"
4. **Action:** "Start a program"
5. Program: `python.exe`
6. Arguments: `C:\Users\AFC5admin\Documents\QRSCAN\QRSCAN\SCAN AP\afc-tech-app-backend\qb_listener.py`
7. Click **OK**

Now the listener starts automatically with Windows!

---

## API Reference

If you want to integrate with other tools:

### Health Check
```
GET http://localhost:5000/health
```
Returns `{"status": "running", "service": "QB Auto-Paste Listener"}`

### Paste Data
```
POST http://localhost:5000/paste
Content-Type: application/json

{
  "data": "part_number||size||quantity\npart_number2||size2||qty2",
  "delete_old": false
}
```

### Status
```
GET http://localhost:5000/status
```
Returns macro file availability and script directory

---

## What If I'm Not on Windows?

This listener only works on **Windows** machines with QuickBooks installed. If you're on Mac or Linux:
- Just use the manual clipboard copy feature
- The web app will show "📋 Copy to Clipboard" instead

---

## Questions?

Check the logs:
```powershell
# View the log file
Get-Content "qb_listener.log" -Tail 50
```

Or leave the PowerShell window open to see console output in real-time.
