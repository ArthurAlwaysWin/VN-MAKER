import { describe, expect, it, vi } from 'vitest';

import {
  createThemePackageImportSummary,
  preflightThemePackageImport,
} from '../src/editor/services/themePackageImport.js';

describe('theme package import UX helpers', () => {
  it('formats blocked preflight results and never auto-applies to script data', async () => {
    const ipcRenderer = {
      invoke: vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          filePath: 'E:/themes/moonlight.gmtheme',
        })
        .mockResolvedValueOnce({
          success: true,
          status: 'blocked',
          mode: 'full',
          themeId: 'moonlight',
          assetRoot: 'ui/themes/moonlight/',
          coverage: ['theme'],
          missingCoverage: ['widgetStyles'],
          blockingErrors: ['非法路径'],
          warnings: [],
          actions: [],
          counts: { copy: 0, skip: 0, overwrite: 0 },
        }),
    };
    const scriptStore = {
      updateTheme: vi.fn(),
    };

    const result = await preflightThemePackageImport({
      ipcRenderer,
      scriptStore,
    });

    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(1, 'import-theme');
    expect(ipcRenderer.invoke).toHaveBeenNthCalledWith(2, 'preflight-theme-package', {
      filePath: 'E:/themes/moonlight.gmtheme',
    });
    expect(result.summary.state).toBe('blocked');
    expect(result.summary.blockingErrors).toContain('非法路径');
    expect(result.summary.previewMode).toBe('static');
    expect(result.summary.canAutoApply).toBe(false);
    expect(scriptStore.updateTheme).not.toHaveBeenCalled();
  });

  it('labels legacy packages as 兼容导入 / 部分主题 with missing coverage details', () => {
    const summary = createThemePackageImportSummary({
      success: true,
      status: 'legacy-partial',
      mode: 'legacy-partial',
      themeId: 'legacy-sakura',
      assetRoot: 'ui/themes/legacy-sakura/',
      coverage: ['theme'],
      missingCoverage: ['widgetStyles', 'saveLoadScreen'],
      blockingErrors: [],
      warnings: [],
      actions: [],
      counts: { copy: 0, skip: 0, overwrite: 0 },
    });

    expect(summary.badge).toBe('兼容导入 / 部分主题');
    expect(summary.state).toBe('legacy-partial');
    expect(summary.missingCoverageText).toContain('通用控件');
    expect(summary.missingCoverageText).toContain('存档/读档');
    expect(summary.canAutoApply).toBe(false);
    expect(summary.previewMode).toBe('static');
  });
});
