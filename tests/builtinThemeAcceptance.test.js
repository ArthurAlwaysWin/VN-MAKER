import { afterEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { installThemePackage } from '../electron/themePackageInstaller.js';
import { exportThemePackage } from '../electron/themePackageExporter.js';
import { buildThemeBrowserItems } from '../src/editor/services/themeBrowser.js';
import { BUILTIN_THEMES } from '../src/editor/builtinThemes.js';
import { useScriptStore } from '../src/editor/stores/script.js';
import { parseThemeZip } from '../src/utils/themePackager.js';

const SHIPPED_THEME_IDS = ['default', 'wafuu', 'modern-sky', 'fantasy-dark', 'minimal-white', 'alchemy-rose'];
const tempDirs = [];

async function createProjectDir(prefix) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  await fs.mkdir(path.join(dir, 'assets', 'ui'), { recursive: true });
  return dir;
}

function createBaseScriptData(titleBgm = 'audio/project-title.ogg') {
  return {
    meta: { title: 'Built-in Theme Acceptance' },
    ui: {
      theme: {},
      widgetStyles: {},
      dialogueBox: {},
      saveLoadScreen: {},
      backlogScreen: {},
      gameMenu: {},
      settingsScreen: {},
      titleScreen: {
        background: 'backgrounds/original-title.png',
        bgm: titleBgm,
        elements: [
          {
            type: 'image',
            src: 'backgrounds/original-logo.png',
            x: 20,
            y: 30,
            width: 120,
            height: 80,
          },
        ],
      },
    },
    scenes: {},
  };
}

describe('built-in theme acceptance matrix', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
  });

  it('locks the shipped built-in roster to the 6-theme acceptance target', () => {
    expect(SHIPPED_THEME_IDS).toEqual(['default', 'wafuu', 'modern-sky', 'fantasy-dark', 'minimal-white', 'alchemy-rose']);
    expect(BUILTIN_THEMES.map(theme => theme.id)).toEqual(SHIPPED_THEME_IDS);
  });

  for (const themeId of SHIPPED_THEME_IDS) {
    it(`keeps ${themeId} truthful across install, apply, save/reopen, export, reimport, and browser reconstruction`, async () => {
      const builtinTheme = BUILTIN_THEMES.find(theme => theme.id === themeId);
      const sourceProjectPath = await createProjectDir(`gm-theme-acceptance-${themeId}-source-`);

      const builtinInstall = await installThemePackage({
        source: 'builtin',
        themeId,
        projectPath: sourceProjectPath,
      });

      expect(builtinInstall.success).toBe(true);

      setActivePinia(createPinia());
      const sourceStore = useScriptStore();
      sourceStore.loadFromData(createBaseScriptData(`audio/${themeId}-source-title.ogg`));
      sourceStore.applyThemeBundle(builtinInstall.bundle, builtinInstall.packageMeta);

      expect(sourceStore.data.ui.titleScreen.bgm).toBe(`audio/${themeId}-source-title.ogg`);
      expect(sourceStore.data.ui.titleScreen.elements).toEqual(builtinInstall.bundle.titleScreen.elements);

      const persistedScript = JSON.parse(JSON.stringify(sourceStore.data));

      setActivePinia(createPinia());
      const reopenedStore = useScriptStore();
      reopenedStore.loadFromData(persistedScript);

      expect(reopenedStore.data.ui.titleScreen).toEqual({
        ...builtinInstall.bundle.titleScreen,
        bgm: `audio/${themeId}-source-title.ogg`,
      });

      await fs.writeFile(
        path.join(sourceProjectPath, 'script.json'),
        JSON.stringify(reopenedStore.data, null, 2),
        'utf-8',
      );

      const exported = await exportThemePackage({
        projectPath: sourceProjectPath,
        metadata: {
          name: `${themeId} parity`,
        },
      });

      expect(exported.success).toBe(true);

      const parsed = parseThemeZip(exported.buffer);
      expect(parsed.success).toBe(true);
      expect(parsed.blockingErrors).toEqual([]);
      expect(parsed.themeId).toBe(themeId);
      expect(parsed.theme.ui.titleScreen).toEqual(builtinInstall.bundle.titleScreen);
      expect(parsed.theme.preview).toEqual(builtinTheme.preview);
      expect(parsed.theme.visualSignature).toEqual(builtinTheme.visualSignature);

      const importedPackagePath = path.join(sourceProjectPath, `${themeId}.gmtheme`);
      await fs.writeFile(importedPackagePath, exported.buffer);

      const freshProjectPath = await createProjectDir(`gm-theme-acceptance-${themeId}-fresh-`);
      const importedInstall = await installThemePackage({
        source: 'file',
        filePath: importedPackagePath,
        projectPath: freshProjectPath,
      });

      expect(importedInstall.success).toBe(true);

      setActivePinia(createPinia());
      const freshStore = useScriptStore();
      freshStore.loadFromData(createBaseScriptData(`audio/${themeId}-fresh-title.ogg`));
      freshStore.applyThemeBundle(importedInstall.bundle, importedInstall.packageMeta);

      expect(freshStore.data.ui.titleScreen).toEqual({
        ...builtinInstall.bundle.titleScreen,
        bgm: `audio/${themeId}-fresh-title.ogg`,
      });

      const browserItems = buildThemeBrowserItems({
        builtins: [],
        importedEntries: [],
        scriptData: freshStore.data,
      });
      const appliedImported = browserItems.find(item => item.rawId === themeId);

      expect(appliedImported).toMatchObject({
        source: 'imported',
        lifecycle: 'applied',
        mode: 'full',
        assetRoot: `ui/themes/${themeId}/`,
        preview: builtinTheme.preview,
        visualSignature: builtinTheme.visualSignature,
      });
      expect(appliedImported.coverage).toEqual([
        'theme',
        'widgetStyles',
        'dialogueBox',
        'saveLoadScreen',
        'backlogScreen',
        'gameMenu',
        'settingsScreen',
        'titleScreen',
      ]);
      expect(appliedImported.coverageLabels).toContain('标题界面');
    });
  }
});
