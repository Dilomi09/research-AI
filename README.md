


## Release targets (.exe, .dmg, .apk)
This repository now includes a cross-platform release workflow at `.github/workflows/release.yml` that builds:
- **Windows installer**: `.exe` (NSIS)
- **macOS disk image**: `.dmg`
- **Android package**: `.apk` (debug)

### Compatibility notes
- Desktop releases are generated with **Electron** and package the same Vite build output for both Windows and macOS.
- Android releases are generated with **Capacitor** on top of the same web bundle (`dist`), which keeps feature parity across platforms.
- The workflow runs on native OS runners (`windows-latest`, `macos-latest`, `ubuntu-latest`) to avoid cross-compilation mismatches.
