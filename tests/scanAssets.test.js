/**
 * scanAssets — Unit tests for asset reference extraction.
 *
 * Covers all 11 path locations in script.json across 9 describe blocks:
 *   return shape, character expressions, scene page assets, fonts,
 *   UI screens, filtering, deduplication, sorting, graceful handling.
 *
 * Uses Node.js built-in test runner (node:test + node:assert/strict).
 * Run with: node --test tests/scanAssets.test.js
 */

import { describe, it } from 'node:test';
import { deepStrictEqual, ok } from 'node:assert/strict';
import { scanAssets } from '../src/engine/scanAssets.js';

// ─── Test Fixture ────────────────────────────────────────

/**
 * Comprehensive script object covering all 11 path locations
 * plus edge cases (data: URIs, mixed element types, bare string BGM).
 */
const fullScript = {
  characters: {
    hero: {
      name: 'Hero',
      expressions: {
        normal: 'characters/hero_normal.png',
        happy: 'characters/hero_happy.png',
      },
    },
    villain: {
      name: 'Villain',
      expressions: {
        normal: 'characters/villain_normal.png',
      },
    },
  },
  scenes: {
    intro: {
      pages: [
        {
          background: 'backgrounds/city.png',
          bgm: { file: 'audio/bgm1.mp3', volume: 0.8 },
          se: { file: 'audio/click.mp3' },
          characters: [],
          dialogues: [
            { speaker: 'hero', text: 'Hello', voice: 'audio/voice01.ogg' },
            { speaker: 'hero', text: 'World' },
          ],
        },
        {
          background: 'backgrounds/park.png',
          bgm: { file: 'audio/bgm1.mp3', volume: 0.5 },
          characters: [],
          dialogues: [
            { speaker: 'villain', text: 'Ha', voice: 'audio/voice02.ogg' },
          ],
        },
      ],
    },
  },
  assets: {
    fonts: [
      { family: 'CustomFont', file: 'fonts/custom.ttf' },
      { family: 'AnotherFont', file: 'fonts/another.woff2' },
    ],
  },
  ui: {
    saveLoadScreen: {
      background: 'ui/save-bg.png',
      header: {
        backgroundImage: 'ui/save-header.png',
      },
      slot: {
        backgroundImage: 'ui/save-slot.png',
      },
    },
    backlogScreen: {
      backgroundImage: 'ui/backlog-bg.png',
      header: {
        backgroundImage: 'ui/backlog-header.png',
      },
    },
    gameMenu: {
      backgroundImage: 'ui/game-menu-bg.png',
      buttons: {
        save: { icon: 'ui/icons/save.png' },
      },
    },
    titleScreen: {
      background: 'backgrounds/title.png',
      bgm: 'audio/title_bgm.mp3',
      elements: [
        { type: 'button', text: 'Start' },
        { type: 'image', src: 'backgrounds/logo.png' },
      ],
    },
    settingsScreen: {
      background: 'backgrounds/settings_bg.png',
      header: {
        backgroundImage: 'ui/settings-header.png',
        decorations: [
          { src: 'ui/decor-star.png' },
        ],
      },
      tabBar: {
        tabs: [{ label: '音量', icon: 'ui/icons/tab-audio.png' }],
      },
      elements: [
        { type: 'slider', label: 'Volume' },
        { type: 'image', src: 'backgrounds/deco.png' },
      ],
    },
    theme: {
      nineSlice: {
        dialogueBox: { src: 'data:image/png;base64,abc123' },
        choiceButton: {
          src: 'ui/nine-choice.png',
          states: {
            hover: { src: 'ui/nine-choice-hover.png' },
            active: { src: 'ui/nine-choice-active.png' },
          },
        },
      },
    },
    widgetStyles: {
      tab: {
        activeBackgroundImage: 'ui/tab-active.png',
        nineSlice: { src: 'ui/tab-ribbon.png' },
      },
      slider: {
        thumbImage: 'ui/slider-thumb.png',
        trackImage: 'ui/slider-track.png',
      },
      panel: {
        backgroundImage: 'ui/panel-bg.png',
      },
      button: {
        nineSlice: { src: 'ui/button-nine.png' },
      },
    },
    dialogueBox: {
      nameplateBackgroundImage: 'ui/dialogue/nameplate.webp',
      decorations: [
        { src: 'ui/dialogue/decor-flower.webp', x: 12, y: -8, width: 144, height: 96 },
        { src: 'legacy/dialogue/decor-old.png', x: 0, y: 0, width: 80, height: 80 },
        { src: '', x: 0, y: 0, width: 0, height: 0 },
      ],
    },
  },
};

// ─── Expected Full Output ────────────────────────────────

const expectedFull = {
  backgrounds: [
    'backgrounds/city.png',
    'backgrounds/deco.png',
    'backgrounds/logo.png',
    'backgrounds/park.png',
    'backgrounds/settings_bg.png',
    'backgrounds/title.png',
  ],
  audio: [
    'audio/bgm1.mp3',
    'audio/click.mp3',
    'audio/title_bgm.mp3',
  ],
  fonts: [
    'fonts/another.woff2',
    'fonts/custom.ttf',
  ],
  characters: [
    'characters/hero_happy.png',
    'characters/hero_normal.png',
    'characters/villain_normal.png',
  ],
  voices: [
    'audio/voice01.ogg',
    'audio/voice02.ogg',
  ],
  ui: [
    'ui/backlog-bg.png',
    'ui/backlog-header.png',
    'ui/button-nine.png',
    'ui/decor-star.png',
    'ui/dialogue/decor-flower.webp',
    'ui/dialogue/nameplate.webp',
    'ui/game-menu-bg.png',
    'ui/icons/save.png',
    'ui/icons/tab-audio.png',
    'ui/nine-choice-active.png',
    'ui/nine-choice-hover.png',
    'ui/nine-choice.png',
    'ui/panel-bg.png',
    'ui/save-bg.png',
    'ui/save-header.png',
    'ui/save-slot.png',
    'ui/settings-header.png',
    'ui/slider-thumb.png',
    'ui/slider-track.png',
    'ui/tab-active.png',
    'ui/tab-ribbon.png',
  ],
};

// ─── Tests ───────────────────────────────────────────────

describe('return shape', () => {
  it('returns an object with exactly 6 keys', () => {
    const result = scanAssets(fullScript);
    const keys = Object.keys(result).sort();
    deepStrictEqual(keys, ['audio', 'backgrounds', 'characters', 'fonts', 'ui', 'voices']);
  });

  it('each value is an array', () => {
    const result = scanAssets(fullScript);
    for (const key of ['backgrounds', 'audio', 'fonts', 'characters', 'voices', 'ui']) {
      ok(Array.isArray(result[key]), `${key} should be an array`);
    }
  });

  it('each array contains only strings', () => {
    const result = scanAssets(fullScript);
    for (const key of ['backgrounds', 'audio', 'fonts', 'characters', 'voices', 'ui']) {
      for (const item of result[key]) {
        ok(typeof item === 'string', `${key} item "${item}" should be a string`);
      }
    }
  });

  it('matches full expected output', () => {
    const result = scanAssets(fullScript);
    deepStrictEqual(result, expectedFull);
  });
});

describe('character expressions', () => {
  it('extracts all character expression paths sorted', () => {
    const result = scanAssets(fullScript);
    deepStrictEqual(result.characters, [
      'characters/hero_happy.png',
      'characters/hero_normal.png',
      'characters/villain_normal.png',
    ]);
  });

  it('handles character with no expressions', () => {
    const script = {
      characters: {
        npc: { name: 'NPC' },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.characters, []);
  });

  it('handles character with empty expressions object', () => {
    const script = {
      characters: {
        npc: { name: 'NPC', expressions: {} },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.characters, []);
  });
});

describe('scene page assets', () => {
  it('extracts page backgrounds', () => {
    const result = scanAssets(fullScript);
    ok(result.backgrounds.includes('backgrounds/city.png'));
    ok(result.backgrounds.includes('backgrounds/park.png'));
  });

  it('extracts page BGM (object with .file)', () => {
    const result = scanAssets(fullScript);
    ok(result.audio.includes('audio/bgm1.mp3'));
  });

  it('extracts page SE (object with .file)', () => {
    const result = scanAssets(fullScript);
    ok(result.audio.includes('audio/click.mp3'));
  });

  it('extracts dialogue voice paths', () => {
    const result = scanAssets(fullScript);
    deepStrictEqual(result.voices, ['audio/voice01.ogg', 'audio/voice02.ogg']);
  });

  it('handles dialogue without voice field', () => {
    const script = {
      scenes: {
        s1: {
          pages: [{
            dialogues: [
              { speaker: 'hero', text: 'No voice here' },
            ],
          }],
        },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.voices, []);
  });

  it('handles page without bgm and se', () => {
    const script = {
      scenes: {
        s1: {
          pages: [{
            background: 'backgrounds/test.png',
            dialogues: [],
          }],
        },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.backgrounds, ['backgrounds/test.png']);
    deepStrictEqual(result.audio, []);
  });
});

describe('fonts', () => {
  it('extracts all font file paths sorted', () => {
    const result = scanAssets(fullScript);
    deepStrictEqual(result.fonts, [
      'fonts/another.woff2',
      'fonts/custom.ttf',
    ]);
  });

  it('handles font entry without file field', () => {
    const script = {
      assets: {
        fonts: [
          { family: 'NoFile' },
          { family: 'HasFile', file: 'fonts/valid.ttf' },
        ],
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.fonts, ['fonts/valid.ttf']);
  });
});

describe('UI screens', () => {
  it('extracts titleScreen background', () => {
    const result = scanAssets(fullScript);
    ok(result.backgrounds.includes('backgrounds/title.png'));
  });

  it('extracts titleScreen.bgm as bare string (not .file)', () => {
    const result = scanAssets(fullScript);
    ok(result.audio.includes('audio/title_bgm.mp3'));
  });

  it('extracts titleScreen image element src', () => {
    const result = scanAssets(fullScript);
    ok(result.backgrounds.includes('backgrounds/logo.png'));
  });

  it('extracts settingsScreen background', () => {
    const result = scanAssets(fullScript);
    ok(result.backgrounds.includes('backgrounds/settings_bg.png'));
  });

  it('extracts settingsScreen image element src', () => {
    const result = scanAssets(fullScript);
    ok(result.backgrounds.includes('backgrounds/deco.png'));
  });

  it('ignores non-image elements (button, slider)', () => {
    const script = {
      ui: {
        titleScreen: {
          elements: [
            { type: 'button', text: 'Start' },
            { type: 'slider', label: 'Volume' },
            { type: 'text', content: 'Hello' },
          ],
        },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.backgrounds, []);
  });

  it('does not extract settingsScreen.bgm (only titleScreen has bgm)', () => {
    const script = {
      ui: {
        settingsScreen: {
          background: 'backgrounds/settings.png',
          bgm: 'audio/should_not_appear.mp3',
          elements: [],
        },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.audio, []);
  });

  it('collects runtime-supported UI image fields into the ui bucket', () => {
    const result = scanAssets(fullScript);
    ok(result.ui.includes('ui/save-bg.png'));
    ok(result.ui.includes('ui/save-header.png'));
    ok(result.ui.includes('ui/settings-header.png'));
    ok(result.ui.includes('ui/icons/tab-audio.png'));
    ok(result.ui.includes('ui/slider-thumb.png'));
    ok(result.ui.includes('ui/button-nine.png'));
    ok(result.ui.includes('ui/dialogue/nameplate.webp'));
    ok(result.ui.includes('ui/dialogue/decor-flower.webp'));
  });

  it('ignores non-canonical dialogue image values instead of reclassifying them as ui assets', () => {
    const result = scanAssets(fullScript);
    ok(!result.ui.includes('legacy/dialogue/decor-old.png'));
    ok(!result.ui.includes('assets/ui/dialogue/nameplate.webp'));
  });
});

describe('filtering', () => {
  it('filters out data: URIs', () => {
    const script = {
      characters: {
        test: {
          expressions: {
            normal: 'data:image/png;base64,abc123xyz',
          },
        },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.characters, []);
  });

  it('filters out http:// URLs', () => {
    const script = {
      scenes: {
        s1: {
          pages: [{
            background: 'http://example.com/bg.png',
            dialogues: [],
          }],
        },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.backgrounds, []);
  });

  it('filters out https:// URLs', () => {
    const script = {
      scenes: {
        s1: {
          pages: [{
            bgm: { file: 'https://cdn.example.com/music.mp3' },
            dialogues: [],
          }],
        },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.audio, []);
  });

  it('filters out empty string values', () => {
    const script = {
      scenes: {
        s1: {
          pages: [{
            background: '',
            se: { file: '' },
            dialogues: [],
          }],
        },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.backgrounds, []);
    deepStrictEqual(result.audio, []);
  });

  it('filters out null and undefined values', () => {
    const script = {
      scenes: {
        s1: {
          pages: [{
            background: null,
            dialogues: [
              { speaker: 'test', text: 'hi', voice: undefined },
            ],
          }],
        },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.backgrounds, []);
    deepStrictEqual(result.voices, []);
  });

  it('filters all invalid types in one script', () => {
    const script = {
      characters: {
        c1: {
          expressions: {
            dataUri: 'data:image/png;base64,testdata',
            httpUrl: 'http://example.com/char.png',
            httpsUrl: 'https://example.com/char.png',
            valid: 'characters/valid.png',
          },
        },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.characters, ['characters/valid.png']);
  });
});

describe('deduplication', () => {
  it('deduplicates audio paths appearing in multiple pages', () => {
    const result = scanAssets(fullScript);
    const bgmCount = result.audio.filter(a => a === 'audio/bgm1.mp3').length;
    deepStrictEqual(bgmCount, 1);
  });

  it('deduplicates backgrounds used in multiple locations', () => {
    const script = {
      scenes: {
        s1: { pages: [{ background: 'backgrounds/shared.png', dialogues: [] }] },
        s2: { pages: [{ background: 'backgrounds/shared.png', dialogues: [] }] },
      },
      ui: {
        titleScreen: {
          background: 'backgrounds/shared.png',
          elements: [],
        },
      },
    };
    const result = scanAssets(script);
    deepStrictEqual(result.backgrounds, ['backgrounds/shared.png']);
  });
});

describe('sorting', () => {
  it('characters array is in alphabetical order', () => {
    const result = scanAssets(fullScript);
    const sorted = [...result.characters].sort();
    deepStrictEqual(result.characters, sorted);
  });

  it('backgrounds array is in alphabetical order', () => {
    const result = scanAssets(fullScript);
    const sorted = [...result.backgrounds].sort();
    deepStrictEqual(result.backgrounds, sorted);
  });

  it('audio array is in alphabetical order', () => {
    const result = scanAssets(fullScript);
    const sorted = [...result.audio].sort();
    deepStrictEqual(result.audio, sorted);
  });

  it('fonts array is in alphabetical order', () => {
    const result = scanAssets(fullScript);
    const sorted = [...result.fonts].sort();
    deepStrictEqual(result.fonts, sorted);
  });

  it('voices array is in alphabetical order', () => {
    const result = scanAssets(fullScript);
    const sorted = [...result.voices].sort();
    deepStrictEqual(result.voices, sorted);
  });
});

describe('graceful handling', () => {
  it('handles empty script object', () => {
    const result = scanAssets({});
    deepStrictEqual(result, {
      backgrounds: [],
      audio: [],
      fonts: [],
      characters: [],
      ui: [],
      voices: [],
    });
  });

  it('handles script with only scenes key (empty)', () => {
    const result = scanAssets({ scenes: {} });
    deepStrictEqual(result, {
      backgrounds: [],
      audio: [],
      fonts: [],
      characters: [],
      ui: [],
      voices: [],
    });
  });

  it('handles script with only ui key (empty)', () => {
    const result = scanAssets({ ui: {} });
    deepStrictEqual(result, {
      backgrounds: [],
      audio: [],
      fonts: [],
      characters: [],
      ui: [],
      voices: [],
    });
  });

  it('handles script with empty arrays in assets.fonts', () => {
    const result = scanAssets({ assets: { fonts: [] } });
    deepStrictEqual(result.fonts, []);
  });

  it('handles scene with empty pages array', () => {
    const result = scanAssets({ scenes: { s1: { pages: [] } } });
    deepStrictEqual(result, {
      backgrounds: [],
      audio: [],
      fonts: [],
      characters: [],
      ui: [],
      voices: [],
    });
  });
});
