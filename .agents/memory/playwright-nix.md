---
name: Playwright in Replit Nix
description: How to run Playwright Chromium on Replit's NixOS environment without missing .so errors
---

## The rule
Do NOT use Playwright's bundled `chromium_headless_shell` binary on Replit — it requires FHS system libraries (`libgbm.so.1`, `libudev.so.1`, `libglib-2.0.so.0`) that are not on the standard Linux path in Nix.

## Fix
1. Install the Nix-native Chromium: `installSystemDependencies({ packages: ["chromium"] })`
2. Find the binary path: `which chromium` → `/nix/store/<hash>-chromium-<ver>/bin/chromium`
3. Pass `executablePath` to `chromium.launch({ executablePath: nixChromiumPath, ... })`
4. `playwright install --with-deps` does NOT work in Replit (no apt access)

**Why:** Playwright's pre-built headless-shell is compiled for Ubuntu/Debian with standard FHS paths. Nix stores libraries under `/nix/store/…` and does not populate `/usr/lib`. The Nix-native `chromium` package is properly linked for the Nix LD path.

**How to apply:** Whenever writing Playwright automation in any api-server on Replit, always install `chromium` via Nix and use `executablePath` pointing to that binary. Hard-code the fallback path, but allow override via `PLAYWRIGHT_EXECUTABLE_PATH` env var.
