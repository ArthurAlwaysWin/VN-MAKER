# 角色表情去背景工具 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate a solid-color background removal tool into the character expression import flow, allowing users to click-to-pick a background color and generate transparent PNGs directly in the editor.

**Architecture:** New `BgRemovalModal.vue` component handles all Canvas pixel processing and UI. A new IPC handler `save-processed-image` writes the processed PNG back to disk. `CharacterEditor.vue` orchestrates modal visibility from two entry points (import detection + right-click menu).

**Tech Stack:** Vue 3 Composition API, Canvas API (getImageData/putImageData/toBlob), Electron IPC

**Spec:** `docs/superpowers/specs/2026-03-30-bg-removal-tool-design.md`

---

## File Structure

| File | Role | Action |
|------|------|--------|
| `src/editor/components/resource-library/BgRemovalModal.vue` | Modal dialog with Canvas-based background removal | **Create** (~280 lines) |
| `electron/main.js` | New `save-processed-image` IPC handler | **Modify** (add ~20 lines after line 438) |
| `src/editor/components/resource-library/CharacterEditor.vue` | Wire modal into import flow + right-click menu | **Modify** (~30 lines changed) |

**Note:** `assets.js` store does NOT need a new method — `confirmRemoval()` calls IPC directly and `CharacterEditor` handles category reload on the `@done` event.

**Prerequisite:** The import flow relies on the `noAlpha` flag from `checkImageAlpha()` in `electron/validateAsset.js` (already implemented — commit 0eb4a78). Each imported item carries `item.noAlpha: boolean` when category is `characters`.

---

## Chunk 1: IPC Backend

### Task 1: Add `save-processed-image` IPC handler

**Files:**
- Modify: `electron/main.js` (after line 438, after `rename-asset` handler)

- [ ] **Step 1: Add the IPC handler**

Add after the `rename-asset` handler (line 438):

```javascript
ipcMain.handle('save-processed-image', async (event, { category, filename, dataBase64 }) => {
  try {
    if (!currentProjectPath) return { success: false, error: 'No project loaded' };

    const fullPath = path.join(currentProjectPath, 'assets', category, filename);
    if (!isInsideProject(fullPath)) return { success: false, error: 'Invalid path' };

    const buffer = Buffer.from(dataBase64, 'base64');
    await fs.writeFile(fullPath, buffer);
    return { success: true };
  } catch (e) {
    console.error('[save-processed-image] Failed:', e);
    return { success: false, error: e.message };
  }
});
```

**Design notes:**
- Receives base64-encoded PNG data from renderer (Canvas.toDataURL output, stripped of prefix)
- Reuses `isInsideProject()` security check (same pattern as `delete-asset` and `rename-asset`)
- Overwrites the existing file in-place (user has already confirmed in the modal)

- [ ] **Step 2: Verify build passes**

Run: `npx vite build`
Expected: All 3 bundles build with zero errors.

- [ ] **Step 3: Commit**

```bash
git add electron/main.js
git commit -m "feat: 添加 save-processed-image IPC handler — 保存 Canvas 处理后的 PNG"
```

---

## Chunk 2: BgRemovalModal Component

### Task 2: Create BgRemovalModal.vue

**Files:**
- Create: `src/editor/components/resource-library/BgRemovalModal.vue`

This is the core component. It has three responsibilities:
1. **UI**: Modal overlay with preview canvas + controls sidebar
2. **Canvas Processing**: Click-to-pick color, pixel manipulation with tolerance/feathering
3. **Export**: Canvas → base64 PNG → IPC save

- [ ] **Step 1: Create the component file**

Create `src/editor/components/resource-library/BgRemovalModal.vue` with the following structure:

```vue
<template>
  <Teleport to="body">
    <div v-if="visible" class="bgr-overlay" @click.self="$emit('cancel')">
      <div class="bgr-modal">
        <div class="bgr-header">
          <span>去除纯色背景</span>
          <button class="bgr-close" @click="$emit('cancel')">×</button>
        </div>
        <div class="bgr-body">
          <!-- Left: Preview -->
          <div class="bgr-preview">
            <div class="bgr-label">预览</div>
            <div class="bgr-canvas-wrap" ref="canvasWrapRef">
              <canvas
                ref="canvasRef"
                class="bgr-canvas"
                @click="pickColor"
              />
              <div v-if="!pickedColor" class="bgr-hint">👆 点击图片上的背景色取色</div>
            </div>
          </div>
          <!-- Right: Controls -->
          <div class="bgr-controls">
            <div class="bgr-label">设置</div>
            <!-- Picked color display -->
            <div class="bgr-section">
              <div class="bgr-section-title">已选背景色</div>
              <div class="bgr-color-display">
                <div
                  class="bgr-color-swatch"
                  :style="{ background: pickedColor || '#333' }"
                ></div>
                <span class="bgr-color-hex">{{ pickedColor || '未选择' }}</span>
              </div>
            </div>
            <!-- Tolerance slider -->
            <div class="bgr-section">
              <div class="bgr-slider-header">
                <span class="bgr-section-title">容差</span>
                <span class="bgr-slider-value">{{ tolerance }}</span>
              </div>
              <input
                type="range" min="0" max="100" v-model.number="tolerance"
                class="bgr-slider" @input="scheduleProcess"
              />
              <div class="bgr-slider-labels">
                <span>精确</span><span>宽松</span>
              </div>
            </div>
            <!-- Feather slider -->
            <div class="bgr-section">
              <div class="bgr-slider-header">
                <span class="bgr-section-title">边缘柔化</span>
                <span class="bgr-slider-value">{{ feather }}px</span>
              </div>
              <input
                type="range" min="0" max="5" step="0.5" v-model.number="feather"
                class="bgr-slider" @input="scheduleProcess"
              />
            </div>
            <!-- Spacer -->
            <div class="bgr-spacer"></div>
            <!-- Action buttons -->
            <button
              class="bgr-btn-primary"
              :disabled="!pickedColor || saving"
              @click="confirmRemoval"
            >{{ saving ? '保存中...' : '✅ 确认去背景' }}</button>
            <div class="bgr-btn-row">
              <button class="bgr-btn-secondary" @click="$emit('skip')">直接使用</button>
              <button class="bgr-btn-secondary" @click="$emit('cancel')">取消</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * BgRemovalModal — Pure-Canvas solid-color background removal tool.
 * User clicks to pick background color, adjusts tolerance/feather, confirms to export transparent PNG.
 * @module components/resource-library/BgRemovalModal
 */
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  visible: Boolean,
  /** asset:// URL or full path of the image to process */
  imageSrc: String,
  /** Asset category (always 'characters') */
  category: { type: String, default: 'characters' },
  /** Filename in assets/characters/ */
  filename: String,
});

const emit = defineEmits(['done', 'skip', 'cancel']);

const canvasRef = ref(null);
const canvasWrapRef = ref(null);
const tolerance = ref(30);
const feather = ref(1);
const pickedColor = ref(null);
const pickedRgb = ref(null);
const saving = ref(false);

let originalImageData = null;
let imgWidth = 0;
let imgHeight = 0;
let processTimer = null;

// Load image when modal opens
watch(() => props.visible, async (v) => {
  if (v && props.imageSrc) {
    pickedColor.value = null;
    pickedRgb.value = null;
    tolerance.value = 30;
    feather.value = 1;
    saving.value = false;
    await nextTick();
    loadImage();
  }
});

function loadImage() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    imgWidth = img.naturalWidth;
    imgHeight = img.naturalHeight;

    // Fit canvas to wrapper while maintaining aspect ratio
    const wrap = canvasWrapRef.value;
    const maxW = wrap.clientWidth;
    const maxH = wrap.clientHeight;
    const scale = Math.min(maxW / imgWidth, maxH / imgHeight, 1);
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    canvas.style.width = `${imgWidth * scale}px`;
    canvas.style.height = `${imgHeight * scale}px`;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    originalImageData = ctx.getImageData(0, 0, imgWidth, imgHeight);
  };
  img.src = props.imageSrc;
}

function pickColor(event) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = imgWidth / rect.width;
  const scaleY = imgHeight / rect.height;
  const x = Math.floor((event.clientX - rect.left) * scaleX);
  const y = Math.floor((event.clientY - rect.top) * scaleY);

  if (!originalImageData || x < 0 || y < 0 || x >= imgWidth || y >= imgHeight) return;

  const idx = (y * imgWidth + x) * 4;
  const r = originalImageData.data[idx];
  const g = originalImageData.data[idx + 1];
  const b = originalImageData.data[idx + 2];

  pickedRgb.value = [r, g, b];
  pickedColor.value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  processPixels();
}

function scheduleProcess() {
  if (!pickedRgb.value) return;
  clearTimeout(processTimer);
  processTimer = setTimeout(processPixels, 50);
}

function processPixels() {
  if (!originalImageData || !pickedRgb.value) return;
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const src = originalImageData.data;
  const out = new ImageData(new Uint8ClampedArray(src), imgWidth, imgHeight);
  const dst = out.data;

  const [tR, tG, tB] = pickedRgb.value;
  const maxDist = 441.67; // √(255²×3)
  const thresh = (tolerance.value / 100) * maxDist;
  const featherDist = (feather.value / 5) * maxDist;

  for (let i = 0; i < dst.length; i += 4) {
    const dR = dst[i] - tR;
    const dG = dst[i + 1] - tG;
    const dB = dst[i + 2] - tB;
    const dist = Math.sqrt(dR * dR + dG * dG + dB * dB);

    if (dist <= thresh) {
      dst[i + 3] = 0;
    } else if (featherDist > 0 && dist <= thresh + featherDist) {
      const ratio = (dist - thresh) / featherDist;
      dst[i + 3] = Math.round(ratio * dst[i + 3]);
    }
  }

  ctx.putImageData(out, 0, 0);
}

async function confirmRemoval() {
  const canvas = canvasRef.value;
  if (!canvas || saving.value) return;
  saving.value = true;

  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const result = await window.ipcRenderer.invoke('save-processed-image', {
      category: props.category,
      filename: props.filename,
      dataBase64: base64,
    });

    if (result.success) {
      emit('done');
    } else {
      alert(`保存失败: ${result.error}`);
    }
  } catch (e) {
    alert(`处理失败: ${e.message}`);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.bgr-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.bgr-modal {
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 10px;
  width: 720px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.bgr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  font-size: 15px;
  font-weight: 600;
  color: #eee;
}
.bgr-close {
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}
.bgr-close:hover { color: #fff; }
.bgr-body {
  display: flex;
  gap: 16px;
  padding: 16px;
  flex: 1;
  min-height: 0;
}
.bgr-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.bgr-label {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.bgr-canvas-wrap {
  flex: 1;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  min-height: 300px;
  background:
    repeating-conic-gradient(#333 0% 25%, #3a3a3a 0% 50%) 0 0 / 16px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bgr-canvas {
  cursor: crosshair;
  display: block;
  max-width: 100%;
  max-height: 100%;
}
.bgr-hint {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #ccc;
  padding: 4px 14px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
}
.bgr-controls {
  width: 195px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}
.bgr-section {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 10px;
}
.bgr-section-title {
  font-size: 12px;
  color: #aaa;
}
.bgr-color-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.bgr-color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 2px solid #555;
}
.bgr-color-hex {
  color: #ccc;
  font-family: monospace;
  font-size: 12px;
}
.bgr-slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.bgr-slider-value {
  font-size: 13px;
  color: #4af;
  font-family: monospace;
}
.bgr-slider {
  width: 100%;
  accent-color: #4af;
}
.bgr-slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #666;
  margin-top: 2px;
}
.bgr-spacer { flex: 1; }
.bgr-btn-primary {
  padding: 10px;
  background: #4af;
  color: #000;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 13px;
  cursor: pointer;
}
.bgr-btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.bgr-btn-row {
  display: flex;
  gap: 6px;
}
.bgr-btn-secondary {
  flex: 1;
  padding: 7px;
  background: transparent;
  color: #888;
  border: 1px solid #444;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
}
.bgr-btn-secondary:hover {
  border-color: #666;
  color: #bbb;
}
</style>
```

**Design notes:**
- Uses `<Teleport to="body">` to render above all editor content (z-index 2000)
- Checkerboard pattern via `repeating-conic-gradient` CSS (no image dependency)
- Canvas operates at full image resolution internally; CSS scales to fit the modal
- `originalImageData` cached once on load — `processPixels()` always works from the original, never from already-processed data
- `confirmRemoval()` uses `canvas.toBlob` → `arrayBuffer` → base64 → IPC (avoids data URL prefix parsing)
- `confirmRemoval()` calls IPC directly via `window.ipcRenderer.invoke`; the parent `CharacterEditor` handles store refresh (category reload) in the `@done` event handler

- [ ] **Step 2: Verify build passes**

Run: `npx vite build`
Expected: All 3 bundles build with zero errors. (Component won't be tree-shaken because it's not imported yet — that's fine, it'll show up in next task.)

- [ ] **Step 3: Commit**

```bash
git add src/editor/components/resource-library/BgRemovalModal.vue
git commit -m "feat: 创建 BgRemovalModal 组件 — Canvas 纯色背景去除工具"
```

---

## Chunk 3: Integration into CharacterEditor

### Task 3: Wire BgRemovalModal into CharacterEditor.vue

**Files:**
- Modify: `src/editor/components/resource-library/CharacterEditor.vue`

This task has three sub-changes:
1. Import and register the modal component
2. Add modal state management + right-click menu item
3. Modify import flow to open modal instead of alert

- [ ] **Step 1: Add import**

At line 126 (after `import ContextMenu from './ContextMenu.vue';`), add:

```javascript
import BgRemovalModal from './BgRemovalModal.vue';
```

- [ ] **Step 2: Add modal state refs**

Near line 243 (where `menuVisible` and other refs are defined), add:

```javascript
const bgModalVisible = ref(false);
const bgModalSrc = ref('');
const bgModalFilename = ref('');
const bgModalPendingImports = ref([]);
```

- [ ] **Step 3: Add "去背景" to expression context menu**

Replace the `menuItems` array (line 249-253):

```javascript
const menuItems = [
  { label: '重命名', action: 'rename' },
  { label: '去背景', action: 'remove-bg' },
  { separator: true },
  { label: '删除', action: 'delete', destructive: true },
];
```

- [ ] **Step 4: Handle the new menu action**

Replace `onExprMenuAction` function (line 271-277):

```javascript
function onExprMenuAction(action) {
  if (action === 'rename' && exprEditRefs[menuTarget.value]) {
    exprEditRefs[menuTarget.value].startEdit();
  } else if (action === 'delete') {
    deleteExpression(menuTarget.value);
  } else if (action === 'remove-bg') {
    openBgRemoval(menuTarget.value);
  }
}

function openBgRemoval(exprName) {
  if (!selectedChar.value) return;
  const exprPath = selectedChar.value.expressions[exprName];
  if (!exprPath) return;
  const filename = exprPath.split('/').pop();
  bgModalSrc.value = `asset://${exprPath}`;
  bgModalFilename.value = filename;
  bgModalPendingImports.value = [];
  bgModalVisible.value = true;
}
```

- [ ] **Step 5: Add modal event handlers**

Add these functions after `openBgRemoval`:

```javascript
function onBgRemovalDone() {
  bgModalVisible.value = false;
  assets.loadCategory('characters');

  // Process next pending import if any
  if (bgModalPendingImports.value.length > 0) {
    const next = bgModalPendingImports.value.shift();
    bgModalSrc.value = `asset://characters/${next}`;
    bgModalFilename.value = next;
    bgModalVisible.value = true;
  }
}

function onBgRemovalSkip() {
  bgModalVisible.value = false;

  // Process next pending import if any
  if (bgModalPendingImports.value.length > 0) {
    const next = bgModalPendingImports.value.shift();
    bgModalSrc.value = `asset://characters/${next}`;
    bgModalFilename.value = next;
    bgModalVisible.value = true;
  }
}

function onBgRemovalCancel() {
  bgModalVisible.value = false;
  bgModalPendingImports.value = [];
}
```

- [ ] **Step 6: Modify import flow to trigger modal**

Replace the `handleExpressionFiles` function (lines 299-326):

```javascript
async function handleExpressionFiles(event) {
  const fileList = event.target.files;
  if (!fileList || fileList.length === 0 || !selectedChar.value) return;

  const filePaths = Array.from(fileList)
    .map(f => window.getPathForFile ? window.getPathForFile(f) : f.path)
    .filter(Boolean);
  if (filePaths.length === 0) return;

  const result = await assets.importAssets('characters', filePaths);
  if (result.success && result.imported.length > 0) {
    for (const item of result.imported) {
      const exprName = item.saved.replace(/\.[^.]+$/, '');
      selectedChar.value.expressions[exprName] = `characters/${item.saved}`;
    }
    script.pushState();

    // Open bg removal modal for files without alpha, one at a time
    const noAlphaFiles = result.imported.filter(item => item.noAlpha);
    if (noAlphaFiles.length > 0) {
      const first = noAlphaFiles[0];
      bgModalPendingImports.value = noAlphaFiles.slice(1).map(f => f.saved);
      bgModalSrc.value = `asset://characters/${first.saved}`;
      bgModalFilename.value = first.saved;
      bgModalVisible.value = true;
    }
  }
  if (result.errors?.length > 0) {
    alert(`${result.errors.length} 个文件导入失败`);
  }

  event.target.value = '';
}
```

- [ ] **Step 7: Add modal to template**

After the `<ContextMenu>` block (around line 103-110), add:

```vue
    <BgRemovalModal
      :visible="bgModalVisible"
      :image-src="bgModalSrc"
      :filename="bgModalFilename"
      category="characters"
      @done="onBgRemovalDone"
      @skip="onBgRemovalSkip"
      @cancel="onBgRemovalCancel"
    />
```

- [ ] **Step 8: Verify build passes**

Run: `npx vite build`
Expected: All 3 bundles build with zero errors. Component count should be 85+ modules.

- [ ] **Step 9: Manual smoke test**

1. Start dev server: `npm run dev`
2. Open project → 资源库 → 角色
3. Select a character → 导入表情 → pick a JPG
4. Verify: BgRemovalModal opens instead of alert
5. Click on background area → color picked, preview updates
6. Adjust tolerance slider → preview updates in real-time
7. Click "确认去背景" → file saved, modal closes
8. Right-click existing expression → "去背景" menu item works

- [ ] **Step 10: Commit**

```bash
git add src/editor/components/resource-library/CharacterEditor.vue
git commit -m "feat: CharacterEditor 集成去背景工具 — 导入自动触发 + 右键菜单入口"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | electron/main.js | `save-processed-image` IPC handler |
| 2 | BgRemovalModal.vue | Core component (~280 lines) |
| 3 | CharacterEditor.vue | Integration (import trigger + right-click menu) |

**Total new code:** ~320 lines across 3 files
**New dependencies:** None (pure Canvas API + Vue)
**Commits:** 3 atomic commits

**Known limitation:** When processing a `.jpg` file, the resulting PNG binary is written back with the original `.jpg` extension. The editor handles this correctly (Canvas reads by content, not extension), but external tools may be confused. This is an accepted trade-off for v1 — a future enhancement could rename to `.png` on save.
