import { describe, it, expect } from 'vitest';

import { migrateLegacyAppliedThemeData } from '../src/shared/themeLegacyMigrations.js';

describe('migrateLegacyAppliedThemeData', () => {
  it('upgrades persisted built-in wafuu settings screen text and footer coordinates', () => {
    const script = {
      ui: {
        theme: {
          packageMeta: {
            source: 'builtin',
            themeId: 'wafuu',
            mode: 'full',
          },
        },
        settingsScreen: {
          header: {
            title: { text: '系統設定' },
          },
          footer: {
            buttons: [
              { text: '关闭', action: 'close', x: 0, y: 0 },
              { text: '恢复默认', action: 'reset', x: 0, y: 0 },
            ],
          },
        },
      },
    };

    const migrated = migrateLegacyAppliedThemeData(script);

    expect(migrated.changed).toBe(true);
    expect(migrated.script.ui.settingsScreen.header.title.text).toBe('系统设定');
    expect(migrated.script.ui.settingsScreen.footer.buttons).toEqual([
      { text: '恢复默认', action: 'reset', x: 1030, y: 14 },
    ]);
  });

  it('leaves unrelated themes untouched', () => {
    const script = {
      ui: {
        theme: {
          packageMeta: {
            source: 'builtin',
            themeId: 'ink',
            mode: 'full',
          },
        },
        settingsScreen: {
          header: {
            title: { text: '系统设定' },
          },
        },
      },
    };

    const migrated = migrateLegacyAppliedThemeData(script);

    expect(migrated.changed).toBe(false);
    expect(migrated.script).toEqual(script);
  });
});
