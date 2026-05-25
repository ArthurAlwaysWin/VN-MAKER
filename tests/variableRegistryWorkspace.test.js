/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

const assetMocks = vi.hoisted(() => ({
  selectAsset: vi.fn(),
}));

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
    selectAsset: assetMocks.selectAsset,
  }),
}));

import App from '../src/editor/App.vue';
import StorySystems from '../src/editor/views/StorySystems.vue';
import { useProjectStore } from '../src/editor/stores/project.js';
import { useScriptStore } from '../src/editor/stores/script.js';

function makeScriptData(overrides = {}) {
  return {
    projectId: 'gm_workspace',
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

async function mountStorySystems(scriptData = makeScriptData(), playerProfile = null) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const script = useScriptStore();
  const project = useProjectStore();
  script.loadFromData(scriptData);
  project.playerProfile = playerProfile;
  project.playerProfileStatus = playerProfile ? 'loaded' : 'empty';

  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = createApp(StorySystems);
  app.use(pinia);
  app.mount(container);
  await flushUi();

  return {
    app,
    container,
    project,
    script,
  };
}

async function mountApp(scriptData = makeScriptData(), playerProfile = null) {
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
        case 'load-player-profile':
          return { success: true, data: playerProfile };
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
  await flushUi();

  return {
    app,
    container,
    project: useProjectStore(),
    script: useScriptStore(),
  };
}

describe('variable registry workspace', () => {
  let harness = null;

  beforeEach(() => {
    window.alert = vi.fn();
    assetMocks.selectAsset.mockReset();
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
      label: '新樱好感',
      type: 'number',
      initial: 9,
      group: '主角',
      notes: '主线关键数值',
    });
  });

  it('loads the desktop player profile after opening a project for read-only story system review', async () => {
    const playerProfile = {
      version: 1,
      projectId: 'gm_workspace',
      readHistory: { pages: [] },
      unlocks: { endings: {}, cg: {} },
    };
    harness = await mountApp(makeScriptData(), playerProfile);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('load-player-profile', {
      projectId: 'gm_workspace',
    });
    expect(harness.project.playerProfile).toEqual(playerProfile);
    expect(harness.project.playerProfileStatus).toBe('loaded');

    await harness.project.loadAgentHandoff();
    expect(harness.project.playerProfile).toEqual(playerProfile);
  });

  it('creates a character affection preset through the shared variable normalizer', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const script = useScriptStore();
    script.loadFromData(makeScriptData({
      characters: {
        sakura: {
          name: '樱',
          color: '#ff99aa',
          expressions: {},
        },
      },
      systems: {
        variables: {},
      },
    }));

    const result = script.createAffectionVariable('sakura');

    expect(result).toEqual({
      success: true,
      variableId: 'sakura_affection',
      alreadyExists: false,
    });
    expect(script.selectedVariableId).toBe('sakura_affection');
    expect(script.data.systems.variables.sakura_affection).toMatchObject({
      type: 'number',
      initial: 0,
      label: '樱 Affection',
      group: '好感度',
      kind: 'affection',
      characterId: 'sakura',
      min: 0,
      max: 100,
      step: 1,
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

  it('shows actual ending unlock progress separately from configured unlock points', async () => {
    harness = await mountStorySystems(makeScriptData({
      systems: {
        variables: {},
        endings: {
          good_end: { title: 'Good End', category: 'main', order: 1 },
          bad_end: { title: 'Bad End', category: 'main', order: 2 },
        },
      },
      scenes: {
        start: {
          pages: [{
            type: 'normal',
            dialogues: [{ speaker: null, text: 'Finish' }],
            effects: [{ type: 'unlock:ending', id: 'good_end' }],
          }],
        },
      },
    }), {
      projectId: 'gm_workspace',
      unlocks: {
        endings: {
          good_end: {
            count: 2,
            firstUnlockedAt: 1000,
            lastUnlockedAt: 2000,
          },
        },
        cg: {},
      },
    });

    harness.script.selectEnding('good_end');
    await flushUi();

    expect(harness.container.textContent).toContain('1 解锁点');
    expect(harness.container.textContent).toContain('已解锁 2 次');
    expect(harness.container.textContent).toContain('未解锁');
    expect(harness.container.querySelector('[data-test="ending-profile-status"]').textContent).toContain('玩家进度调试');
    expect(harness.container.querySelector('[data-test="ending-profile-status"]').textContent).toContain('2 次解锁');
  });

  it('rewrites and removes normal page ending unlock references from ending editor actions', async () => {
    harness = await mountStorySystems(makeScriptData({
      systems: {
        variables: {},
        endings: {
          quiet_end: { title: 'Quiet End', category: 'main', order: 1 },
        },
      },
      scenes: {
        ending: {
          name: 'Ending',
          pages: [{
            type: 'normal',
            dialogues: [{ speaker: null, text: 'Finish' }],
            effects: [{ type: 'unlock:ending', id: 'quiet_end' }],
          }],
        },
      },
    }));

    expect(harness.script.findEndingReferences('quiet_end')[0].locationText).toContain('进入页效果 1');

    expect(harness.script.renameEnding('quiet_end', 'peace_end')).toMatchObject({
      success: true,
      rewriteCount: 1,
    });
    expect(harness.script.data.scenes.ending.pages[0].effects[0].id).toBe('peace_end');

    expect(harness.script.deleteEnding('peace_end')).toMatchObject({
      success: true,
      deletedReferenceCount: 1,
    });
    expect(harness.script.data.scenes.ending.pages[0].effects).toBeUndefined();
  });

  it('selects CG images and thumbnails through the project asset picker', async () => {
    harness = await mountStorySystems(makeScriptData({
      systems: {
        variables: {},
        gallery: {
          cg: {
            confession: {
              title: 'Confession',
              images: ['backgrounds/cg/original.png'],
            },
          },
        },
      },
    }));
    harness.script.selectCg('confession');
    await flushUi();

    assetMocks.selectAsset
      .mockResolvedValueOnce('backgrounds/cg/thumb.png')
      .mockResolvedValueOnce('ui/gallery/locked.png')
      .mockResolvedValueOnce('backgrounds/cg/extra.png');

    harness.container.querySelector('[data-test="cg-pick-thumbnail"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUi();
    harness.container.querySelector('[data-test="cg-pick-locked-thumbnail"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUi();
    harness.container.querySelector('[data-test="cg-add-image"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushUi();

    expect(assetMocks.selectAsset).toHaveBeenNthCalledWith(1, ['backgrounds', 'ui']);
    expect(assetMocks.selectAsset).toHaveBeenNthCalledWith(2, ['ui']);
    expect(assetMocks.selectAsset).toHaveBeenNthCalledWith(3, ['backgrounds']);
    expect(harness.script.data.systems.gallery.cg.confession).toMatchObject({
      thumbnail: 'backgrounds/cg/thumb.png',
      lockedThumbnail: 'ui/gallery/locked.png',
      images: ['backgrounds/cg/original.png', 'backgrounds/cg/extra.png'],
    });
  });

  it('shows actual CG unlock progress separately from configured unlock points', async () => {
    harness = await mountStorySystems(makeScriptData({
      systems: {
        variables: {},
        gallery: {
          cg: {
            confession: { title: 'Confession', images: ['backgrounds/cg/confession.png'], order: 1 },
            memory: { title: 'Memory', images: ['backgrounds/cg/memory.png'], order: 2 },
          },
        },
      },
      scenes: {
        start: {
          pages: [{
            type: 'choice',
            options: [{
              text: 'Remember',
              effects: [{ type: 'unlock:cg', id: 'confession' }],
            }],
          }],
        },
      },
    }), {
      projectId: 'gm_workspace',
      unlocks: {
        endings: {},
        cg: {
          confession: {
            count: 3,
            firstUnlockedAt: 1000,
            lastUnlockedAt: 3000,
          },
        },
      },
    });

    harness.script.selectStorySystemsPanel('cgs');
    harness.script.selectCg('confession');
    await flushUi();

    expect(harness.container.textContent).toContain('1 解锁点');
    expect(harness.container.textContent).toContain('已解锁 3 次');
    expect(harness.container.textContent).toContain('未解锁');
    expect(harness.container.querySelector('[data-test="cg-profile-status"]').textContent).toContain('玩家进度调试');
    expect(harness.container.querySelector('[data-test="cg-profile-status"]').textContent).toContain('3 次解锁');
  });
});
