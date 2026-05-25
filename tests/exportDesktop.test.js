/**
 * exportDesktop — Integration tests for the desktop export pipeline.
 *
 * Covers Phase 33 requirements: PIPE-01, PIPE-02, PIPE-03, PIPE-06,
 * CUSTOM-01, CUSTOM-02 across 7 describe blocks:
 *   staging structure, asset filtering, missing assets (warnings),
 *   icon conversion, template filling, ZIP, progress callbacks.
 *
 * Uses Node.js built-in test runner (node:test + node:assert/strict).
 * Run with: node --test tests/exportDesktop.test.js
 */

import { describe, it, before, after } from 'node:test';
import { strictEqual, deepStrictEqual, ok, match } from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { exportDesktop } from '../electron/exportDesktop.js';

// ─── Test Fixture Helpers ────────────────────────────────

/**
 * Create a mock project directory with script.json and asset files.
 * Includes all 5 asset categories (backgrounds, characters, audio, voices)
 * plus an unreferenced file for filtering tests.
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
          dialogues: [{ voice: 'voices/v001.ogg' }],
        }],
      },
    },
    systems: {
      endings: {
        good: {
          thumbnail: 'ui/endings/good.png',
        },
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
  await fs.mkdir(path.join(baseDir, 'assets', 'voices'), { recursive: true });
  await fs.mkdir(path.join(baseDir, 'assets', 'ui'), { recursive: true });
  await fs.mkdir(path.join(baseDir, 'assets', 'ui', 'endings'), { recursive: true });

  await fs.writeFile(path.join(baseDir, 'assets', 'backgrounds', 'city.png'), Buffer.from('FAKE'));
  await fs.writeFile(path.join(baseDir, 'assets', 'characters', 'hero_normal.png'), Buffer.from('FAKE'));
  await fs.writeFile(path.join(baseDir, 'assets', 'audio', 'bgm1.mp3'), Buffer.from('FAKE'));
  await fs.writeFile(path.join(baseDir, 'assets', 'voices', 'v001.ogg'), Buffer.from('FAKE'));
  await fs.writeFile(path.join(baseDir, 'assets', 'ui', 'save_bg.png'), Buffer.from('FAKE'));
  await fs.writeFile(path.join(baseDir, 'assets', 'ui', 'endings', 'good.png'), Buffer.from('FAKE'));

  // Unreferenced file (should NOT be copied)
  await fs.writeFile(path.join(baseDir, 'assets', 'audio', 'unreferenced.mp3'), Buffer.from('NOPE'));
}

/**
 * Create a mock appRoot with dist-web build artifacts and game templates.
 * @param {string} baseDir - Root directory for the mock app root
 */
async function createMockAppRoot(baseDir) {
  // dist-web engine artifacts
  await fs.mkdir(path.join(baseDir, 'dist-web'), { recursive: true });
  await fs.writeFile(path.join(baseDir, 'dist-web', 'engine.js'), '// mock engine bundle', 'utf-8');
  await fs.writeFile(path.join(baseDir, 'dist-web', 'engine.css'), '/* mock engine styles */', 'utf-8');

  // electron/game templates
  await fs.mkdir(path.join(baseDir, 'electron', 'game'), { recursive: true });
  await fs.writeFile(
    path.join(baseDir, 'electron', 'game', 'main.js'),
    "const GAME_TITLE = 'My Game';\nconst GAME_WIDTH = 1280;\nconst GAME_HEIGHT = 720;\n// rest of template",
    'utf-8',
  );
  await fs.writeFile(
    path.join(baseDir, 'electron', 'game', 'preload.js'),
    '// mock preload bridge',
    'utf-8',
  );

  // Default game icon (valid 1x1 PNG)
  await fs.mkdir(path.join(baseDir, 'public'), { recursive: true });
  await fs.writeFile(
    path.join(baseDir, 'public', 'default-game-icon.png'),
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==', 'base64'),
  );
}

/**
 * Create a user-provided PNG icon file.
 * @param {string} baseDir - Directory to place the icon in
 * @returns {Promise<string>} Absolute path to the created icon
 */
async function createMockIcon(baseDir) {
  const iconPath = path.join(baseDir, 'custom-icon.png');
  await fs.writeFile(
    iconPath,
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==', 'base64'),
  );
  return iconPath;
}

// ─── Shared State ────────────────────────────────────────

let tempRoot, mockProjectDir, mockAppRoot;

before(async () => {
  tempRoot = await fs.mkdtemp(path.join(tmpdir(), 'export-desktop-test-'));
  mockProjectDir = path.join(tempRoot, 'project');
  mockAppRoot = path.join(tempRoot, 'approot');
  await createMockProject(mockProjectDir);
  await createMockAppRoot(mockAppRoot);
});

after(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

// ─── Standard Call Helper ────────────────────────────────

const baseOpts = () => ({
  projectPath: mockProjectDir,
  gameTitle: 'Test Game',
  iconPath: null,
  zip: false,
  gameWidth: 1280,
  gameHeight: 720,
  _skipBuild: true,
  _appRoot: mockAppRoot,
  _skipPackager: true,
});

// ─── 1. exportDesktop — staging structure (PIPE-01) ──────

describe('exportDesktop — staging structure', () => {
  let outputDir;
  let result;

  before(async () => {
    outputDir = path.join(tempRoot, 'out-staging');
    const noop = () => {};
    result = await exportDesktop({ ...baseOpts(), outputDir }, noop);
  });

  it('produces staging dir with package.json', async () => {
    const pkgPath = path.join(result.outputPath, 'package.json');
    ok(existsSync(pkgPath), 'package.json should exist in staging dir');
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    ok(pkg.name, 'package.json should have a name field');
    strictEqual(pkg.main, 'main.js');
    strictEqual(pkg.type, 'module');
    strictEqual(pkg.version, '1.0.0');
  });

  it('copies engine.js and engine.css from dist-web', () => {
    ok(existsSync(path.join(result.outputPath, 'engine.js')));
    ok(existsSync(path.join(result.outputPath, 'engine.css')));
  });

  it('copies script.json from project', async () => {
    const staged = path.join(result.outputPath, 'script.json');
    ok(existsSync(staged));
    const src = await fs.readFile(path.join(mockProjectDir, 'script.json'), 'utf-8');
    const dst = await fs.readFile(staged, 'utf-8');
    strictEqual(dst, src);
  });

  it('generates index.html with game title', async () => {
    const htmlPath = path.join(result.outputPath, 'index.html');
    ok(existsSync(htmlPath));
    const html = await fs.readFile(htmlPath, 'utf-8');
    ok(html.includes('<title>Test Game</title>'));
  });

  it('returns success with outputPath and warnings array', () => {
    strictEqual(result.success, true);
    ok(typeof result.outputPath === 'string');
    ok(Array.isArray(result.warnings));
  });
});

// ─── 2. exportDesktop — asset filtering (PIPE-03) ───────

describe('exportDesktop — asset filtering', () => {
  let outputDir;
  let result;

  before(async () => {
    outputDir = path.join(tempRoot, 'out-filtering');
    const noop = () => {};
    result = await exportDesktop({ ...baseOpts(), outputDir }, noop);
  });

  it('copies referenced background', () => {
    ok(existsSync(path.join(result.outputPath, 'assets', 'backgrounds', 'city.png')));
  });

  it('copies referenced character', () => {
    ok(existsSync(path.join(result.outputPath, 'assets', 'characters', 'hero_normal.png')));
  });

  it('copies referenced audio', () => {
    ok(existsSync(path.join(result.outputPath, 'assets', 'audio', 'bgm1.mp3')));
  });

  it('copies referenced voice', () => {
    ok(existsSync(path.join(result.outputPath, 'assets', 'voices', 'v001.ogg')));
  });

  it('does NOT copy unreferenced audio', () => {
    ok(!existsSync(path.join(result.outputPath, 'assets', 'audio', 'unreferenced.mp3')));
  });

  it('copies referenced ui assets from the ui bucket', () => {
    ok(existsSync(path.join(result.outputPath, 'assets', 'ui', 'save_bg.png')));
  });

  it('copies referenced ending thumbnails', () => {
    ok(existsSync(path.join(result.outputPath, 'assets', 'ui', 'endings', 'good.png')));
  });
});

// ─── 2b. exportDesktop — path safety ────────────────────

describe('exportDesktop — path safety', () => {
  it('does not copy traversal asset references outside staging', async () => {
    const projDir = path.join(tempRoot, 'project-desktop-traversal');
    const secretName = 'desktop-secret.txt';
    await fs.mkdir(path.join(projDir, 'assets'), { recursive: true });
    await fs.writeFile(path.join(tempRoot, secretName), 'secret', 'utf-8');
    await fs.writeFile(path.join(projDir, 'script.json'), JSON.stringify({
      scenes: {
        s1: {
          pages: [{ background: `../../${secretName}`, dialogues: [] }],
        },
      },
    }), 'utf-8');

    const outputDir = path.join(tempRoot, 'out-desktop-traversal');
    const noop = () => {};
    const result = await exportDesktop({
      ...baseOpts(),
      projectPath: projDir,
      outputDir,
    }, noop);

    const escapedDst = path.resolve(result.outputPath, 'assets', '..', '..', secretName);
    ok(!existsSync(escapedDst));
  });

  it('sanitizes ZIP filenames derived from game titles', async () => {
    const outputDir = path.join(tempRoot, 'out-desktop-zip-title-safety');
    const noop = () => {};
    const result = await exportDesktop({
      ...baseOpts(),
      outputDir,
      gameTitle: '../Desktop Escape',
      zip: true,
    }, noop);

    ok(result.zipPath);
    ok(!path.basename(result.zipPath).includes('..'));
    ok(!path.basename(result.zipPath).includes('/'));
    ok(existsSync(result.zipPath));
  });
});

// ─── 3. exportDesktop — missing assets (PIPE-03) ────────

describe('exportDesktop — missing assets', () => {
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
    // No actual asset file created — it's intentionally missing

    const outputDir = path.join(tempRoot, 'out-missing');
    const noop = () => {};
    const result = await exportDesktop({
      ...baseOpts(),
      projectPath: projDir,
      outputDir,
    }, noop);

    ok(result.success);
    ok(result.warnings.includes('backgrounds/missing.png'));
  });
});

// ─── 4. exportDesktop — icon conversion (CUSTOM-02) ─────

describe('exportDesktop — icon conversion', () => {
  it('converts user PNG to icon.ico in staging', async () => {
    const userIcon = await createMockIcon(tempRoot);
    const outputDir = path.join(tempRoot, 'out-icon-user');
    const noop = () => {};
    const result = await exportDesktop({
      ...baseOpts(),
      iconPath: userIcon,
      outputDir,
    }, noop);

    ok(existsSync(path.join(result.outputPath, 'icon.ico')));
  });

  it('uses default icon when iconPath is null', async () => {
    const outputDir = path.join(tempRoot, 'out-icon-default');
    const noop = () => {};
    const result = await exportDesktop({
      ...baseOpts(),
      iconPath: null,
      outputDir,
    }, noop);

    ok(existsSync(path.join(result.outputPath, 'icon.ico')));
  });
});

// ─── 5. exportDesktop — template filling (CUSTOM-01) ────

describe('exportDesktop — template filling', () => {
  it('replaces GAME_TITLE in main.js', async () => {
    const outputDir = path.join(tempRoot, 'out-template-title');
    const noop = () => {};
    const result = await exportDesktop({ ...baseOpts(), outputDir }, noop);

    const mainContent = await fs.readFile(path.join(result.outputPath, 'main.js'), 'utf-8');
    ok(!mainContent.includes("GAME_TITLE = 'My Game'"), 'Should not contain default title placeholder');
    ok(mainContent.includes('GAME_TITLE = \'Test Game\'') || mainContent.includes(`GAME_TITLE = "Test Game"`),
      'Should contain the user-specified game title');
  });

  it('replaces GAME_WIDTH and GAME_HEIGHT', async () => {
    const outputDir = path.join(tempRoot, 'out-template-dims');
    const noop = () => {};
    const result = await exportDesktop({
      ...baseOpts(),
      gameWidth: 1920,
      gameHeight: 1080,
      outputDir,
    }, noop);

    const mainContent = await fs.readFile(path.join(result.outputPath, 'main.js'), 'utf-8');
    ok(mainContent.includes('GAME_WIDTH = 1920'));
    ok(mainContent.includes('GAME_HEIGHT = 1080'));
  });

  it('copies preload.js to staging', async () => {
    const outputDir = path.join(tempRoot, 'out-template-preload');
    const noop = () => {};
    const result = await exportDesktop({ ...baseOpts(), outputDir }, noop);

    ok(existsSync(path.join(result.outputPath, 'preload.js')));
  });
});

// ─── 6. exportDesktop — ZIP (PIPE-06) ───────────────────

describe('exportDesktop — ZIP', () => {
  it('creates ZIP when zip=true', async () => {
    const outputDir = path.join(tempRoot, 'out-zip-yes');
    const noop = () => {};
    const result = await exportDesktop({
      ...baseOpts(),
      zip: true,
      outputDir,
    }, noop);

    ok(result.zipPath !== null, 'zipPath should not be null when zip=true');
    ok(existsSync(result.zipPath), 'ZIP file should exist on disk');
  });

  it('no ZIP when zip=false', async () => {
    const outputDir = path.join(tempRoot, 'out-zip-no');
    const noop = () => {};
    const result = await exportDesktop({
      ...baseOpts(),
      zip: false,
      outputDir,
    }, noop);

    strictEqual(result.zipPath, null, 'zipPath should be null when zip=false');
  });
});

// ─── 7. exportDesktop — progress (PIPE-01) ──────────────

describe('exportDesktop — progress', () => {
  it('calls sendProgress with all steps including completion', async () => {
    const outputDir = path.join(tempRoot, 'out-progress');
    const calls = [];
    const sendProgress = (payload) => calls.push(payload);

    await exportDesktop({
      ...baseOpts(),
      outputDir,
    }, sendProgress);

    ok(calls.length >= 2, 'Should have at least 2 progress calls');
    strictEqual(calls[0].percent, 0, 'First call should be percent 0');
    strictEqual(calls[calls.length - 1].step, '完成');
    strictEqual(calls[calls.length - 1].percent, 100);

    // Verify monotonically non-decreasing percents
    for (let i = 1; i < calls.length; i++) {
      ok(calls[i].percent >= calls[i - 1].percent,
        `percent should be non-decreasing: ${calls[i - 1].percent} -> ${calls[i].percent}`);
    }
  });

  it('returns success with outputPath', async () => {
    const outputDir = path.join(tempRoot, 'out-progress-result');
    const noop = () => {};
    const result = await exportDesktop({
      ...baseOpts(),
      outputDir,
    }, noop);

    strictEqual(result.success, true);
    ok(typeof result.outputPath === 'string');
    ok(Array.isArray(result.warnings));
  });
});
