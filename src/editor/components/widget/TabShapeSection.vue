<template>
  <div class="shape-section">
    <div class="thumbnail-grid">
      <button
        v-for="s in SHAPES"
        :key="s.id"
        class="shape-thumb"
        :class="[`shape-${s.id}`, { selected: currentShape === s.id }]"
        :title="s.label"
        @click="selectShape(s.id)"
      >
        <span class="shape-preview" :class="`preview-${s.id}`"></span>
        <span class="shape-label">{{ s.label }}</span>
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

const SHAPES = [
  { id: 'rectangle', label: '矩形' },
  { id: 'pill', label: '药丸' },
  { id: 'underline', label: '下划线' },
  { id: 'trapezoid', label: '梯形' },
  { id: 'ribbon', label: '丝带' },
];

const currentShape = computed(() =>
  script.getWidgetStyles()?.tab?.shape ?? WIDGET_DEFAULTS.tab.shape
);

function selectShape(shape) {
  editor.setWidgetField('tab', 'shape', shape);
  editor.commitWidgetStyles();
}
</script>

<style scoped>
.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 8px;
}
.shape-thumb {
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
.shape-thumb:hover {
  border-color: #555;
}
.shape-thumb.selected {
  border-color: #007acc;
  background: rgba(0, 122, 204, 0.1);
}
.shape-preview {
  display: block;
  width: 48px;
  height: 28px;
}
.shape-label {
  font-size: 11px;
  color: #aaa;
}

/* CSS shape thumbnails */
.preview-rectangle {
  background: #b4a0ff;
  border-radius: 3px;
}
.preview-pill {
  background: #b4a0ff;
  border-radius: 14px;
}
.preview-underline {
  background: transparent;
  border-bottom: 3px solid #b4a0ff;
}
.preview-trapezoid {
  background: #b4a0ff;
  clip-path: polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%);
}
.preview-ribbon {
  background: #b4a0ff;
  clip-path: polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%);
}
</style>
