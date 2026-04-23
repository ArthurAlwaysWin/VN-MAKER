<template>
  <div class="btn-family-settings" v-if="theme">
    <h3 class="section-title">按钮族图片</h3>

    <div
      v-for="family in families"
      :key="family.key"
      class="family-card"
    >
      <div class="family-header">{{ family.label }}</div>

      <div
        v-for="state in family.states"
        :key="state"
        class="state-row"
      >
        <span class="state-label">{{ stateLabels[state] }}</span>
        <input
          class="image-path"
          :value="getUiImageDisplayValue(getFamilyState(family.key, state))"
          readonly
          placeholder="未选择"
        />
        <button
          type="button"
          class="picker-btn"
          @click="onPick(family.key, state)"
        >选择图片</button>
        <button
          v-if="getFamilyState(family.key, state)"
          type="button"
          class="reset-btn"
          @click="onClear(family.key, state)"
          title="清空图片"
        >&#x2715;</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useScriptStore } from '../../stores/script.js';
import { useThemeEditor } from '../../composables/useThemeEditor.js';
import {
  pickUiImage,
  clearUiImage,
  getUiImageDisplayValue,
} from '../../utils/uiImageField.js';

const script = useScriptStore();
const themeEditor = useThemeEditor();

const emit = defineEmits(['preview']);

const THREE_STATES = ['normal', 'hover', 'pressed'];
const FOUR_STATES = ['normal', 'hover', 'pressed', 'selected'];

const families = [
  { key: 'gameMenuButton', label: '游戏菜单按钮', states: THREE_STATES },
  { key: 'qab', label: '快捷按钮栏', states: THREE_STATES },
  { key: 'closeButton', label: '关闭按钮', states: THREE_STATES },
  { key: 'pageTabPager', label: '页签分页器', states: FOUR_STATES },
  { key: 'settingsTab', label: '设置标签', states: FOUR_STATES },
];

const stateLabels = {
  normal: '常态',
  hover: '悬停',
  pressed: '按下',
  selected: '选中',
};

const theme = computed(() => script.getTheme());

function ensureButtonFamilies() {
  const t = theme.value;
  if (!t) return null;
  t.buttonFamilies ??= {};
  return t.buttonFamilies;
}

function ensureFamily(familyKey) {
  const bf = ensureButtonFamilies();
  if (!bf) return null;
  bf[familyKey] ??= {};
  return bf[familyKey];
}

function getFamilyState(familyKey, stateKey) {
  return theme.value?.buttonFamilies?.[familyKey]?.[stateKey] ?? null;
}

function commitButtonFamilies() {
  themeEditor.commitTheme();
}

async function onPick(familyKey, stateKey) {
  const family = ensureFamily(familyKey);
  if (!family) return;

  await pickUiImage({
    setValue: (value) => {
      family[stateKey] = value;
    },
    preview: () => {
      themeEditor.sendThemeToPreview();
      emit('preview', familyKey);
    },
    commit: () => commitButtonFamilies(),
  });
}

function onClear(familyKey, stateKey) {
  const family = ensureFamily(familyKey);
  if (!family) return;

  clearUiImage({
    setValue: (value) => {
      family[stateKey] = value;
    },
    preview: () => {
      themeEditor.sendThemeToPreview();
      emit('preview', familyKey);
    },
    commit: () => commitButtonFamilies(),
  });
}
</script>

<style scoped>
.btn-family-settings {
  margin-top: 16px;
}

.section-title {
  font-size: 13px;
  color: #ccc;
  font-weight: 600;
  margin: 0 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #333;
}

.family-card {
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.02);
}

.family-header {
  font-size: 12px;
  color: #aaa;
  font-weight: 600;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.state-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.state-label {
  font-size: 12px;
  color: #888;
  min-width: 36px;
}

.image-path {
  flex: 1;
  min-width: 0;
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 6px;
  color: #cfcfcf;
  padding: 5px 8px;
  font-size: 12px;
}

.picker-btn {
  background: #333;
  border: 1px solid #555;
  color: #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  padding: 5px 8px;
  white-space: nowrap;
}
.picker-btn:hover {
  border-color: #007acc;
  color: #9fd7ff;
}

.reset-btn {
  background: none;
  border: 1px solid #555;
  color: #aaa;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  padding: 2px 6px;
  line-height: 1;
}
.reset-btn:hover {
  border-color: #a22;
  color: #e88;
}
</style>
