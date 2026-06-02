/**
 * Export Pipeline — Desktop — Generate standalone Windows game from project.
 *
 * Orchestrates 9 steps: Vite engine build → asset scanning → staging setup →
 * engine + asset copy → template fill → package.json generation →
 * icon conversion → Electron dist copy + app assembly → optional ZIP.
 *
 * Uses the already-extracted Electron from node_modules/electron/dist/
 * instead of @electron/packager (which hangs on zip extraction on Windows).
 *
 * @module exportDesktop
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import pngToIco from 'png-to-ico';
import { scanAssets } from '../src/engine/scanAssets.js';
import {
  generateHtml,
  createZip,
  normalizeExportAssetPath,
  sanitizeFilename,
} from './exportGame.js';

const execAsync = promisify(exec);

// ─── Helpers ─────────────────────────────────────────────

/**
 * Sanitize game title for filesystem use.
 * Replaces Windows-illegal characters: < > : " | ? *
 * @param {string} title
 * @returns {string}
 */
function sanitizeTitle(title) {
  return sanitizeFilename(title, 'Untitled');
}

function isInsidePath(fullPath, basePath) {
  const resolved = path.resolve(fullPath);
  const baseResolved = path.resolve(basePath);
  return resolved === baseResolved || resolved.startsWith(baseResolved + path.sep);
}

// ─── Export Pipeline ─────────────────────────────────────

/**
 * Export a Galgame Maker project as a standalone Windows desktop game.
 *
 * @param {Object} options
 * @param {string} options.projectPath - Absolute path to project directory
 * @param {string} options.outputDir - Absolute path to base output directory
 * @param {string} options.gameTitle - Game title for window titlebar and .exe
 * @param {string|null} options.iconPath - Absolute path to user PNG icon, or null
 * @param {boolean} options.zip - Whether to create ZIP archive of output
 * @param {number} options.gameWidth - Game window width (default 1280)
 * @param {number} options.gameHeight - Game window height (default 720)
 * @param {boolean} [options._skipBuild] - Skip Vite build (testing)
 * @param {string} [options._appRoot] - Override APP_ROOT (testing)
 * @param {boolean} [options._skipPackager] - Skip @electron/packager (testing)
 * @param {Function} sendProgress - Callback: ({ step: string, percent: number }) => void
 * @returns {Promise<{success: boolean, outputPath: string, zipPath: string|null, warnings: string[]}>}
 */
export async function exportDesktop(options, sendProgress) {
  const {
    projectPath, outputDir, gameTitle, iconPath, zip,
    gameWidth = 1280, gameHeight = 720,
    _skipBuild, _appRoot, _skipPackager,
  } = options;
  const appRoot = _appRoot || process.env.APP_ROOT;
  const distWeb = path.join(appRoot, 'dist-web');
  const warnings = [];
  const sanitized = sanitizeTitle(gameTitle);
  let savedNoAsar;
  let noAsarChanged = false;

  console.log('[ExportDesktop] Starting:', sanitized);

  const stagingDir = path.join(tmpdir(), `gm-desktop-${randomUUID()}`);
  try {
    await fs.mkdir(stagingDir, { recursive: true });

    // Step 1 — 构建引擎 (0%)
    sendProgress({ step: '构建引擎', percent: 0 });
    if (!_skipBuild) {
      const configPath = path.join(appRoot, 'vite.web.config.js');
      await execAsync(`npx vite build --config "${configPath}"`, { cwd: appRoot });
    }

    // Step 2 — 扫描资源 (10%)
    sendProgress({ step: '扫描资源', percent: 10 });
    const scriptPath = path.join(projectPath, 'script.json');
    const scriptData = JSON.parse(await fs.readFile(scriptPath, 'utf-8'));
    const assetDict = scanAssets(scriptData);

    // Step 3 — 准备 staging (20%)
    sendProgress({ step: '准备 staging', percent: 20 });
    await fs.copyFile(path.join(distWeb, 'engine.js'), path.join(stagingDir, 'engine.js'));
    await fs.copyFile(path.join(distWeb, 'engine.css'), path.join(stagingDir, 'engine.css'));
    await fs.copyFile(scriptPath, path.join(stagingDir, 'script.json'));

    // Step 4 — 复制资源文件 (30%)
    sendProgress({ step: '复制资源文件', percent: 30 });
    const allPaths = [
      ...assetDict.backgrounds,
      ...assetDict.characters,
      ...assetDict.audio,
      ...assetDict.fonts,
      ...assetDict.ui,
      ...assetDict.voices,
      ...assetDict.effects,
    ];
    for (const relPath of allPaths) {
      const safeRelPath = normalizeExportAssetPath(relPath);
      if (!safeRelPath) {
        warnings.push(`Invalid asset path skipped: ${relPath}`);
        continue;
      }

      const assetRoot = path.join(projectPath, 'assets');
      const stagingAssetRoot = path.join(stagingDir, 'assets');
      const src = path.join(assetRoot, safeRelPath);
      const dst = path.join(stagingAssetRoot, safeRelPath);
      if (!isInsidePath(src, assetRoot) || !isInsidePath(dst, stagingAssetRoot)) {
        warnings.push(`Invalid asset path skipped: ${relPath}`);
        continue;
      }
      if (!existsSync(src)) {
        warnings.push(safeRelPath);
        continue;
      }
      await fs.mkdir(path.dirname(dst), { recursive: true });
      await fs.copyFile(src, dst);
    }

    // Step 5 — 填充模板 (45%)
    sendProgress({ step: '填充模板', percent: 45 });
    // D-01: Read from source files, replace placeholders
    const mainTemplatePath = path.join(appRoot, 'electron', 'game', 'main.js');
    let mainContent = await fs.readFile(mainTemplatePath, 'utf-8');
    mainContent = mainContent
      .replace("GAME_TITLE = 'My Game'", `GAME_TITLE = ${JSON.stringify(gameTitle)}`)
      .replace('GAME_WIDTH = 1280', `GAME_WIDTH = ${gameWidth}`)
      .replace('GAME_HEIGHT = 720', `GAME_HEIGHT = ${gameHeight}`);
    await fs.writeFile(path.join(stagingDir, 'main.js'), mainContent, 'utf-8');

    // Copy preload.js verbatim (no placeholders)
    const preloadPath = path.join(appRoot, 'electron', 'game', 'preload.js');
    await fs.copyFile(preloadPath, path.join(stagingDir, 'preload.js'));

    // Step 6 — 生成配置 (55%)
    sendProgress({ step: '生成配置', percent: 55 });
    // index.html with relative paths (reuse generateHtml from exportGame.js)
    const html = generateHtml(gameTitle, null);
    await fs.writeFile(path.join(stagingDir, 'index.html'), html, 'utf-8');

    // package.json for the game app (Pitfall 5: MUST include "type": "module")
    const gamePackageJson = {
      name: sanitized,
      version: '1.0.0',
      main: 'main.js',
      type: 'module',
    };
    await fs.writeFile(
      path.join(stagingDir, 'package.json'),
      JSON.stringify(gamePackageJson, null, 2),
      'utf-8',
    );

    // Step 7 — 转换图标 (65%)
    sendProgress({ step: '转换图标', percent: 65 });
    const defaultIconPath = path.join(appRoot, 'public', 'default-game-icon.png');
    const pngPath = iconPath && existsSync(iconPath) ? iconPath : defaultIconPath;
    const pngBuffer = await fs.readFile(pngPath);
    const icoBuffer = await pngToIco(pngBuffer);
    // Write .ico to staging (packager reads it from here)
    await fs.writeFile(path.join(stagingDir, 'icon.ico'), icoBuffer);

    // Step 8 — 打包应用 (75%)
    // Uses the already-extracted Electron from node_modules/electron/dist/
    // instead of @electron/packager (which hangs on Windows zip extraction).
    sendProgress({ step: '复制 Electron 运行时', percent: 75 });
    let finalOutputDir;
    if (!_skipPackager) {
      const electronDist = path.join(appRoot, 'node_modules', 'electron', 'dist');
      if (!existsSync(electronDist)) {
        throw new Error(`Electron dist not found: ${electronDist}`);
      }

      // Electron patches fs to intercept .asar files as virtual directories.
      // We need raw filesystem access to copy/delete .asar files as plain files.
      savedNoAsar = process.noAsar;
      process.noAsar = true;
      noAsarChanged = true;

      finalOutputDir = path.join(outputDir, `${sanitized}-win32-x64`);
      await fs.rm(finalOutputDir, { recursive: true, force: true }).catch(() => {});
      await fs.mkdir(finalOutputDir, { recursive: true });

      // 8a — Copy Electron runtime files
      console.log('[ExportDesktop] Copying Electron dist from:', electronDist);
      await fs.cp(electronDist, finalOutputDir, { recursive: true });

      // 8b — Rename electron.exe → {game}.exe
      sendProgress({ step: '配置可执行文件', percent: 82 });
      const srcExe = path.join(finalOutputDir, 'electron.exe');
      const dstExe = path.join(finalOutputDir, `${sanitized}.exe`);
      if (existsSync(srcExe)) {
        await fs.rename(srcExe, dstExe);
      }

      // 8c — Replace default_app.asar with our game files in resources/app/
      const resourcesApp = path.join(finalOutputDir, 'resources', 'app');
      const defaultAsar = path.join(finalOutputDir, 'resources', 'default_app.asar');
      await fs.rm(defaultAsar, { force: true }).catch(() => {});
      await fs.mkdir(resourcesApp, { recursive: true });
      await fs.cp(stagingDir, resourcesApp, { recursive: true });

      // 8d — Set custom icon on the exe via resedit (pure JS, no subprocess)
      sendProgress({ step: '写入图标', percent: 86 });
      const icoPath = path.join(stagingDir, 'icon.ico');
      try {
        const { NtExecutable, NtExecutableResource, Resource, Data } = await import('resedit');
        const exeData = await fs.readFile(dstExe);
        const exe = NtExecutable.from(exeData);
        const res = NtExecutableResource.from(exe);
        const iconGroups = Resource.IconGroupEntry.fromEntries(res.entries);
        if (iconGroups.length > 0) {
          const iconFile = Data.IconFile.from(await fs.readFile(icoPath));
          Resource.IconGroupEntry.replaceIconsForResource(
            res.entries, iconGroups[0].id, iconGroups[0].lang,
            iconFile.icons.map((i) => i.data),
          );
          res.outputResource(exe);
          await fs.writeFile(dstExe, Buffer.from(exe.generate()));
          console.log('[ExportDesktop] Icon applied via resedit');
        }
      } catch (e) {
        console.warn('[ExportDesktop] Icon injection skipped:', e.message);
        warnings.push('图标写入失败，使用默认 Electron 图标');
      }

      console.log('[ExportDesktop] App assembled at:', finalOutputDir);
    } else {
      // Testing: return staging dir as output for test inspection
      finalOutputDir = stagingDir;
    }

    // Step 9 — 打包 ZIP (90%)
    sendProgress({ step: '打包 ZIP', percent: 90 });
    let zipPath = null;
    if (zip) {
      const zipTarget = finalOutputDir;
      zipPath = path.join(path.dirname(zipTarget), `${sanitized}.zip`);
      await createZip(zipTarget, zipPath);
    }

    sendProgress({ step: '完成', percent: 100 });
    console.log('[ExportDesktop] Complete:', finalOutputDir);
    return { success: true, outputPath: finalOutputDir, zipPath, warnings };
  } finally {
    if (noAsarChanged) {
      process.noAsar = savedNoAsar;
    }
    // D-04: Clean staging on completion or failure; preserve final output
    if (!_skipPackager) {
      await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
