import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(TEST_DIR, '..');
const PROJECT_SETTINGS_PATH = path.join(PROJECT_ROOT, 'src/editor/views/ProjectSettings.vue');
const HELP_TEXTS_PATH = path.join(PROJECT_ROOT, 'src/editor/helpTexts.js');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

describe('ProjectSettings theme browser routing', () => {
  it('routes theme browsing through one unified ThemeBrowserModal entry instead of split preset/package modals', () => {
    const source = readFile(PROJECT_SETTINGS_PATH);

    expect(source).toContain("import ThemeBrowserModal from '../components/theme/ThemeBrowserModal.vue';");
    expect(source).toContain('showThemeBrowser');
    expect(source).toContain('ThemeBrowserModal');
    expect(source).not.toContain("import PresetModal from '../components/theme/PresetModal.vue';");
    expect(source).not.toContain("import ThemePackageModal from '../components/theme/ThemePackageModal.vue';");
    expect(source).not.toContain('<PresetModal');
    expect(source).not.toContain('<ThemePackageModal');
  });

  it('keeps a single browser entry in the theme toolbar and aligns help copy with the unified browser', () => {
    const source = readFile(PROJECT_SETTINGS_PATH);
    const helpTexts = readFile(HELP_TEXTS_PATH);

    expect(source).toContain('🎭 主题浏览器');
    expect(source).not.toContain('📦 预设');
    expect(source).not.toContain('🎭 完整主题');
    expect(helpTexts).toContain('themeBrowser');
    expect(helpTexts).toContain('统一主题浏览器');
    expect(helpTexts).toContain('静态预览');
  });
});
