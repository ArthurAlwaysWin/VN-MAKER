/**
 * Export Pipeline — Generate deployable Web static bundle from project data.
 *
 * Orchestrates 6 steps: Vite engine build → asset scanning → engine copy →
 * asset copy → HTML generation → optional ZIP packaging.
 *
 * @module exportGame
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import { scanAssets } from '../src/engine/scanAssets.js';

const execAsync = promisify(exec);

// ─── HTML Helpers ────────────────────────────────────────

/**
 * Escape HTML special characters in a string.
 * @param {string} str - Raw string to escape
 * @returns {string} HTML-safe string
 * @private
 */
function _escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate the standalone HTML shell for the exported game.
 * @param {string} gameTitle - Title displayed in the browser tab
 * @param {string|null} faviconFilename - Filename of favicon (e.g. 'favicon.ico') or null
 * @returns {string} Complete HTML document string
 */
export function generateHtml(gameTitle, faviconFilename) {
  const escaped = _escapeHtml(gameTitle);
  const faviconTag = faviconFilename
    ? `\n  <link rel="icon" href="./${faviconFilename}">`
    : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1280" />
  <title>${escaped}</title>${faviconTag}
  <script type="module" crossorigin src="./engine.js"></script>
  <link rel="stylesheet" crossorigin href="./engine.css">
</head>
<body>
  <div id="game-container">
    <div id="background-layer"></div>
    <div id="character-layer"></div>
    <div id="dialogue-layer"></div>
    <div id="ui-overlay"></div>
  </div>
</body>
</html>`;
}

// ─── ZIP Helper ──────────────────────────────────────────

/**
 * Recursively walk a directory and create a ZIP archive.
 * ZIP entry keys always use forward slashes (cross-platform).
 * @param {string} sourceDir - Absolute path to directory to zip
 * @param {string} zipPath - Absolute path for output .zip file
 * @private
 */
async function _createZip(sourceDir, zipPath) {
  const files = {};

  async function walk(dir, prefix) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      // ZIP keys MUST use forward slashes (not path.join which uses \ on Windows)
      const key = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.isDirectory()) {
        await walk(fullPath, key);
      } else {
        files[key] = new Uint8Array(await fs.readFile(fullPath));
      }
    }
  }

  await walk(sourceDir, '');
  const zipBuffer = zipSync(files);
  await fs.writeFile(zipPath, zipBuffer);
}

// ─── Export Pipeline ─────────────────────────────────────

/**
 * Export a Galgame Maker project as a standalone Web static bundle.
 *
 * 6-step pipeline:
 *   1. 构建引擎 — Vite build (skippable for tests)
 *   2. 扫描资源 — Scan script.json for referenced assets
 *   3. 复制引擎产物 — Copy engine.js, engine.css, script.json
 *   4. 复制资源文件 — Copy only referenced assets, skip missing (D-01)
 *   5. 生成 HTML — Generate index.html with title and optional favicon
 *   6. 打包 ZIP — Optional ZIP archive creation
 *
 * @param {Object} options - Export configuration
 * @param {string} options.projectPath - Absolute path to project directory
 * @param {string} options.outputDir - Absolute path to output directory
 * @param {string} options.gameTitle - Title for the HTML page
 * @param {string|null} options.faviconPath - Absolute path to favicon file, or null
 * @param {boolean} options.zip - Whether to create a ZIP archive
 * @param {boolean} [options._skipBuild] - Skip Vite build (for testing)
 * @param {string} [options._appRoot] - Override APP_ROOT (for testing)
 * @param {Function} sendProgress - Callback: ({ step: string, percent: number }) => void
 * @returns {Promise<{ success: boolean, outputPath: string, zipPath: string|null, warnings: string[] }>}
 */
export async function exportGame(options, sendProgress) {
  const { projectPath, outputDir, gameTitle, faviconPath, zip, _skipBuild, _appRoot } = options;
  const appRoot = _appRoot || process.env.APP_ROOT;
  const distWeb = path.join(appRoot, 'dist-web');
  const warnings = [];

  await fs.mkdir(outputDir, { recursive: true });

  // Step 1 — 构建引擎 (0%)
  sendProgress({ step: '构建引擎', percent: 0 });
  if (!_skipBuild) {
    const configPath = path.join(appRoot, 'vite.web.config.js');
    await execAsync(`npx vite build --config "${configPath}"`, { cwd: appRoot });
  }

  // Step 2 — 扫描资源 (17%)
  sendProgress({ step: '扫描资源', percent: 17 });
  const scriptPath = path.join(projectPath, 'script.json');
  const scriptData = JSON.parse(await fs.readFile(scriptPath, 'utf-8'));
  const assetDict = scanAssets(scriptData);

  // Step 3 — 复制引擎产物 (33%)
  sendProgress({ step: '复制引擎产物', percent: 33 });
  await fs.copyFile(path.join(distWeb, 'engine.js'), path.join(outputDir, 'engine.js'));
  await fs.copyFile(path.join(distWeb, 'engine.css'), path.join(outputDir, 'engine.css'));
  await fs.copyFile(scriptPath, path.join(outputDir, 'script.json'));

  // Step 4 — 复制资源文件 (50%)
  sendProgress({ step: '复制资源文件', percent: 50 });
  const allPaths = [
    ...assetDict.backgrounds,
    ...assetDict.characters,
    ...assetDict.audio,
    ...assetDict.fonts,
    ...assetDict.voices,
  ];
  for (const relPath of allPaths) {
    const src = path.join(projectPath, 'assets', relPath);
    const dst = path.join(outputDir, 'assets', relPath);
    if (!existsSync(src)) {
      warnings.push(relPath);
      continue;
    }
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.copyFile(src, dst);
  }

  // Step 5 — 生成 HTML (67%)
  sendProgress({ step: '生成 HTML', percent: 67 });
  let faviconFilename = null;
  if (faviconPath && existsSync(faviconPath)) {
    faviconFilename = path.basename(faviconPath);
    await fs.copyFile(faviconPath, path.join(outputDir, faviconFilename));
  }
  const html = generateHtml(gameTitle, faviconFilename);
  await fs.writeFile(path.join(outputDir, 'index.html'), html, 'utf-8');

  // Step 6 — 打包 ZIP (83%)
  sendProgress({ step: '打包 ZIP', percent: 83 });
  let zipPath = null;
  if (zip) {
    zipPath = path.join(path.dirname(outputDir), `${gameTitle}.zip`);
    await _createZip(outputDir, zipPath);
  }

  // Completion (100%)
  sendProgress({ step: '完成', percent: 100 });
  return { success: true, outputPath: outputDir, zipPath, warnings };
}
