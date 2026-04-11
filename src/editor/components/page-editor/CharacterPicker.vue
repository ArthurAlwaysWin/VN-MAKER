<template>
  <div class="char-picker-overlay" @click.self="close">
    <div class="char-picker-panel">
      <div class="picker-header">
        <span>选择角色</span>
        <button class="picker-close" @click="close" title="关闭">✕</button>
      </div>
      <div class="picker-list" v-if="characterEntries.length > 0">
        <div v-for="[charId, char] in characterEntries" :key="charId" class="char-section">
          <div class="char-name-row" @click="pickedCharId = charId">
            <span class="char-indicator" :style="{ color: pickedCharId === charId ? '#007acc' : '#555' }">
              {{ pickedCharId === charId ? '●' : '○' }}
            </span>
            <span class="char-name" :style="{ color: char.color || '#ccc' }">{{ char.name }}</span>
          </div>
          <div v-if="Object.keys(char.expressions || {}).length > 0" class="expr-grid">
            <div v-for="(exprPath, exprName) in char.expressions" :key="exprName"
              class="expr-thumb" :class="{ selected: selectedExpressions[charId] === exprName }"
              @click="pickedCharId = charId; selectedExpressions[charId] = exprName">
              <div class="expr-img-wrap">
                <img :src="`asset://${exprPath}`" :alt="exprName" draggable="false" />
              </div>
              <div class="expr-name">{{ exprName }}</div>
              <span v-if="selectedExpressions[charId] === exprName" class="check-badge">✓</span>
            </div>
          </div>
          <div v-else class="expr-empty">该角色暂无表情图</div>
        </div>
      </div>
      <div v-else class="picker-empty">
        暂无角色，请先在资源库中导入角色
      </div>
      <div class="picker-footer">
        <button class="picker-cancel" @click="close" title="取消选择">取消</button>
        <button class="picker-confirm" :disabled="!pickedCharId" @click="confirmAdd" title="确认添加角色">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watchEffect } from 'vue';
import { usePageEditor } from '../../composables/usePageEditor.js';
import { useScriptStore } from '../../stores/script.js';

const editor = usePageEditor();
const script = useScriptStore();

const selectedExpressions = reactive({});
const pickedCharId = ref(null);

const characterEntries = computed(() => Object.entries(script.data?.characters || {}));

// Pre-populate selectedExpressions with first expression for each character
watchEffect(() => {
  for (const [charId, char] of characterEntries.value) {
    if (!selectedExpressions[charId]) {
      const exprs = Object.keys(char.expressions || {});
      selectedExpressions[charId] = exprs[0] || 'normal';
    }
  }
});

function confirmAdd() {
  const charId = pickedCharId.value;
  if (!charId) return;
  const page = editor.currentPage.value;
  if (!page) return;
  if (page.characters.some(c => c.id === charId)) {
    alert('该角色已在当前页面上');
    return;
  }
  page.characters.push({
    id: charId,
    expression: selectedExpressions[charId] || 'normal',
    position: 'custom',
    x: 640,
    y: 200,
    scale: 1,
  });
  script.pushState();
  close();
}

function close() {
  pickedCharId.value = null;
  editor.showCharPicker.value = false;
}
</script>

<style scoped>
.char-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.char-picker-panel {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  min-width: 480px;
  max-width: 560px;
  max-height: 65vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
  border-bottom: 1px solid #333;
}

.picker-close {
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
}

.picker-close:hover {
  background: #333;
  color: #ccc;
}

.picker-list {
  overflow-y: auto;
  padding: 8px 12px;
  flex: 1;
}

.char-section {
  background: #252526;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
}

.char-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 0;
}

.char-indicator {
  font-size: 14px;
  flex-shrink: 0;
}

.char-name {
  font-size: 14px;
  font-weight: 600;
}

.expr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.expr-thumb {
  width: 80px;
  background: #1a1a1a;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  overflow: hidden;
  border: 1px solid #333;
  transition: border-color 0.15s;
  position: relative;
}

.expr-thumb:hover {
  border-color: #555;
  background: #222;
}

.expr-thumb.selected {
  border: 2px solid #007acc;
}

.expr-img-wrap {
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expr-img-wrap img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  display: block;
}

.expr-name {
  font-size: 11px;
  color: #aaa;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #007acc;
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expr-empty {
  color: #555;
  font-size: 12px;
  padding: 8px;
  text-align: center;
}

.picker-empty {
  padding: 24px 16px;
  color: #555;
  text-align: center;
  font-size: 13px;
}

.picker-footer {
  padding: 8px 16px;
  border-top: 1px solid #333;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.picker-cancel {
  background: transparent;
  border: 1px solid #555;
  color: #ccc;
  padding: 4px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.picker-cancel:hover {
  background: #3c3c3c;
}

.picker-confirm {
  background: #007acc;
  border: none;
  color: #fff;
  padding: 4px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.picker-confirm:hover {
  background: #0098ff;
}

.picker-confirm:disabled {
  background: #555;
  color: #888;
  cursor: default;
}
</style>
