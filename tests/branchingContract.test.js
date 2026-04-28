import { describe, expect, it } from 'vitest';

import {
  evaluateConditionPage,
  normalizeConditionPage,
} from '../src/shared/branchingContract.js';

describe('branching contract', () => {
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
});
