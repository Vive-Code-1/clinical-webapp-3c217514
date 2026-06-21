# Native Mobile App (iOS & Android) — Capacitor Setup

This project is wrapped with **Capacitor** so you can ship a true native iOS and Android app to the App Store / Play Store.

## How it works

Capacitor loads the **live published Lovable web app** (`https://clinical-webapp.lovable.app`) inside a native shell. Every web update you publish through Lovable is instantly reflected inside the installed mobile app — no native rebuild needed for UI / content changes. You only rebuild the native binary when you change Capacitor plugins or native code.

## One-time setup on YOUR Mac / PC

> Capacitor builds happen on your local machine, not inside Lovable. Lovable hosts the web app; you wrap it natively.

### 1. Export the project to GitHub
Click the GitHub button in the Lovable top-right and push to your own repo. Clone it locally:

```bash
git clone <your-repo-url>
cd <repo-folder>
npm install
```

### 2. Add the native platforms
```bash
npx cap add ios       # macOS only, requires Xcode 15+
npx cap add android   # Windows / macOS / Linux, requires Android Studio
```

### 3. Sync web assets + plugins
Every time you pull web updates or change plugins:
```bash
npx cap sync
```

### 4. Run on a device / simulator
```bash
npx cap run ios       # opens iOS simulator
npx cap run android   # opens Android emulator
```
Or open the native project in the IDE for full debugging:
```bash
npx cap open ios       # opens Xcode
npx cap open android   # opens Android Studio
```

## Requirements for store submission

### iOS (App Store)
- **Mac with Xcode 15+** (required by Apple — no Windows path)
- **Apple Developer account** ($99 / year)
- App Store Connect listing (icon, screenshots 6.5"/5.5", description, privacy policy URL)
- Sign the build in Xcode → Archive → Upload to App Store Connect

### Android (Google Play)
- **Android Studio** (any OS)
- **Google Play Console account** ($25 one-time)
- Signed `.aab` bundle (Android Studio → Build → Generate Signed Bundle)
- Play Store listing (icon 512×512, feature graphic 1024×500, screenshots, description, privacy policy URL)

## What's already configured

- ✅ App ID: `app.lovable.clinicalwebapp` (change in `capacitor.config.ts` before first build)
- ✅ App name: **Santé**
- ✅ Splash screen — dark green brand color
- ✅ Status bar styling
- ✅ Keyboard handling (resizes body, dark theme)
- ✅ Haptics, App lifecycle plugins installed

## Optional next steps you can ask me for

- 🔔 Push notifications (Firebase Cloud Messaging) — appointment reminders, new messages
- 📷 Native camera / file picker for clinical document upload
- 🔐 Biometric login (Face ID / Touch ID / fingerprint)
- 📱 Deep links (open `sante://appointment/123` from email/SMS)
- 🌐 Offline mode (cache app shell so it opens without internet)

## Switching to a fully bundled (offline-capable) build

For App Store review you may want a self-contained binary instead of loading the live URL. In `capacitor.config.ts`, remove the `server` block, then:
```bash
npm run build
npx cap sync
npx cap open ios   # or android
```
The app will then load from the bundled `dist/` folder. Trade-off: web updates require a new native release.
