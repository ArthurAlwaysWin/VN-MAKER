<template>
  <div class="inspector-card" v-if="cgId && cgEntry">
    <div class="inspector-header">
      <div>
        <p class="eyebrow">CG 详情</p>
        <h2>{{ cgEntry.title || cgId }}</h2>
        <p class="helper">{{ unlockCount }} 个解锁点 · {{ cgEntry.images?.length || 0 }} 张图片</p>
      </div>
      <div class="header-actions">
        <span class="id-chip">{{ cgId }}</span>
        <button class="delete-btn" type="button" @click="emit('requestDelete', { cgId })">删除 CG</button>
      </div>
    </div>

    <div class="field-grid">
      <label class="field">
        <span>标题</span>
        <input ref="titleInputRef" data-test="cg-title-input" :value="cgEntry.title || ''" type="text"
          placeholder="例如：Confession" @input="onTitleInput">
      </label>
      <label class="field">
        <span>内部 ID</span>
        <input data-test="cg-id-input" :value="draftIdValue" type="text"
          placeholder="例如：cg_confession" @input="onIdInput">
      </label>
      <label class="field">
        <span>分类</span>
        <input :value="cgEntry.category || ''" type="text" placeholder="main"
          @input="script.updateCgFields(cgId, { category: $event.target.value })">
      </label>
      <label class="field">
        <span>排序</span>
        <input :value="cgEntry.order ?? 0" type="number" step="1"
          @input="script.updateCgFields(cgId, { order: Number($event.target.value || 0) })">
      </label>
      <label class="field">
        <span>缩略图</span>
        <div class="asset-field">
          <input :value="cgEntry.thumbnail || ''" type="text" placeholder="backgrounds/cg/thumb.png"
            @input="script.updateCgFields(cgId, { thumbnail: $event.target.value || undefined })">
          <button data-test="cg-pick-thumbnail" type="button" @click="pickThumbnail">选择</button>
        </div>
      </label>
      <label class="field">
        <span>锁定缩略图</span>
        <div class="asset-field">
          <input :value="cgEntry.lockedThumbnail || ''" type="text" placeholder="ui/gallery/locked.png"
            @input="script.updateCgFields(cgId, { lockedThumbnail: $event.target.value || undefined })">
          <button data-test="cg-pick-locked-thumbnail" type="button" @click="pickLockedThumbnail">选择</button>
        </div>
      </label>
    </div>

    <label class="field notes-field">
      <span class="field-heading">
        图片路径（每行一张）
        <button data-test="cg-add-image" type="button" @click="addImageFromPicker">+ 选择图片</button>
      </span>
      <textarea data-test="cg-images-input" :value="imagesText" rows="4"
        placeholder="backgrounds/cg/confession.png" @change="onImagesChange"></textarea>
    </label>
    <label class="field notes-field">
      <span>描述</span>
      <textarea :value="cgEntry.description || ''" rows="3" placeholder="图库中显示的简短说明"
        @input="script.updateCgFields(cgId, { description: $event.target.value })"></textarea>
    </label>

    <section class="profile-status" data-test="cg-profile-status">
      <header class="profile-header">
        <div>
          <h3>玩家进度调试</h3>
          <p>只读显示 `player-data/profile.json` 中的 CG 解锁记录。</p>
        </div>
        <button class="refresh-btn" type="button" @click="emit('refreshProfile')">刷新进度</button>
      </header>

      <p v-if="profileStatus === 'loading'" class="profile-empty">正在读取玩家进度...</p>
      <p v-else-if="profileStatus === 'error'" class="profile-error">
        读取玩家进度失败：{{ profileError || '未知错误' }}
      </p>
      <div v-else-if="unlockRecord" class="profile-unlocked">
        <span class="unlocked-badge">已解锁</span>
        <div class="profile-metrics">
          <span><strong>{{ unlockRecord.count ?? 1 }}</strong> 次解锁</span>
          <span>首次：{{ formatProfileTimestamp(unlockRecord.firstUnlockedAt) }}</span>
          <span>最近：{{ formatProfileTimestamp(unlockRecord.lastUnlockedAt) }}</span>
        </div>
      </div>
      <p v-else-if="profileStatus === 'loaded' || profileStatus === 'empty'" class="profile-empty">
        当前玩家档案尚未解锁此 CG。
      </p>
      <p v-else class="profile-empty">打开桌面项目后可检查实际玩家进度。</p>
    </section>

    <p v-if="validationMessage" class="validation-error">{{ validationMessage }}</p>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useAssetStore } from '../../stores/assets.js';
import { useScriptStore } from '../../stores/script.js';

const DRAFT_PREFIX = '__draft_cg__';
const props = defineProps({
  cgId: { type: String, default: null },
  cgEntry: { type: Object, default: null },
  unlockCount: { type: Number, default: 0 },
  unlockRecord: { type: Object, default: null },
  profileStatus: { type: String, default: 'idle' },
  profileError: { type: String, default: null },
  focusToken: { type: Number, default: 0 },
});
const emit = defineEmits(['requestDelete', 'requestRename', 'refreshProfile']);
const script = useScriptStore();
const assets = useAssetStore();
const titleInputRef = ref(null);
const validationMessage = ref('');
const draftIdValue = ref(props.cgId || '');
const hasCustomIdValue = ref(false);
const imagesText = computed(() => (props.cgEntry?.images || []).join('\n'));

watch(() => [props.cgId, props.cgEntry], () => {
  draftIdValue.value = props.cgId || '';
  validationMessage.value = '';
  hasCustomIdValue.value = !String(props.cgId || '').startsWith(DRAFT_PREFIX);
}, { immediate: true });

watch(() => props.focusToken, async () => {
  await nextTick();
  titleInputRef.value?.focus();
});

function slugifyId(value) {
  return String(value ?? '').trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
}

function formatProfileTimestamp(timestamp) {
  const date = new Date(Number(timestamp));
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : '未知';
}

function onTitleInput(event) {
  const value = event.target.value;
  script.updateCgFields(props.cgId, { title: value });
  if (!hasCustomIdValue.value || String(props.cgId || '').startsWith(DRAFT_PREFIX)) {
    const suggestedId = slugifyId(value);
    if (!suggestedId) return;
    const result = script.renameCg(props.cgId, suggestedId);
    if (result.success) {
      draftIdValue.value = result.cgId;
      validationMessage.value = '';
    } else if (result.error === 'duplicate-id') {
      validationMessage.value = 'CG ID 已存在，请改用未占用的 ID。';
    }
  }
}

function onIdInput(event) {
  const normalizedId = slugifyId(event.target.value);
  hasCustomIdValue.value = true;
  draftIdValue.value = event.target.value;
  if (normalizedId !== props.cgId && script.data?.systems?.gallery?.cg?.[normalizedId]) {
    validationMessage.value = 'CG ID 已存在，请改用未占用的 ID。';
    return;
  }
  if (normalizedId !== props.cgId && props.unlockCount > 0) {
    emit('requestRename', { cgId: props.cgId, nextCgId: normalizedId });
    return;
  }
  const result = script.renameCg(props.cgId, normalizedId);
  if (result.success) {
    draftIdValue.value = result.cgId;
    validationMessage.value = '';
  }
}

function onImagesChange(event) {
  const images = event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  script.updateCgFields(props.cgId, { images });
}

async function pickThumbnail() {
  const assetPath = await assets.selectAsset(['backgrounds', 'ui']);
  if (assetPath) {
    script.updateCgFields(props.cgId, { thumbnail: assetPath });
  }
}

async function pickLockedThumbnail() {
  const assetPath = await assets.selectAsset(['ui']);
  if (assetPath) {
    script.updateCgFields(props.cgId, { lockedThumbnail: assetPath });
  }
}

async function addImageFromPicker() {
  const assetPath = await assets.selectAsset(['backgrounds']);
  if (assetPath) {
    script.updateCgFields(props.cgId, {
      images: [...(props.cgEntry?.images || []), assetPath],
    });
  }
}
</script>

<style scoped>
.inspector-card { background: #252526; border: 1px solid #2f2f2f; border-radius: 8px; padding: 24px; }
.inspector-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.eyebrow { margin: 0 0 6px; color: #007acc; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
.inspector-header h2 { margin: 0 0 6px; color: #fff; font-size: 20px; }
.helper { margin: 0; color: #9b9b9b; }
.id-chip { display: inline-flex; border-radius: 999px; background: rgba(0,122,204,0.12); color: #9fd9ff; font-family: Consolas, 'Courier New', monospace; font-size: 12px; padding: 6px 10px; }
.delete-btn { background: transparent; border: 1px solid #6a2c2c; border-radius: 6px; color: #ffb3b3; cursor: pointer; font-size: 12px; padding: 8px 12px; }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.field { display: flex; flex-direction: column; gap: 8px; color: #d0d0d0; font-size: 12px; }
.field input, .field textarea { background: #1e1e1e; border: 1px solid #3d3d3d; border-radius: 6px; color: #e4e4e4; font-size: 13px; outline: none; padding: 10px 12px; }
.field input:focus, .field textarea:focus { border-color: #007acc; }
.asset-field { display: flex; gap: 8px; }
.asset-field input { flex: 1; min-width: 0; }
.asset-field button,
.field-heading button { background: #303030; border: 1px solid #4a4a4a; border-radius: 6px; color: #ddd; cursor: pointer; font-size: 12px; padding: 7px 12px; white-space: nowrap; }
.field-heading { align-items: center; display: flex; justify-content: space-between; gap: 12px; }
.notes-field { margin-top: 16px; }
.profile-status { background: #1f1f1f; border: 1px solid #353535; border-radius: 8px; margin-top: 22px; padding: 16px; }
.profile-header { align-items: flex-start; display: flex; gap: 16px; justify-content: space-between; }
.profile-header h3 { color: #f1f1f1; font-size: 14px; margin: 0 0 5px; }
.profile-header p { color: #969696; font-size: 12px; margin: 0; }
.refresh-btn { background: #303030; border: 1px solid #4a4a4a; border-radius: 6px; color: #ddd; cursor: pointer; font-size: 12px; padding: 7px 12px; white-space: nowrap; }
.profile-unlocked { align-items: center; display: flex; gap: 16px; margin-top: 15px; }
.unlocked-badge { background: rgba(17,119,72,0.32); border-radius: 999px; color: #8de0b5; font-size: 12px; padding: 4px 11px; }
.profile-metrics { color: #bababa; display: flex; flex-wrap: wrap; font-size: 12px; gap: 14px; }
.profile-metrics strong { color: #f4f4f4; }
.profile-empty, .profile-error { color: #a7a7a7; font-size: 12px; margin: 15px 0 0; }
.profile-error { color: #ff9d9d; }
.validation-error { margin: 16px 0 0; color: #ff9d9d; }
</style>
