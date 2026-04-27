import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { zipSync, strToU8 } from 'fflate';
import { afterEach, describe, expect, it } from 'vitest';

import { preflightThemePackage } from '../electron/themePackagePreflight.js';

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
      settingsScreen: {
        chrome: {
          backgroundImage: files[2]?.path ?? files[0]?.path ?? '',
        },
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
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gm-theme-preflight-'));
  tempDirs.push(dir);
  await fs.mkdir(path.join(dir, 'assets', 'ui', 'themes', 'moonlight'), { recursive: true });
  return dir;
}

describe('theme package preflight', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
  });

  it('blocks corrupt and path-invalid packages before any write is attempted', async () => {
    const projectPath = await createProjectDir();
    const corruptPath = path.join(projectPath, 'broken.gmtheme');
    await fs.writeFile(corruptPath, new Uint8Array([1, 2, 3, 4]));

    const corrupt = await preflightThemePackage({
      filePath: corruptPath,
      projectPath,
    });

    expect(corrupt.success).toBe(true);
    expect(corrupt.status).toBe('blocked');
    expect(corrupt.blockingErrors[0]).toContain('无法解析');

    const invalidZipPath = path.join(projectPath, 'invalid.gmtheme');
    await fs.writeFile(invalidZipPath, zipSync({
      'manifest.json': strToU8(JSON.stringify({
        formatVersion: 2,
        packageVersion: '1.0.0',
        id: 'moonlight',
        assetRoot: 'ui/themes/moonlight/',
        files: [
          {
            path: 'assets/ui/themes/moonlight/dialogue/nameplate.png',
            sha256: 'bad-path',
            bytes: 4,
          },
        ],
      })),
      'theme.json': strToU8(JSON.stringify({
        ui: {
          theme: { tokens: { primary: '#fff' } },
          dialogueBox: {
            nameplateBackgroundImage: 'assets/ui/themes/moonlight/dialogue/nameplate.png',
          },
        },
      })),
      'assets/assets/ui/themes/moonlight/dialogue/nameplate.png': new Uint8Array([1, 2, 3, 4]),
    }));

    const invalid = await preflightThemePackage({
      filePath: invalidZipPath,
      projectPath,
    });

    expect(invalid.success).toBe(true);
    expect(invalid.status).toBe('blocked');
    expect(invalid.blockingErrors.length).toBeGreaterThan(0);
  });

  it('reports stable copy skip overwrite actions inside the same namespace only', async () => {
    const projectPath = await createProjectDir();
    const sameBytes = new Uint8Array([1, 1, 1, 1]);
    const oldBytes = new Uint8Array([2, 2, 2, 2]);
    await fs.mkdir(path.join(projectPath, 'assets', 'ui', 'themes', 'moonlight', 'dialogue'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'assets', 'ui', 'themes', 'moonlight', 'icons'), { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'assets', 'ui', 'themes', 'moonlight', 'dialogue', 'nameplate.png'),
      oldBytes,
    );
    await fs.writeFile(
      path.join(projectPath, 'assets', 'ui', 'themes', 'moonlight', 'icons', 'qab.png'),
      sameBytes,
    );

    const packagePath = path.join(projectPath, 'moonlight.gmtheme');
    await fs.writeFile(packagePath, createFullThemeZip('moonlight', [
      {
        path: 'ui/themes/moonlight/widgets/tab-active.png',
        bytes: new Uint8Array([9, 9, 9, 9]),
      },
      {
        path: 'ui/themes/moonlight/dialogue/nameplate.png',
        bytes: new Uint8Array([3, 3, 3, 3]),
      },
      {
        path: 'ui/themes/moonlight/icons/qab.png',
        bytes: sameBytes,
      },
    ]));

    const result = await preflightThemePackage({
      filePath: packagePath,
      projectPath,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('ready');
    expect(result.actions).toEqual([
      { type: 'copy', path: 'ui/themes/moonlight/widgets/tab-active.png' },
      { type: 'overwrite', path: 'ui/themes/moonlight/dialogue/nameplate.png' },
      { type: 'skip', path: 'ui/themes/moonlight/icons/qab.png' },
    ]);
    expect(result.actions.every(action => !/-\d+\./.test(action.path))).toBe(true);
    await expect(
      fs.access(path.join(projectPath, 'assets', 'ui', 'themes', 'moonlight', 'widgets', 'tab-active.png')),
    ).rejects.toThrow();
  });
});
