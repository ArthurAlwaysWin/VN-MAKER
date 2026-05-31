import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { analyzePreviewScreenshot } from '../tools/vn-author/preview-renderer.js';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('tools/vn-author/index.js');
const exampleWorkflowPath = path.resolve('tools/vn-author/verify-example-workflow.js');

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  return Buffer.concat([
    length,
    Buffer.from(type, 'ascii'),
    data,
    Buffer.alloc(4),
  ]);
}

function createPng({ width, height, pixelAt }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8);
  header.writeUInt8(6, 9);

  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue, alpha = 255] = pixelAt(x, y);
      const offset = 1 + x * 4;
      row[offset] = red;
      row[offset + 1] = green;
      row[offset + 2] = blue;
      row[offset + 3] = alpha;
    }
    rows.push(row);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'vn-author-cli-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('vn-author CLI', () => {
  it('accepts preview screenshots with visible color variety', () => {
    const png = createPng({
      width: 8,
      height: 8,
      pixelAt: (x, y) => [x * 30, y * 30, (x + y) * 12, 255],
    });

    expect(analyzePreviewScreenshot(png, {
      expectedWidth: 8,
      expectedHeight: 8,
    })).toMatchObject({
      ok: true,
      width: 8,
      height: 8,
    });
  });

  it('flags blank preview screenshots before reporting success', () => {
    const png = createPng({
      width: 8,
      height: 8,
      pixelAt: () => [0, 0, 0, 255],
    });

    const result = analyzePreviewScreenshot(png, {
      expectedWidth: 8,
      expectedHeight: 8,
    });

    expect(result.ok).toBe(false);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: 'preview-low-color-variety',
        suggestedAction: expect.objectContaining({
          commands: expect.arrayContaining([
            expect.objectContaining({ command: 'lint-layout' }),
          ]),
        }),
      }),
      expect.objectContaining({
        code: 'preview-dominant-color',
        suggestedAction: expect.objectContaining({
          summary: expect.stringContaining('visible background'),
        }),
      }),
    ]);
    expect(result.suggestions).toEqual([
      expect.objectContaining({ code: 'preview-low-color-variety' }),
      expect.objectContaining({ code: 'preview-dominant-color' }),
    ]);
  });

  it('refuses to overwrite import output without --force', async () => {
    await withTempDir(async (dir) => {
      const draftPath = path.join(dir, 'draft.json');
      const outPath = path.join(dir, 'script.json');
      await writeFile(draftPath, JSON.stringify({
        projectId: 'gm_cli_test',
        scenes: [],
      }), 'utf8');
      await writeFile(outPath, '{}', 'utf8');

      await expect(execFileAsync('node', [
        cliPath,
        'import-draft',
        draftPath,
        '--fresh',
        '--out',
        outPath,
        '--json',
      ])).rejects.toMatchObject({
        code: 1,
      });
    });
  });

  it('converts a structured draft into an apply-plan manifest from the CLI', async () => {
    await withTempDir(async (dir) => {
      const draftPath = path.join(dir, 'draft.json');
      const planPath = path.join(dir, 'draft-plan.json');
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(draftPath, JSON.stringify({
        projectId: 'gm_cli_draft_plan',
        title: 'Draft Plan',
        characters: [{ id: 'sakura', name: 'Sakura' }],
        scenes: [
          {
            id: 'start',
            beats: [
              {
                background: 'backgrounds/school.svg',
                characters: ['sakura'],
                dialogues: [{ speaker: 'sakura', text: 'Welcome.' }],
              },
            ],
          },
        ],
      }), 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_draft_plan',
        characters: {},
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'draft-plan',
        draftPath,
        '--out',
        planPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const plan = JSON.parse(await readFile(planPath, 'utf8'));

      expect(result).toMatchObject({
        outPath: planPath,
        operationCount: 3,
      });
      expect(plan.operations.map((operation) => operation.command)).toEqual([
        'add-character',
        'add-scene',
        'add-page',
      ]);

      const dryRun = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--dry-run',
        '--json',
      ]);
      const dryRunResult = JSON.parse(dryRun.stdout);
      expect(dryRunResult.transaction).toMatchObject({
        status: 'planned',
        wrote: false,
      });
      expect(dryRunResult.validation.ok).toBe(true);
      expect(dryRunResult.changeSummary.changedPaths).toEqual(expect.arrayContaining([
        'characters.sakura',
        'scenes.start',
        'scenes.start.pages.0',
      ]));
    });
  });

  it('adds a scene incrementally when explicitly forced to write', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'add-scene',
        '--script',
        scriptPath,
        '--id',
        'start',
        '--name',
        'Start',
        '--force',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.result).toEqual({ sceneId: 'start' });
      expect(script.scenes.start).toMatchObject({
        name: 'Start',
        pages: [],
      });
    });
  });

  it('reports machine-readable change summaries for dry-run mutations', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'add-scene',
        '--script',
        scriptPath,
        '--id',
        'start',
        '--name',
        'Start',
        '--dry-run',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(script.scenes).toEqual({});
      expect(result.transaction).toMatchObject({
        command: 'add-scene',
        status: 'planned',
        wrote: false,
        checkpointPath: null,
      });
      expect(result.changeSummary).toMatchObject({
        command: 'add-scene',
        dryRun: true,
        writeStatus: 'planned',
        target: { sceneId: 'start' },
        changedPaths: ['scenes.start'],
        counts: {
          before: { characters: 0, scenes: 0, pages: 0, variables: 0 },
          after: { characters: 0, scenes: 1, pages: 0, variables: 0 },
          delta: { characters: 0, scenes: 1, pages: 0, variables: 0 },
        },
        validation: { ok: true, errorCount: 0, warningCount: 1 },
      });
    });
  });

  it('creates timestamped checkpoints before writing when requested', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'add-scene',
        '--script',
        scriptPath,
        '--id',
        'start',
        '--force',
        '--checkpoint',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const checkpointPath = result.transaction.checkpointPath;
      const checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8'));

      await expect(stat(checkpointPath)).resolves.toMatchObject({ isFile: expect.any(Function) });
      expect(checkpoint.scenes).toEqual({});
      expect(result.changeSummary).toMatchObject({
        writeStatus: 'written',
        checkpointPath,
        backupPath: null,
      });
      expect(path.dirname(checkpointPath)).toBe(path.join(dir, '.checkpoints'));
    });
  });

  it('applies multi-operation authoring plans atomically with one checkpoint', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'plan.json');
      const resultPath = path.join(dir, 'apply-result.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_plan',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        version: 1,
        operations: [
          {
            id: 'character',
            command: 'add-character',
            params: {
              id: 'sakura',
              name: 'Sakura',
              expressions: { normal: 'characters/sakura_normal.svg' },
            },
          },
          {
            id: 'scene',
            command: 'add-scene',
            params: { id: 'start', name: 'Start' },
          },
          {
            id: 'page',
            command: 'add-page',
            params: {
              scene: 'start',
              type: 'normal',
              background: 'backgrounds/school.svg',
              characters: [{ id: 'sakura', expression: 'normal', position: 'center' }],
              dialogues: [{ speaker: 'sakura', text: 'Hello from a plan.' }],
            },
          },
          {
            id: 'camera',
            command: 'set-page-camera',
            params: {
              scene: 'start',
              page: 0,
              camera: { effect: 'shake', direction: 'both', intensity: 'low', durationMs: 250 },
            },
          },
        ],
      }), 'utf8');

      const dryRunResult = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--dry-run',
        '--json',
      ]);

      const dryRun = JSON.parse(dryRunResult.stdout);
      expect(dryRun.transaction).toMatchObject({
        command: 'apply-plan',
        status: 'planned',
        wrote: false,
      });
      expect(dryRun.operations).toHaveLength(4);
      expect(dryRun.changeSummary).toMatchObject({
        command: 'apply-plan',
        dryRun: true,
        operationCount: 4,
        changedPaths: expect.arrayContaining([
          'characters.sakura',
          'scenes.start',
          'scenes.start.pages.0',
        ]),
        counts: {
          before: { characters: 0, scenes: 0, pages: 0, variables: 0 },
          after: { characters: 1, scenes: 1, pages: 1, variables: 0 },
          delta: { characters: 1, scenes: 1, pages: 1, variables: 0 },
        },
      });
      expect(JSON.parse(await readFile(scriptPath, 'utf8')).scenes).toEqual({});

      const applyResult = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--force',
        '--checkpoint',
        '--result-out',
        resultPath,
        '--json',
      ]);

      const applied = JSON.parse(applyResult.stdout);
      const savedResult = JSON.parse(await readFile(resultPath, 'utf8'));
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));
      const checkpoint = JSON.parse(await readFile(applied.transaction.checkpointPath, 'utf8'));

      expect(applied.resultOutPath).toBe(resultPath);
      expect(savedResult.transaction).toMatchObject({
        command: 'apply-plan',
        status: 'written',
      });
      expect(applied.transaction).toMatchObject({
        command: 'apply-plan',
        status: 'written',
        wrote: true,
        blockedByValidation: false,
        rollback: {
          command: 'restore-checkpoint',
          checkpointPath: applied.transaction.checkpointPath,
          scriptPath,
        },
      });
      expect(path.dirname(applied.transaction.checkpointPath)).toBe(path.join(dir, '.checkpoints'));
      expect(checkpoint.scenes).toEqual({});
      expect(script.characters.sakura.name).toBe('Sakura');
      expect(script.scenes.start.pages[0]).toMatchObject({
        type: 'normal',
        background: 'backgrounds/school.svg',
        dialogues: [{ speaker: 'sakura', text: 'Hello from a plan.' }],
        camera: { effect: 'shake', direction: 'both', intensity: 'low', durationMs: 250 },
      });

      const restoreResult = await execFileAsync('node', [
        cliPath,
        'restore-checkpoint',
        applied.transaction.checkpointPath,
        '--script',
        scriptPath,
        '--force',
        '--backup',
        '--json',
      ]);
      const restored = JSON.parse(restoreResult.stdout);
      const restoredScript = JSON.parse(await readFile(scriptPath, 'utf8'));
      const backupScript = JSON.parse(await readFile(restored.transaction.backupPath, 'utf8'));

      expect(restored.transaction).toMatchObject({
        command: 'restore-checkpoint',
        status: 'written',
        wrote: true,
      });
      expect(restoredScript.scenes).toEqual({});
      expect(backupScript.scenes.start.pages).toHaveLength(1);
    });
  });

  it('builds the documented multi-ending example plan and passes export readiness', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const examplePlanPath = path.resolve('docs/agent-authoring/example-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_example_plan',
        characters: {},
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        examplePlanPath,
        '--script',
        scriptPath,
        '--dry-run',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(result.transaction).toMatchObject({
        command: 'apply-plan',
        status: 'planned',
        wrote: false,
      });
      expect(result.validation.ok).toBe(true);
      expect(result.changeSummary).toMatchObject({
        operationCount: 21,
        counts: {
          before: { characters: 0, scenes: 0, pages: 0, variables: 0 },
          after: { characters: 1, scenes: 4, pages: 5, variables: 1 },
          delta: { characters: 1, scenes: 4, pages: 5, variables: 1 },
        },
      });
      expect(script.scenes).toEqual({});

      const applied = JSON.parse((await execFileAsync('node', [
        cliPath,
        'apply-plan',
        examplePlanPath,
        '--script',
        scriptPath,
        '--force',
        '--json',
      ])).stdout);
      const builtScript = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(applied.validation.ok).toBe(true);
      expect(builtScript.systems.variables.sakura_affection).toMatchObject({
        kind: 'affection',
        characterId: 'sakura',
      });
      expect(Object.keys(builtScript.systems.endings)).toEqual(['good_end', 'quiet_end']);
      expect(builtScript.systems.gallery.cg.cg_confession).toMatchObject({
        images: ['backgrounds/cg/sakura_confession.svg'],
      });
      expect(builtScript.scenes.start.pages[1].options[0].effects).toEqual([
        { type: 'var:add', id: 'sakura_affection', value: 1 },
        { type: 'unlock:cg', id: 'cg_confession' },
      ]);
      expect(builtScript.scenes.good_ending.pages[0].effects).toEqual([
        { type: 'unlock:ending', id: 'good_end' },
      ]);
      expect(builtScript.scenes.quiet_ending.pages[0].effects).toEqual([
        { type: 'unlock:ending', id: 'quiet_end' },
      ]);
      expect(builtScript.scenes.start.pages[0].transition).toEqual({
        type: 'wipe-right',
        duration: 650,
      });
      expect(builtScript.scenes.good_ending.pages[0]).toMatchObject({
        transition: { type: 'crossfade-pan', duration: 900 },
        camera: { effect: 'vignette', intensity: 'medium', durationMs: 900 },
        characters: [{ id: 'sakura', animation: 'pop' }],
      });

      const assetPaths = [
        'characters/sakura_smile.svg',
        'backgrounds/school_gate.svg',
        'backgrounds/rooftop_sunset.svg',
        'backgrounds/empty_platform.svg',
        'backgrounds/cg/sakura_confession.svg',
        'backgrounds/cg/sakura_confession_thumb.svg',
        'ui/endings/good.svg',
        'ui/endings/quiet.svg',
        'ui/gallery/locked.svg',
      ];
      for (const assetPath of assetPaths) {
        const absolutePath = path.join(dir, ...assetPath.split('/'));
        await mkdir(path.dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, 'example asset', 'utf8');
      }

      const readiness = JSON.parse((await execFileAsync('node', [
        cliPath,
        'export-readiness',
        '--script',
        scriptPath,
        '--json',
      ])).stdout);
      expect(readiness).toMatchObject({
        ready: true,
        blockers: [],
        sceneGraph: {
          unreachableSceneIds: [],
          deadEndSceneIds: [],
          cyclesWithoutExit: [],
        },
      });
      expect(readiness.warnings).toEqual([]);
    });
  });

  it('generates a reviewable agent example project through the full verification workflow', async () => {
    await withTempDir(async (dir) => {
      const projectPath = path.join(dir, 'spring-promise-example');
      const { stdout } = await execFileAsync('node', [
        exampleWorkflowPath,
        '--out',
        projectPath,
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(path.join(projectPath, 'script.json'), 'utf8'));
      const handoff = JSON.parse(await readFile(path.join(projectPath, 'agent-handoff.json'), 'utf8'));
      const summary = JSON.parse(await readFile(path.join(projectPath, 'review', 'verification-summary.json'), 'utf8'));
      await stat(path.join(projectPath, 'project.json'));
      await stat(path.join(projectPath, 'assets', 'backgrounds', 'cg', 'sakura_confession.svg'));
      await stat(path.join(projectPath, 'review', 'author-check-preview.png.json'));
      await stat(path.join(projectPath, 'review', 'review-handoff.json'));

      expect(result.gates).toEqual({
        validation: true,
        dryRun: true,
        apply: true,
        continuousReview: true,
        authorCheck: true,
        handoff: true,
        readiness: true,
      });
      expect(script.systems.endings).toHaveProperty('good_end');
      expect(script.systems.gallery.cg.cg_confession.images).toEqual([
        'backgrounds/cg/sakura_confession.svg',
      ]);
      expect(script.scenes.start.pages[0].transition).toEqual({
        type: 'wipe-right',
        duration: 650,
      });
      expect(script.scenes.good_ending.pages[0]).toMatchObject({
        transition: { type: 'crossfade-pan', duration: 900 },
        camera: { effect: 'vignette', intensity: 'medium', durationMs: 900 },
        characters: [{ id: 'sakura', animation: 'pop' }],
      });
      expect(handoff.previewTargets).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: 'branch-graph' }),
        expect.objectContaining({ kind: 'ending-list' }),
        expect.objectContaining({ kind: 'gallery' }),
      ]));
      expect(summary.sceneGraph).toMatchObject({
        deadEndSceneIds: [],
        cyclesWithoutExit: [],
      });

      await expect(execFileAsync('node', [
        exampleWorkflowPath,
        '--out',
        projectPath,
        '--json',
      ])).rejects.toMatchObject({ code: 1 });
    });
  });

  it('keeps the documented example draft convertible to an executable plan', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'example-draft-plan.json');
      const exampleDraftPath = path.resolve('docs/agent-authoring/example-draft.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_example_draft_plan',
        characters: {},
        scenes: {},
      }), 'utf8');

      const planResult = await execFileAsync('node', [
        cliPath,
        'draft-plan',
        exampleDraftPath,
        '--out',
        planPath,
        '--require-adaptation-preview',
        '--json',
      ]);
      const generated = JSON.parse(planResult.stdout);

      expect(generated.operationCount).toBe(6);
      expect(generated.warningCount).toBe(0);
      expect(generated.adaptationPreview).toMatchObject({
        required: true,
        approved: true,
        assetsReviewed: true,
        missingAssetsRecorded: true,
        ok: true,
      });
      expect(generated.plan.source).toMatchObject({
        kind: 'novel-draft',
        projectId: 'gm_example_agent_draft',
        adaptationPreview: {
          approved: true,
          assetsReviewed: true,
        },
      });

      const dryRun = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--dry-run',
        '--json',
      ]);
      const result = JSON.parse(dryRun.stdout);

      expect(result.transaction).toMatchObject({
        status: 'planned',
        wrote: false,
      });
      expect(result.validation.ok).toBe(true);
      expect(result.changeSummary).toMatchObject({
        operationCount: 6,
        counts: {
          before: { characters: 0, scenes: 0, pages: 0, variables: 0 },
          after: { characters: 2, scenes: 1, pages: 2, variables: 1 },
          delta: { characters: 2, scenes: 1, pages: 2, variables: 1 },
        },
      });
    });
  });

  it('blocks strict prose draft conversion without an approved adaptation preview', async () => {
    await withTempDir(async (dir) => {
      const draftPath = path.join(dir, 'unreviewed-draft.json');
      await writeFile(draftPath, JSON.stringify({
        projectId: 'gm_unreviewed',
        adaptationPreview: {
          approved: true,
          assetsReviewed: true,
          pageBeatCount: 1,
          choiceCount: 0,
        },
        scenes: [{ id: 'start', beats: [{ dialogues: [{ speaker: null, text: 'Unreviewed.' }] }] }],
      }), 'utf8');

      await expect(execFileAsync('node', [
        cliPath,
        'draft-plan',
        draftPath,
        '--require-adaptation-preview',
        '--json',
      ])).rejects.toMatchObject({ code: 1 });

      try {
        await execFileAsync('node', [
          cliPath,
          'draft-plan',
          draftPath,
          '--require-adaptation-preview',
          '--json',
        ]);
      } catch (error) {
        expect(JSON.parse(error.stdout)).toMatchObject({
          ok: false,
          code: 'adaptation-preview-required',
          adaptationPreview: {
            required: true,
            approved: true,
            missingAssetsRecorded: false,
            ok: false,
          },
        });
      }
    });
  });

  it('lists project assets across agent-visible categories', async () => {
    await withTempDir(async (dir) => {
      await mkdir(path.join(dir, 'assets', 'backgrounds'), { recursive: true });
      await mkdir(path.join(dir, 'assets', 'characters'), { recursive: true });
      await mkdir(path.join(dir, 'assets', 'audio'), { recursive: true });
      await mkdir(path.join(dir, 'assets', 'voices'), { recursive: true });
      await mkdir(path.join(dir, 'assets', 'ui', 'title'), { recursive: true });
      await mkdir(path.join(dir, 'assets', 'fonts'), { recursive: true });
      await writeFile(path.join(dir, 'assets', 'backgrounds', 'rainy_school_gate.png'), 'bg', 'utf8');
      await writeFile(path.join(dir, 'assets', 'characters', 'sakura_nervous.webp'), 'char', 'utf8');
      await writeFile(path.join(dir, 'assets', 'audio', 'rain_theme.ogg'), 'bgm', 'utf8');
      await writeFile(path.join(dir, 'assets', 'voices', 'sakura_line_001.wav'), 'voice', 'utf8');
      await writeFile(path.join(dir, 'assets', 'ui', 'title', 'logo.png'), 'ui', 'utf8');
      await writeFile(path.join(dir, 'assets', 'fonts', 'story_serif.ttf'), 'font', 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'list-assets',
        '--project',
        dir,
        '--json',
      ]);
      const result = JSON.parse(stdout);

      expect(result).toMatchObject({
        projectPath: dir,
        assetRoot: path.join(dir, 'assets'),
        categories: ['backgrounds', 'characters', 'audio', 'voices', 'ui', 'fonts'],
      });
      expect(result.assets.backgrounds).toEqual([
        expect.objectContaining({
          path: 'backgrounds/rainy_school_gate.png',
          name: 'rainy_school_gate',
          tokens: ['rainy', 'school', 'gate'],
          extension: '.png',
          size: 2,
        }),
      ]);
      expect(result.assets.characters[0]).toMatchObject({
        path: 'characters/sakura_nervous.webp',
        name: 'sakura_nervous',
        tokens: ['sakura', 'nervous'],
        extension: '.webp',
      });
      expect(result.assets.audio[0].path).toBe('audio/rain_theme.ogg');
      expect(result.assets.voices[0].path).toBe('voices/sakura_line_001.wav');
      expect(result.assets.ui[0].path).toBe('ui/title/logo.png');
      expect(result.assets.fonts[0].path).toBe('fonts/story_serif.ttf');
    });
  });

  it('handles missing asset category folders gracefully', async () => {
    await withTempDir(async (dir) => {
      await mkdir(path.join(dir, 'assets', 'backgrounds'), { recursive: true });
      await writeFile(path.join(dir, 'assets', 'backgrounds', 'school.png'), 'bg', 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'list-assets',
        '--project',
        dir,
        '--json',
      ]);
      const result = JSON.parse(stdout);

      expect(result.assets.backgrounds).toHaveLength(1);
      expect(result.assets.characters).toEqual([]);
      expect(result.assets.audio).toEqual([]);
      expect(result.assets.voices).toEqual([]);
      expect(result.assets.ui).toEqual([]);
      expect(result.assets.fonts).toEqual([]);
    });
  });

  it('derives the project path from --script when listing assets', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await mkdir(path.join(dir, 'assets', 'ui'), { recursive: true });
      await writeFile(scriptPath, JSON.stringify({ projectId: 'assets_from_script' }), 'utf8');
      await writeFile(path.join(dir, 'assets', 'ui', 'textbox_frame.png'), 'ui', 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'list-assets',
        '--script',
        scriptPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);

      expect(result.projectPath).toBe(dir);
      expect(result.assetRoot).toBe(path.join(dir, 'assets'));
      expect(result.assets.ui[0]).toMatchObject({
        path: 'ui/textbox_frame.png',
        tokens: ['textbox', 'frame'],
      });
    });
  });

  it('tokenizes semantic asset names for agent matching', async () => {
    await withTempDir(async (dir) => {
      await mkdir(path.join(dir, 'assets', 'backgrounds'), { recursive: true });
      await writeFile(path.join(dir, 'assets', 'backgrounds', 'rainy_school_gate.png'), 'bg', 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'list-assets',
        '--project',
        dir,
        '--json',
      ]);
      const result = JSON.parse(stdout);

      expect(result.assets.backgrounds[0]).toMatchObject({
        name: 'rainy_school_gate',
        tokens: ['rainy', 'school', 'gate'],
        extension: '.png',
      });
    });
  });

  it('does not include files outside the project assets folder', async () => {
    await withTempDir(async (dir) => {
      await mkdir(path.join(dir, 'assets', 'backgrounds'), { recursive: true });
      await mkdir(path.join(dir, 'backgrounds'), { recursive: true });
      await writeFile(path.join(dir, 'assets', 'backgrounds', 'inside.png'), 'in', 'utf8');
      await writeFile(path.join(dir, 'backgrounds', 'outside.png'), 'out', 'utf8');
      await writeFile(path.join(dir, 'assets-outside.png'), 'out', 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'list-assets',
        '--project',
        dir,
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const allPaths = Object.values(result.assets).flat().map((asset) => asset.path);

      expect(allPaths).toEqual(['backgrounds/inside.png']);
      expect(allPaths).not.toContain('backgrounds/outside.png');
      expect(allPaths).not.toContain('assets-outside.png');
    });
  });

  it('sets and edits title screen elements through direct CLI commands', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_title_screen',
        characters: {},
        scenes: {},
      }), 'utf8');

      const setResult = await execFileAsync('node', [
        cliPath,
        'set-title-screen',
        '--script',
        scriptPath,
        '--background',
        'ui/title/background.png',
        '--bgm',
        'audio/title.ogg',
        '--elements',
        JSON.stringify([
          { id: 'logo', type: 'text', content: 'Moonlit Letter', x: 640, y: 170, anchor: 'center' },
        ]),
        '--replace',
        '--force',
        '--json',
      ]);
      const setOutput = JSON.parse(setResult.stdout);
      expect(setOutput.result).toMatchObject({
        uiPath: 'ui.titleScreen',
        screenId: 'titleScreen',
        elementCount: 1,
      });
      expect(setOutput.changeSummary.changedPaths).toEqual(['ui.titleScreen']);

      const addResult = await execFileAsync('node', [
        cliPath,
        'add-title-element',
        '--script',
        scriptPath,
        '--type',
        'button',
        '--id',
        'start-button',
        '--label',
        'Start',
        '--action',
        'start',
        '--x',
        '640',
        '--y',
        '430',
        '--anchor',
        'center',
        '--width',
        '220',
        '--height',
        '52',
        '--force',
        '--json',
      ]);
      expect(JSON.parse(addResult.stdout).result).toMatchObject({
        elementId: 'start-button',
        elementIndex: 1,
      });

      await execFileAsync('node', [
        cliPath,
        'update-title-element',
        '--script',
        scriptPath,
        '--id',
        'start-button',
        '--text',
        'Begin',
        '--force',
        '--json',
      ]);
      await execFileAsync('node', [
        cliPath,
        'remove-title-element',
        '--script',
        scriptPath,
        '--id',
        'logo',
        '--force',
        '--json',
      ]);

      const script = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(script.ui.titleScreen).toEqual({
        background: 'ui/title/background.png',
        bgm: 'audio/title.ogg',
        elements: [
          {
            id: 'start-button',
            type: 'button',
            text: 'Begin',
            action: 'start',
            x: 640,
            y: 430,
            anchor: 'center',
            width: 220,
            height: 52,
          },
        ],
      });
    });
  });

  it('applies title screen changes transactionally from an authoring plan', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'title-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_title_screen_plan',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        version: 1,
        operations: [
          {
            id: 'title-base',
            command: 'set-title-screen',
            params: {
              background: 'ui/title/background.png',
              bgm: 'audio/title.ogg',
              merge: false,
            },
          },
          {
            id: 'title-logo',
            command: 'add-title-element',
            params: {
              id: 'title-logo',
              type: 'text',
              content: 'Moonlit Letter',
              x: 640,
              y: 170,
              anchor: 'center',
            },
          },
          {
            id: 'title-button',
            command: 'add-title-element',
            params: {
              id: 'start-button',
              type: 'button',
              text: 'Start',
              action: 'start',
              x: 640,
              y: 430,
            },
          },
        ],
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--force',
        '--checkpoint',
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.transaction).toMatchObject({
        command: 'apply-plan',
        status: 'written',
        wrote: true,
      });
      expect(result.changeSummary.changedPaths).toEqual(['ui.titleScreen']);
      expect(script.ui.titleScreen).toMatchObject({
        background: 'ui/title/background.png',
        bgm: 'audio/title.ogg',
        elements: [
          { id: 'title-logo', type: 'text', content: 'Moonlit Letter' },
          { id: 'start-button', type: 'button', text: 'Start', action: 'start' },
        ],
      });
    });
  });

  it('sets existing screen layout config from a JSON file', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const configPath = path.join(dir, 'game-menu-layout.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_screen_layout',
        characters: {},
        scenes: {},
        ui: {
          gameMenu: {
            panel: { width: 320 },
          },
        },
      }), 'utf8');
      await writeFile(configPath, JSON.stringify({
        panel: { background: 'rgba(0,0,0,0.7)' },
        buttons: { color: '#ffffff' },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'set-screen-layout',
        '--script',
        scriptPath,
        '--screen',
        'gameMenu',
        '--config',
        configPath,
        '--force',
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.result).toEqual({
        uiPath: 'ui.gameMenu',
        screenId: 'gameMenu',
      });
      expect(result.changeSummary.changedPaths).toEqual(['ui.gameMenu']);
      expect(script.ui.gameMenu).toEqual({
        panel: { width: 320, background: 'rgba(0,0,0,0.7)' },
        buttons: { color: '#ffffff' },
      });
    });
  });

  it('applies screen layout changes transactionally from an authoring plan', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'screen-layout-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_screen_layout_plan',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        version: 1,
        operations: [
          {
            id: 'settings-layout',
            command: 'set-screen-layout',
            params: {
              screen: 'settingsScreen',
              merge: false,
              config: {
                header: { title: { text: 'Settings' } },
                tabBar: { tabs: [{ label: 'Audio', settingKeys: ['master-volume'] }] },
              },
            },
          },
          {
            id: 'save-load-layout',
            command: 'set-screen-layout',
            params: {
              screen: 'saveLoadScreen',
              config: {
                chrome: { backgroundImage: 'ui/save-load/background.png' },
              },
            },
          },
        ],
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--force',
        '--checkpoint',
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.changeSummary.changedPaths).toEqual([
        'ui.settingsScreen',
        'ui.saveLoadScreen',
      ]);
      expect(script.ui.settingsScreen.header.title.text).toBe('Settings');
      expect(script.ui.saveLoadScreen.chrome.backgroundImage).toBe('ui/save-load/background.png');
    });
  });

  it('rejects unsupported screen layout ids from the CLI', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_screen_layout_invalid',
        characters: {},
        scenes: {},
      }), 'utf8');

      await expect(execFileAsync('node', [
        cliPath,
        'set-screen-layout',
        '--script',
        scriptPath,
        '--screen',
        'titleScreen',
        '--config-json',
        '{}',
        '--force',
        '--json',
      ])).rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('Unsupported screen layout id: titleScreen'),
      });
    });
  });

  it('sets shared UI config from JSON without raw style/code authoring', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const widgetPath = path.join(dir, 'widget-styles.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_shared_ui',
        characters: {},
        scenes: {},
        ui: {
          dialogueBox: {
            frame: { opacity: 0.8 },
          },
          theme: {
            tokens: { primary: '#112233' },
          },
          widgetStyles: {
            slider: { trackColor: '#111111' },
          },
        },
      }), 'utf8');
      await writeFile(widgetPath, JSON.stringify({
        slider: { thumbColor: '#ffffff' },
        toggle: { onColor: '#66aaff' },
      }), 'utf8');

      const dialogueResult = await execFileAsync('node', [
        cliPath,
        'set-dialogue-box',
        '--script',
        scriptPath,
        '--config-json',
        JSON.stringify({
          frame: { backgroundImage: 'ui/dialogue/frame.png' },
          nameplateStyle: { color: '#ffffff' },
        }),
        '--force',
        '--json',
      ]);
      const themeResult = await execFileAsync('node', [
        cliPath,
        'set-theme',
        '--script',
        scriptPath,
        '--config-json',
        JSON.stringify({
          tokens: { accent: '#66aaff' },
          cursor: { default: 'ui/cursors/default.png' },
        }),
        '--force',
        '--json',
      ]);
      const widgetResult = await execFileAsync('node', [
        cliPath,
        'set-widget-styles',
        '--script',
        scriptPath,
        '--config',
        widgetPath,
        '--replace',
        '--force',
        '--json',
      ]);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(JSON.parse(dialogueResult.stdout).changeSummary.changedPaths).toEqual(['ui.dialogueBox']);
      expect(JSON.parse(themeResult.stdout).changeSummary.changedPaths).toEqual(['ui.theme']);
      expect(JSON.parse(widgetResult.stdout).changeSummary.changedPaths).toEqual(['ui.widgetStyles']);
      expect(script.ui.dialogueBox).toEqual({
        frame: { opacity: 0.8, backgroundImage: 'ui/dialogue/frame.png' },
        nameplateStyle: { color: '#ffffff' },
      });
      expect(script.ui.theme).toEqual({
        tokens: { primary: '#112233', accent: '#66aaff' },
        cursor: { default: 'ui/cursors/default.png' },
      });
      expect(script.ui.widgetStyles).toEqual({
        slider: { thumbColor: '#ffffff' },
        toggle: { onColor: '#66aaff' },
      });
    });
  });

  it('applies shared UI config changes transactionally from an authoring plan', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'shared-ui-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_shared_ui_plan',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        version: 1,
        operations: [
          {
            command: 'set-dialogue-box',
            params: {
              config: {
                nameplateStyle: { backgroundImage: 'ui/dialogue/nameplate.png' },
              },
            },
          },
          {
            command: 'set-theme',
            params: {
              config: {
                icons: { close: 'ui/icons/close.png' },
              },
            },
          },
          {
            command: 'set-widget-styles',
            params: {
              merge: false,
              config: {
                tabs: { activeBackgroundImage: 'ui/widgets/tab-active.png' },
              },
            },
          },
        ],
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--force',
        '--checkpoint',
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.changeSummary.changedPaths).toEqual([
        'ui.dialogueBox',
        'ui.theme',
        'ui.widgetStyles',
      ]);
      expect(script.ui.dialogueBox.nameplateStyle.backgroundImage).toBe('ui/dialogue/nameplate.png');
      expect(script.ui.theme.icons.close).toBe('ui/icons/close.png');
      expect(script.ui.widgetStyles.tabs.activeBackgroundImage).toBe('ui/widgets/tab-active.png');
    });
  });

  it('documents the structured draft contract used by the example draft', async () => {
    const contract = await readFile(path.resolve('docs/agent-authoring/structured-draft-contract.md'), 'utf8');

    expect(contract).toContain('npm run vn:draft-plan -- draft.json --out .tmp/draft-plan.json --require-adaptation-preview --json');
    expect(contract).toContain('docs/agent-authoring/example-draft.json');
    for (const heading of [
      '## Top-Level Shape',
      '## Characters',
      '## Variables',
      '## Locations',
      '## Scenes',
      '## Beats',
      '## Dialogues',
      '## Choices',
      '## Conversion Rules',
      '## Agent Checklist',
    ]) {
      expect(contract).toContain(heading);
    }
  });

  it('documents the compact external-agent checklist command chain', async () => {
    const checklist = await readFile(path.resolve('docs/agent-authoring/agent-checklist.md'), 'utf8');

    expect(checklist).toContain('Codex, Claude, opencode, GitHub Copilot');
    expect(checklist).toContain('Do not build or imply an in-editor AI chat assistant.');
    expect(checklist).toContain('docs/agent-authoring/asset-naming-guidelines.md');
    expect(checklist).toContain('docs/agent-authoring/example-adaptation-preview.md');
    expect(checklist).toContain('docs/agent-authoring/structured-draft-contract.md');
    expect(checklist).toContain('docs/agent-authoring/plan-manifest.md');
    expect(checklist).toContain('Register CG gallery entries with `add-cg` before writing `unlock:cg`; do not build or imply an in-editor AI assistant.');
    for (const command of [
      'npm run vn:inspect -- --json',
      'npm run vn -- list-assets --script public/game/script.json --json',
      'npm run vn:draft-plan -- draft.json --out .tmp/draft-plan.json --require-adaptation-preview --json',
      'npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --validate-only --result-out .tmp/apply-plan-validation.json --json',
      'npm run vn:apply-plan -- .tmp/draft-plan.json --script public/game/script.json --force --checkpoint --result-out .tmp/apply-plan-result.json --json',
      'npm run vn:author-check -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --json',
      'npm run vn:handoff-report -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-editor-handoff',
      'npm run vn:review-handoff -- --script public/game/script.json --transaction .tmp/apply-plan-result.json --write-preview-plan --write-editor-handoff --json',
    ]) {
      expect(checklist).toContain(command);
    }
  });

  it('documents asset naming and adaptation preview contracts for prose workflows', async () => {
    const naming = await readFile(path.resolve('docs/agent-authoring/asset-naming-guidelines.md'), 'utf8');
    const preview = await readFile(path.resolve('docs/agent-authoring/example-adaptation-preview.md'), 'utf8');
    const adaptationSkill = await readFile(path.resolve('docs/agent-authoring/novel-adaptation-skill.md'), 'utf8');
    const planManifest = await readFile(path.resolve('docs/agent-authoring/plan-manifest.md'), 'utf8');

    for (const text of [
      'backgrounds/school_gate_rainy.png',
      'characters/sakura_nervous.png',
      'ui/game_menu_button_normal.png',
      'npm run vn -- list-assets --script path/to/script.json --json',
      'Filename tokens are the current supported semantic layer.',
    ]) {
      expect(naming).toContain(text);
    }

    for (const text of [
      '## Source Excerpt',
      '## Adaptation Preview',
      'sakura_trust',
      'characters/haruma_worried.png',
      '可能需要补充的资源',
    ]) {
      expect(preview).toContain(text);
    }

    expect(adaptationSkill).toContain('example-adaptation-preview.md');
    expect(adaptationSkill).toContain('asset-naming-guidelines.md');
    for (const command of [
      'set-title-screen',
      'set-screen-layout',
      'set-dialogue-box',
      'set-theme',
      'set-widget-styles',
    ]) {
      expect(planManifest).toContain(`- \`${command}\``);
    }
  });

  it('keeps external-agent docs on the npm vn command style', async () => {
    const packageJson = JSON.parse(await readFile(path.resolve('package.json'), 'utf8'));
    expect(packageJson.scripts.vn).toBe('node tools/vn-author/index.js');

    const docPaths = [
      'docs/agent-authoring/agent-checklist.md',
      'docs/agent-authoring/asset-naming-guidelines.md',
      'docs/agent-authoring/command-reference.md',
      'docs/agent-authoring/example-adaptation-preview.md',
      'docs/agent-authoring/layout-rules.md',
      'docs/agent-authoring/mini-workflows.md',
      'docs/agent-authoring/novel-adaptation-skill.md',
      'docs/agent-authoring/plan-manifest.md',
      'docs/agent-authoring/project-contract.md',
      'docs/agent-authoring/skill.md',
      'docs/agent-authoring/validation-rules.md',
      'docs/agent-authoring/workflow.md',
    ];
    for (const docPath of docPaths) {
      const doc = await readFile(path.resolve(docPath), 'utf8');
      expect(doc).not.toContain('node tools/vn-author/index.js');
    }
  });

  it('documents supported CG gallery authoring in the external-agent skill', async () => {
    const skill = await readFile(path.resolve('docs/agent-authoring/skill.md'), 'utf8');

    expect(skill).toContain('Register endings with `add-ending` before writing `unlock:ending`');
    expect(skill).toContain('add-ending-unlock --scene good_ending --page 0 --id good_end');
    expect(skill).toContain('CG gallery registry authoring is supported through `add-cg`, `update-cg`, `remove-cg`, `add-cg-unlock`, and `list-cg`');
  });

  it('runs the documented draft artifact chain through apply, author-check, and handoff', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'example-draft-plan.json');
      const resultOutPath = path.join(dir, 'apply-plan-result.json');
      const previewPath = path.join(dir, 'author-check-preview.png');
      const handoffPath = path.join(dir, 'agent-handoff.json');
      const exampleDraftPath = path.resolve('docs/agent-authoring/example-draft.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_full_chain',
        characters: {},
        scenes: {},
      }), 'utf8');

      const draftPlan = await execFileAsync('node', [
        cliPath,
        'draft-plan',
        exampleDraftPath,
        '--out',
        planPath,
        '--json',
      ]);
      const draftPlanResult = JSON.parse(draftPlan.stdout);
      expect(draftPlanResult).toMatchObject({
        outPath: planPath,
        operationCount: 6,
      });

      const apply = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--force',
        '--checkpoint',
        '--result-out',
        resultOutPath,
        '--json',
      ]);
      const applyResult = JSON.parse(apply.stdout);
      const resultArtifact = JSON.parse(await readFile(resultOutPath, 'utf8'));
      expect(applyResult.transaction).toMatchObject({
        command: 'apply-plan',
        status: 'written',
        wrote: true,
      });
      expect(applyResult.changeSummary.changedPaths).toEqual(expect.arrayContaining([
        'characters.sakura',
        'characters.haruki',
        'systems.variables.sakura_affection',
        'scenes.start',
        'scenes.start.pages.0',
        'scenes.start.pages.1',
      ]));
      expect(resultArtifact.changeSummary).toMatchObject({
        operationCount: 6,
        validation: { ok: true, errorCount: 0, warningCount: 0 },
      });

      const check = await execFileAsync('node', [
        cliPath,
        'author-check',
        '--script',
        scriptPath,
        '--transaction',
        resultOutPath,
        '--preview-out',
        previewPath,
        '--write-preview-plan',
        '--skip-asset-check',
        '--json',
      ]);
      const checkResult = JSON.parse(check.stdout);
      const previewPlan = JSON.parse(await readFile(`${previewPath}.json`, 'utf8'));
      expect(checkResult).toMatchObject({
        ok: true,
        gates: {
          validation: true,
          layout: true,
          readiness: true,
          preview: true,
        },
      });
      expect(checkResult.focus).toMatchObject({
        mode: 'transaction',
        changedPaths: expect.arrayContaining(['scenes.start.pages.0']),
        checkedSceneIds: ['start'],
        previewTarget: { sceneId: 'start', pageIndex: 0 },
      });
      expect(previewPlan).toMatchObject({
        dryRun: true,
        sceneId: 'start',
        pageIndex: 0,
      });

      const handoff = await execFileAsync('node', [
        cliPath,
        'handoff-report',
        '--script',
        scriptPath,
        '--transaction',
        resultOutPath,
        '--out',
        handoffPath,
        '--write-editor-handoff',
        '--skip-asset-check',
        '--note',
        'Review the full external-agent artifact chain.',
        '--json',
      ]);
      const handoffResult = JSON.parse(handoff.stdout);
      const handoffArtifact = JSON.parse(await readFile(handoffPath, 'utf8'));
      expect(handoffResult).toMatchObject({
        kind: 'agent-authoring-handoff',
        ok: true,
        transactionSummary: {
          command: 'apply-plan',
          status: 'written',
          wrote: true,
          operationCount: 6,
        },
        notes: ['Review the full external-agent artifact chain.'],
      });
      expect(handoffArtifact.transactionSummary.changedPaths).toEqual(expect.arrayContaining([
        'scenes.start.pages.0',
        'scenes.start.pages.1',
      ]));
      expect((await stat(planPath)).isFile()).toBe(true);
      expect((await stat(resultOutPath)).isFile()).toBe(true);
      expect((await stat(`${previewPath}.json`)).isFile()).toBe(true);
      expect((await stat(handoffPath)).isFile()).toBe(true);
    });
  });

  it('runs author-check and editor handoff as one continuous review command', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const reviewPath = path.join(dir, 'review-handoff.json');
      const handoffPath = path.join(dir, 'agent-handoff.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_continuous_review',
        characters: {},
        scenes: {
          start: {
            pages: [{
              type: 'normal',
              background: 'backgrounds/room.png',
              dialogues: [{ speaker: null, text: 'Ready for review.' }],
            }],
          },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'review-handoff',
        '--script',
        scriptPath,
        '--skip-asset-check',
        '--skip-preview',
        '--write-editor-handoff',
        '--review-out',
        reviewPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const artifact = JSON.parse(await readFile(reviewPath, 'utf8'));
      const handoff = JSON.parse(await readFile(handoffPath, 'utf8'));

      expect(result).toMatchObject({
        kind: 'agent-review-handoff',
        ok: true,
        gates: { authorCheck: true, handoff: true, previewScreenshot: null },
      });
      expect(artifact.kind).toBe('agent-review-handoff');
      expect(artifact.authorCheck.ok).toBe(true);
      expect(handoff.kind).toBe('agent-authoring-handoff');
    });
  });

  it('can require captured preview evidence in the continuous review gate', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_strict_preview_gate',
        characters: {},
        scenes: {
          start: {
            pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'Screenshot required.' }] }],
          },
        },
      }), 'utf8');

      const failure = await execFileAsync('node', [
        cliPath,
        'review-handoff',
        '--script',
        scriptPath,
        '--skip-asset-check',
        '--skip-preview',
        '--require-preview-screenshot',
        '--json',
      ]).catch((error) => error);
      const result = JSON.parse(failure.stdout);

      expect(failure.code).toBe(1);
      expect(result.ok).toBe(false);
      expect(result.gates.previewScreenshot).toBe(false);
      expect(result.authorCheck.previewQuality.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'preview-screenshot-required' }),
      ]));
    });
  });

  it('does not write invalid authoring plans unless explicitly allowed', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'invalid-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_plan_invalid',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        operations: [
          { command: 'add-scene', params: { id: 'start' } },
          {
            command: 'add-page',
            params: {
              scene: 'start',
              type: 'normal',
              dialogues: [{ speaker: 'missing_character', text: 'Oops.' }],
            },
          },
        ],
      }), 'utf8');

      await expect(execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--force',
        '--json',
      ])).rejects.toMatchObject({
        code: 1,
        stdout: expect.any(String),
      });

      try {
        await execFileAsync('node', [
          cliPath,
          'apply-plan',
          planPath,
          '--script',
          scriptPath,
          '--force',
          '--json',
        ]);
      } catch (error) {
        const result = JSON.parse(error.stdout);
        const script = JSON.parse(await readFile(scriptPath, 'utf8'));
        expect(result.transaction).toMatchObject({
          status: 'blocked',
          wrote: false,
          blockedByValidation: true,
        });
        expect(result.validation.ok).toBe(false);
        expect(script.scenes).toEqual({});
      }
    });
  });

  it('validates an apply-plan manifest without writing or checkpointing', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'valid-plan.json');
      const resultOutPath = path.join(dir, 'validate-result.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_validate_only',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        operations: [
          { command: 'add-scene', params: { id: 'start', name: 'Start' } },
          {
            command: 'add-page',
            params: {
              scene: 'start',
              type: 'normal',
              background: 'backgrounds/start.svg',
              dialogues: [{ speaker: null, text: 'Validated only.' }],
            },
          },
        ],
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--validate-only',
        '--force',
        '--checkpoint',
        '--result-out',
        resultOutPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const saved = JSON.parse(await readFile(resultOutPath, 'utf8'));
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result).toMatchObject({
        dryRun: false,
        validateOnly: true,
        outPath: null,
        transaction: {
          command: 'apply-plan',
          status: 'validated',
          wrote: false,
          blockedByValidation: false,
          checkpointPath: null,
        },
        changeSummary: {
          validateOnly: true,
          writeStatus: 'validated',
          operationCount: 2,
          validation: { ok: true, errorCount: 0, warningCount: 0 },
        },
      });
      expect(saved.transaction).toMatchObject(result.transaction);
      expect(result.changeSummary.changedPaths).toEqual([
        'scenes.start',
        'scenes.start.pages.0',
      ]);
      expect(script.scenes).toEqual({});
    });
  });

  it('reports validation-invalid apply-plan manifests in validate-only mode', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'invalid-validate-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_validate_only_invalid',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        operations: [
          { command: 'add-scene', params: { id: 'start' } },
          {
            command: 'add-page',
            params: {
              scene: 'start',
              type: 'normal',
              dialogues: [{ speaker: 'missing_character', text: 'No write.' }],
            },
          },
        ],
      }), 'utf8');

      await expect(execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--validate-only',
        '--allow-invalid',
        '--json',
      ])).rejects.toMatchObject({
        code: 1,
        stdout: expect.any(String),
      });

      try {
        await execFileAsync('node', [
          cliPath,
          'apply-plan',
          planPath,
          '--script',
          scriptPath,
          '--validate-only',
          '--allow-invalid',
          '--json',
        ]);
      } catch (error) {
        const result = JSON.parse(error.stdout);
        const script = JSON.parse(await readFile(scriptPath, 'utf8'));

        expect(result).toMatchObject({
          validateOnly: true,
          outPath: null,
          transaction: {
            status: 'invalid',
            wrote: false,
            blockedByValidation: false,
          },
          changeSummary: {
            validateOnly: true,
            writeStatus: 'invalid',
            validation: { ok: false, errorCount: 1 },
          },
        });
        expect(script.scenes).toEqual({});
      }
    });
  });

  it('returns structured apply-plan operation failures for unsupported commands', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'unsupported-plan.json');
      const resultOutPath = path.join(dir, 'apply-result.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_plan_unsupported',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        operations: [
          { id: 'create-start', command: 'add-scene', params: { id: 'start' } },
          { id: 'bad-op', command: 'paint-scene', params: { scene: 'start' } },
        ],
      }), 'utf8');

      await expect(execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--result-out',
        resultOutPath,
        '--json',
      ])).rejects.toMatchObject({
        code: 1,
        stdout: expect.any(String),
      });

      try {
        await execFileAsync('node', [
          cliPath,
          'apply-plan',
          planPath,
          '--script',
          scriptPath,
          '--result-out',
          resultOutPath,
          '--json',
        ]);
      } catch (error) {
        const result = JSON.parse(error.stdout);
        const saved = JSON.parse(await readFile(resultOutPath, 'utf8'));
        const script = JSON.parse(await readFile(scriptPath, 'utf8'));

        expect(result).toMatchObject({
          ok: false,
          transaction: {
            command: 'apply-plan',
            status: 'failed',
            wrote: false,
          },
          operationFailure: {
            index: 1,
            id: 'bad-op',
            command: 'paint-scene',
            status: 'failed',
            code: 'unsupported-apply-plan-command',
            suggestedAction: {
              repairHint: {
                action: 'replace-command',
                path: 'operations[1].command',
                unsupportedCommand: 'paint-scene',
              },
            },
          },
          changeSummary: {
            writeStatus: 'failed',
            operationCount: 2,
            completedOperationCount: 1,
            failedOperationIndex: 1,
            changedPaths: ['scenes.start'],
          },
        });
        expect(result.operations).toEqual([
          expect.objectContaining({
            index: 0,
            id: 'create-start',
            command: 'add-scene',
            status: 'applied',
            changedPaths: ['scenes.start'],
          }),
          expect.objectContaining({
            index: 1,
            id: 'bad-op',
            status: 'failed',
          }),
        ]);
        expect(result.operationFailure.supportedCommands).toEqual(expect.arrayContaining([
          'add-scene',
          'set-dialogue',
          'retarget-scene',
        ]));
        expect(result.operationFailure.suggestedAction.repairHint.supportedCommands).toEqual(expect.arrayContaining([
          'add-scene',
          'set-dialogue',
          'retarget-scene',
        ]));
        expect(saved.operationFailure).toEqual(result.operationFailure);
        expect(script.scenes).toEqual({});
      }
    });
  });

  it('returns structured apply-plan operation failures for missing params', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'missing-param-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_plan_missing_param',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        operations: [
          { id: 'bad-page', command: 'add-page', params: { type: 'normal' } },
        ],
      }), 'utf8');

      await expect(execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--json',
      ])).rejects.toMatchObject({
        code: 1,
        stdout: expect.any(String),
      });

      try {
        await execFileAsync('node', [
          cliPath,
          'apply-plan',
          planPath,
          '--script',
          scriptPath,
          '--json',
        ]);
      } catch (error) {
        const result = JSON.parse(error.stdout);
        expect(result.operationFailure).toMatchObject({
          index: 0,
          id: 'bad-page',
          command: 'add-page',
          code: 'missing-apply-plan-param',
          message: 'add-page requires sceneId',
          missingParam: 'sceneId',
          acceptedParams: ['sceneId', 'scene'],
          suggestedAction: {
            summary: 'Add required param "sceneId" to this operation.',
            repairHint: {
              action: 'add-param',
              path: 'operations[0].params.sceneId',
              missingParam: 'sceneId',
              acceptedParams: ['sceneId', 'scene'],
            },
          },
        });
        expect(result.changeSummary).toMatchObject({
          completedOperationCount: 0,
          failedOperationIndex: 0,
          changedPaths: [],
        });
      }
    });
  });

  it('returns repair hints for apply-plan operations without commands', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'missing-command-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_plan_missing_command',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        operations: [
          { id: 'blank-op', params: { id: 'start' } },
        ],
      }), 'utf8');

      try {
        await execFileAsync('node', [
          cliPath,
          'apply-plan',
          planPath,
          '--script',
          scriptPath,
          '--json',
        ]);
      } catch (error) {
        const result = JSON.parse(error.stdout);
        expect(result.operationFailure).toMatchObject({
          index: 0,
          id: 'blank-op',
          command: null,
          code: 'missing-apply-plan-command',
          suggestedAction: {
            summary: 'Add a supported apply-plan command to this operation.',
            repairHint: {
              action: 'add-command',
              path: 'operations[0].command',
            },
          },
        });
        expect(result.operationFailure.suggestedAction.repairHint.supportedCommands).toEqual(expect.arrayContaining([
          'add-scene',
          'set-dialogue',
        ]));
        return;
      }

      throw new Error('Expected apply-plan to fail for a missing operation command');
    });
  });

  it('adds a character incrementally with expression shortcuts', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'add-character',
        '--script',
        scriptPath,
        '--id',
        'sakura',
        '--name',
        'Sakura',
        '--color',
        '#ff99aa',
        '--expression',
        'normal=characters/sakura_normal.svg',
        '--expression',
        'smile=characters/sakura_smile.svg',
        '--force',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.result).toEqual({ characterId: 'sakura' });
      expect(script.characters.sakura).toMatchObject({
        name: 'Sakura',
        color: '#ff99aa',
        expressions: {
          normal: 'characters/sakura_normal.svg',
          smile: 'characters/sakura_smile.svg',
        },
      });
    });
  });

  it('adds a variable incrementally', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'add-variable',
        '--script',
        scriptPath,
        '--id',
        'affection',
        '--type',
        'number',
        '--initial',
        '2',
        '--label',
        'Affection',
        '--force',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.result).toEqual({ variableId: 'affection' });
      expect(script.systems.variables.affection).toMatchObject({
        type: 'number',
        initial: 2,
        label: 'Affection',
      });
    });
  });

  it('applies M1 variable and choice-effect operations through apply-plan with changed paths', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'm1-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_m1',
        characters: {
          sakura: { name: 'Sakura', expressions: {} },
        },
        systems: {
          variables: {
            affection: { type: 'number', initial: 1, label: 'Affection' },
          },
        },
        scenes: {
          start: {
            pages: [
              {
                type: 'choice',
                prompt: 'Answer?',
                options: [
                  { text: 'Kind', effects: [{ type: 'var:add', id: 'affection', value: 1 }] },
                ],
              },
              {
                type: 'condition',
                conditionMode: 'all',
                conditions: [{ variableId: 'affection', operator: '>=', value: 2 }],
                trueTarget: null,
                falseTarget: null,
              },
            ],
          },
        },
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        version: 1,
        operations: [
          {
            id: 'variable-ux',
            command: 'update-variable',
            params: { id: 'affection', label: 'Affection Score', min: 0, max: 10, step: 1 },
          },
          {
            id: 'rename-variable',
            command: 'rename-variable',
            params: { id: 'affection', newId: 'sakura_affection' },
          },
          {
            id: 'affection-preset',
            command: 'add-affection-variable',
            params: { character: 'sakura', id: 'sakura_bond', label: 'Sakura Bond' },
          },
          {
            id: 'replace-effect',
            command: 'set-choice-effect',
            params: {
              scene: 'start',
              page: 0,
              option: 0,
              effectIndex: 0,
              effect: { type: 'var:add', id: 'sakura_bond', value: 2 },
            },
          },
          {
            id: 'remove-effect',
            command: 'remove-choice-effect',
            params: { scene: 'start', page: 0, option: 0, effectIndex: 0 },
          },
        ],
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--force',
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.transaction).toMatchObject({
        command: 'apply-plan',
        status: 'written',
      });
      expect(result.changeSummary.operationCount).toBe(5);
      expect(result.validation.ok).toBe(true);
      expect(result.changeSummary.changedPaths).toEqual(expect.arrayContaining([
        'systems.variables.affection',
        'systems.variables.sakura_affection',
        'systems.variables.sakura_bond',
        'scenes.start.pages.0.options.0.effects.0',
        'scenes.start.pages.1.conditions.0',
      ]));
      expect(script.systems.variables.sakura_affection).toMatchObject({
        type: 'number',
        initial: 1,
        label: 'Affection Score',
        min: 0,
        max: 10,
        step: 1,
      });
      expect(script.systems.variables.sakura_bond).toMatchObject({
        kind: 'affection',
        characterId: 'sakura',
      });
      expect(script.scenes.start.pages[0].options[0].effects).toBeUndefined();
      expect(script.scenes.start.pages[1].conditions).toEqual([
        { variableId: 'sakura_affection', operator: '>=', value: 2 },
      ]);
    });
  });

  it('applies M2 ending operations through CLI and apply-plan with changed paths', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'm2-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_m2',
        characters: {},
        scenes: {
          start: {
            pages: [
              {
                type: 'choice',
                prompt: 'Finish?',
                options: [{ text: 'Good end', target: null }],
              },
              {
                type: 'normal',
                dialogues: [{ speaker: null, text: 'A peaceful conclusion.' }],
              },
            ],
          },
        },
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        version: 1,
        operations: [
          {
            id: 'register-ending',
            command: 'add-ending',
            params: {
              id: 'good_end',
              title: 'Good End',
              category: 'main',
              order: 1,
              description: 'Clear the good route.',
              thumbnail: 'ui/endings/good.png',
              hiddenUntilUnlocked: true,
            },
          },
          {
            id: 'unlock-ending',
            command: 'add-ending-unlock',
            params: { scene: 'start', page: 0, option: 0, ending: 'good_end' },
          },
          {
            id: 'unlock-ending-on-page-entry',
            command: 'add-ending-unlock',
            params: { scene: 'start', page: 1, ending: 'good_end' },
          },
        ],
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--force',
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.validation.ok).toBe(true);
      expect(result.changeSummary.changedPaths).toEqual(expect.arrayContaining([
        'systems.endings.good_end',
        'scenes.start.pages.0.options.0.effects.0',
        'scenes.start.pages.1.effects.0',
      ]));
      expect(script.systems.endings.good_end).toMatchObject({
        title: 'Good End',
        category: 'main',
        order: 1,
        description: 'Clear the good route.',
        thumbnail: 'ui/endings/good.png',
        hiddenUntilUnlocked: true,
      });
      expect(script.scenes.start.pages[0].options[0].effects).toEqual([
        { type: 'unlock:ending', id: 'good_end' },
      ]);
      expect(script.scenes.start.pages[1].effects).toEqual([
        { type: 'unlock:ending', id: 'good_end' },
      ]);

      const list = JSON.parse((await execFileAsync('node', [
        cliPath,
        'list-endings',
        '--script',
        scriptPath,
        '--json',
      ])).stdout);
      expect(list).toMatchObject({
        count: 1,
        endings: [expect.objectContaining({ endingId: 'good_end', title: 'Good End' })],
      });

      const update = JSON.parse((await execFileAsync('node', [
        cliPath,
        'update-ending',
        '--script',
        scriptPath,
        '--id',
        'good_end',
        '--title',
        'Golden End',
        '--hidden-until-unlocked',
        'false',
        '--force',
        '--json',
      ])).stdout);
      expect(update.changeSummary.changedPaths).toEqual(['systems.endings.good_end']);
      expect(JSON.parse(await readFile(scriptPath, 'utf8')).systems.endings.good_end).toMatchObject({
        title: 'Golden End',
        hiddenUntilUnlocked: false,
      });

      const removed = JSON.parse((await execFileAsync('node', [
        cliPath,
        'remove-ending',
        '--script',
        scriptPath,
        '--id',
        'good_end',
        '--force-references',
        '--force',
        '--json',
      ])).stdout);
      const removedScript = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(removed.result).toMatchObject({
        deletedEndingId: 'good_end',
        deletedReferenceCount: 2,
      });
      expect(removed.changeSummary.changedPaths).toEqual([
        'systems.endings.good_end',
        'scenes.start.pages.0.options.0.effects.0',
        'scenes.start.pages.1.effects.0',
      ]);
      expect(removedScript.systems.endings.good_end).toBeUndefined();
      expect(removedScript.scenes.start.pages[0].options[0].effects).toBeUndefined();
      expect(removedScript.scenes.start.pages[1].effects).toBeUndefined();
    });
  });

  it('applies M3 CG gallery operations through CLI and apply-plan with changed paths', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'm3-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_m3',
        scenes: {
          start: {
            pages: [{ type: 'choice', options: [{ text: 'Memory' }] }],
          },
        },
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        version: 1,
        operations: [
          {
            command: 'add-cg',
            params: {
              id: 'cg_confession',
              title: 'Confession',
              images: ['backgrounds/cg/confession.png'],
              thumbnail: 'backgrounds/cg/confession-thumb.png',
              lockedThumbnail: 'ui/gallery/locked.png',
              order: 1,
            },
          },
          {
            command: 'add-cg-unlock',
            params: { scene: 'start', page: 0, option: 0, cg: 'cg_confession' },
          },
        ],
      }), 'utf8');

      const result = JSON.parse((await execFileAsync('node', [
        cliPath, 'apply-plan', planPath, '--script', scriptPath, '--force', '--json',
      ])).stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(result.validation.ok).toBe(true);
      expect(result.changeSummary.changedPaths).toEqual(expect.arrayContaining([
        'systems.gallery.cg.cg_confession',
        'scenes.start.pages.0.options.0.effects.0',
      ]));
      expect(script.systems.gallery.cg.cg_confession).toMatchObject({
        images: ['backgrounds/cg/confession.png'],
        thumbnail: 'backgrounds/cg/confession-thumb.png',
        lockedThumbnail: 'ui/gallery/locked.png',
      });
      expect(script.scenes.start.pages[0].options[0].effects).toEqual([
        { type: 'unlock:cg', id: 'cg_confession' },
      ]);

      const list = JSON.parse((await execFileAsync('node', [
        cliPath, 'list-cg', '--script', scriptPath, '--json',
      ])).stdout);
      expect(list.cgs).toEqual([expect.objectContaining({ cgId: 'cg_confession', title: 'Confession' })]);

      const update = JSON.parse((await execFileAsync('node', [
        cliPath, 'update-cg', '--script', scriptPath, '--id', 'cg_confession',
        '--title', 'Golden Memory', '--force', '--json',
      ])).stdout);
      expect(update.changeSummary.changedPaths).toEqual(['systems.gallery.cg.cg_confession']);

      const removed = JSON.parse((await execFileAsync('node', [
        cliPath, 'remove-cg', '--script', scriptPath, '--id', 'cg_confession',
        '--force-references', '--force', '--json',
      ])).stdout);
      expect(removed.result).toMatchObject({ deletedCgId: 'cg_confession', deletedReferenceCount: 1 });
      expect(JSON.parse(await readFile(scriptPath, 'utf8')).systems.gallery.cg.cg_confession).toBeUndefined();
    });
  });

  it('adds normal, choice, and condition pages incrementally', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {
          sakura: {
            name: 'Sakura',
            expressions: { normal: 'characters/sakura_normal.svg' },
          },
        },
        systems: {
          variables: {
            affection: { type: 'number', initial: 0, label: 'Affection' },
          },
        },
        scenes: {
          start: { name: 'Start', pages: [] },
          end: { name: 'End', pages: [] },
        },
      }), 'utf8');

      await execFileAsync('node', [
        cliPath,
        'add-page',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--type',
        'normal',
        '--background',
        'backgrounds/school.svg',
        '--characters',
        '[{"id":"sakura","expression":"normal","position":"center"}]',
        '--dialogues',
        '[{"speaker":"sakura","text":"Hello."}]',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'add-page',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--type',
        'choice',
        '--prompt',
        'Answer?',
        '--options',
        '[{"text":"Go","target":"end","effects":[{"type":"var:add","id":"affection","value":1}]}]',
        '--force',
        '--json',
      ]);

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'add-page',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--type',
        'condition',
        '--conditions',
        '[{"variableId":"affection","operator":">=","value":1}]',
        '--true-target',
        'end',
        '--force',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.result).toEqual({ sceneId: 'start', pageIndex: 2 });
      expect(script.scenes.start.pages).toHaveLength(3);
      expect(script.scenes.start.pages[0]).toMatchObject({
        type: 'normal',
        background: 'backgrounds/school.svg',
        dialogues: [{ speaker: 'sakura', text: 'Hello.' }],
      });
      expect(script.scenes.start.pages[1].options[0].effects).toEqual([
        { type: 'var:add', id: 'affection', value: 1 },
      ]);
      expect(script.scenes.start.pages[2]).toMatchObject({
        type: 'condition',
        conditions: [{ variableId: 'affection', operator: '>=', value: 1 }],
        trueTarget: 'end',
        falseTarget: null,
      });
    });
  });

  it('adds page characters from named layout presets', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {
          sakura: {
            name: 'Sakura',
            expressions: { smile: 'characters/sakura_smile.svg' },
          },
          haruki: {
            name: 'Haruki',
            expressions: { normal: 'characters/haruki_normal.svg' },
          },
        },
        scenes: {
          start: { name: 'Start', pages: [] },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'add-page',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--preset',
        'speaker-emphasis',
        '--character',
        'sakura:smile',
        '--character',
        'haruki',
        '--speaker',
        'sakura',
        '--dialogues',
        '[{"speaker":"sakura","text":"Listen."}]',
        '--force',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.validation.ok).toBe(true);
      expect(script.scenes.start.pages[0].characters).toEqual([
        { id: 'haruki', expression: 'normal', position: 'left', x: null, y: null, scale: 0.92 },
        { id: 'sakura', expression: 'smile', position: 'center', x: null, y: null, scale: 1.08 },
      ]);
    });
  });

  it('mutates existing pages with dialogue, background, character, and effect commands', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {
          sakura: {
            name: 'Sakura',
            expressions: { normal: 'characters/sakura_normal.svg' },
          },
        },
        systems: {
          variables: {
            affection: { type: 'number', initial: 0, label: 'Affection' },
          },
        },
        scenes: {
          start: {
            name: 'Start',
            pages: [
              { type: 'normal', dialogues: [] },
              { type: 'choice', options: [{ text: 'Go', target: 'start' }] },
            ],
          },
        },
      }), 'utf8');

      await execFileAsync('node', [
        cliPath,
        'add-dialogue',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--speaker',
        'sakura',
        '--text',
        'Hello again.',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'set-dialogue',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--dialogue-index',
        '0',
        '--text',
        'Hello revised.',
        '--voice',
        'audio/sakura_001.ogg',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'add-dialogue',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--text',
        'This should move first.',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'move-dialogue',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--from',
        '1',
        '--to',
        '0',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'remove-dialogue',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--dialogue-index',
        '1',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'set-page-background',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--background',
        'backgrounds/classroom.svg',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'set-page-characters',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--character',
        'sakura',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'set-page-audio',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--bgm',
        'audio/theme.mp3',
        '--bgm-volume',
        '0.4',
        '--clear-se',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'add-choice-effect',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '1',
        '--option',
        '0',
        '--effect-type',
        'var:add',
        '--effect-id',
        'affection',
        '--value',
        '3',
        '--force',
        '--json',
      ]);

      const setEffectResult = JSON.parse((await execFileAsync('node', [
        cliPath,
        'set-choice-effect',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '1',
        '--option',
        '0',
        '--effect-index',
        '0',
        '--effect-json',
        '{"type":"var:set","id":"affection","value":5}',
        '--force',
        '--json',
      ])).stdout);

      const removeEffectResult = JSON.parse((await execFileAsync('node', [
        cliPath,
        'remove-choice-effect',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '1',
        '--option',
        '0',
        '--effect-index',
        '0',
        '--force',
        '--json',
      ])).stdout);

      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(setEffectResult.validation.ok).toBe(true);
      expect(setEffectResult.result.effect).toEqual({ type: 'var:set', id: 'affection', value: 5 });
      expect(removeEffectResult.validation.ok).toBe(true);
      expect(removeEffectResult.result.removedEffect).toEqual({ type: 'var:set', id: 'affection', value: 5 });
      expect(script.scenes.start.pages[0]).toMatchObject({
        background: 'backgrounds/classroom.svg',
        bgm: { file: 'audio/theme.mp3', volume: 0.4 },
        se: null,
        characters: [
          { id: 'sakura', expression: 'normal', position: 'center' },
        ],
        dialogues: [
          { speaker: null, text: 'This should move first.', expression: null, voice: null },
        ],
      });
      expect(script.scenes.start.pages[1].options[0].effects).toBeUndefined();
    });
  }, 15000);

  it('edits choice page prompt/options and unified page media from the CLI', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        scenes: {
          start: {
            name: 'Start',
            pages: [
              {
                type: 'choice',
                prompt: '',
                options: [{ text: 'Old', target: null }],
              },
            ],
          },
        },
      }), 'utf8');

      const choiceResult = await execFileAsync('node', [
        cliPath,
        'set-choice-page',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--prompt',
        'Choose a route',
        '--options',
        '[{"text":"Stay","target":null},{"text":"Leave","target":null,"effects":[{"type":"var:add","id":"courage","value":1}]}]',
        '--force',
        '--json',
      ]);

      const mediaResult = await execFileAsync('node', [
        cliPath,
        'set-page-media',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--background',
        'backgrounds/menu.svg',
        '--bgm',
        'audio/menu.ogg',
        '--bgm-volume',
        '0.7',
        '--clear-se',
        '--force',
        '--json',
      ]);

      const choice = JSON.parse(choiceResult.stdout);
      const media = JSON.parse(mediaResult.stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(choice.result).toEqual({
        sceneId: 'start',
        pageIndex: 0,
        prompt: 'Choose a route',
        optionCount: 2,
      });
      expect(media.result).toMatchObject({
        sceneId: 'start',
        pageIndex: 0,
        background: 'backgrounds/menu.svg',
        bgm: { file: 'audio/menu.ogg', volume: 0.7 },
        se: null,
      });
      expect(script.scenes.start.pages[0]).toMatchObject({
        type: 'choice',
        prompt: 'Choose a route',
        background: 'backgrounds/menu.svg',
        bgm: { file: 'audio/menu.ogg', volume: 0.7 },
        se: null,
        options: [
          { text: 'Stay', target: null },
          { text: 'Leave', target: null, effects: [{ type: 'var:add', id: 'courage', value: 1 }] },
        ],
      });
    });
  });

  it('updates scene flow and appends choice options for revision workflows', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        systems: {
          variables: {
            courage: { type: 'number', initial: 0, label: 'Courage' },
          },
        },
        scenes: {
          start: {
            name: 'Start',
            pages: [
              {
                type: 'choice',
                prompt: 'Go?',
                options: [{ text: 'Forward', target: 'next' }],
              },
            ],
          },
          next: { name: 'Next', pages: [] },
          secret: { name: 'Secret', pages: [] },
        },
      }), 'utf8');

      await execFileAsync('node', [
        cliPath,
        'set-scene-next',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--next',
        'next',
        '--force',
        '--json',
      ]);

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'add-choice-option',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--text',
        'Take the hidden path',
        '--target',
        'secret',
        '--effects',
        '[{"type":"var:add","id":"courage","value":2}]',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'set-choice-option',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--option',
        '1',
        '--text',
        'Take the secret route',
        '--clear-target',
        '--effects',
        '[{"type":"var:add","id":"courage","value":3}]',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'add-choice-option',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--text',
        'Last option',
        '--target',
        'secret',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'move-choice-option',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--from',
        '2',
        '--to',
        '0',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'remove-choice-option',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--option',
        '1',
        '--force',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.result).toEqual({ sceneId: 'start', pageIndex: 0, optionIndex: 1 });
      expect(script.scenes.start.next).toBe('next');
      expect(script.scenes.start.pages[0].options).toEqual([
        { text: 'Last option', target: 'secret' },
        {
          text: 'Take the secret route',
          target: null,
          effects: [{ type: 'var:add', id: 'courage', value: 3 }],
        },
      ]);
    });
  });

  it('renames and deletes scenes through safe structure commands', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        scenes: {
          start: {
            name: 'Start',
            next: 'old_end',
            pages: [
              {
                type: 'choice',
                prompt: 'Go?',
                options: [{ text: 'Yes', target: 'old_end' }],
              },
            ],
          },
          old_end: { name: 'Old End', pages: [] },
          unused: { name: 'Unused', pages: [] },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'rename-scene',
        '--script',
        scriptPath,
        '--scene',
        'old_end',
        '--new-id',
        'good_end',
        '--name',
        'Good End',
        '--force',
        '--json',
      ]);

      await expect(execFileAsync('node', [
        cliPath,
        'delete-scene',
        '--script',
        scriptPath,
        '--scene',
        'good_end',
        '--force',
        '--json',
      ])).rejects.toMatchObject({ code: 1 });

      const deleteResult = await execFileAsync('node', [
        cliPath,
        'delete-scene',
        '--script',
        scriptPath,
        '--scene',
        'unused',
        '--force',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const deleted = JSON.parse(deleteResult.stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.result).toMatchObject({
        sceneId: 'old_end',
        newSceneId: 'good_end',
        updatedReferenceCount: 2,
      });
      expect(result.changeSummary.changedPaths).toEqual(['scenes.old_end', 'scenes.good_end']);
      expect(deleted.result).toMatchObject({
        sceneId: 'unused',
        deletedSceneId: 'unused',
      });
      expect(script.scenes.old_end).toBeUndefined();
      expect(script.scenes.unused).toBeUndefined();
      expect(script.scenes.good_end.name).toBe('Good End');
      expect(script.scenes.start.next).toBe('good_end');
      expect(script.scenes.start.pages[0].options[0].target).toBe('good_end');
    });
  });

  it('diagnoses, retargets, and clears scene references from the CLI', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_refs',
        characters: {},
        scenes: {
          start: {
            name: 'Start',
            next: 'old_route',
            pages: [
              {
                type: 'choice',
                prompt: 'Go?',
                options: [{ text: 'Yes', target: 'old_route' }],
              },
              {
                type: 'condition',
                conditions: [],
                trueTarget: 'old_route',
                falseTarget: 'fallback',
              },
            ],
          },
          old_route: { name: 'Old Route', pages: [] },
          new_route: { name: 'New Route', pages: [] },
          fallback: { name: 'Fallback', pages: [] },
        },
      }), 'utf8');

      const refsResult = await execFileAsync('node', [
        cliPath,
        'scene-references',
        '--script',
        scriptPath,
        '--scene',
        'old_route',
        '--json',
      ]);
      const refs = JSON.parse(refsResult.stdout);
      expect(refs).toMatchObject({
        sceneId: 'old_route',
        referenceCount: 3,
        references: [
          { kind: 'scene-next', pathString: 'scenes.start.next' },
          { kind: 'choice-option', pathString: 'scenes.start.pages.0.options.0.target' },
          { kind: 'condition-true-target', pathString: 'scenes.start.pages.1.trueTarget' },
        ],
      });
      expect(refs.suggestions[0].commands).toEqual(expect.arrayContaining([
        expect.objectContaining({ command: 'retarget-scene' }),
        expect.objectContaining({ command: 'clear-scene-references' }),
      ]));

      const allRefsResult = await execFileAsync('node', [
        cliPath,
        'scene-references',
        '--script',
        scriptPath,
        '--all',
        '--json',
      ]);
      const allRefs = JSON.parse(allRefsResult.stdout);
      expect(allRefs).toMatchObject({
        referenceCount: 4,
        scenes: expect.arrayContaining([
          expect.objectContaining({
            sceneId: 'old_route',
            referenceCount: 3,
          }),
          expect.objectContaining({
            sceneId: 'fallback',
            referenceCount: 1,
          }),
        ]),
      });

      const retargetResult = await execFileAsync('node', [
        cliPath,
        'retarget-scene',
        '--script',
        scriptPath,
        '--from',
        'old_route',
        '--to',
        'new_route',
        '--force',
        '--json',
      ]);
      const retarget = JSON.parse(retargetResult.stdout);
      expect(retarget.result).toMatchObject({
        fromSceneId: 'old_route',
        toSceneId: 'new_route',
        updatedReferenceCount: 3,
      });
      expect(retarget.changeSummary.changedPaths).toEqual([
        'scenes.start.next',
        'scenes.start.pages.0.options.0.target',
        'scenes.start.pages.1.trueTarget',
      ]);

      const clearResult = await execFileAsync('node', [
        cliPath,
        'clear-scene-references',
        '--script',
        scriptPath,
        '--scene',
        'new_route',
        '--force',
        '--json',
      ]);
      const clear = JSON.parse(clearResult.stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(clear.result).toMatchObject({
        sceneId: 'new_route',
        clearedReferenceCount: 3,
      });
      expect(script.scenes.start.next).toBeNull();
      expect(script.scenes.start.pages[0].options[0].target).toBeNull();
      expect(script.scenes.start.pages[1].trueTarget).toBeNull();
    });
  });

  it('reports branch flow and asset findings and repairs targets through M4 commands', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const assetsDir = path.join(dir, 'backgrounds');
      await mkdir(assetsDir, { recursive: true });
      await writeFile(path.join(assetsDir, 'unused.png'), 'unused', 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_flow_analysis',
        systems: {
          endings: { good: { title: 'Good End' } },
        },
        characters: {},
        scenes: {
          start: {
            pages: [{
              type: 'choice',
              background: 'backgrounds/missing.png',
              options: [
                { text: 'Good', target: 'final', effects: [{ type: 'unlock:ending', id: 'good' }] },
                { text: 'Lost', target: 'dead' },
                { text: 'Loop', target: 'loop' },
                { text: 'Broken', target: 'missing_route' },
              ],
            }],
          },
          final: { pages: [] },
          dead: { pages: [] },
          loop: { next: 'loop', pages: [] },
        },
      }), 'utf8');

      const graph = JSON.parse((await execFileAsync('node', [
        cliPath, 'graph-report', '--script', scriptPath, '--json',
      ])).stdout);
      expect(graph).toMatchObject({
        missingTargetCount: 1,
        deadEndSceneIds: ['dead'],
        cyclesWithoutExit: [{ sceneIds: ['loop'] }],
      });
      expect(graph.missingTargetEdges).toEqual([
        expect.objectContaining({
          toSceneId: 'missing_route',
          pathString: 'scenes.start.pages.0.options.3.target',
        }),
      ]);
      expect(graph.mermaid).toContain('flowchart TD');

      const deadEnds = JSON.parse((await execFileAsync('node', [
        cliPath, 'find-dead-ends', '--script', scriptPath, '--json',
      ])).stdout);
      expect(deadEnds.deadEndSceneIds).toEqual(['dead']);
      expect(deadEnds.missingTargetEdges).toEqual([
        expect.objectContaining({ toSceneId: 'missing_route' }),
      ]);
      const clearBroken = JSON.parse((await execFileAsync('node', [
        cliPath,
        'clear-scene-references',
        '--script',
        scriptPath,
        '--scene',
        'missing_route',
        '--dry-run',
        '--json',
      ])).stdout);
      expect(clearBroken.result).toMatchObject({
        sceneId: 'missing_route',
        clearedReferenceCount: 1,
      });

      const missing = JSON.parse((await execFileAsync('node', [
        cliPath, 'find-missing-assets', '--script', scriptPath, '--json',
      ])).stdout);
      const unused = JSON.parse((await execFileAsync('node', [
        cliPath, 'find-unused-assets', '--script', scriptPath, '--json',
      ])).stdout);
      expect(missing.missing).toEqual(expect.arrayContaining([
        expect.objectContaining({ assetPath: 'backgrounds/missing.png' }),
      ]));
      expect(unused.unused).toContain('backgrounds/unused.png');

      const planPath = path.join(dir, 'repair-plan.json');
      await writeFile(planPath, JSON.stringify({
        operations: [
          {
            command: 'repair-scene-target',
            params: { from: 'missing_route', to: 'final' },
          },
          {
            command: 'repair-scene-target',
            params: { from: 'dead', to: 'final' },
          },
        ],
      }), 'utf8');
      const planRepair = JSON.parse((await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--dry-run',
        '--json',
      ])).stdout);
      expect(planRepair.operations[0]).toMatchObject({
        command: 'repair-scene-target',
        status: 'applied',
        changedPaths: ['scenes.start.pages.0.options.3.target'],
      });
      expect(planRepair.operations[1]).toMatchObject({
        command: 'repair-scene-target',
        status: 'applied',
        changedPaths: ['scenes.start.pages.0.options.1.target'],
      });

      const brokenRepair = JSON.parse((await execFileAsync('node', [
        cliPath,
        'repair-scene-target',
        '--script',
        scriptPath,
        '--from',
        'missing_route',
        '--to',
        'final',
        '--force',
        '--json',
      ])).stdout);
      expect(brokenRepair.result).toMatchObject({
        fromSceneId: 'missing_route',
        toSceneId: 'final',
        updatedReferenceCount: 1,
      });

      const repair = JSON.parse((await execFileAsync('node', [
        cliPath,
        'repair-scene-target',
        '--script',
        scriptPath,
        '--from',
        'dead',
        '--to',
        'final',
        '--force',
        '--json',
      ])).stdout);
      expect(repair.result).toMatchObject({
        fromSceneId: 'dead',
        toSceneId: 'final',
        updatedReferenceCount: 1,
      });
      expect(repair.changeSummary.changedPaths).toEqual(['scenes.start.pages.0.options.1.target']);
    });
  });

  it('moves and removes pages through structure commands', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        scenes: {
          start: {
            name: 'Start',
            pages: [
              { type: 'normal', dialogues: [{ text: 'First' }] },
              { type: 'choice', prompt: 'Pick', options: [{ text: 'Stay' }] },
              { type: 'normal', dialogues: [{ text: 'Last' }] },
            ],
          },
        },
      }), 'utf8');

      const movedResult = await execFileAsync('node', [
        cliPath,
        'move-page',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--from',
        '2',
        '--to',
        '0',
        '--force',
        '--json',
      ]);

      const removedResult = await execFileAsync('node', [
        cliPath,
        'remove-page',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '1',
        '--force',
        '--json',
      ]);

      const moved = JSON.parse(movedResult.stdout);
      const removed = JSON.parse(removedResult.stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(moved.result).toEqual({ sceneId: 'start', fromIndex: 2, toIndex: 0 });
      expect(removed.result).toEqual({ sceneId: 'start', pageIndex: 1, removedPageType: 'normal' });
      expect(script.scenes.start.pages).toEqual([
        { type: 'normal', dialogues: [{ text: 'Last' }] },
        { type: 'choice', prompt: 'Pick', options: [{ text: 'Stay' }] },
      ]);
    });
  });

  it('updates condition pages for branch revision workflows', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        systems: {
          variables: {
            affection: { type: 'number', initial: 0, label: 'Affection' },
            courage: { type: 'number', initial: 0, label: 'Courage' },
          },
        },
        scenes: {
          start: {
            name: 'Start',
            pages: [
              {
                type: 'condition',
                conditionMode: 'all',
                conditions: [{ variableId: 'affection', operator: '>=', value: 1 }],
                trueTarget: 'good',
                falseTarget: 'bad',
              },
            ],
          },
          good: { name: 'Good', pages: [] },
          retry: { name: 'Retry', pages: [] },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'set-condition-page',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--condition-mode',
        'any',
        '--conditions',
        '[{"variableId":"affection","operator":">=","value":2},{"variableId":"courage","operator":">=","value":1}]',
        '--false-target',
        'retry',
        '--force',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.validation.ok).toBe(true);
      expect(script.scenes.start.pages[0]).toMatchObject({
        type: 'condition',
        conditionMode: 'any',
        trueTarget: 'good',
        falseTarget: 'retry',
        conditions: [
          { variableId: 'affection', operator: '>=', value: 2 },
          { variableId: 'courage', operator: '>=', value: 1 },
        ],
      });
    });
  });

  it('mutates advanced page staging fields from the CLI', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {
          sakura: {
            name: 'Sakura',
            expressions: { normal: 'characters/sakura_normal.svg' },
          },
        },
        scenes: {
          start: {
            name: 'Start',
            pages: [
              {
                type: 'normal',
                characters: [{ id: 'sakura', expression: 'normal', position: 'center' }],
                dialogues: [{ speaker: 'sakura', text: 'Look.' }],
              },
            ],
          },
        },
      }), 'utf8');

      await execFileAsync('node', [
        cliPath,
        'set-page-camera',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--effect',
        'shake',
        '--direction',
        'both',
        '--intensity',
        'high',
        '--duration-ms',
        '450',
        '--force',
        '--json',
      ]);

      await execFileAsync('node', [
        cliPath,
        'set-page-transition',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--type',
        'dissolve',
        '--duration',
        '500',
        '--force',
        '--json',
      ]);

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'set-character-animation',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--character',
        'sakura',
        '--animation',
        'breathe',
        '--force',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.validation.ok).toBe(true);
      expect(script.scenes.start.pages[0]).toMatchObject({
        camera: {
          effect: 'shake',
          direction: 'both',
          intensity: 'high',
          durationMs: 450,
          trigger: 'onEnter',
        },
        transition: {
          type: 'dissolve',
          duration: 500,
        },
        characters: [
          { id: 'sakura', animation: 'breathe' },
        ],
      });

      const catalog = JSON.parse((await execFileAsync('node', [
        cliPath,
        'list-transitions',
        '--target',
        'background',
        '--supported-only',
        '--json',
      ])).stdout);
      expect(catalog.transitions.map((entry) => entry.id)).toEqual([
        'fade',
        'slide-left',
        'slide-right',
        'none',
        'dissolve',
        'wipe',
        'scale',
        'blur',
        'wipe-left',
        'wipe-right',
        'wipe-up',
        'wipe-down',
        'zoom-in',
        'zoom-out',
        'flash',
        'iris-in',
        'iris-out',
        'crossfade-pan',
        'diagonal-wipe',
        'cross-wipe',
        'diamond',
        'circle-open',
        'circle-close',
        'curtain-open',
        'curtain-close',
        'blinds-h',
        'blinds-v',
        'clock-wipe',
        'radial-wipe',
        'fade-white',
        'fade-black',
        'glitch-lite',
        'pixelate-lite',
      ]);
      const fadeWhite = JSON.parse((await execFileAsync('node', [
        cliPath,
        'set-page-transition',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--type',
        'fade-white',
        '--duration',
        '700',
        '--force',
        '--json',
      ])).stdout);
      expect(fadeWhite.result).toMatchObject({
        transition: { type: 'fade-white', duration: 700 },
        changedPaths: ['scenes.start.pages.0.transition'],
      });

      const directCamera = JSON.parse((await execFileAsync('node', [
        cliPath,
        'set-camera-effect',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--effect',
        'flash',
        '--duration-ms',
        '50000',
        '--force',
        '--json',
      ])).stdout);
      expect(directCamera.result).toMatchObject({
        camera: { effect: 'flash', durationMs: 2000 },
        changedPaths: ['scenes.start.pages.0.camera'],
      });

      const aliasPlanPath = path.join(dir, 'cinematic-alias-plan.json');
      await writeFile(aliasPlanPath, JSON.stringify({
        operations: [
          {
            command: 'set-camera-effect',
            params: {
              scene: 'start',
              page: 0,
              effect: 'zoom',
              durationMs: 50000,
              intensity: 'medium',
            },
          },
          {
            command: 'set-character-transition',
            params: {
              scene: 'start',
              page: 0,
              character: 'sakura',
              transition: 'bounce',
            },
          },
          {
            command: 'set-page-transition',
            params: {
              scene: 'start',
              page: 0,
              type: 'blur',
              duration: 50000,
            },
          },
        ],
      }), 'utf8');

      const aliasResult = JSON.parse((await execFileAsync('node', [
        cliPath,
        'apply-plan',
        aliasPlanPath,
        '--script',
        scriptPath,
        '--force',
        '--json',
      ])).stdout);
      expect(aliasResult.operations).toEqual(expect.arrayContaining([
        expect.objectContaining({
          command: 'set-camera-effect',
          changedPaths: ['scenes.start.pages.0.camera'],
        }),
        expect.objectContaining({
          command: 'set-character-transition',
          changedPaths: ['scenes.start.pages.0.characters.0.animation'],
        }),
        expect.objectContaining({
          command: 'set-page-transition',
          changedPaths: ['scenes.start.pages.0.transition'],
        }),
      ]));

      const updatedScript = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(updatedScript.scenes.start.pages[0]).toMatchObject({
        camera: { effect: 'zoom', durationMs: 2000 },
        transition: { type: 'blur', duration: 5000 },
        characters: [{ id: 'sakura', animation: 'bounce' }],
      });
    });
  });

  it('bulk applies page transitions through direct CLI selectors and apply-plan predicates', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_bulk_transitions',
        characters: {},
        scenes: {
          start: {
            name: 'Start',
            pages: [
              { type: 'normal', background: 'backgrounds/gate.png', dialogues: [] },
              { type: 'normal', background: '', dialogues: [] },
              { type: 'choice', background: 'backgrounds/menu.png', options: [] },
              { type: 'normal', background: 'backgrounds/room.png', dialogues: [] },
            ],
          },
        },
      }), 'utf8');

      const directResult = JSON.parse((await execFileAsync('node', [
        cliPath,
        'set-page-transitions',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--from-page',
        '0',
        '--to-page',
        '2',
        '--page-type',
        'normal',
        '--has-background',
        '--type',
        'dissolve',
        '--duration',
        '650',
        '--force',
        '--json',
      ])).stdout);
      expect(directResult.result).toMatchObject({
        matchedPageIndexes: [0],
        changedPaths: ['scenes.start.pages.0.transition'],
        transition: { type: 'dissolve', duration: 650 },
      });

      const planPath = path.join(dir, 'bulk-transition-plan.json');
      await writeFile(planPath, JSON.stringify({
        operations: [{
          command: 'set-page-transitions',
          params: {
            scene: 'start',
            predicate: { pageType: 'normal', hasBackground: true },
            type: 'blur',
            duration: 9000,
          },
        }],
      }), 'utf8');

      const planResult = JSON.parse((await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--force',
        '--json',
      ])).stdout);
      expect(planResult.operations[0]).toMatchObject({
        command: 'set-page-transitions',
        changedPaths: [
          'scenes.start.pages.0.transition',
          'scenes.start.pages.3.transition',
        ],
      });
      expect(planResult.operations[0].result).toMatchObject({
        matchedPageIndexes: [0, 3],
        transition: { type: 'blur', duration: 5000 },
      });

      const updatedScript = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(updatedScript.scenes.start.pages.map(page => page.transition ?? null)).toEqual([
        { type: 'blur', duration: 5000 },
        null,
        null,
        { type: 'blur', duration: 5000 },
      ]);
    });
  });

  it('applies page particle commands through direct CLI, apply-plan, and author-check focus', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_particles',
        characters: {},
        scenes: {
          start: {
            name: 'Start',
            pages: [
              { type: 'normal', background: 'backgrounds/gate.png', dialogues: [] },
              { type: 'normal', background: 'backgrounds/room.png', dialogues: [] },
            ],
          },
        },
      }), 'utf8');

      const catalog = JSON.parse((await execFileAsync('node', [
        cliPath,
        'list-particles',
        '--json',
      ])).stdout);
      expect(catalog.presets).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'sakura', label: '樱花' }),
        expect.objectContaining({ id: 'rain', label: '雨' }),
      ]));
      expect(catalog.fields).toMatchObject({
        density: { minimum: 0, maximum: 1 },
        speed: { minimum: 0, maximum: 2 },
      });

      const directResult = JSON.parse((await execFileAsync('node', [
        cliPath,
        'set-page-particles',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--preset',
        'sakura',
        '--density',
        '0.45',
        '--speed',
        '0.6',
        '--wind',
        '0.2',
        '--force',
        '--json',
      ])).stdout);
      expect(directResult.result).toMatchObject({
        pathString: 'scenes.start.pages.0.particles',
        particles: {
          preset: 'sakura',
          density: 0.45,
          speed: 0.6,
          wind: 0.2,
        },
        changedPaths: ['scenes.start.pages.0.particles'],
      });

      const planPath = path.join(dir, 'particle-plan.json');
      const resultPath = path.join(dir, 'particle-result.json');
      await writeFile(planPath, JSON.stringify({
        operations: [
          {
            id: 'snow-page-1',
            command: 'set-page-particles',
            params: {
              scene: 'start',
              page: 1,
              preset: 'snow',
              density: 0.8,
              speed: 0.7,
            },
          },
          {
            id: 'stop-page-0',
            command: 'clear-page-particles',
            params: { scene: 'start', page: 0 },
          },
          {
            id: 'inherit-page-1',
            command: 'inherit-page-particles',
            params: { scene: 'start', page: 1 },
          },
        ],
      }), 'utf8');

      const planResult = JSON.parse((await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--force',
        '--result-out',
        resultPath,
        '--json',
      ])).stdout);
      expect(planResult.operations).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'snow-page-1',
          command: 'set-page-particles',
          changedPaths: ['scenes.start.pages.1.particles'],
        }),
        expect.objectContaining({
          id: 'stop-page-0',
          command: 'clear-page-particles',
          changedPaths: ['scenes.start.pages.0.particles'],
        }),
        expect.objectContaining({
          id: 'inherit-page-1',
          command: 'inherit-page-particles',
          changedPaths: ['scenes.start.pages.1.particles'],
        }),
      ]));
      expect(planResult.changeSummary.changedPaths).toEqual([
        'scenes.start.pages.1.particles',
        'scenes.start.pages.0.particles',
      ]);

      const updatedScript = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(updatedScript.scenes.start.pages[0].particles).toBeNull();
      expect(updatedScript.scenes.start.pages[1]).not.toHaveProperty('particles');

      const authorCheck = JSON.parse((await execFileAsync('node', [
        cliPath,
        'author-check',
        '--script',
        scriptPath,
        '--transaction',
        resultPath,
        '--skip-asset-check',
        '--write-preview-plan',
        '--json',
      ])).stdout);
      expect(authorCheck.focus.pageTargets).toEqual(expect.arrayContaining([
        expect.objectContaining({
          sceneId: 'start',
          pageIndex: 1,
          reason: 'changed-particles',
          pathString: 'scenes.start.pages.1.particles',
        }),
        expect.objectContaining({
          sceneId: 'start',
          pageIndex: 0,
          reason: 'changed-particles',
          pathString: 'scenes.start.pages.0.particles',
        }),
      ]));
      expect(authorCheck.focus.previewTargets).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'scene',
          sceneId: 'start',
          pageIndex: 1,
          reason: 'changed-particles',
        }),
      ]));
      expect(authorCheck.particlePreviewIssues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          category: 'particle-preview',
          pathString: 'scenes.start.pages.1.particles',
        }),
      ]));
    });
  });

  it('can validate known assets when requested', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(path.join(dir, 'sakura.svg'), '<svg />', 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {
          sakura: {
            name: 'Sakura',
            expressions: { normal: 'sakura.svg' },
          },
        },
        scenes: {
          start: {
            name: 'Start',
            pages: [
              {
                type: 'normal',
                background: 'missing-bg.svg',
                characters: [{ id: 'sakura', expression: 'normal' }],
                dialogues: [{ speaker: 'sakura', text: 'Hi.' }],
              },
            ],
          },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'validate',
        '--script',
        scriptPath,
        '--check-assets',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      expect(result.ok).toBe(true);
      expect(result.warnings).toEqual([
        expect.objectContaining({
          code: 'missing-asset-reference',
          assetKind: 'background',
          assetPath: 'missing-bg.svg',
        }),
      ]);
    });
  });

  it('reports layout lint warnings from the CLI', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        scenes: {
          start: {
            pages: [
              { type: 'normal', dialogues: [] },
            ],
          },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'lint-layout',
        '--script',
        scriptPath,
        '--json',
      ]);

      const result = JSON.parse(stdout);
      expect(result.ok).toBe(false);
      expect(result.warnings).toEqual([
        expect.objectContaining({
          code: 'layout-blank-page',
          pathString: 'scenes.start.pages.0',
          location: { sceneId: 'start', pageIndex: 0 },
          suggestedAction: expect.objectContaining({
            commands: expect.arrayContaining([
              expect.objectContaining({ command: 'set-page-background' }),
            ]),
          }),
        }),
      ]);
      expect(result.suggestions).toEqual([
        expect.objectContaining({
          code: 'layout-blank-page',
          location: { sceneId: 'start', pageIndex: 0 },
        }),
      ]);
    });
  });

  it('runs an aggregate author check with preview dry-run planning', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const previewPath = path.join(dir, 'author-preview.png');
      await writeFile(path.join(dir, 'sakura.svg'), '<svg />', 'utf8');
      await writeFile(path.join(dir, 'school.svg'), '<svg />', 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        meta: { resolution: { width: 800, height: 450 } },
        characters: {
          sakura: {
            name: 'Sakura',
            expressions: { normal: 'sakura.svg' },
          },
        },
        scenes: {
          start: {
            pages: [
              {
                type: 'normal',
                background: 'school.svg',
                characters: [{ id: 'sakura', expression: 'normal', position: 'center' }],
                dialogues: [{ speaker: 'sakura', text: 'Hi.' }],
              },
            ],
          },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'author-check',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--preview-out',
        previewPath,
        '--write-preview-plan',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const plan = JSON.parse(await readFile(`${previewPath}.json`, 'utf8'));

      expect(result.ok).toBe(true);
      expect(result.gates).toEqual({
        validation: true,
        layout: true,
        readiness: true,
        preview: true,
      });
      expect(result.summary).toMatchObject({
        validationErrors: 0,
        layoutWarnings: 0,
        readinessBlockers: 0,
        previewPlanned: true,
      });
      expect(result.preview).toMatchObject({
        dryRun: true,
        sceneId: 'start',
        pageIndex: 0,
        outPath: previewPath,
        planPath: `${previewPath}.json`,
      });
      expect(plan).toMatchObject({
        dryRun: true,
        sceneId: 'start',
        pageIndex: 0,
      });
    });
  });

  it('focuses author-check on transaction changed scene pages', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const transactionPath = path.join(dir, 'apply-result.json');
      const previewPath = path.join(dir, 'transaction-author-preview.png');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_transaction_author_check',
        meta: { resolution: { width: 800, height: 450 } },
        characters: {
          sakura: { name: 'Sakura' },
        },
        scenes: {
          start: {
            pages: [
              {
                type: 'normal',
                background: 'backgrounds/school.svg',
                characters: [{ id: 'sakura', position: 'center' }],
                dialogues: [{ speaker: 'sakura', text: 'This changed page is ready.' }],
              },
              {
                type: 'normal',
                background: 'backgrounds/hall.svg',
                characters: [{ id: 'sakura', position: 'left' }],
                dialogues: [{ speaker: 'sakura', text: 'This second changed page is ready too.' }],
              },
            ],
          },
          untouched_blank: {
            pages: [
              { type: 'normal', dialogues: [] },
            ],
          },
        },
      }), 'utf8');
      await writeFile(transactionPath, JSON.stringify({
        dryRun: false,
        transaction: {
          command: 'apply-plan',
          status: 'written',
          wrote: true,
        },
        changeSummary: {
          command: 'apply-plan',
          operationCount: 1,
          changedPaths: ['scenes.start.pages.0', 'scenes.start.pages.1'],
          validation: { ok: true, errorCount: 0, warningCount: 0 },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'author-check',
        '--script',
        scriptPath,
        '--transaction',
        transactionPath,
        '--preview-out',
        previewPath,
        '--write-preview-plan',
        '--skip-asset-check',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const previewPlan = JSON.parse(await readFile(`${previewPath}.json`, 'utf8'));
      expect(result.ok).toBe(true);
      expect(result.focus).toMatchObject({
        mode: 'transaction',
        transactionPath,
        changedPaths: ['scenes.start.pages.0', 'scenes.start.pages.1'],
        checkedSceneIds: ['start'],
        pageTargets: [{ sceneId: 'start', pageIndex: 0 }, { sceneId: 'start', pageIndex: 1 }],
        branchGraphTargets: [{
          type: 'branch-graph',
          kind: 'branch-graph',
          pathString: 'analysis.sceneGraph',
        }],
        previewTargets: [
          { type: 'scene', sceneId: 'start', pageIndex: 0 },
          { type: 'scene', sceneId: 'start', pageIndex: 1 },
          { type: 'branch-graph', pathString: 'analysis.sceneGraph' },
        ],
        previewTarget: { sceneId: 'start', pageIndex: 0 },
      });
      expect(result.transactionSummary).toMatchObject({
        command: 'apply-plan',
        status: 'written',
        wrote: true,
        operationCount: 1,
        changedPathCount: 2,
      });
      expect(result.summary).toMatchObject({
        layoutWarnings: 0,
        readinessBlockers: 0,
        branchGraphPreviewReviewItems: 1,
        previewPlanned: true,
      });
      expect(result.layout.aggregate).toMatchObject({
        ok: false,
        warningCount: 1,
      });
      expect(result.readiness.aggregate).toMatchObject({
        ready: false,
        blockerCount: 2,
      });
      expect(result.issues).not.toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'layout',
          pathString: 'scenes.untouched_blank.pages.0',
        }),
      ]));
      expect(previewPlan).toMatchObject({
        dryRun: true,
        sceneId: 'start',
        pageIndex: 0,
        targetCount: 2,
        targets: [
          expect.objectContaining({
            sceneId: 'start',
            pageIndex: 0,
            outPath: previewPath,
          }),
          expect.objectContaining({
            sceneId: 'start',
            pageIndex: 1,
            outPath: expect.stringContaining('transaction-author-preview-start-p1.png'),
          }),
        ],
      });
    });
  });

  it('plans screen preview targets for transaction changed UI screens', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const transactionPath = path.join(dir, 'ui-transaction.json');
      const previewPath = path.join(dir, 'ui-author-preview.png');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_screen_author_check',
        meta: { resolution: { width: 800, height: 450 } },
        characters: {},
        scenes: {
          start: {
            pages: [
              {
                type: 'normal',
                background: 'backgrounds/school.svg',
                characters: [],
                dialogues: [{ speaker: null, text: 'Ready for screen preview.' }],
              },
            ],
          },
        },
        ui: {
          titleScreen: {
            background: 'ui/title/background.png',
            elements: [{ id: 'title', type: 'text', content: 'Title', x: 400, y: 120 }],
          },
          gameMenu: {
            panel: { width: 320 },
          },
        },
      }), 'utf8');
      await writeFile(transactionPath, JSON.stringify({
        dryRun: false,
        transaction: {
          command: 'apply-plan',
          status: 'written',
          wrote: true,
        },
        changeSummary: {
          command: 'apply-plan',
          operationCount: 2,
          changedPaths: ['ui.titleScreen', 'ui.gameMenu'],
          validation: { ok: true, errorCount: 0, warningCount: 0 },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'author-check',
        '--script',
        scriptPath,
        '--transaction',
        transactionPath,
        '--preview-out',
        previewPath,
        '--write-preview-plan',
        '--skip-asset-check',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const previewPlan = JSON.parse(await readFile(`${previewPath}.json`, 'utf8'));

      expect(result.focus).toMatchObject({
        mode: 'transaction',
        changedPaths: ['ui.titleScreen', 'ui.gameMenu'],
        screenTargets: [
          { type: 'screen', screenId: 'titleScreen' },
          { type: 'screen', screenId: 'gameMenu' },
        ],
        previewTarget: { type: 'screen', screenId: 'titleScreen' },
      });
      expect(result.preview).toMatchObject({
        targetCount: 2,
        type: 'screen',
        screenId: 'titleScreen',
      });
      expect(result.summary.screenPreviewReviewItems).toBe(2);
      expect(result.screenPreview.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'preview',
          category: 'screen-ui-preview',
          code: 'screen-ui-preview-required',
          pathString: 'ui.titleScreen',
          screenId: 'titleScreen',
        }),
        expect.objectContaining({
          source: 'preview',
          category: 'screen-ui-preview',
          code: 'screen-ui-preview-required',
          pathString: 'ui.gameMenu',
          screenId: 'gameMenu',
        }),
      ]));
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'preview',
          category: 'screen-ui-preview',
          code: 'screen-ui-preview-required',
          pathString: 'ui.titleScreen',
        }),
      ]));
      expect(result.suggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'preview',
          code: 'screen-ui-preview-required',
          pathString: 'ui.titleScreen',
        }),
      ]));
      expect(previewPlan).toMatchObject({
        dryRun: true,
        targetCount: 2,
        targets: [
          expect.objectContaining({ type: 'screen', screenId: 'titleScreen', outPath: previewPath }),
          expect.objectContaining({
            type: 'screen',
            screenId: 'gameMenu',
            outPath: expect.stringContaining('ui-author-preview-gameMenu.png'),
          }),
        ],
      });
    });
  });

  it('surfaces ending-list preview targets for transaction changed ending paths', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const transactionPath = path.join(dir, 'ending-transaction.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_ending_author_check',
        characters: {},
        systems: {
          endings: {
            good_end: { title: 'Good End' },
          },
        },
        scenes: {
          start: {
            pages: [
              {
                type: 'choice',
                background: 'backgrounds/school.svg',
                prompt: 'End?',
                options: [
                  {
                    text: 'Good',
                    effects: [{ type: 'unlock:ending', id: 'good_end' }],
                  },
                ],
              },
            ],
          },
        },
      }), 'utf8');
      await writeFile(transactionPath, JSON.stringify({
        dryRun: false,
        transaction: {
          command: 'apply-plan',
          status: 'written',
          wrote: true,
        },
        changeSummary: {
          command: 'apply-plan',
          operationCount: 1,
          changedPaths: ['systems.endings.good_end'],
          validation: { ok: true, errorCount: 0, warningCount: 0 },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'author-check',
        '--script',
        scriptPath,
        '--transaction',
        transactionPath,
        '--skip-preview',
        '--skip-asset-check',
        '--json',
      ]);
      const result = JSON.parse(stdout);

      expect(result.focus).toMatchObject({
        mode: 'transaction',
        changedPaths: ['systems.endings.good_end'],
        endingTargets: [
          {
            type: 'ending-list',
            kind: 'ending-list',
            pathString: 'systems.endings',
            reason: 'changed-ending-registry',
          },
        ],
        previewTargets: [
          expect.objectContaining({ type: 'ending-list', pathString: 'systems.endings' }),
        ],
      });
      expect(result.summary.endingPreviewReviewItems).toBe(1);
      expect(result.endingPreview.issues).toEqual([
        expect.objectContaining({
          category: 'ending-list-preview',
          code: 'ending-list-preview-required',
          pathString: 'systems.endings',
        }),
      ]);
    });
  });

  it('surfaces gallery preview targets for transaction changed CG paths', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const transactionPath = path.join(dir, 'cg-transaction.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_cg_author_check',
        systems: {
          gallery: {
            cg: {
              confession: {
                title: 'Confession',
                images: ['backgrounds/cg/confession.png'],
                thumbnail: 'backgrounds/cg/confession.png',
              },
            },
          },
        },
        scenes: {
          start: {
            pages: [{
              type: 'choice',
              options: [{ effects: [{ type: 'unlock:cg', id: 'confession' }] }],
            }],
          },
        },
      }), 'utf8');
      await writeFile(transactionPath, JSON.stringify({
        transaction: { command: 'apply-plan', status: 'written', wrote: true },
        changeSummary: { changedPaths: ['systems.gallery.cg.confession'] },
      }), 'utf8');

      const result = JSON.parse((await execFileAsync('node', [
        cliPath, 'author-check', '--script', scriptPath, '--transaction', transactionPath,
        '--skip-preview', '--skip-asset-check', '--json',
      ])).stdout);
      expect(result.focus.galleryTargets).toEqual([
        expect.objectContaining({ type: 'gallery', pathString: 'systems.gallery.cg' }),
      ]);
      expect(result.focus.previewTargets).toEqual([
        expect.objectContaining({ type: 'gallery', pathString: 'systems.gallery.cg' }),
      ]);
      expect(result.summary.galleryPreviewReviewItems).toBe(1);
      expect(result.galleryPreview.issues).toEqual([
        expect.objectContaining({ category: 'gallery-preview', code: 'gallery-preview-required' }),
      ]);
    });
  });

  it('writes an editor handoff report with recent checkpoints', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const outPath = path.join(dir, 'agent-handoff.json');
      const transactionPath = path.join(dir, 'transaction.json');
      const checkpointDir = path.join(dir, '.checkpoints');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_handoff',
        characters: {},
        scenes: {
          start: {
            next: 'unused_checkpoint_scene',
            pages: [
              { type: 'normal', dialogues: [] },
            ],
          },
        },
      }), 'utf8');

      const checkpointResult = await execFileAsync('node', [
        cliPath,
        'add-scene',
        '--script',
        scriptPath,
        '--id',
        'unused_checkpoint_scene',
        '--force',
        '--checkpoint',
        '--json',
      ]);
      const checkpoint = JSON.parse(checkpointResult.stdout).transaction.checkpointPath;
      await writeFile(transactionPath, JSON.stringify({
        dryRun: false,
        transaction: {
          command: 'apply-plan',
          status: 'written',
          wrote: true,
          checkpointPath: checkpoint,
        },
        changeSummary: {
          operationCount: 3,
          changedPaths: ['scenes.start', 'scenes.unused_checkpoint_scene'],
          validation: { ok: true, errorCount: 0, warningCount: 0 },
        },
      }), 'utf8');

      await expect(execFileAsync('node', [
        cliPath,
        'handoff-report',
        '--script',
        scriptPath,
        '--transaction',
        transactionPath,
        '--checkpoint-dir',
        checkpointDir,
        '--write-editor-handoff',
        '--skip-asset-check',
        '--note',
        'Review the agent-authored changes.',
        '--json',
      ])).rejects.toMatchObject({
        code: 1,
        stdout: expect.any(String),
      });

      const handoff = JSON.parse(await readFile(outPath, 'utf8'));
      expect(handoff).toMatchObject({
        kind: 'agent-authoring-handoff',
        projectId: 'gm_cli_handoff',
        gates: {
          validation: true,
          layout: false,
          readiness: false,
        },
        checkpoints: [
          expect.objectContaining({ path: checkpoint }),
        ],
        latestCheckpointPath: checkpoint,
        transactionSummary: {
          command: 'apply-plan',
          operationCount: 3,
          changedPathCount: 2,
        },
        notes: ['Review the agent-authored changes.'],
      });
      expect(handoff.reviewItems).toEqual(expect.arrayContaining([
        expect.objectContaining({ source: 'layout', code: 'layout-blank-page' }),
        expect.objectContaining({
          source: 'scene-references',
          code: 'scene-incoming-references',
          sceneId: 'unused_checkpoint_scene',
          referenceCount: 1,
        }),
      ]));
    });
  });

  it('preserves reference screenshot fidelity notes from apply-plan into handoff review', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'screen-plan.json');
      const resultPath = path.join(dir, 'apply-result.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_reference_fidelity',
        characters: {},
        scenes: {
          start: {
            pages: [
              {
                type: 'normal',
                background: 'backgrounds/room.png',
                characters: [],
                dialogues: [{ speaker: null, text: 'Ready.' }],
              },
            ],
          },
        },
        ui: {
          gameMenu: {},
        },
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        version: 1,
        handoff: {
          referenceScreenshotNotes: [
            {
              screenId: 'gameMenu',
              reference: 'references/game-menu.png',
              summary: 'Matched the reference menu structure using editable layout config.',
              matched: ['left-aligned menu stack'],
              gaps: ['background blur needs visual confirmation'],
            },
          ],
        },
        operations: [
          {
            command: 'set-screen-layout',
            params: {
              screenId: 'gameMenu',
              config: {
                panel: { width: 360, opacity: 0.82 },
              },
            },
          },
        ],
      }), 'utf8');

      const apply = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--force',
        '--result-out',
        resultPath,
        '--json',
      ]);
      const applyResult = JSON.parse(apply.stdout);
      expect(applyResult.handoff.referenceScreenshotNotes).toEqual([
        expect.objectContaining({
          screenId: 'gameMenu',
          reference: 'references/game-menu.png',
        }),
      ]);

      const check = await execFileAsync('node', [
        cliPath,
        'author-check',
        '--script',
        scriptPath,
        '--transaction',
        resultPath,
        '--skip-asset-check',
        '--json',
      ]);
      const checkResult = JSON.parse(check.stdout);
      expect(checkResult.summary.referenceScreenshotFidelityNotes).toBe(1);
      expect(checkResult.referenceScreenshotFidelity.issues).toEqual([
        expect.objectContaining({
          category: 'reference-screenshot-fidelity',
          code: 'reference-screenshot-fidelity-note',
          pathString: 'ui.gameMenu',
          screenId: 'gameMenu',
          reference: 'references/game-menu.png',
          matched: ['left-aligned menu stack'],
          gaps: ['background blur needs visual confirmation'],
        }),
      ]);
      expect(checkResult.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'preview',
          category: 'reference-screenshot-fidelity',
          code: 'reference-screenshot-fidelity-note',
        }),
      ]));
      expect(checkResult.suggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'preview',
          code: 'reference-screenshot-fidelity-note',
          pathString: 'ui.gameMenu',
        }),
      ]));

      const handoff = await execFileAsync('node', [
        cliPath,
        'handoff-report',
        '--script',
        scriptPath,
        '--transaction',
        resultPath,
        '--skip-asset-check',
        '--json',
      ]);
      const report = JSON.parse(handoff.stdout);
      expect(report.reviewItems).toEqual(expect.arrayContaining([
        expect.objectContaining({
          category: 'reference-screenshot-fidelity',
          code: 'reference-screenshot-fidelity-note',
          pathString: 'ui.gameMenu',
          screenId: 'gameMenu',
          reference: 'references/game-menu.png',
          gaps: ['background blur needs visual confirmation'],
        }),
      ]));
    });
  });

  it('adds selected scene reference diagnostics to author check review output', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_references',
        characters: {},
        scenes: {
          start: {
            next: 'ending',
            pages: [
              { type: 'normal', background: 'bg/room.png', dialogues: [] },
            ],
          },
          ending: {
            pages: [
              { type: 'normal', background: 'bg/end.png', dialogues: [] },
            ],
          },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'author-check',
        '--script',
        scriptPath,
        '--scene',
        'ending',
        '--skip-preview',
        '--skip-asset-check',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      expect(result.ok).toBe(true);
      expect(result.summary.sceneReferenceDiagnostics).toBe(1);
      expect(result.sceneReferences.diagnostics).toEqual([
        expect.objectContaining({
          source: 'scene-references',
          code: 'scene-incoming-references',
          sceneId: 'ending',
          referenceCount: 1,
        }),
      ]);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'scene-references',
          severity: 'info',
          pathString: 'scenes.ending',
        }),
      ]));
      expect(result.suggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'scene-references',
          code: 'scene-incoming-references',
          suggestedAction: expect.objectContaining({
            commands: expect.arrayContaining([
              expect.objectContaining({ command: 'scene-references' }),
              expect.objectContaining({ command: 'retarget-scene' }),
            ]),
          }),
        }),
      ]));
    });
  });

  it('returns non-zero author check output with aggregated suggestions', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        scenes: {
          start: {
            pages: [
              { type: 'normal', dialogues: [] },
            ],
          },
        },
      }), 'utf8');

      await expect(execFileAsync('node', [
        cliPath,
        'author-check',
        '--script',
        scriptPath,
        '--skip-preview',
        '--json',
      ])).rejects.toMatchObject({
        code: 1,
        stdout: expect.any(String),
      });

      try {
        await execFileAsync('node', [
          cliPath,
          'author-check',
          '--script',
          scriptPath,
          '--skip-preview',
          '--json',
        ]);
      } catch (error) {
        const result = JSON.parse(error.stdout);
        expect(result.ok).toBe(false);
        expect(result.gates).toMatchObject({
          validation: true,
          layout: false,
          readiness: false,
          preview: true,
        });
        expect(result.issues).toEqual(expect.arrayContaining([
          expect.objectContaining({ source: 'layout', code: 'layout-blank-page' }),
          expect.objectContaining({ source: 'readiness', code: 'layout-blank-page' }),
        ]));
        expect(result.suggestions).toEqual(expect.arrayContaining([
          expect.objectContaining({
            source: 'layout',
            code: 'layout-blank-page',
            suggestedAction: expect.objectContaining({
              commands: expect.arrayContaining([
                expect.objectContaining({ command: 'set-page-background' }),
              ]),
            }),
          }),
        ]));
      }
    });
  });

  it('prepares a preview render plan without requiring a browser dependency', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const outPath = path.join(dir, 'preview.png');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        meta: { resolution: { width: 800, height: 450 } },
        characters: {},
        scenes: {
          start: {
            pages: [
              {
                type: 'normal',
                background: '',
                characters: [],
                dialogues: [{ speaker: null, text: 'Hi.' }],
              },
            ],
          },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'render-preview',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--out',
        outPath,
        '--dry-run',
        '--write-plan',
        '--json',
      ]);

      const result = JSON.parse(stdout);
      const plan = JSON.parse(await readFile(`${outPath}.json`, 'utf8'));

      expect(result).toMatchObject({
        dryRun: true,
        sceneId: 'start',
        pageIndex: 0,
        outPath,
        width: 800,
        height: 450,
        renderer: 'playwright',
        planPath: `${outPath}.json`,
      });
      expect(plan).toMatchObject({
        dryRun: true,
        sceneId: 'start',
        pageIndex: 0,
        outPath,
      });
    });
  });

  it('reports export readiness with asset checks from the CLI', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(path.join(dir, 'sakura.svg'), '<svg />', 'utf8');
      await writeFile(path.join(dir, 'school.svg'), '<svg />', 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {
          sakura: {
            name: 'Sakura',
            expressions: { normal: 'sakura.svg' },
          },
        },
        scenes: {
          start: {
            pages: [
              {
                type: 'normal',
                background: 'school.svg',
                characters: [{ id: 'sakura', expression: 'normal', position: 'center' }],
                dialogues: [{ speaker: 'sakura', text: 'Hi.' }],
              },
            ],
          },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'export-readiness',
        '--script',
        scriptPath,
        '--json',
      ]);

      const result = JSON.parse(stdout);
      expect(result.ready).toBe(true);
      expect(result.blockers).toEqual([]);
      expect(result.assets.checked).toBe(true);
    });
  });

  it('returns non-zero export readiness when blockers exist', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_test',
        characters: {},
        scenes: {
          start: {
            pages: [
              { type: 'normal', dialogues: [] },
            ],
          },
        },
      }), 'utf8');

      await expect(execFileAsync('node', [
        cliPath,
        'export-readiness',
        '--script',
        scriptPath,
        '--json',
      ])).rejects.toMatchObject({
        code: 1,
      });
    });
  });
});
