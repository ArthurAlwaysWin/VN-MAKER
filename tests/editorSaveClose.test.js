/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../src/editor/views/WelcomeScreen.vue', () => ({
  default: {
    template: '<button data-test="open-project" @click="$emit(\'open-recent\', \'demo-project\')">打开</button>',
  },
}));

vi.mock('../src/editor/views/CreateProjectWizard.vue', () => ({ default: { template: '<div></div>' } }));
vi.mock('../src/editor/views/CreateProjectQuick.vue', () => ({ default: { template: '<div></div>' } }));
vi.mock('../src/editor/views/PageEditor.vue', () => ({ default: { template: '<div></div>' } }));
vi.mock('../src/editor/views/StorySystems.vue', () => ({ default: { template: '<div></div>' } }));
vi.mock('../src/editor/views/TitleDesigner.vue', () => ({ default: { template: '<div></div>' } }));
vi.mock('../src/editor/views/SettingsPageEditor.vue', () => ({ default: { template: '<div></div>' } }));
vi.mock('../src/editor/views/GameMenuEditor.vue', () => ({ default: { template: '<div></div>' } }));
vi.mock('../src/editor/views/SaveLoadEditor.vue', () => ({ default: { template: '<div></div>' } }));
vi.mock('../src/editor/views/BacklogEditor.vue', () => ({ default: { template: '<div></div>' } }));
vi.mock('../src/editor/views/ResourceLibrary.vue', () => ({ default: { template: '<div></div>' } }));
vi.mock('../src/editor/views/ProjectSettings.vue', () => ({ default: { template: '<div></div>' } }));

vi.mock('../src/editor/components/ExternalScriptDiffPanel.vue', () => ({
  default: { template: '<button data-test="reload-project" @click="$emit(\'reload\')">重新载入</button>' },
}));

vi.mock('../src/editor/stores/assets.js', () => ({
  useAssetStore: () => ({
    loadAll: vi.fn().mockResolvedValue(undefined),
    loadProjectFonts: vi.fn().mockResolvedValue({ failed: [] }),
    syncFontMeta: vi.fn(),
    deleteAsset: vi.fn().mockResolvedValue(undefined),
  }),
}));

import App from '../src/editor/App.vue';
import { useProjectStore } from '../src/editor/stores/project.js';
import { useScriptStore } from '../src/editor/stores/script.js';

function makeScriptData(title = 'Initial') {
  return {
    projectId: 'gm_save_lifecycle',
    meta: { title },
    characters: {},
    systems: { variables: {} },
    scenes: {
      start: {
        name: 'Start',
        pages: [{ type: 'normal', dialogues: [{ speaker: null, text: title, voice: null }] }],
      },
    },
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushUi() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

async function mountApp({
  saveProject,
  saveDialogAction = 'discard',
  loadProject,
} = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const savePayloads = [];
  const initialScript = makeScriptData();
  const listeners = new Map();

  const invoke = vi.fn(async (channel, payload) => {
    switch (channel) {
      case 'get-recent-projects':
        return { projects: [], hasCreatedProject: true };
      case 'get-pending-open-project-path':
        return null;
      case 'load-project':
        if (loadProject) return loadProject(payload);
        return {
          success: true,
          path: 'E:/demo-project',
          project: { name: 'Demo Project' },
          script: structuredClone(initialScript),
          scriptFileState: { mtimeMs: 1, size: 100, sha256: 'initial' },
        };
      case 'load-player-profile':
        return { success: true, data: null };
      case 'save-project':
        savePayloads.push(payload);
        return saveProject
          ? saveProject(payload, savePayloads.length)
          : { success: true, scriptFileState: { mtimeMs: 2, size: 101, sha256: 'saved' } };
      case 'check-project-file-state':
        return { success: true, scriptFileState: { mtimeMs: 1, size: 100, sha256: 'initial' } };
      case 'show-save-dialog':
        return typeof saveDialogAction === 'function' ? saveDialogAction() : saveDialogAction;
      case 'read-project-script-for-conflict':
        return { success: true, script: makeScriptData('External') };
      case 'close-project':
        return { success: true };
      default:
        return { success: true };
    }
  });
  Object.defineProperty(window, 'ipcRenderer', {
    configurable: true,
    value: {
      invoke,
      on: vi.fn((channel, listener) => {
        listeners.set(channel, listener);
        return vi.fn(() => listeners.delete(channel));
      }),
    },
  });

  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = createApp(App);
  app.use(pinia);
  app.mount(container);
  await flushUi();

  container.querySelector('[data-test="open-project"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await flushUi();
  await flushUi();

  return {
    app,
    container,
    invoke,
    listeners,
    savePayloads,
    project: useProjectStore(),
    script: useScriptStore(),
  };
}

describe('editor save and close dirty-state handshake', () => {
  let harness;

  beforeEach(() => {
    vi.useFakeTimers();
    window.alert = vi.fn();
    window.confirm = vi.fn(() => false);
  });

  afterEach(() => {
    harness?.app.unmount();
    harness = null;
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
    delete window.ipcRenderer;
    delete window.__hasDirtyProject;
    delete window.__saveCurrentProject;
    vi.restoreAllMocks();
  });

  it('keeps a newer edit dirty when an older in-flight save succeeds and persists it on close save', async () => {
    const firstSave = createDeferred();
    harness = await mountApp({
      saveProject: (_payload, callNumber) => callNumber === 1
        ? firstSave.promise
        : { success: true, scriptFileState: { mtimeMs: 3, size: 102, sha256: 'newest' } },
    });

    harness.script.data.meta.title = 'Edit A';
    await flushUi();
    expect(harness.project.isDirty).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
    await flushUi();
    expect(harness.savePayloads).toHaveLength(1);
    expect(harness.savePayloads[0].script.meta.title).toBe('Edit A');

    harness.script.data.meta.title = 'Edit B';
    await flushUi();
    expect(harness.project.isDirty).toBe(true);

    const closeDirtyCheck = window.__hasDirtyProject();
    firstSave.resolve({
      success: true,
      scriptFileState: { mtimeMs: 2, size: 101, sha256: 'older-save' },
    });

    await expect(closeDirtyCheck).resolves.toBe(true);
    expect(harness.project.isDirty).toBe(true);

    await expect(window.__saveCurrentProject()).resolves.toBe(true);
    expect(harness.savePayloads).toHaveLength(2);
    expect(harness.savePayloads[1].script.meta.title).toBe('Edit B');
    expect(harness.project.isDirty).toBe(false);
  });

  it('applies the dirty-generation guard to direct project-store saves', async () => {
    const save = createDeferred();
    harness = await mountApp({ saveProject: () => save.promise });
    harness.project.markDirty();

    const result = harness.project.saveProject(harness.script.data);
    await flushUi();
    harness.project.markDirty();
    save.resolve({ success: true, scriptFileState: { mtimeMs: 2, size: 101, sha256: 'saved' } });

    await expect(result).resolves.toBe(true);
    expect(harness.project.isDirty).toBe(true);
  });

  it('marks edits dirty immediately and groups continuous edits into one 500 ms undo transaction', async () => {
    harness = await mountApp();
    const pushState = vi.spyOn(harness.script, 'pushState');

    harness.script.data.meta.title = 'First';
    await flushUi();
    expect(harness.project.isDirty).toBe(true);

    await vi.advanceTimersByTimeAsync(400);
    harness.script.data.meta.title = 'Second';
    await flushUi();
    await vi.advanceTimersByTimeAsync(499);
    expect(pushState).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(harness.script.history).toHaveLength(2);
  });

  it('debounces autosave for 2 seconds after the newest edit', async () => {
    harness = await mountApp();

    harness.script.data.meta.title = 'First';
    await flushUi();
    await vi.advanceTimersByTimeAsync(1000);
    harness.script.data.meta.title = 'Second';
    await flushUi();
    await vi.advanceTimersByTimeAsync(1999);
    expect(harness.savePayloads).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1);
    await flushUi();
    expect(harness.savePayloads).toHaveLength(1);
    expect(harness.savePayloads[0].script.meta.title).toBe('Second');
  });

  it.each([
    ['save button', (container) => container.querySelector('.save-btn').click()],
    ['Ctrl+S', () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))],
  ])('%s saves immediately, flushes the pending patch, and cancels autosave', async (_label, triggerSave) => {
    harness = await mountApp();
    harness.script.data.meta.title = 'Manual edit';
    await flushUi();

    triggerSave(harness.container);
    await flushUi();
    expect(harness.savePayloads).toHaveLength(1);
    expect(harness.savePayloads[0].script.meta.title).toBe('Manual edit');
    expect(harness.script.history).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(2000);
    await flushUi();
    expect(harness.savePayloads).toHaveLength(1);
  });

  it('reuses one active save promise for concurrent save requests', async () => {
    const save = createDeferred();
    harness = await mountApp({ saveProject: () => save.promise });
    harness.script.data.meta.title = 'Concurrent';
    await flushUi();

    const first = window.__saveCurrentProject();
    const second = window.__saveCurrentProject();
    await flushUi();
    expect(harness.savePayloads).toHaveLength(1);

    save.resolve({ success: true, scriptFileState: { mtimeMs: 2, size: 101, sha256: 'saved' } });
    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);
  });

  it('keeps the condition-page save gate and its manual repair source', async () => {
    harness = await mountApp();
    harness.script.data.scenes.start.pages[0] = {
      type: 'condition',
      conditions: [{ variableId: 'missing_variable', operator: '==', value: true }],
      trueTarget: 'start',
      falseTarget: 'start',
      unresolvedCondition: { type: 'deleted-variable', variableId: 'missing_variable' },
    };
    await flushUi();
    expect(harness.script.canSaveConditionPages).toBe(false);

    harness.container.querySelector('.save-btn').click();
    await flushUi();
    expect(harness.savePayloads).toHaveLength(0);
    expect(harness.script.storySystemsRepairRequest.source).toBe('manual');
    expect(harness.project.isDirty).toBe(true);
  });

  it.each([
    ['failure', { success: false }],
    ['external conflict', {
      success: false,
      conflict: true,
      scriptFileState: { mtimeMs: 9, size: 999, sha256: 'external' },
    }],
  ])('keeps dirty state after save %s', async (_label, result) => {
    harness = await mountApp({ saveProject: () => result });
    harness.script.data.meta.title = 'Unsaved';
    await flushUi();

    await window.__saveCurrentProject();
    expect(harness.project.isDirty).toBe(true);
    if (result.conflict) {
      expect(harness.project.externalScriptChange?.source).toBe('save-project');
    }
  });

  it.each([
    ['save', 1, false],
    ['discard', 0, false],
    ['cancel', 0, true],
  ])('goHome %s path preserves its save/discard/cancel behavior', async (action, expectedSaves, staysEditing) => {
    harness = await mountApp({ saveDialogAction: action });
    harness.script.data.meta.title = 'Go home edit';
    await flushUi();

    harness.container.querySelector('.home-btn').click();
    await flushUi();
    await flushUi();

    expect(harness.savePayloads).toHaveLength(expectedSaves);
    expect(Boolean(harness.container.querySelector('.editor-layout'))).toBe(staysEditing);
  });

  it('cancels pending timers before an external project open', async () => {
    harness = await mountApp({
      loadProject: (projectPath) => ({
        success: true,
        path: projectPath,
        project: { name: projectPath },
        script: makeScriptData(projectPath),
        scriptFileState: { mtimeMs: 1, size: 100, sha256: projectPath },
      }),
    });
    const pushState = vi.spyOn(harness.script, 'pushState');
    harness.script.data.meta.title = 'Pending external open';
    await flushUi();

    harness.listeners.get('open-project-path')({}, { projectPath: 'E:/external-project' });
    await flushUi();
    await flushUi();
    await vi.advanceTimersByTimeAsync(2000);
    expect(harness.project.projectPath).toBe('E:/external-project');
    expect(harness.savePayloads).toHaveLength(0);
    expect(pushState).not.toHaveBeenCalled();
  });

  it('cancels pending timers before reload and on unmount', async () => {
    harness = await mountApp();
    const pushState = vi.spyOn(harness.script, 'pushState');
    harness.script.data.meta.title = 'Pending reload';
    await flushUi();
    harness.project.externalScriptChange = { source: 'poll' };
    await flushUi();

    harness.container.querySelector('[data-test="reload-project"]').click();
    await flushUi();
    await vi.advanceTimersByTimeAsync(2000);
    expect(harness.savePayloads).toHaveLength(0);
    expect(pushState).not.toHaveBeenCalled();

    harness.script.data.meta.title = 'Pending unmount';
    await flushUi();
    harness.app.unmount();
    harness.app = { unmount: vi.fn() };
    await vi.advanceTimersByTimeAsync(2000);
    expect(harness.savePayloads).toHaveLength(0);
    expect(pushState).not.toHaveBeenCalled();
  });

  it('keeps the Electron main close handshake awaitable', () => {
    const source = readFileSync(resolve(process.cwd(), 'electron', 'main.js'), 'utf8');
    expect(source).toContain(
      '(async () => (window.__hasDirtyProject ? await window.__hasDirtyProject() : false))()'
    );
    expect(source).toContain(
      '(async () => (window.__saveCurrentProject ? await window.__saveCurrentProject() : false))()'
    );
  });
});
