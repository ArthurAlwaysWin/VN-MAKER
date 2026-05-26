import { describe, expect, it } from 'vitest';

import {
  collectCgUnlockReferences,
  isValidCgId,
  normalizeCgRegistry,
} from '../src/shared/cgRegistry.js';

describe('CG registry contract', () => {
  it('normalizes gallery entries and upgrades a legacy single image field', () => {
    expect(normalizeCgRegistry({
      confession: {
        name: 'Confession',
        image: 'backgrounds/cg/confession.png',
        order: '2',
      },
    })).toEqual({
      confession: {
        title: 'Confession',
        images: ['backgrounds/cg/confession.png'],
        thumbnail: 'backgrounds/cg/confession.png',
        category: 'main',
        order: 2,
        description: '',
      },
    });
    expect(isValidCgId('cg_confession')).toBe(true);
    expect(isValidCgId('bad id')).toBe(false);
  });

  it('collects unlock references from choice effects', () => {
    expect(collectCgUnlockReferences({
      scenes: {
        start: {
          pages: [{
            type: 'choice',
            options: [{
              effects: [{ type: 'unlock:cg', id: 'cg_confession' }],
            }],
          }],
        },
      },
    })).toEqual([
      expect.objectContaining({
        kind: 'cg-unlock',
        cgId: 'cg_confession',
        sceneId: 'start',
        pageIndex: 0,
        optionIndex: 0,
        effectIndex: 0,
        pathString: 'scenes.start.pages.0.options.0.effects.0',
      }),
    ]);
  });

  it('collects unlock references from normal page-enter effects', () => {
    expect(collectCgUnlockReferences({
      scenes: {
        ending: {
          name: 'Ending',
          pages: [{
            type: 'normal',
            effects: [{ type: 'unlock:cg', id: 'cg_memory' }],
          }],
        },
      },
    })).toEqual([
      expect.objectContaining({
        source: 'page-enter-effect',
        cgId: 'cg_memory',
        sceneId: 'ending',
        pageIndex: 0,
        optionIndex: null,
        effectIndex: 0,
        pathString: 'scenes.ending.pages.0.effects.0',
      }),
    ]);
  });

  it('rejects prototype keys from the CG registry', () => {
    const normalized = normalizeCgRegistry(JSON.parse(
      '{"__proto__":{"image":"bad.png"},"constructor":{"image":"bad2.png"},"cg_safe":{"image":"safe.png"}}',
    ));

    expect(isValidCgId('__proto__')).toBe(false);
    expect(isValidCgId('constructor')).toBe(false);
    expect(Object.hasOwn(normalized, '__proto__')).toBe(false);
    expect(Object.hasOwn(normalized, 'constructor')).toBe(false);
    expect(normalized.cg_safe.images).toEqual(['safe.png']);
  });
});
