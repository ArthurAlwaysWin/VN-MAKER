# Plan 13-01 Summary — Store Helpers + SceneTree Context Menu

**Status:** ✅ Complete  
**Commit:** `9ca3da8`  
**Wave:** 1

## What was built

### script.js store additions
- `convertPageType(sceneId, pageIndex)` — toggles page between normal↔choice
  - Normal→Choice: sets type='choice', adds empty prompt + 2 default options
  - Choice→Normal: removes prompt/options, ensures dialogues array exists
- `setSceneNext(sceneId, nextSceneId)` — sets `scene.next` for branch-merge chaining
- Both functions push undo state via `pushState()`

### SceneTree.vue context menu
- New menu item between "重命名" and "删除页面"
- Shows "转换为选择页" for normal pages, "转换为普通页" for choice pages
- Choice→Normal conversion shows confirmation dialog (data loss warning)
- `contextMenuPageIsChoice` computed for reactive label switching

## Verification
- Automated checks: PASSED (both tasks)
- Build: PASSED (all modules)

## Requirements covered
- **BRANCH-01** (partial): Store layer for choice pages
- **BRANCH-03** (partial): SceneTree type toggle UX
