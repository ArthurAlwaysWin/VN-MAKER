/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../src/editor/views/WelcomeScreen.vue', () => ({
  default: {
    template: '<button data-test="open-project" @click="$emit(\'open-recent\', \'demo-project\')">打开</button>',
  },
}));

vi.mock('../src/editor/views/CreateProjectWizard.vue', () => ({
  default: { template: '<div></div>' },
}));

vi.mock('../src/editor/views/CreateProjectQuick.vue', () => ({
  default: { template: '<div></div>' },
}));

vi.mock('../src/editor/views/PageEditor.vue', () => ({
  default: { template: '<div data-test="page-editor-stub">页面编辑器</div>' },
}));

vi.mock('../src/editor/views/TitleDesigner.vue', () => ({
  default: { template: '<div>标题页</div>' },
}));

vi.mock('../src/editor/views/SettingsPageEditor.vue', () => ({
  default: { template: '<div>设置页</div>' },
}));

vi.mock('../src/editor/views/GameMenuEditor.vue', () => ({
  default: { template: '<div>游戏菜单</div>' },
}));

vi.mock('../src/editor/views/SaveLoadEditor.vue', () => ({
  default: { template: '<div>存读档</div>' },
}));

vi.mock('../src/editor/views/BacklogEditor.vue', () => ({
  default: { template: '<div>回想</div>' },
}));

vi.mock('../src/editor/views/ResourceLibrary.vue', () => ({
  default: { template: '<div>资源库</div>' },
}));

vi.mock('../src/editor/views/ProjectSettings.vue', () => ({
  default: { template: '<div>项目设置</div>' },
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
import StorySystems from '../src/editor/views/StorySystems.vue';
import { useScriptStore } from '../src/editor/stores/script.js';

function makeScriptData(overrides = {}) {
  return {
    meta: { title: '变量工作区测试' },
    characters: {},
    systems: {
      variables: {
        route_locked: {
          name: '路线锁',
          type: 'bool',
          initial: true,
          group: '路线',
          notes: '控制剧情入口',
        },
        affection: {
          name: '樱好感',
          type: 'number',
          initial: 3,
          group: '角色',
          notes: '主线数值',
        },
      },
    },
    scenes: {
      start: {
        name: '开始',
        pages: [
          {
            type: 'choice',
            options: [
              {
                text: '答应她',
                target: 'sakura-route',
                effects: [
                  { type: 'var:add', id: 'affection', value: 1 },
                ],
              },
              {
                text: '保持沉默',
                target: 'daily',
                effects: [
                  { type: 'var:set', id: 'route_locked', value: false },
                ],
              },
            ],
          },
          {
            type: 'condition',
            conditionMode: 'all',
            conditions: [
              { variableId: 'route_locked', operator: '==', value: false },
              { variableId: 'affection', operator: '>=', value: 5 },
            ],
            trueTarget: 'sakura-route',
            falseTarget: 'daily',
          },
        ],
      },
      'sakura-route': {
        name: '樱线',
        pages: [
          {
            type: 'normal',
            dialogues: [{ speaker: null, text: '进入樱线', voice: null }],
          },
        ],
      },
      daily: {
        name: '日常线',
        pages: [
          {
            type: 'normal',
            dialogues: [{ speaker: null, text: '进入日常', voice: null }],
          },
        ],
      },
    },
    ...overrides,
  };
}

async function flushUi() {
  await Promise.resolve();
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

async function mountStorySystems(scriptData = makeScriptData()) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const script = useScriptStore();
  script.loadFromData(scriptData);

  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = createApp(StorySystems);
  app.use(pinia);
  app.mount(container);
  await flushUi();

  return {
    app,
    container,
    script,
  };
}

async function mountApp(scriptData = makeScriptData()) {
  const pinia = createPinia();
  setActivePinia(pinia);

  window.ipcRenderer = {
    invoke: vi.fn(async (channel) => {
      switch (channel) {
        case 'get-recent-projects':
          return { projects: [], hasCreatedProject: true };
        case 'load-project':
          return {
            success: true,
            path: 'E:/demo-project',
            project: { name: 'Demo Project' },
            script: JSON.parse(JSON.stringify(scriptData)),
          };
        case 'save-project':
        case 'close-project':
        case 'open-preview':
          return { success: true };
        case 'show-save-dialog':
          return 'discard';
        default:
          return { success: true };
      }
    }),
  };

  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = createApp(App);
  app.use(pinia);
  app.mount(container);
  await flushUi();

  container.querySelector('[data-test="open-project"]')?.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
  }));
  await flushUi();
  await flushUi();

  return {
    app,
    container,
    script: useScriptStore(),
  };
}

describe('variable registry workspace', () => {
  let harness = null;

  beforeEach(() => {
    window.alert = vi.fn();
  });

  afterEach(() => {
    harness?.app.unmount();
    harness = null;
    document.body.innerHTML = '';
    delete window.ipcRenderer;
    delete window.__hasDirtyProject;
    delete window.__saveCurrentProject;
    vi.clearAllMocks();
  });

  it('inserts the top-level 剧情系统 tab immediately after 游戏内容', async () => {
    harness = await mountApp();

    const tabLabels = Array.from(harness.container.querySelectorAll('.tab')).map((button) => button.textContent.trim());
    expect(tabLabels.slice(0, 3)).toEqual([
      '🎬 游戏内容',
      '📊 剧情系统',
      '🖼️ 标题页',
    ]);
  });

  it('lists systems.variables entries with usage count, type badge, internal id, and default value', async () => {
    harness = await mountStorySystems();

    const text = harness.container.textContent;
    expect(text).toContain('樱好感');
    expect(text).toContain('affection');
    expect(text).toContain('数值');
    expect(text).toContain('默认值 3');
    expect(text).toContain('2 引用');
    expect(text).toContain('路线锁');
    expect(text).toContain('route_locked');
    expect(text).toContain('布尔');
    expect(text).toContain('默认值 是');
  });

  it('keeps the current selection when search and filters still match display name, id, or group', async () => {
    harness = await mountStorySystems();

    const rows = harness.container.querySelectorAll('[data-test="variable-row"]');
    rows[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUi();

    const searchInput = harness.container.querySelector('[data-test="variable-search"]');
    searchInput.value = '角色';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flushUi();

    const selectedRow = harness.container.querySelector('[data-test="variable-row"].selected');
    expect(selectedRow?.textContent).toContain('樱好感');
  });

  it('uses the locked Chinese empty and no-result copy from the UI spec', async () => {
    harness = await mountStorySystems(makeScriptData({
      systems: {
        variables: {},
      },
    }));

    expect(harness.container.textContent).toContain('还没有变量');
    expect(harness.container.textContent).toContain('先创建第一个变量，然后在选项或条件页中引用它。');

    harness.app.unmount();
    harness = await mountStorySystems();

    const searchInput = harness.container.querySelector('[data-test="variable-search"]');
    searchInput.value = '完全不存在';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flushUi();

    expect(harness.container.textContent).toContain('没有匹配的变量');
    expect(harness.container.textContent).toContain('试试其他关键字，或清除筛选条件。');
  });

  it('opens 剧情系统 and focuses the requested variable row for app-level repair navigation', async () => {
    harness = await mountApp();

    harness.script.requestStorySystemsRepair({
      variableId: 'affection',
      source: 'missing-variable-reference',
    });
    await flushUi();

    const activeTab = harness.container.querySelector('.tab.active');
    expect(activeTab?.textContent).toContain('剧情系统');

    const selectedRow = harness.container.querySelector('[data-test="variable-row"].selected');
    expect(selectedRow?.textContent).toContain('樱好感');
  });
});
