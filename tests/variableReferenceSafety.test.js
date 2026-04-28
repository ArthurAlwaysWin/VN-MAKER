import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useScriptStore } from '../src/editor/stores/script.js';

function makeScriptData() {
  return {
    meta: { title: '变量安全测试' },
    characters: {},
    systems: {
      variables: {
        route_locked: {
          name: '路线锁',
          type: 'bool',
          initial: true,
          group: '路线',
        },
        affection: {
          name: '樱好感',
          type: 'number',
          initial: 3,
          group: '角色',
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
                text: '锁定路线',
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
          {
            type: 'condition',
            conditionMode: 'all',
            conditions: [
              { variableId: 'route_locked', operator: '==', value: true },
            ],
            trueTarget: 'locked-route',
            falseTarget: null,
          },
        ],
      },
      'sakura-route': {
        name: '樱线',
        pages: [{ type: 'normal', dialogues: [{ speaker: null, text: '进入樱线', voice: null }] }],
      },
      daily: {
        name: '日常线',
        pages: [{ type: 'normal', dialogues: [{ speaker: null, text: '进入日常', voice: null }] }],
      },
      'locked-route': {
        name: '锁定路线',
        pages: [{ type: 'normal', dialogues: [{ speaker: null, text: '锁定', voice: null }] }],
      },
    },
  };
}

describe('variable reference safety', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('reports exact scene/page/option/condition provenance from one shared reference scanner', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData());

    expect(store.findVariableReferences('route_locked')).toEqual([
      {
        variableId: 'route_locked',
        sceneId: 'start',
        sceneName: '开始',
        pageIndex: 0,
        pageType: 'choice',
        source: 'choice-effect',
        optionIndex: 1,
        effectIndex: 0,
        locationText: '开始 > 第 1 页 > 选项 2 > 效果 1',
      },
      {
        variableId: 'route_locked',
        sceneId: 'start',
        sceneName: '开始',
        pageIndex: 1,
        pageType: 'condition',
        source: 'condition',
        conditionIndex: 0,
        locationText: '开始 > 第 2 页 > 条件 1',
      },
      {
        variableId: 'route_locked',
        sceneId: 'start',
        sceneName: '开始',
        pageIndex: 2,
        pageType: 'condition',
        source: 'condition',
        conditionIndex: 0,
        locationText: '开始 > 第 3 页 > 条件 1',
      },
    ]);
  });

  it('previews and transactionally rewrites every supported reference site during rename', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData());

    const preview = store.renameVariable('affection', 'sakura_affection', { previewOnly: true });
    expect(preview.rewriteCount).toBe(2);

    const result = store.renameVariable('affection', 'sakura_affection');
    expect(result).toMatchObject({
      success: true,
      variableId: 'sakura_affection',
      rewriteCount: 2,
    });
    expect(store.data.systems.variables.sakura_affection).toBeTruthy();
    expect(store.data.systems.variables.affection).toBeUndefined();
    expect(store.data.scenes.start.pages[0].options[0].effects[0].id).toBe('sakura_affection');
    expect(store.data.scenes.start.pages[1].conditions[1].variableId).toBe('sakura_affection');
  });

  it('deletes an in-use variable by clearing choice effects and condition rows instead of leaving stale ids behind', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData());

    const preview = store.deleteVariable('affection', { previewOnly: true });
    expect(preview.cleanupCount).toBe(2);

    const result = store.deleteVariable('affection');
    expect(result).toMatchObject({
      success: true,
      deletedReferenceCount: 2,
    });
    expect(store.data.systems.variables.affection).toBeUndefined();
    expect(store.data.scenes.start.pages[0].options[0].effects ?? []).toEqual([]);
    expect(store.data.scenes.start.pages[1].conditions).toEqual([
      { variableId: 'route_locked', operator: '==', value: false },
    ]);
  });

  it('marks invalid condition pages and blocks saving when delete leaves zero valid condition rows', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData());

    const result = store.deleteVariable('route_locked');
    expect(result.success).toBe(true);
    expect(result.invalidConditionCount).toBe(1);
    expect(store.canSaveConditionPages).toBe(false);
    expect(store.conditionPageIssues).toEqual([
      expect.objectContaining({
        sceneId: 'start',
        pageIndex: 2,
        variableId: 'route_locked',
      }),
    ]);
    expect(store.data.scenes.start.pages[2].unresolvedCondition).toEqual({
      type: 'deleted-variable',
      variableId: 'route_locked',
    });
  });
});
