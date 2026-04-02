---
phase: 17
slug: global-font-settings
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-02
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework installed (project-wide gap) |
| **Config file** | none |
| **Quick run command** | PowerShell grep/pattern verification embedded in each task |
| **Full suite command** | `npx vite build` (build verification) |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run embedded PowerShell verification scripts from task `<automated>` blocks
- **After every plan wave:** Run `npx vite build` to verify no import/compilation errors
- **Before `/gsd-verify-work`:** Full build must succeed + all manual verifications passed
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | FONT-01, FONT-02 | pattern-check | grep for `getDialogueBox`, `applyGlobalStyle` in modified files | ✅ | ⬜ pending |
| 17-01-02 | 01 | 1 | FONT-02 | pattern-check | grep for `applyGlobalStyle` in main.js, fontOverride wiring | ✅ | ⬜ pending |
| 17-02-01 | 02 | 2 | FONT-03, FONT-04 | pattern-check | grep for `DialogueBoxSettings`, optgroup, preview elements | ✅ | ⬜ pending |
| 17-02-02 | 02 | 2 | FONT-04 | pattern-check | grep for `dialogueBox` in CanvasPreview, `useGlobal` in PageInspector | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework installation needed — all verification uses file pattern checks and build verification.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Font dropdown renders each option in its own font | FONT-03 | Visual rendering — cannot grep for font rendering | Open Project Settings, check font dropdown visually |
| Mini preview updates live when changing settings | FONT-04 | Visual real-time update | Change each slider/picker, verify preview box updates |
| Canvas dialogue box reflects global settings | FONT-04 | Visual rendering in canvas | Set custom font, switch to Game Content tab, verify dialogue |
| Per-page override works in canvas | FONT-04 | Visual rendering with override | Uncheck "使用全局设置" on a page, set different font, verify canvas |
| Engine preview renders with global fonts | FONT-02 | Requires iframe engine preview | Click preview button, verify dialogue text uses configured font |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
