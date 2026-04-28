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

  it('creates a draft variable, focuses display name, and auto-generates the first internal id from that name', async () => {
    harness = await mountStorySystems();

    harness.container.querySelector('.create-btn')?.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
    }));
    await flushUi();

    const nameInput = harness.container.querySelector('[data-test="variable-name-input"]');
    expect(document.activeElement).toBe(nameInput);

    nameInput.value = 'Route Flag';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flushUi();

    const idInput = harness.container.querySelector('[data-test="variable-id-input"]');
    expect(idInput.value).toBe('route_flag');
  });

  it('persists inspector edits for name, type, default value, group, and notes under systems.variables', async () => {
    harness = await mountStorySystems();

    harness.container.querySelectorAll('[data-test="variable-row"]')[1]?.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
    }));
    await flushUi();

    const nameInput = harness.container.querySelector('[data-test="variable-name-input"]');
    const numberInput = harness.container.querySelector('[data-test="variable-default-number"]');
    const groupInput = harness.container.querySelector('[data-test="variable-group-input"]');
    const notesInput = harness.container.querySelector('[data-test="variable-notes-input"]');

    nameInput.value = '新樱好感';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    numberInput.value = '9';
    numberInput.dispatchEvent(new Event('input', { bubbles: true }));
    groupInput.value = '主角';
    groupInput.dispatchEvent(new Event('input', { bubbles: true }));
    notesInput.value = '主线关键数值';
    notesInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flushUi();

    expect(harness.script.data.systems.variables.affection).toMatchObject({
      name: '新樱好感',
      type: 'number',
      initial: 9,
      group: '主角',
      notes: '主线关键数值',
    });
  });

  it('renders type-aware defaults and shows the locked duplicate-id error copy', async () => {
    harness = await mountStorySystems();

    const boolRow = harness.container.querySelectorAll('[data-test="variable-row"]')[0];
    boolRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUi();

    expect(harness.container.textContent).toContain('是');
    expect(harness.container.textContent).toContain('否');

    const falseToggle = harness.container.querySelector('[data-test="variable-bool-false"]');
    falseToggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUi();
    expect(harness.script.data.systems.variables.route_locked.initial).toBe(false);

    const numberRow = harness.container.querySelectorAll('[data-test="variable-row"]')[1];
    numberRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUi();

    const numberInput = harness.container.querySelector('[data-test="variable-default-number"]');
    expect(numberInput?.getAttribute('type')).toBe('number');

    const idInput = harness.container.querySelector('[data-test="variable-id-input"]');
    idInput.value = 'route_locked';
    idInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flushUi();

    expect(harness.container.textContent).toContain('变量 ID 已存在，请改用未占用的 ID。');
  });

  it('opens an impact modal before renaming an in-use variable id and applies the rewrite after confirm', async () => {
    harness = await mountStorySystems();

    const numberRow = harness.container.querySelectorAll('[data-test="variable-row"]')[1];
    numberRow.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUi();

    const idInput = harness.container.querySelector('[data-test="variable-id-input"]');
    idInput.value = 'sakura_affection';
    idInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flushUi();

    expect(harness.container.textContent).toContain('将同步更新 2 处引用，确认改为“sakura_affection”吗？');
    expect(harness.container.textContent).toContain('开始 > 第 1 页 > 选项 1 > 效果 1');
    expect(harness.container.textContent).toContain('开始 > 第 2 页 > 条件 2');

    harness.container.querySelector('[data-test="impact-confirm"]')?.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
    }));
    await flushUi();

    expect(harness.script.data.systems.variables.sakura_affection).toBeTruthy();
    expect(harness.container.textContent).toContain('sakura_affection');
  });
});
