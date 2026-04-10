<template>
  <Teleport to="body">
    <div v-if="visible" class="export-overlay" @click.self="onClose">
      <div class="export-modal">
        <!-- Header -->
        <div class="export-header">
          <div class="header-left">
            <span>📦 导出游戏</span>
            <div v-if="state === 'config'" class="format-toggle">
              <button
                :class="['format-btn', { active: format === 'web' }]"
                @click="format = 'web'"
              >Web</button>
              <button
                :class="['format-btn', { active: format === 'desktop' }]"
                @click="format = 'desktop'"
              >桌面版</button>
            </div>
          </div>
          <button v-if="state !== 'exporting'" class="export-close" @click="onClose">×</button>
        </div>

        <!-- STATE: config -->
        <div v-if="state === 'config'" class="export-body">
          <label class="export-field">
            <span class="field-label">游戏标题</span>
            <input v-model="gameTitle" class="export-input" placeholder="输入游戏标题" />
          </label>

          <div class="export-field">
            <span class="field-label">输出目录</span>
            <div class="picker-row">
              <span class="picker-value" :title="outputDir">{{ outputDir || '未选择' }}</span>
              <button class="picker-btn" @click="pickOutputDir">选择文件夹</button>
            </div>
          </div>

          <div v-if="format === 'web'" class="export-field">
            <span class="field-label">Favicon (可选)</span>
            <div class="picker-row">
              <span class="picker-value" :title="faviconPath">{{ faviconPath ? faviconPath.split(/[\\/]/).pop() : '无' }}</span>
              <button class="picker-btn" @click="pickFavicon">选择文件</button>
              <button v-if="faviconPath" class="clear-btn" @click="clearFavicon" title="清除">×</button>
            </div>
          </div>

          <div v-if="format === 'desktop'" class="export-field">
            <span class="field-label">游戏图标 (可选)</span>
            <div class="icon-preview-row">
              <img
                :src="iconPreviewUrl || '/default-game-icon.png'"
                class="icon-thumbnail"
                alt="游戏图标"
              />
              <div class="icon-info">
                <span class="icon-name">{{ iconPath ? iconPath.split(/[\\/]/).pop() : '使用默认图标' }}</span>
                <div class="icon-actions">
                  <button class="picker-btn" @click="pickIcon">选择 PNG</button>
                  <button v-if="iconPath" class="clear-btn" @click="clearIcon" title="清除">×</button>
                </div>
              </div>
            </div>
          </div>

          <label class="export-field toggle-field">
            <span class="field-label">打包为 ZIP</span>
            <input type="checkbox" v-model="enableZip" class="export-toggle" />
          </label>
        </div>

        <!-- STATE: exporting -->
        <div v-else-if="state === 'exporting'" class="export-body export-progress-body">
          <div class="progress-step">{{ progress.step }}</div>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" :style="{ width: progress.percent + '%' }"></div>
          </div>
          <div class="progress-percent">{{ progress.percent }}%</div>
        </div>

        <!-- STATE: done -->
        <div v-else class="export-body">
          <!-- Success -->
          <div v-if="result?.success" class="done-success">
            <div class="done-icon">✅</div>
            <div class="done-title">导出成功</div>
            <div class="done-path" :title="result.outputPath">{{ result.outputPath }}</div>
            <div v-if="result.zipPath" class="done-path zip-path" :title="result.zipPath">ZIP: {{ result.zipPath }}</div>
            <!-- Warnings (D-10) -->
            <div v-if="result.warnings?.length" class="warnings-section">
              <button class="warnings-toggle" @click="warningsExpanded = !warningsExpanded">
                ⚠️ 导出成功，但有 {{ result.warnings.length }} 个资源未找到
                <span class="toggle-arrow">{{ warningsExpanded ? '▼' : '▶' }}</span>
              </button>
              <ul v-if="warningsExpanded" class="warnings-list">
                <li v-for="w in result.warnings" :key="w">{{ w }}</li>
              </ul>
            </div>
          </div>
          <!-- Failure (D-11) -->
          <div v-else class="done-failure">
            <div class="done-icon">❌</div>
            <div class="done-title">导出失败</div>
            <div class="done-error">{{ result?.error || '未知错误' }}</div>
          </div>
        </div>

        <!-- Footer (state-dependent) -->
        <div class="export-footer">
          <template v-if="state === 'config'">
            <button class="btn-secondary" @click="onClose">取消</button>
            <button class="btn-primary" :disabled="!gameTitle.trim() || !outputDir" @click="startExport">开始导出</button>
          </template>
          <template v-else-if="state === 'exporting'">
            <button class="btn-secondary" @click="cancelExport">取消</button>
          </template>
          <template v-else>
            <button v-if="result?.success" class="btn-secondary" @click="openOutputFolder">📂 打开文件夹</button>
            <button v-if="!result?.success" class="btn-secondary" @click="retry">重试</button>
            <button class="btn-primary" @click="emit('close')">关闭</button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import { useProjectStore } from '../stores/project.js';

const project = useProjectStore();

const props = defineProps({
  visible: Boolean,
});
const emit = defineEmits(['close']);

// ─── State machine ───────────────────────────────────────
const state = ref('config'); // 'config' | 'exporting' | 'done'
const progress = ref({ step: '', percent: 0 });
const result = ref(null);

// ─── Config form fields ──────────────────────────────────
const gameTitle = ref('');
const outputDir = ref('');
const faviconPath = ref(null);
const enableZip = ref(false);
const warningsExpanded = ref(false);
const format = ref('desktop');       // D-03: default to 桌面版
const iconPath = ref(null);          // Desktop icon file path
const iconPreviewUrl = ref(null);    // Base64 data URL for thumbnail

// ─── Progress listener cleanup ───────────────────────────
let progressUnsub = null;

function cleanupProgressListener() {
  if (progressUnsub) {
    progressUnsub();
    progressUnsub = null;
  }
}

// ─── Reset on visibility change ──────────────────────────
watch(() => props.visible, (val) => {
  if (val) {
    state.value = 'config';
    gameTitle.value = project.projectData?.name || '';
    outputDir.value = '';
    faviconPath.value = null;
    enableZip.value = false;
    result.value = null;
    warningsExpanded.value = false;
    format.value = 'desktop';       // D-03: default to desktop
    iconPath.value = null;
    iconPreviewUrl.value = null;
  } else {
    cleanupProgressListener();
  }
});

onBeforeUnmount(() => {
  cleanupProgressListener();
});

// ─── Methods ─────────────────────────────────────────────

async function pickOutputDir() {
  const dir = await window.ipcRenderer.invoke('dialog-open-directory');
  if (dir) outputDir.value = dir;
}

async function pickFavicon() {
  const file = await window.ipcRenderer.invoke('dialog-open-file', {
    title: '选择 Favicon',
    filters: [{ name: '图标文件', extensions: ['ico', 'png'] }],
  });
  if (file) faviconPath.value = file;
}

function clearFavicon() {
  faviconPath.value = null;
}

async function pickIcon() {
  const file = await window.ipcRenderer.invoke('dialog-open-file', {
    title: '选择游戏图标',
    filters: [{ name: 'PNG 图片', extensions: ['png'] }],
  });
  if (!file) return;
  iconPath.value = file;
  const base64 = await window.ipcRenderer.invoke('read-file-base64', file);
  if (base64) iconPreviewUrl.value = `data:image/png;base64,${base64}`;
}

function clearIcon() {
  iconPath.value = null;
  iconPreviewUrl.value = null;
}

async function startExport() {
  if (!gameTitle.value.trim() || !outputDir.value) return;

  state.value = 'exporting';
  progress.value = { step: '准备中...', percent: 0 };

  cleanupProgressListener();
  progressUnsub = window.ipcRenderer.on('export-progress', (event, payload) => {
    progress.value = payload;
  });

  let res;
  if (format.value === 'desktop') {
    res = await window.ipcRenderer.invoke('export-game-desktop', {
      outputDir: outputDir.value,
      gameTitle: gameTitle.value.trim(),
      iconPath: iconPath.value,
      zip: enableZip.value,
      gameWidth: project.projectData?.resolution?.width || 1280,
      gameHeight: project.projectData?.resolution?.height || 720,
    });
  } else {
    res = await window.ipcRenderer.invoke('export-game', {
      outputDir: outputDir.value,
      gameTitle: gameTitle.value.trim(),
      faviconPath: faviconPath.value,
      zip: enableZip.value,
    });
  }

  cleanupProgressListener();

  // If user cancelled while waiting, ignore result
  if (state.value !== 'exporting') return;

  result.value = res;
  state.value = 'done';
}

function cancelExport() {
  state.value = 'config';
}

async function openOutputFolder() {
  await window.ipcRenderer.invoke('open-folder', result.value.outputPath);
}

function retry() {
  state.value = 'config';
}

function onClose() {
  if (state.value === 'exporting') return;
  emit('close');
}
</script>

<style scoped>
.export-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.export-modal {
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 10px;
  width: 480px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.export-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  font-size: 15px;
  font-weight: 600;
  color: #eee;
}
.export-close {
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}
.export-close:hover {
  color: #fff;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.format-toggle {
  display: flex;
  border: 1px solid #444;
  border-radius: 6px;
  overflow: hidden;
}
.format-btn {
  padding: 4px 14px;
  background: #2a2a2a;
  color: #888;
  border: none;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.format-btn:hover:not(.active) {
  background: #333;
  color: #bbb;
}
.format-btn.active {
  background: #007acc;
  color: #fff;
}
.format-btn + .format-btn {
  border-left: 1px solid #444;
}
.icon-preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.icon-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  border: 1px solid #444;
  background: #2a2a2a;
  object-fit: contain;
}
.icon-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.icon-name {
  font-size: 13px;
  color: #ccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.icon-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.export-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.export-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-label {
  font-size: 13px;
  color: #aaa;
}
.export-input {
  padding: 8px 12px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 14px;
  font-family: inherit;
}
.export-input:focus {
  border-color: #007acc;
  outline: none;
}
.picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.picker-value {
  flex: 1;
  padding: 8px 12px;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #ccc;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.picker-btn {
  padding: 8px 14px;
  background: #333;
  color: #ccc;
  border: 1px solid #444;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}
.picker-btn:hover {
  background: #3a3a3a;
  color: #e0e0e0;
}
.clear-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}
.clear-btn:hover {
  color: #fff;
}
.toggle-field {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.export-toggle {
  accent-color: #007acc;
  width: 18px;
  height: 18px;
}
.export-progress-body {
  align-items: center;
  padding: 32px 16px;
}
.progress-step {
  font-size: 14px;
  color: #e0e0e0;
  margin-bottom: 12px;
}
.progress-bar-track {
  width: 100%;
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: #007acc;
  border-radius: 4px;
  transition: width 0.3s ease;
}
.progress-percent {
  font-size: 13px;
  color: #888;
  margin-top: 8px;
  font-family: monospace;
}
.done-success,
.done-failure {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.done-icon {
  font-size: 36px;
}
.done-title {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0e0;
}
.done-path {
  font-size: 12px;
  color: #888;
  word-break: break-all;
  max-width: 100%;
}
.zip-path {
  color: #6a9;
  font-size: 12px;
}
.done-error {
  font-size: 13px;
  color: #e88;
  background: #2a1a1a;
  padding: 8px 12px;
  border-radius: 6px;
  word-break: break-all;
}
.warnings-section {
  width: 100%;
  margin-top: 8px;
  text-align: left;
}
.warnings-toggle {
  background: none;
  border: none;
  color: #da3;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.toggle-arrow {
  font-size: 10px;
}
.warnings-list {
  margin: 4px 0 0 16px;
  padding: 0;
  list-style: disc;
  font-size: 11px;
  color: #888;
  max-height: 120px;
  overflow-y: auto;
}
.export-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #333;
}
.btn-primary {
  padding: 8px 20px;
  background: #007acc;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
}
.btn-primary:hover {
  background: #0098ff;
}
.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-secondary {
  padding: 8px 16px;
  background: #333;
  color: #ccc;
  border: 1px solid #444;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.btn-secondary:hover {
  background: #3a3a3a;
  color: #e0e0e0;
}
</style>
