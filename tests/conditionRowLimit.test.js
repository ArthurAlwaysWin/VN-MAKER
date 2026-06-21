import { describe, expect, it } from 'vitest';
import { MAX_CONDITION_ROWS, canAddConditionRow } from '../src/editor/utils/conditionRowLimit.js';

describe('condition row editor limit', () => {
  it('allows rows below the limit and rejects the exact boundary', () => {
    expect(MAX_CONDITION_ROWS).toBe(3);
    expect(canAddConditionRow(undefined)).toBe(true);
    expect(canAddConditionRow(Array(MAX_CONDITION_ROWS - 1).fill({}))).toBe(true);
    expect(canAddConditionRow(Array(MAX_CONDITION_ROWS).fill({}))).toBe(false);
  });
});
