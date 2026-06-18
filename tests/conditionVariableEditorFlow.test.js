/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

import SceneTree from '../src/editor/components/page-editor/SceneTree.vue';
import PageInspector from '../src/editor/components/page-editor/PageInspector.vue';
import VariablePickerField from '../src/editor/components/page-editor/VariablePickerField.vue';
import { createPageEditor } from '../src/editor/composables/usePageEditor.js';
import { useScriptStore } from '../src/editor/stores/script.js';
import { getPageTypeConversionWarning } from '../src/editor/utils/pageTypeConversion.js';

function makeScriptData(page) {
  const canonicalPage = {
    background: null,
    characters: [],
    bgm: null,
    se: null,
    transition: { type: 'fade', duration: 800 },
    ...page,
  };
  return {
    meta: { title: 'Condition editor flow' },
    characters: {},
    systems: {
      variables: {
        route_locked: { name: '路线锁', type: 'bool', initial: false, group: '路线' },
        affection: { name: '樱好感', type: 'number', initial: 0, group: '角色' },
        protagonist_name: { name: '主角名', type: 'string', initial: '', group: '系统' },
      },
      endings: { good: { title: '好结局' } },
      gallery: { cg: { confession: { title: '告白' } } },
    },
    scenes: {
      start: { name: '开始', pages: [canonicalPage] },
      sakura: { name: '樱线', pages: [] },
      daily: { name: '日常线', pages: [] },
    },
  };
}

function mountWithEditor(Component, scriptData) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const script = useScriptStore();
  script.loadFromData(scriptData);

  const container = document.createElement('div');
  document.body.appendChild(container);
  let editor;
  const app = createApp({
    setup() {
      editor = createPageEditor();
      editor.initSelection();
      return () => h(Component);
    },
  });
  app.use(pinia);
  app.mount(container);
  return { app, container, editor, script };
}

function findMenuItem(text) {
  return [...document.querySelectorAll('.context-menu .menu-item')]
    .find((item) => item.textContent.trim().replace(/^✓\s*/, '') === text);
}

describe('condition and variable editor flow', () => {
  let harness;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.stubGlobal('Audio', class {
      addEventListener() {}
      load() {}
      pause() {}
      play() { return Promise.resolve(); }
      removeAttribute() {}
    });
  });

  afterEach(() => {
    harness?.app.unmount();
    harness = null;
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('defines a confirmation for every destructive normal/choice/condition direction', () => {
    for (const [from, target] of [
      ['normal', 'choice'],
      ['normal', 'condition'],
      ['choice', 'normal'],
      ['choice', 'condition'],
      ['condition', 'normal'],
      ['condition', 'choice'],
    ]) {
      expect(getPageTypeConversionWarning(from, target)).toMatch(/^转换为.+将丢弃.+，确定继续？$/);
    }
    expect(getPageTypeConversionWarning('condition', 'condition')).toBeNull();
  });

  it('renders the shared condition summary in SceneTree and converts through setPageType only after confirmation', async () => {
    harness = mountWithEditor(SceneTree, makeScriptData({
      id: 'condition-1',
      type: 'condition',
      conditionMode: 'all',
      conditions: [
        { variableId: 'route_locked', operator: '==', value: true },
        { variableId: 'affection', operator: '>=', value: 5 },
      ],
      trueTarget: 'sakura',
      falseTarget: 'daily',
    }));
    const setPageType = vi.spyOn(harness.script, 'setPageType');
    await nextTick();

    expect(document.querySelector('.page-snippet')?.textContent).toBe(
      '若 路线锁 == 是 且 樱好感 >= 5 → 樱线，否则 → 日常线',
    );

    const pageItem = document.querySelector('.page-item');
    pageItem.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));
    await nextTick();
    expect(['转换为普通页', '转换为选择页', '转换为条件页'].every((label) => findMenuItem(label))).toBe(true);

    findMenuItem('转换为条件页').click();
    await nextTick();
    expect(confirm).not.toHaveBeenCalled();
    expect(setPageType).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(false);
    pageItem.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    await nextTick();
    findMenuItem('转换为普通页').click();
    expect(harness.script.data.scenes.start.pages[0].type).toBe('condition');

    confirm.mockReturnValueOnce(true);
    pageItem.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    await nextTick();
    findMenuItem('转换为普通页').click();
    await nextTick();
    expect(setPageType).toHaveBeenCalledWith('start', 0, 'normal');
    expect(harness.script.data.scenes.start.pages[0].type).toBe('normal');
  });

  it('keeps ending and CG effects while editing a variable effect and routes missing variables to repair', async () => {
    harness = mountWithEditor(PageInspector, makeScriptData({
      id: 'choice-1',
      type: 'choice',
      prompt: '选择',
      options: [{
        text: '继续',
        target: 'sakura',
        effects: [
          { type: 'var:set', id: 'missing_variable', value: 1 },
          { type: 'unlock:ending', id: 'good' },
          { type: 'unlock:cg', id: 'confession' },
        ],
      }],
    }));

    const effectSection = [...document.querySelectorAll('.choice-effects')]
      .find((section) => section.querySelector('.variable-picker'));
    const repairButton = effectSection.querySelector('.missing-variable-warning button');
    repairButton.click();
    expect(harness.script.storySystemsRepairRequest).toMatchObject({
      source: 'missing-variable-reference',
      variableId: 'missing_variable',
    });

    const variableSelect = effectSection.querySelector('.variable-select');
    variableSelect.value = 'protagonist_name';
    variableSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    expect(harness.script.data.scenes.start.pages[0].options[0].effects).toEqual([
      { type: 'var:set', id: 'protagonist_name', value: '1' },
      { type: 'unlock:ending', id: 'good' },
      { type: 'unlock:cg', id: 'confession' },
    ]);
  });

  it('guards the PageInspector type selector with the same destructive confirmation', async () => {
    harness = mountWithEditor(PageInspector, makeScriptData({
      id: 'normal-1',
      type: 'normal',
      dialogues: [{ speaker: null, text: 'Keep me until confirmed', expression: null, voice: null }],
    }));
    const typeSelect = document.querySelector('.page-inspector .inspector-section select.field-input');

    confirm.mockReturnValueOnce(false);
    typeSelect.value = 'choice';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(harness.script.data.scenes.start.pages[0].type).toBe('normal');
    expect(harness.script.data.scenes.start.pages[0].dialogues[0].text).toBe('Keep me until confirmed');

    confirm.mockReturnValueOnce(true);
    typeSelect.value = 'choice';
    typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();
    expect(harness.script.data.scenes.start.pages[0].type).toBe('choice');
    expect(harness.script.data.scenes.start.pages[0].dialogues).toBeUndefined();
  });

  it('filters variables by display name, id, type, or group', async () => {
    const pinia = createPinia();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const app = createApp(VariablePickerField, {
      modelValue: '',
      variables: [
        { id: 'route_locked', label: '路线锁', type: 'bool', group: '路线' },
        { id: 'affection', label: '樱好感', type: 'number', group: '角色' },
      ],
    });
    app.use(pinia);
    app.mount(container);
    harness = { app };

    const search = document.querySelector('.variable-search');
    search.value = '角色';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    const optionTexts = [...document.querySelectorAll('.variable-select option')].map((option) => option.textContent);
    expect(optionTexts).toHaveLength(2);
    expect(optionTexts[1]).toContain('樱好感');
  });

  it('treats same-type setPageType as a history-preserving no-op', () => {
    setActivePinia(createPinia());
    const script = useScriptStore();
    script.loadFromData(makeScriptData({
      type: 'condition',
      conditionMode: 'any',
      conditions: [{ variableId: 'route_locked', operator: '==', value: true }],
      trueTarget: 'sakura',
      falseTarget: 'daily',
    }));
    const before = JSON.parse(JSON.stringify(script.data.scenes.start.pages[0]));

    expect(script.setPageType('start', 0, 'condition')).toBe(false);
    expect(script.data.scenes.start.pages[0]).toEqual(before);
    expect(script.history).toHaveLength(1);
  });
});
