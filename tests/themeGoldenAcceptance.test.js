import { afterEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { installThemePackage } from '../electron/themePackageInstaller.js';
import { exportThemePackage } from '../electron/themePackageExporter.js';
import { useScriptStore } from '../src/editor/stores/script.js';
import { parseThemeZip } from '../src/utils/themePackager.js';
import { buildThemeBrowserItems } from '../src/editor/services/themeBrowser.js';

const tempDirs = [];

async function createProjectDir(prefix) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  await fs.mkdir(path.join(dir, 'assets', 'ui'), { recursive: true });
  return dir;
}

function createBaseScriptData(titleBgm = 'audio/project-title.ogg') {
  return {
    meta: { title: 'Golden Theme Acceptance' },
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

describe('golden theme acceptance', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
  });

  it('keeps titleScreen parity across apply, save-reload, export, reimport, and browser reconstruction while preserving project-owned bgm', async () => {
    const sourceProjectPath = await createProjectDir('gm-theme-golden-source-');
    const sourceScript = createBaseScriptData('audio/source-title.ogg');

    const builtinInstall = await installThemePackage({
      source: 'builtin',
      themeId: 'wafuu',
      projectPath: sourceProjectPath,
    });

    expect(builtinInstall.success).toBe(true);

    setActivePinia(createPinia());
    const sourceStore = useScriptStore();
    sourceStore.loadFromData(sourceScript);
    sourceStore.applyThemeBundle(builtinInstall.bundle, builtinInstall.packageMeta);

    expect(sourceStore.data.ui.titleScreen.bgm).toBe('audio/source-title.ogg');
    expect(sourceStore.data.ui.titleScreen.elements).toEqual(builtinInstall.bundle.titleScreen.elements);

    const persistedScript = JSON.parse(JSON.stringify(sourceStore.data));

    setActivePinia(createPinia());
    const reopenedStore = useScriptStore();
    reopenedStore.loadFromData(persistedScript);

    expect(reopenedStore.data.ui.titleScreen).toEqual({
      ...builtinInstall.bundle.titleScreen,
      bgm: 'audio/source-title.ogg',
    });

    await fs.writeFile(
      path.join(sourceProjectPath, 'script.json'),
      JSON.stringify(reopenedStore.data, null, 2),
      'utf-8',
    );

    const exported = await exportThemePackage({
      projectPath: sourceProjectPath,
      metadata: {
        name: 'Wafuu Golden',
      },
    });

    expect(exported.success).toBe(true);

    const parsed = parseThemeZip(exported.buffer);
    expect(parsed.success).toBe(true);
    expect(parsed.blockingErrors).toEqual([]);
    expect(parsed.themeId).toBe('wafuu');
    expect(parsed.theme.ui.titleScreen).toEqual(builtinInstall.bundle.titleScreen);

    const importedPackagePath = path.join(sourceProjectPath, 'wafuu.gmtheme');
    await fs.writeFile(importedPackagePath, exported.buffer);

    const freshProjectPath = await createProjectDir('gm-theme-golden-fresh-');
    const importedInstall = await installThemePackage({
      source: 'file',
      filePath: importedPackagePath,
      projectPath: freshProjectPath,
    });

    expect(importedInstall.success).toBe(true);

    setActivePinia(createPinia());
    const freshStore = useScriptStore();
    freshStore.loadFromData(createBaseScriptData('audio/fresh-title.ogg'));
    freshStore.applyThemeBundle(importedInstall.bundle, importedInstall.packageMeta);

    expect(freshStore.data.ui.titleScreen).toEqual({
      ...builtinInstall.bundle.titleScreen,
      bgm: 'audio/fresh-title.ogg',
    });

    const browserItems = buildThemeBrowserItems({
      builtins: [],
      importedEntries: [],
      scriptData: freshStore.data,
    });
    const appliedImported = browserItems.find(item => item.rawId === 'wafuu');

    expect(appliedImported).toMatchObject({
      source: 'imported',
      lifecycle: 'applied',
      mode: 'full',
      assetRoot: 'ui/themes/wafuu/',
    });
    expect(appliedImported.coverageLabels).toContain('标题界面');
  });
});
