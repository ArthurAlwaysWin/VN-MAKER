# Phase 7: Asset Library UI - Research

**Researched:** 2026-03-30
**Domain:** Vue 3 UI development — unified asset management view with sub-tab switching, thumbnail grids, audio playback, inline editing, drag-drop import, context menus
**Confidence:** HIGH

## Summary

Phase 7 is a pure frontend Vue 3 phase that replaces two existing views (`Assets.vue` + `Characters.vue`) with a single unified `ResourceLibrary.vue` containing four sub-tabs (背景/角色/音频/字体). All backend infrastructure is complete from Phase 6 — the Pinia asset store, IPC handlers (`import-assets`, `delete-asset`, `list-assets`, `select-asset`), validation, and font loading are all ready. The phase requires zero new npm dependencies.

The main technical challenges are: (1) a `rename-asset` IPC handler must be added to `electron/main.js` since it does not currently exist and ASSET-11 requires inline renaming of files on disk, (2) the custom context menu, inline edit, mini audio player, and drag-drop overlay are all new interaction patterns not yet present in the codebase, (3) character data lives in `script.data.characters` (via `useScriptStore`) while file data lives in `useAssetStore` — the character editor sub-tab must coordinate both stores.

**Primary recommendation:** Build incrementally by sub-tab — start with the ResourceLibrary shell + App.vue tab change + backgrounds grid (simplest), then audio list with mini player, then font grid, then character editor (most complex), then shared features (context menu, inline rename, drop overlay, import notification). The `rename-asset` IPC handler must be added early since 3 of 4 sub-tabs need it.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 使用子标签页切换模式 — 顶部 4 个分类标签（🖼️ 背景 / 👤 角色 / 🎵 音频 / 🔤 字体），每次显示一个分类的内容，复用现有 Assets.vue 的子标签模式
- **D-02:** 标签数从 6 变 5 — 删除独立的"素材库"和"角色"标签页，合并为统一"资源库"标签页
- **D-03:** 使用侧栏+编辑区双栏布局 — 左侧角色列表（含头像缩略图），右侧显示选中角色的名称/颜色编辑 + 表情网格
- **D-04:** 角色头像 = 该角色第一张差分图的上半部分裁剪（CSS object-fit: cover + object-position: top）
- **D-05:** 角色差分（表情）是用户上传的图片资产，不提供图片编辑功能，只显示缩略图+名称
- **D-06:** 表情操作通过右键菜单实现 — 右键表情缩略图弹出菜单：重命名 / 删除。简洁不占空间
- **D-07:** 可修改表情名称（重命名），但不编辑图片本身
- **D-08:** 编辑区内表情以缩略图网格显示（grid），点击"+ 导入表情"通过文件选择器添加
- **D-09:** 迷你播放器样式 — play/pause 圆形按钮 + 进度条（可拖拽定位） + 时长显示（当前/总时长）
- **D-10:** 纯 HTMLAudioElement API 实现，无额外依赖
- **D-11:** 全视图覆盖层模式 — 用户拖文件进入资源库区域时显示半透明蓝色覆盖层 + "释放导入" 文字提示
- **D-12:** 导入目标 = 当前活动子标签的分类（如当前在"背景"标签则导入到 backgrounds/）
- **D-13:** 导入完成后显示结果 — 成功数量 + 失败文件列表（继承 Phase 6 D-02 批量导入失败处理）
- **D-14:** 删除操作 — 所有资源类型统一使用确认对话框（Electron dialog）
- **D-15:** 重命名操作 — 就地编辑（inline edit），点击文件名进入编辑模式

### Agent's Discretion
- 子标签页的具体样式细节（间距、图标大小）
- 缩略图网格的列数和卡片尺寸
- 角色侧栏的宽度
- 进度条的精确样式
- 覆盖层的动画效果和过渡时间
- 右键菜单的实现方式（自定义 CSS 菜单 vs Electron context menu）
- 空状态的具体文案和图标

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ASSET-01 | 用户在一个统一视图中管理所有项目资源（标签数 6→5） | App.vue tab array modification (lines 78-94), replace 'assets'+'characters' tabs with 'resource-library'. Component map updated. |
| ASSET-02 | 资源按四个分类区显示：背景、角色、音频、字体 | ResourceLibrary.vue with 4 sub-tabs. Reuse existing `.tabs` button group CSS pattern from Assets.vue. |
| ASSET-05 | 图片资源以缩略图网格显示 | Reuse existing `.asset-grid` CSS from Assets.vue (auto-fill, minmax(140px, 1fr)). Images via `asset://backgrounds/{filename}`. |
| ASSET-06 | 音频资源带播放控件 | Custom MiniPlayer.vue using HTMLAudioElement API (D-10). No native `<audio controls>`. Progress via `timeupdate` event, seek via click/drag on track. |
| ASSET-07 | 角色数据面板可编辑名称、颜色、表情列表 | CharacterEditor.vue reads/writes `script.data.characters[id]`. Color picker pattern from Characters.vue/SettingsDesigner.vue (`input[type=color]` + hex text). |
| ASSET-08 | 角色表情按角色分组显示缩略图 | Expression grid in editor pane. Images via `asset://characters/{path}`. Data from `script.data.characters[id].expressions`. |
| ASSET-09 | 通过文件选择器导入表情图片 | Use `assets.selectAsset(['characters'])` or `assets.importAssets('characters', fileDataArray)` from asset store. |
| ASSET-10 | 用户可删除资源（带确认对话框） | `confirm()` dialog (matching existing codebase pattern in Characters.vue). Then call `assets.deleteAsset(category, filename)`. |
| ASSET-11 | 用户可重命名资源（就地编辑文件名） | **Requires new `rename-asset` IPC handler** in electron/main.js (does not exist yet). InlineEdit.vue component for UI. |
| ASSET-13 | 字体列表显示文字样本预览 | FontGrid.vue applying loaded `font-family` via `:style`. Fonts already loaded by Phase 6 `loadProjectFonts()`. Sample text: "你好世界 AaBbCc 1234". |
| ASSET-14 | 支持从系统文件管理器拖放多个文件批量导入 | DropOverlay.vue using `dragenter`/`dragleave`/`drop` events + DataTransfer API. File reading via `FileReader.readAsArrayBuffer()`. Import via `assets.importAssets()`. |
</phase_requirements>

## Project Constraints (from copilot-instructions.md)

- **Language:** JavaScript ES Modules only — no TypeScript migration
- **Framework:** Vue 3 with `<script setup>` Composition API
- **State management:** Pinia Composition API stores (ref/computed)
- **Module style:** Named exports only — no default exports in JS modules (Vue SFCs implicit default is fine)
- **Import style:** Explicit `.js` extensions for JS imports, relative paths only (no aliases)
- **Code style:** 2-space indent, single quotes, semicolons always, trailing commas in multi-line
- **Naming:** PascalCase for Vue SFCs, camelCase for variables/functions, UPPER_SNAKE_CASE for constants
- **Error handling:** IPC returns `{ success, error? }` objects; use `console.error` with `[ModuleName]` prefix; never throw uncaught
- **IPC safety:** Always `JSON.parse(JSON.stringify(data))` before `ipcRenderer.invoke()` to avoid reactive Proxy serialization errors
- **Styling:** Dark theme (`#1e1e1e` bg, `#252526` cards, `#007acc` accent), pure scoped CSS, no CSS framework
- **UI language:** Chinese (中文) for all user-facing text
- **Security:** `isInsideProject()` path validation on all file operations; CSS sanitization via `sanitizeCssValue()`

## Standard Stack

### Core (already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | ^3.5.31 | Component framework | Existing project framework |
| Pinia | ^3.0.4 | State management | Existing stores pattern |
| Electron | ^41.0.4 | Desktop shell + IPC | Existing IPC infrastructure |
| Vite | ^6.3.0 | Build tool | Existing build config |

### Supporting (built-in browser APIs — no packages)

| API | Purpose | When to Use |
|-----|---------|-------------|
| HTMLAudioElement | Audio playback (D-09/D-10) | MiniPlayer.vue — play/pause, seek, duration |
| DataTransfer API | Drag-drop file import (D-11/D-14) | DropOverlay.vue — read dropped files |
| FontFace API | Font preview (ASSET-13) | Already loaded by Phase 6 `loadProjectFonts()` |
| FileReader API | Convert dropped File to ArrayBuffer | DropOverlay.vue — prepare data for IPC import |

### No Alternatives Needed

Zero new npm dependencies required. All functionality is achievable with Vue 3 + built-in browser APIs + existing Electron IPC.

## Architecture Patterns

### Recommended Component Structure

```
src/editor/
├── views/
│   └── ResourceLibrary.vue       # Master view (replaces Assets.vue + Characters.vue)
├── components/
│   └── resource-library/         # NEW directory for phase 7 components
│       ├── AssetGrid.vue         # Thumbnail grid (backgrounds sub-tab)
│       ├── CharacterEditor.vue   # Sidebar + editor (characters sub-tab)
│       ├── AudioList.vue         # Audio rows with mini players
│       ├── FontGrid.vue          # Font preview cards
│       ├── MiniPlayer.vue        # Single audio row player
│       ├── InlineEdit.vue        # Reusable inline rename field
│       ├── ContextMenu.vue       # Custom right-click menu
│       ├── DropOverlay.vue       # Full-view drag-drop overlay
│       └── ImportNotification.vue # Auto-dismissing notification bar
├── stores/
│   └── assets.js                 # Existing Pinia store (may need renameAsset method)
```

### Pattern 1: ResourceLibrary Master View with Sub-Tab Routing

**What:** Single view component that renders one of four sub-tab components based on active tab state. Shared toolbar with sub-tab button group and import button.

**When to use:** This is the established pattern in the codebase — Assets.vue already does sub-tab switching with a `currentTab` ref.

**Example:**
```vue
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAssetStore } from '../stores/assets.js';
import { useScriptStore } from '../stores/script.js';

const assets = useAssetStore();
const script = useScriptStore();
const activeSubTab = ref('backgrounds');

// Import button visibility — hidden for characters tab (has its own import)
const showImportButton = computed(() => activeSubTab.value !== 'characters');

// Category label map for drop overlay
const categoryLabels = {
  backgrounds: '背景',
  characters: '角色',
  audio: '音频',
  fonts: '字体',
};

function switchTab(tab) {
  activeSubTab.value = tab;
}

onMounted(() => {
  assets.loadAll();
});
</script>
```

### Pattern 2: Inline Edit with Enter/Escape/Blur

**What:** Replace a display `<span>` with an `<input>` on double-click. Confirm on Enter/blur, cancel on Escape. Auto-select text on activation.

**When to use:** Filename renaming (backgrounds, audio, fonts) and expression name editing.

**Example:**
```vue
<script setup>
import { ref, nextTick } from 'vue';

const props = defineProps({
  value: { type: String, required: true },
  // If true, strip extension for editing and re-append on save
  preserveExtension: { type: Boolean, default: false },
});
const emit = defineEmits(['save', 'cancel']);

const isEditing = ref(false);
const editValue = ref('');
const inputRef = ref(null);

async function startEdit() {
  const ext = props.preserveExtension
    ? props.value.substring(props.value.lastIndexOf('.'))
    : '';
  editValue.value = props.preserveExtension
    ? props.value.substring(0, props.value.lastIndexOf('.'))
    : props.value;
  isEditing.value = true;
  await nextTick();
  inputRef.value?.select();
}

function confirm() {
  const trimmed = editValue.value.trim();
  if (!trimmed) {
    cancel();
    return;
  }
  const ext = props.preserveExtension
    ? props.value.substring(props.value.lastIndexOf('.'))
    : '';
  isEditing.value = false;
  emit('save', trimmed + ext);
}

function cancel() {
  isEditing.value = false;
  emit('cancel');
}
</script>
```

### Pattern 3: Custom Context Menu (D-06)

**What:** A `position: fixed` menu rendered at mouse coordinates on right-click, dismissed by clicking outside or pressing Escape.

**When to use:** Right-click on expression thumbnails, background cards, audio rows, font cards.

**Key implementation details:**
- Use `@contextmenu.prevent` on target elements to capture right-click
- Position menu at `{ top: event.clientY, left: event.clientX }` with viewport boundary clamping
- Add document-level click and keydown listeners on mount, remove on unmount
- Use `z-index: 1000` to appear above all content
- CSS custom dark-theme menu (not Electron native — per UI-SPEC §3.2)

### Pattern 4: Audio Player with Singleton Playback (D-09)

**What:** Only one audio plays at a time. MiniPlayer.vue manages its own HTMLAudioElement instance. Parent AudioList.vue tracks which player is active.

**Key implementation details:**
- Each MiniPlayer creates `new Audio()` on mount (not a `<audio>` DOM element)
- Parent emits "stop other players" when a new one starts
- Progress bar: `requestAnimationFrame` loop during playback for smooth updates (or `timeupdate` events, ~4Hz)
- Seek: click position on track → `audio.currentTime = (clickX / trackWidth) * audio.duration`
- Duration: listen to `loadedmetadata` event, format as `m:ss`
- Cleanup: `audio.pause(); audio.src = ''` on `onBeforeUnmount`

### Pattern 5: Drag-Drop File Import (D-11/D-14)

**What:** DropOverlay.vue wraps the entire ResourceLibrary view. Shows a translucent overlay when files are dragged over. On drop, reads files and calls import IPC.

**Key implementation details:**
- Track `dragenter`/`dragleave` with a counter (not boolean) to handle child element boundary crossings
- On `drop`: iterate `event.dataTransfer.files`, read each via `file.arrayBuffer()`, pass to `assets.importAssets()`
- For fonts: use `assets.importFont()` which also handles metadata + hot-loading
- Import target = `activeSubTab.value` (D-12)
- Show ImportNotification with results (D-13)

### Pattern 6: Store Coordination for Character Editor

**What:** Character data lives in `useScriptStore().data.characters` (name, color, expressions object). Character expression *files* live in `useAssetStore().files.characters`. The character editor must read/write both stores.

**Key implementation details:**
- Character list: `Object.entries(script.data.characters)` for sidebar
- Selected character: `script.data.characters[selectedId]` — reactive, direct mutation triggers auto-save watcher
- Expression images: `asset://characters/{path}` where `path` is the value in `character.expressions[exprName]`
- Adding expression: file picker → `assets.importAssets('characters', fileData)` → update `character.expressions[newName] = 'characters/{savedFilename}'`
- Deleting expression: remove key from `character.expressions[exprName]` (data only — don't delete the image file, other characters may use it)
- Call `script.pushState()` after character data modifications for undo support

### Anti-Patterns to Avoid

- **Don't use `<audio controls>`:** The native browser audio element is not styleable. Build a custom player with HTMLAudioElement API (D-10).
- **Don't mutate store state in child components without coordination:** Character editor should modify `script.data.characters[id]` directly (Vue reactivity handles it), but always call `script.pushState()` on significant changes.
- **Don't use `window.confirm()` for asset deletion if Electron dialog is available:** The UI-SPEC allows either `confirm()` or Electron dialog. Since the codebase already uses `confirm()` in `Characters.vue` line 131, use `confirm()` for simplicity and consistency (D-14 says "确认对话框" without requiring native Electron dialog specifically).
- **Don't create separate event buses:** Use Pinia stores for shared state. Use props/emits for parent-child communication.
- **Don't forget `JSON.parse(JSON.stringify())` before IPC:** Pitfall #3 from PITFALLS.md — every `ipcRenderer.invoke` call must deconstruct reactive Proxy objects.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio playback | Custom WebAudio API pipeline | `new Audio()` (HTMLAudioElement) | Simple play/pause/seek, no effects needed |
| Font preview rendering | Canvas-based text rendering | CSS `font-family` binding on div | Fonts already loaded via FontFace API |
| File validation | Client-side format checking | Phase 6 `validateAsset.js` (server-side) | Already handles magic bytes + extension whitelist |
| File naming conflicts | Manual counter logic | Phase 6 `uniqueFilename()` in main.js | Already handles auto-increment naming |
| Reactive state management | Custom event bus or pubsub | Pinia stores (existing) | Already established pattern |
| File dialog | Custom file picker UI | `assets.selectAsset()` → Electron native dialog | Already implemented in Phase 6 |

**Key insight:** Phase 6 built ALL the backend infrastructure. Phase 7 is purely UI — every file operation goes through existing IPC handlers and store methods. The one exception is `rename-asset` which needs a new IPC handler.

## Common Pitfalls

### Pitfall 1: Missing `rename-asset` IPC Handler
**What goes wrong:** ASSET-11 requires renaming files on disk. There is NO `rename-asset` IPC handler in `electron/main.js`. Without it, inline rename only works in the UI but the file on disk keeps its old name.
**Why it happens:** Phase 6 implemented import/delete/list/select but not rename — it wasn't in Phase 6's requirements.
**How to avoid:** Add a `rename-asset` IPC handler to `electron/main.js` early in the phase. Pattern: receive `{ category, oldName, newName }`, validate paths with `isInsideProject()`, call `fs.rename()`, return `{ success, newName }`. Also add `renameAsset()` method to the asset store.
**Warning signs:** Inline edit "saves" but filename reverts on refresh.

### Pitfall 2: Drag-Drop Overlay Flicker on Child Boundaries
**What goes wrong:** Overlay shows/hides rapidly as the cursor crosses child element boundaries (each child fires `dragenter`/`dragleave` independently).
**Why it happens:** HTML5 drag events fire `dragleave` when entering a child, then `dragenter` on the child, creating a flicker.
**How to avoid:** Use a counter: increment on `dragenter`, decrement on `dragleave`. Show overlay when counter > 0, hide when counter === 0. Reset counter on `drop`.
**Warning signs:** Overlay flashes when dragging over content areas.

### Pitfall 3: Audio Player Memory Leak
**What goes wrong:** Audio elements accumulate in memory if not properly cleaned up when the component unmounts or when switching tabs.
**Why it happens:** `new Audio()` creates a media element that holds a network connection. If not paused and dereferenced, it stays in memory.
**How to avoid:** In MiniPlayer.vue `onBeforeUnmount()`, call `audio.pause()`, set `audio.src = ''`, and remove event listeners. Also handle `keep-alive` — since `<keep-alive>` is used in App.vue, `onDeactivated`/`onActivated` hooks may be needed.
**Warning signs:** Multiple audio files playing simultaneously after tab switching.

### Pitfall 4: Expression Import Path Mismatch
**What goes wrong:** After importing an expression image, the expression path stored in `script.data.characters[id].expressions[name]` doesn't match the actual file location, so the thumbnail shows a broken image.
**Why it happens:** `import-assets` returns `{ original: 'smile.png', saved: 'smile.png' }` (or `smile-1.png` if conflict). The path in the expressions object must be `characters/smile.png` (relative to assets/), not just `smile.png`.
**How to avoid:** After `importAssets('characters', files)`, construct the expression path as `characters/${result.imported[i].saved}`.
**Warning signs:** Expression thumbnails show broken images after import.

### Pitfall 5: Font Deletion Without Metadata Cleanup (Pitfall #8 from PITFALLS.md)
**What goes wrong:** Deleting a font file via the UI removes the file but leaves orphan metadata in `script.data.assets.fonts[]`.
**Why it happens:** `assets.deleteAsset('fonts', filename)` only removes the file on disk. The metadata array is managed separately.
**How to avoid:** After deleting a font file, also remove the corresponding entry from `script.data.assets.fonts` and call `assets.syncFontMeta(script.data)`.
**Warning signs:** Deleted fonts still appear in font selection dropdowns in other designers.

### Pitfall 6: Character Deletion Not Cleaning Up Expression References
**What goes wrong:** Deleting a character removes the entry from `script.data.characters` but doesn't clean up any scene commands that reference that character (e.g., `show_character` commands).
**Why it happens:** Scene commands reference characters by ID string. Removing the character data doesn't update scene commands.
**How to avoid:** This is acceptable for now — the engine already handles missing characters gracefully (skips the command). But the delete confirmation should warn: "该角色的所有表情数据也会被移除" (per UI-SPEC §3.3).
**Warning signs:** Not a crash, but ghost characters in scenes after deletion.

### Pitfall 7: `keep-alive` Interaction with Component State
**What goes wrong:** The ResourceLibrary view is wrapped in `<keep-alive>` via App.vue. If the component doesn't refresh its data when re-activated, it may show stale file lists.
**Why it happens:** `<keep-alive>` caches the component instance. `onMounted` only fires once.
**How to avoid:** Use `onActivated()` lifecycle hook to refresh asset lists when the user switches back to the 资源库 tab. Call `assets.loadAll()` in `onActivated`.
**Warning signs:** New files imported via other means (e.g., file manager) don't appear until full page refresh.

## Code Examples

### App.vue Tab Change (ASSET-01, ASSET-02)

```javascript
// Before (6 tabs):
const tabs = [
  { id: 'scenes', icon: '🎬', label: '游戏内容' },
  { id: 'title', icon: '🖼️', label: '标题页' },
  { id: 'settings-design', icon: '⚙️', label: '设置页' },
  { id: 'assets', icon: '🎨', label: '素材库' },
  { id: 'characters', icon: '👤', label: '角色' },
  { id: 'project-settings', icon: '📦', label: '项目设置' },
];

// After (5 tabs):
const tabs = [
  { id: 'scenes', icon: '🎬', label: '游戏内容' },
  { id: 'title', icon: '🖼️', label: '标题页' },
  { id: 'settings-design', icon: '⚙️', label: '设置页' },
  { id: 'resource-library', icon: '📦', label: '资源库' },
  { id: 'project-settings', icon: '⚡', label: '项目设置' },
];
```

### rename-asset IPC Handler (New — Required for ASSET-11)

```javascript
// electron/main.js — add after delete-asset handler
ipcMain.handle('rename-asset', async (event, { category, oldName, newName }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };

    const dir = path.join(currentProjectPath, 'assets', category);
    const oldPath = path.join(dir, oldName);
    const newPath = path.join(dir, newName);

    if (!isInsideProject(oldPath) || !isInsideProject(newPath)) {
      return { success: false, error: 'Invalid path' };
    }
    if (!existsSync(oldPath)) {
      return { success: false, error: 'File not found' };
    }
    if (existsSync(newPath) && oldName !== newName) {
      return { success: false, error: 'File already exists' };
    }

    await fs.rename(oldPath, newPath);
    return { success: true, newName };
  } catch (e) {
    console.error('[rename-asset] Failed:', e);
    return { success: false, error: e.message };
  }
});
```

### Asset Store renameAsset Method (New)

```javascript
// Add to src/editor/stores/assets.js
async function renameAsset(category, oldName, newName) {
  const result = await window.ipcRenderer.invoke(
    'rename-asset',
    JSON.parse(JSON.stringify({ category, oldName, newName }))
  );
  if (result.success) {
    await loadCategory(category);
  }
  return result;
}
```

### MiniPlayer Audio Pattern (D-09, D-10)

```javascript
// Key HTMLAudioElement pattern for MiniPlayer.vue
const audio = new Audio();
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);

function play(src) {
  audio.src = src;
  audio.play();
  isPlaying.value = true;
}

function pause() {
  audio.pause();
  isPlaying.value = false;
}

function seek(fraction) {
  if (duration.value > 0) {
    audio.currentTime = fraction * duration.value;
  }
}

// Format seconds to m:ss
function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

audio.addEventListener('loadedmetadata', () => {
  duration.value = audio.duration;
});
audio.addEventListener('timeupdate', () => {
  currentTime.value = audio.currentTime;
});
audio.addEventListener('ended', () => {
  isPlaying.value = false;
  currentTime.value = 0;
});
```

### Drag-Drop with Counter (D-11)

```javascript
// DropOverlay pattern to avoid flicker
const dragCounter = ref(0);
const showOverlay = computed(() => dragCounter.value > 0);

function onDragEnter(e) {
  e.preventDefault();
  dragCounter.value++;
}

function onDragLeave(e) {
  dragCounter.value--;
}

function onDrop(e) {
  e.preventDefault();
  dragCounter.value = 0;
  const files = e.dataTransfer.files;
  // Process files...
}
```

### Character Avatar Crop (D-04)

```css
.character-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: #1e1e1e;
  flex-shrink: 0;
}
.character-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}
```

### Expression First Key Access

```javascript
// Get avatar source for a character
function getAvatarSrc(character) {
  const exprKeys = Object.keys(character.expressions || {});
  if (exprKeys.length === 0) return null;
  const firstPath = character.expressions[exprKeys[0]];
  return `asset://${firstPath}`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate Assets.vue + Characters.vue tabs | Unified ResourceLibrary.vue with sub-tabs | This phase | 6→5 tabs, one view for all assets |
| Native `<audio controls>` element | Custom MiniPlayer with HTMLAudioElement | This phase | Styleable, dark-theme consistent |
| Text input for expression paths | File picker + thumbnail grid | This phase | ASSET-09: no manual path typing |
| `prompt()` for expression names | Inline edit on thumbnails + file picker import | This phase | Better UX, visual feedback |

**Deprecated/outdated after this phase:**
- `Assets.vue` — replaced by ResourceLibrary.vue (can be deleted)
- `Characters.vue` — merged into ResourceLibrary.vue > CharacterEditor.vue (can be deleted)
- Old `upload-asset` IPC handler pattern (direct buffer upload) — superseded by Phase 6's `import-assets` with validation

## Open Questions

1. **Expression file deletion policy**
   - What we know: Deleting an expression removes the key from `character.expressions[name]`. The image file in `assets/characters/` may be shared by multiple characters or used in scene commands.
   - What's unclear: Should the image file be deleted from disk when an expression is removed? Or only the reference?
   - Recommendation: Only delete the reference (key in expressions object), not the file on disk. This is safer. The user can delete the file separately via the backgrounds/characters file view if desired.

2. **Font rename propagation**
   - What we know: Renaming a font file on disk changes its filename but the metadata in `script.data.assets.fonts[].file` still points to the old path.
   - What's unclear: Should font rename also update metadata, or should fonts be non-renamable?
   - Recommendation: Update font metadata `file` field after rename. Also re-load the font with the new URL. This adds complexity but is necessary for consistency.

3. **Character expression path format**
   - What we know: In the existing Characters.vue, expression paths are stored as `characters/sakura_normal.png`. In the asset store, files are listed by filename only (`sakura_normal.png`).
   - What's unclear: After importing via `importAssets('characters', ...)`, should the expression value be `characters/filename.png` or just `filename.png`?
   - Recommendation: Use `characters/{filename}` — this matches the existing format in `defaultScript()` and is what the `asset://` protocol expects (it prepends `assets/` to resolve the full path).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no test framework detected in project) |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ASSET-01 | Tab count 6→5, unified view renders | manual | Visual: switch to 资源库 tab, verify 5 tabs | N/A |
| ASSET-02 | 4 sub-tabs visible and switch correctly | manual | Visual: click each sub-tab | N/A |
| ASSET-05 | Background thumbnails display in grid | manual | Visual: import background, verify grid | N/A |
| ASSET-06 | Audio play/pause/seek works | manual | Visual: import audio, test controls | N/A |
| ASSET-07 | Character name/color editable | manual | Visual: edit name/color, verify save | N/A |
| ASSET-08 | Expression thumbnails grouped by character | manual | Visual: add expressions, verify grid | N/A |
| ASSET-09 | File picker imports expression images | manual | Visual: click import, select file | N/A |
| ASSET-10 | Delete with confirmation dialog | manual | Visual: right-click delete, confirm | N/A |
| ASSET-11 | Inline rename changes file on disk | manual | Visual: double-click filename, rename, verify | N/A |
| ASSET-13 | Font preview with sample text | manual | Visual: import font, verify preview | N/A |
| ASSET-14 | Drag-drop import from file manager | manual | Visual: drag files onto view | N/A |

### Sampling Rate
- **Per task commit:** Visual inspection in dev mode (`npm run dev`)
- **Per wave merge:** Full walkthrough of all 4 sub-tabs with import/delete/rename operations
- **Phase gate:** All 11 requirements manually verified before `/gsd-verify-work`

### Wave 0 Gaps
No test infrastructure exists in this project. All requirements are UI-interaction requirements that are most efficiently validated through manual visual testing in the running Electron app. No automated test framework setup recommended for this phase — it would add overhead without meaningful coverage for purely visual/interactive features.

## Sources

### Primary (HIGH confidence)
- `src/editor/views/Assets.vue` — Current implementation being replaced. Sub-tab pattern, grid CSS, upload flow.
- `src/editor/views/Characters.vue` — Current implementation being merged. Sidebar+editor layout, expression CRUD, color picker.
- `src/editor/App.vue` — Tab system (lines 78-94). Component map. `<keep-alive>` wrapping.
- `src/editor/stores/assets.js` — Pinia asset store: all IPC wrappers (loadAll, importAssets, deleteAsset, selectAsset, importFont).
- `src/editor/stores/script.js` — Script store: character data access via `data.characters`, undo/redo via `pushState()`.
- `electron/main.js` — All IPC handlers. Confirmed no `rename-asset` handler exists.
- `electron/validateAsset.js` — Format validation. Category→extension mapping.
- `src/engine/fontLoader.js` — FontFace API loading. Used by font preview.
- `.planning/phases/07-asset-library-ui/07-UI-SPEC.md` — Complete visual specification (656 lines).
- `.planning/phases/07-asset-library-ui/07-CONTEXT.md` — 15 locked decisions.

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` — 11 domain pitfalls, especially #3 (reactive Proxy), #4 (stale cache), #8 (font metadata orphan).
- `src/editor/views/SettingsDesigner.vue` — Gold reference for complex view patterns (3-panel layout, DraggableElement usage).
- `src/editor/components/TabBar.vue` — App-level tab bar component (v-model pattern).
- `src/editor/components/AssetPanel.vue` — Asset dragging pattern (`application/galgame-asset` MIME type).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all existing tech
- Architecture: HIGH — component structure derived from UI-SPEC inventory and existing codebase patterns
- Pitfalls: HIGH — all pitfalls derived from actual code analysis (verified missing IPC handler, verified `keep-alive` usage, verified data structures)

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable — no external dependencies, all internal code)
