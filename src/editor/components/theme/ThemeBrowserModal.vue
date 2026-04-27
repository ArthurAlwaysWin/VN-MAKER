<template>
  <Teleport to="body">
    <div class="theme-browser-overlay" @click.self="$emit('close')">
      <div class="theme-browser-modal">
        <div class="modal-header">
          <div>
            <h3>🎭 主题浏览器</h3>
            <p class="modal-subtitle">统一浏览内置主题与导入主题；完整主题覆盖现已包含标题界面，未应用主题仅提供静态预览。</p>
          </div>
          <button class="close-btn" @click="$emit('close')" title="关闭">✕</button>
        </div>

        <div class="theme-browser-toolbar">
          <div class="toolbar-main">
            <button class="toolbar-btn toolbar-import-btn" :disabled="isImporting" @click="onImportTheme">
              {{ isImporting ? '导入中...' : '📥 导入主题包' }}
            </button>
            <label class="toolbar-search">
              <span>搜索</span>
              <input
                v-model="searchQuery"
                type="search"
                placeholder="搜索名称、作者、覆盖范围"
              />
            </label>
          </div>
          <div
            v-if="importFeedback"
            class="toolbar-feedback"
            :class="`is-${importFeedback.type}`"
          >
            {{ importFeedback.message }}
          </div>
        </div>

        <div class="theme-browser-body">
          <aside class="theme-browser-filters">
            <section class="filter-group">
              <h4>来源</h4>
              <label class="filter-option">
                <input v-model="filterState.source" type="checkbox" value="builtin" />
                内置可用
              </label>
              <label class="filter-option">
                <input v-model="filterState.source" type="checkbox" value="imported" />
                已导入
              </label>
            </section>

            <section class="filter-group">
              <h4>状态</h4>
              <label class="filter-option">
                <input v-model="filterState.lifecycle" type="checkbox" value="applied" />
                当前已应用
              </label>
              <label class="filter-option">
                <input v-model="filterState.lifecycle" type="checkbox" value="available" />
                可浏览
              </label>
            </section>

            <section class="filter-group">
              <h4>模式</h4>
              <label class="filter-option">
                <input v-model="filterState.mode" type="checkbox" value="full" />
                完整主题
              </label>
              <label class="filter-option">
                <input v-model="filterState.mode" type="checkbox" value="legacy-partial" />
                兼容导入 / 部分主题
              </label>
            </section>

            <section class="filter-group">
              <h4>提示</h4>
              <p class="filter-hint">静态预览 + 覆盖说明；不提供 live preview。</p>
            </section>
          </aside>

          <section class="theme-browser-list">
            <div class="list-header">
              <span>主题列表</span>
              <span>{{ filteredItems.length }} / {{ browserItems.length }}</span>
            </div>

            <div v-if="filteredItems.length" class="theme-card-list">
              <button
                v-for="item in filteredItems"
                :key="item.id"
                class="theme-card"
                :class="{ selected: selectedId === item.id }"
                @click="selectedId = item.id"
              >
                <div class="theme-card-preview">
                  <img
                    v-if="item.preview.mode === 'asset' && item.preview.src"
                    :src="item.preview.src"
                    alt=""
                  />
                  <div
                    v-else
                    class="preview-fallback"
                    :style="{ background: item.preview.background }"
                  >
                    <strong>{{ item.preview.initials }}</strong>
                    <span>预览占位</span>
                  </div>
                  <div class="preview-caption">静态预览</div>
                </div>

                <div class="theme-card-info">
                  <div class="theme-card-topline">
                    <strong>{{ item.name }}</strong>
                    <span class="theme-card-version">{{ item.version }}</span>
                  </div>
                  <p class="theme-card-desc">{{ item.description || '统一主题浏览器中的静态摘要。' }}</p>
                  <div class="theme-card-badges">
                    <span class="badge" :class="`is-${item.source}`">{{ sourceLabelMap[item.source] }}</span>
                    <span class="badge" :class="`is-${item.mode}`">{{ modeLabelMap[item.mode] }}</span>
                    <span class="badge" :class="`is-${item.lifecycle}`">{{ lifecycleLabelMap[item.lifecycle] }}</span>
                  </div>
                  <div class="theme-card-coverage">
                    {{ item.coverageLabels.slice(0, 3).join('、') || '覆盖信息待确认' }}
                  </div>
                </div>
              </button>
            </div>

            <div v-else class="list-empty">
              当前筛选下没有主题，尝试调整来源、状态或搜索条件。
            </div>
          </section>

          <section class="theme-browser-detail">
            <template v-if="selectedItem">
              <div class="detail-preview">
                <div
                  class="detail-preview-surface"
                  :style="{ background: selectedItem.preview.background }"
                >
                  <img
                    v-if="selectedItem.preview.mode === 'asset' && selectedItem.preview.src"
                    :src="selectedItem.preview.src"
                    alt=""
                  />
                  <div v-else class="detail-preview-fallback">
                    <strong>{{ selectedItem.preview.initials }}</strong>
                    <span>预览占位</span>
                  </div>
                </div>
                <div class="detail-preview-meta">
                  <span>静态预览</span>
                  <span>无实时 iframe / live preview</span>
                </div>
              </div>

              <div class="detail-header">
                <div>
                  <h4>{{ selectedItem.name }}</h4>
                  <p>{{ selectedItem.author }} · {{ selectedItem.version }}</p>
                </div>
                <div class="detail-badges">
                  <span class="badge" :class="`is-${selectedItem.source}`">{{ sourceLabelMap[selectedItem.source] }}</span>
                  <span class="badge" :class="`is-${selectedItem.mode}`">{{ modeLabelMap[selectedItem.mode] }}</span>
                  <span class="badge" :class="`is-${selectedItem.lifecycle}`">{{ lifecycleLabelMap[selectedItem.lifecycle] }}</span>
                </div>
              </div>

              <div class="detail-section">
                <h5>覆盖范围</h5>
                <p>{{ selectedItem.coverageLabels.join('、') || '主题元数据不完整，覆盖范围待确认。' }}</p>
              </div>

              <div class="detail-section" v-if="selectedItem.missingCoverageLabels.length">
                <h5>缺失范围</h5>
                <p>{{ selectedItem.missingCoverageLabels.join('、') }}</p>
              </div>

              <div class="detail-section">
                <h5>覆盖影响</h5>
                <p>{{ selectedImpact?.text || selectedItem.applyImpact.text }}</p>
              </div>

              <div class="detail-section" v-if="selectedItem.mode === 'legacy-partial'">
                <h5>兼容说明</h5>
                <p>兼容导入 / 部分主题仅支持查看覆盖范围与缺失范围，不提供整包替换应用。</p>
              </div>

              <div class="detail-section" v-if="selectedItem.warnings.length">
                <h5>提示</h5>
                <ul>
                  <li v-for="warning in selectedItem.warnings" :key="warning">{{ warning }}</li>
                </ul>
              </div>

              <div class="detail-section" v-if="selectedItem.blockingErrors.length">
                <h5>限制</h5>
                <ul class="detail-errors">
                  <li v-for="error in selectedItem.blockingErrors" :key="error">{{ error }}</li>
                </ul>
              </div>

              <div class="detail-actions">
                <p class="detail-action-note" v-if="selectedItem.lifecycle === 'applied'">
                  当前已应用
                </p>
                <p class="detail-action-note" v-else-if="selectedItem.mode === 'legacy-partial'">
                  兼容导入 / 部分主题
                </p>
                <p class="detail-action-note" v-else-if="!selectedItem.canApply">
                  {{ selectedItem.applyDisabledReason || '当前不可应用' }}
                </p>
                <button
                  v-if="selectedItem?.lifecycle !== 'applied' && selectedItem?.canApply"
                  class="apply-btn"
                  :disabled="isApplying"
                  @click="onApplySelectedTheme"
                >
                  {{ isApplying ? '应用中...' : '应用主题' }}
                </button>
              </div>
            </template>

            <div v-else class="detail-empty">
              请选择一个主题以查看静态预览、覆盖范围与覆盖影响。
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useAssetStore } from '../../stores/assets.js';
import { useProjectStore } from '../../stores/project.js';
import { useScriptStore } from '../../stores/script.js';
import { BUILTIN_THEMES } from '../../builtinThemes.js';
import {
  buildThemeBrowserItems,
  computeThemeApplyImpact,
  filterThemeBrowserItems,
} from '../../services/themeBrowser.js';
import { preflightThemePackageImport } from '../../services/themePackageImport.js';
import { installAndApplyThemePackage } from '../../services/themePackageInstall.js';

const emit = defineEmits(['close']);

const script = useScriptStore();
const projectStore = useProjectStore();
const assetStore = useAssetStore();

const importedEntries = ref([]);
const selectedId = ref('');
const searchQuery = ref('');
const isImporting = ref(false);
const isApplying = ref(false);
const importFeedback = ref(null);
const filterState = ref({
  source: [],
  lifecycle: [],
  mode: [],
});

const sourceLabelMap = Object.freeze({
  builtin: '内置可用',
  imported: '已导入',
});

const modeLabelMap = Object.freeze({
  full: '完整主题',
  'legacy-partial': '兼容导入 / 部分主题',
});

const lifecycleLabelMap = Object.freeze({
  available: '可浏览',
  applied: '当前已应用',
});

const currentScriptData = computed(() => script?.data ?? {});

const browserItems = computed(() => buildThemeBrowserItems({
  builtins: BUILTIN_THEMES,
  importedEntries: importedEntries.value,
  scriptData: currentScriptData.value,
}));

const filteredItems = computed(() => filterThemeBrowserItems(browserItems.value, {
  ...filterState.value,
  query: searchQuery.value,
}));

const selectedItem = computed(() => {
  if (!selectedId.value) {
    return filteredItems.value[0] ?? browserItems.value[0] ?? null;
  }
  return browserItems.value.find(item => item.id === selectedId.value)
    ?? filteredItems.value[0]
    ?? browserItems.value[0]
    ?? null;
});

const selectedImpact = computed(() => {
  if (!selectedItem.value) {
    return null;
  }
  return computeThemeApplyImpact(selectedItem.value, currentScriptData.value);
});

watch(browserItems, items => {
  if (!items.length) {
    selectedId.value = '';
    return;
  }

  const stillExists = selectedId.value && items.some(item => item.id === selectedId.value);
  if (stillExists) {
    return;
  }

  const appliedItem = items.find(item => item.lifecycle === 'applied');
  selectedId.value = appliedItem?.id ?? items[0].id;
}, {
  immediate: true,
});

async function onImportTheme() {
  if (isImporting.value) {
    return;
  }

  isImporting.value = true;
  importFeedback.value = null;

  try {
    const result = await preflightThemePackageImport({
      ipcRenderer: window.ipcRenderer,
      scriptStore: script,
    });

    if (result?.canceled) {
      return;
    }

    const isImportSuccess = result?.summary?.state === 'ready'
      || result?.summary?.state === 'legacy-partial';

    if (!isImportSuccess || !result.browserEntry) {
      importFeedback.value = {
        type: 'error',
        message: result?.summary?.blockingErrors?.[0] ?? result?.summary?.title ?? '导入失败',
      };
      return;
    }

    importedEntries.value = [...importedEntries.value, result.browserEntry].filter((item, index, list) => {
      return list.findIndex(candidate => candidate.id === item.id) === index;
    });
    selectedId.value = result.browserEntry.id;
    importFeedback.value = {
      type: 'success',
      message: result.summary.state === 'legacy-partial'
        ? '已导入兼容主题，可立即查看缺失覆盖范围。'
        : '导入成功，已选中新主题。',
    };
  } catch (error) {
    console.error('[ThemeBrowserModal] Import failed:', error);
    importFeedback.value = {
      type: 'error',
      message: `导入失败：${error?.message ?? '未知错误'}`,
    };
  } finally {
    isImporting.value = false;
  }
}

async function onApplySelectedTheme() {
  if (!selectedItem.value?.canApply || isApplying.value) {
    return;
  }

  isApplying.value = true;
  importFeedback.value = null;

  try {
    await installAndApplyThemePackage({
      ipcRenderer: window.ipcRenderer,
      scriptStore: script,
      projectStore,
      assetStore,
      source: selectedItem.value.source === 'imported' ? 'file' : 'builtin',
      filePath: selectedItem.value.filePath || undefined,
      themeId: selectedItem.value.rawId || undefined,
    });
    emit('close');
  } catch (error) {
    console.error('[ThemeBrowserModal] Apply failed:', error);
    importFeedback.value = {
      type: 'error',
      message: `应用失败：${error?.message ?? '未知错误'}`,
    };
  } finally {
    isApplying.value = false;
  }
}
</script>

<style scoped>
.theme-browser-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.theme-browser-modal {
  width: min(1240px, calc(100vw - 48px));
  height: min(760px, calc(100vh - 48px));
  background: #252526;
  border: 1px solid #444;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #e0e0e0;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid #333;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
}

.modal-subtitle {
  margin: 6px 0 0;
  color: #999;
  font-size: 12px;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 18px;
  cursor: pointer;
}

.theme-browser-toolbar {
  padding: 14px 18px;
  border-bottom: 1px solid #333;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toolbar-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-btn {
  background: #333;
  border: 1px solid #444;
  color: #ddd;
  border-radius: 6px;
  padding: 8px 14px;
  cursor: pointer;
}

.toolbar-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.toolbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #aaa;
  font-size: 12px;
}

.toolbar-search input {
  min-width: 280px;
  background: #1f1f20;
  border: 1px solid #444;
  border-radius: 6px;
  color: #e0e0e0;
  padding: 8px 10px;
  font: inherit;
}

.toolbar-feedback {
  align-self: flex-start;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 12px;
}

.toolbar-feedback.is-success {
  background: rgba(14, 99, 60, 0.25);
  border: 1px solid rgba(14, 99, 60, 0.45);
  color: #b6e2c8;
}

.toolbar-feedback.is-error {
  background: rgba(162, 34, 34, 0.2);
  border: 1px solid rgba(162, 34, 34, 0.45);
  color: #ffb0b0;
}

.theme-browser-body {
  flex: 1;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 360px;
  min-height: 0;
}

.theme-browser-filters,
.theme-browser-list,
.theme-browser-detail {
  min-height: 0;
}

.theme-browser-filters {
  border-right: 1px solid #333;
  padding: 16px;
  overflow-y: auto;
  background: #202123;
}

.filter-group + .filter-group {
  margin-top: 18px;
}

.filter-group h4 {
  margin: 0 0 10px;
  font-size: 12px;
  color: #bbb;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ccc;
  font-size: 12px;
  margin-bottom: 8px;
}

.filter-hint {
  margin: 0;
  color: #888;
  font-size: 12px;
  line-height: 1.5;
}

.theme-browser-list {
  padding: 16px;
  overflow-y: auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  color: #aaa;
  font-size: 12px;
  margin-bottom: 12px;
}

.theme-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.theme-card {
  width: 100%;
  border: 1px solid #3f3f42;
  border-radius: 8px;
  background: #1f1f22;
  padding: 12px;
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 14px;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.theme-card.selected {
  border-color: rgba(180, 160, 255, 0.7);
  box-shadow: 0 0 0 1px rgba(180, 160, 255, 0.18);
}

.theme-card-preview,
.detail-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.theme-card-preview img,
.detail-preview-surface img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-fallback,
.detail-preview-fallback {
  width: 100%;
  height: 100%;
  min-height: 108px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.92);
}

.preview-fallback strong,
.detail-preview-fallback strong {
  font-size: 22px;
}

.preview-caption,
.detail-preview-meta {
  color: #909090;
  font-size: 11px;
}

.detail-preview-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.theme-card-topline {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.theme-card-version {
  color: #8d8d8d;
  font-size: 11px;
}

.theme-card-desc,
.theme-card-coverage,
.detail-header p,
.detail-section p,
.detail-action-note {
  margin: 0;
  color: #9d9d9d;
  font-size: 12px;
  line-height: 1.5;
}

.theme-card-desc {
  margin-bottom: 8px;
}

.theme-card-badges,
.detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  border: 1px solid #4a4a4f;
  background: #34343a;
  color: #ddd;
}

.badge.is-builtin,
.badge.is-available {
  border-color: rgba(0, 122, 204, 0.45);
  background: rgba(0, 122, 204, 0.12);
}

.badge.is-imported {
  border-color: rgba(180, 160, 255, 0.45);
  background: rgba(180, 160, 255, 0.12);
}

.badge.is-applied {
  border-color: rgba(14, 99, 60, 0.5);
  background: rgba(14, 99, 60, 0.16);
}

.badge.is-legacy-partial {
  border-color: rgba(197, 156, 77, 0.5);
  background: rgba(197, 156, 77, 0.15);
}

.list-empty,
.detail-empty {
  height: 100%;
  border: 1px dashed #444;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  text-align: center;
  padding: 20px;
  line-height: 1.6;
}

.theme-browser-detail {
  border-left: 1px solid #333;
  padding: 16px;
  overflow-y: auto;
  background: #202123;
}

.detail-preview-surface {
  width: 100%;
  min-height: 180px;
  border-radius: 10px;
  overflow: hidden;
}

.detail-header {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-header h4,
.detail-section h5 {
  margin: 0 0 6px;
  color: #ececec;
}

.detail-section {
  margin-top: 16px;
}

.detail-section ul {
  margin: 0;
  padding-left: 18px;
  color: #b8b8b8;
  font-size: 12px;
  line-height: 1.6;
}

.detail-errors {
  color: #ffb0b0;
}

.detail-actions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.apply-btn {
  background: rgba(180, 160, 255, 0.3);
  color: #f0f0f0;
  border: 1px solid rgba(180, 160, 255, 0.55);
  border-radius: 6px;
  padding: 10px 14px;
  cursor: pointer;
}

.apply-btn:disabled {
  opacity: 0.55;
  cursor: default;
}
</style>
