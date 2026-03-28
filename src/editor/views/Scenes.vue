<template>
  <div class="scenes-view" v-if="!script.isLoading && script.data">
    <!-- Scene List Sidebar -->
    <div class="scene-sidebar">
      <div class="list-header">
        <h3>Scenes</h3>
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

    <!-- Main Workspace -->
    <div class="scene-workspace" v-if="selectedScene">
      <div class="toolbar">
        <div class="scene-meta">
          <input type="text" v-model="selectedScene.name" placeholder="Scene Name" class="scene-name-input" />
          <span class="scene-id-lbl">ID: {{ selectedSceneId }}</span>
        </div>
        <div class="actions">
          <!-- View toggle: Timeline / Canvas -->
          <div class="view-toggle">
            <button :class="{ active: viewMode === 'timeline' }" @click="viewMode = 'timeline'">📋 Timeline</button>
            <button :class="{ active: viewMode === 'canvas' }" @click="viewMode = 'canvas'">🎨 Canvas</button>
          </div>
          <select v-model="newCommandType" class="cmd-select">
            <option value="dialogue">Dialogue</option>
            <option value="show_character">Show Character</option>
            <option value="hide_character">Hide Character</option>
            <option value="set_expression">Set Expression</option>
            <option value="set_background">Set Background</option>
            <option value="play_bgm">Play BGM</option>
            <option value="play_se">Play SE</option>
            <option value="stop_bgm">Stop BGM</option>
            <option value="choice">Choice Menu</option>
            <option value="set_variable">Set Variable</option>
            <option value="condition">Condition Branch</option>
            <option value="jump">Jump Scene</option>
            <option value="end">End Game</option>
          </select>
          <button class="primary-btn" @click="addCommand">Add Command</button>
          <button class="save-btn" @click="save">Save Script</button>
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
          No commands in this scene.
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
      Select a scene from the left to start editing.
    </div>

    <!-- Command Property Inspector -->
    <div class="inspector" v-if="selectedScene && selectedCmd">
      <div class="inspector-header">
        <h3>Properties</h3>
        <span class="cmd-badge">{{ selectedCmd.type }}</span>
      </div>
      
      <div class="inspector-body">
        
        <!-- Dialogue -->
        <template v-if="selectedCmd.type === 'dialogue'">
          <div class="form-group">
            <label>Speaker (ID or blank for narrator)</label>
            <input type="text" v-model="selectedCmd.speaker" />
          </div>
          <div class="form-group">
            <label>Text</label>
            <textarea v-model="selectedCmd.text" rows="4"></textarea>
          </div>
          <div class="inspector-section">
            <div class="section-toggle" @click="showDialogueStyle = !showDialogueStyle">
              {{ showDialogueStyle ? '▾' : '▸' }} Custom Style
            </div>
            <template v-if="showDialogueStyle">
              <div class="form-row">
                <div class="form-group half">
                  <label>X (px)</label>
                  <input type="number" :value="selectedCmd.style?.x" @input="setStyleField(selectedCmd, 'x', $event)" />
                </div>
                <div class="form-group half">
                  <label>Y (px)</label>
                  <input type="number" :value="selectedCmd.style?.y" @input="setStyleField(selectedCmd, 'y', $event)" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group half">
                  <label>Width</label>
                  <input type="number" :value="selectedCmd.style?.width" @input="setStyleField(selectedCmd, 'width', $event)" />
                </div>
                <div class="form-group half">
                  <label>Height</label>
                  <input type="number" :value="selectedCmd.style?.height" @input="setStyleField(selectedCmd, 'height', $event)" />
                </div>
              </div>
              <div class="form-group">
                <label>Font Size (px)</label>
                <input type="number" :value="selectedCmd.style?.fontSize" @input="setStyleField(selectedCmd, 'fontSize', $event)" />
              </div>
              <div class="form-group">
                <label>Font Family</label>
                <input type="text" :value="selectedCmd.style?.fontFamily" @input="setStyleTextField(selectedCmd, 'fontFamily', $event)" placeholder="Noto Sans SC" />
              </div>
              <div class="form-group">
                <label>Text Color</label>
                <input type="text" :value="selectedCmd.style?.textColor" @input="setStyleTextField(selectedCmd, 'textColor', $event)" placeholder="#ffffff" />
              </div>
              <div class="form-group">
                <label>Background Color</label>
                <input type="text" :value="selectedCmd.style?.backgroundColor" @input="setStyleTextField(selectedCmd, 'backgroundColor', $event)" placeholder="rgba(0,0,0,0.7)" />
              </div>
              <div class="form-row">
                <div class="form-group half">
                  <label>Border Radius</label>
                  <input type="number" :value="selectedCmd.style?.borderRadius" @input="setStyleField(selectedCmd, 'borderRadius', $event)" />
                </div>
                <div class="form-group half">
                  <label>Padding</label>
                  <input type="number" :value="selectedCmd.style?.padding" @input="setStyleField(selectedCmd, 'padding', $event)" />
                </div>
              </div>
            </template>
          </div>
        </template>

        <!-- Show Character -->
        <template v-if="selectedCmd.type === 'show_character' || selectedCmd.type === 'set_expression'">
          <div class="form-group">
            <label>Character ID</label>
            <input type="text" v-model="selectedCmd.id" />
          </div>
          <div class="form-group">
            <label>Expression</label>
            <input type="text" v-model="selectedCmd.expression" />
          </div>
          <div class="form-group" v-if="selectedCmd.type === 'show_character'">
            <label>Position</label>
            <select v-model="selectedCmd.position">
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="custom">Custom (x/y)</option>
            </select>
          </div>
          <!-- Custom position fields -->
          <template v-if="selectedCmd.type === 'show_character' && selectedCmd.position === 'custom'">
            <div class="form-row">
              <div class="form-group half">
                <label>X (px)</label>
                <input type="number" v-model.number="selectedCmd.x" />
              </div>
              <div class="form-group half">
                <label>Y (px)</label>
                <input type="number" v-model.number="selectedCmd.y" />
              </div>
            </div>
            <div class="form-group">
              <label>Scale</label>
              <input type="number" v-model.number="selectedCmd.scale" step="0.1" min="0.1" max="5" />
            </div>
          </template>
        </template>
        
        <!-- Hide Character -->
        <template v-if="selectedCmd.type === 'hide_character'">
          <div class="form-group">
            <label>Character ID</label>
            <input type="text" v-model="selectedCmd.id" />
          </div>
        </template>

        <!-- Set Background -->
        <template v-if="selectedCmd.type === 'set_background'">
          <div class="form-group">
            <label>Image Path</label>
            <input type="text" v-model="selectedCmd.image" placeholder="backgrounds/school.png" />
          </div>
        </template>

        <!-- Audio -->
        <template v-if="selectedCmd.type === 'play_bgm' || selectedCmd.type === 'play_se'">
          <div class="form-group">
            <label>Audio File</label>
            <input type="text" v-model="selectedCmd.file" placeholder="audio/bgm.mp3" />
          </div>
          <div class="form-group" v-if="selectedCmd.type === 'play_bgm'">
            <label>Volume (0.0 to 1.0)</label>
            <input type="number" v-model.number="selectedCmd.volume" step="0.1" min="0" max="1" />
          </div>
        </template>

        <!-- Jump -->
        <template v-if="selectedCmd.type === 'jump'">
          <div class="form-group">
            <label>Target Scene</label>
            <input type="text" v-model="selectedCmd.target" />
          </div>
        </template>
        
        <!-- Choice -->
        <template v-if="selectedCmd.type === 'choice'">
          <div class="form-group">
            <label>Prompt Text</label>
            <input type="text" v-model="selectedCmd.prompt" />
          </div>
          <div class="form-group">
            <label>Layout</label>
            <select v-model="selectedCmd.layout">
              <option value="default">Default (Centered)</option>
              <option value="custom">Custom (Free Position)</option>
            </select>
          </div>
          <template v-if="selectedCmd.layout === 'custom'">
            <div class="form-row">
              <div class="form-group half">
                <label>X (px)</label>
                <input type="number" :value="selectedCmd.style?.x" @input="setStyleField(selectedCmd, 'x', $event)" />
              </div>
              <div class="form-group half">
                <label>Y (px)</label>
                <input type="number" :value="selectedCmd.style?.y" @input="setStyleField(selectedCmd, 'y', $event)" />
              </div>
            </div>
          </template>
          <div class="options-list">
            <label>Options</label>
            <div class="option-item" v-for="(opt, i) in selectedCmd.options" :key="i">
              <input type="text" v-model="opt.text" placeholder="Text" />
              <input type="text" v-model="opt.jump" placeholder="Jump scene" />
              <button @click="selectedCmd.options.splice(i, 1)">x</button>
            </div>
            <button class="secondary-btn" @click="!selectedCmd.options ? selectedCmd.options = [{text:'', jump:''}] : selectedCmd.options.push({text:'', jump:''})">Add Option</button>
          </div>
        </template>

      </div>
    </div>
    
    <div class="empty-inspector" v-else-if="selectedScene">
      Select a command to view properties
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useScriptStore } from '../stores/script.js';
import { useCanvasState } from '../composables/useCanvasState.js';
import CanvasPreview from '../components/canvas/CanvasPreview.vue';

const script = useScriptStore();
const selectedSceneId = ref('');
const selectedCmdIndex = ref(-1);
const newCommandType = ref('dialogue');
const viewMode = ref('timeline');
const showDialogueStyle = ref(false);

onMounted(() => {
  if (!script.data) {
    script.loadScript();
  }
});

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
  const id = prompt('Enter scene ID (e.g. dawn_1):');
  if (id && !script.data.scenes[id]) {
    script.data.scenes[id] = { name: 'New Scene', commands: [] };
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
    baseCmd.text = 'New Dialogue line';
  } else if (baseCmd.type === 'show_character') {
    baseCmd.id = '';
    baseCmd.expression = 'normal';
    baseCmd.position = 'center';
  } else if (baseCmd.type === 'choice') {
    baseCmd.prompt = 'Make a choice';
    baseCmd.options = [{ text: 'Yes', jump: '' }];
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
    case 'show_character': return `${cmd.id} (${cmd.expression}) at ${cmd.position}`;
    case 'set_background': return `${cmd.image}`;
    case 'play_bgm': return `${cmd.file}`;
    case 'choice': return `${cmd.options?.length || 0} options`;
    case 'jump': return `-> ${cmd.target}`;
    default: return '';
  }
}

async function save() {
  await script.saveScript();
  alert('Script saved!');
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
