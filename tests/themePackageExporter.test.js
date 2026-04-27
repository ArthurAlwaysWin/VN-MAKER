import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { exportThemePackage } from '../electron/themePackageExporter.js';
import { parseThemeZip } from '../src/utils/themePackager.js';

const tempDirs = [];

async function createProjectDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gm-theme-export-'));
  tempDirs.push(dir);
  await fs.mkdir(path.join(dir, 'assets', 'ui', 'themes', 'moonlight', 'widgets'), { recursive: true });
  await fs.mkdir(path.join(dir, 'assets', 'ui', 'themes', 'moonlight', 'title'), { recursive: true });
  await fs.mkdir(path.join(dir, 'assets', 'ui', 'shared'), { recursive: true });
  return dir;
}

async function writeProjectScript(projectPath) {
  const script = {
    meta: { title: 'Theme export test' },
    ui: {
      theme: {
        tokens: { primary: '#f4e9d8' },
        packageMeta: {
          source: 'file',
          themeId: 'moonlight',
          mode: 'full',
          assetRoot: 'ui/themes/moonlight/',
        },
      },
      widgetStyles: {
        tab: {
          activeBackgroundImage: 'ui/shared/tab-active.png',
        },
      },
      dialogueBox: {
        nameplateBackgroundImage: 'ui/themes/moonlight/widgets/nameplate.png',
      },
      saveLoadScreen: {},
      backlogScreen: {},
      gameMenu: {},
      settingsScreen: {},
      titleScreen: {
        background: 'ui/shared/title-background.png',
        bgm: 'audio/project-title.ogg',
        elements: [
          {
            type: 'image',
            src: 'ui/themes/moonlight/title/logo.png',
            x: 140,
            y: 60,
            width: 320,
            height: 180,
          },
        ],
      },
    },
    scenes: {},
  };

  await fs.writeFile(path.join(projectPath, 'script.json'), JSON.stringify(script, null, 2), 'utf-8');
  await fs.writeFile(path.join(projectPath, 'assets', 'ui', 'shared', 'tab-active.png'), new Uint8Array([1, 2, 3, 4]));
  await fs.writeFile(path.join(projectPath, 'assets', 'ui', 'shared', 'title-background.png'), new Uint8Array([9, 9, 9, 9]));
  await fs.writeFile(path.join(projectPath, 'assets', 'ui', 'themes', 'moonlight', 'widgets', 'nameplate.png'), new Uint8Array([5, 6, 7, 8]));
  await fs.writeFile(path.join(projectPath, 'assets', 'ui', 'themes', 'moonlight', 'title', 'logo.png'), new Uint8Array([10, 11, 12, 13]));
}

describe('theme package exporter', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
  });

  it('exports the current project theme as a self-contained full .gmtheme archive with manifest theme and packaged assets', async () => {
    const projectPath = await createProjectDir();
    await writeProjectScript(projectPath);

    const result = await exportThemePackage({
      projectPath,
      metadata: {
        name: 'Moonlight',
        description: 'Exported full theme',
        author: 'Tester',
      },
    });

    expect(result.success).toBe(true);
    expect(result.fileExtension).toBe('.gmtheme');

    const parsed = parseThemeZip(result.buffer);
    expect(parsed.success).toBe(true);
    expect(parsed.mode).toBe('full');
    expect(parsed.manifest.formatVersion).toBe(2);
    expect(parsed.manifest.files.length).toBe(4);
    expect(parsed.files.map(file => file.path)).toEqual([
      'ui/themes/moonlight/shared/tab-active.png',
      'ui/themes/moonlight/shared/title-background.png',
      'ui/themes/moonlight/title/logo.png',
      'ui/themes/moonlight/widgets/nameplate.png',
    ]);
    expect(parsed.theme.ui.widgetStyles.tab.activeBackgroundImage).toBe('ui/themes/moonlight/shared/tab-active.png');
    expect(parsed.theme.ui.titleScreen).toEqual({
      background: 'ui/themes/moonlight/shared/title-background.png',
      elements: [
        {
          type: 'image',
          src: 'ui/themes/moonlight/title/logo.png',
          x: 140,
          y: 60,
          width: 320,
          height: 180,
        },
      ],
    });
  });
});
