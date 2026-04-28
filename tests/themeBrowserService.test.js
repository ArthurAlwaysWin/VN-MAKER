import { describe, expect, it } from 'vitest';

import {
  buildThemeBrowserItems,
  computeThemeApplyImpact,
  filterThemeBrowserItems,
  resolveThemeBrowserPreview,
} from '../src/editor/services/themeBrowser.js';
import { FULL_THEME_COVERAGE_KEYS } from '../src/shared/themePackageContract.js';

describe('theme browser service', () => {
  it('builds one normalized browser item shape for built-in and imported themes', () => {
    const items = buildThemeBrowserItems({
      builtins: [
        {
          id: 'wafuu',
          name: '和风',
          description: '日式主题',
          primaryColor: '#C8A882',
          coverage: FULL_THEME_COVERAGE_KEYS,
          tokens: { primary: '#c98683' },
          widgetStyles: {},
          screens: {},
        },
      ],
      importedEntries: [
        {
          themeId: 'moonlight',
          source: 'imported',
          mode: 'full',
          status: 'ready',
          coverage: ['theme', 'widgetStyles', 'dialogueBox'],
          missingCoverage: [],
          filePath: 'E:/themes/moonlight.gmtheme',
        },
      ],
      scriptData: {
        ui: {
          theme: {
            packageMeta: {
              source: 'builtin',
              themeId: 'wafuu',
              mode: 'full',
            },
          },
        },
      },
    });

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      source: expect.any(String),
      mode: expect.any(String),
      lifecycle: expect.any(String),
      coverage: expect.any(Array),
      missingCoverage: expect.any(Array),
      applyImpact: expect.any(Object),
      preview: expect.any(Object),
    });
    expect(items.find(item => item.rawId === 'wafuu')).toMatchObject({
      source: 'builtin',
      mode: 'full',
      lifecycle: 'applied',
      author: 'Galgame Maker',
      version: '内置主题',
    });
    expect(items.find(item => item.rawId === 'wafuu').coverageLabels).toContain('标题界面');
    expect(items.find(item => item.rawId === 'moonlight')).toMatchObject({
      source: 'imported',
      mode: 'full',
      lifecycle: 'available',
      canApply: true,
      missingCoverage: ['saveLoadScreen', 'backlogScreen', 'gameMenu', 'settingsScreen', 'titleScreen'],
    });
  });

  it('derives lifecycle from script.data.ui.theme.packageMeta only and maps persisted file source to imported UI source', () => {
    const items = buildThemeBrowserItems({
      builtins: [
        {
          id: 'default',
          name: '默认',
          coverage: FULL_THEME_COVERAGE_KEYS,
          tokens: {},
          widgetStyles: {},
          screens: {},
        },
      ],
      importedEntries: [
        {
          themeId: 'moonlight',
          source: 'imported',
          mode: 'full',
          status: 'ready',
          coverage: ['theme'],
          missingCoverage: [],
          filePath: 'E:/themes/moonlight.gmtheme',
        },
      ],
      scriptData: {
        ui: {
          theme: {
            packageMeta: {
              source: 'file',
              themeId: 'moonlight',
              mode: 'full',
            },
          },
        },
      },
    });

    expect(items.find(item => item.rawId === 'default').lifecycle).toBe('available');
    expect(items.find(item => item.rawId === 'moonlight')).toMatchObject({
      source: 'imported',
      lifecycle: 'applied',
      appliedSource: 'imported',
    });
  });

  it('keeps legacy-partial entries inspect-only and preview fallback static', () => {
    const [item] = buildThemeBrowserItems({
      importedEntries: [
        {
          themeId: 'legacy-sakura',
          source: 'imported',
          status: 'legacy-partial',
          mode: 'legacy-partial',
          coverage: ['theme'],
          missingCoverage: ['widgetStyles', 'saveLoadScreen'],
          filePath: 'E:/themes/legacy-sakura.theme',
        },
      ],
      scriptData: {},
    });

    expect(item.mode).toBe('legacy-partial');
    expect(item.canApply).toBe(false);
    expect(item.applyDisabledReason).toContain('兼容导入');
    expect(item.preview.mode).toBe('fallback');
    expect(item.preview.kind).toBe('static');
  });

  it('describes apply impact through coverage overlap or first-write text instead of filesystem overwrite counts', () => {
    const overlapImpact = computeThemeApplyImpact(
      {
        mode: 'full',
        coverage: ['theme', 'widgetStyles', 'dialogueBox'],
      },
      {
        ui: {
          theme: {
            packageMeta: {
              source: 'builtin',
              themeId: 'default',
              mode: 'full',
            },
          },
        },
      },
    );
    const firstWriteImpact = computeThemeApplyImpact(
      {
        mode: 'full',
        coverage: ['theme', 'settingsScreen'],
      },
      {},
    );

    expect(overlapImpact.text).toContain('会覆盖当前主题已接管的范围');
    expect(overlapImpact.text).toContain('主题基础');
    expect(overlapImpact.text).toContain('通用控件');
    expect(overlapImpact.text).not.toContain('overwrite');
    expect(firstWriteImpact.text).toContain('首次写入这些主题范围');
    expect(firstWriteImpact.text).toContain('设置界面');

    const titleFirstWriteImpact = computeThemeApplyImpact(
      {
        mode: 'full',
        coverage: ['theme', 'titleScreen'],
      },
      {},
    );

    expect(titleFirstWriteImpact.text).toContain('标题界面');
  });

  it('filters normalized items by source, lifecycle, mode, and text query', () => {
    const items = buildThemeBrowserItems({
      builtins: [
        {
          id: 'wafuu',
          name: '和风',
          coverage: FULL_THEME_COVERAGE_KEYS,
          tokens: {},
          widgetStyles: {},
          screens: {},
        },
      ],
      importedEntries: [
        {
          themeId: 'moonlight',
          name: 'Moonlight',
          source: 'imported',
          status: 'ready',
          mode: 'full',
          coverage: ['theme'],
          missingCoverage: [],
          filePath: 'E:/themes/moonlight.gmtheme',
        },
      ],
      scriptData: {
        ui: {
          theme: {
            packageMeta: {
              source: 'file',
              themeId: 'moonlight',
              mode: 'full',
            },
          },
        },
      },
    });

    const filtered = filterThemeBrowserItems(items, {
      source: ['imported'],
      lifecycle: ['applied'],
      mode: ['full'],
      query: 'moon',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].rawId).toBe('moonlight');
  });

  it('returns deterministic preview fallbacks for the same item input', () => {
    const item = {
      source: 'builtin',
      rawId: 'wafuu',
      name: '和风',
      description: '日式主题',
      primaryColor: '#C8A882',
      tokens: { primary: '#c98683' },
    };

    expect(resolveThemeBrowserPreview(item)).toEqual(resolveThemeBrowserPreview(item));
  });

  it('reconstructs the currently applied imported theme from packageMeta when no session import entry exists', () => {
    const items = buildThemeBrowserItems({
      builtins: [
        {
          id: 'default',
          name: '默认',
          coverage: FULL_THEME_COVERAGE_KEYS,
          tokens: {},
          widgetStyles: {},
          screens: {},
        },
      ],
      importedEntries: [],
      scriptData: {
        ui: {
          theme: {
            packageMeta: {
              source: 'file',
              themeId: 'moonlight',
              mode: 'full',
              assetRoot: 'ui/themes/moonlight/',
            },
            tokens: {
              primary: '#445566',
            },
          },
          widgetStyles: {
            button: {
              background: '#223344',
            },
          },
          dialogueBox: {
            nameplateBackgroundImage: 'ui/themes/moonlight/dialogue/nameplate.png',
          },
        },
      },
    });

    expect(items.find(item => item.rawId === 'moonlight')).toMatchObject({
      source: 'imported',
      lifecycle: 'applied',
      mode: 'full',
      canApply: false,
      assetRoot: 'ui/themes/moonlight/',
    });
  });

  it('reconstructs explicit preview and visual-signature metadata for the applied full package instead of falling back to synthetic browser hints', () => {
    const items = buildThemeBrowserItems({
      builtins: [],
      importedEntries: [],
      scriptData: {
        ui: {
          theme: {
            packageMeta: {
              source: 'file',
              themeId: 'default',
              mode: 'full',
              assetRoot: 'ui/themes/default/',
              preview: {
                mode: 'asset',
                src: '/builtin-themes/default/preview.svg',
                background: '#151A22',
                accent: '#B9C4DA',
                text: '默认',
                initials: '默认',
              },
              visualSignature: {
                materialLanguage: '磨砂石墨面板、缎面冷灰描边与低饱和蓝灰高光',
                contourLanguage: '克制的圆角矩形、稳定横向条带与均匀留白构成 polished neutral baseline',
                styleDirection: 'polished neutral baseline',
              },
            },
            tokens: {
              primary: '#8593AD',
            },
          },
        },
      },
    });

    expect(items[0]).toMatchObject({
      rawId: 'default',
      source: 'imported',
      lifecycle: 'applied',
      preview: {
        mode: 'asset',
        src: '/builtin-themes/default/preview.svg',
      },
      visualSignature: {
        styleDirection: 'polished neutral baseline',
      },
    });
  });

  it('reflects explicit built-in coverage instead of assuming all built-ins are full themes', () => {
    const [item] = buildThemeBrowserItems({
      builtins: [
        {
          id: 'draft-builtin',
          name: '草稿主题',
          coverage: ['theme', 'widgetStyles', 'dialogueBox'],
          missingCoverage: [
            'saveLoadScreen',
            'backlogScreen',
            'gameMenu',
            'settingsScreen',
            'titleScreen',
          ],
          preview: {
            mode: 'asset',
            src: '/builtin-themes/draft-builtin/preview.svg',
            background: '#223344',
            accent: '#88aadd',
          },
        },
      ],
    });

    expect(item.coverage).toEqual(['theme', 'widgetStyles', 'dialogueBox']);
    expect(item.missingCoverage).toEqual([
      'saveLoadScreen',
      'backlogScreen',
      'gameMenu',
      'settingsScreen',
      'titleScreen',
    ]);
    expect(item.coverageLabels).not.toContain('标题界面');
  });
});
