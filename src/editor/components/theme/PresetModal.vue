<template>
  <Teleport to="body">
    <div class="preset-overlay" @click.self="onClose">
      <div class="preset-modal">
        <!-- Header -->
        <div class="modal-header">
          <h3>📦 主题预设 <HelpTip :text="HELP_THEME.presets" /></h3>
          <button class="close-btn" @click="onClose" title="关闭">✕</button>
        </div>

        <!-- Body: 2×2 preset card grid -->
        <div class="modal-body">
          <div class="preset-grid">
            <div
              v-for="preset in THEME_PRESETS"
              :key="preset.id"
              class="preset-card"
              :class="{ selected: selectedId === preset.id }"
              @click="onSelectPreset(preset)"
            >
              <div class="card-swatches">
                <div class="swatch" :style="{ background: preset.tokens['primary'] }"></div>
                <div class="swatch" :style="{ background: preset.tokens['accent'] }"></div>
                <div class="swatch" :style="{ background: preset.tokens['text'] }"></div>
                <div class="swatch" :style="{ background: preset.tokens['panel-bg'] }"></div>
                <div class="swatch" :style="{ background: preset.tokens['btn-bg'] }"></div>
                <div class="swatch" :style="{ background: preset.tokens['border-hover'] }"></div>
              </div>
              <div class="card-label">{{ preset.name }}</div>
              <div class="card-desc">{{ preset.description }}</div>
            </div>
          </div>
        </div>

        <!-- Export/Import section (D-03) -->
        <div class="export-import-section">
          <div class="section-divider"></div>
          <div class="export-import-row">
            <button class="action-btn" @click="onExport" title="将当前主题导出为兼容 .theme 文件（非 v1.6 完整主题）">📤 导出兼容主题</button>
            <button class="action-btn" @click="onImport" title="选择 .gmtheme 或兼容 .theme，并先生成静态预检摘要">📥 导入主题包</button>
            <span v-if="exportStatus" class="status-text">{{ exportStatus }}</span>
          </div>
          <div v-if="importSummary" class="import-summary" :class="`is-${importSummary.state}`">
            <div class="import-summary-header">
              <strong>{{ importSummary.title }}</strong>
              <span class="import-summary-badge">{{ importSummary.badge }}</span>
            </div>
            <div v-if="importSummary.namespaceText" class="import-summary-line">{{ importSummary.namespaceText }}</div>
            <div v-if="importSummary.coverageText" class="import-summary-line">覆盖范围：{{ importSummary.coverageText }}</div>
            <div v-if="importSummary.missingCoverageText" class="import-summary-line">缺失范围：{{ importSummary.missingCoverageText }}</div>
            <div class="import-summary-line">预览方式：静态摘要（未应用主题不提供 live iframe）。</div>
            <ul v-if="importSummary.planLines.length" class="import-summary-list">
              <li v-for="line in importSummary.planLines" :key="line">{{ line }}</li>
            </ul>
            <ul v-if="importSummary.warningLines.length" class="import-summary-list">
              <li v-for="line in importSummary.warningLines" :key="line">{{ line }}</li>
            </ul>
            <ul v-if="importSummary.blockingErrors.length" class="import-summary-errors">
              <li v-for="line in importSummary.blockingErrors" :key="line">{{ line }}</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="cancel-btn" @click="onClose" title="取消">取消</button>
          <button class="apply-btn" :disabled="!selectedId" @click="onApply" title="应用选中的主题预设">应用预设</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import { useThemeEditor } from '../../composables/useThemeEditor.js';
import { useScriptStore } from '../../stores/script.js';
import { preflightThemePackageImport } from '../../services/themePackageImport.js';
import { THEME_PRESETS } from '../../../engine/presets.js';
import { buildThemeZip } from '../../../utils/themePackager.js';
import HelpTip from '../HelpTip.vue';
import { HELP_THEME } from '../../helpTexts.js';

const emit = defineEmits(['close']);
const editor = useThemeEditor();
const script = useScriptStore();
const selectedId = ref(null);
const exportStatus = ref('');
const importSummary = ref(null);

function onSelectPreset(preset) {
  selectedId.value = preset.id;
  editor.previewPreset(preset.tokens);
}

function onApply() {
  const preset = THEME_PRESETS.find(p => p.id === selectedId.value);
  if (!preset) return;
  editor.applyPreset(preset.tokens);
  emit('close');
}

function onClose() {
  editor.cancelPreview();
  importSummary.value = null;
  emit('close');
}

async function onExport() {
  try {
    exportStatus.value = '导出中...';
    const theme = script.getTheme();
    if (!theme) { exportStatus.value = '无主题数据'; return; }

    const plain = JSON.parse(JSON.stringify(theme));
    const zipBuffer = buildThemeZip(plain, {
      name: '自定义主题',
      description: '',
      author: '',
      createdAt: new Date().toISOString(),
    });

    const result = await window.ipcRenderer.invoke('export-theme', { buffer: zipBuffer });
    if (result.canceled) {
      exportStatus.value = '';
      return;
    }
    if (!result.success) {
      exportStatus.value = '导出失败: ' + result.error;
      return;
    }
    exportStatus.value = '导出成功';
    setTimeout(() => { exportStatus.value = ''; }, 3000);
  } catch (e) {
    console.error('[PresetModal] Export failed:', e);
    exportStatus.value = '导出失败: ' + e.message;
  }
}

async function onImport() {
  try {
    const result = await preflightThemePackageImport({
      ipcRenderer: window.ipcRenderer,
      scriptStore: script,
    });
    if (result.canceled) {
      return;
    }
    exportStatus.value = '';
    importSummary.value = result.summary;
  } catch (e) {
    console.error('[PresetModal] Import failed:', e);
    exportStatus.value = '导入失败: ' + e.message;
  }
}
</script>

<style scoped>
.preset-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.preset-modal {
  background: #252526;
  border: 1px solid #444;
  border-radius: 8px;
  width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}
.modal-header h3 {
  margin: 0;
  font-size: 15px;
  color: #e0e0e0;
}
.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
}
.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}
.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.preset-card {
  background: #2d2d2d;
  border: 2px solid #444;
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: border-color 150ms;
}
.preset-card:hover {
  border-color: #666;
}
.preset-card.selected {
  border-color: #b4a0ff;
}
.card-swatches {
  display: flex;
  gap: 2px;
  margin-bottom: 8px;
}
.swatch {
  width: 100%;
  height: 24px;
  border-radius: 2px;
}
.card-label {
  font-size: 14px;
  color: #e0e0e0;
  font-weight: 500;
  margin-bottom: 2px;
}
.card-desc {
  font-size: 11px;
  color: #888;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #333;
}
.cancel-btn {
  background: #333;
  color: #ccc;
  border: 1px solid #444;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
}
.apply-btn {
  background: rgba(180, 160, 255, 0.3);
  color: #e0e0e0;
  border: 1px solid rgba(180, 160, 255, 0.5);
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
}
.apply-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.export-import-section {
  padding: 0 16px 8px;
}
.section-divider {
  height: 1px;
  background: #333;
  margin-bottom: 12px;
}
.export-import-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.action-btn {
  background: #2d2d2d;
  color: #ccc;
  border: 1px solid #444;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.action-btn:hover {
  background: #3a3a3a;
  color: #e0e0e0;
}
.status-text {
  font-size: 12px;
  color: #888;
  margin-left: 4px;
}
.import-summary {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #3f3f46;
  background: #1f1f22;
  color: #d6d6d8;
  font-size: 12px;
  line-height: 1.5;
}
.import-summary.is-blocked {
  border-color: rgba(200, 90, 90, 0.55);
}
.import-summary.is-legacy-partial {
  border-color: rgba(197, 156, 77, 0.55);
}
.import-summary.is-ready {
  border-color: rgba(73, 147, 112, 0.55);
}
.import-summary-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}
.import-summary-badge {
  color: #f0c674;
  white-space: nowrap;
}
.import-summary-line {
  margin-bottom: 4px;
}
.import-summary-list,
.import-summary-errors {
  margin: 6px 0 0;
  padding-left: 18px;
}
.import-summary-errors {
  color: #ff9b9b;
}
</style>
