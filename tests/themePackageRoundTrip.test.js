import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { exportThemePackage } from '../electron/themePackageExporter.js';
import { parseThemeZip } from '../src/utils/themePackager.js';

const tempDirs = [];

async function createProjectDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gm-theme-roundtrip-'));
  tempDirs.push(dir);
  await fs.mkdir(path.join(dir, 'assets', 'ui', 'themes', 'moonlight', 'screens'), { recursive: true });
  await fs.mkdir(path.join(dir, 'assets', 'ui', 'themes', 'moonlight', 'dialogue'), { recursive: true });
  await fs.mkdir(path.join(dir, 'assets', 'ui', 'themes', 'moonlight', 'title'), { recursive: true });
  return dir;
}

async function writeProjectScript(projectPath) {
  const script = {
    meta: { title: 'Theme round-trip test' },
    ui: {
      theme: {
        tokens: { primary: '#d9c4a1' },
        packageMeta: {
          source: 'file',
          themeId: 'moonlight',
          mode: 'full',
          assetRoot: 'ui/themes/moonlight/',
        },
      },
      widgetStyles: {},
      dialogueBox: {
        nameplateBackgroundImage: 'ui/themes/moonlight/dialogue/nameplate.png',
      },
      saveLoadScreen: {
        chrome: {
          backgroundImage: 'ui/themes/moonlight/screens/save-load-bg.png',
        },
      },
      backlogScreen: {},
      gameMenu: {},
      settingsScreen: {},
      titleScreen: {
        background: 'ui/themes/moonlight/title/background.png',
        bgm: 'audio/project-title.ogg',
        elements: [
          {
            type: 'image',
            src: 'ui/themes/moonlight/title/logo.png',
            x: 160,
            y: 90,
            width: 320,
            height: 180,
          },
        ],
      },
    },
    scenes: {},
  };

  await fs.writeFile(path.join(projectPath, 'script.json'), JSON.stringify(script, null, 2), 'utf-8');
  await fs.writeFile(path.join(projectPath, 'assets', 'ui', 'themes', 'moonlight', 'dialogue', 'nameplate.png'), new Uint8Array([1, 2, 3, 4]));
  await fs.writeFile(path.join(projectPath, 'assets', 'ui', 'themes', 'moonlight', 'screens', 'save-load-bg.png'), new Uint8Array([5, 6, 7, 8]));
  await fs.writeFile(path.join(projectPath, 'assets', 'ui', 'themes', 'moonlight', 'title', 'background.png'), new Uint8Array([9, 10, 11, 12]));
  await fs.writeFile(path.join(projectPath, 'assets', 'ui', 'themes', 'moonlight', 'title', 'logo.png'), new Uint8Array([13, 14, 15, 16]));
}

describe('theme package export round-trip', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
  });

  it('round-trips the current project theme through parseThemeZip without relying on app-bundled assets', async () => {
    const projectPath = await createProjectDir();
    await writeProjectScript(projectPath);

    const exported = await exportThemePackage({
      projectPath,
      metadata: {
        name: 'Moonlight',
      },
    });

    expect(exported.success).toBe(true);

    const parsed = parseThemeZip(exported.buffer);
    expect(parsed.success).toBe(true);
    expect(parsed.blockingErrors).toEqual([]);
    expect(parsed.themeId).toBe('moonlight');
    expect(parsed.assetRoot).toBe('ui/themes/moonlight/');
    expect(parsed.theme.ui.dialogueBox.nameplateBackgroundImage).toBe('ui/themes/moonlight/dialogue/nameplate.png');
    expect(parsed.theme.ui.saveLoadScreen.chrome.backgroundImage).toBe('ui/themes/moonlight/screens/save-load-bg.png');
    expect(parsed.theme.ui.titleScreen).toEqual({
      background: 'ui/themes/moonlight/title/background.png',
      elements: [
        {
          type: 'image',
          src: 'ui/themes/moonlight/title/logo.png',
          x: 160,
          y: 90,
          width: 320,
          height: 180,
        },
      ],
    });
    expect(parsed.files.map(file => file.path)).toContain('ui/themes/moonlight/title/background.png');
    expect(parsed.files.map(file => file.path)).toContain('ui/themes/moonlight/title/logo.png');
  });
});
