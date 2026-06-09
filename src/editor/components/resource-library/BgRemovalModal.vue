<template>
  <Teleport to="body">
    <div v-if="visible" class="bgr-overlay" @click.self="$emit('cancel')">
      <div class="bgr-modal">
        <div class="bgr-header">
          <span>去除纯色背景 <HelpTip :text="HELP_RESOURCE.bgRemoval" /></span>
          <button class="bgr-close" @click="$emit('cancel')" title="关闭">×</button>
        </div>
        <div class="bgr-body">
          <!-- Left: Preview -->
          <div class="bgr-preview">
            <div class="bgr-label">预览</div>
            <div class="bgr-canvas-wrap" ref="canvasWrapRef">
              <canvas
                ref="canvasRef"
                class="bgr-canvas"
                @click="pickColor"
              />
              <div v-if="loading" class="bgr-state">加载图片中...</div>
              <div v-else-if="loadError" class="bgr-state bgr-state-error">{{ loadError }}</div>
              <div v-else-if="sampleColors.length === 0" class="bgr-hint">点击背景色取样，可多次点击添加阴影或渐变色</div>
              <div v-else class="bgr-hint">继续点击可添加更多背景取样</div>
            </div>
          </div>
          <!-- Right: Controls -->
          <div class="bgr-controls">
            <div class="bgr-label">设置</div>
            <div class="bgr-section">
              <div class="bgr-slider-header">
                <span class="bgr-section-title">背景取样</span>
                <span class="bgr-slider-value">{{ sampleColors.length }}</span>
              </div>
              <div class="bgr-color-display">
                <div
                  class="bgr-color-swatch"
                  :style="sampleSwatchStyle"
                ></div>
                <span class="bgr-color-hex">{{ sampleLabel }}</span>
              </div>
              <div v-if="sampleColors.length" class="bgr-sample-list">
                <span
                  v-for="sample in sampleColors"
                  :key="sample.id"
                  class="bgr-sample-chip"
                  :style="{ background: sample.hex }"
                  :title="sample.hex"
                ></span>
              </div>
              <button
                v-if="sampleColors.length"
                class="bgr-mini-btn"
                @click="clearSamples"
                title="清除所有取样颜色"
              >清除取样</button>
            </div>
            <!-- Tolerance slider -->
            <div class="bgr-section">
              <div class="bgr-slider-header">
                <span class="bgr-section-title">容差</span>
                <span class="bgr-slider-value">{{ tolerance }}</span>
              </div>
              <input
                type="range" min="0" max="100" v-model.number="tolerance"
                class="bgr-slider" @input="scheduleProcess"
              />
              <div class="bgr-slider-labels">
                <span>精确</span><span>宽松</span>
              </div>
            </div>
            <!-- Feather slider -->
            <div class="bgr-section">
              <div class="bgr-slider-header">
                <span class="bgr-section-title">边缘柔化</span>
                <span class="bgr-slider-value">{{ feather }}px</span>
              </div>
              <input
                type="range" min="0" max="5" step="0.5" v-model.number="feather"
                class="bgr-slider" @input="scheduleProcess"
              />
            </div>
            <label class="bgr-check-row">
              <input type="checkbox" v-model="edgeConnectedOnly" @change="scheduleProcess" />
              <span>仅删除边缘连通背景</span>
            </label>
            <label class="bgr-check-row" :class="{ disabled: !edgeConnectedOnly }">
              <input
                type="checkbox"
                v-model="removeEnclosedRegions"
                :disabled="!edgeConnectedOnly"
                @change="scheduleProcess"
              />
              <span>同时删除封闭背景区域</span>
            </label>
            <!-- Spacer -->
            <div class="bgr-spacer"></div>
            <!-- Action buttons -->
            <button
              class="bgr-btn-primary"
              :disabled="!imageReady || sampleColors.length === 0 || saving"
              @click="confirmRemoval"
              title="保存去背景后的透明 PNG"
            >{{ saving ? '保存中...' : '✅ 确认去背景' }}</button>
            <div class="bgr-btn-row">
              <button class="bgr-btn-secondary" @click="$emit('skip')" title="跳过去背景，直接使用原图">直接使用</button>
              <button class="bgr-btn-secondary" @click="$emit('cancel')" title="取消操作">取消</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * BgRemovalModal — Pure-Canvas solid-color background removal tool.
 * User clicks to pick background color, adjusts tolerance/feather, confirms to export transparent PNG.
 */
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue';
import HelpTip from '../HelpTip.vue';
import { HELP_RESOURCE } from '../../helpTexts.js';
import {
  removeSolidBackground,
  sampleBackgroundColor,
} from '../../utils/bgRemoval.js';

const props = defineProps({
  visible: Boolean,
  /** asset:// URL or full path of the image to process */
  imageSrc: String,
  /** Asset category (always 'characters') */
  category: { type: String, default: 'characters' },
  /** Filename in assets/characters/ */
  filename: String,
});

const emit = defineEmits(['done', 'skip', 'cancel']);

const canvasRef = ref(null);
const canvasWrapRef = ref(null);
const tolerance = ref(22);
const feather = ref(1);
const sampleColors = ref([]);
const edgeConnectedOnly = ref(true);
const removeEnclosedRegions = ref(true);
const saving = ref(false);
const loading = ref(false);
const loadError = ref('');
const imageReady = ref(false);
const sampleLabel = computed(() => {
  if (sampleColors.value.length === 0) return '未选择';
  if (sampleColors.value.length === 1) return sampleColors.value[0].hex;
  return `${sampleColors.value.length} 个颜色`;
});
const sampleSwatchStyle = computed(() => {
  if (sampleColors.value.length === 0) {
    return { background: '#333' };
  }
  if (sampleColors.value.length === 1) {
    return { background: sampleColors.value[0].hex };
  }
  const stops = sampleColors.value
    .map((sample, index) => {
      const position = sampleColors.value.length === 1
        ? 0
        : Math.round((index / (sampleColors.value.length - 1)) * 100);
      return `${sample.hex} ${position}%`;
    })
    .join(', ');
  return { background: `linear-gradient(90deg, ${stops})` };
});

let originalImageData = null;
let imgWidth = 0;
let imgHeight = 0;
let processTimer = null;
let loadToken = 0;

// Load image when modal opens or switches target; clean up on close.
watch(() => [props.visible, props.imageSrc], async ([visible, imageSrc]) => {
  if (visible && imageSrc) {
    sampleColors.value = [];
    tolerance.value = 22;
    feather.value = 1;
    edgeConnectedOnly.value = true;
    removeEnclosedRegions.value = true;
    saving.value = false;
    loading.value = false;
    loadError.value = '';
    imageReady.value = false;
    clearCanvas();
    await nextTick();
    loadImage();
  } else {
    loadToken += 1;
    clearTimeout(processTimer);
    processTimer = null;
    originalImageData = null;
    loading.value = false;
    loadError.value = '';
    imageReady.value = false;
    clearCanvas();
  }
});

onBeforeUnmount(() => {
  loadToken += 1;
  clearTimeout(processTimer);
  originalImageData = null;
});

function loadImage() {
  const src = props.imageSrc;
  if (!src) return;

  const token = ++loadToken;
  loading.value = true;
  loadError.value = '';
  imageReady.value = false;
  originalImageData = null;

  const img = new Image();
  if (/^(https?:|asset:)\/\//i.test(src)) {
    img.crossOrigin = 'anonymous';
  }
  img.onload = () => {
    if (token !== loadToken) return;
    const canvas = canvasRef.value;
    if (!canvas) {
      loading.value = false;
      return;
    }

    imgWidth = img.naturalWidth;
    imgHeight = img.naturalHeight;
    if (!imgWidth || !imgHeight) {
      loading.value = false;
      loadError.value = '图片尺寸异常，无法预览。';
      return;
    }

    // Fit canvas to wrapper while maintaining aspect ratio
    const wrap = canvasWrapRef.value;
    const maxW = wrap?.clientWidth || imgWidth;
    const maxH = wrap?.clientHeight || imgHeight;
    const scale = Math.min(maxW / imgWidth, maxH / imgHeight, 1) || 1;
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    canvas.style.width = `${imgWidth * scale}px`;
    canvas.style.height = `${imgHeight * scale}px`;

    try {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, imgWidth, imgHeight);
      ctx.drawImage(img, 0, 0);
      originalImageData = ctx.getImageData(0, 0, imgWidth, imgHeight);
      imageReady.value = true;
      loading.value = false;
    } catch (e) {
      loading.value = false;
      loadError.value = '无法读取图片像素，请确认图片来自当前项目资源。';
      console.error('Failed to prepare image for background removal:', e);
    }
  };
  img.onerror = () => {
    if (token !== loadToken) return;
    loading.value = false;
    loadError.value = '图片加载失败，请确认文件仍在项目 assets/characters 中。';
    console.error('Failed to load image for background removal:', src);
  };
  img.src = src;
}

function clearCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
  canvas.style.width = '';
  canvas.style.height = '';
}

function pickColor(event) {
  if (!imageReady.value) return;
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = imgWidth / rect.width;
  const scaleY = imgHeight / rect.height;
  const x = Math.floor((event.clientX - rect.left) * scaleX);
  const y = Math.floor((event.clientY - rect.top) * scaleY);

  if (!originalImageData || x < 0 || y < 0 || x >= imgWidth || y >= imgHeight) return;

  const sample = sampleBackgroundColor(originalImageData, x, y, { radius: 2 });
  if (!sample) return;

  const duplicate = sampleColors.value.some((existing) => (
    Math.abs(existing.rgb[0] - sample.rgb[0])
    + Math.abs(existing.rgb[1] - sample.rgb[1])
    + Math.abs(existing.rgb[2] - sample.rgb[2])
  ) <= 6);
  if (!duplicate) {
    sampleColors.value.push({
      id: `${sample.hex}:${sampleColors.value.length}`,
      rgb: sample.rgb,
      hex: sample.hex,
    });
  }
  processPixels();
}

function scheduleProcess() {
  if (sampleColors.value.length === 0) return;
  clearTimeout(processTimer);
  processTimer = setTimeout(processPixels, 50);
}

function processPixels() {
  if (!originalImageData || sampleColors.value.length === 0) return;
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const out = removeSolidBackground(originalImageData, sampleColors.value.map((sample) => sample.rgb), {
    tolerance: tolerance.value,
    feather: feather.value,
    edgeConnectedOnly: edgeConnectedOnly.value,
    removeEnclosedRegions: edgeConnectedOnly.value && removeEnclosedRegions.value,
  });
  if (!out) return;

  ctx.putImageData(out, 0, 0);
}

function clearSamples() {
  sampleColors.value = [];
  const canvas = canvasRef.value;
  if (!canvas || !originalImageData) return;
  canvas.getContext('2d')?.putImageData(originalImageData, 0, 0);
}

async function confirmRemoval() {
  if (!imageReady.value) return;
  const canvas = canvasRef.value;
  if (!canvas || saving.value) return;
  saving.value = true;

  try {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
        'image/png'
      );
    });
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Save as .png with _nobg suffix — original file preserved
    const baseName = props.filename.replace(/\.[^.]+$/, '');
    const newFilename = `${baseName}_nobg.png`;

    const result = await window.ipcRenderer.invoke('save-processed-image', {
      category: props.category,
      filename: newFilename,
      dataBase64: base64,
    });

    if (result.success) {
      emit('done', { newFilename, oldFilename: props.filename });
    } else {
      alert(`保存失败: ${result.error}`);
    }
  } catch (e) {
    alert(`处理失败: ${e.message}`);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.bgr-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.bgr-modal {
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 10px;
  width: 720px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.bgr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  font-size: 15px;
  font-weight: 600;
  color: #eee;
}
.bgr-close {
  background: none;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}
.bgr-close:hover { color: #fff; }
.bgr-body {
  display: flex;
  gap: 16px;
  padding: 16px;
  flex: 1;
  min-height: 0;
}
.bgr-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.bgr-label {
  font-size: 11px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.bgr-canvas-wrap {
  flex: 1;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  min-height: 300px;
  background:
    repeating-conic-gradient(#333 0% 25%, #3a3a3a 0% 50%) 0 0 / 16px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bgr-canvas {
  cursor: crosshair;
  display: block;
  max-width: 100%;
  max-height: 100%;
}
.bgr-state {
  position: absolute;
  left: 24px;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  color: #bbb;
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  pointer-events: none;
}
.bgr-state-error {
  color: #f08a8a;
}
.bgr-hint {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #ccc;
  padding: 4px 14px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
}
.bgr-controls {
  width: 195px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}
.bgr-section {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 10px;
}
.bgr-section-title {
  font-size: 12px;
  color: #aaa;
}
.bgr-color-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.bgr-color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 2px solid #555;
}
.bgr-color-hex {
  color: #ccc;
  font-family: monospace;
  font-size: 12px;
}
.bgr-sample-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.bgr-sample-chip {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid #555;
}
.bgr-mini-btn {
  margin-top: 8px;
  width: 100%;
  padding: 5px 8px;
  border: 1px solid #444;
  border-radius: 5px;
  background: #242424;
  color: #aaa;
  cursor: pointer;
  font-size: 11px;
}
.bgr-mini-btn:hover {
  border-color: #666;
  color: #ddd;
}
.bgr-slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.bgr-slider-value {
  font-size: 13px;
  color: #4af;
  font-family: monospace;
}
.bgr-slider {
  width: 100%;
  accent-color: #4af;
}
.bgr-slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #666;
  margin-top: 2px;
}
.bgr-check-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #2a2a2a;
  color: #aaa;
  font-size: 12px;
}
.bgr-check-row input {
  accent-color: #4af;
}
.bgr-check-row.disabled {
  opacity: 0.55;
}
.bgr-spacer { flex: 1; }
.bgr-btn-primary {
  padding: 10px;
  background: #4af;
  color: #000;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 13px;
  cursor: pointer;
}
.bgr-btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.bgr-btn-row {
  display: flex;
  gap: 6px;
}
.bgr-btn-secondary {
  flex: 1;
  padding: 7px;
  background: transparent;
  color: #888;
  border: 1px solid #444;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
}
.bgr-btn-secondary:hover {
  border-color: #666;
  color: #bbb;
}
</style>
