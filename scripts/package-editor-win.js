import { zipSync } from 'fflate';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const releaseRoot = path.join(repoRoot, 'release');
const appName = 'Galgame Maker';
const targetDir = path.join(releaseRoot, `${appName}-win32-x64`);
const resourcesDir = path.join(targetDir, 'resources');
const appDir = path.join(resourcesDir, 'app');

function hasFlag(name) {
  return process.argv.includes(name);
}

async function assertPath(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Required build artifact is missing: ${relativePath}`);
  }
  return fullPath;
}

async function copyIntoApp(relativePath) {
  const source = await assertPath(relativePath);
  const destination = path.join(appDir, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true });
}

async function createZip(sourceDir, zipPath) {
  const files = {};

  async function walk(dir, prefix = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(fullPath, key);
      } else if (entry.isFile()) {
        files[key] = new Uint8Array(await fs.readFile(fullPath));
      }
    }
  }

  await walk(sourceDir);
  await fs.writeFile(zipPath, zipSync(files));
}

async function main() {
  const electronDist = await assertPath('node_modules/electron/dist');
  await assertPath('dist/editor.html');
  await assertPath('dist/index.html');
  await assertPath('dist-electron/main.js');
  await assertPath('dist-electron/preload.mjs');
  await assertPath('dist-web/engine.js');
  await assertPath('dist-web/engine.css');

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(releaseRoot, { recursive: true });
  await fs.cp(electronDist, targetDir, { recursive: true });

  const sourceExe = path.join(targetDir, 'electron.exe');
  const targetExe = path.join(targetDir, `${appName}.exe`);
  if (existsSync(sourceExe)) {
    await fs.rm(targetExe, { force: true });
    await fs.rename(sourceExe, targetExe);
  }

  await fs.rm(path.join(resourcesDir, 'default_app.asar'), { force: true }).catch(() => {});
  await fs.rm(appDir, { recursive: true, force: true });
  await fs.mkdir(appDir, { recursive: true });

  await Promise.all([
    copyIntoApp('dist'),
    copyIntoApp('dist-electron'),
    copyIntoApp('dist-web'),
    copyIntoApp('public'),
    copyIntoApp('electron/game'),
  ]);

  const packageJson = {
    name: 'galgame-maker-editor',
    productName: appName,
    version: '0.1.0',
    type: 'module',
    main: 'dist-electron/main.js',
    private: true,
  };
  await fs.writeFile(path.join(appDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  let zipPath = null;
  if (hasFlag('--zip')) {
    zipPath = path.join(releaseRoot, `${appName}-win32-x64.zip`);
    await fs.rm(zipPath, { force: true });
    await createZip(targetDir, zipPath);
  }

  const output = {
    success: true,
    outputPath: targetDir,
    exePath: targetExe,
    zipPath,
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`[package-editor-win] ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
