# Release & Launch Guide (.exe, .dmg, .apk)

This guide explains exactly how to:
1. Build release files.
2. Upload them to GitHub Releases.
3. Launch each file after downloading.

---

## 1) Generate release files and upload them automatically

From your local clone:

```bash
git tag v0.2.0
git push origin v0.2.0
```

What happens next:
- GitHub Actions runs `.github/workflows/release.yml`.
- It builds:
  - Windows: `.exe`
  - macOS: `.dmg`
  - Android: `.apk`
- It creates/updates the GitHub Release for that tag and uploads those files as assets.

Where to find them:
- GitHub repo → **Releases** → open tag `v0.2.0` → **Assets**.

---

## 2) Build only (without publishing a Release)

If you only want to test packaging:
- GitHub repo → **Actions** → **Build release artifacts** → **Run workflow**.
- Download generated files from the job artifacts.

---

## 3) How to launch each file

## Windows (`.exe`)
1. Download the `.exe` from Release assets.
2. Double-click it.
3. If SmartScreen warns, click **More info** → **Run anyway** (expected for unsigned binaries).
4. Finish installer and launch **research-AI** from Start Menu.

## macOS (`.dmg`)
1. Download the `.dmg` from Release assets.
2. Open the `.dmg` and drag **research-AI.app** into **Applications**.
3. First launch may show a Gatekeeper warning for unsigned app:
   - Right-click app → **Open** → **Open**.
4. Next launches work normally from Applications/Spotlight.

## Android (`.apk` debug)
1. Download the `.apk` from Release assets.
2. Move it to your Android device.
3. Enable install from unknown sources for your file manager/browser.
4. Tap the `.apk` and install.

Notes:
- This workflow currently outputs a **debug APK** (`app-debug.apk`).
- For public store distribution, switch to a signed release build later.

---

## 4) Compatibility expectations

- `.exe` is built on `windows-latest` runner.
- `.dmg` is built on `macos-latest` runner.
- `.apk` is built on `ubuntu-latest` with Android SDK/Java.

Using native runners avoids most cross-platform packaging mismatches.
