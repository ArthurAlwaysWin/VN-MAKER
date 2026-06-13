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
          <div class="agent-handoff-section" v-if="project.agentHandoff">
            <div class="agent-handoff-header">
              <h4>外部 Agent 交接</h4>
              <button class="agent-refresh-btn" @click="project.loadAgentHandoff()" title="重新读取 agent-handoff.json">刷新</button>
            </div>
            <div class="agent-gates">
              <span
                v-for="gate in agentGateRows"
                :key="gate.key"
                class="agent-gate"
                :class="{ ok: gate.ok, blocked: !gate.ok }"
              >
                {{ gate.label }} {{ gate.ok ? 'OK' : '待处理' }}
              </span>
            </div>
            <div class="agent-meta">
              <span v-if="project.agentHandoff.transactionSummary">
                {{ project.agentHandoff.transactionSummary.command || 'transaction' }}
                · {{ project.agentHandoff.transactionSummary.operationCount ?? 1 }} ops
                · {{ project.agentHandoff.transactionSummary.changedPathCount ?? 0 }} paths
              </span>
              <span>Review items {{ project.agentHandoff.reviewItemCount ?? agentReviewItems.length }}</span>
              <span>
                Open {{ agentReviewStatusCounts.open }}
                · Acknowledged {{ agentReviewStatusCounts.acknowledged }}
                · Resolved {{ agentReviewStatusCounts.resolved }}
              </span>
              <span v-if="project.agentHandoff.latestCheckpointPath" class="agent-path">{{ project.agentHandoff.latestCheckpointPath }}</span>
              <span v-if="getAgentDslSourceMapLabel()" class="agent-path">{{ getAgentDslSourceMapLabel() }}</span>
            </div>
            <div class="agent-preview-targets" v-if="agentPreviewTargets.length">
              <h5>视觉预览目标</h5>
              <ul class="agent-review-list">
                <li
                  v-for="target in agentPreviewTargets"
                  :key="getPreviewTargetKey(target)"
                >
                  <span class="agent-review-code">{{ getPreviewTargetKindLabel(target) }}</span>
                  <span class="agent-review-text">
                    {{ getPreviewTargetLabel(target) }}
                    <small v-if="getAgentDslSourceLabel(target.source)" class="agent-dsl-source">
                      {{ getAgentDslSourceLabel(target.source) }}
                    </small>
                  </span>
                  <button
                    class="agent-locate-btn"
                    @click="openPreviewTarget(target)"
                    :title="getPreviewTargetTitle(target)"
                  >{{ getPreviewTargetActionLabel(target) }}</button>
                </li>
              </ul>
            </div>
            <div class="agent-review-groups" v-if="agentReviewGroups.length">
              <section
                v-for="group in agentReviewGroups"
                :key="group.key"
                class="agent-review-group"
              >
                <h5>{{ group.label }}</h5>
                <ul class="agent-review-list" v-if="group.changedPaths.length">
                  <li v-for="pathString in group.changedPaths" :key="pathString">
                    <span class="agent-review-code">changed</span>
                    <span class="agent-review-text">{{ pathString }}</span>
                    <button
                      v-if="canNavigateAgentPath(pathString)"
                      class="agent-locate-btn"
                      @click="openAgentPath(pathString)"
                      :title="getAgentPathTitle(pathString)"
                    >定位</button>
                  </li>
                </ul>
                <ul class="agent-review-list" v-if="group.reviewItems.length">
                  <li
                    v-for="item in group.reviewItems"
                    :key="getAgentReviewItemKey(item)"
                    :class="`review-status-${getAgentReviewStatus(item)}`"
                  >
                    <span class="agent-review-code">{{ getAgentReviewItemLabel(item) }}</span>
                    <span class="agent-review-text" :title="getAgentReviewItemTitle(item)">
                      {{ getAgentReviewItemText(item) }}
                      <small v-if="getAgentDslReviewLabel(item)" class="agent-dsl-source">
                        {{ getAgentDslReviewLabel(item) }}
                      </small>
                    </span>
                    <span class="agent-review-status">{{ getAgentReviewStatusLabel(item) }}</span>
                    <button
                      v-if="canNavigateAgentPath(item.pathString)"
                      class="agent-locate-btn"
                      @click="openAgentPath(item.pathString)"
                      :title="getAgentPathTitle(item.pathString)"
                    >定位</button>
                    <button
                      class="agent-locate-btn"
                      @click="project.setAgentReviewItemStatus(item, 'acknowledged')"
                      title="标记为已阅"
                    >已阅</button>
                    <button
                      class="agent-locate-btn"
                      @click="project.setAgentReviewItemStatus(item, 'resolved')"
                      title="标记为已解决"
                    >解决</button>
                    <button
                      v-if="getAgentReviewStatus(item) !== 'open'"
                      class="agent-locate-btn"
                      @click="project.clearAgentReviewItemStatus(item)"
                      title="清除本地状态"
                    >重置</button>
                  </li>
                </ul>
              </section>
            </div>
          </div>
          <div class="agent-handoff-empty" v-else>
            <span>外部 Agent 交接</span>
            <button class="agent-refresh-btn" @click="project.loadAgentHandoff()" title="读取 agent-handoff.json">检查</button>
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

        <div class="ps-section" v-if="script.data">
          <h3 class="ps-section-title">🎞️ 界面动效</h3>
          <div class="motion-grid">
            <label v-for="field in uiMotionFields" :key="field.key" class="motion-field">
              <span>{{ field.label }}</span>
              <select
                class="config-select"
                :value="uiMotion[field.key]"
                @change="onUiMotionChange(field.key, $event.target.value)"
              >
                <option
                  v-for="option in field.options"
                  :key="option"
                  :value="option"
                >{{ option }}</option>
              </select>
            </label>
          </div>
          <div class="motion-actions">
            <button class="toolbar-btn" @click="previewUiMotion" title="预览当前界面动效">预览动效</button>
          </div>
        </div>

        <div class="ps-section" v-if="script.data">
          <h3 class="ps-section-title">🎭 界面风格预设</h3>
          <div class="style-preset-controls">
            <label class="style-scope-field">
              <span>应用范围</span>
              <select v-model="uiStylePresetScope" class="config-select">
                <option
                  v-for="scope in uiStylePresetScopes"
                  :key="scope"
                  :value="scope"
                >{{ uiStyleScopeLabels[scope] }}</option>
              </select>
            </label>
            <div class="style-impact-summary" aria-live="polite">
              <span class="style-impact-title">将更新</span>
              <span
                v-for="section in uiStylePresetImpactSections"
                :key="section.path"
                class="style-impact-chip"
              >{{ section.label }}</span>
            </div>
          </div>
          <div class="style-preset-grid">
            <article
              v-for="preset in uiStylePresets"
              :key="preset.id"
              class="style-preset-card"
              :style="{ '--preset-accent': preset.accent }"
            >
              <button
                class="style-preset-preview"
                type="button"
                @click="previewUiStylePreset(preset.id)"
                :title="`预览 ${preset.label}`"
              >
                <span class="style-preset-swatch" :style="{ background: preset.preview.background, borderColor: preset.preview.accent }">
                  <strong>{{ preset.preview.text }}</strong>
                </span>
                <span class="style-preset-copy">
                  <strong>{{ preset.label }}</strong>
                  <small>{{ preset.description }}</small>
                  <span
                    v-if="getUiStylePresetImpact(preset.id)?.confirmationRequired"
                    class="style-preset-warning"
                  >会更新已有配置</span>
                </span>
              </button>
              <button
                class="style-preset-apply"
                type="button"
                @click="applyUiStylePreset(preset.id)"
                :title="`应用 ${preset.label}`"
              >应用</button>
            </article>
          </div>
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
import { provide, ref, computed, onMounted, onActivated, onBeforeUnmount } from 'vue';
import { useProjectStore } from '../stores/project.js';
import { useScriptStore } from '../stores/script.js';
import { createThemeEditor } from '../composables/useThemeEditor.js';
import { UI_MOTION_FIELD_SCHEMA, normalizeUiMotion } from '../../shared/uiMotionContract.js';
import {
  UI_STYLE_PRESET_SCOPES,
  applyUiStylePresetToScript,
  buildUiStylePresetImpactSummary,
  getUiStylePresetImpactSections,
  listUiStylePresets,
} from '../../shared/uiStylePresetContract.js';
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
import {
  countHandoffReviewStatuses,
  createHandoffReviewItemKey,
  groupHandoffReviewByPath,
  parseAgentPathTarget,
} from '../utils/agentHandoff.js';

const project = useProjectStore();
const script = useScriptStore();
const themeEditor = createThemeEditor();
const showExport = ref(false);
const showThemeBrowser = ref(false);
const themeExportStatus = ref('');
const uiStylePresetScope = ref('all');
const agentGateRows = computed(() => {
  const gates = project.agentHandoff?.gates ?? {};
  return [
    { key: 'validation', label: 'Validation', ok: gates.validation !== false },
    { key: 'layout', label: 'Layout', ok: gates.layout !== false },
    { key: 'readiness', label: 'Readiness', ok: gates.readiness !== false },
  ];
});
const agentReviewGroups = computed(() => groupHandoffReviewByPath(project.agentHandoff).slice(0, 6));
const agentReviewItems = computed(() => agentReviewGroups.value.flatMap((group) => group.reviewItems).slice(0, 5));
const agentReviewStatusCounts = computed(() => countHandoffReviewStatuses(project.agentHandoff, project.agentReviewState));
const agentPreviewTargets = computed(() => {
  const targets = project.agentHandoff?.previewTargets ?? [];
  return Array.isArray(targets) ? targets.slice(0, 8) : [];
});
const DIALOGUE_PREVIEW_SAMPLE = {
  type: 'show-dialogue-preview',
  speakerName: '预览角色',
  text: '这是一段用于检查对话框图片层、文字层和继续指示的稳定示例台词。',
};
const CHOICE_PREVIEW_SAMPLE = {
  type: 'show-choice-preview',
  prompt: '预览分支样式',
  options: [
    { text: '追问线索' },
    { text: '保持沉默' },
    { text: '改变路线' },
  ],
};
const uiMotionFields = Object.entries(UI_MOTION_FIELD_SCHEMA).map(([key, schema]) => ({
  key,
  label: schema.label,
  options: schema.options,
}));
const uiMotion = computed(() => normalizeUiMotion(script.data?.ui?.motion));
const uiStylePresets = listUiStylePresets();
const uiStylePresetScopes = UI_STYLE_PRESET_SCOPES;
const uiStylePresetImpactSections = computed(() => getUiStylePresetImpactSections(uiStylePresetScope.value));
const uiStylePresetImpactById = computed(() => {
  if (!script.data) {
    return {};
  }
  return Object.fromEntries(uiStylePresets.map((preset) => [
    preset.id,
    buildUiStylePresetImpactSummary(script.data, {
      presetId: preset.id,
      scope: uiStylePresetScope.value,
      merge: true,
    }),
  ]));
});
const uiStyleScopeLabels = {
  all: '全部 UI',
  dialogue: '仅对话框',
  choices: '仅选项',
  screens: '标题与主要界面',
};

function canNavigateAgentPath(pathString) {
  return Boolean(parseAgentPathTarget(pathString));
}

function openAgentPath(pathString) {
  project.requestAgentPathNavigation(pathString);
}

function getAgentReviewItemKey(item) {
  return createHandoffReviewItemKey(item);
}

function getAgentReviewStatus(item) {
  return project.agentReviewState[getAgentReviewItemKey(item)]?.status ?? 'open';
}

function getAgentReviewStatusLabel(item) {
  const status = getAgentReviewStatus(item);
  if (status === 'acknowledged') return '已阅';
  if (status === 'resolved') return '已解决';
  return '待处理';
}

function getAgentReviewItemLabel(item) {
  const labels = {
    'agent-dsl': 'agent DSL',
    'missing-asset': 'missing asset',
    'unused-asset': 'unused asset',
    'asset-check': 'asset check',
    'placeholder-asset': 'placeholder',
    'ambiguous-asset': 'ambiguous',
    'screen-ui-preview': 'screen preview',
    'ending-list-preview': 'ending preview',
    'gallery-preview': 'gallery preview',
    'branch-graph-preview': 'flow preview',
    'reference-screenshot-fidelity': 'reference fidelity',
  };
  return labels[item?.category] ?? item?.code ?? item?.source ?? 'review';
}

function getAgentDslSourceLabel(source) {
  if (source?.kind !== 'agent-dsl') return '';
  const file = source.file ?? 'story.dsl';
  const line = source.line ? `:${source.line}` : '';
  const status = source.status ? ` · ${source.status}` : '';
  return `DSL ${file}${line}${status}`;
}

function getAgentDslReviewLabel(item) {
  const source = item?.sourceLocation ?? item?.source;
  const label = getAgentDslSourceLabel(source);
  if (!label) return '';
  return item?.status ? `${label} · ${item.status}` : label;
}

function getAgentDslSourceMapLabel() {
  const sourceMap = project.agentHandoff?.dslSourceMap;
  if (!sourceMap) return '';
  const stale = sourceMap.stale
    ? sourceMap.stale.ok
      ? 'safe'
      : `${sourceMap.stale.staleCount ?? 0} stale`
    : 'unchecked';
  return `Agent DSL source map · ${sourceMap.mappingCount ?? 0} mappings · ${stale}`;
}

function getAgentReviewItemText(item) {
  if (item?.category === 'reference-screenshot-fidelity' && item.message) {
    return item.message;
  }
  return item?.pathString || item?.message || item?.code || 'review item';
}

function getAgentReviewItemTitle(item) {
  const parts = [
    item?.message,
    item?.pathString && item.pathString !== item.message ? item.pathString : null,
    item?.reference ? `Reference: ${item.reference}` : null,
  ];
  return parts.filter(Boolean).join('\n');
}

function getAgentPathTitle(pathString) {
  const target = parseAgentPathTarget(pathString);
  if (target?.kind === 'scene') return '在游戏内容中定位';
  if (target?.kind === 'variable') return '在剧情系统中定位';
  if (target?.kind === 'ending') return '在剧情系统中定位';
  if (target?.kind === 'cg') return '在剧情系统中定位';
  if (target?.kind === 'graph') return '在剧情系统中定位';
  if (target?.kind === 'character' || target?.kind === 'asset') return '在资源库中定位';
  if (target?.kind === 'ui') return '在项目设置中定位';
  return '定位';
}

function getPreviewTargetKey(target) {
  if (target?.type === 'ending-list' || target?.kind === 'ending-list') {
    return 'ending-list:systems.endings';
  }
  if (target?.type === 'gallery' || target?.kind === 'gallery') {
    return 'gallery:systems.gallery.cg';
  }
  if (target?.type === 'branch-graph' || target?.kind === 'branch-graph') {
    return 'branch-graph:analysis.sceneGraph';
  }
  if (target?.type === 'screen' || target?.screenId) {
    return `screen:${target.screenId}`;
  }
  return `scene:${target?.sceneId ?? 'unknown'}:${target?.pageIndex ?? 0}`;
}

function getPreviewTargetKindLabel(target) {
  if (target?.type === 'ending-list' || target?.kind === 'ending-list') {
    return 'ending';
  }
  if (target?.type === 'gallery' || target?.kind === 'gallery') {
    return 'gallery';
  }
  if (target?.type === 'branch-graph' || target?.kind === 'branch-graph') {
    return 'flow';
  }
  return target?.type === 'screen' || target?.screenId ? 'screen' : 'scene';
}

function getPreviewTargetLabel(target) {
  if (target?.type === 'ending-list' || target?.kind === 'ending-list') {
    return '结局列表';
  }
  if (target?.type === 'gallery' || target?.kind === 'gallery') {
    return 'CG 图库';
  }
  if (target?.type === 'branch-graph' || target?.kind === 'branch-graph') {
    return '剧情流程图';
  }
  if (target?.type === 'screen' || target?.screenId) {
    return target.screenId || 'screen';
  }
  return `${target?.sceneId ?? 'scene'} · page ${target?.pageIndex ?? 0}`;
}

function getPreviewTargetTitle(target) {
  if (target?.type === 'ending-list' || target?.kind === 'ending-list') {
    return '在剧情系统中定位结局列表';
  }
  if (target?.type === 'gallery' || target?.kind === 'gallery') {
    return '在剧情系统中定位 CG 图库';
  }
  if (target?.type === 'branch-graph' || target?.kind === 'branch-graph') {
    return '在剧情系统中定位流程图';
  }
  return target?.type === 'screen' || target?.screenId ? '在右侧预览画面' : '在游戏内容中定位页面';
}

function getPreviewTargetActionLabel(target) {
  if (target?.type === 'ending-list' || target?.kind === 'ending-list') {
    return '定位';
  }
  if (target?.type === 'gallery' || target?.kind === 'gallery') {
    return '定位';
  }
  if (target?.type === 'branch-graph' || target?.kind === 'branch-graph') {
    return '定位';
  }
  return target?.type === 'screen' || target?.screenId ? '预览' : '定位';
}

function openPreviewTarget(target) {
  if (!target) return;
  if (target.type === 'ending-list' || target.kind === 'ending-list') {
    project.requestAgentPathNavigation('systems.endings');
    return;
  }
  if (target.type === 'gallery' || target.kind === 'gallery') {
    project.requestAgentPathNavigation('systems.gallery.cg');
    return;
  }
  if (target.type === 'branch-graph' || target.kind === 'branch-graph') {
    project.requestAgentPathNavigation('analysis.sceneGraph');
    return;
  }
  if (target.type === 'screen' || target.screenId) {
    showPreviewScreen(target.screenId);
    return;
  }

  if (target.sceneId) {
    project.requestSceneNavigation(`scenes.${target.sceneId}.pages.${target.pageIndex ?? 0}`);
  }
}

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
  showPreviewScreen('settingsScreen');
}

function onUiMotionChange(field, value) {
  const next = {
    ...uiMotion.value,
    [field]: value,
  };
  script.updateUiMotion(next);
  previewUiMotion();
}

function previewUiMotion() {
  if (!themeEditor.iframeRef.value?.contentWindow || !script.data) return;
  themeEditor.startEngine();
  themeEditor.flushPreview();
  themeEditor.iframeRef.value.contentWindow.postMessage({
    type: 'update-ui-motion',
    motion: normalizeUiMotion(script.data.ui?.motion),
  }, '*');
  themeEditor.iframeRef.value.contentWindow.postMessage({
    type: 'show-screen',
    screenId: 'titleScreen',
  }, '*');
}

function showPresetPreviewTarget(scope = uiStylePresetScope.value) {
  if (scope === 'dialogue') {
    themeEditor.iframeRef.value?.contentWindow?.postMessage(DIALOGUE_PREVIEW_SAMPLE, '*');
    return;
  }
  if (scope === 'choices') {
    themeEditor.iframeRef.value?.contentWindow?.postMessage(CHOICE_PREVIEW_SAMPLE, '*');
    return;
  }
  const screenId = scope === 'screens' ? 'settingsScreen' : 'titleScreen';
  themeEditor.iframeRef.value?.contentWindow?.postMessage({
    type: 'show-screen',
    screenId,
  }, '*');
}

function previewUiStylePreset(presetId) {
  if (!themeEditor.iframeRef.value?.contentWindow || !script.data) return;
  const result = applyUiStylePresetToScript(script.data, {
    presetId,
    scope: uiStylePresetScope.value,
    merge: true,
  });
  const previewScript = result.script;
  const firstSceneId = Object.keys(previewScript.scenes || {})[0] || null;
  themeEditor.iframeRef.value.contentWindow.postMessage({
    type: 'start',
    script: previewScript,
    sceneId: firstSceneId,
  }, '*');
  setTimeout(() => showPresetPreviewTarget(result.scope), 50);
}

function getUiStylePresetImpact(presetId) {
  return uiStylePresetImpactById.value[presetId] ?? null;
}

function formatUiStylePresetConfirmation(summary) {
  const touched = summary.sections.map((section) => section.label).join('、');
  const existing = summary.sections
    .filter((section) => section.willOverwrite)
    .map((section) => section.label)
    .join('、');
  const lines = [
    `应用「${summary.label}」到「${uiStyleScopeLabels[summary.scope]}」？`,
    `将更新：${touched}`,
  ];
  if (existing) {
    lines.push(`已有配置会被同名字段覆盖：${existing}`);
  }
  return lines.join('\n');
}

function applyUiStylePreset(presetId) {
  const summary = getUiStylePresetImpact(presetId);
  if (summary?.confirmationRequired && !window.confirm(formatUiStylePresetConfirmation(summary))) {
    return;
  }
  const result = script.applyUiStylePreset({
    presetId,
    scope: uiStylePresetScope.value,
    merge: true,
  });
  if (!result) return;
  project.markDirty();
  themeEditor.startEngine();
  themeEditor.flushPreview();
  setTimeout(() => showPresetPreviewTarget(result.scope), 50);
}

function showPreviewScreen(screenId = 'settingsScreen') {
  if (script.data) {
    themeEditor.startEngine();
    themeEditor.flushPreview();
  }
  themeEditor.iframeRef.value?.contentWindow?.postMessage({
    type: 'show-screen',
    screenId,
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
  project.loadAgentHandoff();
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
.agent-handoff-section,
.agent-handoff-empty {
  margin: 14px 0 16px;
  padding: 10px;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  background: #202020;
  color: #cfcfcf;
  font-size: 12px;
}
.agent-handoff-empty {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.agent-handoff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.agent-handoff-header h4 {
  margin: 0;
  color: #e0e0e0;
  font-size: 13px;
}
.agent-refresh-btn {
  border: 1px solid #444;
  border-radius: 4px;
  background: #2f2f2f;
  color: #ccc;
  padding: 3px 8px;
  cursor: pointer;
  font-size: 12px;
}
.agent-refresh-btn:hover { background: #3a3a3a; color: #eee; }
.agent-gates {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.agent-gate {
  border-radius: 4px;
  padding: 3px 6px;
  border: 1px solid #4a4a4a;
  color: #d5d5d5;
}
.agent-gate.ok { border-color: #2f7d50; color: #8fe3ad; }
.agent-gate.blocked { border-color: #8a5a20; color: #ffc06a; }
.agent-meta {
  display: grid;
  gap: 4px;
  color: #999;
  margin-bottom: 8px;
}
.agent-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agent-review-groups {
  display: grid;
  gap: 8px;
}
.agent-preview-targets {
  display: grid;
  gap: 5px;
  padding-top: 6px;
  margin-bottom: 8px;
  border-top: 1px solid #333;
}
.agent-preview-targets h5 {
  margin: 0;
  color: #ddd;
  font-size: 12px;
  font-weight: 600;
}
.agent-review-group {
  display: grid;
  gap: 5px;
  padding-top: 6px;
  border-top: 1px solid #333;
}
.agent-review-group h5 {
  margin: 0;
  color: #ddd;
  font-size: 12px;
  font-weight: 600;
}
.agent-review-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 5px;
}
.agent-review-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
}
.agent-review-code {
  color: #f0c674;
}
.agent-review-text {
  color: #aaa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agent-dsl-source {
  display: block;
  margin-top: 2px;
  color: #83c6e6;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agent-review-status {
  color: #888;
  font-size: 11px;
}
.review-status-acknowledged .agent-review-status { color: #83c6e6; }
.review-status-resolved .agent-review-status { color: #8fe3ad; }
.review-status-resolved .agent-review-text { text-decoration: line-through; }
.agent-locate-btn {
  border: 1px solid #444;
  border-radius: 4px;
  background: #2f2f2f;
  color: #ccc;
  padding: 2px 6px;
  cursor: pointer;
  font-size: 11px;
}
.agent-locate-btn:hover { background: #3a3a3a; color: #eee; }
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
.motion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}
.motion-field {
  display: grid;
  gap: 5px;
  color: #bbb;
  font-size: 12px;
}
.motion-field .config-select {
  min-width: 0;
  background: #272727;
  color: #ddd;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 5px 8px;
}
.motion-actions {
  margin-top: 10px;
}
.style-preset-controls {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
}
.style-scope-field {
  display: grid;
  gap: 5px;
  color: #bbb;
  font-size: 12px;
}
.style-scope-field .config-select {
  background: #272727;
  color: #ddd;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 5px 8px;
}
.style-impact-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
  padding: 7px;
  border: 1px solid #343434;
  border-radius: 5px;
  background: #1f1f1f;
}
.style-impact-title {
  color: #aaa;
  font-size: 11px;
}
.style-impact-chip {
  border: 1px solid #444;
  border-radius: 4px;
  padding: 2px 7px;
  color: #d6d6d6;
  background: #292929;
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
}
.style-preset-grid {
  display: grid;
  gap: 8px;
}
.style-preset-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 6px;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  background: #202020;
  overflow: hidden;
}
.style-preset-card:hover {
  border-color: color-mix(in srgb, var(--preset-accent, #777) 56%, #3a3a3a);
}
.style-preset-preview,
.style-preset-apply {
  border: 0;
  color: #ddd;
  cursor: pointer;
  font: inherit;
}
.style-preset-preview {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 8px;
  text-align: left;
  background: transparent;
}
.style-preset-preview:hover {
  background: rgba(255, 255, 255, 0.04);
}
.style-preset-swatch {
  display: grid;
  place-items: center;
  width: 56px;
  height: 42px;
  border: 1px solid var(--preset-accent, #555);
  border-radius: 4px;
  color: #fff;
  box-shadow: inset 0 0 24px rgba(255, 255, 255, 0.08);
}
.style-preset-swatch strong {
  font-size: 12px;
  letter-spacing: 0;
}
.style-preset-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.style-preset-copy strong {
  color: #eee;
  font-size: 13px;
}
.style-preset-copy small {
  color: #999;
  font-size: 11px;
  line-height: 1.35;
}
.style-preset-warning {
  width: fit-content;
  border: 1px solid color-mix(in srgb, var(--preset-accent, #777) 44%, #444);
  border-radius: 4px;
  padding: 1px 6px;
  color: #ccc;
  background: rgba(255, 255, 255, 0.04);
  font-size: 10px;
  line-height: 1.45;
}
.style-preset-apply {
  padding: 0 10px;
  background: #303030;
  border-left: 1px solid #3a3a3a;
  font-size: 12px;
  white-space: nowrap;
}
.style-preset-apply:hover {
  color: #fff;
  background: color-mix(in srgb, var(--preset-accent, #555) 28%, #303030);
}
</style>
