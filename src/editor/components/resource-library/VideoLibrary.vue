<script setup>
import { computed, ref } from 'vue';
import { useAssetStore } from '../../stores/assets.js';
import { useScriptStore } from '../../stores/script.js';
import InlineEdit from './InlineEdit.vue';
import AssetPickerModal from './AssetPickerModal.vue';

const assets = useAssetStore();
const script = useScriptStore();

const pickerVisible = ref(false);
const pickerTarget = ref({ videoId: null, field: 'file' });
const validationMessage = ref('');

const videoEntries = computed(() => Object.entries(script.data?.assets?.videos || {})
  .map(([id, video]) => ({ id, ...video }))
  .sort((left, right) => (left.kind || '').localeCompare(right.kind || '')
    || (left.label || left.id).localeCompare(right.label || right.id)));

const fileList = computed(() => assets.files.videos || []);

function createVideo() {
  validationMessage.value = '';
  const videoId = script.createVideoDraft();
  if (videoId && fileList.value.length > 0) {
    script.updateVideoFields(videoId, {
      label: fileList.value[0].replace(/\.[^.]+$/, ''),
      file: `videos/${fileList.value[0]}`,
      kind: 'other',
    });
  }
}

function renameVideo(oldId, newId) {
  validationMessage.value = '';
  const result = script.renameVideo(oldId, newId);
  if (!result.success) {
    validationMessage.value = result.error === 'duplicate-id'
      ? '视频 ID 已存在，请改用未占用的 ID。'
      : '视频 ID 必须以英文字母或下划线开头，并且只包含字母、数字、下划线或连字符。';
  }
}

function updateField(videoId, field, value) {
  validationMessage.value = '';
  script.updateVideoFields(videoId, {
    [field]: value || undefined,
  });
}

function updateDuration(videoId, rawValue) {
  const value = Number(rawValue);
  script.updateVideoFields(videoId, {
    durationMs: Number.isFinite(value) && value >= 0 ? value : undefined,
  });
}

function deleteVideo(videoId) {
  validationMessage.value = '';
  if (!confirm(`确定要删除视频注册项 "${videoId}" 吗？引用此 ID 的 OP/ED/视频页会被清空。`)) {
    return;
  }
  script.deleteVideo(videoId);
}

function openPicker(videoId, field) {
  pickerTarget.value = { videoId, field };
  pickerVisible.value = true;
}

function onPickerSelect(path) {
  pickerVisible.value = false;
  const { videoId, field } = pickerTarget.value;
  if (!videoId || !field || !path) return;
  updateField(videoId, field, path);
}
</script>

<template>
  <div class="video-library">
    <section class="video-registry">
      <header class="video-header">
        <div>
          <h3>视频注册表</h3>
          <p>写入 canonical <code>assets.videos</code>，供 OP、ED 和剧情视频页引用。</p>
        </div>
        <button type="button" class="add-video-btn" @click="createVideo">+ 注册视频</button>
      </header>

      <p v-if="validationMessage" class="validation-error">{{ validationMessage }}</p>

      <div v-if="videoEntries.length === 0" class="empty-state">
        <div class="empty-icon">🎬</div>
        <p class="empty-title">尚未注册视频</p>
        <p class="empty-subtitle">先导入 .mp4/.webm，再将文件登记到 assets.videos。</p>
      </div>

      <div v-else class="video-table">
        <article v-for="video in videoEntries" :key="video.id" class="video-row">
          <div class="video-id-cell">
            <span class="cell-label">ID</span>
            <InlineEdit :value="video.id" :preserveExtension="false" @save="renameVideo(video.id, $event)" />
          </div>

          <label>
            <span class="cell-label">标签</span>
            <input :value="video.label || ''" type="text" @input="updateField(video.id, 'label', $event.target.value)">
          </label>

          <label>
            <span class="cell-label">类型</span>
            <select :value="video.kind || 'other'" @change="updateField(video.id, 'kind', $event.target.value)">
              <option value="op">op</option>
              <option value="ed">ed</option>
              <option value="story">story</option>
              <option value="other">other</option>
            </select>
          </label>

          <label class="wide-field">
            <span class="cell-label">文件</span>
            <div class="path-picker">
              <input :value="video.file || ''" type="text" placeholder="videos/op_main.mp4" @input="updateField(video.id, 'file', $event.target.value)">
              <button type="button" @click="openPicker(video.id, 'file')">选择</button>
            </div>
          </label>

          <label class="wide-field">
            <span class="cell-label">封面</span>
            <div class="path-picker">
              <input :value="video.poster || ''" type="text" placeholder="videos/op_main.poster.png" @input="updateField(video.id, 'poster', $event.target.value)">
              <button type="button" @click="openPicker(video.id, 'poster')">选择</button>
            </div>
          </label>

          <label>
            <span class="cell-label">时长(ms)</span>
            <input :value="video.durationMs ?? ''" type="number" min="0" @input="updateDuration(video.id, $event.target.value)">
          </label>

          <button type="button" class="delete-btn" @click="deleteVideo(video.id)">删除</button>
        </article>
      </div>
    </section>

    <section class="video-files">
      <header class="video-header compact">
        <div>
          <h3>videos/ 文件</h3>
          <p>当前项目视频素材目录中的文件。</p>
        </div>
      </header>

      <div v-if="fileList.length === 0" class="empty-state compact">
        <p class="empty-title">暂无视频文件</p>
        <p class="empty-subtitle">使用右上角“导入文件”添加 .mp4 或 .webm。</p>
      </div>
      <div v-else class="file-list">
        <div v-for="file in fileList" :key="file" class="file-row">
          <span>🎞</span>
          <span>{{ file }}</span>
        </div>
      </div>
    </section>

    <AssetPickerModal
      category="videos"
      :visible="pickerVisible"
      @select="onPickerSelect"
      @close="pickerVisible = false"
    />
  </div>
</template>

<style scoped>
.video-library {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 18px;
  min-height: 0;
  overflow: hidden;
}

.video-registry,
.video-files {
  min-height: 0;
  overflow-y: auto;
}

.video-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.video-header.compact {
  display: block;
}

.video-header h3 {
  margin: 0 0 4px;
  color: #e8e8e8;
  font-size: 15px;
}

.video-header p {
  margin: 0;
  color: #888;
  font-size: 12px;
}

.add-video-btn,
.delete-btn,
.path-picker button {
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  background: #2a2a2a;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  padding: 6px 10px;
}

.add-video-btn:hover,
.path-picker button:hover {
  border-color: #007acc;
  color: #fff;
}

.delete-btn:hover {
  border-color: #8a3a3a;
  color: #ffb4b4;
}

.validation-error {
  color: #ff8d8d;
  font-size: 12px;
}

.video-table {
  display: grid;
  gap: 10px;
}

.video-row {
  display: grid;
  grid-template-columns: 150px minmax(140px, 1fr) 92px minmax(210px, 1.2fr) minmax(210px, 1.2fr) 96px auto;
  gap: 10px;
  align-items: end;
  padding: 12px;
  background: #252526;
  border: 1px solid #333;
  border-radius: 6px;
}

.video-row label,
.video-id-cell {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.cell-label {
  color: #888;
  font-size: 11px;
}

.video-row input,
.video-row select {
  width: 100%;
  box-sizing: border-box;
  background: #1e1e1e;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  color: #ddd;
  font-size: 12px;
  padding: 6px 8px;
}

.path-picker {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
}

.empty-state {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 220px;
  color: #777;
  text-align: center;
}

.empty-state.compact {
  min-height: 120px;
}

.empty-icon {
  font-size: 42px;
}

.empty-title,
.empty-subtitle {
  margin: 0;
}

.empty-subtitle {
  color: #666;
  font-size: 12px;
}

.file-list {
  display: grid;
  gap: 8px;
}

.file-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  background: #252526;
  border: 1px solid #333;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  min-width: 0;
}

.file-row span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .video-library {
    grid-template-columns: 1fr;
  }

  .video-row {
    grid-template-columns: 1fr 1fr;
  }

  .wide-field {
    grid-column: 1 / -1;
  }
}
</style>
