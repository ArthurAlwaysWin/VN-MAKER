import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  copyEditorRuntimePackages,
  createPackagedAppManifest,
} from '../scripts/package-editor-win.js';

test('packaged editor includes externalized png-to-ico runtime dependencies', async (t) => {
  const destinationRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'galgame-maker-package-'));
  t.after(() => fs.rm(destinationRoot, { recursive: true, force: true }));

  const copiedPackageNames = await copyEditorRuntimePackages(destinationRoot);

  assert.deepEqual(
    new Set(copiedPackageNames),
    new Set(['png-to-ico', '@types/node', 'minimist', 'pngjs', 'undici-types']),
  );
  for (const packageName of copiedPackageNames) {
    const packageJsonPath = path.join(destinationRoot, 'node_modules', packageName, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    assert.equal(packageJson.name, packageName);
  }
});

test('packaged editor manifest declares png-to-ico as a runtime dependency', () => {
  const manifest = createPackagedAppManifest({
    dependencies: { 'png-to-ico': '^3.0.1' },
  });

  assert.deepEqual(manifest.dependencies, { 'png-to-ico': '^3.0.1' });
  assert.equal(manifest.type, 'module');
  assert.equal(manifest.main, 'dist-electron/main.js');
});

test('packaged editor manifest rejects a development-only png-to-ico dependency', () => {
  assert.throws(
    () => createPackagedAppManifest({ devDependencies: { 'png-to-ico': '^3.0.1' } }),
    /runtime dependency/,
  );
});
