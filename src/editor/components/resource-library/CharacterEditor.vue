<template>
  <div class="character-editor">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">角色列表</span>
        <button class="add-btn" @click="addCharacter" aria-label="创建角色">+</button>
      </div>
      <div class="sidebar-list">
        <!-- Empty sidebar -->
        <div v-if="characterList.length === 0" class="sidebar-empty">
          <span>👤</span>
          <p>暂无角色</p>
          <p class="hint">点击上方 + 按钮创建</p>
        </div>
        <!-- Character items -->
        <div
          v-for="char in characterList"
          :key="char.id"
          class="char-item"
          :class="{ active: selectedId === char.id }"
          @click="selectCharacter(char.id)"
        >
          <div class="char-avatar">
            <img v-if="char.avatar" :src="char.avatar" :alt="char.name" draggable="false" />
            <span v-else class="avatar-fallback">👤</span>
          </div>
          <span class="char-name">{{ char.name }}</span>
        </div>
      </div>
      <div class="sidebar-footer">
        <button class="new-char-btn" @click="addCharacter">+ 新角色</button>
      </div>
    </div>

    <!-- Editor Pane -->
    <div class="editor-pane" v-if="selectedChar">
      <div class="form-group">
        <label>显示名称</label>
        <input type="text" :value="selectedChar.name" @change="updateName($event.target.value)" />
      </div>
      <div class="form-group">
        <label title="对话框中角色名的显示颜色">名称颜色</label>
        <div class="color-row">
          <input type="color" :value="selectedChar.color" @input="updateColor($event.target.value)" />
          <input type="text" :value="selectedChar.color" @change="updateColor($event.target.value)" />
        </div>
      </div>

      <!-- Delete character button -->
      <button class="delete-char-btn" @click="deleteCharacter(selectedId)">删除此角色</button>

      <!-- Expression Grid -->
      <div class="expressions-section">
        <div class="section-header">
          <h3>表情列表</h3>
          <button class="import-expr-btn" @click="importExpression">+ 导入表情</button>
        </div>

        <div v-if="expressions.length === 0" class="expr-empty">
          <span>🖼️</span>
          <p>该角色暂无表情图片</p>
          <p class="hint">点击"+ 导入表情"添加</p>
          <p class="hint formats">支持格式：PNG、JPG、JPEG、WEBP</p>
        </div>

        <div v-else class="expr-grid">
          <div
            class="expr-card"
            v-for="expr in expressions"
            :key="expr.name"
            @contextmenu.prevent="showExprMenu($event, expr.name)"
          >
            <div class="expr-thumbnail">
              <img :src="expr.src" :alt="expr.name" draggable="false" />
            </div>
            <div class="expr-name">
              <InlineEdit
                :ref="el => setExprEditRef(expr.name, el)"
                :value="expr.name"
                @save="renameExpression(expr.name, $event)"
              />
            </div>
          </div>
        </div>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept="image/*"
        style="display: none;"
        @change="handleExpressionFiles"
      />
    </div>

    <!-- No selection state -->
    <div class="editor-empty" v-else>
      <p>从左侧列表选择一个角色进行编辑，<br>或点击 + 创建新角色。</p>
    </div>

    <ContextMenu
      :visible="menuVisible"
      :x="menuX"
      :y="menuY"
      :items="menuItems"
      @select="onExprMenuAction"
      @close="menuVisible = false"
    />
  </div>
</template>

<script setup>
/**
 * CharacterEditor — Full character editor sub-tab for the unified 资源库.
 * Left sidebar: character list with avatar thumbnails (first expression, top-cropped).
 * Right pane: name/color/ID forms + expression thumbnail grid with import, rename, delete.
 * Dual-store coordination: useScriptStore for character data, useAssetStore for file operations.
 * @module components/resource-library/CharacterEditor
 */
import { ref, computed } from 'vue';
import { useScriptStore } from '../../stores/script.js';
import { useAssetStore } from '../../stores/assets.js';
import InlineEdit from './InlineEdit.vue';
import ContextMenu from './ContextMenu.vue';

const script = useScriptStore();
const assets = useAssetStore();

const selectedId = ref('');
const fileInputRef = ref(null);

// ─── Computed ──────────────────────────────────────────────────────────
const characters = computed(() => {
  if (!script.data?.characters) return {};
  return script.data.characters;
});

const characterList = computed(() => {
  return Object.entries(characters.value).map(([id, char]) => ({
    id,
    name: char.name,
    color: char.color,
    avatar: getAvatarSrc(char),
  }));
});

const selectedChar = computed(() => {
  if (!selectedId.value || !characters.value[selectedId.value]) return null;
  return characters.value[selectedId.value];
});

const expressions = computed(() => {
  if (!selectedChar.value?.expressions) return [];
  return Object.entries(selectedChar.value.expressions).map(([name, path]) => ({
    name,
    path,
    src: `asset://${path}`,
  }));
});

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Get avatar source — first expression image, top-cropped (D-04).
 * @param {object} character - Character data object
 * @returns {string|null} asset:// URL or null
 */
function getAvatarSrc(character) {
  const exprKeys = Object.keys(character.expressions || {});
  if (exprKeys.length === 0) return null;
  const firstPath = character.expressions[exprKeys[0]];
  return `asset://${firstPath}`;
}

function selectCharacter(id) {
  selectedId.value = id;
}

/**
 * Create a new character with auto-generated ID (D-03).
 * Electron doesn't support window.prompt(), so we auto-generate and let users rename inline.
 */
function addCharacter() {
  if (!script.data?.characters) return;

  // Auto-generate unique ID: char_1, char_2, ...
  let counter = 1;
  while (script.data.characters[`char_${counter}`]) {
    counter++;
  }
  const newId = `char_${counter}`;

  script.data.characters[newId] = {
    name: '新角色',
    color: '#FFFFFF',
    expressions: {},
  };
  script.pushState();
  selectedId.value = newId;
}

/**
 * Delete a character with confirmation (D-14).
 * @param {string} id - Character ID to delete
 */
function deleteCharacter(id) {
  const char = script.data.characters[id];
  if (!char) return;
  if (confirm(`确定要删除角色 "${char.name}" 吗？该角色的所有表情数据也会被移除。`)) {
    delete script.data.characters[id];
    script.pushState();
    if (selectedId.value === id) {
      const remaining = Object.keys(script.data.characters);
      selectedId.value = remaining.length > 0 ? remaining[0] : '';
    }
  }
}

/**
 * Update character display name.
 * @param {string} newName
 */
function updateName(newName) {
  if (!selectedChar.value) return;
  selectedChar.value.name = newName;
  script.pushState();
}

/**
 * Update character name color.
 * @param {string} newColor
 */
function updateColor(newColor) {
  if (!selectedChar.value) return;
  selectedChar.value.color = newColor;
  script.pushState();
}

// ─── Expression Management ──────────────────────────────────────────

const menuVisible = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuTarget = ref('');
const exprEditRefs = {};

const menuItems = [
  { label: '重命名', action: 'rename' },
  { separator: true },
  { label: '删除', action: 'delete', destructive: true },
];

/**
 * Show context menu for an expression card (D-06).
 * @param {MouseEvent} event
 * @param {string} exprName
 */
function showExprMenu(event, exprName) {
  menuX.value = event.clientX;
  menuY.value = event.clientY;
  menuTarget.value = exprName;
  menuVisible.value = true;
}

/**
 * Handle context menu action selection.
 * @param {string} action - 'rename' or 'delete'
 */
function onExprMenuAction(action) {
  if (action === 'rename' && exprEditRefs[menuTarget.value]) {
    exprEditRefs[menuTarget.value].startEdit();
  } else if (action === 'delete') {
    deleteExpression(menuTarget.value);
  }
}

/**
 * Store InlineEdit refs for programmatic rename activation.
 * @param {string} name - Expression name
 * @param {object|null} el - Component instance
 */
function setExprEditRef(name, el) {
  if (el) exprEditRefs[name] = el;
}

/**
 * Open file picker for expression import (ASSET-09).
 */
async function importExpression() {
  fileInputRef.value?.click();
}

/**
 * Handle selected expression files — import via path-based asset pipeline, update character data.
 * @param {Event} event
 */
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
  }
  if (result.errors?.length > 0) {
    alert(`${result.errors.length} 个文件导入失败`);
  }

  event.target.value = '';
}

/**
 * Rename an expression key (D-07).
 * @param {string} oldName - Current expression name
 * @param {string} newName - New expression name
 */
function renameExpression(oldName, newName) {
  if (!selectedChar.value || !newName || newName === oldName) return;
  if (selectedChar.value.expressions[newName]) {
    alert('该表情名称已存在');
    return;
  }
  const path = selectedChar.value.expressions[oldName];
  delete selectedChar.value.expressions[oldName];
  selectedChar.value.expressions[newName] = path;
  script.pushState();
}

/**
 * Delete an expression reference (removes metadata only, not file on disk).
 * @param {string} exprName - Expression name to delete
 */
function deleteExpression(exprName) {
  if (!selectedChar.value) return;
  if (confirm(`确定要删除表情 "${exprName}" 吗？`)) {
    delete selectedChar.value.expressions[exprName];
    script.pushState();
  }
}
</script>

<style scoped>
.character-editor { display: flex; height: 100%; flex: 1; min-height: 0; }

/* Sidebar */
.sidebar { width: 240px; background: #252526; border-right: 1px solid #111; display: flex; flex-direction: column; }
.sidebar-header { padding: 16px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
.sidebar-title { font-size: 14px; font-weight: 400; color: #ccc; }
.add-btn { background: #007acc; color: white; border: none; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.sidebar-list { flex: 1; overflow-y: auto; }
.sidebar-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 16px; color: #555; font-size: 12px; gap: 8px; }
.sidebar-empty span { font-size: 32px; }
.sidebar-empty p { margin: 0; }
.sidebar-empty .hint { font-size: 11px; }

.char-item { padding: 10px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; border-bottom: 1px solid #333; transition: background 150ms ease; }
.char-item:hover { background: #2a2d2e; }
.char-item.active { background: #37373d; border-left: 3px solid #007acc; }

.char-avatar { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: #1e1e1e; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.char-avatar img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
.avatar-fallback { font-size: 18px; color: #555; }
.char-name { font-size: 14px; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.sidebar-footer { padding: 12px; border-top: 1px solid #333; }
.new-char-btn { background: transparent; border: 1px dashed #555; color: #888; padding: 8px; width: 100%; border-radius: 4px; cursor: pointer; font-size: 12px; }
.new-char-btn:hover { border-color: #007acc; color: #ccc; }

/* Editor pane */
.editor-pane { flex: 1; padding: 20px 40px; overflow-y: auto; }
.editor-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: #888; font-size: 14px; text-align: center; line-height: 1.8; }

.form-group { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 12px; color: #aaa; }
.form-group input[type="text"] { background: #3c3c3c; border: 1px solid #555; color: #fff; padding: 8px 10px; border-radius: 4px; }
.disabled-input { opacity: 0.5; cursor: not-allowed; }
.color-row { display: flex; gap: 10px; align-items: center; }
.color-row input[type="color"] { width: 40px; height: 32px; border: none; cursor: pointer; background: transparent; }
.color-row input[type="text"] { flex: 1; background: #3c3c3c; border: 1px solid #555; color: #fff; padding: 8px 10px; border-radius: 4px; }

.delete-char-btn { background: transparent; border: 1px solid #a22; color: #e66; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-bottom: 20px; }
.delete-char-btn:hover { background: #a22; color: #fff; }

/* Expression section */
.expressions-section { margin-top: 24px; background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h3 { margin: 0; font-weight: 400; font-size: 16px; color: #ccc; }
.import-expr-btn { background: #0e633c; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.import-expr-btn:hover { background: #117748; }

.expr-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #555; font-size: 12px; gap: 8px; }
.expr-empty span { font-size: 32px; }
.expr-empty p { margin: 0; }
.expr-empty .hint { font-size: 11px; }
.expr-empty .hint.formats { color: #444; font-size: 10px; }

.expr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
.expr-card { background: #252526; border: 1px solid #333; border-radius: 6px; overflow: hidden; cursor: pointer; transition: border-color 200ms ease; }
.expr-card:hover { border-color: #007acc; }
.expr-thumbnail { height: 80px; background: #1e1e1e; display: flex; align-items: center; justify-content: center; padding: 4px; }
.expr-thumbnail img { max-width: 100%; max-height: 100%; object-fit: contain; }
.expr-name { padding: 6px 8px; font-size: 12px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-top: 1px solid #333; color: #ccc; }
</style>
