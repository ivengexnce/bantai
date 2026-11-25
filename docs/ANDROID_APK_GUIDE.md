# BANTAI — Android APK Build and Deployment Guide

## 1. Overview
The BANTAI mobile client (`frontend/mobile`, package `ai.bantai.app`) is built with React Native (`0.74.1`) and Expo (`~51.0.8`). It communicates with the self-hosted `@bantai/backend` API on port `4000` and builds to a standalone Android `.apk`.

---

## 2. Current Mobile Client Screens (`frontend/mobile/App.tsx`)
- **Authentication Screen:** Sign In & Create Account forms wired to `/api/auth/login` and `/api/auth/signup`, persisting JWT in `AsyncStorage` (`bantai_token`).
- **Top Header Bar:** Displays `BANTAI` wordmark and tap-to-cycle model selector (`⚡ Chhotu` / `🤝 Bhai`) alongside the active personality indicator (`tapori`).
- **Bottom Navigation Bar (`CHAT`, `TASKS`, `SETTINGS`):**
  - `CHAT`: Scrollable user/assistant bubbles with composer bar.
  - `TASKS`: Personal Assistant Tasks list and task creator input.
  - `SETTINGS`: Memory isolation status, strict opt-in training status, and Sign Out button.

---

## 3. Prerequisites & Android Manifest Config (`app.json`)
- **Node.js:** v18+ or v20+
- **EAS CLI:** `npm install -g eas-cli` (`cli.version >= 9.0.0` per `frontend/mobile/eas.json`)
- **Configured Permissions (`app.json`):** `INTERNET`, `RECORD_AUDIO`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`.

### Backend Connectivity (`frontend/mobile/src/services/api.ts`)
- **Android Emulator:** Uses `http://10.0.2.2:4000/api` (host machine loopback alias).
- **Other Platforms / Web:** Uses `http://localhost:4000/api`.
- **Physical Device on LAN:** Update `API_BASE` in `frontend/mobile/src/services/api.ts` to your host machine's LAN IP (e.g., `http://192.168.1.x:4000/api`) and ensure `CLIENT_URLS` on the backend permits it if needed.

---

## 4. Building & Running

### Development Server
```bash
npm --workspace=@bantai/mobile run start
# Or from frontend/mobile:
npx expo start
```

### Building Standalone `.apk` (`eas.json`)
`frontend/mobile/eas.json` defines `development` (internal dev client), `preview` (`buildType: apk`, internal distribution), and `production` (`buildType: apk`).

```bash
cd frontend/mobile
eas login

# Option A: Local APK build (via package script)
npm run build:apk
# Executes: eas build --platform android --profile preview --local

# Option B: EAS Cloud APK build
eas build --platform android --profile preview
```

---

## 5. Installing on Android Device
1. Enable **USB Debugging** on your Android device and connect via USB.
2. Install via ADB:
   ```bash
   adb install -r bantai.apk
   ```
   Or copy `bantai.apk` onto device storage and open it directly.
