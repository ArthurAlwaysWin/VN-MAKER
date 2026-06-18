/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

import PresetModal from '../src/editor/components/theme/PresetModal.vue';
import ThemePackageModal from '../src/editor/components/theme/ThemePackageModal.vue';
import { createThemeEditor } from '../src/editor/composables/useThemeEditor.js';
import { useAssetStore } from '../src/editor/stores/assets.js';
import { useProjectStore } from '../src/editor/stores/project.js';
import { useScriptStore } from '../src/editor/stores/script.js';

async function flushAsyncWork() {
  for (let index = 0; index < 3; index += 1) {
    await new Promise(resolve => setTimeout(resolve, 0));
    await nextTick();
  }
}

function findButton(label) {
  return [...document.querySelectorAll('button')]
    .find(button => button.textContent.replace(/\s+/g, ' ').trim().includes(label));
}

function makeBundle(primary = '#445566') {
  return {
    theme: { tokens: { primary } },
    widgetStyles: {},
    dialogueBox: {},
    saveLoadScreen: {},
    backlogScreen: {},
    gameMenu: {},
    settingsScreen: {},
    titleScreen: {
      background: 'ui/themes/test/title.png',
      elements: [],
    },
  };
}

async function mountModal(Component, { invoke, provideThemeEditor = false } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const script = useScriptStore();
  script.loadFromData({
    meta: { title: 'Theme UI behavior' },
    ui: {
      theme: { tokens: { primary: '#111111' } },
      titleScreen: { bgm: 'audio/title.ogg', elements: [] },
    },
    scenes: {},
  });
  const project = useProjectStore();
  const assets = useAssetStore();
  const order = [];
  const close = vi.fn();

  vi.spyOn(project, 'markDirty').mockImplementation(() => order.push('dirty'));
  vi.spyOn(project, 'saveProject').mockImplementation(async () => {
    order.push('save');
    return true;
  });
  vi.spyOn(assets, 'loadCategory').mockImplementation(async (category) => {
    order.push(`refresh:${category}`);
  });

  const applyThemeBundle = script.applyThemeBundle.bind(script);
  vi.spyOn(script, 'applyThemeBundle').mockImplementation((...args) => {
    order.push('apply');
    return applyThemeBundle(...args);
  });

  Object.defineProperty(window, 'ipcRenderer', {
    configurable: true,
    value: {
      invoke: vi.fn(async (channel, payload) => {
        order.push(channel);
        return invoke(channel, payload);
      }),
    },
  });

  const Root = defineComponent({
    setup() {
      if (provideThemeEditor) createThemeEditor();
      return () => h(Component, { onClose: close });
    },
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = createApp(Root);
  app.use(pinia);
  app.mount(container);
  await nextTick();

  return { app, assets, close, order, project, script, ipcRenderer: window.ipcRenderer };
}

describe('theme package UI behavior', () => {
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

  it('exports a complete .gmtheme through save-first shared export behavior', async () => {
    harness = await mountModal(PresetModal, {
      provideThemeEditor: true,
      invoke: async (channel) => {
        if (channel === 'export-gmtheme') {
          return { success: true, path: 'E:/themes/current.gmtheme' };
        }
        throw new Error(`Unexpected IPC channel: ${channel}`);
      },
    });

    findButton('导出完整 .gmtheme').click();
    await flushAsyncWork();

    expect(harness.order).toEqual(['save', 'export-gmtheme']);
    expect(harness.ipcRenderer.invoke).not.toHaveBeenCalledWith('export-theme', expect.anything());
    expect(document.body.textContent).toContain('已导出完整 .gmtheme');
  });

  it('lets a ready import install assets before one undoable apply, then refreshes and saves', async () => {
    const packageMeta = {
      source: 'file',
      themeId: 'moonlight',
      mode: 'full',
      assetRoot: 'ui/themes/moonlight/',
    };
    harness = await mountModal(PresetModal, {
      provideThemeEditor: true,
      invoke: async (channel) => {
        if (channel === 'import-theme') {
          return { success: true, filePath: 'E:/themes/moonlight.gmtheme' };
        }
        if (channel === 'preflight-theme-package') {
          return {
            success: true,
            status: 'ready',
            mode: 'full',
            themeId: 'moonlight',
            assetRoot: 'ui/themes/moonlight/',
            coverage: ['theme', 'titleScreen'],
            missingCoverage: [],
            blockingErrors: [],
            warnings: [],
          };
        }
        if (channel === 'install-theme-package') {
          return { success: true, bundle: makeBundle(), packageMeta };
        }
        throw new Error(`Unexpected IPC channel: ${channel}`);
      },
    });
    const historyBefore = harness.script.history.length;

    findButton('导入主题包').click();
    await flushAsyncWork();
    expect(findButton('应用完整主题')).toBeTruthy();

    findButton('应用完整主题').click();
    await flushAsyncWork();

    expect(harness.order).toEqual([
      'import-theme',
      'preflight-theme-package',
      'preflight-theme-package',
      'install-theme-package',
      'apply',
      'dirty',
      'refresh:ui',
      'save',
    ]);
    expect(harness.script.history).toHaveLength(historyBefore + 1);
    expect(harness.script.data.ui.theme.packageMeta).toEqual(packageMeta);
    expect(harness.close).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['cancelled selection', { canceled: true }],
    ['blocked preflight', {
      success: true,
      filePath: 'E:/themes/blocked.gmtheme',
      preflight: {
        success: true,
        status: 'blocked',
        mode: 'full',
        themeId: 'blocked',
        coverage: ['theme'],
        missingCoverage: [],
        blockingErrors: ['非法路径'],
        warnings: [],
      },
    }],
  ])('does not mutate the project for %s', async (_label, scenario) => {
    harness = await mountModal(PresetModal, {
      provideThemeEditor: true,
      invoke: async (channel) => {
        if (channel === 'import-theme') {
          return scenario.canceled
            ? { canceled: true }
            : { success: true, filePath: scenario.filePath };
        }
        if (channel === 'preflight-theme-package') return scenario.preflight;
        throw new Error(`Unexpected IPC channel: ${channel}`);
      },
    });
    const before = JSON.stringify(harness.script.data);
    const historyBefore = harness.script.history.length;

    findButton('导入主题包').click();
    await flushAsyncWork();

    expect(findButton('应用完整主题')).toBeFalsy();
    expect(JSON.stringify(harness.script.data)).toBe(before);
    expect(harness.script.history).toHaveLength(historyBefore);
    expect(harness.project.saveProject).not.toHaveBeenCalled();
    expect(harness.assets.loadCategory).not.toHaveBeenCalled();
    expect(harness.order).not.toContain('install-theme-package');
  });

  it('routes built-in theme UI through install-before-apply and the same refresh/save path', async () => {
    harness = await mountModal(ThemePackageModal, {
      invoke: async (channel, payload) => {
        if (channel === 'install-theme-package') {
          return {
            success: true,
            bundle: makeBundle('#778899'),
            packageMeta: {
              source: 'builtin',
              themeId: payload.themeId,
              mode: 'full',
              assetRoot: `ui/themes/${payload.themeId}/`,
            },
          };
        }
        throw new Error(`Unexpected IPC channel: ${channel}`);
      },
    });
    const historyBefore = harness.script.history.length;

    document.querySelector('.theme-card').click();
    await nextTick();
    findButton('应用主题包').click();
    await flushAsyncWork();

    expect(harness.order).toEqual([
      'install-theme-package',
      'apply',
      'dirty',
      'refresh:ui',
      'save',
    ]);
    expect(harness.script.history).toHaveLength(historyBefore + 1);
    expect(harness.script.data.ui.theme.packageMeta.source).toBe('builtin');
    expect(harness.close).toHaveBeenCalledTimes(1);
  });
});
