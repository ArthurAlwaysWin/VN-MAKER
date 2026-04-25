# Phase 74 Validation

**Phase:** 74-major-screen-imagification
**Type:** UI/Feature

---

## Verification Commands

### Plan 01: Contract & Pipeline
```bash
node --test tests/uiImageContract.test.js tests/scanAssets.test.js
npx vitest run tests/themeManagerUiImage.test.js
```

### Plan 02: Runtime Rendering
```bash
npx vitest run tests/themeManagerUiImage.test.js tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js tests/gameMenuLayout.test.js tests/settingsStructured.test.js
npm run build
```

### Plan 03: Editor Integration
```bash
npx vitest run tests/majorScreenImageSettings.test.js tests/uiImageFieldFlow.test.js
npm run build
```

### Full Phase Suite
```bash
node --test tests/uiImageContract.test.js tests/scanAssets.test.js
npx vitest run tests/themeManagerUiImage.test.js tests/saveLoadScreenLayout.test.js tests/backlogScreenLayout.test.js tests/gameMenuLayout.test.js tests/settingsStructured.test.js tests/majorScreenImageSettings.test.js tests/uiImageFieldFlow.test.js
npm run build
```

---

## Acceptance Criteria

### MSI-01: Background Image Contract
- [ ] All four screens expose `ui.xxxScreen.chrome.backgroundImage`
- [ ] GameMenu reads chrome path first, falls back to legacy with @deprecated
- [ ] `applyScreenBackgrounds()` emits CSS for all four screen selectors
- [ ] Background images render with `object-fit: cover`

### MSI-02: Decoration Layer Contract
- [ ] All four screens expose `ui.xxxScreen.chrome.decorations[]`
- [ ] Decorations render as absolute-positioned, `pointer-events: none` overlays
- [ ] Settings supports both chrome.decorations and header.decorations
- [ ] Re-calling setLayout replaces decorations (no accumulation)

### MSI-03: Scan/Export Pipeline
- [ ] `collectScreenChromeUiImages()` collects chrome.backgroundImage for all 4 screens
- [ ] `collectScreenChromeUiImages()` collects chrome.decorations[].src for all 4 screens
- [ ] Legacy paths remain scanned for backward compatibility

### MSI-04: Editor UX
- [ ] MajorScreenImageSettings.vue embedded in SaveLoad/Backlog/GameMenu sections
- [ ] Settings DecorationSection supports chrome-level fields
- [ ] Performance hint visible at >3 decorations
- [ ] All image fields use pickUiImage/clearUiImage
- [ ] Preview propagation works via existing postMessage

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| GameMenu legacy path forgotten | @deprecated comment with milestone note |
| Decoration accumulation on re-render | setLayout clears previous decorations first |
| Settings header vs chrome decoration conflict | Separate collapsible sections, distinct DOM paths |
| Performance hint too aggressive | Soft hint only, no hard limit |
