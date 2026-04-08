/**
 * exportGame — Integration tests for the export pipeline.
 *
 * Covers all PIPE requirements (01-05, 07) across 7 describe blocks:
 *   generateHtml output, output structure, asset filtering,
 *   missing assets (D-01), favicon (PIPE-04), ZIP (PIPE-05),
 *   progress callbacks (PIPE-07).
 *
 * Uses Node.js built-in test runner (node:test + node:assert/strict).
 * Run with: node --test tests/exportGame.test.js
 */

import { describe, it, before, after } from 'node:test';
import { strictEqual, deepStrictEqual, ok, match } from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { unzipSync, strFromU8 } from 'fflate';
import { exportGame, generateHtml } from '../electron/exportGame.js';

// ─── Test Fixture Helpers ────────────────────────────────

/**
 * Create a mock project directory with script.json and asset files.
 * @param {string} baseDir - Root directory for the mock project
 */
async function createMockProject(baseDir) {
  const script = {
    characters: {
      hero: {
        name: 'Hero',
        expressions: {
          normal: 'characters/hero_normal.png',
        },
      },
    },
    scenes: {
      intro: {
        pages: [{
          background: 'backgrounds/city.png',
          bgm: { file: 'audio/bgm1.mp3' },
          dialogues: [],
        }],
      },
    },
  };
  await fs.mkdir(baseDir, { recursive: true });
  await fs.writeFile(path.join(baseDir, 'script.json'), JSON.stringify(script), 'utf-8');

  // Referenced asset files
  await fs.mkdir(path.join(baseDir, 'assets', 'backgrounds'), { recursive: true });
  await fs.mkdir(path.join(baseDir, 'assets', 'characters'), { recursive: true });
  await fs.mkdir(path.join(baseDir, 'assets', 'audio'), { recursive: true });

  await fs.writeFile(path.join(baseDir, 'assets', 'backgrounds', 'city.png'), Buffer.from('FAKE'));
  await fs.writeFile(path.join(baseDir, 'assets', 'characters', 'hero_normal.png'), Buffer.from('FAKE'));
  await fs.writeFile(path.join(baseDir, 'assets', 'audio', 'bgm1.mp3'), Buffer.from('FAKE'));

  // Unreferenced file (should NOT be copied)
  await fs.writeFile(path.join(baseDir, 'assets', 'audio', 'unreferenced.mp3'), Buffer.from('NOPE'));
}

/**
 * Create a mock appRoot with dist-web build artifacts.
 * @param {string} baseDir - Root directory for the mock app root
 */
async function createMockAppRoot(baseDir) {
  await fs.mkdir(path.join(baseDir, 'dist-web'), { recursive: true });
  await fs.writeFile(path.join(baseDir, 'dist-web', 'engine.js'), '// mock engine bundle', 'utf-8');
  await fs.writeFile(path.join(baseDir, 'dist-web', 'engine.css'), '/* mock engine styles */', 'utf-8');
}

/**
 * Create a mock favicon file.
 * @param {string} baseDir - Directory to place favicon in
 * @returns {string} Absolute path to the created favicon
 */
async function createFaviconFile(baseDir) {
  const faviconPath = path.join(baseDir, 'favicon.ico');
  await fs.writeFile(faviconPath, Buffer.from('ICON'));
  return faviconPath;
}

// ─── Shared State ────────────────────────────────────────

let tempRoot;
let mockProjectDir;
let mockAppRoot;

before(async () => {
  tempRoot = await fs.mkdtemp(path.join(tmpdir(), 'export-test-'));
  mockProjectDir = path.join(tempRoot, 'project');
  mockAppRoot = path.join(tempRoot, 'approot');
  await createMockProject(mockProjectDir);
  await createMockAppRoot(mockAppRoot);
});

after(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

// ─── generateHtml Tests ─────────────────────────────────

describe('generateHtml', () => {
  it('includes game title in <title> tag', () => {
    match(generateHtml('My Game', null), /<title>My Game<\/title>/);
  });

  it('includes favicon link when provided', () => {
    match(generateHtml('X', 'favicon.ico'), /href="\.\/favicon\.ico"/);
  });

  it('omits favicon link when null', () => {
    ok(!generateHtml('X', null).includes('rel="icon"'));
  });

  it('escapes HTML special characters in title', () => {
    match(generateHtml('A <B> "C"', null), /A &lt;B&gt; &quot;C&quot;/);
  });

  it('includes game-container with 4 layer divs', () => {
    const html = generateHtml('Test', null);
    ok(html.includes('id="game-container"'));
    ok(html.includes('id="background-layer"'));
    ok(html.includes('id="character-layer"'));
    ok(html.includes('id="dialogue-layer"'));
    ok(html.includes('id="ui-overlay"'));
  });
});

// ─── exportGame — Output Structure ──────────────────────

describe('exportGame — output structure', () => {
  let outputDir;
  let result;

  before(async () => {
    outputDir = path.join(tempRoot, 'output-structure');
    const noop = () => {};
    result = await exportGame({
      projectPath: mockProjectDir,
      outputDir,
      gameTitle: 'Test Game',
      faviconPath: null,
      zip: false,
      _skipBuild: true,
      _appRoot: mockAppRoot,
    }, noop);
  });

  it('creates index.html, engine.js, engine.css, script.json', () => {
    ok(existsSync(path.join(outputDir, 'index.html')));
    ok(existsSync(path.join(outputDir, 'engine.js')));
    ok(existsSync(path.join(outputDir, 'engine.css')));
    ok(existsSync(path.join(outputDir, 'script.json')));
  });

  it('engine.js matches dist-web source', async () => {
    const src = await fs.readFile(path.join(mockAppRoot, 'dist-web', 'engine.js'), 'utf-8');
    const dst = await fs.readFile(path.join(outputDir, 'engine.js'), 'utf-8');
    strictEqual(dst, src);
  });

  it('script.json is verbatim copy (per D-03)', async () => {
    const src = await fs.readFile(path.join(mockProjectDir, 'script.json'), 'utf-8');
    const dst = await fs.readFile(path.join(outputDir, 'script.json'), 'utf-8');
    strictEqual(dst, src);
  });

  it('index.html contains game title', async () => {
    const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    match(html, /<title>Test Game<\/title>/);
  });
});

// ─── exportGame — Asset Filtering ───────────────────────

describe('exportGame — asset filtering', () => {
  let outputDir;

  before(async () => {
    outputDir = path.join(tempRoot, 'output-filtering');
    const noop = () => {};
    await exportGame({
      projectPath: mockProjectDir,
      outputDir,
      gameTitle: 'Filter Test',
      faviconPath: null,
      zip: false,
      _skipBuild: true,
      _appRoot: mockAppRoot,
    }, noop);
  });

  it('copies referenced background', () => {
    ok(existsSync(path.join(outputDir, 'assets', 'backgrounds', 'city.png')));
  });

  it('copies referenced character', () => {
    ok(existsSync(path.join(outputDir, 'assets', 'characters', 'hero_normal.png')));
  });

  it('does NOT copy unreferenced audio', () => {
    ok(!existsSync(path.join(outputDir, 'assets', 'audio', 'unreferenced.mp3')));
  });
});

// ─── exportGame — Missing Assets ────────────────────────

describe('exportGame — missing assets', () => {
  it('skips missing files and reports warnings', async () => {
    const projDir = path.join(tempRoot, 'project-missing');
    await fs.mkdir(projDir, { recursive: true });

    const script = {
      scenes: {
        s1: {
          pages: [{
            background: 'backgrounds/missing.png',
            dialogues: [],
          }],
        },
      },
    };
    await fs.writeFile(path.join(projDir, 'script.json'), JSON.stringify(script), 'utf-8');
    // No actual asset file created — it's missing

    const outputDir = path.join(tempRoot, 'output-missing');
    const noop = () => {};
    const result = await exportGame({
      projectPath: projDir,
      outputDir,
      gameTitle: 'Missing Test',
      faviconPath: null,
      zip: false,
      _skipBuild: true,
      _appRoot: mockAppRoot,
    }, noop);

    ok(result.success);
    ok(result.warnings.includes('backgrounds/missing.png'));
  });
});

// ─── exportGame — Favicon ───────────────────────────────

describe('exportGame — favicon', () => {
  it('copies favicon when path provided', async () => {
    const faviconPath = await createFaviconFile(tempRoot);
    const outputDir = path.join(tempRoot, 'output-favicon-yes');
    const noop = () => {};
    await exportGame({
      projectPath: mockProjectDir,
      outputDir,
      gameTitle: 'Favicon Test',
      faviconPath,
      zip: false,
      _skipBuild: true,
      _appRoot: mockAppRoot,
    }, noop);

    ok(existsSync(path.join(outputDir, 'favicon.ico')));
    const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    ok(html.includes('rel="icon"'));
  });

  it('no favicon in output when path is null', async () => {
    const outputDir = path.join(tempRoot, 'output-favicon-no');
    const noop = () => {};
    await exportGame({
      projectPath: mockProjectDir,
      outputDir,
      gameTitle: 'No Favicon',
      faviconPath: null,
      zip: false,
      _skipBuild: true,
      _appRoot: mockAppRoot,
    }, noop);

    ok(!existsSync(path.join(outputDir, 'favicon.ico')));
    const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    ok(!html.includes('rel="icon"'));
  });
});

// ─── exportGame — ZIP ───────────────────────────────────

describe('exportGame — ZIP', () => {
  it('creates ZIP when zip=true', async () => {
    const outputDir = path.join(tempRoot, 'output-zip-yes');
    const noop = () => {};
    await exportGame({
      projectPath: mockProjectDir,
      outputDir,
      gameTitle: 'ZIP Test',
      faviconPath: null,
      zip: true,
      _skipBuild: true,
      _appRoot: mockAppRoot,
    }, noop);

    const zipPath = path.join(tempRoot, 'ZIP Test.zip');
    ok(existsSync(zipPath));
  });

  it('ZIP contains expected files', async () => {
    const outputDir = path.join(tempRoot, 'output-zip-contents');
    const noop = () => {};
    await exportGame({
      projectPath: mockProjectDir,
      outputDir,
      gameTitle: 'ZIPContents',
      faviconPath: null,
      zip: true,
      _skipBuild: true,
      _appRoot: mockAppRoot,
    }, noop);

    const zipPath = path.join(tempRoot, 'ZIPContents.zip');
    const zipData = new Uint8Array(await fs.readFile(zipPath));
    const entries = unzipSync(zipData);
    const keys = Object.keys(entries);

    ok(keys.includes('index.html'), 'ZIP should contain index.html');
    ok(keys.includes('engine.js'), 'ZIP should contain engine.js');
    ok(keys.includes('engine.css'), 'ZIP should contain engine.css');
    ok(keys.includes('script.json'), 'ZIP should contain script.json');
    ok(keys.includes('assets/backgrounds/city.png'), 'ZIP should contain assets/backgrounds/city.png');
  });

  it('no ZIP when zip=false', async () => {
    const outputDir = path.join(tempRoot, 'output-zip-no');
    const noop = () => {};
    await exportGame({
      projectPath: mockProjectDir,
      outputDir,
      gameTitle: 'NoZIP',
      faviconPath: null,
      zip: false,
      _skipBuild: true,
      _appRoot: mockAppRoot,
    }, noop);

    const zipPath = path.join(tempRoot, 'NoZIP.zip');
    ok(!existsSync(zipPath));
  });
});

// ─── exportGame — Progress ──────────────────────────────

describe('exportGame — progress', () => {
  it('calls sendProgress with all 6 steps + completion', async () => {
    const outputDir = path.join(tempRoot, 'output-progress');
    const calls = [];
    const sendProgress = (payload) => calls.push(payload);

    await exportGame({
      projectPath: mockProjectDir,
      outputDir,
      gameTitle: 'Progress Test',
      faviconPath: null,
      zip: false,
      _skipBuild: true,
      _appRoot: mockAppRoot,
    }, sendProgress);

    strictEqual(calls.length, 7);
    deepStrictEqual(calls.map(c => c.step), [
      '构建引擎', '扫描资源', '复制引擎产物', '复制资源文件', '生成 HTML', '打包 ZIP', '完成',
    ]);
    deepStrictEqual(calls.map(c => c.percent), [0, 17, 33, 50, 67, 83, 100]);
  });

  it('returns success with outputPath and warnings', async () => {
    const outputDir = path.join(tempRoot, 'output-result');
    const noop = () => {};
    const result = await exportGame({
      projectPath: mockProjectDir,
      outputDir,
      gameTitle: 'Result Test',
      faviconPath: null,
      zip: false,
      _skipBuild: true,
      _appRoot: mockAppRoot,
    }, noop);

    strictEqual(result.success, true);
    strictEqual(result.outputPath, outputDir);
    ok(Array.isArray(result.warnings));
  });
});
