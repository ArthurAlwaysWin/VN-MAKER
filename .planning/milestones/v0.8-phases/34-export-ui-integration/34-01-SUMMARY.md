---
phase: 34-export-ui-integration
plan: "01"
status: complete
started: 2025-07-23
completed: 2025-07-23
---

## Summary

Added Web/Desktop format toggle, desktop icon picker with thumbnail preview, and format-aware export dispatch to ExportModal.vue. Added `read-file-base64` IPC handler to electron/main.js for in-renderer icon preview.

## Key Changes

### ExportModal.vue
- **Header**: Added `format-toggle` segment buttons (Web | 桌面版) next to 📦 title
- **Default**: Format defaults to `desktop` (D-03)
- **Desktop mode**: 48×48 icon thumbnail with `default-game-icon.png` fallback + "使用默认图标"
- **Icon picker**: `pickIcon()` opens file dialog (PNG only), reads base64 via IPC, shows thumbnail preview + filename
- **Export dispatch**: `startExport()` branches to `export-game-desktop` (desktop) or `export-game` (web) IPC
- **Shared fields**: gameTitle, outputDir, enableZip preserved across format switch

### electron/main.js
- **New IPC**: `read-file-base64` handler reads file as base64 for renderer preview

## Commits

| Hash | Message |
|------|---------|
| b9cd291 | feat(34-01): add format toggle, desktop icon picker, and export dispatch to ExportModal |

## Key Files

### Created
(none — modification only)

### Modified
- `src/editor/components/ExportModal.vue` — Format toggle, icon picker, export dispatch
- `electron/main.js` — read-file-base64 IPC handler

## Verification

- 14/14 automated checks passed
- Human visual verification: approved

## Deviations

None — implementation followed plan exactly.

## Self-Check: PASSED
