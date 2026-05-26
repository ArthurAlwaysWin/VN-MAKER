import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  UI_CURSOR_ROOT,
  UI_CURSOR_SLOT_KEYS,
  UI_DIALOGUE_BOX_ROOT,
  UI_ICON_ROOT,
  UI_ICON_SLOT_KEYS,
  UI_IMAGE_SCAN_REGISTRY,
  UI_SCREEN_CHROME_ROOTS,
  UI_THEME_ROOT,
  classifyUiImageValue,
  collectUiImagePaths,
  getUiScreenChromeRoot,
  isCanonicalUiImagePath,
  normalizeUiImageSelection,
  registerUiImageCollector,
} from '../src/shared/uiImageContract.js';

const DEFAULT_UI_IMAGE_SCAN_REGISTRY = [...UI_IMAGE_SCAN_REGISTRY];

describe('uiImageContract canonical path rules', () => {
  it('accepts only ui/... project-relative paths as canonical values', () => {
    assert.equal(isCanonicalUiImagePath('ui/dialogue/frame.png'), true);
    assert.equal(isCanonicalUiImagePath(' ui/dialogue/frame.png '), true);
    assert.equal(isCanonicalUiImagePath('assets/ui/dialogue/frame.png'), false);
    assert.equal(isCanonicalUiImagePath('/ui/dialogue/frame.png'), false);
    assert.equal(isCanonicalUiImagePath('C:\\project\\assets\\ui\\frame.png'), false);
    assert.equal(isCanonicalUiImagePath('ui/../secrets/frame.png'), false);
    assert.equal(isCanonicalUiImagePath('ui/./dialogue/frame.png'), false);
    assert.equal(isCanonicalUiImagePath('ui//dialogue/frame.png'), false);
    assert.equal(isCanonicalUiImagePath('data:image/png;base64,abc123'), false);
    assert.equal(isCanonicalUiImagePath('https://example.com/frame.png'), false);
    assert.equal(isCanonicalUiImagePath(''), false);
  });

  it('classifies empty, canonical, legacy path, and legacy data URL values without migrating them', () => {
    assert.equal(classifyUiImageValue(null), 'empty');
    assert.equal(classifyUiImageValue('   '), 'empty');
    assert.equal(classifyUiImageValue('ui/dialogue/frame.png'), 'canonical');
    assert.equal(classifyUiImageValue('assets/ui/dialogue/frame.png'), 'legacy-path');
    assert.equal(classifyUiImageValue('themes/frame.png'), 'legacy-path');
    assert.equal(classifyUiImageValue('data:image/png;base64,abc123'), 'legacy-data-url');
  });

  it('normalizes only canonical UI selections from the asset picker', () => {
    assert.equal(normalizeUiImageSelection(' ui/frame.webp '), 'ui/frame.webp');
    assert.equal(normalizeUiImageSelection('assets/ui/frame.webp'), null);
    assert.equal(normalizeUiImageSelection('C:\\temp\\frame.webp'), null);
    assert.equal(normalizeUiImageSelection(''), null);
  });
});

describe('uiImageContract shared roots and registry', () => {
  beforeEach(() => {
    UI_IMAGE_SCAN_REGISTRY.splice(0, UI_IMAGE_SCAN_REGISTRY.length, ...DEFAULT_UI_IMAGE_SCAN_REGISTRY);
  });

  it('exports the locked shared schema roots for theme, dialogue box, and screen chrome', () => {
    assert.equal(UI_THEME_ROOT, 'ui.theme');
    assert.equal(UI_DIALOGUE_BOX_ROOT, 'ui.dialogueBox');
    assert.deepEqual(UI_SCREEN_CHROME_ROOTS, {
      saveLoadScreen: 'ui.saveLoadScreen.chrome',
      backlogScreen: 'ui.backlogScreen.chrome',
      gameMenu: 'ui.gameMenu.chrome',
      settingsScreen: 'ui.settingsScreen.chrome',
    });
    assert.equal(getUiScreenChromeRoot('saveLoadScreen'), 'ui.saveLoadScreen.chrome');
    assert.equal(getUiScreenChromeRoot('settingsScreen'), 'ui.settingsScreen.chrome');
  });

  it('collects UI image paths through the shared registry entry point', () => {
    const seen = [];
    const unregisterOne = registerUiImageCollector((script, add) => {
      assert.equal(script.id, 'script-under-test');
      add('ui/first.png');
    });
    registerUiImageCollector((script, add) => {
      assert.equal(script.id, 'script-under-test');
      add('ui/second.png');
    });

    collectUiImagePaths({ id: 'script-under-test' }, value => seen.push(value));
    unregisterOne();

    assert.deepEqual(seen, ['ui/first.png', 'ui/second.png']);
    assert.equal(UI_IMAGE_SCAN_REGISTRY.length, DEFAULT_UI_IMAGE_SCAN_REGISTRY.length + 1);
  });

  it('collects only locked three-state button family canonical paths and ignores empty or legacy values', () => {
    const seen = [];

    collectUiImagePaths({
      ui: {
        theme: {
          buttonFamilies: {
            gameMenuButton: {
              normal: 'ui/buttons/game-menu-normal.webp',
              hover: 'ui/buttons/game-menu-hover.webp',
              pressed: 'ui/buttons/game-menu-pressed.webp',
            },
            qab: {
              normal: 'ui/buttons/qab-normal.webp',
              hover: 'ui/buttons/qab-hover.webp',
              pressed: 'ui/buttons/qab-pressed.webp',
              disabled: 'ui/buttons/qab-disabled.webp',
            },
            closeButton: {
              normal: 'ui/buttons/close-normal.webp',
              hover: 'ui/buttons/close-hover.webp',
              pressed: 'ui/buttons/close-pressed.webp',
            },
            legacyFamily: {
              normal: 'ui/buttons/legacy-family.webp',
            },
          },
        },
      },
    }, value => seen.push(value));

    assert.deepEqual(seen.sort(), [
      'ui/buttons/close-hover.webp',
      'ui/buttons/close-normal.webp',
      'ui/buttons/close-pressed.webp',
      'ui/buttons/game-menu-hover.webp',
      'ui/buttons/game-menu-normal.webp',
      'ui/buttons/game-menu-pressed.webp',
      'ui/buttons/qab-hover.webp',
      'ui/buttons/qab-normal.webp',
      'ui/buttons/qab-pressed.webp',
    ]);
  });

  it('collects screen chrome backgroundImage and decoration paths for all four screens', () => {
    const seen = [];

    collectUiImagePaths({
      ui: {
        saveLoadScreen: {
          chrome: {
            backgroundImage: 'ui/saveLoad/bg.png',
            decorations: [
              { src: 'ui/saveLoad/decor1.png', x: 10, y: 20, width: 100, height: 50 },
              { src: 'ui/saveLoad/decor2.png', x: 200, y: 300, width: 80, height: 40 },
            ],
          },
        },
        backlogScreen: {
          chrome: {
            backgroundImage: 'ui/backlog/bg.png',
            decorations: [
              { src: 'ui/backlog/decor.png', x: 0, y: 0, width: 50, height: 50 },
            ],
          },
        },
        gameMenu: {
          backgroundImage: 'ui/gameMenu/legacy-bg.png',
          chrome: {
            backgroundImage: 'ui/gameMenu/chrome-bg.png',
            decorations: [
              { src: 'ui/gameMenu/decor.png', x: 100, y: 100, width: 200, height: 200 },
            ],
          },
        },
        settingsScreen: {
          header: {
            backgroundImage: 'ui/settings/header-bg.png',
            decorations: [
              { src: 'ui/settings/header-decor.png', x: 0, y: 0, width: 100, height: 100 },
            ],
          },
          chrome: {
            backgroundImage: 'ui/settings/chrome-bg.png',
            decorations: [
              { src: 'ui/settings/chrome-decor.png', x: 50, y: 50, width: 150, height: 150 },
            ],
          },
        },
      },
    }, value => seen.push(value));

    // Chrome paths
    assert.ok(seen.includes('ui/saveLoad/bg.png'));
    assert.ok(seen.includes('ui/saveLoad/decor1.png'));
    assert.ok(seen.includes('ui/saveLoad/decor2.png'));
    assert.ok(seen.includes('ui/backlog/bg.png'));
    assert.ok(seen.includes('ui/backlog/decor.png'));
    assert.ok(seen.includes('ui/gameMenu/chrome-bg.png'));
    assert.ok(seen.includes('ui/gameMenu/decor.png'));
    assert.ok(seen.includes('ui/settings/chrome-bg.png'));
    assert.ok(seen.includes('ui/settings/chrome-decor.png'));

    // Legacy paths still collected
    assert.ok(seen.includes('ui/gameMenu/legacy-bg.png'));
    assert.ok(seen.includes('ui/settings/header-bg.png'));
    assert.ok(seen.includes('ui/settings/header-decor.png'));
  });

  it('handles null/empty chrome fields gracefully', () => {
    const seen = [];

    collectUiImagePaths({
      ui: {
        saveLoadScreen: { chrome: {} },
        backlogScreen: { chrome: { decorations: [] } },
        gameMenu: { chrome: { backgroundImage: null } },
        settingsScreen: { chrome: { decorations: [{ src: null }, {}] } },
      },
    }, value => seen.push(value));

    assert.equal(seen.length, 0);
  });

  it('collects only locked four-state button family canonical paths and ignores empty or legacy values', () => {
    const seen = [];

    collectUiImagePaths({
      ui: {
        theme: {
          buttonFamilies: {
            pageTabPager: {
              normal: 'ui/buttons/page-tab-normal.webp',
              hover: 'ui/buttons/page-tab-hover.webp',
              pressed: 'ui/buttons/page-tab-pressed.webp',
              selected: 'ui/buttons/page-tab-selected.webp',
            },
            settingsTab: {
              normal: 'ui/buttons/settings-tab-normal.webp',
              hover: 'ui/buttons/settings-tab-hover.webp',
              pressed: 'ui/buttons/settings-tab-pressed.webp',
              selected: 'ui/buttons/settings-tab-selected.webp',
              disabled: 'ui/buttons/settings-tab-disabled.webp',
            },
            closeButton: {
              normal: 'assets/ui/buttons/close-normal.webp',
              hover: '',
              pressed: 'data:image/png;base64,close-pressed',
              selected: 'ui/buttons/close-selected.webp',
            },
          },
        },
      },
    }, value => seen.push(value));

    assert.deepEqual(seen.sort(), [
      'ui/buttons/page-tab-hover.webp',
      'ui/buttons/page-tab-normal.webp',
      'ui/buttons/page-tab-pressed.webp',
      'ui/buttons/page-tab-selected.webp',
      'ui/buttons/settings-tab-hover.webp',
      'ui/buttons/settings-tab-normal.webp',
      'ui/buttons/settings-tab-pressed.webp',
      'ui/buttons/settings-tab-selected.webp',
    ]);
  });

  it('exports the locked cursor and icon schema roots and slot keys', () => {
    assert.equal(UI_CURSOR_ROOT, 'ui.theme.cursor');
    assert.equal(UI_ICON_ROOT, 'ui.theme.icons');
    assert.deepEqual(UI_CURSOR_SLOT_KEYS, ['default', 'pointer']);
    assert.deepEqual(UI_ICON_SLOT_KEYS, ['gameMenu', 'qab', 'close', 'voiceReplay']);
  });

  it('collects cursor and icon canonical image paths', () => {
    const seen = [];

    collectUiImagePaths({
      ui: {
        theme: {
          cursor: {
            default: 'ui/cursors/default.png',
            pointer: 'ui/cursors/pointer.png',
          },
          icons: {
            gameMenu: 'ui/icons/game-menu.png',
            qab: 'ui/icons/qab.png',
            close: 'ui/icons/close.png',
            voiceReplay: 'ui/icons/voice-replay.png',
          },
        },
      },
    }, value => seen.push(value));

    assert.ok(seen.includes('ui/cursors/default.png'));
    assert.ok(seen.includes('ui/cursors/pointer.png'));
    assert.ok(seen.includes('ui/icons/game-menu.png'));
    assert.ok(seen.includes('ui/icons/qab.png'));
    assert.ok(seen.includes('ui/icons/close.png'));
    assert.ok(seen.includes('ui/icons/voice-replay.png'));
  });

  it('handles null/empty cursor and icon fields gracefully', () => {
    const seen = [];

    collectUiImagePaths({
      ui: {
        theme: {
          cursor: { default: null, pointer: '' },
          icons: { gameMenu: 'assets/ui/icons/legacy.png', close: 'data:image/png;base64,x' },
        },
      },
    }, value => seen.push(value));

    assert.equal(seen.length, 0);
  });
});
