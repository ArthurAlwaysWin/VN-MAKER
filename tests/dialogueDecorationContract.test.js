import { describe, expect, it } from 'vitest';

import {
  DIALOGUE_DECORATION_NUMBER_BOUNDS,
  normalizeDialogueDecorationNumber,
} from '../src/shared/dialogueDecorationContract.js';

describe('dialogue decoration numeric contract', () => {
  it('normalizes numeric strings and clamps opacity and rotation', () => {
    expect(DIALOGUE_DECORATION_NUMBER_BOUNDS).toEqual({
      opacity: [0, 1],
      rotation: [-360, 360],
    });
    expect(normalizeDialogueDecorationNumber('opacity', '0.45')).toBe(0.45);
    expect(normalizeDialogueDecorationNumber('opacity', 5)).toBe(1);
    expect(normalizeDialogueDecorationNumber('opacity', -5)).toBe(0);
    expect(normalizeDialogueDecorationNumber('rotation', '45')).toBe(45);
    expect(normalizeDialogueDecorationNumber('rotation', 900)).toBe(360);
    expect(normalizeDialogueDecorationNumber('rotation', -900)).toBe(-360);
  });

  it('rejects empty, non-finite, and unknown values', () => {
    expect(normalizeDialogueDecorationNumber('opacity', '')).toBeUndefined();
    expect(normalizeDialogueDecorationNumber('rotation', Infinity)).toBeUndefined();
    expect(normalizeDialogueDecorationNumber('rotation', 'nope')).toBeUndefined();
    expect(normalizeDialogueDecorationNumber('x', 10)).toBeUndefined();
  });
});
