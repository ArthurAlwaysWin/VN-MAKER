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

  it('collects unlock references from page-enter and choice effects', () => {
    const references = collectEndingUnlockReferences({
      scenes: {
        start: {
          name: 'Start',
          pages: [
            {
              type: 'normal',
              effects: [{ type: 'unlock:ending', id: 'arrival_end' }],
            },
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
        source: 'page-enter-effect',
        endingId: 'arrival_end',
        sceneId: 'start',
        pageIndex: 0,
        optionIndex: null,
        effectIndex: 0,
        pathString: 'scenes.start.pages.0.effects.0',
      }),
      expect.objectContaining({
        kind: 'ending-unlock',
        source: 'choice-effect',
        endingId: 'good_end',
        sceneId: 'start',
        pageIndex: 1,
        optionIndex: 0,
        effectIndex: 0,
        pathString: 'scenes.start.pages.1.options.0.effects.0',
      }),
    ]);
  });

  it('rejects prototype keys from the ending registry', () => {
    const normalized = normalizeEndingRegistry(JSON.parse(
      '{"__proto__":{"title":"Hidden"},"constructor":{"title":"Fake"},"good_end":{"title":"Good"}}',
    ));

    expect(isValidEndingId('__proto__')).toBe(false);
    expect(isValidEndingId('constructor')).toBe(false);
    expect(Object.hasOwn(normalized, '__proto__')).toBe(false);
    expect(Object.hasOwn(normalized, 'constructor')).toBe(false);
    expect(normalized.good_end.title).toBe('Good');
  });
});
