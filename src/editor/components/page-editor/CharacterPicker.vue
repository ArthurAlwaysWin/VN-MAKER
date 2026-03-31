<template>
  <div class="char-picker-overlay" @click.self="close">
    <div class="char-picker-panel">
      <div class="picker-header">选择角色</div>
      <div class="picker-list" v-if="characterEntries.length > 0">
        <div v-for="[charId, char] in characterEntries" :key="charId"
          class="picker-item" :class="{ selected: pickedCharId === charId }"
          @click="pickedCharId = charId">
          <span class="picker-char-name" :style="{ color: char.color || '#ccc' }">{{ char.name }}</span>
          <select v-model="selectedExpressions[charId]" @click.stop class="picker-expr-select">
            <option v-for="(path, exprName) in char.expressions" :key="exprName" :value="exprName">
              {{ exprName }}
            </option>
          </select>
        </div>
      </div>
      <div v-else class="picker-empty">
        暂无角色，请先在资源库中导入角色
      </div>
      <div class="picker-footer">
        <button class="picker-cancel" @click="close">取消</button>
        <button class="picker-confirm" :disabled="!pickedCharId" @click="confirmAdd">确定</button>
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.char-picker-panel {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 8px;
  min-width: 300px;
  max-width: 400px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}

.picker-header {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
  border-bottom: 1px solid #333;
}

.picker-list {
  overflow-y: auto;
  padding: 8px 0;
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  cursor: pointer;
}

.picker-item:hover {
  background: #094771;
}

.picker-item.selected {
  background: #094771;
  outline: 1px solid #007acc;
}

.picker-char-name {
  font-size: 14px;
}

.picker-expr-select {
  background: #3c3c3c;
  border: 1px solid #555;
  color: #ccc;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
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
