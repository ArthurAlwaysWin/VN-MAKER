import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(TEST_DIR, '..');
const MODAL_PATH = path.join(PROJECT_ROOT, 'src/editor/components/theme/ThemeBrowserModal.vue');

function readThemeBrowserModalSource() {
  return fs.readFileSync(MODAL_PATH, 'utf8');
}

describe('ThemeBrowserModal source contract', () => {
  it('locks the unified four-region browser layout and normalized data wiring', () => {
    const source = readThemeBrowserModalSource();

    expect(source).toContain('theme-browser-toolbar');
    expect(source).toContain('theme-browser-filters');
    expect(source).toContain('theme-browser-list');
    expect(source).toContain('theme-browser-detail');
    expect(source).toContain('buildThemeBrowserItems');
    expect(source).toContain('filterThemeBrowserItems');
    expect(source).toContain('computeThemeApplyImpact');
  });

  it('renders the required state semantics and keeps legacy-partial themes inspect-only', () => {
    const source = readThemeBrowserModalSource();

    expect(source).toContain('内置可用');
    expect(source).toContain('已导入');
    expect(source).toContain('当前已应用');
    expect(source).toContain('兼容导入 / 部分主题');
    expect(source).toMatch(/selectedItem\?\.lifecycle\s*!==\s*'applied'/);
    expect(source).toMatch(/selectedItem\?\.canApply/);
    expect(source).toMatch(/selectedItem\?\.mode\s*===\s*'legacy-partial'/);
    expect(source).toContain('installAndApplyThemePackage');
  });

  it('locks the static-preview-only boundary and pre-apply impact explanation', () => {
    const source = readThemeBrowserModalSource();

    expect(source).toContain('静态预览');
    expect(source).toContain('预览占位');
    expect(source).toContain('覆盖影响');
    expect(source).not.toMatch(/<iframe/i);
    expect(source).not.toMatch(/contentWindow/);
    expect(source).not.toMatch(/postMessage/);
    expect(source).not.toMatch(/live preview/i);
  });

  it('keeps import feedback inline, preserves browser context on failure, and selects the new item on success', () => {
    const source = readThemeBrowserModalSource();

    expect(source).toContain('preflightThemePackageImport');
    expect(source).toContain('importFeedback');
    expect(source).toContain('toolbar-feedback');
    expect(source).toMatch(/importedEntries\.value\s*=\s*\[\s*\.\.\.importedEntries\.value,\s*result\.browserEntry\s*\]/);
    expect(source).toMatch(/selectedId\.value\s*=\s*result\.browserEntry\.id/);
    expect(source).toMatch(/importFeedback\.value\s*=\s*\{/);
    expect(source).not.toMatch(/selectedId\.value\s*=\s*null/);
    expect(source).not.toMatch(/filterState\.value\s*=\s*\{/);
    expect(source).not.toMatch(/searchQuery\.value\s*=\s*''/);
  });
});
