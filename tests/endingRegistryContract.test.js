import { describe, expect, it } from 'vitest';

import {
  collectEndingUnlockReferences,
  isValidEndingId,
  normalizeEndingRegistry,
} from '../src/shared/endingRegistry.js';

describe('ending registry contract', () => {
  it('normalizes ending entries with stable defaults', () => {
    expect(normalizeEndingRegistry({
      good_end: {
        name: 'Good End',
        order: '2',
        hiddenUntilUnlocked: 1,
      },
    })).toEqual({
      good_end: {
        title: 'Good End',
        category: 'main',
        order: 2,
        description: '',
        hiddenUntilUnlocked: true,
      },
    });
    expect(isValidEndingId('good_end')).toBe(true);
    expect(isValidEndingId('bad id')).toBe(false);
  });

  it('collects unlock references from choice effects', () => {
    const references = collectEndingUnlockReferences({
      scenes: {
        start: {
          name: 'Start',
          pages: [
            {
              type: 'choice',
              options: [
                {
                  text: 'End',
                  effects: [{ type: 'unlock:ending', id: 'good_end' }],
                },
              ],
            },
          ],
        },
      },
    });

    expect(references).toEqual([
      expect.objectContaining({
        kind: 'ending-unlock',
        endingId: 'good_end',
        sceneId: 'start',
        pageIndex: 0,
        optionIndex: 0,
        effectIndex: 0,
        pathString: 'scenes.start.pages.0.options.0.effects.0',
      }),
    ]);
  });
});
