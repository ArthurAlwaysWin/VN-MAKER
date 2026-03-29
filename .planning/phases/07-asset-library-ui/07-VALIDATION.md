---
phase: 07
slug: asset-library-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test framework in project) |
| **Config file** | none |
| **Quick run command** | `npx vite build` (build verification) |
| **Full suite command** | `npx vite build` + manual UI check |
| **Estimated runtime** | ~15 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npx vite build`
- **After every plan wave:** Build + manual visual verification
- **Before `/gsd-verify-work`:** Full build must pass, manual UAT
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | ASSET-01 | build+manual | `npx vite build` | N/A | ⬜ pending |
| 07-01-02 | 01 | 1 | ASSET-02 | build+manual | `npx vite build` | N/A | ⬜ pending |
| 07-01-03 | 01 | 1 | ASSET-05 | manual | Visual: thumbnail grid | N/A | ⬜ pending |
| 07-01-04 | 01 | 1 | ASSET-06 | manual | Visual: audio controls | N/A | ⬜ pending |
| 07-01-05 | 01 | 1 | ASSET-07 | manual | Visual: name/color edit | N/A | ⬜ pending |
| 07-01-06 | 01 | 1 | ASSET-08 | manual | Visual: expression grid | N/A | ⬜ pending |
| 07-01-07 | 01 | 1 | ASSET-09 | manual | Visual: file picker import | N/A | ⬜ pending |
| 07-01-08 | 01 | 1 | ASSET-10 | manual | Visual: delete confirm | N/A | ⬜ pending |
| 07-01-09 | 01 | 1 | ASSET-11 | manual | Visual: inline rename | N/A | ⬜ pending |
| 07-01-10 | 01 | 1 | ASSET-13 | manual | Visual: drag-drop import | N/A | ⬜ pending |
| 07-01-11 | 01 | 1 | ASSET-14 | manual | Visual: font preview | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework installation needed — this is a visual UI phase verified through build + manual testing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tab count 6→5 | ASSET-01 | Visual UI layout | Open editor, count tabs, verify "资源库" exists |
| Sub-tab switching | ASSET-02 | Interactive behavior | Click each sub-tab, verify content change |
| Thumbnail grid | ASSET-05 | Visual rendering | Import background, verify grid with thumbnail |
| Audio playback | ASSET-06 | Audio hardware | Import audio, test play/pause/seek |
| Character editing | ASSET-07 | Form interaction | Edit name/color, verify persistence |
| Expression management | ASSET-08/09 | Visual + file dialog | Import expression, verify grid display |
| Delete confirmation | ASSET-10 | Dialog interaction | Right-click delete, verify confirm dialog |
| Inline rename | ASSET-11 | Double-click interaction | Double-click name, edit, verify save |
| Drag-drop import | ASSET-13 | OS drag-drop | Drag file from explorer, verify import |
| Font preview | ASSET-14 | Font rendering | Import font, verify sample text preview |

---

## Validation Sign-Off

- [ ] All tasks have build verify or manual test instructions
- [ ] Sampling continuity: build after every commit
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s (build)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
