import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useScriptStore } from '../src/editor/stores/script.js';

function makeScriptData() {
  return {
    meta: { title: 'Theme apply test' },
    ui: {
      theme: {
        tokens: { primary: '#111111' },
        packageMeta: {
          source: 'builtin',
          themeId: 'default',
          mode: 'full',
          assetRoot: 'ui/themes/default/',
        },
      },
      widgetStyles: {
        tab: {
          activeBackgroundImage: 'ui/themes/default/widgets/tab-active.png',
        },
      },
      dialogueBox: {
        nameplateBackgroundImage: 'ui/themes/default/dialogue/nameplate.png',
      },
      saveLoadScreen: {
        chrome: {
          backgroundImage: 'ui/themes/default/screens/save-load-bg.png',
        },
      },
      backlogScreen: {
        chrome: {
          backgroundImage: 'ui/themes/default/screens/backlog-bg.png',
        },
      },
      gameMenu: {
        chrome: {
          backgroundImage: 'ui/themes/default/screens/game-menu-bg.png',
        },
      },
      settingsScreen: {
        chrome: {
          backgroundImage: 'ui/themes/default/screens/settings-bg.png',
        },
      },
      titleScreen: {
        background: 'backgrounds/title.png',
        bgm: 'audio/project-title.ogg',
        elements: [
          {
            type: 'image',
            src: 'backgrounds/project-logo.png',
            x: 20,
            y: 40,
            width: 100,
            height: 80,
          },
        ],
      },
    },
    scenes: {},
  };
}

function makeInstalledBundle() {
  return {
    theme: {
      tokens: { primary: '#f4e9d8' },
      cursor: {
        pointer: 'ui/themes/moonlight/cursors/pointer.cur',
      },
    },
    widgetStyles: {
      tab: {
        activeBackgroundImage: 'ui/themes/moonlight/widgets/tab-active.png',
      },
    },
    dialogueBox: {
      nameplateBackgroundImage: 'ui/themes/moonlight/dialogue/nameplate.png',
    },
    saveLoadScreen: {
      chrome: {
        backgroundImage: 'ui/themes/moonlight/screens/save-load-bg.png',
      },
    },
    backlogScreen: {
      chrome: {
        backgroundImage: 'ui/themes/moonlight/screens/backlog-bg.png',
      },
    },
    gameMenu: {
      chrome: {
        backgroundImage: 'ui/themes/moonlight/screens/game-menu-bg.png',
      },
    },
    settingsScreen: {
      chrome: {
        backgroundImage: 'ui/themes/moonlight/screens/settings-bg.png',
      },
    },
    titleScreen: {
      background: 'ui/themes/moonlight/title/background.png',
      bgm: 'audio/theme-should-not-apply.ogg',
      elements: [
        {
          type: 'image',
          src: 'ui/themes/moonlight/title/logo.png',
          x: 160,
          y: 80,
          width: 320,
          height: 180,
        },
      ],
    },
  };
}

describe('script theme bundle apply flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('atomically replaces the owned UI theme bundle and one undo restores the previous snapshot', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData());

    expect(typeof store.applyThemeBundle).toBe('function');

    store.applyThemeBundle(makeInstalledBundle(), {
      source: 'file',
      themeId: 'moonlight',
      mode: 'full',
      assetRoot: 'ui/themes/moonlight/',
    });

    expect(store.data.ui.theme).toEqual({
      tokens: { primary: '#f4e9d8' },
      cursor: {
        pointer: 'ui/themes/moonlight/cursors/pointer.cur',
      },
      packageMeta: {
        source: 'file',
        themeId: 'moonlight',
        mode: 'full',
        assetRoot: 'ui/themes/moonlight/',
      },
    });
    expect(store.data.ui.widgetStyles.tab.activeBackgroundImage).toBe('ui/themes/moonlight/widgets/tab-active.png');
    expect(store.data.ui.dialogueBox.nameplateBackgroundImage).toBe('ui/themes/moonlight/dialogue/nameplate.png');
    expect(store.data.ui.titleScreen).toEqual({
      background: 'ui/themes/moonlight/title/background.png',
      bgm: 'audio/project-title.ogg',
      elements: [
        {
          type: 'image',
          src: 'ui/themes/moonlight/title/logo.png',
          x: 160,
          y: 80,
          width: 320,
          height: 180,
        },
      ],
    });

    store.undo();

    expect(store.data.ui.theme.packageMeta.themeId).toBe('default');
    expect(store.data.ui.widgetStyles.tab.activeBackgroundImage).toBe('ui/themes/default/widgets/tab-active.png');
    expect(store.data.ui.dialogueBox.nameplateBackgroundImage).toBe('ui/themes/default/dialogue/nameplate.png');
    expect(store.data.ui.titleScreen).toEqual({
      background: 'backgrounds/title.png',
      bgm: 'audio/project-title.ogg',
      elements: [
        {
          type: 'image',
          src: 'backgrounds/project-logo.png',
          x: 20,
          y: 40,
          width: 100,
          height: 80,
        },
      ],
    });
  });
});
