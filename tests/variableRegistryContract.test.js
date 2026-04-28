import { describe, expect, it } from 'vitest';

import {
  collectVariableReferences,
  getVariableInitialValue,
  normalizeVariableRegistry,
  seedRuntimeVariablesFromRegistry,
} from '../src/shared/variableRegistry.js';

describe('variableRegistry contract', () => {
  it('preserves systems.variables as a canonical object-map keyed by variable id and clamps entries to bool/number', () => {
    const normalized = normalizeVariableRegistry({
      route_locked: {
        label: '锁定路线',
        type: 'bool',
        initial: 1,
        group: '路线',
        notes: 'legacy truthy bool',
      },
      affection: {
        label: '樱好感',
        type: 'number',
        initial: '7',
        group: '角色',
      },
      legacy_text: {
        label: '旧文本变量',
        type: 'string',
        initial: 'hello',
      },
    });

    expect(normalized).toEqual({
      route_locked: {
        label: '锁定路线',
        type: 'bool',
        initial: true,
        group: '路线',
        notes: 'legacy truthy bool',
      },
      affection: {
        label: '樱好感',
        type: 'number',
        initial: 7,
        group: '角色',
      },
      legacy_text: {
        label: '旧文本变量',
        type: 'number',
        initial: 0,
      },
    });

    const refs = collectVariableReferences({
      scenes: {
        start: {
          name: '开始',
          pages: [
            {
              type: 'choice',
              options: [
                {
                  text: '答应她',
                  effects: [{ type: 'var:add', id: 'affection', value: 1 }],
                },
              ],
            },
            {
              type: 'condition',
              variable: 'route_locked',
              operator: '==',
              value: true,
              trueTarget: 'good',
              falseTarget: 'bad',
            },
          ],
        },
      },
    });

    expect(refs).toEqual([
      {
        variableId: 'affection',
        sceneId: 'start',
        sceneName: '开始',
        pageIndex: 0,
        pageType: 'choice',
        source: 'choice-effect',
        optionIndex: 0,
        effectIndex: 0,
      },
      {
        variableId: 'route_locked',
        sceneId: 'start',
        sceneName: '开始',
        pageIndex: 1,
        pageType: 'condition',
        source: 'condition',
        conditionIndex: 0,
      },
    ]);
  });

  it('derives stable bool/number defaults and seeds runtime maps without inventing string behavior', () => {
    const registry = normalizeVariableRegistry({
      route_locked: {
        type: 'bool',
        initial: true,
      },
      affection: {
        type: 'number',
        initial: 3,
      },
      fallback_bool: {
        type: 'bool',
      },
      fallback_number: {
        type: 'number',
      },
      coerced_invalid: {
        type: 'string',
        initial: 'hello',
      },
    });

    expect(getVariableInitialValue(registry.route_locked)).toBe(true);
    expect(getVariableInitialValue(registry.affection)).toBe(3);
    expect(getVariableInitialValue(registry.fallback_bool)).toBe(false);
    expect(getVariableInitialValue(registry.fallback_number)).toBe(0);
    expect(getVariableInitialValue(registry.coerced_invalid)).toBe(0);

    expect(seedRuntimeVariablesFromRegistry(registry)).toEqual(new Map([
      ['route_locked', true],
      ['affection', 3],
      ['fallback_bool', false],
      ['fallback_number', 0],
      ['coerced_invalid', 0],
    ]));
  });
});
