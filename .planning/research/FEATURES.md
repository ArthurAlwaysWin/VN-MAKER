# Feature Landscape — Web Export

**Domain:** Visual novel creator → game export/deployment
**Researched:** 2025-07-22

## Table Stakes

Features users expect from a game export tool. Missing = export feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One-click folder export | Every game maker has "Export" → folder output | Medium | IPC handler + file ops + HTML gen |
| Playable in browser | The entire point of web export | Medium | Engine web adaptation (basePath, SaveManager) |
| Only referenced assets copied | Exporting unused assets wastes space and leaks content | Medium | JSON traversal scanner |
| Custom game title | Every exported game needs its own title in browser tab | Low | HTML template interpolation |
| Save/load works in browser | Players expect to save progress | Medium | WebSaveManager with localStorage |
| All game features functional | Title screen, settings, choices, backlog, quick actions | Low | Most already work; basePath fixes needed |

## Differentiators

Features that elevate the export beyond basic functionality.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Optional ZIP packaging | itch.io requires ZIP upload; saves users a manual step | Low | fflate already installed |
| Custom favicon | Professional touch; game icon in browser tab | Low | File copy; user provides .ico/.png |
| Smart asset scanning | Only copies referenced assets, not entire project dir | Medium | Prevents bloated exports |
| Export progress feedback | Users know it's working on large projects | Low | IPC event stream from main process |

## Anti-Features

Features to explicitly NOT build in v0.7.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Auto-open browser after export | PROJECT.md explicitly excludes; editor preview is sufficient | Show "Export complete" with output path |
| Asset compression/optimization | PROJECT.md defers to later; image compression (sharp/canvas) adds significant complexity | Copy assets as-is; users optimize source files |
| Single-file HTML embed | Encoding all assets as base64 in one HTML file creates massive files (100+ MB) | Standard folder structure with relative paths |
| Mobile-responsive layout | PROJECT.md: desktop-first; engine is hardcoded 1280×720 | Keep fixed viewport; mobile support is future |
| Electron desktop build (.exe) | PROJECT.md defers to v0.8+; requires electron-builder setup | Only web export for v0.7 |
| Offline Google Fonts bundling | Non-trivial (download + @font-face rewrite); Noto Sans/Serif SC is 5+ MB | Keep CDN import; works with internet |
| Encryption/obfuscation | Adds complexity; false security (JS is readable in browser) | Ship unobfuscated |
| Loading screen customization | PROJECT.md: "保持简单" (keep it simple) | Engine loads fast enough; skip for now |

## Feature Dependencies

```
Engine Web Adaptation → Export Pipeline (pipeline needs working web runtime)
Asset Reference Scanner → Export Pipeline (pipeline uses scanner to know which files to copy)
Export Pipeline → Export UI (UI calls pipeline via IPC)
Export Pipeline → ZIP Packaging (ZIP wraps the folder output)
Custom Title → HTML Template (title goes in template)
Custom Favicon → HTML Template + File Copy
```

## MVP Recommendation

Prioritize:
1. **Engine web adaptation** — Without this, exported games crash
2. **Folder export with smart asset scanning** — Core value delivery
3. **Custom game title** — Minimal effort, big UX impact
4. **ZIP packaging** — itch.io workflow enabler

Defer:
- **Export progress feedback** — Nice-to-have; small projects export instantly
- **Favicon customization** — Can default to no favicon initially
- **Export size reporting** — Informational only; not blocking

## Sources

- PROJECT.md v0.7 target features (direct inspection)
- PROJECT.md out-of-scope list (direct inspection)
- Engine source analysis (src/main.js, src/engine/, src/ui/)
