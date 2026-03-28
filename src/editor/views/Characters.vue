<template>
  <div class="characters-view" v-if="!script.isLoading && script.data">
    <div class="sidebar-list">
      <div class="list-header">
        <h3>角色列表</h3>
        <button @click="addCharacter">+</button>
      </div>
      <div class="list-items">
        <div 
          v-for="(char, id) in script.data.characters" 
          :key="id" 
          class="list-item"
          :class="{ active: selectedId === id }"
          @click="selectCharacter(id)">
          {{ char.name }} ({{ id }})
        </div>
      </div>
    </div>

    <div class="editor-pane" v-if="selectedChar">
      <div class="toolbar">
        <h2>编辑角色: {{ selectedId }}</h2>
        <button class="save-btn" @click="save">保存更改</button>
      </div>
      
      <div class="form-group">
        <label>ID（键名）</label>
        <input type="text" :value="selectedId" disabled class="disabled-input" />
      </div>

      <div class="form-group">
        <label>显示名称</label>
        <input type="text" v-model="selectedChar.name" />
      </div>

      <div class="form-group">
        <label>名称颜色</label>
        <div style="display: flex; gap: 10px;">
          <input type="color" v-model="selectedChar.color" />
          <input type="text" v-model="selectedChar.color" style="flex: 1;" />
        </div>
      </div>

      <div class="expressions-section">
        <div class="section-header">
          <h3>表情列表</h3>
          <button @click="addExpression">添加表情</button>
        </div>
        
        <div class="expr-list">
          <div class="expr-item" v-for="(path, exprName) in selectedChar.expressions" :key="exprName">
            <input 
              type="text" 
              placeholder="表情名称（如 smile）" 
              :value="exprName" 
              @change="updateExpressionName(exprName, $event.target.value)" 
              class="expr-name-input" />
            <input 
              type="text" 
              placeholder="图片路径（如 characters/sakura_smile.png）" 
              v-model="selectedChar.expressions[exprName]" 
              class="expr-path-input" />
            <button class="danger-btn" @click="deleteExpression(exprName)">删除</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="empty-state" v-else>
      <p>从左侧列表选择一个角色进行编辑，或创建新角色。</p>
    </div>
  </div>
  
  <div class="loading-state" v-else>
    正在加载脚本数据…
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useScriptStore } from '../stores/script.js';

const script = useScriptStore();
const selectedId = ref('');

const selectedChar = computed(() => {
  if (!script.data || !selectedId.value) return null;
  return script.data.characters[selectedId.value];
});

onMounted(() => {
  if (!script.data) {
    script.loadScript();
  }
});

function selectCharacter(id) {
  selectedId.value = id;
}

function addCharacter() {
  const id = prompt('请输入角色 ID（如 hero、heroine）:');
  if (id && !script.data.characters[id]) {
    script.data.characters[id] = {
      name: 'New Character',
      color: '#FFFFFF',
      expressions: {
        normal: `characters/${id}_normal.png`
      }
    };
    selectedId.value = id;
  }
}

function addExpression() {
  if (!selectedChar.value) return;
  const exprName = prompt('请输入表情名称（如 angry、sad）:');
  if (exprName && !selectedChar.value.expressions[exprName]) {
    selectedChar.value.expressions[exprName] = `characters/${selectedId.value}_${exprName}.png`;
  }
}

function updateExpressionName(oldName, newName) {
  if (!newName || newName === oldName || selectedChar.value.expressions[newName]) return;
  const val = selectedChar.value.expressions[oldName];
  delete selectedChar.value.expressions[oldName];
  selectedChar.value.expressions[newName] = val;
}

function deleteExpression(exprName) {
  if (confirm(`确定删除表情 "${exprName}"？`)) {
    delete selectedChar.value.expressions[exprName];
  }
}

async function save() {
  await script.saveScript();
  alert('角色数据已保存！');
}
</script>

<style scoped>
.characters-view {
  display: flex;
  height: 100%;
}
.sidebar-list {
  width: 250px;
  background: #252526;
  border-right: 1px solid #111;
  display: flex;
  flex-direction: column;
}
.list-header {
  padding: 15px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.list-header h3 { margin: 0; font-size: 14px; font-weight: normal; color: #ccc; }
.list-header button { background: #007acc; color: white; border: none; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
.list-items {
  flex: 1;
  overflow-y: auto;
}
.list-item {
  padding: 10px 15px;
  cursor: pointer;
  border-bottom: 1px solid #333;
  font-size: 14px;
}
.list-item:hover { background: #2a2d2e; }
.list-item.active { background: #37373d; border-left: 3px solid #007acc; }

.editor-pane {
  flex: 1;
  padding: 20px 40px;
  overflow-y: auto;
}
.empty-state, .loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid #333;
}
.toolbar h2 { margin: 0; font-weight: 500; font-size: 20px; color: #fff; }
.save-btn { background: #007acc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }

.form-group {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-group label { font-size: 13px; color: #aaa; }
.form-group input[type="text"] {
  background: #3c3c3c;
  border: 1px solid #555;
  color: #fff;
  padding: 8px 10px;
  border-radius: 4px;
}
.disabled-input { opacity: 0.5; cursor: not-allowed; }

.expressions-section {
  margin-top: 40px;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 20px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.section-header h3 { margin: 0; font-weight: normal; font-size: 16px; }
.section-header button { background: #333; border: 1px solid #555; color: #fff; padding: 6px 12px; border-radius: 4px; cursor: pointer; }

.expr-list { display: flex; flex-direction: column; gap: 10px; }
.expr-item { display: flex; gap: 10px; align-items: center; background: #252526; padding: 10px; border-radius: 4px; }
.expr-name-input { width: 150px; background: #3c3c3c; border: 1px solid #555; color: #fff; padding: 6px; border-radius: 4px; }
.expr-path-input { flex: 1; background: #3c3c3c; border: 1px solid #555; color: #fff; padding: 6px; border-radius: 4px; }
.danger-btn { background: #a22; border: none; color: #fff; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
</style>
