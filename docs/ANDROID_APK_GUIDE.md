# BANTAI — Android APK Build and Deployment Guide

## 1. Overview
The BANTAI mobile client is built using React Native and Expo (`apps/mobile`). It produces a standalone, installable `.apk` file that connects to the self-hosted backend, supporting chat, voice, tasks, and memory synchronization.

---

## 2. Prerequisites
- **Node.js**: v18+ or v20+
- **Expo CLI**: `npm install -g eas-cli`
- **Android Studio** (for local emulator testing): Android SDK 33+, command-line tools.

---

## 3. Configuration & Connectivity
In `apps/mobile/src/services/api.ts`:
- **Android Emulator**: Uses `http://10.0.2.2:4000/api` (automatically routes to host `localhost:4000`).
- **Physical Device**: Set your machine's local Wi-Fi IP address (e.g. `http://192.168.1.150:4000/api`) so the phone can reach the backend over local Wi-Fi.

---

## 4. Building the Installable Standalone APK

### Option A: Local APK Build using EAS (Recommended)
```bash
cd apps/mobile

# 1. Login to Expo (free account)
eas login

# 2. Build installable standalone APK locally
eas build --platform android --profile preview --local
```
This generates `bantai.apk` in your build directory.

### Option B: Cloud Build via EAS
```bash
eas build --platform android --profile preview
```
Download the resulting `.apk` link directly onto your Android device.

---

## 5. Installing the APK on Android
1. Connect your Android device via USB with **USB Debugging** enabled.
2. Install via ADB:
   ```bash
   adb install -r bantai.apk
   ```
3. Or transfer `bantai.apk` to phone storage and tap to install (enable "Install unknown apps" when prompted).
