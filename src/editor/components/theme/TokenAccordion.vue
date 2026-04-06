<template>
  <div class="token-accordion">
    <TokenGroup
      v-for="group in TOKEN_GROUPS"
      :key="group.id"
      :label="group.label"
    >
      <template v-for="key in group.keys" :key="key">
        <ColorTokenRow
          v-if="getTokenType(key) === 'color-alpha'"
          :token-key="key"
          :has-alpha="true"
          :show-contrast="needsContrast(key)"
        />
        <ColorTokenRow
          v-else-if="getTokenType(key) === 'color'"
          :token-key="key"
          :has-alpha="false"
          :show-contrast="needsContrast(key)"
        />
        <FontTokenRow
          v-else-if="getTokenType(key) === 'font'"
          :token-key="key"
        />
        <SliderTokenRow
          v-else-if="getTokenType(key) === 'slider'"
          :token-key="key"
        />
        <GradientTokenRow
          v-else-if="getTokenType(key) === 'gradient'"
          :token-key="key"
        />
      </template>
    </TokenGroup>
  </div>
</template>

<script setup>
import { DEFAULT_TOKENS } from '../../../engine/tokens.js';
import TokenGroup from './TokenGroup.vue';
import ColorTokenRow from './ColorTokenRow.vue';
import FontTokenRow from './FontTokenRow.vue';
import SliderTokenRow from './SliderTokenRow.vue';
import GradientTokenRow from './GradientTokenRow.vue';

// ─── 10 Token Groups (D-14) ─────────────────────────
const TOKEN_GROUPS = [
  { id: 'core', label: '🎨 核心色', keys: ['primary', 'primary-subtle', 'danger', 'danger-hover', 'accent', 'accent-border', 'shadow', 'title-glow', 'save-title', 'load-title'] },
  { id: 'text', label: '📝 文字', keys: ['text', 'text-heading', 'text-secondary', 'text-muted', 'text-dim', 'text-faint'] },
  { id: 'borders', label: '📏 边框', keys: ['border', 'border-hover', 'border-active'] },
  { id: 'backgrounds', label: '🖼️ 背景', keys: ['dialogue-bg', 'panel-bg', 'menu-bg', 'card-bg', 'card-bg-hover', 'title-bg', 'confirm-bg'] },
  { id: 'buttons', label: '🔘 按钮', keys: ['btn-bg', 'btn-text', 'btn-border', 'btn-hover-bg', 'btn-hover-text', 'btn-hover-border'] },
  { id: 'fonts', label: '🔤 字体', keys: ['font-body', 'font-display'] },
  { id: 'radii', label: '⭕ 圆角', keys: ['radius', 'radius-lg'] },
  { id: 'blur', label: '🌫️ 模糊', keys: ['blur'] },
  { id: 'controls', label: '🎛️ 控件', keys: ['slider-track', 'slider-thumb', 'scrollbar'] },
  { id: 'speaker', label: '💬 说话人', keys: ['speaker-shadow'] },
];

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
</style>
