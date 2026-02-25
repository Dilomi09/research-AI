# 🔍 research-AI

> A lightweight, open-source AI research assistant powered by the Gemini API.

## Why this exists
Premium AI research tools like Perplexity Pro are incredible, but the $20/month subscription costs can add up quickly. If you are a student (tackling A-Levels, an EPQ, or university research) or just someone who does dozens of deep-dive web searches daily but can't justify a premium AI subscription, **research-AI** is built for you. 

It provides a clean, fast, "Perplexity-style" experience that synthesizes information and helps you research efficiently—completely for free. All you need is your own Gemini API key.

## Features
- **Perplexity-style Synthesis:** Get clear, compiled answers to complex research questions.
- **100% Free to Use:** Runs locally using your own free Gemini API key via Google AI Studio.
- **Fast & Minimalist:** No bloat, just a clean interface optimized for deep-dive research and Mac workflows.

## Tech Stack
- **Frontend:** TypeScript, HTML, CSS (Vite)
- **AI Engine:** Google Gemini API 
- **Framework:** Based on the Google AI Studio repository template



## Release targets (.exe, .dmg, .apk)
This repository now includes a cross-platform release workflow at `.github/workflows/release.yml` that builds:
- **Windows installer**: `.exe` (NSIS)
- **macOS disk image**: `.dmg`
- **Android package**: `.apk` (debug)

### Compatibility notes
- Desktop releases are generated with **Electron** and package the same Vite build output for both Windows and macOS.
- Android releases are generated with **Capacitor** on top of the same web bundle (`dist`), which keeps feature parity across platforms.
- The workflow runs on native OS runners (`windows-latest`, `macos-latest`, `ubuntu-latest`) to avoid cross-compilation mismatches.
