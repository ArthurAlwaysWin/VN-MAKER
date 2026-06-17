import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { atomicWrite } from '../electron/atomicWrite.js';

const tempDirs = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('atomicWrite', () => {
  it('creates and replaces files without leaving temporary artifacts', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'gm-atomic-write-'));
    tempDirs.push(dir);
    const filePath = path.join(dir, 'state.json');

    await atomicWrite(filePath, 'first');
    await atomicWrite(filePath, 'second');

    await expect(fs.readFile(filePath, 'utf-8')).resolves.toBe('second');
    await expect(fs.stat(`${filePath}.tmp`)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(`${filePath}.bak`)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
