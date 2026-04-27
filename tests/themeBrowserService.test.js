import { describe, expect, it } from 'vitest';

import {
  buildThemeBrowserItems,
  computeThemeApplyImpact,
  filterThemeBrowserItems,
  resolveThemeBrowserPreview,
} from '../src/editor/services/themeBrowser.js';

describe('theme browser service', () => {
  it('builds one normalized browser item shape for built-in and imported themes', () => {
    const items = buildThemeBrowserItems({
      builtins: [
        {
          id: 'wafuu',
          name: '和风',
          description: '日式主题',
          primaryColor: '#C8A882',
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
    expect(items.find(item => item.rawId === 'moonlight')).toMatchObject({
      source: 'imported',
      mode: 'full',
      lifecycle: 'available',
      canApply: true,
      missingCoverage: [],
    });
  });

  it('derives lifecycle from script.data.ui.theme.packageMeta only and maps persisted file source to imported UI source', () => {
    const items = buildThemeBrowserItems({
      builtins: [
        {
          id: 'default',
          name: '默认',
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
  });

  it('filters normalized items by source, lifecycle, mode, and text query', () => {
    const items = buildThemeBrowserItems({
      builtins: [
        {
          id: 'wafuu',
          name: '和风',
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
});
