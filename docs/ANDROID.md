# Android build, icon & splash (Capacitor)

The web app is wrapped with Capacitor. App name **MOT-UK**, app id
**com.motuk.carcare** (see `frontend/capacitor.config.ts`). The native project
lives in `frontend/android/` and is committed, ready to open in Android Studio.

> **Status from the build environment:** the Android *project* is fully
> prepared, but **no APK was built here** because this environment has no
> Android SDK (Java 21 + Gradle are present; `ANDROID_HOME` is not set).
> Build the APK on your own machine using the steps below. Nothing was faked.

---

## 1. Prerequisites (your machine)

- **Android Studio** (installs the Android SDK + an emulator).
- Node 18+ (you already use this for the web app).

---

## 2. Set the API URL for the device

On a phone/emulator, `localhost` means the device itself — not your computer.
Edit `frontend/.env`:

```
VITE_API_URL="http://<your-computer-LAN-ip>:4000"   # e.g. http://192.168.1.20:4000
```

…or use your hosted backend URL (see `docs/DEPLOYMENT.md`). Then re-sync (below).

---

## 3. Build & open

```bash
cd frontend
npm install
npm run cap:sync     # builds the web app and copies it into android/
npm run cap:open     # opens the project in Android Studio
```

In Android Studio:
- **Run ▶** on an emulator or a connected device (enable USB debugging), or
- **Build → Build Bundle(s) / APK(s) → Build APK(s)** to produce an installable
  `.apk` (path is shown when it finishes, under
  `android/app/build/outputs/apk/`).

If `frontend/android/` is ever missing, recreate it with `npx cap add android`.

---

## 4. App icon & splash screen

A source logo is provided at `frontend/resources/icon.svg`. Capacitor's asset
generator needs **PNG** sources, so:

1. **Export the logo to PNG** at 1024×1024 → save as `frontend/resources/icon.png`.
   (Open `icon.svg` in any browser/Figma/Inkscape and export, or use your own logo.)
   Optionally add `frontend/resources/splash.png` at 2732×2732 (centered logo on
   a solid background) for a custom splash.

2. **Generate all Android icons + splash:**
   ```bash
   cd frontend
   npx @capacitor/assets generate --android
   npm run cap:sync
   ```
   This creates every density of launcher icon (and splash) inside `android/`.

3. Re-open / re-run in Android Studio to see the new icon and splash.

> `@capacitor/assets` installs `sharp` (image processing) on first run. If your
> network blocks the binary download, install it once with internet access.

---

## 5. Troubleshooting

| Symptom | Fix |
|---|---|
| Gradle sync fails about SDK location | Open once in Android Studio so it writes `android/local.properties` with your SDK path |
| App opens but shows nothing / network errors | `VITE_API_URL` points at `localhost`; set your LAN IP or hosted URL and `npm run cap:sync` |
| Cleartext HTTP blocked | For a quick demo, use an `https://` backend, or add a network-security-config; HTTPS is recommended |
| Old web content after changes | Re-run `npm run cap:sync` (it rebuilds the web app and copies it in) |

---

## 6. What's committed vs generated

- **Committed:** `capacitor.config.ts`, the `android/` native project,
  `resources/icon.svg`.
- **Generated locally (gitignored):** `android/build/`, `android/.gradle/`,
  `android/local.properties` (your SDK path), and the PNGs you export.
