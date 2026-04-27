import { describe, expect, it } from 'vitest';

import {
  classifyLegacyThemeCoverage,
  getThemePackageAssetRoot,
  planThemeAssetReimport,
  validateThemePackageDefinition,
} from '../src/shared/themePackageContract.js';

function createFullTheme(themeId, overrides = {}) {
  return {
    ui: {
      theme: {
        tokens: {
          primary: '#ffffff',
        },
      },
      widgetStyles: {
        tab: {
          activeBackgroundImage: `ui/themes/${themeId}/widgets/tab-active.png`,
        },
      },
      dialogueBox: {
        nameplateBackgroundImage: `ui/themes/${themeId}/dialogue/nameplate.png`,
      },
      saveLoadScreen: {
        chrome: {
          backgroundImage: `ui/themes/${themeId}/screens/save-load-bg.png`,
        },
      },
      backlogScreen: {
        chrome: {
          backgroundImage: `ui/themes/${themeId}/screens/backlog-bg.png`,
        },
      },
      gameMenu: {
        chrome: {
          backgroundImage: `ui/themes/${themeId}/screens/game-menu-bg.png`,
        },
      },
      settingsScreen: {
        chrome: {
          backgroundImage: `ui/themes/${themeId}/screens/settings-bg.png`,
        },
      },
    },
    ...overrides,
  };
}

describe('theme package contract', () => {
  it('accepts only canonical ui refs rooted under the same theme namespace', () => {
    const themeId = 'moonlight';
    const valid = validateThemePackageDefinition({
      mode: 'full',
      themeId,
      theme: createFullTheme(themeId),
      files: [
        { path: `ui/themes/${themeId}/widgets/tab-active.png`, sha256: 'tab', bytes: 10 },
        { path: `ui/themes/${themeId}/dialogue/nameplate.png`, sha256: 'nameplate', bytes: 10 },
        { path: `ui/themes/${themeId}/screens/save-load-bg.png`, sha256: 'save', bytes: 10 },
        { path: `ui/themes/${themeId}/screens/backlog-bg.png`, sha256: 'backlog', bytes: 10 },
        { path: `ui/themes/${themeId}/screens/game-menu-bg.png`, sha256: 'menu', bytes: 10 },
        { path: `ui/themes/${themeId}/screens/settings-bg.png`, sha256: 'settings', bytes: 10 },
      ],
    });

    expect(valid.assetRoot).toBe(getThemePackageAssetRoot(themeId));
    expect(valid.blockingErrors).toEqual([]);
    expect(valid.coverage).toContain('theme');
    expect(valid.coverage).toContain('widgetStyles');
    expect(valid.coverage).toContain('dialogueBox');
    expect(valid.coverage).toContain('saveLoadScreen');

    const invalidRefs = [
      'asset://ui/themes/moonlight/dialogue/nameplate.png',
      'assets/ui/themes/moonlight/dialogue/nameplate.png',
      '/ui/themes/moonlight/dialogue/nameplate.png',
      'C:\\themes\\moonlight\\dialogue\\nameplate.png',
      'ui\\themes\\moonlight\\dialogue\\nameplate.png',
      'ui/themes/other/dialogue/nameplate.png',
      'ui/themes/moonlight/../dialogue/nameplate.png',
      'data:image/png;base64,broken',
    ];

    for (const invalidRef of invalidRefs) {
      const result = validateThemePackageDefinition({
        mode: 'full',
        themeId,
        theme: createFullTheme(themeId, {
          ui: {
            theme: { tokens: { primary: '#fff' } },
            dialogueBox: {
              nameplateBackgroundImage: invalidRef,
            },
          },
        }),
        files: [],
      });

      expect(result.blockingErrors.length, invalidRef).toBeGreaterThan(0);
    }
  });

  it('plans stable same-namespace re-imports with copy skip overwrite only', () => {
    const plan = planThemeAssetReimport({
      themeId: 'moonlight',
      files: [
        { path: 'ui/themes/moonlight/dialogue/nameplate.png', sha256: 'new-nameplate', bytes: 10 },
        { path: 'ui/themes/moonlight/icons/qab.png', sha256: 'same-qab', bytes: 10 },
        { path: 'ui/themes/moonlight/screens/settings-bg.png', sha256: 'new-settings', bytes: 10 },
      ],
      existingFiles: [
        { path: 'ui/themes/moonlight/dialogue/nameplate.png', sha256: 'old-nameplate' },
        { path: 'ui/themes/moonlight/icons/qab.png', sha256: 'same-qab' },
      ],
    });

    expect(plan.blockingErrors).toEqual([]);
    expect(plan.actions).toEqual([
      {
        type: 'overwrite',
        path: 'ui/themes/moonlight/dialogue/nameplate.png',
      },
      {
        type: 'skip',
        path: 'ui/themes/moonlight/icons/qab.png',
      },
      {
        type: 'copy',
        path: 'ui/themes/moonlight/screens/settings-bg.png',
      },
    ]);
    expect(plan.actions.every(action => !/-\d+\./.test(action.path))).toBe(true);
  });

  it('classifies legacy themes as compatibility-only partial coverage', () => {
    const legacy = classifyLegacyThemeCoverage({
      tokens: {
        primary: '#ffffff',
      },
      nineSlice: {
        dialogueBox: {
          src: 'data:image/png;base64,legacy',
        },
      },
    });

    expect(legacy.mode).toBe('legacy-partial');
    expect(legacy.isFullTheme).toBe(false);
    expect(legacy.coverage).toContain('theme');
    expect(legacy.missingCoverage).toContain('widgetStyles');
    expect(legacy.missingCoverage).toContain('dialogueBox');
    expect(legacy.missingCoverage).toContain('saveLoadScreen');
    expect(legacy.missingCoverage).not.toHaveLength(0);
  });
});
