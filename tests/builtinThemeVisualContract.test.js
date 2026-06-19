import { describe, expect, it } from 'vitest';

import { BUILTIN_THEMES } from '../src/editor/builtinThemes.js';

const SHIPPED_BUILTIN_IDS = Object.freeze([
  'default',
  'wafuu',
  'modern-sky',
  'fantasy-dark',
  'minimal-white',
  'alchemy-rose',
]);

describe('built-in theme visual contract', () => {
  it('requires explicit preview metadata and visual signatures for every shipped built-in', () => {
    const shippedThemes = SHIPPED_BUILTIN_IDS.map(id => BUILTIN_THEMES.find(theme => theme.id === id));

    for (const theme of shippedThemes) {
      expect(theme).toBeTruthy();
      expect(theme.preview).toMatchObject({
        mode: expect.any(String),
        src: expect.any(String),
        background: expect.any(String),
        accent: expect.any(String),
      });
      expect(theme.visualSignature).toMatchObject({
        materialLanguage: expect.any(String),
        contourLanguage: expect.any(String),
        styleDirection: expect.any(String),
        requiredTells: {
          titleScreen: expect.any(String),
          dialogueBox: expect.any(String),
          buttonFamily: expect.any(String),
          majorScreenChrome: expect.any(String),
        },
      });
    }
  });
});
