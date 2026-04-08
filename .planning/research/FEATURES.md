# Feature Landscape — Electron Desktop Game Export

**Domain:** Visual novel game editor — desktop packaging feature
**Researched:** 2025-07-23

## Table Stakes

Features users expect from a "desktop game export" feature. Missing = broken product.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One-click .exe output | Core promise of "desktop export" | Med | Orchestrate staging → packaging pipeline |
| Custom game title | Every game has a unique name | Low | Window title + .exe metadata |
| Custom window icon | Game needs its own identity, not Electron default | Med | PNG → .ico conversion + resedit embedding |
| Standalone execution | Double-click .exe, game runs | Low | @electron/packager's default behavior |
| No installer needed | PROJECT.md: "绿色免安装" | Low | @electron/packager outputs portable directory |
| Game saves persist | Players expect saves between sessions | Med | New save IPC handlers in game main.js, `app.getPath('userData')` |
| Asset loading works | Images, audio, fonts must display | Med | asset:// protocol in game's minimal main.js |
| Fullscreen/windowed toggle | Desktop games need window mode control | Low | set-window-mode IPC handler in game main.js |
| Progress indication | Packaging takes time (Electron download + copy) | Low | Reuse ExportModal 3-state pattern |
| Output folder selection | User chooses where to save | Low | Reuse existing dialog-open-directory IPC |

## Differentiators

Features that elevate the product but aren't strictly expected.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| ASAR selective packaging | Code in ASAR (protection), assets unpacked (performance) | Low | Single config option on @electron/packager |
| Electron binary caching | Second export is much faster (no re-download) | Free | @electron/get caches automatically in ~/.electron/ |
| Web/Desktop export toggle | Same ExportModal, user picks format | Low | UI addition to existing modal |
| Asset-only rebuild | Re-export with changed assets without full repackage | High | Would require detecting delta — defer |
| Custom window dimensions | Creator sets default game window size | Low | Resolution already in project.json |

## Anti-Features

Features to explicitly NOT build in v0.8.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| NSIS/MSI installer | PROJECT.md: explicitly excluded ("绿色免安装") | Portable directory output only |
| Auto-update mechanism | Standalone games don't auto-update | Games are distributed as-is |
| Code signing | Requires certificates, costs money, complex | Users can sign with their own tools post-export |
| macOS .app export | PROJECT.md: "仅 Windows 平台" for v0.8 | Listed as future (v0.8+), separate milestone |
| Linux AppImage export | Same — future milestone | Listed as future in PROJECT.md |
| Asset compression/optimization | PROJECT.md: "v0.8 只做资源拷贝" | Copy assets as-is |
| Splash screen customization | PROJECT.md: "保持简单" | No splash screen for now |
| Loading screen | Adds complexity, games load fast from local disk | Chromium loads local files instantly |
| Multiple Electron versions | Adds UI complexity, testing burden | Pin to editor's Electron major (41.x) |
| DevTools in exported game | Security risk, not needed for players | Disable in production game main.js |

## Feature Dependencies

```
PNG icon support → png-to-ico conversion → @electron/packager icon option
Custom game title → package.json generation → .exe metadata via resedit
Save system → Game main.js IPC handlers → app.getPath('userData')
Asset loading → asset:// protocol in game main.js → ASAR unpack config
Export UI → ExportModal format toggle → New 'desktop' export-game IPC path
Engine bundle → Vite web build (existing) → Copy to staging dir
```

## MVP Recommendation

Prioritize (must-have for v0.8):
1. **Staging directory generation** — minimal main.js + preload.js + package.json
2. **@electron/packager integration** — programmatic API call in export handler
3. **Custom icon** — PNG → .ico conversion with png-to-ico
4. **Game save system** — IPC handlers in game main.js, userData path
5. **ExportModal desktop option** — web/desktop toggle in existing UI
6. **ASAR with selective unpack** — code protected, assets accessible

Defer to v0.9+:
- macOS/Linux targets
- Asset compression/optimization
- Splash screen / loading animation
- Custom Electron version selection
- Delta/incremental export

## Sources

- PROJECT.md requirements and out-of-scope declarations (direct inspection)
- Existing ExportModal and export-game IPC patterns (direct inspection)
- @electron/packager API documentation (npm registry, HIGH confidence)
