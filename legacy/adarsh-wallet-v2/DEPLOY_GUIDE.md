# AdarshWallet — Complete Deployment Guide
## 50 Steps to "Done ✅" on Both Android & iOS

> **Mumbai IST (UTC+5:30) | Free Stack | Voice-First | AI-Powered**
> Estimated time: ~90 minutes end-to-end

---

## PRE-FLIGHT CHECKLIST

Before you begin, confirm you have:
- [ ] Google account with your Net_worth_Tracker Google Sheet open
- [ ] A phone (Android 8+ or iPhone iOS 14+)
- [ ] Mac / Windows / Linux computer with internet
- [ ] ~2 GB free disk space
- [ ] 90 minutes of uninterrupted time

---

# PHASE 1 — ENVIRONMENT SETUP (Steps 1–10)

## Step 1 — Install Node.js 20 LTS

### Mac (Homebrew)
```bash
# Install Homebrew first if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Verify
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
```

### Windows (PowerShell as Administrator)
```powershell
# Install via winget (Windows 11/10)
winget install OpenJS.NodeJS.LTS

# OR download installer from: https://nodejs.org/en/download
# Choose: Windows Installer (.msi) → LTS version

# Restart PowerShell, then verify
node --version
npm --version
```

### Linux (Ubuntu/Debian)
```bash
# Install via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

---

## Step 2 — Install Expo CLI & EAS CLI

### All platforms (same command)
```bash
npm install -g expo-cli eas-cli

# Verify
expo --version   # Should show 6.x.x
eas --version    # Should show 8.x.x
```

**⚠️ Windows only** — if you get permission errors:
```powershell
# Run PowerShell as Administrator, then:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
npm install -g expo-cli eas-cli
```

---

## Step 3 — Install Git

### Mac
```bash
# Git usually pre-installed. Check:
git --version

# If not: 
xcode-select --install
```

### Windows
```powershell
winget install Git.Git
# Restart terminal after install
git --version
```

### Linux
```bash
sudo apt-get install -y git
git --version
```

---

## Step 4 — Extract the AdarshWallet ZIP

### Mac / Linux
```bash
cd ~/Downloads
unzip AdarshWallet.zip
cd AdarshWallet
ls -la   # Should see App.js, Code.gs, src/, package.json
```

### Windows (PowerShell)
```powershell
cd $HOME\Downloads
Expand-Archive -Path AdarshWallet.zip -DestinationPath AdarshWallet
cd AdarshWallet
dir   # Should see App.js, Code.gs, src/, package.json
```

---

## Step 5 — Install Project Dependencies

```bash
# From inside AdarshWallet/ folder
npm install

# Expected output: "added 1200+ packages"
# This takes 2-5 minutes on first run
```

**⚠️ If you see ERESOLVE errors:**
```bash
npm install --legacy-peer-deps
```

**⚠️ Mac M1/M2 (Apple Silicon):**
```bash
arch -x86_64 npm install
# OR
sudo npm install --unsafe-perm
```

---

## Step 6 — Create Free Expo Account

```bash
# In terminal
eas login

# If no account yet, register first:
eas register
# OR visit https://expo.dev/signup (free, no credit card)

# After login, verify:
eas whoami   # Should show your username
```

---

## Step 7 — Initialize EAS Project

```bash
# Inside AdarshWallet/ folder
eas init

# When prompted: "Would you like to create a project?" → Y
# Project name: adarshwallet
# This auto-updates your app.json with projectId
```

---

## Step 8 — Install Expo Go on Your Phone

### Android
1. Open **Google Play Store**
2. Search "Expo Go"
3. Install (by Expo, 10M+ downloads)
4. Open app → Create account (use same email as Step 6)

### iOS
1. Open **App Store**
2. Search "Expo Go"
3. Install (by Expo Project)
4. Open app → Sign in (same email as Step 6)

---

## Step 9 — Set Mumbai IST Timezone

Edit `src/utils/constants.js`, find CONFIG and add:
```javascript
export const CONFIG = {
  // ... existing config ...
  TIMEZONE: 'Asia/Kolkata',      // ← ADD THIS
  TIMEZONE_OFFSET: '+05:30',     // ← ADD THIS
  DATE_LOCALE: 'en-IN',          // ← ADD THIS
};
```

Also edit `Code.gs` (Apps Script), add at top:
```javascript
const TIMEZONE = 'Asia/Kolkata';  // IST Mumbai
```

And in the `formatDate()` function, change to:
```javascript
function formatDate(d) {
  if (!d) return '';
  if (d instanceof Date) {
    return Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd');
  }
  return String(d).substring(0, 10);
}
```

---

## Step 10 — Verify Project Structure

```bash
# From AdarshWallet/ folder
ls -la                    # Root files
ls -la src/screens/       # 5 screen files
ls -la src/services/      # api.js, database.js
ls -la src/utils/         # constants.js, AppContext.js

# Should see:
# App.js ✓  Code.gs ✓  app.json ✓  eas.json ✓  package.json ✓
# src/screens/HomeScreen.js ✓
# src/screens/EntryScreen.js ✓  
# src/screens/DashboardScreen.js ✓
# src/screens/InsightsScreen.js ✓
# src/screens/SetupScreen.js ✓
```

✅ **Phase 1 complete — environment ready**

---

# PHASE 2 — GOOGLE SHEETS BACKEND (Steps 11–20)

## Step 11 — Open Your Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Open **Net_worth_Tracker**
3. Confirm these sheets exist (bottom tabs):
   - `Overall` ✓
   - `Kharche` ✓
   - `Actual Investments` ✓
   - `Credit Card Bills` ✓

---

## Step 12 — Open Apps Script Editor

1. In Google Sheets: **Extensions → Apps Script**
2. New tab opens: `script.google.com/...`
3. You'll see existing `Code.gs` in left panel
4. Click on `Code.gs`

---

## Step 13 — Replace Code.gs

1. Select ALL existing code: `Ctrl+A` (Windows/Linux) or `Cmd+A` (Mac)
2. Delete it
3. Open `AdarshWallet/Code.gs` from your downloaded ZIP in any text editor
4. Copy ALL of it (`Ctrl+A` → `Ctrl+C`)
5. Paste into Apps Script editor (`Ctrl+V`)
6. Click **Save** (floppy disk icon or `Ctrl+S`)
7. You should see `Code.gs` with new content — no red errors

---

## Step 14 — Run Setup Function Once

1. In the function dropdown (top toolbar), select: `setupIferrorProtection`
2. Click ▶ **Run**
3. First run → "Authorization required" popup
4. Click **Review permissions** → Choose your Google account → **Allow**
5. Run again after authorization
6. Check **Execution log** (bottom panel) → should show: `IFERROR protection applied to Overall sheet`

---

## Step 15 — Test doGet Function

1. In function dropdown, select: `getDashboard`
2. Click ▶ **Run**
3. **Execution log** should show JSON-like output with your account names

If you see errors, check:
- Sheet names match exactly (case-sensitive): `Overall`, `Kharche`, etc.
- You authorized the script in Step 14

---

## Step 16 — Deploy as Web App

1. Click **Deploy → New deployment** (top right, blue button)
2. Click ⚙️ gear icon → Select type: **Web app**
3. Configure:
   ```
   Description:     AdarshWallet API v1
   Execute as:      Me (your@gmail.com)
   Who has access:  Anyone
   ```
4. Click **Deploy**
5. **COPY THE WEB APP URL** — looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
   Save this — you'll need it in Step 22

> ⚠️ IMPORTANT: "Anyone" (not "Anyone with Google account") is required for the app to call the API without OAuth on each request.

---

## Step 17 — Test the API in Browser

Open this URL in your browser (replace YOUR_SCRIPT_ID):
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=getDashboard
```

**Expected response:**
```json
{
  "accounts": [
    {"name": "Axis Bank", "balance": 676066.85},
    {"name": "State Bank of India (SBI)", "balance": 11835},
    ...
  ],
  "netWorth": 1152254.9,
  "monthlySpend": 18000,
  "investments": [...],
  "lastUpdated": "2026-03-05T..."
}
```

If you see your data → ✅ Backend working!

---

## Step 18 — Test Expense Insert API

Run in Apps Script editor — select `testAddExpense` function:

First add this test function temporarily to Code.gs:
```javascript
function testAddExpense() {
  const result = addExpense({
    date: new Date().toISOString(),
    particulars: 'TEST - Delete me',
    category: 'Others',
    subcategory: '',
    account: 'UPI/Bank Accounts',
    accountSub: 'State Bank of India (SBI)',
    application: 'Paytm',
    amount: 1
  });
  Logger.log(JSON.stringify(result));
}
```

Run it → check Kharche sheet → a test row should appear → delete it.

---

## Step 19 — Get Free Gemini API Key

1. Visit **https://aistudio.google.com/app/apikey**
2. Sign in with same Google account
3. Click **Create API key**
4. Select your Google Cloud project (or "Create in new project")
5. Copy the key: `AIzaSy...` (40+ characters)

**Free tier limits:**
```
Models available:  gemini-1.5-flash (recommended)
Requests/minute:   15 RPM
Tokens/day:        1,000,000 (1M) — ~1000 voice entries/day
Cost:              ₹0
```

---

## Step 20 — Get Spreadsheet ID

From your Google Sheets URL, copy the ID between `/d/` and `/edit`:
```
https://docs.google.com/spreadsheets/d/1BxiMVNnm.../edit#gid=0
                                        ^^^^^^^^^^^^^^
                                        THIS is your Spreadsheet ID
```

Save it — needed for Step 22.

✅ **Phase 2 complete — Google Sheets backend deployed**

---

# PHASE 3 — APP CONFIGURATION (Steps 21–30)

## Step 21 — Open constants.js

```bash
# Mac/Linux
open -e src/utils/constants.js      # Opens in TextEdit
# OR
nano src/utils/constants.js         # Terminal editor
# OR use VS Code: code src/utils/constants.js

# Windows
notepad src\utils\constants.js
# OR: code src\utils\constants.js   (if VS Code installed)
```

---

## Step 22 — Fill in Your API Credentials

Find the `CONFIG` object and replace with your values:
```javascript
export const CONFIG = {
  // ← REPLACE THESE WITH YOUR ACTUAL VALUES ←
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_ID/exec',
  GEMINI_API_KEY: 'AIzaSyYOUR_ACTUAL_KEY_HERE',
  SPREADSHEET_ID: '1BxiMVNnmYOUR_SHEET_ID',
  GOOGLE_WEB_CLIENT_ID: '',   // Leave empty for now
  
  // Keep these as-is:
  GEMINI_MODEL: 'gemini-1.5-flash',
  REFRESH_INTERVAL: 5000,     // 5 seconds live updates
  TIMEZONE: 'Asia/Kolkata',
  DATE_LOCALE: 'en-IN',
};
```

Save the file (`Ctrl+S`).

---

## Step 23 — Verify Your Sheet Names Match

Open `Code.gs` and check the SHEETS constant matches your actual tab names exactly (case-sensitive):
```javascript
const SHEETS = {
  OVERALL: 'Overall',              // ← Must match exactly
  KHARCHE: 'Kharche',             // ← Must match exactly
  INVESTMENTS: 'Actual Investments', // ← Must match exactly
  CC_BILLS: 'Credit Card Bills',  // ← Must match exactly
  ADHOC: 'AdhocSelf Transfer',    // ← Must match exactly
};
```

Check your Google Sheet tab names at the bottom. If different, update Code.gs and redeploy (Step 16, create new deployment).

---

## Step 24 — Configure app.json

Open `app.json` and update:
```json
{
  "expo": {
    "name": "AdarshWallet",
    "slug": "adarshwallet",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.YOUR_NAME.adarshwallet"
    },
    "android": {
      "package": "com.YOUR_NAME.adarshwallet"
    }
  }
}
```

Replace `YOUR_NAME` with your name (lowercase, no spaces). Example: `com.adarsh.adarshwallet`

---

## Step 25 — Start Dev Server

```bash
# From AdarshWallet/ folder
npx expo start

# You'll see a QR code in terminal + Metro Bundler opens in browser
# Keep this terminal window OPEN
```

Expected output:
```
Starting Metro Bundler...
›  Bundling...
›  QR code displayed
›  Press a for Android emulator
›  Press i for iOS simulator
›  Press w for web
```

---

## Step 26 — Open on Android Phone

1. Open **Expo Go** app on Android phone
2. Tap **Scan QR code**
3. Point camera at QR code in terminal
4. App loads in 30-60 seconds (first time slower)
5. You should see the AdarshWallet Setup screen

**If QR doesn't work:**
```bash
# In terminal where npx expo start is running, press:
s   # Switch to Expo Go mode
# Try scanning again
```

---

## Step 27 — Open on iPhone

1. Open default **Camera** app (not Expo Go) on iPhone
2. Point at QR code in terminal
3. Tap the notification banner that appears
4. Opens in Expo Go automatically

**If that doesn't work:**
1. Open **Expo Go** → tap **Enter URL manually**
2. In terminal, note the `exp://` URL shown
3. Type that URL in Expo Go

---

## Step 28 — Complete In-App Setup

On your phone:
1. Screen shows: **"AdarshWallet"** with feature list
2. Tap **"Get Started →"**
3. Fill in:
   - **Your Name**: Adarsh
   - **Apps Script URL**: (paste from Step 16)
   - **Gemini API Key**: (paste from Step 19)
   - **Spreadsheet ID**: (paste from Step 20)
4. Tap **"Launch AdarshWallet 🚀"**

---

## Step 29 — Verify Data Loads

On Home screen:
1. Wait 5-10 seconds for initial data load
2. You should see:
   - Your Axis Bank balance: ~₹6.76L
   - Your SBI balance: ~₹11,835
   - Net Worth gauge filling up
   - Your Feb 2026 expense categories in pie chart

**If "No data" shows:** Pull down to refresh. Check console in terminal for errors.

---

## Step 30 — Fix Common Setup Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Apps Script URL not responding" | Wrong URL or access setting | Re-deploy: "Anyone" access, copy new URL |
| "Gemini API error 400" | Wrong API key | Check key starts with `AIzaSy`, no spaces |
| "Network request failed" | Phone not on WiFi | Connect phone to same WiFi as computer |
| "Sheet not found" | Wrong sheet name | Check SHEETS in Code.gs matches your tabs |
| "Cannot read property of null" | Empty sheet | Add 1 test expense manually in Kharche |
| "Metro bundler crash" | Dependency issue | `npm install --legacy-peer-deps` then restart |

✅ **Phase 3 complete — app running on your phones**

---

# PHASE 4 — FEATURE TESTING (Steps 31–40)

## Step 31 — ✅ Test Voice Entry (Android)

1. Tap the **✚ (Add)** button in bottom nav
2. Tap and hold the **🎤 microphone button**
3. Say clearly: **"Spent five hundred on Blinkit SBI Paytm"**
4. Release the button
5. Wait 3-5 seconds for Gemini AI to parse
6. Review screen should show:
   ```
   Amount:      ₹500
   Description: Blinkit
   Category:    Household
   Subcategory: Fixed Groceries
   Account:     UPI/Bank Accounts · SBI
   App:         Paytm
   Confidence:  92%
   ```
7. Tap **"Save to Sheets ✓"**
8. See 🎉 confetti animation + "Saved!" screen
9. Check your Google Sheet → Kharche tab → new row added ✓

---

## Step 32 — ✅ Test Voice Entry (iPhone)

Same as Step 31. If mic permission prompt appears:
1. Tap **Allow** when iOS asks for microphone
2. Tap **Allow** when iOS asks for speech recognition
3. Retry voice entry

**iOS tip:** Hold mic button firmly for 2+ seconds before speaking.

---

## Step 33 — ✅ Test Text Entry

1. On Entry screen, type in text box:
   ```
   Swiggy 450 Axis credit card
   ```
2. Tap → button (or press Return)
3. Should parse:
   ```
   Category: Food and Drinks
   Subcategory: Delivery
   Account: Credit Card · Axis Bank
   Amount: ₹450
   ```
4. Edit any field by tapping it
5. Save → confirm in Google Sheet

---

## Step 34 — ✅ Test More Voice Commands

Try each of these voice entries and verify AI parsing:

```
"Electricity bill 890 SBI Paytm"
→ Category: Household, Sub: Electricity ✓

"IRCTC 1888 SBI"
→ Category: Trip, Sub: Travelling ✓

"Zomato 650 Scapia credit card"
→ Category: Food and Drinks, Sub: Delivery ✓

"Auto 120 Google Pay"
→ Category: Transport, Sub: Auto/Cab ✓

"Airtel recharge 580 SBI"
→ Category: Others ✓

"Beer with friends 1200 Axis Bank"
→ Category: Food and Drinks OR Cigarettes ✓
```

---

## Step 35 — ✅ Test Dashboard Charts

1. Tap **📊 Charts** in bottom nav
2. Verify:
   - Bar chart shows category breakdown for current month
   - Month navigator (‹ Feb 2026 ›) works — tap ‹ to go to Jan
   - **Spending** tab: category bars with progress bars
   - **Trend** tab: monthly line chart
   - **Accounts** tab: all your balances listed

3. Pull down to refresh → data updates from Sheets

---

## Step 36 — ✅ Test AI Insights

1. Tap **✨ AI** in bottom nav
2. Tap a quick question chip: **"What's my biggest expense category?"**
3. Gemini should respond with your actual data, e.g.:
   > "Your highest spend this month is Food and Drinks at ₹2,831 (22% of total). Delivery orders from Swiggy/Blinkit are the main driver — consider cooking at home 3x/week to save ₹1,500/month."
4. Type your own question: **"How is my Axis Bank balance?"**
5. Tap 🔊 speaker button → hear the response read aloud (IST voice)

---

## Step 37 — ✅ Test Offline Mode

1. Turn on **Airplane Mode** on your phone
2. Add a new expense via Entry screen
3. Should show: **"Saved locally, will sync when online"**
4. Turn Airplane Mode OFF
5. Wait 5 seconds → app auto-syncs
6. Check Google Sheet → your offline entry appears ✓

---

## Step 38 — ✅ Test Live Sync (5-second refresh)

1. Open Google Sheet on your computer
2. Manually add a row to Kharche sheet with today's date and ₹100
3. On your phone Home screen → wait 5 seconds
4. Pull to refresh if needed
5. Your new entry should appear in the charts ✓

---

## Step 39 — ✅ Test Month Navigation

1. On Dashboard, tap ‹ to go to **January 2026**
2. Charts update to Jan data
3. Tap ‹ again → **December 2025**
4. Tap › to return to current month
5. Pie chart and bar chart update correctly ✓

---

## Step 40 — ✅ Test Net Worth Display

On Home screen:
1. Net Worth should show: ~₹11,52,255 (your Axis + SBI + Splitwise + Investments)
2. Gauge bar shows % toward your goal
3. Monthly spend shows Feb 2026 total
4. Accounts row is scrollable horizontally → shows all 6 accounts

✅ **Phase 4 complete — all features verified**

---

# PHASE 5 — BUILD APK/IPA (Steps 41–50)

## Step 41 — Configure EAS Build Profile

Open `eas.json` and verify:
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

---

## Step 42 — Build Android APK (FREE)

```bash
# From AdarshWallet/ folder
eas build --platform android --profile preview

# You'll be asked:
# "Generate a new Android Keystore?" → Y (first time)

# Build starts on Expo cloud servers
# Takes 8-15 minutes
# You'll see a URL to monitor progress
```

**Monitor at:** https://expo.dev/accounts/YOUR_USERNAME/projects/adarshwallet/builds

---

## Step 43 — Download and Install APK (Android)

```bash
# When build completes, download APK:
# Option 1: Terminal auto-shows download URL, open it
# Option 2: Go to expo.dev → your project → Builds → Download

# Install on Android:
# 1. Transfer APK to phone (email to yourself, or ADB)
adb install AdarshWallet.apk

# OR: Enable "Unknown Sources" in Android Settings → Security
# Open APK file on phone → Install
```

---

## Step 44 — Build iOS IPA (Apple Device)

```bash
eas build --platform ios --profile preview

# For personal use (no Apple Dev account needed with Expo Go):
# Use development build instead:
eas build --platform ios --profile development
```

**To distribute via TestFlight** (requires $99/yr Apple Dev account):
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

**FREE alternative — use Expo Go** (already done in Steps 26-27):
Expo Go on iOS runs your app directly without building an IPA.

---

## Step 45 — Configure Production API Keys

Before production build, move secrets out of constants.js into environment variables:

Create `.env` file in project root:
```bash
# .env (DO NOT COMMIT TO GIT)
EXPO_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyYOUR_KEY
EXPO_PUBLIC_SPREADSHEET_ID=YOUR_SHEET_ID
```

Update `src/utils/constants.js`:
```javascript
export const CONFIG = {
  APPS_SCRIPT_URL: process.env.EXPO_PUBLIC_APPS_SCRIPT_URL || 'YOUR_FALLBACK',
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'YOUR_FALLBACK',
  SPREADSHEET_ID: process.env.EXPO_PUBLIC_SPREADSHEET_ID || 'YOUR_FALLBACK',
};
```

Add to EAS secrets:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_GEMINI_API_KEY --value YOUR_KEY
eas secret:create --scope project --name EXPO_PUBLIC_APPS_SCRIPT_URL --value YOUR_URL
```

---

## Step 46 — Add App Icon & Splash Screen

Create `assets/` folder in project root:
```bash
mkdir -p assets
```

Add your icon (1024×1024 PNG) to `assets/icon.png`.
Add splash screen (1242×2688 PNG) to `assets/splash.png`.

Quick way — use a free tool:
- **Icon**: https://icon.kitchen (free, generates all sizes)
- **Splash**: https://apetools.webprofusion.com (free)

---

## Step 47 — Test Final APK on Both Phones

**Android:**
1. Install the APK built in Step 43
2. Open → Setup screen → enter credentials
3. All 5 tabs working ✓

**iPhone:**
1. Scan QR code in Expo Go (Step 26-27)
2. Or install via TestFlight if built in Step 44
3. All 5 tabs working ✓

---

## Step 48 — Performance Verification

On the installed app, verify these benchmarks:

| Test | Target | Your Result |
|------|--------|-------------|
| App launch → home screen | < 3 seconds | ✓ |
| Voice → parsed entry displayed | < 5 seconds | ✓ |
| Charts load from Sheets | < 8 seconds | ✓ |
| Offline entry saved | Instant | ✓ |
| Auto-sync after reconnect | < 5 seconds | ✓ |
| Month navigation | < 1 second | ✓ |

---

## Step 49 — Enable Live Updates (OTA)

With Expo, you can push JS updates without rebuilding APK:

```bash
# After making any code changes:
eas update --branch preview --message "Fixed chart colors"

# Users get the update automatically on next app launch
# No App Store review needed for JS-only changes
```

---

## Step 50 — Final Checklist

Run through each item. When all 20 are ✅ → you're DONE:

### Voice Entry
- [ ] ✅ Voice mic records audio
- [ ] ✅ Gemini parses "Spent ₹500 groceries SBI Paytm" correctly
- [ ] ✅ Review screen shows correct category/subcategory
- [ ] ✅ Edit fields work (tap to edit)
- [ ] ✅ Save writes to Google Sheets Kharche tab
- [ ] ✅ Confetti animation plays on success

### Dashboard
- [ ] ✅ Home shows correct Net Worth (~₹11.5L from your sheet)
- [ ] ✅ Account balances all visible (Axis, SBI, Splitwise, etc.)
- [ ] ✅ Category pie chart shows Feb 2026 spend
- [ ] ✅ Monthly trend line chart shows 5-month history
- [ ] ✅ Dashboard bar chart by category works
- [ ] ✅ Month navigator (‹ ›) changes data correctly

### AI & Sync
- [ ] ✅ AI Insights responds to "What's my biggest expense?"
- [ ] ✅ Text-to-speech reads response aloud
- [ ] ✅ Offline mode saves locally when no internet
- [ ] ✅ Auto-syncs to Sheets when reconnected
- [ ] ✅ Live refresh updates every 5 seconds

### Both Phones
- [ ] ✅ Android — APK installed and working
- [ ] ✅ iPhone — Expo Go or TestFlight working
- [ ] ✅ Mumbai IST dates show correctly (not UTC)

---

# ✅ DONE! Your AdarshWallet is LIVE on both phones!

---

# REFERENCE

## Complete Error Troubleshooting Table

| Error Message | Platform | Root Cause | Solution |
|---------------|----------|------------|----------|
| `Network request failed` | Both | Phone not on same WiFi as dev computer | Connect both to same WiFi network |
| `Apps Script 401/403` | Both | Wrong access setting | Redeploy: Who has access → "Anyone" |
| `Apps Script 404` | Both | Wrong script URL | Copy URL again after redeployment |
| `Gemini 400 Bad Request` | Both | Invalid API key format | Verify key: no spaces, starts with AIzaSy |
| `Gemini 429 Too Many Requests` | Both | Rate limit hit (15 RPM) | Wait 1 minute, or upgrade to paid tier |
| `Sheet not found` | Both | Wrong sheet name in Code.gs | Check SHEETS const matches exact tab names |
| `Metro bundler ENOENT` | Dev | Missing node_modules | Run `npm install` again |
| `Unable to resolve module` | Dev | Missing package | `npm install PACKAGE_NAME` |
| `Build failed: SDK version` | EAS | Wrong Expo SDK | Update `expo` in package.json to ~51.0.0 |
| `ERESOLVE npm error` | All | Peer dependency conflict | `npm install --legacy-peer-deps` |
| `Microphone permission denied` | iOS | Not authorized | Settings → AdarshWallet → Microphone → Allow |
| `Speech not recognized` | Both | Quiet environment/accent | Speak clearly, closer to mic; use text fallback |
| `SQLite: no such table` | Both | DB not initialized | Clear app data and relaunch |
| `undefined is not an object (JS)` | Both | Null data from API | Add to `constants.js`: check CONFIG has real values |
| `Expo Go: Something went wrong` | Both | JS runtime error | Check terminal for stack trace |
| `QR code not working` | Both | Different network | Use `exp://YOUR_IP:8081` manually |
| `Build takes > 20 min` | EAS | Queue backup | Check expo.dev/builds for queue status |
| `APK won't install` | Android | Unknown sources off | Settings → Security → Unknown Sources → On |
| `White screen on load` | Both | Crash in App.js | Check terminal for red error output |
| `Date shows wrong timezone` | Both | UTC instead of IST | Verify TIMEZONE: 'Asia/Kolkata' in constants.js |
| `Charts show no data` | Both | Empty category totals | Add 1+ expense first; check month selector |
| `Confetti not showing` | Both | Animation package missing | `npm install react-native-animatable` |
| `EAS login fails` | All | Wrong credentials | `eas logout` then `eas login` again |
| `CORS error in Apps Script` | Both | Headers missing | Verify `setCORSHeaders()` in Code.gs |

---

## Voice Command Quick Reference (Tested Patterns)

```
Groceries:    "Blinkit five hundred SBI Paytm"
Food/Delivery:"Swiggy 450 Axis credit card"
Eating out:   "Lunch with friends 800 SBI GPay"
Transport:    "Auto 120 Google Pay" / "Uber 350 Paytm"
Bills:        "Electricity bill 890 SBI Paytm"
Subscriptions:"Netflix 649 Axis Bank"
Travel:       "IRCTC 1888 SBI" / "Flight 4500 Axis"
Cigarettes:   "Cigarettes 200 SBI" / "Beers 1200 Paytm"
Education:    "Course fees 3000 SBI"
Medical:      "Medicine 450 SBI Paytm"
Investment:   "Transferred 10000 to Groww"
```

---

## Useful Terminal Commands

```bash
# Start dev server
npx expo start

# Clear cache and restart
npx expo start --clear

# Check for outdated packages
npx expo-doctor

# View device logs (Android)
npx react-native log-android

# View device logs (iOS)
npx react-native log-ios

# Build Android APK
eas build --platform android --profile preview

# Build iOS
eas build --platform ios --profile preview

# Push over-the-air update
eas update --branch preview --message "Update message"

# Check EAS build status
eas build:list

# Run on Android emulator
npx expo start --android

# Run on iOS simulator (Mac only)
npx expo start --ios
```

---

## Free Tier Limits Summary

| Service | Free Limit | Your Daily Usage | Status |
|---------|-----------|-----------------|--------|
| Google Apps Script | 6 min execution/day | ~30 seconds | 🟢 Safe |
| Gemini 1.5 Flash | 15 req/min, 1M tokens/day | ~50 req | 🟢 Safe |
| Google Sheets API | 300 req/min | ~100 req | 🟢 Safe |
| Expo EAS Build | 30 builds/month | ~2-5 | 🟢 Safe |
| SQLite (device) | Unlimited | All local | 🟢 Safe |
| **Monthly Cost** | | | **₹0** |

---

*AdarshWallet — Built with React Native + Expo + Google Sheets + Gemini AI*
*Version 1.0.0 | Mumbai IST | Android + iOS | 100% Free*
