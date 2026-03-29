<script setup>
/**
 * MiniPlayer — Custom audio player widget with play/pause, seekable progress bar, and duration display.
 * Uses HTMLAudioElement API (not native <audio controls>) per D-10.
 * @module components/resource-library/MiniPlayer
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue';

const props = defineProps({
  src: { type: String, required: true },
  active: { type: Boolean, default: false },
});
const emit = defineEmits(['play', 'stop']);

const audio = new Audio();
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const progress = computed(() => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0);

// ─── Format Helpers ─────────────────────────────────────────────────

/**
 * Format seconds to m:ss display string.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Playback Controls ──────────────────────────────────────────────

function togglePlay() {
  if (isPlaying.value) {
    audio.pause();
    isPlaying.value = false;
    emit('stop');
  } else {
    audio.src = props.src;
    audio.play();
    isPlaying.value = true;
    emit('play');
  }
}

/**
 * Seek to position on click within the progress track.
 * @param {MouseEvent} event
 */
function seek(event) {
  const track = event.currentTarget;
  const rect = track.getBoundingClientRect();
  const fraction = (event.clientX - rect.left) / rect.width;
  if (duration.value > 0) {
    audio.currentTime = Math.max(0, Math.min(fraction, 1)) * duration.value;
  }
}

/**
 * Start dragging the progress bar.
 * @param {MouseEvent} event
 */
function startDrag(event) {
  event.preventDefault();
  const track = event.currentTarget;

  function onMove(e) {
    const rect = track.getBoundingClientRect();
    const fraction = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    if (duration.value > 0) {
      audio.currentTime = fraction * duration.value;
    }
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  onMove(event);
}

// ─── Audio Event Listeners ──────────────────────────────────────────

audio.addEventListener('loadedmetadata', () => {
  if (isFinite(audio.duration)) duration.value = audio.duration;
});
audio.addEventListener('durationchange', () => {
  if (isFinite(audio.duration)) duration.value = audio.duration;
});
audio.addEventListener('timeupdate', () => {
  currentTime.value = audio.currentTime;
});
audio.addEventListener('ended', () => {
  isPlaying.value = false;
  currentTime.value = 0;
  emit('stop');
});

// ─── Watcher: Deactivate When Another Player Starts ─────────────────

watch(() => props.active, (val) => {
  if (!val && isPlaying.value) {
    audio.pause();
    isPlaying.value = false;
  }
});

// ─── Cleanup (Pitfall #3: Audio Memory Leak) ────────────────────────

onBeforeUnmount(() => {
  audio.pause();
  audio.removeAttribute('src');
  audio.load(); // releases the media resource
});
</script>

<template>
  <div class="mini-player">
    <button class="play-btn" @click="togglePlay" :aria-label="isPlaying ? '暂停' : '播放'">
      {{ isPlaying ? '⏸' : '▶' }}
    </button>
    <div class="track" @click="seek" @mousedown="startDrag">
      <div class="track-fill" :style="{ width: progress + '%' }"></div>
      <div class="track-thumb" :style="{ left: progress + '%' }"></div>
    </div>
    <span class="duration">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
  </div>
</template>

<style scoped>
.mini-player {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}
.play-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #007acc;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}
.play-btn:hover {
  background: #0587d9;
}
.track {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  cursor: pointer;
  position: relative;
}
.track-fill {
  height: 100%;
  background: #007acc;
  border-radius: 2px;
  transition: width 100ms linear;
}
.track-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 150ms;
  pointer-events: none;
}
.track:hover .track-thumb {
  opacity: 1;
}
.duration {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 80px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
