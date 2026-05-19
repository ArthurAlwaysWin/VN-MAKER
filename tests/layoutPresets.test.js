import { describe, expect, it } from 'vitest';

import {
  createCharacterBlocking,
  createLayoutPreset,
  LAYOUT_PRESETS,
} from '../src/authoring/layoutPresets.js';

describe('agent layout presets', () => {
  it('exports the initial named preset list', () => {
    expect(LAYOUT_PRESETS).toEqual([
      'solo-center',
      'duo-left-right',
      'trio-left-center-right',
      'speaker-emphasis',
      'narration-no-character',
      'choice-focus',
    ]);
  });

  it('creates canonical blocking for one, two, and three characters', () => {
    expect(createCharacterBlocking(['sakura'], { sakura: 'smile' })).toEqual([
      { id: 'sakura', expression: 'smile', position: 'center', x: null, y: null, scale: 1 },
    ]);

    expect(createCharacterBlocking(['sakura', 'haruki'])).toEqual([
      { id: 'sakura', expression: 'normal', position: 'left', x: null, y: null, scale: 1 },
      { id: 'haruki', expression: 'normal', position: 'right', x: null, y: null, scale: 1 },
    ]);

    expect(createCharacterBlocking(['a', 'b', 'c', 'd'])).toEqual([
      { id: 'a', expression: 'normal', position: 'left', x: null, y: null, scale: 1 },
      { id: 'b', expression: 'normal', position: 'center', x: null, y: null, scale: 1 },
      { id: 'c', expression: 'normal', position: 'right', x: null, y: null, scale: 1 },
    ]);
  });

  it('supports speaker emphasis and narration presets', () => {
    expect(createLayoutPreset('speaker-emphasis', ['sakura', 'haruki', 'mio'], {}, {
      speakerId: 'haruki',
    })).toEqual([
      { id: 'sakura', expression: 'normal', position: 'left', x: null, y: null, scale: 0.92 },
      { id: 'haruki', expression: 'normal', position: 'center', x: null, y: null, scale: 1.08 },
      { id: 'mio', expression: 'normal', position: 'right', x: null, y: null, scale: 0.92 },
    ]);

    expect(createLayoutPreset('narration-no-character', ['sakura'])).toEqual([]);
  });
});
