<template>
  <Teleport to="body">
    <div v-if="visible" class="bgr-overlay" @click.self="$emit('cancel')">
      <div class="bgr-modal">
        <div class="bgr-header">
          <span>去除纯色背景</span>
          <button class="bgr-close" @click="$emit('cancel')">×</button>
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
              <div v-if="!pickedColor" class="bgr-hint">👆 点击图片上的背景色取色</div>
            </div>
          </div>
          <!-- Right: Controls -->
          <div class="bgr-controls">
            <div class="bgr-label">设置</div>
            <!-- Picked color display -->
            <div class="bgr-section">
              <div class="bgr-section-title">已选背景色</div>
              <div class="bgr-color-display">
                <div
                  class="bgr-color-swatch"
                  :style="{ background: pickedColor || '#333' }"
                ></div>
                <span class="bgr-color-hex">{{ pickedColor || '未选择' }}</span>
              </div>
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
            <!-- Spacer -->
            <div class="bgr-spacer"></div>
            <!-- Action buttons -->
            <button
              class="bgr-btn-primary"
              :disabled="!pickedColor || saving"
              @click="confirmRemoval"
            >{{ saving ? '保存中...' : '✅ 确认去背景' }}</button>
            <div class="bgr-btn-row">
              <button class="bgr-btn-secondary" @click="$emit('skip')">直接使用</button>
              <button class="bgr-btn-secondary" @click="$emit('cancel')">取消</button>
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
import { ref, watch, nextTick } from 'vue';

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
const tolerance = ref(30);
const feather = ref(1);
const pickedColor = ref(null);
const pickedRgb = ref(null);
const saving = ref(false);

let originalImageData = null;
let imgWidth = 0;
let imgHeight = 0;
let processTimer = null;

// Load image when modal opens
watch(() => props.visible, async (v) => {
  if (v && props.imageSrc) {
    pickedColor.value = null;
    pickedRgb.value = null;
    tolerance.value = 30;
    feather.value = 1;
    saving.value = false;
    await nextTick();
    loadImage();
  }
});

function loadImage() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    imgWidth = img.naturalWidth;
    imgHeight = img.naturalHeight;

    // Fit canvas to wrapper while maintaining aspect ratio
    const wrap = canvasWrapRef.value;
    const maxW = wrap.clientWidth;
    const maxH = wrap.clientHeight;
    const scale = Math.min(maxW / imgWidth, maxH / imgHeight, 1);
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    canvas.style.width = `${imgWidth * scale}px`;
    canvas.style.height = `${imgHeight * scale}px`;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    originalImageData = ctx.getImageData(0, 0, imgWidth, imgHeight);
  };
  img.src = props.imageSrc;
}

function pickColor(event) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = imgWidth / rect.width;
  const scaleY = imgHeight / rect.height;
  const x = Math.floor((event.clientX - rect.left) * scaleX);
  const y = Math.floor((event.clientY - rect.top) * scaleY);

  if (!originalImageData || x < 0 || y < 0 || x >= imgWidth || y >= imgHeight) return;

  const idx = (y * imgWidth + x) * 4;
  const r = originalImageData.data[idx];
  const g = originalImageData.data[idx + 1];
  const b = originalImageData.data[idx + 2];

  pickedRgb.value = [r, g, b];
  pickedColor.value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  processPixels();
}

function scheduleProcess() {
  if (!pickedRgb.value) return;
  clearTimeout(processTimer);
  processTimer = setTimeout(processPixels, 50);
}

function processPixels() {
  if (!originalImageData || !pickedRgb.value) return;
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const src = originalImageData.data;
  const out = new ImageData(new Uint8ClampedArray(src), imgWidth, imgHeight);
  const dst = out.data;

  const [tR, tG, tB] = pickedRgb.value;
  const maxDist = 441.67; // √(255²×3)
  const thresh = (tolerance.value / 100) * maxDist;
  const featherDist = (feather.value / 5) * maxDist;

  for (let i = 0; i < dst.length; i += 4) {
    const dR = dst[i] - tR;
    const dG = dst[i + 1] - tG;
    const dB = dst[i + 2] - tB;
    const dist = Math.sqrt(dR * dR + dG * dG + dB * dB);

    if (dist <= thresh) {
      dst[i + 3] = 0;
    } else if (featherDist > 0 && dist <= thresh + featherDist) {
      const ratio = (dist - thresh) / featherDist;
      dst[i + 3] = Math.round(ratio * dst[i + 3]);
    }
  }

  ctx.putImageData(out, 0, 0);
}

async function confirmRemoval() {
  const canvas = canvasRef.value;
  if (!canvas || saving.value) return;
  saving.value = true;

  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const result = await window.ipcRenderer.invoke('save-processed-image', {
      category: props.category,
      filename: props.filename,
      dataBase64: base64,
    });

    if (result.success) {
      emit('done');
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
