---
status: partial
phase: 19-save-system-upgrade
source: [19-VERIFICATION.md]
started: 2026-04-04
updated: 2026-04-04
---

## Current Test

[awaiting human testing]

## Tests

### 1. Save → File System Round-Trip
expected: Save creates `saves/slot_001.json` + `saves/slot_001.jpg` on disk. Loading restores exact game position (scene, page, dialogue, background, characters).
result: [pending]

### 2. Screenshot Thumbnail Quality
expected: 320×180 pixel JPEG showing game scene (background + characters, no dialogue box). File size ~15-30KB.
result: [pending]

### 3. Legacy Migration
expected: Toast "检测到旧存档，已自动迁移" appears. Old saves appear in save/load screen. `.migrated` file in `saves/`. No repeat toast.
result: [pending]

### 4. asset:// Thumbnail Loading
expected: `<img src="asset://saves/slot_001.jpg">` loads without errors in DevTools console.
result: [pending]

### 5. Error Toast on Save Failure
expected: Toast "存档失败：{error}" appears at bottom-center, disappears after 3s. Game continues uninterrupted.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
