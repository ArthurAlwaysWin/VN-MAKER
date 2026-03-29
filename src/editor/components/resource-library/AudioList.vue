<template>
  <div class="audio-placeholder">
    <div class="empty-icon">🎵</div>
    <p>音频子标签 — 将在后续计划中实现</p>
  </div>
</template>

<script setup>
/**
 * AudioList — Scaffold placeholder for the audio sub-tab.
 * Will be implemented in Plan 03 with playback controls and waveform preview.
 * @module components/resource-library/AudioList
 */
</script>

<style scoped>
.audio-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #888;
  gap: 12px;
}
.empty-icon {
  font-size: 48px;
}
</style>
