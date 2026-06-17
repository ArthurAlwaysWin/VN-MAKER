import { performance } from 'node:perf_hooks';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, watch } from 'vue';

import { useScriptStore } from '../src/editor/stores/script.js';

const PAGE_COUNTS = [500, 2_500, 10_000];
const SAMPLE_COUNT = 20;
const WARMUP_COUNT = 5;

function createProject(pageCount) {
  const scenes = {};
  const sceneCount = Math.ceil(pageCount / 10);
  for (let sceneIndex = 0; sceneIndex < sceneCount; sceneIndex++) {
    const pages = [];
    for (let pageIndex = 0; pageIndex < 10 && sceneIndex * 10 + pageIndex < pageCount; pageIndex++) {
      const absoluteIndex = sceneIndex * 10 + pageIndex;
      pages.push({
        type: 'normal',
        name: `Page ${absoluteIndex}`,
        background: null,
        characters: [],
        dialogues: [{ speaker: null, text: `Line ${absoluteIndex}`, expression: null, voice: null }],
      });
    }
    scenes[`scene_${sceneIndex}`] = { name: `Scene ${sceneIndex}`, pages };
  }
  return {
    projectId: `gm_benchmark_${pageCount}`,
    meta: { title: `Benchmark ${pageCount}` },
    characters: {},
    scenes,
  };
}

function percentile(samples, fraction) {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function summarize(samples) {
  return {
    medianMs: Number(percentile(samples, 0.5).toFixed(3)),
    p95Ms: Number(percentile(samples, 0.95).toFixed(3)),
  };
}

function collectGarbage() {
  if (!global.gc) throw new Error('Run this benchmark with --expose-gc');
  for (let index = 0; index < 3; index++) global.gc();
}

async function measure(pageCount) {
  setActivePinia(createPinia());
  const store = useScriptStore();
  store.loadFromData(createProject(pageCount));
  const firstDialogue = store.data.scenes.scene_0.pages[0].dialogues[0];

  let notificationCount = 0;
  const stop = watch(() => store.changeRevision, () => { notificationCount++; });
  for (let index = 0; index < WARMUP_COUNT; index++) {
    firstDialogue.text = `Warm notification ${index}`;
    await nextTick();
  }
  store.pushState();

  const notificationSamples = [];
  for (let index = 0; index < SAMPLE_COUNT; index++) {
    const started = performance.now();
    firstDialogue.text = `Notification ${index}`;
    await nextTick();
    notificationSamples.push(performance.now() - started);
  }
  store.pushState();

  for (let index = 0; index < WARMUP_COUNT; index++) {
    firstDialogue.text = `Warm history ${index}`;
    store.pushState();
  }
  const historySamples = [];
  for (let index = 0; index < SAMPLE_COUNT; index++) {
    firstDialogue.text = `History ${index}`;
    const started = performance.now();
    store.pushState();
    historySamples.push(performance.now() - started);
  }
  stop();

  setActivePinia(createPinia());
  const memoryStore = useScriptStore();
  memoryStore.loadFromData(createProject(pageCount));
  collectGarbage();
  const heapBefore = process.memoryUsage().heapUsed;
  for (let index = 0; index < SAMPLE_COUNT; index++) {
    memoryStore.data.scenes.scene_0.pages[0].dialogues[0].text = `Memory ${index}`;
    memoryStore.pushState();
  }
  collectGarbage();
  const retainedHistoryMiB = (process.memoryUsage().heapUsed - heapBefore) / (1024 * 1024);

  return {
    pages: pageCount,
    notification: summarize(notificationSamples),
    pushState: summarize(historySamples),
    retainedHistoryMiB: Number(Math.max(0, retainedHistoryMiB).toFixed(3)),
    notificationCount,
  };
}

const results = [];
for (const pageCount of PAGE_COUNTS) results.push(await measure(pageCount));
console.log(JSON.stringify({ sampleCount: SAMPLE_COUNT, results }, null, 2));
