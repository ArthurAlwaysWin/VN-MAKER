<template>
  <div class="scenes-view" v-if="!script.isLoading && script.data">
    <!-- Scene List Sidebar -->
    <div class="scene-sidebar">
      <div class="list-header">
        <h3>场景列表</h3>
        <button class="add-btn" @click="addScene">+</button>
      </div>
      <div class="list-items">
        <div 
          v-for="(scene, id) in script.data.scenes" 
          :key="id" 
          class="list-item"
          :class="{ active: selectedSceneId === id }"
          @click="selectScene(id)">
          <div class="scene-name">{{ scene.name }}</div>
          <div class="scene-id">{{ id }}</div>
        </div>
      </div>
    </div>

    <AssetPanel ref="assetPanelRef" />

    <!-- Main Workspace -->
    <div class="scene-workspace" v-if="selectedScene" @dragover.prevent @drop="onAssetDrop">
      <div class="toolbar">
        <div class="scene-meta">
          <input type="text" v-model="selectedScene.name" placeholder="场景名称" class="scene-name-input" />
          <span class="scene-id-lbl">ID: {{ selectedSceneId }}</span>
        </div>
        <div class="actions">
          <!-- View toggle: Timeline / Canvas -->
          <div class="view-toggle">
            <button :class="{ active: viewMode === 'timeline' }" @click="viewMode = 'timeline'">📋 时间线</button>
            <button :class="{ active: viewMode === 'canvas' }" @click="viewMode = 'canvas'">🎨 画布</button>
          </div>
          <select v-model="newCommandType" class="cmd-select">
            <option value="dialogue">对话</option>
            <option value="show_character">显示角色</option>
            <option value="hide_character">隐藏角色</option>
            <option value="set_expression">设置表情</option>
            <option value="set_background">设置背景</option>
            <option value="play_bgm">播放BGM</option>
            <option value="play_se">播放音效</option>
            <option value="stop_bgm">停止BGM</option>
            <option value="choice">选择菜单</option>
            <option value="set_variable">设置变量</option>
            <option value="condition">条件分支</option>
            <option value="jump">跳转场景</option>
            <option value="end">结束游戏</option>
          </select>
          <button class="primary-btn" @click="addCommand">添加指令</button>
          <button class="save-btn" @click="save">保存脚本</button>
        </div>
      </div>
      
      <!-- Timeline View -->
      <div class="timeline" v-if="viewMode === 'timeline'">
        <div 
          v-for="(cmd, index) in selectedScene.commands" 
          :key="index"
          class="command-block"
          :class="{ active: selectedCmdIndex === index }"
          @click="selectCommand(index)">
          <div class="cmd-header">
            <span class="cmd-type">{{ cmd.type }}</span>
            <span class="cmd-preview">{{ getCommandPreview(cmd) }}</span>
          </div>
          <div class="cmd-actions">
            <button @click.stop="moveCmd(index, -1)" :disabled="index === 0">↑</button>
            <button @click.stop="moveCmd(index, 1)" :disabled="index === selectedScene.commands.length - 1">↓</button>
            <button @click.stop="deleteCmd(index)" class="del-btn">✕</button>
          </div>
        </div>
        <div class="empty-commands" v-if="!selectedScene.commands || selectedScene.commands.length === 0">
          该场景暂无指令。
        </div>
      </div>

      <!-- Canvas View -->
      <CanvasPreview
        v-if="viewMode === 'canvas'"
        :scene-state="sceneState"
        :selected-scene="selectedScene"
        :selected-cmd-index="selectedCmdIndex"
        @position-update="handlePositionUpdate"
      />
    </div>
    
    <div class="empty-state" v-else>
      从左侧选择一个场景开始编辑。
    </div>

    <!-- Command Property Inspector -->
    <div class="inspector" v-if="selectedScene && selectedCmd">
      <div class="inspector-header">
        <h3>属性</h3>
        <span class="cmd-badge">{{ selectedCmd.type }}</span>
      </div>
      
      <div class="inspector-body">
        
        <!-- Dialogue -->
        <template v-if="selectedCmd.type === 'dialogue'">
          <div class="form-group">
            <label>说话人（角色ID，留空为旁白）</label>
            <input type="text" v-model="selectedCmd.speaker" />
          </div>
          <div class="form-group">
            <label>文本</label>
            <textarea v-model="selectedCmd.text" rows="4"></textarea>
          </div>
          <div class="inspector-section">
            <div class="section-toggle" @click="showDialogueStyle = !showDialogueStyle">
              {{ showDialogueStyle ? '▾' : '▸' }} 自定义样式
            </div>
            <template v-if="showDialogueStyle">
              <div class="form-row">
                <div class="form-group half">
                  <label>X坐标</label>
                  <input type="number" :value="selectedCmd.style?.x" @input="setStyleField(selectedCmd, 'x', $event)" />
                </div>
                <div class="form-group half">
                  <label>Y坐标</label>
                  <input type="number" :value="selectedCmd.style?.y" @input="setStyleField(selectedCmd, 'y', $event)" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group half">
                  <label>宽度</label>
                  <input type="number" :value="selectedCmd.style?.width" @input="setStyleField(selectedCmd, 'width', $event)" />
                </div>
                <div class="form-group half">
                  <label>高度</label>
                  <input type="number" :value="selectedCmd.style?.height" @input="setStyleField(selectedCmd, 'height', $event)" />
                </div>
              </div>
              <div class="form-group">
                <label>字号 (px)</label>
                <input type="number" :value="selectedCmd.style?.fontSize" @input="setStyleField(selectedCmd, 'fontSize', $event)" />
              </div>
              <div class="form-group">
                <label>字体</label>
                <input type="text" :value="selectedCmd.style?.fontFamily" @input="setStyleTextField(selectedCmd, 'fontFamily', $event)" placeholder="Noto Sans SC" />
              </div>
              <div class="form-group">
                <label>文字颜色</label>
                <input type="text" :value="selectedCmd.style?.textColor" @input="setStyleTextField(selectedCmd, 'textColor', $event)" placeholder="#ffffff" />
              </div>
              <div class="form-group">
                <label>背景色</label>
                <input type="text" :value="selectedCmd.style?.backgroundColor" @input="setStyleTextField(selectedCmd, 'backgroundColor', $event)" placeholder="rgba(0,0,0,0.7)" />
              </div>
              <div class="form-row">
                <div class="form-group half">
                  <label>圆角</label>
                  <input type="number" :value="selectedCmd.style?.borderRadius" @input="setStyleField(selectedCmd, 'borderRadius', $event)" />
                </div>
                <div class="form-group half">
                  <label>内边距</label>
                  <input type="number" :value="selectedCmd.style?.padding" @input="setStyleField(selectedCmd, 'padding', $event)" />
                </div>
              </div>
            </template>
          </div>
        </template>

        <!-- Show Character -->
        <template v-if="selectedCmd.type === 'show_character' || selectedCmd.type === 'set_expression'">
          <div class="form-group">
            <label>角色 ID</label>
            <input type="text" v-model="selectedCmd.id" />
          </div>
          <div class="form-group">
            <label>表情</label>
            <input type="text" v-model="selectedCmd.expression" />
          </div>
          <div class="form-group" v-if="selectedCmd.type === 'show_character'">
            <label>位置</label>
            <select v-model="selectedCmd.position">
              <option value="left">左侧</option>
              <option value="center">居中</option>
              <option value="right">右侧</option>
              <option value="custom">自定义 (x/y)</option>
            </select>
          </div>
          <!-- Custom position fields -->
          <template v-if="selectedCmd.type === 'show_character' && selectedCmd.position === 'custom'">
            <div class="form-row">
              <div class="form-group half">
                <label>X坐标</label>
                <input type="number" v-model.number="selectedCmd.x" />
              </div>
              <div class="form-group half">
                <label>Y坐标</label>
                <input type="number" v-model.number="selectedCmd.y" />
              </div>
            </div>
            <div class="form-group">
              <label>缩放</label>
              <input type="number" v-model.number="selectedCmd.scale" step="0.1" min="0.1" max="5" />
            </div>
          </template>
        </template>
        
        <!-- Hide Character -->
        <template v-if="selectedCmd.type === 'hide_character'">
          <div class="form-group">
            <label>角色 ID</label>
            <input type="text" v-model="selectedCmd.id" />
          </div>
        </template>

        <!-- Set Background -->
        <template v-if="selectedCmd.type === 'set_background'">
          <div class="form-group">
            <label>图片路径</label>
            <input type="text" v-model="selectedCmd.image" placeholder="backgrounds/school.png" />
          </div>
        </template>

        <!-- Audio -->
        <template v-if="selectedCmd.type === 'play_bgm' || selectedCmd.type === 'play_se'">
          <div class="form-group">
            <label>音频文件</label>
            <input type="text" v-model="selectedCmd.file" placeholder="audio/bgm.mp3" />
          </div>
          <div class="form-group" v-if="selectedCmd.type === 'play_bgm'">
            <label>音量 (0.0 到 1.0)</label>
            <input type="number" v-model.number="selectedCmd.volume" step="0.1" min="0" max="1" />
          </div>
        </template>

        <!-- Jump -->
        <template v-if="selectedCmd.type === 'jump'">
          <div class="form-group">
            <label>目标场景</label>
            <input type="text" v-model="selectedCmd.target" />
          </div>
        </template>
        
        <!-- Choice -->
        <template v-if="selectedCmd.type === 'choice'">
          <div class="form-group">
            <label>提示文本</label>
            <input type="text" v-model="selectedCmd.prompt" />
          </div>
          <div class="form-group">
            <label>布局</label>
            <select v-model="selectedCmd.layout">
              <option value="default">默认（居中）</option>
              <option value="custom">自定义（自由定位）</option>
            </select>
          </div>
          <template v-if="selectedCmd.layout === 'custom'">
            <div class="form-row">
              <div class="form-group half">
                <label>X坐标</label>
                <input type="number" :value="selectedCmd.style?.x" @input="setStyleField(selectedCmd, 'x', $event)" />
              </div>
              <div class="form-group half">
                <label>Y坐标</label>
                <input type="number" :value="selectedCmd.style?.y" @input="setStyleField(selectedCmd, 'y', $event)" />
              </div>
            </div>
          </template>
          <div class="options-list">
            <label>选项列表</label>
            <div class="option-item" v-for="(opt, i) in selectedCmd.options" :key="i">
              <input type="text" v-model="opt.text" placeholder="选项文本" />
              <input type="text" v-model="opt.jump" placeholder="跳转场景" />
              <button @click="selectedCmd.options.splice(i, 1)">x</button>
            </div>
            <button class="secondary-btn" @click="!selectedCmd.options ? selectedCmd.options = [{text:'', jump:''}] : selectedCmd.options.push({text:'', jump:''})">添加选项</button>
          </div>
        </template>

      </div>
    </div>
    
    <div class="empty-inspector" v-else-if="selectedScene">
      选择一个指令以查看属性
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { useCanvasState } from '../composables/useCanvasState.js';
import CanvasPreview from '../components/canvas/CanvasPreview.vue';
import AssetPanel from '../components/AssetPanel.vue';

const script = useScriptStore();
const selectedSceneId = ref('');
const selectedCmdIndex = ref(-1);
const newCommandType = ref('dialogue');
const viewMode = ref('timeline');
const showDialogueStyle = ref(false);
const assetPanelRef = ref(null);

const selectedScene = computed(() => {
  if (!script.data || !selectedSceneId.value) return null;
  return script.data.scenes[selectedSceneId.value];
});

const selectedCmd = computed(() => {
  if (!selectedScene.value || selectedCmdIndex.value < 0) return null;
  return selectedScene.value.commands[selectedCmdIndex.value];
});

// Canvas state composable
const { sceneState, updateElementPosition, findSourceCommand } = useCanvasState(selectedScene, selectedCmdIndex);

// Handle drag position updates from canvas
function handlePositionUpdate(event) {
  const { type, elementId, ...updates } = event;
  const srcIdx = findSourceCommand(selectedScene.value, selectedCmdIndex.value, type, elementId);
  if (srcIdx >= 0) {
    updateElementPosition(selectedScene.value, srcIdx, type, updates);
    // Auto-select the source command so inspector shows it
    selectedCmdIndex.value = srcIdx;
  }
}

// Style field helpers for the inspector
function setStyleField(cmd, field, event) {
  const val = Number(event.target.value);
  if (isNaN(val)) return;
  if (!cmd.style) cmd.style = {};
  cmd.style[field] = val;
}

function setStyleTextField(cmd, field, event) {
  const val = event.target.value;
  if (!cmd.style) cmd.style = {};
  cmd.style[field] = val || undefined;
}

function selectScene(id) {
  selectedSceneId.value = id;
  selectedCmdIndex.value = -1;
}

function selectCommand(index) {
  selectedCmdIndex.value = index;
}

function addScene() {
  const id = prompt('请输入场景 ID（如 dawn_1）:');
  if (id && !script.data.scenes[id]) {
    script.data.scenes[id] = { name: '新场景', commands: [] };
    selectedSceneId.value = id;
    selectedCmdIndex.value = -1;
  }
}

function addCommand() {
  if (!selectedScene.value) return;
  if (!selectedScene.value.commands) selectedScene.value.commands = [];
  
  const baseCmd = { type: newCommandType.value };
  
  // Set some sensible defaults based on type
  if (baseCmd.type === 'dialogue') {
    baseCmd.speaker = '';
    baseCmd.text = '新对话文本';
  } else if (baseCmd.type === 'show_character') {
    baseCmd.id = '';
    baseCmd.expression = 'normal';
    baseCmd.position = 'center';
  } else if (baseCmd.type === 'choice') {
    baseCmd.prompt = '请做出选择';
    baseCmd.options = [{ text: '是', jump: '' }];
  }

  selectedScene.value.commands.push(baseCmd);
  selectedCmdIndex.value = selectedScene.value.commands.length - 1;
}

function deleteCmd(index) {
  if (!selectedScene.value) return;
  selectedScene.value.commands.splice(index, 1);
  if (selectedCmdIndex.value === index) selectedCmdIndex.value = -1;
  else if (selectedCmdIndex.value > index) selectedCmdIndex.value--;
}

function moveCmd(index, dir) {
  if (!selectedScene.value) return;
  const cmds = selectedScene.value.commands;
  if (index + dir < 0 || index + dir >= cmds.length) return;
  
  const temp = cmds[index];
  cmds[index] = cmds[index + dir];
  cmds[index + dir] = temp;
  
  if (selectedCmdIndex.value === index) selectedCmdIndex.value = index + dir;
  else if (selectedCmdIndex.value === index + dir) selectedCmdIndex.value = index;
}

function getCommandPreview(cmd) {
  switch (cmd.type) {
    case 'dialogue': return `${cmd.speaker ? cmd.speaker+':' : ''} ${cmd.text?.substring(0, 30)}...`;
    case 'show_character': return `${cmd.id} (${cmd.expression}) ${cmd.position}`;
    case 'set_background': return `${cmd.image}`;
    case 'play_bgm': return `${cmd.file}`;
    case 'choice': return `${cmd.options?.length || 0} 个选项`;
    case 'jump': return `→ ${cmd.target}`;
    default: return '';
  }
}

function onAssetDrop(event) {
  if (!selectedScene.value) return;
  const raw = event.dataTransfer.getData('application/galgame-asset');
  if (!raw) return;
  let asset;
  try {
    asset = JSON.parse(raw);
  } catch {
    return;
  }
  const { category, filename } = asset;
  const scene = selectedScene.value;

  if (category === 'backgrounds') {
    let bgCmd = scene.commands.find(c => c.type === 'set_background');
    if (bgCmd) {
      bgCmd.image = filename;
    } else {
      scene.commands.unshift({ type: 'set_background', image: filename });
    }
  } else if (category === 'characters') {
    const charId = filename.replace(/\.[^.]+$/, '').replace(/_\w+$/, '');
    scene.commands.push({ type: 'show_character', id: charId, expression: 'normal', position: 'center' });
  } else if (category === 'audio') {
    let bgmCmd = scene.commands.find(c => c.type === 'play_bgm');
    if (bgmCmd) {
      bgmCmd.file = filename;
    } else {
      scene.commands.unshift({ type: 'play_bgm', file: filename });
    }
  }
  script.pushState();
}

async function save() {
  await script.saveScript();
  alert('脚本已保存！');
}
</script>

<style scoped>
.scenes-view { display: flex; height: 100%; width: 100%; }

/* Left Sidebar */
.scene-sidebar { width: 220px; background: #252526; border-right: 1px solid #111; display: flex; flex-direction: column; flex-shrink: 0; }
.list-header { padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
.list-header h3 { margin: 0; font-size: 14px; font-weight: normal; color: #ccc; }
.add-btn { background: #007acc; color: white; border: none; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
.list-items { flex: 1; overflow-y: auto; }
.list-item { padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #333; }
.list-item:hover { background: #2a2d2e; }
.list-item.active { background: #37373d; border-left: 3px solid #007acc; }
.scene-name { font-size: 14px; color: #fff; margin-bottom: 4px; }
.scene-id { font-size: 11px; color: #888; }

/* Middle Workspace */
.scene-workspace { flex: 1; display: flex; flex-direction: column; background: #1e1e1e; min-width: 400px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid #111; background: #2d2d2d; flex-wrap: wrap; gap: 10px; }
.scene-meta { display: flex; align-items: center; gap: 15px; }
.scene-name-input { background: #1e1e1e; border: 1px solid #555; color: #fff; padding: 6px 10px; border-radius: 4px; font-size: 16px; width: 200px; }
.scene-id-lbl { color: #888; font-size: 12px; }
.actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.cmd-select { background: #3c3c3c; border: 1px solid #555; color: #fff; padding: 6px; border-radius: 4px; }
.primary-btn { background: #333; color: white; border: 1px solid #555; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
.save-btn { background: #007acc; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
.empty-state { flex: 1; display: flex; align-items: center; justify-content: center; color: #888; }

/* View Toggle */
.view-toggle { display: flex; border: 1px solid #555; border-radius: 4px; overflow: hidden; }
.view-toggle button { background: #3c3c3c; color: #aaa; border: none; padding: 6px 12px; cursor: pointer; font-size: 12px; transition: all 0.2s; }
.view-toggle button.active { background: #007acc; color: #fff; }
.view-toggle button:not(:last-child) { border-right: 1px solid #555; }

.timeline { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 8px; }
.command-block { display: flex; justify-content: space-between; align-items: center; background: #2d2d2d; border: 1px solid #444; padding: 12px 15px; border-radius: 6px; cursor: pointer; }
.command-block:hover { border-color: #666; }
.command-block.active { border-color: #007acc; background: #252526; box-shadow: 0 0 0 1px #007acc; }
.cmd-header { display: flex; flex-direction: column; gap: 4px; }
.cmd-type { font-size: 12px; color: #007acc; font-weight: bold; text-transform: uppercase; }
.cmd-preview { font-size: 14px; color: #ccc; }
.cmd-actions { display: flex; gap: 5px; opacity: 0; transition: opacity 0.2s; }
.command-block:hover .cmd-actions, .command-block.active .cmd-actions { opacity: 1; }
.cmd-actions button { background: #444; border: none; color: #fff; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; }
.cmd-actions button:disabled { opacity: 0.3; cursor: not-allowed; }
.cmd-actions .del-btn { background: #a22; }

/* Right Inspector */
.inspector { width: 300px; background: #252526; border-left: 1px solid #111; display: flex; flex-direction: column; flex-shrink: 0; overflow-y: auto; }
.empty-inspector { width: 300px; background: #252526; border-left: 1px solid #111; display: flex; align-items: center; justify-content: center; color: #888; font-size: 13px; text-align: center; padding: 20px; flex-shrink: 0; }
.inspector-header { padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; background: #2d2d2d; }
.inspector-header h3 { margin: 0; font-size: 14px; font-weight: normal; color: #fff; }
.cmd-badge { background: #007acc; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }

.inspector-body { padding: 15px; display: flex; flex-direction: column; gap: 15px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 12px; color: #aaa; }
.form-group input[type="text"], .form-group input[type="number"], .form-group select { background: #3c3c3c; border: 1px solid #555; color: #fff; padding: 6px 8px; border-radius: 4px; width: 100%; box-sizing: border-box; }
.form-group textarea { background: #3c3c3c; border: 1px solid #555; color: #fff; padding: 8px; border-radius: 4px; width: 100%; resize: vertical; font-family: inherit; box-sizing: border-box; }

/* Two-column form row */
.form-row { display: flex; gap: 10px; }
.form-group.half { flex: 1; }

/* Collapsible style section */
.inspector-section { border-top: 1px solid #444; padding-top: 10px; }
.section-toggle { font-size: 12px; color: #aaa; cursor: pointer; user-select: none; padding: 4px 0; }
.section-toggle:hover { color: #fff; }

.options-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; border-top: 1px solid #444; padding-top: 15px; }
.options-list label { font-size: 12px; color: #aaa; }
.option-item { display: flex; gap: 5px; }
.option-item input { background: #3c3c3c; border: 1px solid #555; color: #fff; padding: 4px; border-radius: 4px; width: 50%; }
.option-item button { background: #a22; border: none; color: #fff; padding: 0 8px; border-radius: 4px; cursor: pointer; }
.secondary-btn { background: #444; color: #fff; border: 1px solid #555; padding: 6px; border-radius: 4px; cursor: pointer; margin-top: 5px; }
</style>
