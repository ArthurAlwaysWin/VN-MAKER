<template>
  <div class="style-section">
    <div class="thumbnail-grid">
      <button
        v-for="s in STYLES"
        :key="s.id"
        class="style-thumb"
        :class="[`style-${s.id}`, { selected: currentStyle === s.id }]"
        :title="s.label"
        @click="selectStyle(s.id)"
      >
        <span class="style-preview" :class="`preview-${s.id}`"></span>
        <span class="style-label">{{ s.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScriptStore } from '../../stores/script.js';
import { useWidgetStylesEditor } from '../../composables/useWidgetStylesEditor.js';
import { WIDGET_DEFAULTS } from '../../../engine/widgetDefaults.js';

const script = useScriptStore();
const editor = useWidgetStylesEditor();

const STYLES = [
  { id: 'pill', label: '胶囊' },
  { id: 'radio', label: '单选' },
  { id: 'checkbox', label: '复选' },
  { id: 'button-pair', label: '按钮对' },
];

const currentStyle = computed(() =>
  script.getWidgetStyles()?.toggle?.style ?? WIDGET_DEFAULTS.toggle.style
);

function selectStyle(style) {
  editor.setWidgetField('toggle', 'style', style);
  editor.commitWidgetStyles();
}
</script>

<style scoped>
.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
}
.style-thumb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  background: #333;
  border: 2px solid #444;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s;
}
.style-thumb:hover {
  border-color: #555;
}
.style-thumb.selected {
  border-color: #007acc;
  background: rgba(0, 122, 204, 0.1);
}
.style-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 28px;
  position: relative;
}
.style-label {
  font-size: 11px;
  color: #aaa;
}

/* Pill toggle */
.preview-pill::before {
  content: '';
  display: block;
  width: 36px;
  height: 16px;
  background: #b4a0ff;
  border-radius: 8px;
  position: relative;
}
.preview-pill::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  right: 8px;
  top: 8px;
}

/* Radio button */
.preview-radio::before {
  content: '';
  display: block;
  width: 16px;
  height: 16px;
  border: 2px solid #b4a0ff;
  border-radius: 50%;
  position: relative;
}
.preview-radio::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  background: #b4a0ff;
  border-radius: 50%;
  top: 10px;
  left: 20px;
}

/* Checkbox */
.preview-checkbox::before {
  content: '';
  display: block;
  width: 16px;
  height: 16px;
  background: #b4a0ff;
  border: 2px solid #b4a0ff;
  border-radius: 3px;
  position: relative;
}
.preview-checkbox::after {
  content: '';
  position: absolute;
  width: 5px;
  height: 9px;
  border-right: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(45deg);
  top: 7px;
  left: 22px;
}

/* Button pair */
.preview-button-pair {
  display: flex;
  flex-direction: row;
  gap: 0;
}
.preview-button-pair::before {
  content: 'A';
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 16px;
  background: #b4a0ff;
  border-radius: 3px 0 0 3px;
  font-size: 8px;
  color: #fff;
}
.preview-button-pair::after {
  content: 'B';
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 16px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0 3px 3px 0;
  font-size: 8px;
  color: #888;
}
</style>
