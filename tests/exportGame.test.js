/**
 * exportGame — Integration tests for the export pipeline.
 *
 * Covers all PIPE requirements (01-05, 07) plus the Phase 61 stage-layer
 * ownership shell contract used by exported builds.
 *
 * Run with: npx vitest run tests/exportGame.test.js
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { unzipSync } from 'fflate';
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
    ui: {
      saveLoadScreen: {
        background: 'ui/save_bg.png',
      },
    },
  };
  await fs.mkdir(baseDir, { recursive: true });
  await fs.writeFile(path.join(baseDir, 'script.json'), JSON.stringify(script), 'utf-8');

  // Referenced asset files
  await fs.mkdir(path.join(baseDir, 'assets', 'backgrounds'), { recursive: true });
  await fs.mkdir(path.join(baseDir, 'assets', 'characters'), { recursive: true });
  await fs.mkdir(path.join(baseDir, 'assets', 'audio'), { recursive: true });
  await fs.mkdir(path.join(baseDir, 'assets', 'ui'), { recursive: true });

  await fs.writeFile(path.join(baseDir, 'assets', 'backgrounds', 'city.png'), Buffer.from('FAKE'));
  await fs.writeFile(path.join(baseDir, 'assets', 'characters', 'hero_normal.png'), Buffer.from('FAKE'));
  await fs.writeFile(path.join(baseDir, 'assets', 'audio', 'bgm1.mp3'), Buffer.from('FAKE'));
  await fs.writeFile(path.join(baseDir, 'assets', 'ui', 'save_bg.png'), Buffer.from('FAKE'));

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

beforeAll(async () => {
  tempRoot = await fs.mkdtemp(path.join(tmpdir(), 'export-test-'));
  mockProjectDir = path.join(tempRoot, 'project');
  mockAppRoot = path.join(tempRoot, 'approot');
  await createMockProject(mockProjectDir);
  await createMockAppRoot(mockAppRoot);
});

afterAll(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

// ─── generateHtml Tests ─────────────────────────────────

describe('generateHtml', () => {
  it('includes game title in <title> tag', () => {
    expect(generateHtml('My Game', null)).toMatch(/<title>My Game<\/title>/);
  });

  it('includes favicon link when provided', () => {
    expect(generateHtml('X', 'favicon.ico')).toMatch(/href="\.\/favicon\.ico"/);
  });

  it('omits favicon link when null', () => {
    expect(generateHtml('X', null).includes('rel="icon"')).toBe(false);
  });

  it('escapes HTML special characters in title', () => {
    expect(generateHtml('A <B> "C"', null)).toMatch(/A &lt;B&gt; &quot;C&quot;/);
  });

  it('wraps only stage visuals in #stage-layer', () => {
    const html = generateHtml('Test', null);
    expect(html).toContain('id="game-container"');
    expect(html).toContain('id="stage-layer"');
    expect(html).toMatch(/<div id="stage-layer">[\s\S]*<div id="background-layer"><\/div>[\s\S]*<div id="character-layer"><\/div>[\s\S]*<\/div>/);
    expect(html).toMatch(/<div id="game-container">[\s\S]*<div id="dialogue-layer"><\/div>[\s\S]*<div id="ui-overlay"><\/div>[\s\S]*<\/div>/);
  });
});

// ─── exportGame — Output Structure ──────────────────────

describe('exportGame — output structure', () => {
  let outputDir;
  let result;

  beforeEach(async () => {
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
    expect(existsSync(path.join(outputDir, 'index.html'))).toBe(true);
    expect(existsSync(path.join(outputDir, 'engine.js'))).toBe(true);
    expect(existsSync(path.join(outputDir, 'engine.css'))).toBe(true);
    expect(existsSync(path.join(outputDir, 'script.json'))).toBe(true);
  });

  it('engine.js matches dist-web source', async () => {
    const src = await fs.readFile(path.join(mockAppRoot, 'dist-web', 'engine.js'), 'utf-8');
    const dst = await fs.readFile(path.join(outputDir, 'engine.js'), 'utf-8');
    expect(dst).toBe(src);
  });

  it('script.json is verbatim copy (per D-03)', async () => {
    const src = await fs.readFile(path.join(mockProjectDir, 'script.json'), 'utf-8');
    const dst = await fs.readFile(path.join(outputDir, 'script.json'), 'utf-8');
    expect(dst).toBe(src);
  });

  it('index.html contains game title', async () => {
    const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    expect(html).toMatch(/<title>Test Game<\/title>/);
  });

  it('index.html keeps dialogue and overlay outside #stage-layer', async () => {
    const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    expect(html).toContain('id="stage-layer"');
    expect(html).toMatch(/<div id="stage-layer">[\s\S]*<div id="background-layer"><\/div>[\s\S]*<div id="character-layer"><\/div>[\s\S]*<\/div>/);
    expect(html).toMatch(/<div id="game-container">[\s\S]*<div id="dialogue-layer"><\/div>[\s\S]*<div id="ui-overlay"><\/div>[\s\S]*<\/div>/);
  });
});

// ─── exportGame — Asset Filtering ───────────────────────

describe('exportGame — asset filtering', () => {
  let outputDir;

  beforeAll(async () => {
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
    expect(existsSync(path.join(outputDir, 'assets', 'backgrounds', 'city.png'))).toBe(true);
  });

  it('copies referenced character', () => {
    expect(existsSync(path.join(outputDir, 'assets', 'characters', 'hero_normal.png'))).toBe(true);
  });

  it('does NOT copy unreferenced audio', () => {
    expect(existsSync(path.join(outputDir, 'assets', 'audio', 'unreferenced.mp3'))).toBe(false);
  });

  it('copies referenced ui assets from the ui bucket', () => {
    expect(existsSync(path.join(outputDir, 'assets', 'ui', 'save_bg.png'))).toBe(true);
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

    expect(result.success).toBe(true);
    expect(result.warnings.includes('backgrounds/missing.png')).toBe(true);
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

    expect(existsSync(path.join(outputDir, 'favicon.ico'))).toBe(true);
    const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    expect(html.includes('rel="icon"')).toBe(true);
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

    expect(existsSync(path.join(outputDir, 'favicon.ico'))).toBe(false);
    const html = await fs.readFile(path.join(outputDir, 'index.html'), 'utf-8');
    expect(html.includes('rel="icon"')).toBe(false);
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
    expect(existsSync(zipPath)).toBe(true);
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

    expect(keys.includes('index.html')).toBe(true);
    expect(keys.includes('engine.js')).toBe(true);
    expect(keys.includes('engine.css')).toBe(true);
    expect(keys.includes('script.json')).toBe(true);
    expect(keys.includes('assets/backgrounds/city.png')).toBe(true);
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
    expect(existsSync(zipPath)).toBe(false);
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

    expect(calls).toHaveLength(7);
    expect(calls.map(c => c.step)).toEqual([
      '构建引擎', '扫描资源', '复制引擎产物', '复制资源文件', '生成 HTML', '打包 ZIP', '完成',
    ]);
    expect(calls.map(c => c.percent)).toEqual([0, 17, 33, 50, 67, 83, 100]);
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

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe(outputDir);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});
