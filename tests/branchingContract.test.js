import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import {
  compareConditionValues,
  evaluateConditionPage,
  getConditionInputRows,
  isBooleanConditionValue,
  isNumberConditionValue,
  normalizeConditionPage,
} from '../src/shared/branchingContract.js';
import { useScriptStore } from '../src/editor/stores/script.js';

describe('branching contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('normalizes legacy single-condition pages into the canonical shape while leaving canonical pages unchanged', () => {
    const legacy = normalizeConditionPage({
      type: 'condition',
      variable: 'route_locked',
      operator: '==',
      value: true,
      trueTarget: 'route_start',
      falseTarget: 'fallback_scene',
    });

    expect(legacy).toEqual({
      type: 'condition',
      conditionMode: 'all',
      conditions: [
        {
          variableId: 'route_locked',
          operator: '==',
          value: true,
        },
      ],
      trueTarget: 'route_start',
      falseTarget: 'fallback_scene',
    });

    const canonical = {
      type: 'condition',
      conditionMode: 'any',
      conditions: [
        {
          variableId: 'affection',
          operator: '>=',
          value: 5,
        },
        {
          variableId: 'route_locked',
          operator: '==',
          value: true,
        },
      ],
      trueTarget: 'good_end',
      falseTarget: null,
    };

    expect(normalizeConditionPage(canonical)).toEqual(canonical);
  });

  it('evaluates only the locked operator set across all/any canonical condition rows', () => {
    const variables = new Map([
      ['route_locked', true],
      ['affection', 4],
      ['chapter', 2],
    ]);

    expect(evaluateConditionPage({
      type: 'condition',
      conditionMode: 'all',
      conditions: [
        { variableId: 'route_locked', operator: '==', value: true },
        { variableId: 'affection', operator: '>=', value: 4 },
        { variableId: 'chapter', operator: '<=', value: 2 },
      ],
    }, { variables })).toBe(true);

    expect(evaluateConditionPage({
      type: 'condition',
      conditionMode: 'all',
      conditions: [
        { variableId: 'route_locked', operator: '!=', value: true },
        { variableId: 'affection', operator: '>', value: 10 },
      ],
    }, { variables })).toBe(false);

    expect(evaluateConditionPage({
      type: 'condition',
      conditionMode: 'any',
      conditions: [
        { variableId: 'route_locked', operator: '!=', value: true },
        { variableId: 'affection', operator: '>', value: 3 },
      ],
    }, { variables })).toBe(true);

    expect(evaluateConditionPage({
      type: 'condition',
      conditionMode: 'any',
      conditions: [
        { variableId: 'route_locked', operator: '<', value: false },
        { variableId: 'affection', operator: '>', value: 10 },
      ],
    }, { variables })).toBe(false);
  });

  it('keeps string false as false for bool condition rows', () => {
    const registry = {
      route_locked: {
        type: 'bool',
        initial: false,
      },
    };

    const page = normalizeConditionPage({
      type: 'condition',
      conditions: [
        { variableId: 'route_locked', operator: '==', value: 'false' },
      ],
    }, { registry });

    expect(page.conditions[0].value).toBe(false);
    expect(evaluateConditionPage(page, {
      registry,
      variables: new Map([['route_locked', false]]),
    })).toBe(true);
  });

  it('shares raw condition row and value compatibility helpers across consumers', () => {
    expect(getConditionInputRows({
      variable: 'legacy_flag',
      operator: '==',
      value: 'false',
    })).toEqual([{
      variableId: 'legacy_flag',
      operator: '==',
      value: 'false',
    }]);
    expect(isBooleanConditionValue('off')).toBe(true);
    expect(isBooleanConditionValue('maybe')).toBe(false);
    expect(isNumberConditionValue('3.5')).toBe(true);
    expect(isNumberConditionValue(null)).toBe(false);
    expect(compareConditionValues(4, '>=', 3)).toBe(true);
  });

  it('normalizes incoming choice effects and condition pages before the first history snapshot is saved', () => {
    const store = useScriptStore();

    store.loadFromData({
      characters: {},
      systems: {
        variables: {
          route_locked: {
            type: 'bool',
            initial: false,
          },
        },
      },
      scenes: {
        start: {
          name: '开始',
          pages: [
            {
              type: 'choice',
              prompt: '去哪里？',
              options: [
                {
                  text: '去天台',
                  target: 'roof',
                  setVariable: {
                    affection: 2,
                  },
                },
              ],
            },
            {
              type: 'condition',
              variable: 'route_locked',
              operator: '==',
              value: false,
              trueTarget: 'roof',
              falseTarget: null,
            },
          ],
        },
      },
    });

    expect(store.data.scenes.start.pages[0].options).toEqual([
      {
        text: '去天台',
        target: 'roof',
        effects: [
          {
            type: 'var:add',
            id: 'affection',
            value: 2,
          },
        ],
      },
    ]);
    expect(store.data.scenes.start.pages[1]).toEqual({
      type: 'condition',
      conditionMode: 'all',
      conditions: [
        {
          variableId: 'route_locked',
          operator: '==',
          value: false,
        },
      ],
      trueTarget: 'roof',
      falseTarget: null,
    });
    expect(store.history[0].scenes.start.pages[1]).toEqual({
      type: 'condition',
      conditionMode: 'all',
      conditions: [
        {
          variableId: 'route_locked',
          operator: '==',
          value: false,
        },
      ],
      trueTarget: 'roof',
      falseTarget: null,
    });
  });
});
