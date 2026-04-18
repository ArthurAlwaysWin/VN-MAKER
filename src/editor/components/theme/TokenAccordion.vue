<template>
  <div class="token-accordion">
    <div v-if="hasOverrides" class="overrides-bar">
      <span class="overrides-count">{{ Object.keys(editor.getTokenOverrides()).length }} 个覆盖</span>
      <button class="clear-overrides-btn" @click="onClearOverrides" title="清除所有覆盖，恢复派生值">清除所有覆盖</button>
    </div>
    <TokenGroup
      v-for="group in TOKEN_GROUPS"
      :key="group.id"
      :label="group.label"
      :help-text="group.helpText || ''"
    >
      <template v-for="key in group.keys" :key="key">
        <ColorTokenRow
          v-if="getTokenType(key) === 'color-alpha'"
          :token-key="key"
          :label="TOKEN_LABELS[key] || key"
          :has-alpha="true"
          :show-contrast="needsContrast(key)"
        />
        <ColorTokenRow
          v-else-if="getTokenType(key) === 'color'"
          :token-key="key"
          :label="TOKEN_LABELS[key] || key"
          :has-alpha="false"
          :show-contrast="needsContrast(key)"
        />
        <FontTokenRow
          v-else-if="getTokenType(key) === 'font'"
          :token-key="key"
          :label="TOKEN_LABELS[key] || key"
        />
        <SliderTokenRow
          v-else-if="getTokenType(key) === 'slider'"
          :token-key="key"
          :label="TOKEN_LABELS[key] || key"
        />
        <GradientTokenRow
          v-else-if="getTokenType(key) === 'gradient'"
          :token-key="key"
          :label="TOKEN_LABELS[key] || key"
        />
      </template>
    </TokenGroup>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { DEFAULT_TOKENS } from '../../../engine/tokens.js';
import { HELP_THEME } from '../../helpTexts.js';
import { useThemeEditor } from '../../composables/useThemeEditor.js';
import TokenGroup from './TokenGroup.vue';
import ColorTokenRow from './ColorTokenRow.vue';
import FontTokenRow from './FontTokenRow.vue';
import SliderTokenRow from './SliderTokenRow.vue';
import GradientTokenRow from './GradientTokenRow.vue';

const editor = useThemeEditor();

// ─── Override Management (D-22) ──────────────────────
const hasOverrides = computed(() => {
  return Object.keys(editor.getTokenOverrides()).length > 0;
});

function onClearOverrides() {
  editor.clearTokenOverrides();
  editor.commitTheme();
}

// ─── 10 Token Groups (D-14) ─────────────────────────
const TOKEN_GROUPS = [
  { id: 'core', label: '🎨 核心色', helpText: HELP_THEME.groupCore, keys: ['primary', 'primary-subtle', 'danger', 'danger-hover', 'accent', 'accent-border', 'shadow', 'title-glow', 'save-title', 'load-title'] },
  { id: 'text', label: '📝 文字', keys: ['text', 'text-heading', 'text-secondary', 'text-muted', 'text-dim', 'text-faint'] },
  { id: 'borders', label: '📏 边框', keys: ['border', 'border-hover', 'border-active'] },
  { id: 'backgrounds', label: '🖼️ 背景', helpText: HELP_THEME.groupBackgrounds, keys: ['dialogue-bg', 'panel-bg', 'menu-bg', 'card-bg', 'card-bg-hover', 'title-bg', 'confirm-bg'] },
  { id: 'buttons', label: '🔘 按钮', helpText: HELP_THEME.groupButtons, keys: ['btn-bg', 'btn-text', 'btn-border', 'btn-hover-bg', 'btn-hover-text', 'btn-hover-border'] },
  { id: 'fonts', label: '🔤 字体', keys: ['font-body', 'font-display'] },
  { id: 'radii', label: '⭕ 圆角', keys: ['radius', 'radius-lg'] },
  { id: 'blur', label: '🌫️ 模糊', helpText: HELP_THEME.groupBlur, keys: ['blur'] },
  { id: 'controls', label: '🎛️ 控件', helpText: HELP_THEME.groupControls, keys: ['slider-track', 'slider-thumb', 'scrollbar'] },
  { id: 'speaker', label: '💬 说话人', helpText: HELP_THEME.groupSpeaker, keys: ['speaker-shadow'] },
];

// ─── Token Labels 中文映射 (D-01: 简洁派 2-4 字) ────
const TOKEN_LABELS = {
  // 🎨 核心色
  'primary': '主色',
  'primary-subtle': '淡主色',
  'danger': '危险色',
  'danger-hover': '悬停色',
  'accent': '强调色',
  'accent-border': '边框色',
  'shadow': '阴影',
  'title-glow': '标题光晕',
  'save-title': '存档标题',
  'load-title': '读档标题',
  // 📝 文字
  'text': '正文',
  'text-heading': '标题',
  'text-secondary': '次要',
  'text-muted': '弱化',
  'text-dim': '暗淡',
  'text-faint': '极淡',
  // 📏 边框
  'border': '边框',
  'border-hover': '悬停',
  'border-active': '激活',
  // 🖼️ 背景
  'dialogue-bg': '对话框',
  'panel-bg': '面板',
  'menu-bg': '菜单',
  'card-bg': '卡片',
  'card-bg-hover': '悬停卡片',
  'title-bg': '标题背景',
  'confirm-bg': '确认框',
  // 🔘 按钮
  'btn-bg': '底色',
  'btn-text': '文字',
  'btn-border': '边框',
  'btn-hover-bg': '悬停色',
  'btn-hover-text': '悬停文字',
  'btn-hover-border': '悬停边框',
  // 🔤 字体
  'font-body': '正文',
  'font-display': '标题',
  // ⭕ 圆角
  'radius': '小',
  'radius-lg': '大',
  // 🌫️ 模糊
  'blur': '模糊',
  // 🎛️ 控件
  'slider-track': '滑轨',
  'slider-thumb': '滑块',
  'scrollbar': '滚动条',
  // 💬 说话人
  'speaker-shadow': '阴影',
};

// ─── Token Type Detection (D-05) ────────────────────
function getTokenType(key) {
  if (key.startsWith('font-')) return 'font';
  if (key === 'radius' || key === 'radius-lg' || key === 'blur') return 'slider';
  const def = DEFAULT_TOKENS[key];
  if (def && def.startsWith('linear-gradient')) return 'gradient';
  if (def && def.startsWith('rgba')) return 'color-alpha';
  return 'color';
}

// ─── WCAG Contrast Badge (D-18) ─────────────────────
const TEXT_KEYS = new Set(['text', 'text-heading', 'text-secondary', 'text-muted', 'text-dim', 'text-faint']);
function needsContrast(key) { return TEXT_KEYS.has(key); }
</script>

<style scoped>
.token-accordion {
  display: flex;
  flex-direction: column;
}
.overrides-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(180, 160, 255, 0.08);
  border-bottom: 1px solid #333;
}
.overrides-count {
  font-size: 11px;
  color: #b4a0ff;
}
.clear-overrides-btn {
  background: #333;
  color: #ccc;
  border: 1px solid #555;
  padding: 2px 10px;
  border-radius: 3px;
  font-size: 11px;
  cursor: pointer;
}
.clear-overrides-btn:hover {
  background: #444;
  color: #e0e0e0;
}
</style>
