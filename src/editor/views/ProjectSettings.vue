<template>
  <div class="project-settings-editor" v-if="project.projectData">
    <!-- Left panel: scrollable form -->
    <div class="ps-panel">
      <div class="ps-scroll">
        <!-- Project metadata -->
        <div class="ps-section">
          <h3 class="ps-section-title">📋 项目信息</h3>
          <form @submit.prevent class="settings-form">
            <label>项目名称 <HelpTip :text="HELP_SETTINGS.projectName" />
              <input v-model="project.projectData.name" @input="project.markDirty()" />
            </label>
            <label>作者
              <input v-model="project.projectData.author" @input="project.markDirty()" />
            </label>
            <label>描述
              <textarea v-model="project.projectData.description" rows="3" @input="project.markDirty()"></textarea>
            </label>
            <label>分辨率 <HelpTip :text="HELP_SETTINGS.resolution" />
              <div class="resolution-group">
                <input type="number" v-model.number="project.projectData.resolution.width" @input="project.markDirty()" /> ×
                <input type="number" v-model.number="project.projectData.resolution.height" @input="project.markDirty()" />
              </div>
            </label>
            <div class="info-row">
              <span class="info-label">引擎版本</span>
              <span class="info-value">{{ project.projectData.engineVersion }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">项目路径</span>
              <span class="info-value path">{{ project.projectPath }}</span>
            </div>
          </form>
          <div class="export-section">
            <button class="export-btn" @click="showExport = true" title="打开导出设置">📦 导出游戏</button>
          </div>
          <DialogueBoxSettings />
        </div>

        <!-- Global Theme section -->
        <div class="ps-section" v-if="script.data">
          <h3 class="ps-section-title">🎨 全局配色</h3>
          <div class="theme-toolbar">
            <button class="toolbar-btn" @click="onResetTheme" title="重置主题">🔄 重置</button>
            <button class="toolbar-btn" @click="themeEditor.showPalette.value = true" title="调色盘生成器">🎨 调色盘</button>
            <button class="toolbar-btn" @click="themeEditor.showNineSlice.value = true" title="九宫格配置">🖼️ 九宫格</button>
            <button class="toolbar-btn" @click="showThemeBrowser = true" title="统一主题浏览器">🎭 主题浏览器</button>
            <button class="toolbar-btn" @click="onExportThemePackage" title="导出当前完整主题包">📤 导出主题包</button>
            <span v-if="themeExportStatus" class="toolbar-status">{{ themeExportStatus }}</span>
          </div>
          <SmartColorPanel />
          <TokenAccordion />
          <ButtonFamilyImageSettings @preview="onButtonFamilyPreview" />
          <CursorIconSettings />
        </div>
      </div>
    </div>

    <!-- Right panel: iframe preview -->
    <div class="ps-preview" v-if="script.data">
      <iframe
        :ref="onIframeRef"
        class="preview-iframe"
        src="/index.html"
      ></iframe>
    </div>

    <!-- Modals -->
    <ExportModal :visible="showExport" @close="showExport = false" />
    <template v-if="script.data">
      <PaletteModal v-if="themeEditor.showPalette.value" @close="themeEditor.showPalette.value = false" />
      <NineSliceModal v-if="themeEditor.showNineSlice.value" @close="themeEditor.showNineSlice.value = false" />
      <ThemeBrowserModal v-if="showThemeBrowser" @close="onThemeBrowserClose" />
    </template>
  </div>
</template>

<script setup>
import { provide, ref, onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useProjectStore } from '../stores/project.js';
import { useScriptStore } from '../stores/script.js';
import { createThemeEditor } from '../composables/useThemeEditor.js';
import { exportCurrentThemePackage } from '../services/themePackageExport.js';
import DialogueBoxSettings from '../components/DialogueBoxSettings.vue';
import ExportModal from '../components/ExportModal.vue';
import HelpTip from '../components/HelpTip.vue';
import SmartColorPanel from '../components/theme/SmartColorPanel.vue';
import TokenAccordion from '../components/theme/TokenAccordion.vue';
import PaletteModal from '../components/theme/PaletteModal.vue';
import NineSliceModal from '../components/theme/NineSliceModal.vue';
import ThemeBrowserModal from '../components/theme/ThemeBrowserModal.vue';
import ButtonFamilyImageSettings from '../components/theme/ButtonFamilyImageSettings.vue';
import CursorIconSettings from '../components/theme/CursorIconSettings.vue';
import { HELP_SETTINGS } from '../helpTexts.js';

const project = useProjectStore();
const script = useScriptStore();
const themeEditor = createThemeEditor();
const showExport = ref(false);
const showThemeBrowser = ref(false);
const themeExportStatus = ref('');
const DIALOGUE_PREVIEW_SAMPLE = {
  type: 'show-dialogue-preview',
  speakerName: '预览角色',
  text: '这是一段用于检查对话框图片层、文字层和继续指示的稳定示例台词。',
};

function onIframeRef(el) {
  themeEditor.iframeRef.value = el;
}

function onResetTheme() {
  themeEditor.resetTheme();
  themeEditor.commitTheme();
}

async function onExportThemePackage() {
  try {
    themeExportStatus.value = '导出中...';
    const result = await exportCurrentThemePackage({
      ipcRenderer: window.ipcRenderer,
      scriptStore: script,
    });
    themeExportStatus.value = result.message || '';
    if (result.status === 'success') {
      setTimeout(() => {
        if (themeExportStatus.value === result.message) {
          themeExportStatus.value = '';
        }
      }, 3000);
    }
  } catch (error) {
    console.error('[ProjectSettings] Export theme package failed:', error);
    themeExportStatus.value = `导出失败：${error?.message ?? '未知错误'}`;
  }
}

function onThemeBrowserClose() {
  showThemeBrowser.value = false;
  if (themeEditor.isEngineReady.value) {
    themeEditor.startEngine();
    themeEditor.flushPreview();
    sendShowScreen();
  }
}

function sendShowScreen() {
  themeEditor.iframeRef.value?.contentWindow?.postMessage({
    type: 'show-screen',
    screenId: 'settingsScreen',
  }, '*');
}

function sendDialoguePreview() {
  if (!themeEditor.iframeRef.value?.contentWindow || !script.data) return;
  themeEditor.startEngine();
  themeEditor.flushPreview();
  themeEditor.iframeRef.value.contentWindow.postMessage(DIALOGUE_PREVIEW_SAMPLE, '*');
}

const buttonFamilyPreviewMap = {
  gameMenuButton: { type: 'show-screen', screenId: 'gameMenu' },
  pageTabPager: { type: 'show-screen', screenId: 'saveLoadScreen' },
  settingsTab: { type: 'show-screen', screenId: 'settingsScreen' },
  closeButton: { type: 'show-screen', screenId: 'settingsScreen' },
  qab: null, // uses show-dialogue-preview path
};

function onButtonFamilyPreview(familyKey) {
  if (!themeEditor.iframeRef.value?.contentWindow || !script.data) return;
  themeEditor.startEngine();
  themeEditor.flushPreview();

  const route = buttonFamilyPreviewMap[familyKey];
  if (route) {
    themeEditor.iframeRef.value.contentWindow.postMessage(route, '*');
  } else if (familyKey === 'qab') {
    themeEditor.iframeRef.value.contentWindow.postMessage(DIALOGUE_PREVIEW_SAMPLE, '*');
  }
}

provide('dialoguePreview', sendDialoguePreview);

function onMessage(event) {
  themeEditor.onEngineMessage(event);
  // After engine ready, show settings screen for preview context
  if (event.data?.type === 'ready' && themeEditor.iframeRef.value) {
    setTimeout(sendShowScreen, 100);
  }
}

onMounted(() => {
  window.addEventListener('message', onMessage);
});

onActivated(() => {
  if (themeEditor.isEngineReady.value) {
    themeEditor.startEngine();
    themeEditor.flushPreview();
    sendShowScreen();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage);
});
</script>

<style scoped>
.project-settings-editor {
  display: flex;
  height: 100%;
  background: #1e1e1e;
}
.ps-panel {
  width: 400px;
  min-width: 400px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #333;
  background: #252526;
}
.ps-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}
.ps-section {
  margin-bottom: 20px;
}
.ps-section-title {
  font-size: 14px;
  color: #e0e0e0;
  font-weight: 600;
  margin: 0 0 12px;
}
.ps-preview {
  flex: 1;
  display: flex;
  background: #000;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
/* Existing form styles */
.settings-form label { display: block; color: #aaa; font-size: 13px; margin-bottom: 16px; }
.settings-form input, .settings-form textarea {
  display: block; width: 100%; margin-top: 4px; padding: 8px 12px;
  background: #1e1e1e; border: 1px solid #444; border-radius: 6px;
  color: #e0e0e0; font-size: 14px; box-sizing: border-box; font-family: inherit;
}
.resolution-group { display: flex; align-items: center; gap: 8px; margin-top: 4px; color: #888; }
.resolution-group input { width: 100px; }
.info-row { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #333; color: #888; font-size: 13px; }
.info-value { color: #ccc; }
.info-value.path { font-size: 12px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
.export-section { margin: 16px 0; padding-top: 12px; border-top: 1px solid #333; }
.export-btn {
  padding: 10px 24px; background: #007acc; color: #fff; border: none;
  border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: 500;
}
.export-btn:hover { background: #0098ff; }
/* Theme toolbar */
.theme-toolbar {
  display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;
}
.toolbar-btn {
  background: #333; color: #ccc; border: 1px solid #444;
  padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;
}
.toolbar-btn:hover { background: #444; color: #e0e0e0; }
.toolbar-status {
  display: inline-flex;
  align-items: center;
  color: #999;
  font-size: 12px;
}
</style>
