/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import ExportModal from '../src/editor/components/ExportModal.vue';
import { useProjectStore } from '../src/editor/stores/project.js';
import { useScriptStore } from '../src/editor/stores/script.js';

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
}

function findButton(title) {
  return [...document.querySelectorAll('button')].find((button) => button.title === title);
}

async function mountExportModal({ saveProject, exportResult } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const project = useProjectStore();
  project.projectData = {
    name: 'Live export test',
    resolution: { width: 1600, height: 900 },
  };
  const script = useScriptStore();
  script.loadFromData({
    meta: { title: 'Unsaved live title' },
    scenes: { live: { pages: [] } },
  });

  const order = [];
  const activeProgressListeners = new Set();
  const unsubscribes = [];
  const invoke = vi.fn(async (channel) => {
    if (channel === 'dialog-open-directory') return 'C:\\exports';
    if (channel === 'export-game' || channel === 'export-game-desktop') {
      order.push(channel);
      return typeof exportResult === 'function'
        ? exportResult(channel)
        : (exportResult ?? { success: true, outputPath: 'C:\\exports\\game' });
    }
    throw new Error(`Unexpected IPC channel: ${channel}`);
  });
  const on = vi.fn((channel, listener) => {
    expect(channel).toBe('export-progress');
    activeProgressListeners.add(listener);
    const unsubscribe = vi.fn(() => activeProgressListeners.delete(listener));
    unsubscribes.push(unsubscribe);
    return unsubscribe;
  });
  Object.defineProperty(window, 'ipcRenderer', {
    configurable: true,
    value: { invoke, on },
  });

  vi.spyOn(project, 'saveProject').mockImplementation(async (data) => {
    order.push('save-project');
    return saveProject ? saveProject(data) : true;
  });

  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = createApp(ExportModal, { visible: true });
  app.use(pinia);
  app.mount(container);
  await nextTick();

  const titleInput = document.querySelector('.export-input');
  titleInput.value = 'Exported game';
  titleInput.dispatchEvent(new Event('input', { bubbles: true }));
  findButton('选择输出目录').click();
  await flushAsyncWork();

  return {
    app,
    project,
    script,
    order,
    invoke,
    on,
    unsubscribes,
    activeProgressListeners,
  };
}

describe('ExportModal save-before-export behavior', () => {
  let harness;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    harness?.app.unmount();
    harness = null;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it.each([
    ['desktop', 'export-game-desktop'],
    ['web', 'export-game'],
  ])('saves live script data before %s export and cleans up progress', async (format, exportChannel) => {
    harness = await mountExportModal();
    if (format === 'web') {
      findButton('切换为网页版导出').click();
      await nextTick();
    }

    findButton('开始导出游戏').click();
    await flushAsyncWork();

    expect(harness.project.saveProject).toHaveBeenCalledTimes(1);
    expect(harness.project.saveProject).toHaveBeenCalledWith(harness.script.data);
    expect(harness.order).toEqual(['save-project', exportChannel]);
    expect(harness.on).toHaveBeenCalledTimes(1);
    expect(harness.unsubscribes[0]).toHaveBeenCalledTimes(1);
    expect(harness.activeProgressListeners).toHaveLength(0);
    expect(document.querySelector('.done-title')?.textContent).toBe('导出成功');
  });

  it.each([
    ['desktop', 'returns false', () => false],
    ['web', 'returns false', () => false],
    ['desktop', 'throws', () => Promise.reject(new Error('disk is read-only'))],
    ['web', 'throws', () => Promise.reject(new Error('disk is read-only'))],
  ])('blocks both export IPC paths when %s save %s', async (format, _label, saveProject) => {
    harness = await mountExportModal({ saveProject });
    if (format === 'web') {
      findButton('切换为网页版导出').click();
      await nextTick();
    }

    findButton('开始导出游戏').click();
    await flushAsyncWork();

    expect(harness.invoke).not.toHaveBeenCalledWith('export-game', expect.anything());
    expect(harness.invoke).not.toHaveBeenCalledWith('export-game-desktop', expect.anything());
    expect(harness.on).not.toHaveBeenCalled();
    expect(harness.activeProgressListeners).toHaveLength(0);
    expect(document.querySelector('.done-title')?.textContent).toBe('导出失败');
    expect(document.querySelector('.done-error')?.textContent).toMatch(/保存|read-only/);
  });

  it('cleans up the progress listener when export fails', async () => {
    harness = await mountExportModal({
      exportResult: { success: false, error: 'desktop packager failed' },
    });

    findButton('开始导出游戏').click();
    await flushAsyncWork();

    expect(harness.unsubscribes[0]).toHaveBeenCalledTimes(1);
    expect(harness.activeProgressListeners).toHaveLength(0);
    expect(document.querySelector('.done-error')?.textContent).toContain('desktop packager failed');
  });

  it('cleans up immediately on cancellation and ignores the eventual export result', async () => {
    let resolveExport;
    harness = await mountExportModal({
      exportResult: () => new Promise((resolve) => {
        resolveExport = resolve;
      }),
    });

    findButton('开始导出游戏').click();
    await flushAsyncWork();
    expect(harness.activeProgressListeners).toHaveLength(1);

    findButton('取消导出').click();
    await nextTick();
    expect(harness.activeProgressListeners).toHaveLength(0);
    expect(harness.unsubscribes[0]).toHaveBeenCalledTimes(1);

    resolveExport({ success: true, outputPath: 'C:\\exports\\late' });
    await flushAsyncWork();
    expect(document.querySelector('.done-title')).toBeNull();
    expect(findButton('开始导出游戏')).toBeTruthy();
  });

  it('does not begin export when cancelled while save is still in flight', async () => {
    let resolveSave;
    harness = await mountExportModal({
      saveProject: () => new Promise((resolve) => {
        resolveSave = resolve;
      }),
    });

    findButton('开始导出游戏').click();
    await nextTick();
    findButton('取消导出').click();
    resolveSave(true);
    await flushAsyncWork();

    expect(harness.invoke).not.toHaveBeenCalledWith('export-game', expect.anything());
    expect(harness.invoke).not.toHaveBeenCalledWith('export-game-desktop', expect.anything());
    expect(harness.on).not.toHaveBeenCalled();
    expect(findButton('开始导出游戏')).toBeTruthy();
  });
});
