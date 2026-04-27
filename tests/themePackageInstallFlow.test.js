import { describe, expect, it, vi } from 'vitest';

import { installAndApplyThemePackage } from '../src/editor/services/themePackageInstall.js';

describe('theme package install/apply orchestration', () => {
  it('keeps imported themes preflight-first, then installs, applies, marks dirty, and refreshes ui assets', async () => {
    const ipcRenderer = {
      invoke: vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          status: 'ready',
          mode: 'full',
          themeId: 'moonlight',
          assetRoot: 'ui/themes/moonlight/',
          blockingErrors: [],
        })
        .mockResolvedValueOnce({
          success: true,
          bundle: {
            theme: {
              tokens: {
                primary: '#ffffff',
              },
            },
            widgetStyles: {},
            dialogueBox: {},
            saveLoadScreen: {},
            backlogScreen: {},
            gameMenu: {},
            settingsScreen: {},
            titleScreen: {
              background: 'ui/themes/moonlight/title/background.png',
              elements: [
                {
                  type: 'image',
                  src: 'ui/themes/moonlight/title/logo.png',
                },
              ],
            },
          },
          packageMeta: {
            source: 'file',
            themeId: 'moonlight',
            mode: 'full',
            assetRoot: 'ui/themes/moonlight/',
          },
        }),
    };
    const scriptStore = {
      applyThemeBundle: vi.fn(),
    };
    const projectStore = {
      markDirty: vi.fn(),
    };
    const assetStore = {
      loadCategory: vi.fn().mockResolvedValue(undefined),
    };

    const result = await installAndApplyThemePackage({
      ipcRenderer,
      scriptStore,
      projectStore,
      assetStore,
      source: 'file',
      filePath: 'E:/themes/moonlight.gmtheme',
    });

    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(1, 'preflight-theme-package', {
      filePath: 'E:/themes/moonlight.gmtheme',
    });
    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(2, 'install-theme-package', {
      source: 'file',
      filePath: 'E:/themes/moonlight.gmtheme',
    });
    expect(scriptStore.applyThemeBundle).toHaveBeenCalledWith(result.bundle, result.packageMeta);
    expect(result.bundle.titleScreen.background).toBe('ui/themes/moonlight/title/background.png');
    expect(projectStore.markDirty).toHaveBeenCalledTimes(1);
    expect(assetStore.loadCategory).toHaveBeenCalledWith('ui');
  });

  it('routes built-in themes through the same install-theme-package surface without preflight', async () => {
    const ipcRenderer = {
      invoke: vi.fn().mockResolvedValue({
        success: true,
        bundle: {
          theme: {
            tokens: {
              primary: '#c98683',
            },
          },
          widgetStyles: {},
          dialogueBox: {},
          saveLoadScreen: {},
          backlogScreen: {},
          gameMenu: {},
          settingsScreen: {},
          titleScreen: {
            background: 'ui/themes/wafuu/title/background.png',
            elements: [
              {
                type: 'image',
                src: 'ui/themes/wafuu/title/logo.png',
              },
            ],
          },
        },
        packageMeta: {
          source: 'builtin',
          themeId: 'wafuu',
          mode: 'full',
          assetRoot: 'ui/themes/wafuu/',
        },
      }),
    };
    const scriptStore = {
      applyThemeBundle: vi.fn(),
    };
    const projectStore = {
      markDirty: vi.fn(),
    };
    const assetStore = {
      loadCategory: vi.fn().mockResolvedValue(undefined),
    };

    await installAndApplyThemePackage({
      ipcRenderer,
      scriptStore,
      projectStore,
      assetStore,
      source: 'builtin',
      themeId: 'wafuu',
    });

    expect(ipcRenderer.invoke).toHaveBeenCalledTimes(1);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('install-theme-package', {
      source: 'builtin',
      themeId: 'wafuu',
    });
    expect(scriptStore.applyThemeBundle).toHaveBeenCalledTimes(1);
    expect(scriptStore.applyThemeBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        titleScreen: expect.objectContaining({
          background: 'ui/themes/wafuu/title/background.png',
        }),
      }),
      expect.any(Object),
    );
    expect(projectStore.markDirty).toHaveBeenCalledTimes(1);
    expect(assetStore.loadCategory).toHaveBeenCalledWith('ui');
  });
});
