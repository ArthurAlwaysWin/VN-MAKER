import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { isInsidePath, isPathInsideRealBase } from '../electron/pathSecurity.js';
import { isInsidePath as sharedIsInsidePath } from '../src/shared/pathContainment.js';

const tempDirs = [];

async function makeTempDir(prefix) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

describe('pathSecurity', () => {
  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
  });

  it('rejects lexical path traversal outside the base path', () => {
    const base = path.resolve('/project/assets');
    expect(isInsidePath).toBe(sharedIsInsidePath);
    expect(isInsidePath(path.join(base, 'ui', 'frame.png'), base)).toBe(true);
    expect(isInsidePath(path.join(base, '..', 'outside.png'), base)).toBe(false);
    expect(isInsidePath('', base)).toBe(false);
  });

  it('allows missing descendants when the nearest real parent is inside base', async () => {
    const base = await makeTempDir('gm-path-base-');
    await expect(
      isPathInsideRealBase(path.join(base, 'ui', 'themes', 'new.png'), base, { allowMissing: true }),
    ).resolves.toBe(true);
  });

  it('rejects paths that lexically stay inside base but resolve through a symlink outside it', async () => {
    const base = await makeTempDir('gm-path-base-');
    const outside = await makeTempDir('gm-path-outside-');
    const linkPath = path.join(base, 'linked');
    try {
      await fs.symlink(outside, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error?.code)) {
        return;
      }
      throw error;
    }

    await expect(
      isPathInsideRealBase(path.join(linkPath, 'escape.png'), base, { allowMissing: true }),
    ).resolves.toBe(false);
  });
});
