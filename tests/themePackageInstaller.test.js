import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { zipSync, strToU8 } from 'fflate';

import { installThemePackage } from '../electron/themePackageInstaller.js';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function createFullThemeZip(themeId, files) {
  const themeJson = {
    ui: {
      theme: {
        tokens: {
          primary: '#ffffff',
        },
      },
      widgetStyles: {
        tab: {
          activeBackgroundImage: files[0]?.path ?? '',
        },
      },
      dialogueBox: {
        nameplateBackgroundImage: files[1]?.path ?? files[0]?.path ?? '',
      },
      saveLoadScreen: {
        chrome: {
          backgroundImage: files[2]?.path ?? files[0]?.path ?? '',
        },
      },
      backlogScreen: {
        chrome: {
          backgroundImage: files[3]?.path ?? files[0]?.path ?? '',
        },
      },
      gameMenu: {
        chrome: {
          backgroundImage: files[4]?.path ?? files[0]?.path ?? '',
        },
      },
      settingsScreen: {
        chrome: {
          backgroundImage: files[5]?.path ?? files[0]?.path ?? '',
        },
      },
      titleScreen: {
        background: files[6]?.path ?? files[0]?.path ?? '',
        bgm: 'audio/title-theme.ogg',
        elements: [
          {
            type: 'image',
            src: files[7]?.path ?? files[0]?.path ?? '',
            x: 100,
            y: 60,
            width: 300,
            height: 200,
          },
        ],
      },
    },
  };
  const archive = {
    'manifest.json': strToU8(JSON.stringify({
      formatVersion: 2,
      packageVersion: '1.0.0',
      id: themeId,
      name: 'Moonlight',
      assetRoot: `ui/themes/${themeId}/`,
      files: files.map(file => ({
        path: file.path,
        sha256: sha256(file.bytes),
        bytes: file.bytes.length,
      })),
    })),
    'theme.json': strToU8(JSON.stringify(themeJson)),
  };

  for (const file of files) {
    archive[`assets/${file.path}`] = file.bytes;
  }

  return zipSync(archive);
}

const tempDirs = [];

async function createProjectDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gm-theme-install-'));
  tempDirs.push(dir);
  await fs.mkdir(path.join(dir, 'assets', 'ui'), { recursive: true });
  return dir;
}

describe('theme package installer', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
  });

  it('installs imported full themes into the project namespace and returns canonical bundle refs plus package metadata', async () => {
    const projectPath = await createProjectDir();
    const packagePath = path.join(projectPath, 'moonlight.gmtheme');
    await fs.writeFile(packagePath, createFullThemeZip('moonlight', [
      { path: 'ui/themes/moonlight/widgets/tab-active.png', bytes: new Uint8Array([1, 1, 1, 1]) },
      { path: 'ui/themes/moonlight/dialogue/nameplate.png', bytes: new Uint8Array([2, 2, 2, 2]) },
      { path: 'ui/themes/moonlight/screens/save-load-bg.png', bytes: new Uint8Array([3, 3, 3, 3]) },
      { path: 'ui/themes/moonlight/screens/backlog-bg.png', bytes: new Uint8Array([4, 4, 4, 4]) },
      { path: 'ui/themes/moonlight/screens/game-menu-bg.png', bytes: new Uint8Array([5, 5, 5, 5]) },
      { path: 'ui/themes/moonlight/screens/settings-bg.png', bytes: new Uint8Array([6, 6, 6, 6]) },
      { path: 'ui/themes/moonlight/title/background.png', bytes: new Uint8Array([7, 7, 7, 7]) },
      { path: 'ui/themes/moonlight/title/logo.png', bytes: new Uint8Array([8, 8, 8, 8]) },
    ]));

    const result = await installThemePackage({
      source: 'file',
      filePath: packagePath,
      projectPath,
    });

    expect(result.success).toBe(true);
    expect(result.bundle.widgetStyles.tab.activeBackgroundImage).toBe('ui/themes/moonlight/widgets/tab-active.png');
    expect(result.bundle.dialogueBox.nameplateBackgroundImage).toBe('ui/themes/moonlight/dialogue/nameplate.png');
    expect(result.bundle.titleScreen).toEqual({
      background: 'ui/themes/moonlight/title/background.png',
      elements: [
        {
          type: 'image',
          src: 'ui/themes/moonlight/title/logo.png',
          x: 100,
          y: 60,
          width: 300,
          height: 200,
        },
      ],
    });
    expect(result.packageMeta).toEqual({
      source: 'file',
      themeId: 'moonlight',
      mode: 'full',
      assetRoot: 'ui/themes/moonlight/',
    });
    await expect(
      fs.readFile(path.join(projectPath, 'assets', 'ui', 'themes', 'moonlight', 'widgets', 'tab-active.png')),
    ).resolves.toBeInstanceOf(Uint8Array);
  });

  it('routes built-in themes through the same installed bundle shape without special-casing renderer apply', async () => {
    const projectPath = await createProjectDir();

    const result = await installThemePackage({
      source: 'builtin',
      themeId: 'wafuu',
      projectPath,
    });

    expect(result.success).toBe(true);
    expect(result.packageMeta).toEqual({
      source: 'builtin',
      themeId: 'wafuu',
      mode: 'full',
      assetRoot: 'ui/themes/wafuu/',
    });
    expect(result.bundle.theme.tokens.primary).toBeTruthy();
    expect(result.bundle.settingsScreen).toBeTypeOf('object');
    expect(result.bundle.settingsScreen.footer.buttons).toEqual([
      { text: '恢复默认', action: 'reset', x: 1030, y: 14 },
    ]);
    expect(result.bundle.titleScreen).toEqual({
      background: null,
      elements: [
        {
          type: 'text',
          content: '物语',
          x: 640,
          y: 150,
          anchor: 'center',
          fontSize: 52,
          fontFamily: "'Noto Serif SC', serif",
          color: 'rgba(244, 235, 226, 0.92)',
          letterSpacing: 12,
          textShadow: '0 6px 24px rgba(20, 12, 10, 0.45)',
        },
        {
          type: 'button',
          text: '开始',
          action: 'start',
          x: 640,
          y: 360,
          anchor: 'center',
          width: 220,
          height: 52,
          fontSize: 20,
          fontFamily: "'Noto Serif SC', serif",
          color: 'rgba(244, 235, 226, 0.92)',
          backgroundColor: 'rgba(89, 56, 38, 0.72)',
          hoverColor: 'rgba(138, 80, 40, 0.82)',
          borderRadius: 6,
          border: '1px solid rgba(193, 157, 113, 0.45)',
        },
        {
          type: 'button',
          text: '设置',
          action: 'settings',
          x: 640,
          y: 430,
          anchor: 'center',
          width: 220,
          height: 52,
          fontSize: 20,
          fontFamily: "'Noto Serif SC', serif",
          color: 'rgba(244, 235, 226, 0.92)',
          backgroundColor: 'rgba(89, 56, 38, 0.58)',
          hoverColor: 'rgba(138, 80, 40, 0.78)',
          borderRadius: 6,
          border: '1px solid rgba(193, 157, 113, 0.35)',
        },
      ],
    });
  });
});
