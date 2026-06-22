import { mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { analyzePreviewScreenshot } from '../tools/vn-author/preview-renderer.js';
import {
  getRecommendedProjectRootCandidates,
  resolveProjectPathForCreate,
  sanitizeProjectName,
} from '../src/authoring/projectScaffold.js';

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

async function createExportFixture(dir, { missingAsset = false } = {}) {
  const projectDir = path.join(dir, 'project');
  const appRoot = path.join(dir, 'app');
  await mkdir(path.join(projectDir, 'assets', 'backgrounds'), { recursive: true });
  await mkdir(path.join(projectDir, 'assets', 'characters'), { recursive: true });
  await mkdir(path.join(projectDir, 'assets', 'audio'), { recursive: true });
  await mkdir(path.join(projectDir, 'assets', 'ui', 'endings'), { recursive: true });
  await mkdir(path.join(appRoot, 'dist-web'), { recursive: true });
  await mkdir(path.join(appRoot, 'electron', 'game'), { recursive: true });
  await mkdir(path.join(appRoot, 'public'), { recursive: true });

  await writeFile(path.join(projectDir, 'script.json'), JSON.stringify({
    projectId: 'gm_cli_export',
    title: 'CLI Export Fixture',
    meta: { resolution: { width: 960, height: 540 } },
    characters: {
      hero: {
        name: 'Hero',
        expressions: { normal: 'characters/hero_normal.png' },
      },
    },
    scenes: {
      start: {
        pages: [{
          type: 'normal',
          background: 'backgrounds/city.png',
          bgm: { file: 'audio/theme.ogg' },
          dialogues: [{ speaker: 'hero', text: 'Ready.' }],
          effects: [{ type: 'unlock:ending', id: 'good' }],
        }],
      },
    },
    systems: {
      endings: {
        good: { title: 'Good End', thumbnail: 'ui/endings/good.png' },
      },
    },
  }), 'utf8');

  if (!missingAsset) {
    await writeFile(path.join(projectDir, 'assets', 'backgrounds', 'city.png'), 'BG', 'utf8');
  }
  await writeFile(path.join(projectDir, 'assets', 'characters', 'hero_normal.png'), 'CHAR', 'utf8');
  await writeFile(path.join(projectDir, 'assets', 'audio', 'theme.ogg'), 'BGM', 'utf8');
  await writeFile(path.join(projectDir, 'assets', 'ui', 'endings', 'good.png'), 'END', 'utf8');
  await writeFile(path.join(appRoot, 'dist-web', 'engine.js'), '// engine', 'utf8');
  await writeFile(path.join(appRoot, 'dist-web', 'engine.css'), '/* engine */', 'utf8');
  await writeFile(
    path.join(appRoot, 'electron', 'game', 'main.js'),
    "import { atomicWrite } from '../atomicWrite.js';\nimport { normalizeJpegThumbnailBytes } from '../thumbnailSecurity.js';\nconst GAME_TITLE = 'My Game';\nconst GAME_WIDTH = 1280;\nconst GAME_HEIGHT = 720;\n",
    'utf8',
  );
  await writeFile(
    path.join(appRoot, 'electron', 'atomicWrite.js'),
    'export async function atomicWrite() {}\n',
    'utf8',
  );
  await writeFile(
    path.join(appRoot, 'electron', 'thumbnailSecurity.js'),
    'export function normalizeJpegThumbnailBytes(thumbnail) { return thumbnail ?? null; }\n',
    'utf8',
  );
  await writeFile(path.join(appRoot, 'electron', 'game', 'preload.js'), '// preload', 'utf8');
  await writeFile(
    path.join(appRoot, 'public', 'default-game-icon.png'),
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==', 'base64'),
  );

  return { projectDir, appRoot };
}

describe('vn-author CLI', () => {
  it('keeps the command registry and dispatcher complete without falling back to an if-chain', async () => {
    const source = await readFile(cliPath, 'utf8');
    const registrySource = source.slice(
      source.indexOf('const CLI_COMMAND_HANDLERS'),
      source.indexOf('async function dispatchCliCommand'),
    );
    const registeredCommands = [...registrySource.matchAll(/^  \['([^']+)'/gm)]
      .map((match) => match[1]);

    expect(registeredCommands).toEqual([
      'projects', 'create-project', 'open-project', 'inspect', 'list-ui-screens',
      'inspect-ui-screen', 'list-ui-nodes', 'inspect-ui-schema', 'validate', 'list-assets',
      'list-transitions', 'list-particles', 'list-effect-packs', 'list-ui-style-presets',
      'graph-report', 'find-dead-ends', 'find-missing-assets', 'find-unused-assets',
      'author-check', 'import-draft', 'draft-plan', 'dsl-plan', 'dsl-check', 'dsl-diff',
      'dsl-build', 'dsl-format', 'dsl-skeleton', 'apply-plan', 'restore-checkpoint',
      'export-report', 'export-readiness', 'export-web', 'export-desktop', 'handoff-report',
      'review-handoff', 'lint-layout', 'render-preview', 'add-scene', 'set-scene-next',
      'scene-references', 'retarget-scene', 'repair-scene-target', 'clear-scene-references',
      'rename-scene', 'delete-scene', 'add-character', 'add-variable', 'update-variable',
      'rename-variable', 'delete-variable', 'add-affection-variable', 'list-endings',
      'add-ending', 'update-ending', 'set-ending-video', 'remove-ending', 'add-ending-unlock',
      'list-cg', 'add-cg', 'update-cg', 'remove-cg', 'add-cg-unlock', 'list-videos',
      'add-video', 'update-video', 'remove-video', 'add-page', 'remove-page', 'move-page',
      'add-dialogue', 'set-dialogue', 'remove-dialogue', 'move-dialogue', 'add-choice-option',
      'set-choice-option', 'set-choice-page', 'remove-choice-option', 'move-choice-option',
      'set-condition-page', 'set-page-background', 'set-page-media', 'set-page-characters',
      'set-page-audio', 'set-page-camera', 'set-camera-effect', 'set-page-transition',
      'set-page-transitions', 'register-effect-pack', 'set-page-effect-pack',
      'clear-page-effect-packs', 'set-page-particles', 'clear-page-particles',
      'inherit-page-particles', 'set-character-animation', 'set-character-transition',
      'set-opening-video', 'set-title-screen', 'add-title-element', 'update-title-element',
      'remove-title-element', 'set-screen-layout', 'set-dialogue-box', 'set-theme',
      'set-widget-styles', 'set-ui-motion', 'apply-ui-style-preset', 'add-choice-effect',
      'set-choice-effect', 'remove-choice-effect',
    ]);
    const mainSource = source.slice(source.indexOf('async function main()'));
    expect(mainSource).not.toContain("if (command === '");

    const noCommand = await execFileAsync(process.execPath, [cliPath]);
    expect(noCommand.stdout).toContain('vn-author commands:');

    await expect(execFileAsync(process.execPath, [cliPath, 'not-a-command']))
      .rejects.toMatchObject({ code: 1, stdout: expect.stringContaining('vn-author commands:') });
  });

  it('keeps JSON and text output parity across mutation, catalog, and DSL command families', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const dslPath = path.join(dir, 'format.gmdsl');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_output_parity',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(dslPath, 'title   "Output Parity"\nscene start "Start":\n    say "Hello."\n', 'utf8');

      const mutationArgs = [cliPath, 'add-scene', '--script', scriptPath, '--id', 'start', '--dry-run'];
      const mutationJson = await execFileAsync(process.execPath, [...mutationArgs, '--json']);
      const mutationText = await execFileAsync(process.execPath, mutationArgs);
      expect(JSON.parse(mutationJson.stdout)).toMatchObject({
        dryRun: true,
        result: { sceneId: 'start' },
      });
      expect(mutationJson.stderr).toBe('');
      expect(mutationText).toMatchObject({
        stderr: '',
        stdout: expect.stringContaining('Added scene:'),
      });

      const catalogJson = await execFileAsync(process.execPath, [cliPath, 'list-transitions', '--json']);
      const catalogText = await execFileAsync(process.execPath, [cliPath, 'list-transitions']);
      expect(JSON.parse(catalogJson.stdout)).toMatchObject({ count: expect.any(Number) });
      expect(catalogText).toMatchObject({
        stderr: '',
        stdout: expect.stringContaining('Transitions:'),
      });

      const dslJson = await execFileAsync(process.execPath, [cliPath, 'dsl-format', dslPath, '--json']);
      const dslText = await execFileAsync(process.execPath, [cliPath, 'dsl-format', dslPath]);
      expect(JSON.parse(dslJson.stdout)).toMatchObject({ ok: true, formattedSource: expect.any(String) });
      expect(dslText).toMatchObject({
        stderr: '',
        stdout: expect.stringContaining('title "Output Parity"'),
      });
    });
  });

  it('derives the complete apply-plan support list from the operation registry', async () => {
    const source = await readFile(cliPath, 'utf8');
    const registrySource = source.slice(
      source.indexOf('const APPLY_PLAN_OPERATION_HANDLERS'),
      source.indexOf('const SUPPORTED_APPLY_PLAN_COMMANDS'),
    );
    const operationNames = [...registrySource.matchAll(/^  \['([^']+)'/gm)]
      .map((match) => match[1]);

    expect(operationNames).toEqual([
      'add-scene', 'rename-scene', 'delete-scene', 'set-scene-next', 'retarget-scene',
      'repair-scene-target', 'clear-scene-references', 'add-character', 'add-variable',
      'update-variable', 'rename-variable', 'delete-variable', 'add-affection-variable',
      'add-ending', 'update-ending', 'remove-ending', 'add-ending-unlock', 'add-cg',
      'update-cg', 'remove-cg', 'add-cg-unlock', 'add-video', 'update-video', 'remove-video',
      'add-page', 'remove-page', 'move-page', 'add-dialogue', 'set-dialogue',
      'remove-dialogue', 'move-dialogue', 'add-choice-option', 'set-choice-page',
      'set-choice-option', 'remove-choice-option', 'move-choice-option', 'set-condition-page',
      'set-page-background', 'set-page-characters', 'set-page-audio', 'set-page-media',
      'set-page-camera', 'set-camera-effect', 'set-page-transition', 'set-page-transitions',
      'register-effect-pack', 'set-page-effect-pack', 'clear-page-effect-packs',
      'set-page-particles', 'clear-page-particles', 'inherit-page-particles',
      'set-character-animation', 'set-character-transition', 'set-opening-video',
      'set-ending-video', 'set-title-screen', 'add-title-element', 'update-title-element',
      'remove-title-element', 'set-screen-layout', 'set-dialogue-box', 'set-theme',
      'set-widget-styles', 'set-ui-motion', 'apply-ui-style-preset', 'add-choice-effect',
      'set-choice-effect', 'remove-choice-effect',
    ]);
    expect(source).toContain(
      'const SUPPORTED_APPLY_PLAN_COMMANDS = Object.freeze([...APPLY_PLAN_OPERATION_HANDLERS.keys()]);',
    );
    const dispatchSource = source.slice(
      source.indexOf('function applyPlanOperation'),
      source.indexOf('async function writeScriptFile'),
    );
    expect(dispatchSource).not.toContain("if (command === '");
  });

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

  it('converts an agent DSL source into an apply-plan manifest from the CLI', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'story.dsl');
      const planPath = path.join(dir, 'story-plan.json');
      const sourceMapPath = path.join(dir, 'agent-dsl-source-map.json');
      const enrichedSourceMapPath = path.join(dir, 'agent-dsl-source-map.applied.json');
      const resultOutPath = path.join(dir, 'apply-result.json');
      const handoffPath = path.join(dir, 'agent-handoff.json');
      const previewPath = path.join(dir, 'author-check-preview.png');
      const scriptPath = path.join(dir, 'script.json');
      const dslSourcePath = 'story.dsl';
      await writeFile(dslPath, `
title "CLI Agent DSL"
character sakura "Sakura" expression normal "characters/sakura_normal.png"
variable affection number initial 0 label "Affection"

macro entrance(character, expression):
  show $character $expression at center animation fade-in

scene start "Start":
  bg "backgrounds/classroom.png"
  call entrance("sakura", "normal")
  say sakura "Welcome."
  choice "Answer?":
    option "Stay" -> good:
      effect var:add affection 1
    option "Leave" -> bad

scene good "Good":
  say sakura "Good choice."

scene bad "Bad":
  say "The room falls silent."
`, 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_plan',
        characters: {},
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'dsl-plan',
        dslPath,
        '--out',
        planPath,
        '--source-map-out',
        sourceMapPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const plan = JSON.parse(await readFile(planPath, 'utf8'));
      const sourceMap = JSON.parse(await readFile(sourceMapPath, 'utf8'));

      expect(result).toMatchObject({
        outPath: planPath,
        sourceMapPath,
        operationCount: 9,
      });
      expect(plan.source).toMatchObject({
        kind: 'agent-dsl',
        macroCount: 1,
      });
      expect(plan.operations.map((operation) => operation.command)).toEqual([
        'add-character',
        'add-variable',
        'add-scene',
        'add-page',
        'add-page',
        'add-scene',
        'add-page',
        'add-scene',
        'add-page',
      ]);
      expect(plan.operations[0].provenance.sourceMapId).toBe('map-00001');
      expect(sourceMap.compiler).toBe('agent-dsl');
      expect(sourceMap.mappings[0]).toMatchObject({
        id: 'map-00001',
        operationId: 'dsl-add-character-sakura',
        projectPaths: ['characters.sakura'],
      });
      expect(sourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-add-choice-start-2')).toMatchObject({
        projectPaths: ['scenes.start.pages.1'],
      });

      const validated = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--source-map',
        sourceMapPath,
        '--source-map-out',
        enrichedSourceMapPath,
        '--validate-only',
        '--json',
      ]);
      const validatedResult = JSON.parse(validated.stdout);
      const enrichedSourceMap = JSON.parse(await readFile(enrichedSourceMapPath, 'utf8'));
      expect(validatedResult.transaction).toMatchObject({
        status: 'validated',
        wrote: false,
      });
      expect(validatedResult.sourceMapOutPath).toBe(enrichedSourceMapPath);
      expect(enrichedSourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-add-choice-start-2')).toMatchObject({
        projectPaths: ['scenes.start.pages.1'],
      });
      expect(enrichedSourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-add-choice-start-2').fingerprint.generated).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(validatedResult.validation.ok).toBe(true);
      expect(validatedResult.changeSummary.changedPaths).toEqual(expect.arrayContaining([
        'characters.sakura',
        'systems.variables.affection',
        'scenes.start',
        'scenes.start.pages.0',
        'scenes.start.pages.1',
      ]));

      await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--source-map',
        sourceMapPath,
        '--source-map-out',
        enrichedSourceMapPath,
        '--result-out',
        resultOutPath,
        '--force',
        '--json',
      ]);

      let authorCheckRun = null;
      let authorCheckFailure = null;
      try {
        authorCheckRun = await execFileAsync('node', [
          cliPath,
          'author-check',
          '--script',
          scriptPath,
          '--transaction',
          resultOutPath,
          '--source-map',
          enrichedSourceMapPath,
          '--preview-out',
          previewPath,
          '--write-preview-plan',
          '--skip-asset-check',
          '--json',
        ]);
      } catch (error) {
        authorCheckFailure = error;
      }
      const authorCheckResult = JSON.parse(authorCheckFailure?.stdout ?? authorCheckRun.stdout);
      const previewPlan = JSON.parse(await readFile(`${previewPath}.json`, 'utf8'));
      expect(authorCheckResult.dslSourceMap).toMatchObject({
        path: enrichedSourceMapPath,
        mappingCount: plan.operations.length,
        stale: {
          ok: true,
          staleCount: 0,
        },
      });
      expect(authorCheckResult.focus.previewTargets).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: expect.objectContaining({
            kind: 'agent-dsl',
            file: dslSourcePath,
            mappingId: expect.stringMatching(/^map-/),
          }),
        }),
      ]));
      expect(previewPlan.targets).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: expect.objectContaining({
            kind: 'agent-dsl',
            file: dslSourcePath,
          }),
        }),
      ]));

      let handoffFailure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'handoff-report',
          '--script',
          scriptPath,
          '--transaction',
          resultOutPath,
          '--source-map',
          enrichedSourceMapPath,
          '--out',
          handoffPath,
          '--skip-asset-check',
          '--json',
        ]);
      } catch (error) {
        handoffFailure = error;
      }
      const handoffResult = JSON.parse(handoffFailure?.stdout ?? await readFile(handoffPath, 'utf8'));
      const handoffArtifact = JSON.parse(await readFile(handoffPath, 'utf8'));
      expect(handoffResult.dslSourceMap).toMatchObject({
        path: enrichedSourceMapPath,
        mappingCount: plan.operations.length,
        stale: {
          ok: true,
          staleCount: 0,
        },
      });
      expect(handoffArtifact.previewTargets).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: expect.objectContaining({
            kind: 'agent-dsl',
            file: dslSourcePath,
            mappingId: expect.stringMatching(/^map-/),
          }),
        }),
      ]));
      expect(handoffArtifact.reviewItems).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'agent-dsl',
          code: 'dsl-generated-change',
          sourceLocation: expect.objectContaining({
            kind: 'agent-dsl',
            file: dslSourcePath,
          }),
        }),
      ]));
    });
  });

  it('creates an Agent DSL starter skeleton from an existing script without a source map', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const dslPath = path.join(dir, 'agent-src', 'main.gmdsl');
      const reportPath = path.join(dir, 'agent-src', 'skeleton-report.json');
      const planPath = path.join(dir, 'skeleton-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_skeleton',
        title: 'Skeleton CLI',
        characters: {
          sakura: {
            name: 'Sakura',
            expressions: { normal: 'characters/sakura_normal.png' },
          },
        },
        systems: {
          variables: {
            affection: { type: 'number', initial: 1, label: 'Affection' },
          },
        },
        scenes: {
          start: {
            name: 'Start',
            pages: [
              {
                id: 'opening',
                type: 'normal',
                dialogues: [{ speaker: 'sakura', text: 'Welcome.', expression: 'normal' }],
              },
              {
                type: 'choice',
                prompt: 'Continue?',
                options: [{ text: 'Yes', target: null }],
              },
            ],
          },
        },
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'dsl-skeleton',
        '--script',
        scriptPath,
        '--out',
        dslPath,
        '--report-out',
        reportPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const source = await readFile(dslPath, 'utf8');
      const report = JSON.parse(await readFile(reportPath, 'utf8'));

      expect(result).toMatchObject({
        success: true,
        ok: true,
        scriptPath,
        outPath: dslPath,
        reportPath,
        sourceMapPath: null,
        sourceMapCreated: false,
        wrote: true,
        report: {
          sourceMapCreated: false,
          warningCount: 0,
        },
        declarations: {
          characters: 1,
          variables: 1,
          scenes: 1,
          normalPages: 1,
          choicePages: 1,
          choiceOptions: 1,
          dialogues: 1,
        },
        warningCount: 0,
        unsupportedCount: 0,
        lossyCount: 0,
      });
      expect(source).toContain('# This skeleton is a migration aid; it does not claim original DSL provenance.');
      expect(source).toContain('character sakura "Sakura" expression normal "characters/sakura_normal.png"');
      expect(source).toContain('  page opening:');
      expect(source).toContain('  say sakura "Welcome." expression normal');
      expect(source).toContain('  choice "Continue?":');
      expect(source).toContain('    option "Yes"');
      expect(report).toMatchObject({
        sourceMapCreated: false,
        unsupported: [],
        lossy: [],
      });

      const plan = await execFileAsync('node', [
        cliPath,
        'dsl-plan',
        dslPath,
        '--out',
        planPath,
        '--json',
      ]);
      const planResult = JSON.parse(plan.stdout);
      expect(planResult).toMatchObject({
        dslPath,
        sourceMapPath: null,
        operationCount: 5,
      });
      await expect(stat(path.join(dir, 'agent-dsl-source-map.json'))).rejects.toMatchObject({ code: 'ENOENT' });
    });
  });

  it('builds a generated Agent DSL skeleton into an equivalent fresh project slice', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const freshScriptPath = path.join(dir, 'fresh-script.json');
      const hydratedScriptPath = path.join(dir, 'hydrated-script.json');
      const dslPath = path.join(dir, 'agent-src', 'main.gmdsl');
      const planPath = path.join(dir, 'skeleton-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_skeleton_equivalence',
        title: 'Skeleton Equivalence',
        characters: {
          sakura: {
            name: 'Sakura',
            color: '#ff99cc',
            expressions: { smile: 'characters/sakura_smile.png' },
          },
        },
        systems: {
          variables: {
            affection: { type: 'number', initial: 0, label: 'Affection' },
            saw_letter: { type: 'bool', initial: false, label: 'Saw Letter' },
          },
          endings: {
            good: { title: 'Good End', category: 'main', order: 1, description: 'A warm ending.' },
          },
          gallery: {
            cg: {
              smile: {
                title: 'Smile',
                images: ['gallery/smile.png'],
                thumbnail: 'gallery/smile-thumb.png',
                category: 'main',
                order: 1,
                description: 'Sakura smiles.',
              },
            },
          },
        },
        scenes: {
          start: {
            name: 'Start',
            next: 'normal',
            pages: [
              {
                id: 'opening',
                type: 'normal',
                background: 'backgrounds/classroom.png',
                transition: { type: 'fade', duration: 500 },
                bgm: { file: 'audio/theme.ogg', volume: 0.7 },
                se: { file: 'audio/bell.ogg' },
                characters: [{ id: 'sakura', expression: 'smile', position: 'left', animation: 'fade-in' }],
                camera: { effect: 'shake', intensity: 'high', durationMs: 450 },
                particles: { preset: 'sakura', density: 0.4, speed: 1.2, wind: -0.2, opacity: 0.8, color: '#ffc6d9', direction: 'down' },
                dialogues: [{ speaker: 'sakura', text: 'The petals are early.', expression: 'smile' }],
              },
              {
                type: 'choice',
                prompt: 'Answer?',
                options: [
                  { text: 'Smile', target: 'good', effects: [{ type: 'var:add', id: 'affection', value: 1 }, { type: 'unlock:cg', id: 'smile' }] },
                  { text: 'Stay quiet', target: 'normal', effects: [{ type: 'var:set', id: 'saw_letter', value: true }] },
                ],
              },
              {
                type: 'condition',
                conditionMode: 'any',
                conditions: [
                  { variableId: 'affection', operator: '>=', value: 1 },
                  { variableId: 'saw_letter', operator: '==', value: true },
                ],
                trueTarget: 'good',
                falseTarget: 'normal',
              },
            ],
          },
          good: {
            name: 'Good',
            pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'Good.' }] }],
          },
          normal: {
            name: 'Normal',
            pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'Normal.' }] }],
          },
        },
      }), 'utf8');
      await writeFile(freshScriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_skeleton_equivalence_fresh',
        characters: {},
        systems: { variables: {}, endings: {}, gallery: { cg: {} } },
        scenes: {},
      }), 'utf8');

      const skeleton = await execFileAsync('node', [
        cliPath,
        'dsl-skeleton',
        '--script',
        scriptPath,
        '--out',
        dslPath,
        '--json',
      ]);
      expect(JSON.parse(skeleton.stdout)).toMatchObject({
        warningCount: 0,
        unsupportedCount: 0,
        lossyCount: 0,
      });

      await execFileAsync('node', [
        cliPath,
        'dsl-plan',
        dslPath,
        '--out',
        planPath,
        '--json',
      ]);
      const apply = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        freshScriptPath,
        '--out',
        hydratedScriptPath,
        '--force',
        '--json',
      ]);
      const applyResult = JSON.parse(apply.stdout);
      const hydrated = JSON.parse(await readFile(hydratedScriptPath, 'utf8'));

      expect(applyResult.validation.ok).toBe(true);
      expect(hydrated.characters.sakura).toMatchObject({
        name: 'Sakura',
        color: '#ff99cc',
        expressions: { smile: 'characters/sakura_smile.png' },
      });
      expect(hydrated.systems.variables).toMatchObject({
        affection: { type: 'number', initial: 0, label: 'Affection' },
        saw_letter: { type: 'bool', initial: false, label: 'Saw Letter' },
      });
      expect(hydrated.systems.endings.good).toMatchObject({
        title: 'Good End',
        category: 'main',
        order: 1,
        description: 'A warm ending.',
      });
      expect(hydrated.systems.gallery.cg.smile).toMatchObject({
        title: 'Smile',
        images: ['gallery/smile.png'],
        thumbnail: 'gallery/smile-thumb.png',
        category: 'main',
        order: 1,
        description: 'Sakura smiles.',
      });
      expect(hydrated.scenes.start.next).toBe('normal');
      expect(hydrated.scenes.start.pages[0]).toMatchObject({
        id: 'opening',
        type: 'normal',
        background: 'backgrounds/classroom.png',
        transition: { type: 'fade', duration: 500 },
        bgm: { file: 'audio/theme.ogg', volume: 0.7 },
        se: { file: 'audio/bell.ogg' },
        characters: [{ id: 'sakura', expression: 'smile', position: 'left', animation: 'fade-in' }],
        camera: { effect: 'shake', intensity: 'high', durationMs: 450 },
        particles: { preset: 'sakura', density: 0.4, speed: 1.2, wind: -0.2, opacity: 0.8, color: '#ffc6d9', direction: 'down' },
        dialogues: [{ speaker: 'sakura', text: 'The petals are early.', expression: 'smile' }],
      });
      expect(hydrated.scenes.start.pages[1]).toMatchObject({
        type: 'choice',
        prompt: 'Answer?',
        options: [
          { text: 'Smile', target: 'good', effects: [{ type: 'var:add', id: 'affection', value: 1 }, { type: 'unlock:cg', id: 'smile' }] },
          { text: 'Stay quiet', target: 'normal', effects: [{ type: 'var:set', id: 'saw_letter', value: true }] },
        ],
      });
      expect(hydrated.scenes.start.pages[2]).toMatchObject({
        type: 'condition',
        conditionMode: 'any',
        conditions: [
          { variableId: 'affection', operator: '>=', value: 1 },
          { variableId: 'saw_letter', operator: '==', value: true },
        ],
        trueTarget: 'good',
        falseTarget: 'normal',
      });
    });
  });

  it('converts an agent DSL project manifest into an apply-plan manifest from the CLI', async () => {
    await withTempDir(async (dir) => {
      const sourceRoot = path.join(dir, 'agent-src');
      const libDir = path.join(sourceRoot, 'lib');
      await mkdir(libDir, { recursive: true });
      const manifestPath = path.join(sourceRoot, 'project.gmdsl.json');
      const planPath = path.join(dir, 'project-plan.json');
      await writeFile(manifestPath, JSON.stringify({
        version: 1,
        sourceRoot: '.',
        entry: 'main.gmdsl',
      }), 'utf8');
      await writeFile(path.join(libDir, 'characters.gmdsl'), 'character sakura "Sakura"\n', 'utf8');
      await writeFile(path.join(sourceRoot, 'main.gmdsl'), `
include "lib/characters.gmdsl"
namespace chapter_01:
  scene start "Start":
    say "Welcome."
`, 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'dsl-plan',
        manifestPath,
        '--out',
        planPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const plan = JSON.parse(await readFile(planPath, 'utf8'));

      expect(result).toMatchObject({
        dslPath: manifestPath,
        manifestPath,
        entryPath: path.join(sourceRoot, 'main.gmdsl'),
        outPath: planPath,
        operationCount: 3,
      });
      expect(plan.operations.map((operation) => operation.id)).toEqual([
        'dsl-add-character-sakura',
        'dsl-add-scene-chapter_01_start',
        'dsl-add-page-chapter_01_start-1',
      ]);
    });
  });

  it('validates P4 agent DSL condition expressions from the CLI', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'conditions.gmdsl');
      const planPath = path.join(dir, 'conditions-plan.json');
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(dslPath, `
variable affection number initial 0
variable saw_letter bool initial false
scene start "Start":
  if affection >= 5 and saw_letter == true -> good else normal
scene good "Good":
  say "Good."
scene normal "Normal":
  say "Normal."
`, 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_conditions',
        characters: {},
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'dsl-plan',
        dslPath,
        '--out',
        planPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const plan = JSON.parse(await readFile(planPath, 'utf8'));

      expect(result).toMatchObject({
        outPath: planPath,
        operationCount: 8,
      });
      expect(plan.operations.find((operation) => operation.id === 'dsl-add-condition-start-1')).toMatchObject({
        params: {
          type: 'condition',
          conditionMode: 'all',
          conditions: [
            { variableId: 'affection', operator: '>=', value: 5 },
            { variableId: 'saw_letter', operator: '==', value: true },
          ],
        },
      });

      const validated = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--validate-only',
        '--json',
      ]);
      const validatedResult = JSON.parse(validated.stdout);
      expect(validatedResult.validation.ok).toBe(true);
    });
  });

  it('validates P8.1 agent DSL mood presets from the CLI', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'preset.gmdsl');
      const planPath = path.join(dir, 'preset-plan.json');
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(dslPath, `
preset mood rainy_school:
  particles rain density 0.6 opacity 0.8
  transition dissolve 900
  camera shake low 450
scene start "Start":
  page opening:
  preset mood rainy_school
  say "Rain tapped against the glass."
`, 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_preset',
        characters: {},
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'dsl-plan',
        dslPath,
        '--out',
        planPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const plan = JSON.parse(await readFile(planPath, 'utf8'));

      expect(result).toMatchObject({
        outPath: planPath,
        operationCount: 2,
      });
      expect(plan.operations[1]).toMatchObject({
        command: 'add-page',
        params: {
          type: 'normal',
          page: {
            transition: { type: 'dissolve', duration: 900 },
            particles: { preset: 'rain', density: 0.6, opacity: 0.8 },
            camera: { effect: 'shake', intensity: 'low', durationMs: 450 },
          },
        },
      });

      const validated = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--validate-only',
        '--json',
      ]);
      const validatedResult = JSON.parse(validated.stdout);
      expect(validatedResult.validation.ok).toBe(true);
    });
  });

  it('validates P8.2 agent DSL sequences from the CLI', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'sequence.gmdsl');
      const planPath = path.join(dir, 'sequence-plan.json');
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(dslPath, `
character sakura "Sakura"
variable affection number initial 0
sequence dramatic_entrance(character, expression):
  show $character $expression at center animation fade-in
  camera shake medium 450
sequence reward(variable, amount):
  effect var:add $variable $amount
scene start "Start":
  sequence dramatic_entrance("sakura", "normal")
  choice "Answer?":
    option "Smile" -> start:
      sequence reward("affection", 2)
`, 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_sequence',
        characters: {},
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'dsl-plan',
        dslPath,
        '--out',
        planPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const plan = JSON.parse(await readFile(planPath, 'utf8'));

      expect(result).toMatchObject({
        outPath: planPath,
        operationCount: 5,
      });
      expect(plan.operations.find((operation) => operation.id === 'dsl-add-page-start-1')).toMatchObject({
        params: {
          page: {
            characters: [
              { id: 'sakura', expression: 'normal', position: 'center', animation: 'fade-in' },
            ],
            camera: { effect: 'shake', intensity: 'medium', durationMs: 450 },
          },
        },
      });
      expect(plan.operations.find((operation) => operation.id === 'dsl-add-choice-start-2')).toMatchObject({
        params: {
          options: [
            {
              text: 'Smile',
              target: 'start',
              effects: [
                { type: 'var:add', id: 'affection', value: 2 },
              ],
            },
          ],
        },
      });

      const validated = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--validate-only',
        '--json',
      ]);
      const validatedResult = JSON.parse(validated.stdout);
      expect(validatedResult.validation.ok).toBe(true);
    });
  });

  it('validates P8.3 agent DSL route templates from the CLI', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'route.gmdsl');
      const planPath = path.join(dir, 'route-plan.json');
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(dslPath, `
character sakura "Sakura"
route sakura:
  affection variable sakura_affection
  good_end sakura_good
  normal_end sakura_normal
scene start "Start":
  choice "Route?":
    option "Good" -> sakura_good
    option "Normal" -> sakura_normal
`, 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_route',
        characters: {},
        systems: { variables: {}, endings: {}, gallery: { cg: {} } },
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'dsl-plan',
        dslPath,
        '--out',
        planPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const plan = JSON.parse(await readFile(planPath, 'utf8'));

      expect(result).toMatchObject({
        outPath: planPath,
        operationCount: 10,
      });
      expect(plan.operations.map((operation) => operation.command)).toEqual([
        'add-character',
        'add-affection-variable',
        'add-ending',
        'add-ending',
        'add-scene',
        'add-page',
        'add-scene',
        'add-page',
        'add-scene',
        'add-page',
      ]);
      expect(plan.operations.find((operation) => operation.id === 'dsl-add-route-page-sakura_good')).toMatchObject({
        params: {
          page: {
            effects: [{ type: 'unlock:ending', id: 'sakura_good' }],
          },
        },
      });

      const validated = await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--validate-only',
        '--json',
      ]);
      const validatedResult = JSON.parse(validated.stdout);
      expect(validatedResult.validation.ok).toBe(true);
    });
  });

  it('returns structured diagnostics for invalid agent DSL from the CLI', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'broken.dsl');
      await writeFile(dslPath, 'scene start "Start"\n  say "Missing colon."\n', 'utf8');

      let failure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'dsl-plan',
          dslPath,
          '--json',
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeTruthy();
      const result = JSON.parse(failure.stdout);
      expect(result).toMatchObject({
        success: false,
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            code: 'dsl-syntax-error',
            message: 'Expected ":" after scene declaration.',
          },
        ],
      });
      expect(failure.stderr).toBe('');
    });
  });

  it('returns structured JSON when a script file cannot be parsed', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'broken-script.json');
      await writeFile(scriptPath, '{ bad json', 'utf8');

      let failure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'inspect',
          '--script',
          scriptPath,
          '--json',
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeTruthy();
      expect(JSON.parse(failure.stdout)).toMatchObject({
        success: false,
        error: expect.stringContaining(`Failed to parse script JSON at ${scriptPath}`),
      });
      expect(failure.stderr).toBe('');
    });
  });

  it('rejects unstable authoring IDs through JSON CLI output', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_stable_ids',
        characters: {},
        scenes: {},
      }), 'utf8');

      let failure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'add-scene',
          '--id',
          '../bad',
          '--name',
          'Bad',
          '--script',
          scriptPath,
          '--json',
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeTruthy();
      expect(JSON.parse(failure.stdout)).toMatchObject({
        success: false,
        error: expect.stringContaining('scene.id must start with a letter or underscore'),
      });
      expect(failure.stderr).toBe('');
    });
  });

  it('checks an agent DSL source without writing source, project, or artifact files', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'check.gmdsl');
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'should-not-exist-plan.json');
      const sourceMapPath = path.join(dir, 'should-not-exist-source-map.json');
      const scriptSource = JSON.stringify({
        projectId: 'gm_cli_agent_dsl_check',
        characters: {},
        scenes: {},
      });
      await writeFile(dslPath, `
title "DSL Check"
character sakura "Sakura"
variable affection number initial 0
scene start "Start":
  say sakura "Checked."
`, 'utf8');
      await writeFile(scriptPath, scriptSource, 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'dsl-check',
        dslPath,
        '--script',
        scriptPath,
        '--out',
        planPath,
        '--source-map-out',
        sourceMapPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);

      expect(result).toMatchObject({
        success: true,
        ok: true,
        dslPath,
        entryPath: dslPath,
        manifestPath: null,
        diagnostics: [],
        operationCount: 4,
        warningCount: 0,
        validation: {
          ok: true,
          status: 'validated',
          scriptPath,
          errorCount: 0,
        },
        check: {
          parsed: true,
          bound: true,
          analyzed: true,
          emittedPlan: true,
          validated: true,
          wrote: false,
        },
      });
      expect(result.validation.changedPaths).toEqual(expect.arrayContaining([
        'characters.sakura',
        'systems.variables.affection',
        'scenes.start',
        'scenes.start.pages.0',
      ]));
      expect(await readFile(scriptPath, 'utf8')).toBe(scriptSource);
      await expect(stat(planPath)).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(stat(sourceMapPath)).rejects.toMatchObject({ code: 'ENOENT' });
    });
  });

  it('returns a structured dsl-check failure report for invalid agent DSL', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'broken-check.dsl');
      await writeFile(dslPath, 'scene start "Start"\n  say "Missing colon."\n', 'utf8');

      let failure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'dsl-check',
          dslPath,
          '--json',
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeTruthy();
      const result = JSON.parse(failure.stdout);
      expect(result).toMatchObject({
        success: false,
        ok: false,
        dslPath,
        entryPath: dslPath,
        manifestPath: null,
        diagnostics: [
          {
            severity: 'error',
            code: 'dsl-syntax-error',
            message: 'Expected ":" after scene declaration.',
          },
        ],
        operationCount: 0,
        validation: null,
      });
      expect(failure.stderr).toBe('');
    });
  });

  it('returns structured dsl-check diagnostics for invalid P8 abstractions', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'broken-p8.gmdsl');
      await writeFile(dslPath, `
character sakura "Sakura"
route sakura:
  affection variable sakura_affection
  good_end sakura_good
scene start "Start":
  sequence missing()
`, 'utf8');

      let failure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'dsl-check',
          dslPath,
          '--json',
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeTruthy();
      const result = JSON.parse(failure.stdout);
      expect(result).toMatchObject({
        success: false,
        ok: false,
        dslPath,
        validation: null,
      });
      expect(result.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: 'dsl-invalid-route-template',
          message: 'Route "sakura" requires normal_end.',
        }),
        expect.objectContaining({
          code: 'dsl-unknown-sequence',
          message: 'Sequence "missing" is not declared.',
        }),
      ]));
      expect(failure.stderr).toBe('');
    });
  });

  it('rejects unsafe dsl-check project manifest paths', async () => {
    await withTempDir(async (dir) => {
      const sourceRoot = path.join(dir, 'agent-src');
      await mkdir(sourceRoot, { recursive: true });
      const manifestPath = path.join(sourceRoot, 'project.gmdsl.json');
      await writeFile(manifestPath, JSON.stringify({
        version: 1,
        sourceRoot: '..',
        entry: 'outside.gmdsl',
      }), 'utf8');

      let failure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'dsl-check',
          manifestPath,
          '--json',
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeTruthy();
      const result = JSON.parse(failure.stdout);
      expect(result).toMatchObject({
        success: false,
        ok: false,
        dslPath: manifestPath,
        diagnostics: [
          {
            code: 'dsl-invalid-include-path',
            message: 'sourceRoot ".." must not contain traversal segments.',
          },
        ],
        validation: null,
      });
      expect(failure.stderr).toBe('');
    });
  });

  it('reports safe and stale generated regions from dsl-diff without writing files', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'diff.gmdsl');
      const planPath = path.join(dir, 'diff-plan.json');
      const sourceMapPath = path.join(dir, 'agent-dsl-source-map.json');
      const enrichedSourceMapPath = path.join(dir, 'agent-dsl-source-map.applied.json');
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(dslPath, `
character sakura "Sakura"
scene start "Start":
  say sakura "Original."
`, 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_diff',
        characters: {},
        scenes: {},
      }), 'utf8');

      await execFileAsync('node', [
        cliPath,
        'dsl-plan',
        dslPath,
        '--out',
        planPath,
        '--source-map-out',
        sourceMapPath,
        '--json',
      ]);
      await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--source-map',
        sourceMapPath,
        '--source-map-out',
        enrichedSourceMapPath,
        '--force',
        '--json',
      ]);

      const generatedScript = await readFile(scriptPath, 'utf8');
      const safeDiff = JSON.parse((await execFileAsync('node', [
        cliPath,
        'dsl-diff',
        dslPath,
        '--script',
        scriptPath,
        '--source-map',
        enrichedSourceMapPath,
        '--json',
      ])).stdout);
      expect(safeDiff).toMatchObject({
        success: true,
        ok: true,
        dslPath,
        scriptPath,
        sourceMapPath: enrichedSourceMapPath,
        mappingCount: 3,
        staleCount: 0,
        summary: {
          safe: 3,
          stale: 0,
          missing: 0,
          untracked: 0,
          changed: 0,
        },
      });
      expect(safeDiff.safeRegions).toHaveLength(3);
      expect(await readFile(scriptPath, 'utf8')).toBe(generatedScript);

      const edited = JSON.parse(generatedScript);
      edited.scenes.start.pages[0].dialogues[0].text = 'Human edit.';
      await writeFile(scriptPath, JSON.stringify(edited, null, 2), 'utf8');

      let staleFailure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'dsl-diff',
          dslPath,
          '--script',
          scriptPath,
          '--source-map',
          enrichedSourceMapPath,
          '--json',
        ]);
      } catch (error) {
        staleFailure = error;
      }

      expect(staleFailure).toBeTruthy();
      const staleDiff = JSON.parse(staleFailure.stdout);
      expect(staleDiff).toMatchObject({
        success: false,
        ok: false,
        summary: {
          safe: 1,
          stale: 2,
          missing: 0,
          untracked: 0,
          changed: 2,
        },
      });
      expect(staleDiff.staleRegions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          operationId: 'dsl-add-scene-start',
          status: 'stale',
          projectPaths: ['scenes.start'],
        }),
        expect.objectContaining({
          operationId: 'dsl-add-page-start-1',
          status: 'stale',
          projectPaths: ['scenes.start.pages.0'],
        }),
      ]));
      expect(staleFailure.stderr).toBe('');
    });
  });

  it('reports untracked dsl-diff regions when the source map is not enriched', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'untracked.gmdsl');
      const sourceMapPath = path.join(dir, 'agent-dsl-source-map.json');
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(dslPath, `
scene start "Start":
  say "Untracked."
`, 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_untracked',
        characters: {},
        scenes: {
          start: {
            name: 'Start',
            pages: [
              {
                type: 'normal',
                background: '',
                characters: [],
                bgm: null,
                se: null,
                dialogues: [{ speaker: null, text: 'Untracked.' }],
              },
            ],
          },
        },
      }), 'utf8');
      await execFileAsync('node', [
        cliPath,
        'dsl-plan',
        dslPath,
        '--source-map-out',
        sourceMapPath,
        '--json',
      ]);

      let failure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'dsl-diff',
          dslPath,
          '--script',
          scriptPath,
          '--source-map',
          sourceMapPath,
          '--json',
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeTruthy();
      const result = JSON.parse(failure.stdout);
      expect(result).toMatchObject({
        success: false,
        ok: false,
        summary: {
          safe: 0,
          stale: 0,
          missing: 0,
          untracked: 2,
          changed: 0,
        },
      });
      expect(result.untrackedRegions).toHaveLength(2);
      expect(failure.stderr).toBe('');
    });
  });

  it('rejects unsafe dsl-diff project manifest paths', async () => {
    await withTempDir(async (dir) => {
      const sourceRoot = path.join(dir, 'agent-src');
      const scriptPath = path.join(dir, 'script.json');
      await mkdir(sourceRoot, { recursive: true });
      const manifestPath = path.join(sourceRoot, 'project.gmdsl.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_diff_path_safety',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(manifestPath, JSON.stringify({
        version: 1,
        sourceRoot: '..',
        entry: 'outside.gmdsl',
      }), 'utf8');

      let failure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'dsl-diff',
          manifestPath,
          '--script',
          scriptPath,
          '--json',
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeTruthy();
      const result = JSON.parse(failure.stdout);
      expect(result).toMatchObject({
        command: 'dsl-diff',
        success: false,
        ok: false,
        dslPath: manifestPath,
        diagnostics: [
          {
            code: 'dsl-invalid-include-path',
            message: 'sourceRoot ".." must not contain traversal segments.',
          },
        ],
      });
      expect(failure.stderr).toBe('');
    });
  });

  it('builds Agent DSL artifacts and validates without writing the project by default', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'build.gmdsl');
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'build-plan.json');
      const sourceMapPath = path.join(dir, 'build-source-map.json');
      const checkPath = path.join(dir, 'build-check.json');
      const scriptSource = JSON.stringify({
        projectId: 'gm_cli_agent_dsl_build_validate',
        characters: {},
        scenes: {},
      });
      await writeFile(dslPath, `
character sakura "Sakura"
scene start "Start":
  say sakura "Build validated."
`, 'utf8');
      await writeFile(scriptPath, scriptSource, 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'dsl-build',
        dslPath,
        '--script',
        scriptPath,
        '--out',
        planPath,
        '--source-map-out',
        sourceMapPath,
        '--check-out',
        checkPath,
        '--validate-only',
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const plan = JSON.parse(await readFile(planPath, 'utf8'));
      const sourceMap = JSON.parse(await readFile(sourceMapPath, 'utf8'));
      const check = JSON.parse(await readFile(checkPath, 'utf8'));

      expect(result).toMatchObject({
        success: true,
        ok: true,
        status: 'validated',
        dslPath,
        scriptPath,
        planPath,
        sourceMapPath,
        checkPath,
        operationCount: 3,
        validation: {
          ok: true,
          status: 'validated',
        },
        transaction: {
          command: 'dsl-build',
          status: 'validated',
          wrote: false,
        },
      });
      expect(plan.operations.map((operation) => operation.id)).toEqual([
        'dsl-add-character-sakura',
        'dsl-add-scene-start',
        'dsl-add-page-start-1',
      ]);
      expect(sourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-add-page-start-1').fingerprint.generated).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(check.checkPath).toBe(checkPath);
      expect(await readFile(scriptPath, 'utf8')).toBe(scriptSource);
    });
  });

  it('checks, builds, applies, and diffs Agent DSL video authoring without DSL project fields', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'video.gmdsl');
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'video-plan.json');
      const transactionPath = path.join(dir, 'video-transaction.json');
      const sourceMapPath = path.join(dir, 'video-source-map.json');
      const enrichedSourceMapPath = path.join(dir, 'video-source-map.applied.json');
      const reviewPath = path.join(dir, 'video-review-handoff.json');
      const handoffPath = path.join(dir, 'agent-handoff.json');
      await writeFile(dslPath, `
title "Video DSL"
video op_main "videos/op_main.mp4" label "Main OP" kind op poster "videos/op_main.poster.png"
video ed_good "videos/ed_good.webm" label "Good ED" kind ed
ending good_end "Good End"
ending quiet_end "Quiet End"
opening video op_main play after-start oncePerProfile true
ending_video good_end ed_good play manual
scene start "Start":
  video op_main target after_video autoAdvance true skippable false
scene after_video "After Video":
  choice "Choose ending":
    option "Good" -> good_scene:
      effect unlock:ending good_end
    option "Quiet" -> quiet_scene:
      effect unlock:ending quiet_end
scene good_scene "Good Scene":
  bg "backgrounds/review.png"
  say "Good."
scene quiet_scene "Quiet Scene":
  bg "backgrounds/review.png"
  say "Quiet."
`, 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_video',
        characters: {},
        scenes: {},
      }), 'utf8');

      const check = JSON.parse((await execFileAsync('node', [
        cliPath,
        'dsl-check',
        dslPath,
        '--script',
        scriptPath,
        '--json',
      ])).stdout);
      expect(check).toMatchObject({
        success: true,
        ok: true,
        operationCount: 14,
        validation: { ok: true, status: 'validated' },
      });
      expect(check.validation.changedPaths).toEqual(expect.arrayContaining([
        'assets.videos.op_main',
        'assets.videos.ed_good',
        'ui.titleScreen.openingVideo',
        'systems.endings.good_end.endingVideo',
        'scenes.start.pages.0',
      ]));

      const build = JSON.parse((await execFileAsync('node', [
        cliPath,
        'dsl-build',
        dslPath,
        '--script',
        scriptPath,
        '--out',
        planPath,
        '--source-map-out',
        sourceMapPath,
        '--validate-only',
        '--json',
      ])).stdout);
      expect(build).toMatchObject({
        success: true,
        ok: true,
        operationCount: 14,
        transaction: {
          command: 'dsl-build',
          wrote: false,
        },
      });
      const sourceMap = JSON.parse(await readFile(sourceMapPath, 'utf8'));
      expect(sourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-add-video-page-start-1').projectPaths).toEqual(expect.arrayContaining([
        'scenes.start.pages.0.video',
      ]));

      await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--source-map',
        sourceMapPath,
        '--source-map-out',
        enrichedSourceMapPath,
        '--result-out',
        transactionPath,
        '--force',
        '--json',
      ]);

      const script = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(script.assets.videos.op_main).toMatchObject({ file: 'videos/op_main.mp4', kind: 'op' });
      expect(script.ui.titleScreen.openingVideo).toEqual({
        videoId: 'op_main',
        play: 'after-start',
        oncePerProfile: true,
      });
      expect(script.systems.endings.good_end.endingVideo).toEqual({
        videoId: 'ed_good',
        play: 'manual',
      });
      expect(script.scenes.start.pages[0]).toMatchObject({
        type: 'video',
        video: { videoId: 'op_main', skippable: false },
        autoAdvance: true,
        target: 'after_video',
      });
      expect(script).not.toHaveProperty('dsl');
      expect(script).not.toHaveProperty('agentDsl');
      expect(script).not.toHaveProperty('sourceMap');

      const diff = JSON.parse((await execFileAsync('node', [
        cliPath,
        'dsl-diff',
        dslPath,
        '--script',
        scriptPath,
        '--source-map',
        enrichedSourceMapPath,
        '--json',
      ])).stdout);
      expect(diff).toMatchObject({
        success: true,
        ok: true,
        mappingCount: 14,
        staleCount: 0,
        summary: {
          stale: 0,
          missing: 0,
          untracked: 0,
        },
      });

      const reviewRun = await execFileAsync('node', [
        cliPath,
        'review-handoff',
        '--script',
        scriptPath,
        '--transaction',
        transactionPath,
        '--source-map',
        enrichedSourceMapPath,
        '--skip-preview',
        '--skip-asset-check',
        '--write-preview-plan',
        '--write-editor-handoff',
        '--review-out',
        reviewPath,
        '--json',
      ]).catch((error) => error);
      const review = JSON.parse(reviewRun.stdout);
      const reviewArtifact = JSON.parse(await readFile(reviewPath, 'utf8'));
      const handoff = JSON.parse(await readFile(handoffPath, 'utf8'));

      expect(review).toMatchObject({
        kind: 'agent-review-handoff',
        ok: true,
        gates: { authorCheck: true, handoff: true },
      });
      expect(reviewArtifact.kind).toBe('agent-review-handoff');
      expect(review.authorCheck.focus.videoTargets).toEqual(expect.arrayContaining([
        expect.objectContaining({ pathString: 'assets.videos.op_main', reason: 'changed-video-registry' }),
        expect.objectContaining({ pathString: 'ui.titleScreen.openingVideo', reason: 'changed-opening-video' }),
        expect.objectContaining({ pathString: 'systems.endings.good_end.endingVideo', reason: 'changed-ending-video' }),
        expect.objectContaining({ pathString: 'scenes.start.pages.0.video', reason: 'changed-video-page' }),
      ]));
      expect(handoff.kind).toBe('agent-authoring-handoff');
      expect(handoff.previewTargets).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'video', pathString: 'assets.videos.op_main' }),
        expect.objectContaining({ type: 'video', pathString: 'ui.titleScreen.openingVideo' }),
        expect.objectContaining({ type: 'video', pathString: 'systems.endings.good_end.endingVideo' }),
        expect.objectContaining({ type: 'video', pathString: 'scenes.start.pages.0.video' }),
      ]));
      expect(handoff.reviewItems).toEqual(expect.arrayContaining([
        expect.objectContaining({ source: 'preview', category: 'video-preview', pathString: 'assets.videos.op_main' }),
        expect.objectContaining({ source: 'agent-dsl', code: 'dsl-generated-change', pathString: 'ui.titleScreen.openingVideo' }),
      ]));
      expect((await stat(handoffPath)).isFile()).toBe(true);
    });
  });

  it('writes a project only when dsl-build is explicitly asked to write', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'write-build.gmdsl');
      const scriptPath = path.join(dir, 'script.json');
      const sourceMapPath = path.join(dir, 'write-source-map.json');
      await writeFile(dslPath, `
scene start "Start":
  say "Written."
`, 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_build_write',
        characters: {},
        scenes: {},
      }), 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'dsl-build',
        dslPath,
        '--script',
        scriptPath,
        '--source-map-out',
        sourceMapPath,
        '--write',
        '--force',
        '--json',
      ]);
      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));
      const sourceMap = JSON.parse(await readFile(sourceMapPath, 'utf8'));

      expect(result).toMatchObject({
        success: true,
        ok: true,
        status: 'written',
        transaction: {
          command: 'dsl-build',
          status: 'written',
          wrote: true,
          outPath: scriptPath,
        },
      });
      expect(script.scenes.start.pages[0].dialogues[0].text).toBe('Written.');
      expect(sourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-add-page-start-1').fingerprint.generated).toMatch(/^sha256:[a-f0-9]{64}$/);
    });
  });

  it('blocks dsl-build writes when an enriched source map is stale', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'stale-build.gmdsl');
      const scriptPath = path.join(dir, 'script.json');
      const sourceMapPath = path.join(dir, 'stale-source-map.json');
      await writeFile(dslPath, `
scene start "Start":
  say "Generated."
`, 'utf8');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_build_stale',
        characters: {},
        scenes: {},
      }), 'utf8');
      await execFileAsync('node', [
        cliPath,
        'dsl-build',
        dslPath,
        '--script',
        scriptPath,
        '--source-map-out',
        sourceMapPath,
        '--write',
        '--force',
        '--json',
      ]);
      const edited = JSON.parse(await readFile(scriptPath, 'utf8'));
      edited.scenes.start.pages[0].dialogues[0].text = 'Human polish.';
      const editedSource = JSON.stringify(edited, null, 2);
      await writeFile(scriptPath, editedSource, 'utf8');

      let failure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'dsl-build',
          dslPath,
          '--script',
          scriptPath,
          '--source-map',
          sourceMapPath,
          '--write',
          '--force',
          '--json',
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeTruthy();
      const result = JSON.parse(failure.stdout);
      expect(result).toMatchObject({
        success: false,
        ok: false,
        status: 'blocked',
        blockedBy: 'source-map-stale',
        transaction: {
          command: 'dsl-build',
          status: 'blocked',
          wrote: false,
        },
        rebuildSafety: {
          ok: false,
          summary: {
            safe: 0,
            stale: 2,
            missing: 0,
            untracked: 0,
            changed: 2,
          },
        },
      });
      expect(await readFile(scriptPath, 'utf8')).toBe(editedSource);
      expect(failure.stderr).toBe('');
    });
  });

  it('rejects unsafe dsl-build project manifest paths', async () => {
    await withTempDir(async (dir) => {
      const sourceRoot = path.join(dir, 'agent-src');
      const scriptPath = path.join(dir, 'script.json');
      await mkdir(sourceRoot, { recursive: true });
      const manifestPath = path.join(sourceRoot, 'project.gmdsl.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_agent_dsl_build_path_safety',
        characters: {},
        scenes: {},
      }), 'utf8');
      await writeFile(manifestPath, JSON.stringify({
        version: 1,
        sourceRoot: '..',
        entry: 'outside.gmdsl',
      }), 'utf8');

      let failure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'dsl-build',
          manifestPath,
          '--script',
          scriptPath,
          '--validate-only',
          '--json',
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeTruthy();
      const result = JSON.parse(failure.stdout);
      expect(result).toMatchObject({
        command: 'dsl-build',
        success: false,
        ok: false,
        dslPath: manifestPath,
        diagnostics: [
          {
            code: 'dsl-invalid-include-path',
            message: 'sourceRoot ".." must not contain traversal segments.',
          },
        ],
      });
      expect(failure.stderr).toBe('');
    });
  });

  it('formats Agent DSL in check-only mode without writing the source file', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'format.gmdsl');
      const source = `
title   "Format CLI"
scene start "Start":
    say "Spacing."
`;
      await writeFile(dslPath, source, 'utf8');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'dsl-format',
        dslPath,
        '--json',
      ]);
      const result = JSON.parse(stdout);

      expect(result).toMatchObject({
        success: true,
        ok: true,
        dslPath,
        mode: 'check',
        changed: true,
        wrote: false,
        idempotent: true,
      });
      expect(result.formattedSource).toBe(`title "Format CLI"

scene start "Start":
  say "Spacing."
`);
      expect(await readFile(dslPath, 'utf8')).toBe(source);
    });
  });

  it('writes Agent DSL formatting only with --write and remains idempotent', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'format-write.dsl');
      await writeFile(dslPath, `
scene start "Start":
    say "Write."
`, 'utf8');

      const first = JSON.parse((await execFileAsync('node', [
        cliPath,
        'dsl-format',
        dslPath,
        '--write',
        '--json',
      ])).stdout);
      const formatted = await readFile(dslPath, 'utf8');
      const second = JSON.parse((await execFileAsync('node', [
        cliPath,
        'dsl-format',
        dslPath,
        '--write',
        '--json',
      ])).stdout);

      expect(first).toMatchObject({
        success: true,
        ok: true,
        mode: 'write',
        changed: true,
        wrote: true,
        idempotent: true,
      });
      expect(formatted).toBe(`scene start "Start":
  say "Write."
`);
      expect(second).toMatchObject({
        success: true,
        ok: true,
        mode: 'write',
        changed: false,
        wrote: false,
        idempotent: true,
      });
    });
  });

  it('returns structured diagnostics for invalid dsl-format input', async () => {
    await withTempDir(async (dir) => {
      const dslPath = path.join(dir, 'format-broken.dsl');
      await writeFile(dslPath, 'scene start "Start"\n  say "Missing colon."\n', 'utf8');

      let failure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'dsl-format',
          dslPath,
          '--json',
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeTruthy();
      const result = JSON.parse(failure.stdout);
      expect(result).toMatchObject({
        command: 'dsl-format',
        success: false,
        ok: false,
        dslPath,
        diagnostics: [
          {
            severity: 'error',
            code: 'dsl-syntax-error',
            message: 'Expected ":" after scene declaration.',
          },
        ],
        changed: false,
        wrote: false,
      });
      expect(failure.stderr).toBe('');
    });
  });

  it('rejects dsl-format manifest paths until multi-file formatting is defined', async () => {
    await withTempDir(async (dir) => {
      const manifestPath = path.join(dir, 'project.gmdsl.json');
      await writeFile(manifestPath, JSON.stringify({
        version: 1,
        sourceRoot: '.',
        entry: 'main.gmdsl',
      }), 'utf8');

      let failure = null;
      try {
        await execFileAsync('node', [
          cliPath,
          'dsl-format',
          manifestPath,
          '--json',
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeTruthy();
      const result = JSON.parse(failure.stdout);
      expect(result).toMatchObject({
        success: false,
        ok: false,
        dslPath: manifestPath,
        changed: false,
        wrote: false,
        diagnostics: [
          {
            code: 'dsl-invalid-include-path',
            message: 'dsl-format only supports direct .dsl or .gmdsl source files.',
          },
        ],
      });
      expect(failure.stderr).toBe('');
    });
  });

  it('exports a web build from the CLI after readiness passes', async () => {
    await withTempDir(async (dir) => {
      const { projectDir, appRoot } = await createExportFixture(dir);
      const outDir = path.join(dir, 'web-out');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'export-web',
        '--project',
        projectDir,
        '--out',
        outDir,
        '--app-root',
        appRoot,
        '--skip-build',
        '--json',
      ]);
      const result = JSON.parse(stdout);

      expect(result).toMatchObject({
        success: true,
        format: 'web',
        outputPath: outDir,
        readiness: { ready: true },
      });
      expect(await readFile(path.join(outDir, 'index.html'), 'utf8')).toContain('CLI Export Fixture');
      expect(await readFile(path.join(outDir, 'engine.js'), 'utf8')).toBe('// engine');
      await expect(stat(path.join(outDir, 'assets', 'backgrounds', 'city.png'))).resolves.toBeTruthy();
    });
  });

  it('exports a desktop staging build from the CLI in skip-packager mode', async () => {
    await withTempDir(async (dir) => {
      const { projectDir, appRoot } = await createExportFixture(dir);
      const outDir = path.join(dir, 'desktop-out');

      const { stdout } = await execFileAsync('node', [
        cliPath,
        'export-desktop',
        '--project',
        projectDir,
        '--out',
        outDir,
        '--app-root',
        appRoot,
        '--skip-build',
        '--skip-packager',
        '--json',
      ]);
      const result = JSON.parse(stdout);

      expect(result).toMatchObject({
        success: true,
        format: 'desktop',
        readiness: { ready: true },
      });
      expect(await readFile(path.join(result.outputPath, 'package.json'), 'utf8')).toContain('"main": "main.js"');
      expect(await readFile(path.join(result.outputPath, 'main.js'), 'utf8')).toContain('CLI Export Fixture');
      expect(await readFile(path.join(result.outputPath, 'main.js'), 'utf8')).toContain("from './thumbnailSecurity.js'");
      expect(await readFile(path.join(result.outputPath, 'main.js'), 'utf8')).toContain("from './atomicWrite.js'");
      await expect(stat(path.join(result.outputPath, 'atomicWrite.js'))).resolves.toBeTruthy();
      await expect(stat(path.join(result.outputPath, 'thumbnailSecurity.js'))).resolves.toBeTruthy();
      await expect(stat(path.join(result.outputPath, 'assets', 'characters', 'hero_normal.png'))).resolves.toBeTruthy();
    });
  });

  it('blocks CLI export when readiness has blockers', async () => {
    await withTempDir(async (dir) => {
      const { projectDir, appRoot } = await createExportFixture(dir, { missingAsset: true });
      const outDir = path.join(dir, 'blocked-out');

      await expect(execFileAsync('node', [
        cliPath,
        'export-web',
        '--project',
        projectDir,
        '--out',
        outDir,
        '--app-root',
        appRoot,
        '--skip-build',
        '--json',
      ])).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining('"success": false'),
      });
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

  it('lists and resolves editor recent projects for agent sessions', async () => {
    await withTempDir(async (dir) => {
      const projectDir = path.join(dir, 'summer-song');
      await mkdir(projectDir, { recursive: true });
      await writeFile(path.join(projectDir, 'project.json'), JSON.stringify({
        name: '夏日恋曲',
        author: '',
      }), 'utf8');
      await writeFile(path.join(projectDir, 'script.json'), JSON.stringify({
        projectId: 'gm_summer_song',
        characters: {},
        scenes: {},
      }), 'utf8');

      const registryPath = path.join(dir, 'recent-projects.json');
      await writeFile(registryPath, JSON.stringify({
        hasCreatedProject: true,
        projects: [{
          name: '夏日恋曲',
          path: projectDir,
          openedAt: '2026-06-07T00:00:00.000Z',
        }],
      }), 'utf8');

      const list = JSON.parse((await execFileAsync('node', [
        cliPath,
        'projects',
        'list',
        '--registry',
        registryPath,
        '--json',
      ])).stdout);
      expect(list.projects[0]).toMatchObject({
        name: '夏日恋曲',
        path: projectDir,
        scriptPath: path.join(projectDir, 'script.json'),
        valid: true,
      });

      const resolved = JSON.parse((await execFileAsync('node', [
        cliPath,
        'projects',
        'resolve',
        '夏日',
        '--registry',
        registryPath,
        '--json',
      ])).stdout);
      expect(resolved.ok).toBe(true);
      expect(resolved.project.scriptPath).toBe(path.join(projectDir, 'script.json'));
    });
  });

  it('creates and opens registered projects through the agent project commands', async () => {
    await withTempDir(async (dir) => {
      const registryPath = path.join(dir, 'recent-projects.json');
      const projectDir = path.join(dir, 'agent-created-project');

      const created = JSON.parse((await execFileAsync('node', [
        cliPath,
        'projects',
        'create',
        '--out',
        projectDir,
        '--title',
        'Agent Created',
        '--user-data',
        dir,
        '--json',
      ])).stdout);

      expect(created.ok).toBe(true);
      expect(created.registryPath).toBe(registryPath);
      await stat(path.join(projectDir, 'project.json'));
      await stat(path.join(projectDir, 'script.json'));
      await stat(path.join(projectDir, 'assets', 'backgrounds'));
      await stat(path.join(projectDir, 'assets', 'videos'));

      const opened = JSON.parse((await execFileAsync('node', [
        cliPath,
        'projects',
        'open',
        'Agent',
        '--user-data',
        dir,
        '--json',
      ])).stdout);

      expect(opened.ok).toBe(true);
      expect(opened.project.scriptPath).toBe(path.join(projectDir, 'script.json'));
      const request = JSON.parse(await readFile(path.join(dir, 'pending-open-project.json'), 'utf8'));
      expect(request.projectPath).toBe(projectDir);
    });
  });

  it('generates safe default project paths from the title', async () => {
    await withTempDir(async (dir) => {
      const projectsRoot = path.join(dir, 'Galgame Maker', 'Projects');
      const resolved = await resolveProjectPathForCreate({
        title: 'A:Story?/Final',
        env: { GALGAME_MAKER_PROJECTS_DIR: projectsRoot },
        appRoot: path.join(dir, 'repo'),
        tmpDir: path.join(dir, 'other-temp'),
      });

      expect(sanitizeProjectName('A:Story?/Final')).toBe('A_Story__Final');
      expect(sanitizeProjectName('.')).toBe('untitled');
      expect(sanitizeProjectName('CON')).toBe('untitled');
      expect(sanitizeProjectName('After School.')).toBe('After School');
      expect(getRecommendedProjectRootCandidates({
        env: { GALGAME_MAKER_PROJECTS_DIR: projectsRoot },
        platform: 'win32',
        homeDir: dir,
      })[0]).toBe(path.resolve(projectsRoot));
      expect(getRecommendedProjectRootCandidates({
        env: { USERPROFILE: dir },
        platform: 'win32',
        homeDir: dir,
      })[0]).toBe(path.join(dir, 'Documents', 'Galgame Maker', 'Projects'));
      expect(resolved).toMatchObject({
        projectPath: path.join(projectsRoot, 'A_Story__Final'),
        projectRoot: projectsRoot,
        generated: true,
      });
    });
  });

  it('creates projects without --out in the recommended projects directory', async () => {
    const defaultRoot = path.resolve(process.cwd(), '..', `.tmp-galgame-projects-${Date.now()}`);
    try {
      await withTempDir(async (dir) => {
        const created = JSON.parse((await execFileAsync('node', [
          cliPath,
          'projects',
          'create',
          '--title',
          'Agent Default Path',
          '--user-data',
          dir,
          '--json',
        ], {
          env: {
            ...process.env,
            GALGAME_MAKER_PROJECTS_DIR: defaultRoot,
          },
        })).stdout);

        const projectDir = path.join(defaultRoot, 'Agent Default Path');
        expect(created.ok).toBe(true);
        expect(created.createPath).toMatchObject({
          projectPath: projectDir,
          projectRoot: defaultRoot,
          generated: true,
        });
        expect(created.project.scriptPath).toBe(path.join(projectDir, 'script.json'));
        await stat(path.join(projectDir, 'project.json'));
        await stat(path.join(projectDir, 'script.json'));
      });
    } finally {
      await rm(defaultRoot, { recursive: true, force: true });
    }
  });

  it('recommends project creation paths without creating directories', async () => {
    const defaultRoot = path.resolve(process.cwd(), '..', `.tmp-galgame-recommend-${Date.now()}`);
    try {
      await withTempDir(async (dir) => {
        const recommended = JSON.parse((await execFileAsync('node', [
          cliPath,
          'projects',
          'recommend-create',
          '--title',
          'Ask First',
          '--user-data',
          dir,
          '--json',
        ], {
          env: {
            ...process.env,
            GALGAME_MAKER_PROJECTS_DIR: defaultRoot,
          },
        })).stdout);

        expect(recommended.ok).toBe(true);
        expect(recommended.createPath).toMatchObject({
          projectRoot: defaultRoot,
          projectPath: path.join(defaultRoot, 'Ask First'),
          generated: true,
        });
        expect(recommended.guidance).toMatchObject({
          askBeforeCreate: true,
          createCommand: expect.stringContaining('--out'),
        });
        await expect(stat(defaultRoot)).rejects.toMatchObject({ code: 'ENOENT' });
      });
    } finally {
      await rm(defaultRoot, { recursive: true, force: true });
    }
  });

  it('prefers the editor registry that stores a project library', async () => {
    const libraryDir = path.resolve(process.cwd(), '..', `.tmp-editor-library-${Date.now()}`);
    try {
      await withTempDir(async (dir) => {
        const appData = path.join(dir, 'AppData');
        const staleUserData = path.join(appData, 'Galgame Maker');
        const editorUserData = path.join(appData, 'galgame-maker');
        await mkdir(staleUserData, { recursive: true });
        await mkdir(editorUserData, { recursive: true });
        await writeFile(path.join(staleUserData, 'recent-projects.json'), JSON.stringify({
          hasCreatedProject: true,
          projects: [{ name: 'Old', path: path.join(dir, 'old') }],
        }), 'utf8');
        await writeFile(path.join(editorUserData, 'recent-projects.json'), JSON.stringify({
          hasCreatedProject: true,
          projectLibraryDir: libraryDir,
          projects: [],
        }), 'utf8');

        const recommended = JSON.parse((await execFileAsync('node', [
          cliPath,
          'projects',
          'recommend-create',
          '--title',
          'Library Project',
          '--json',
        ], {
          env: {
            ...process.env,
            APPDATA: appData,
          },
        })).stdout);

        expect(recommended.registryPath).toBe(path.join(editorUserData, 'recent-projects.json'));
        expect(recommended.createPath).toMatchObject({
          projectRoot: libraryDir,
          projectPath: path.join(libraryDir, 'Library Project'),
        });
      });
    } finally {
      await rm(libraryDir, { recursive: true, force: true });
    }
  });

  it('prints project help without creating a default project', async () => {
    const defaultRoot = path.resolve(process.cwd(), '..', `.tmp-galgame-help-${Date.now()}`);
    try {
      const result = await execFileAsync('node', [
        cliPath,
        'projects',
        'create',
        '--help',
      ], {
        env: {
          ...process.env,
          GALGAME_MAKER_PROJECTS_DIR: defaultRoot,
        },
      });

      expect(result.stdout).toContain('projects create [--out dir]');
      await expect(stat(defaultRoot)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(defaultRoot, { recursive: true, force: true });
    }
  });

  it('reports a clear editor executable hint for --open --launch', async () => {
    const defaultRoot = path.resolve(process.cwd(), '..', `.tmp-galgame-launch-${Date.now()}`);
    try {
      await withTempDir(async (dir) => {
        const created = JSON.parse((await execFileAsync('node', [
          cliPath,
          'projects',
          'create',
          '--title',
          'Launch Hint',
          '--open',
          '--launch',
          '--user-data',
          dir,
          '--json',
        ], {
          env: {
            ...process.env,
            GALGAME_MAKER_PROJECTS_DIR: defaultRoot,
            GALGAME_MAKER_EDITOR_EXE: path.join(defaultRoot, 'missing-editor.exe'),
          },
        })).stdout);

        expect(created.ok).toBe(true);
        expect(created.openRequest.request.projectPath).toBe(path.join(defaultRoot, 'Launch Hint'));
        expect(created.launch).toMatchObject({
          attempted: true,
          launched: false,
          error: expect.stringContaining('GALGAME_MAKER_EDITOR_EXE'),
          hint: expect.stringContaining('Set GALGAME_MAKER_EDITOR_EXE'),
        });
      });
    } finally {
      await rm(defaultRoot, { recursive: true, force: true });
    }
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
      await mkdir(path.join(dir, 'assets', 'effects', 'old_film'), { recursive: true });
      await mkdir(path.join(dir, 'assets', 'videos'), { recursive: true });
      await writeFile(path.join(dir, 'assets', 'backgrounds', 'rainy_school_gate.png'), 'bg', 'utf8');
      await writeFile(path.join(dir, 'assets', 'characters', 'sakura_nervous.webp'), 'char', 'utf8');
      await writeFile(path.join(dir, 'assets', 'audio', 'rain_theme.ogg'), 'bgm', 'utf8');
      await writeFile(path.join(dir, 'assets', 'voices', 'sakura_line_001.wav'), 'voice', 'utf8');
      await writeFile(path.join(dir, 'assets', 'ui', 'title', 'logo.png'), 'ui', 'utf8');
      await writeFile(path.join(dir, 'assets', 'fonts', 'story_serif.ttf'), 'font', 'utf8');
      await writeFile(path.join(dir, 'assets', 'effects', 'old_film', 'preview.png'), 'fx', 'utf8');
      await writeFile(path.join(dir, 'assets', 'videos', 'op_main.mp4'), 'video', 'utf8');

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
        categories: ['backgrounds', 'characters', 'audio', 'voices', 'ui', 'fonts', 'effects', 'videos'],
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
      expect(result.assets.effects[0].path).toBe('effects/old_film/preview.png');
      expect(result.assets.videos[0].path).toBe('videos/op_main.mp4');
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
      expect(result.assets.effects).toEqual([]);
      expect(result.assets.videos).toEqual([]);
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

      let failure = null;
      try {
        await execFileAsync('node', [
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
        ]);
      } catch (error) {
        failure = error;
      }

      expect(failure).toMatchObject({
        code: 1,
        stderr: '',
      });
      expect(JSON.parse(failure.stdout)).toMatchObject({
        success: false,
        error: expect.stringContaining('Unsupported screen layout id: titleScreen'),
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

  it('applies video registry and OP/ED video operations through CLI and apply-plan with changed paths', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'video-plan.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_video_authoring',
        characters: {},
        scenes: {
          start: {
            pages: [],
          },
          after_video: {
            pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'After video.' }] }],
          },
        },
      }), 'utf8');
      await writeFile(planPath, JSON.stringify({
        version: 1,
        operations: [
          {
            command: 'add-video',
            params: {
              id: 'op_main',
              file: 'videos/op_main.mp4',
              poster: 'videos/op_main.poster.png',
              label: 'Main OP',
              kind: 'op',
              tags: ['opening'],
              durationMs: 90000,
            },
          },
          {
            command: 'add-video',
            params: {
              id: 'ed_good',
              file: 'videos/ed_good.webm',
              label: 'Good ED',
              kind: 'ed',
            },
          },
          {
            command: 'set-opening-video',
            params: {
              video: { videoId: 'op_main', play: 'after-start', oncePerProfile: true },
            },
          },
          {
            command: 'add-ending',
            params: { id: 'good_end', title: 'Good End' },
          },
          {
            command: 'set-ending-video',
            params: {
              ending: 'good_end',
              video: { videoId: 'ed_good', play: 'manual' },
            },
          },
          {
            command: 'add-page',
            params: {
              scene: 'start',
              type: 'video',
              videoId: 'op_main',
              autoAdvance: true,
              target: 'after_video',
            },
          },
        ],
      }), 'utf8');

      const result = JSON.parse((await execFileAsync('node', [
        cliPath, 'apply-plan', planPath, '--script', scriptPath, '--force', '--json',
      ])).stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.validation.ok).toBe(true);
      expect(result.changeSummary.changedPaths).toEqual(expect.arrayContaining([
        'assets.videos.op_main',
        'assets.videos.ed_good',
        'ui.titleScreen.openingVideo',
        'systems.endings.good_end',
        'systems.endings.good_end.endingVideo',
        'scenes.start.pages.0',
      ]));
      expect(script.assets.videos.op_main).toMatchObject({
        file: 'videos/op_main.mp4',
        poster: 'videos/op_main.poster.png',
        label: 'Main OP',
        kind: 'op',
        tags: ['opening'],
        durationMs: 90000,
      });
      expect(script.ui.titleScreen.openingVideo).toEqual({
        videoId: 'op_main',
        play: 'after-start',
        oncePerProfile: true,
      });
      expect(script.systems.endings.good_end.endingVideo).toEqual({
        videoId: 'ed_good',
        play: 'manual',
      });
      expect(script.scenes.start.pages[0]).toMatchObject({
        type: 'video',
        video: { videoId: 'op_main' },
        autoAdvance: true,
        target: 'after_video',
      });

      const list = JSON.parse((await execFileAsync('node', [
        cliPath, 'list-videos', '--script', scriptPath, '--json',
      ])).stdout);
      expect(list.videos).toEqual(expect.arrayContaining([
        expect.objectContaining({ videoId: 'op_main', label: 'Main OP' }),
        expect.objectContaining({ videoId: 'ed_good', label: 'Good ED' }),
      ]));

      const update = JSON.parse((await execFileAsync('node', [
        cliPath, 'update-video', '--script', scriptPath, '--id', 'op_main',
        '--label', 'Main Opening Movie', '--kind', 'story', '--force', '--json',
      ])).stdout);
      expect(update.changeSummary.changedPaths).toEqual(['assets.videos.op_main']);
      expect(JSON.parse(await readFile(scriptPath, 'utf8')).assets.videos.op_main).toMatchObject({
        label: 'Main Opening Movie',
        kind: 'story',
      });

      const openingUpdate = JSON.parse((await execFileAsync('node', [
        cliPath, 'set-opening-video', '--script', scriptPath,
        '--opening-video', JSON.stringify({ videoId: 'op_main', play: 'after-start', oncePerProfile: false }),
        '--force', '--json',
      ])).stdout);
      expect(openingUpdate.changeSummary.changedPaths).toEqual(['ui.titleScreen.openingVideo']);
      expect(JSON.parse(await readFile(scriptPath, 'utf8')).ui.titleScreen.openingVideo).toEqual({
        videoId: 'op_main',
        play: 'after-start',
        oncePerProfile: false,
      });

      const endingVideoUpdate = JSON.parse((await execFileAsync('node', [
        cliPath, 'set-ending-video', '--script', scriptPath, '--id', 'good_end',
        '--ending-video', JSON.stringify({ videoId: 'ed_good', play: 'manual', skippable: false }),
        '--force', '--json',
      ])).stdout);
      expect(endingVideoUpdate.changeSummary.changedPaths).toEqual(['systems.endings.good_end.endingVideo']);
      expect(JSON.parse(await readFile(scriptPath, 'utf8')).systems.endings.good_end.endingVideo).toEqual({
        videoId: 'ed_good',
        play: 'manual',
        skippable: false,
      });

      const unused = JSON.parse((await execFileAsync('node', [
        cliPath, 'add-video', '--script', scriptPath, '--id', 'unused_trailer',
        '--file', 'videos/unused_trailer.mp4', '--kind', 'other', '--force', '--json',
      ])).stdout);
      expect(unused.changeSummary.changedPaths).toEqual(['assets.videos.unused_trailer']);

      const removed = JSON.parse((await execFileAsync('node', [
        cliPath, 'remove-video', '--script', scriptPath, '--id', 'unused_trailer',
        '--force', '--json',
      ])).stdout);
      expect(removed.changeSummary.changedPaths).toEqual(['assets.videos.unused_trailer']);
      expect(JSON.parse(await readFile(scriptPath, 'utf8')).assets.videos.unused_trailer).toBeUndefined();

      const removedReferenced = JSON.parse((await execFileAsync('node', [
        cliPath, 'remove-video', '--script', scriptPath, '--id', 'op_main',
        '--force-references', '--force', '--json',
      ])).stdout);
      const afterReferencedRemoval = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(removedReferenced.validation.ok).toBe(true);
      expect(removedReferenced.result).toMatchObject({
        deletedVideoId: 'op_main',
        deletedReferenceCount: 2,
      });
      expect(afterReferencedRemoval.assets.videos.op_main).toBeUndefined();
      expect(afterReferencedRemoval.ui.titleScreen.openingVideo).toBeUndefined();
      expect(afterReferencedRemoval.scenes.start.pages).toEqual([]);
    });
  });

  it('adds direct CLI video pages without null playback fields and accepts bare boolean flags', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_video_page_direct',
        characters: {},
        assets: {
          videos: {
            intro: { file: 'videos/intro.mp4', kind: 'story' },
          },
        },
        ui: { titleScreen: {} },
        systems: { endings: {}, gallery: { cg: {} }, variables: {} },
        scenes: {
          start: { pages: [] },
        },
      }), 'utf8');

      const minimal = JSON.parse((await execFileAsync('node', [
        cliPath, 'add-page', '--script', scriptPath, '--scene', 'start',
        '--type', 'video', '--video-id', 'intro', '--force', '--json',
      ])).stdout);
      expect(minimal.validation.ok).toBe(true);

      const flagged = JSON.parse((await execFileAsync('node', [
        cliPath, 'add-page', '--script', scriptPath, '--scene', 'start',
        '--type', 'video', '--video-id', 'intro', '--skippable', '--controls',
        '--volume', '0.7', '--audio-mode', 'duck', '--fit', 'native',
        '--auto-advance', 'false', '--loop', 'false', '--force', '--json',
      ])).stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(flagged.validation.ok).toBe(true);
      expect(script.scenes.start.pages[0].video).toEqual({ videoId: 'intro' });
      expect(script.scenes.start.pages[0].video).not.toHaveProperty('audioMode');
      expect(script.scenes.start.pages[0].video).not.toHaveProperty('fit');
      expect(script.scenes.start.pages[1]).toMatchObject({
        type: 'video',
        video: {
          videoId: 'intro',
          skippable: true,
          controls: true,
          volume: 0.7,
          audioMode: 'duck',
          fit: 'native',
        },
        autoAdvance: false,
        loop: false,
      });
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
        'noise-dissolve',
        'ripple',
        'burn',
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

  it('parses equals-form CLI option values', async () => {
    const catalog = JSON.parse((await execFileAsync('node', [
      cliPath,
      'list-transitions',
      '--target=background',
      '--supported-only=true',
      '--json',
    ])).stdout);

    expect(catalog.target).toBe('background');
    expect(catalog.supportedOnly).toBe(true);
    expect(catalog.transitions.length).toBeGreaterThan(0);
    expect(catalog.transitions.every(entry => entry.target === 'background')).toBe(true);
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
              { type: 'normal', background: 'backgrounds/hall.png', dialogues: [{ text: 'A quiet beat.' }] },
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
        matchedPageIndexes: [0, 1],
        changedPaths: [
          'scenes.start.pages.0.transition',
          'scenes.start.pages.1.transition',
        ],
        transition: { type: 'dissolve', duration: 650 },
      });

      const planPath = path.join(dir, 'bulk-transition-plan.json');
      const resultPath = path.join(dir, 'bulk-transition-result.json');
      await writeFile(planPath, JSON.stringify({
        operations: [{
          command: 'set-page-transitions',
          params: {
            scene: 'start',
            predicate: { pageType: 'normal', hasBackground: true },
            type: 'noise-dissolve',
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
        '--result-out',
        resultPath,
        '--json',
      ])).stdout);
      expect(planResult.operations[0]).toMatchObject({
        command: 'set-page-transitions',
        changedPaths: [
          'scenes.start.pages.0.transition',
          'scenes.start.pages.1.transition',
          'scenes.start.pages.3.transition',
        ],
      });
      expect(planResult.operations[0].result).toMatchObject({
        matchedPageIndexes: [0, 1, 3],
        transition: { type: 'noise-dissolve', duration: 5000 },
      });

      const updatedScript = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(updatedScript.scenes.start.pages.map(page => page.transition ?? null)).toEqual([
        { type: 'noise-dissolve', duration: 5000 },
        { type: 'noise-dissolve', duration: 5000 },
        null,
        { type: 'noise-dissolve', duration: 5000 },
      ]);

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
          pageIndex: 0,
          reason: 'changed-transition',
          pathString: 'scenes.start.pages.0.transition',
        }),
        expect.objectContaining({
          sceneId: 'start',
          pageIndex: 3,
          reason: 'changed-transition',
          pathString: 'scenes.start.pages.3.transition',
        }),
      ]));
      expect(authorCheck.focus.previewTargets).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'scene',
          sceneId: 'start',
          pageIndex: 0,
          reason: 'changed-transition',
        }),
      ]));
      expect(authorCheck.transitionPreviewIssues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          category: 'transition-preview',
          pathString: 'scenes.start.pages.0.transition',
        }),
      ]));
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

  it('applies manifest-only effect packs through direct CLI, apply-plan, and author-check focus', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_effect_packs',
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

      const manifest = {
        id: 'old_film',
        label: 'Old Film',
        kind: 'postprocess',
        adapter: 'canvas2d:film-flicker',
        paramsSchema: {
          intensity: { type: 'number', default: 0.45, minimum: 0, maximum: 1 },
          grain: { type: 'number', default: 0.35, minimum: 0, maximum: 1 },
          flicker: { type: 'number', default: 0.2, minimum: 0, maximum: 1 },
        },
        files: [
          { path: 'effects/old_film/effect.json', role: 'manifest' },
          { path: 'effects/old_film/preview.png', role: 'preview' },
        ],
      };

      const registerResult = JSON.parse((await execFileAsync('node', [
        cliPath,
        'register-effect-pack',
        '--script',
        scriptPath,
        '--manifest-json',
        JSON.stringify(manifest),
        '--force',
        '--json',
      ])).stdout);
      expect(registerResult.result).toMatchObject({
        effectPackId: 'old_film',
        pathString: 'assets.effectPacks.old_film',
        changedPaths: ['assets.effectPacks.old_film'],
      });

      const catalog = JSON.parse((await execFileAsync('node', [
        cliPath,
        'list-effect-packs',
        '--script',
        scriptPath,
        '--json',
      ])).stdout);
      expect(catalog.builtInAdapters).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'canvas2d:film-flicker' }),
      ]));
      expect(catalog.effectPacks).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'old_film',
          adapter: 'canvas2d:film-flicker',
        }),
      ]));

      const directResult = JSON.parse((await execFileAsync('node', [
        cliPath,
        'set-page-effect-pack',
        '--script',
        scriptPath,
        '--scene',
        'start',
        '--page',
        '0',
        '--id',
        'old_film',
        '--params-json',
        JSON.stringify({ intensity: 0.5, grain: 0.4 }),
        '--force',
        '--json',
      ])).stdout);
      expect(directResult.result).toMatchObject({
        sceneId: 'start',
        pageIndex: 0,
        effectPackId: 'old_film',
        pathString: 'scenes.start.pages.0.effectPacks',
      });
      expect(directResult.result.effectPacks).toEqual([
        { id: 'old_film', enabled: true, params: { intensity: 0.5, grain: 0.4, flicker: 0.2 } },
      ]);

      const planPath = path.join(dir, 'effect-pack-plan.json');
      const resultPath = path.join(dir, 'effect-pack-result.json');
      await writeFile(planPath, JSON.stringify({
        operations: [
          {
            id: 'set-page-1-effect-pack',
            command: 'set-page-effect-pack',
            params: {
              scene: 'start',
              page: 1,
              effectPackId: 'old_film',
              params: { intensity: 0.8, flicker: 0.3 },
            },
          },
          {
            id: 'clear-page-0-effect-pack',
            command: 'clear-page-effect-packs',
            params: { scene: 'start', page: 0 },
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
          id: 'set-page-1-effect-pack',
          command: 'set-page-effect-pack',
          changedPaths: ['scenes.start.pages.1.effectPacks'],
        }),
        expect.objectContaining({
          id: 'clear-page-0-effect-pack',
          command: 'clear-page-effect-packs',
          changedPaths: ['scenes.start.pages.0.effectPacks'],
        }),
      ]));
      expect(planResult.changeSummary.changedPaths).toEqual([
        'scenes.start.pages.1.effectPacks',
        'scenes.start.pages.0.effectPacks',
      ]);

      const updatedScript = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(updatedScript.scenes.start.pages[0]).not.toHaveProperty('effectPacks');
      expect(updatedScript.scenes.start.pages[1].effectPacks).toEqual([
        { id: 'old_film', enabled: true, params: { intensity: 0.8, grain: 0.35, flicker: 0.3 } },
      ]);

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
          reason: 'changed-effect-packs',
          pathString: 'scenes.start.pages.1.effectPacks',
        }),
      ]));
      expect(authorCheck.effectPackPreviewIssues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          category: 'effect-pack-preview',
          pathString: 'scenes.start.pages.1.effectPacks',
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
          changedPaths: [
            'scenes.start.pages.0',
            'scenes.start.pages.1',
            ...Array.from({ length: 20 }, (_, index) => `meta.audit.path${index}`),
          ],
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
        changedPaths: expect.arrayContaining(['scenes.start.pages.0', 'scenes.start.pages.1']),
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
        changedPathCount: 22,
        omittedChangedPathCount: 2,
      });
      expect(result.transactionSummary.changedPaths).toHaveLength(20);
      expect(result.focus.changedPaths).toHaveLength(22);
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

  it('surfaces video preview targets for transaction changed video paths', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const transactionPath = path.join(dir, 'video-transaction.json');
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_video_author_check',
        assets: {
          videos: {
            op_main: { file: 'videos/op-main.mp4', label: 'Opening' },
            ed_good: { file: 'videos/ed-good.webm', label: 'Good Ending' },
          },
        },
        ui: {
          titleScreen: {
            openingVideo: { videoId: 'op_main', play: 'after-start', oncePerProfile: true },
          },
        },
        systems: {
          endings: {
            good_end: {
              title: 'Good End',
              endingVideo: { videoId: 'ed_good', play: 'manual' },
            },
          },
        },
        scenes: {
          start: {
            pages: [{
              type: 'video',
              video: { videoId: 'op_main', autoAdvance: true },
              target: 'after_video',
            }],
          },
          after_video: {
            pages: [{ type: 'normal', dialogues: [{ text: 'After video.' }] }],
          },
        },
      }), 'utf8');
      await writeFile(transactionPath, JSON.stringify({
        transaction: { command: 'apply-plan', status: 'written', wrote: true },
        changeSummary: {
          changedPaths: [
            'assets.videos.op_main',
            'ui.titleScreen.openingVideo',
            'systems.endings.good_end.endingVideo',
            'scenes.start.pages.0.video',
          ],
        },
      }), 'utf8');

      const result = JSON.parse((await execFileAsync('node', [
        cliPath, 'author-check', '--script', scriptPath, '--transaction', transactionPath,
        '--skip-preview', '--skip-asset-check', '--json',
      ])).stdout);

      expect(result.focus.videoTargets).toEqual([
        expect.objectContaining({
          type: 'video',
          pathString: 'assets.videos.op_main',
          reason: 'changed-video-registry',
          videoId: 'op_main',
        }),
        expect.objectContaining({
          type: 'video',
          pathString: 'ui.titleScreen.openingVideo',
          reason: 'changed-opening-video',
        }),
        expect.objectContaining({
          type: 'video',
          pathString: 'systems.endings.good_end.endingVideo',
          reason: 'changed-ending-video',
          endingId: 'good_end',
        }),
        expect.objectContaining({
          type: 'video',
          pathString: 'scenes.start.pages.0.video',
          reason: 'changed-video-page',
          sceneId: 'start',
          pageIndex: 0,
        }),
      ]);
      expect(result.focus.previewTargets).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'video', pathString: 'assets.videos.op_main' }),
        expect.objectContaining({ type: 'video', pathString: 'ui.titleScreen.openingVideo' }),
        expect.objectContaining({ type: 'video', pathString: 'systems.endings.good_end.endingVideo' }),
        expect.objectContaining({ type: 'video', pathString: 'scenes.start.pages.0.video' }),
      ]));
      expect(result.summary.videoPreviewReviewItems).toBe(4);
      expect(result.videoPreview.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          category: 'video-preview',
          code: 'video-preview-required',
          pathString: 'assets.videos.op_main',
          videoId: 'op_main',
        }),
        expect.objectContaining({
          category: 'video-preview',
          code: 'video-preview-required',
          pathString: 'systems.endings.good_end.endingVideo',
          endingId: 'good_end',
        }),
        expect.objectContaining({
          category: 'video-preview',
          code: 'video-preview-required',
          pathString: 'scenes.start.pages.0.video',
          sceneId: 'start',
          pageIndex: 0,
        }),
      ]));
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'preview',
          category: 'video-preview',
          code: 'video-preview-required',
          pathString: 'ui.titleScreen.openingVideo',
        }),
      ]));
      expect(result.suggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          source: 'preview',
          code: 'video-preview-required',
          pathString: 'assets.videos.op_main',
        }),
      ]));
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
          changedPaths: [
            'scenes.start',
            'scenes.unused_checkpoint_scene',
            ...Array.from({ length: 23 }, (_, index) => `meta.audit.path${index}`),
          ],
          validation: { ok: true, errorCount: 0, warningCount: 0 },
        },
      }), 'utf8');

      let handoffFailure;
      try {
        await execFileAsync('node', [
          cliPath,
          'handoff-report',
          '--script', scriptPath,
          '--transaction', transactionPath,
          '--checkpoint-dir', checkpointDir,
          '--write-editor-handoff',
          '--skip-asset-check',
          '--note', 'Review the agent-authored changes.',
          '--json',
        ]);
      } catch (error) {
        handoffFailure = error;
      }
      expect(handoffFailure).toMatchObject({ code: 1, stdout: expect.any(String) });

      const handoff = JSON.parse(await readFile(outPath, 'utf8'));
      const cliHandoff = JSON.parse(handoffFailure.stdout);
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
          changedPathCount: 25,
          omittedChangedPathCount: 5,
        },
        notes: ['Review the agent-authored changes.'],
      });
      expect(handoff.transactionSummary.changedPaths).toHaveLength(20);
      expect(cliHandoff.transactionSummary).toEqual(handoff.transactionSummary);
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

  it('keeps five handoff checkpoints by default and honors --checkpoint-limit', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const checkpointDir = path.join(dir, '.checkpoints');
      await mkdir(checkpointDir);
      await writeFile(scriptPath, JSON.stringify({
        projectId: 'gm_cli_checkpoint_limit',
        characters: {},
        scenes: { start: { pages: [{ type: 'normal', characters: [], dialogues: [] }] } },
      }), 'utf8');

      for (let index = 0; index < 7; index += 1) {
        const checkpointPath = path.join(checkpointDir, `checkpoint-${index}.json`);
        await writeFile(checkpointPath, '{}', 'utf8');
        const timestamp = new Date(Date.UTC(2026, 0, 1, 0, 0, index));
        await utimes(checkpointPath, timestamp, timestamp);
      }

      async function writeHandoff(name, extraArgs = []) {
        const outPath = path.join(dir, name);
        try {
          await execFileAsync('node', [
            cliPath,
            'handoff-report',
            '--script', scriptPath,
            '--checkpoint-dir', checkpointDir,
            '--out', outPath,
            '--skip-asset-check',
            '--json',
            ...extraArgs,
          ]);
        } catch (error) {
          expect(error.stdout).toEqual(expect.any(String));
        }
        return JSON.parse(await readFile(outPath, 'utf8'));
      }

      const defaultHandoff = await writeHandoff('default-handoff.json');
      expect(defaultHandoff.checkpoints).toHaveLength(5);
      expect(defaultHandoff.checkpoints.map(entry => entry.name)).toEqual([
        'checkpoint-6.json',
        'checkpoint-5.json',
        'checkpoint-4.json',
        'checkpoint-3.json',
        'checkpoint-2.json',
      ]);

      const limitedHandoff = await writeHandoff('limited-handoff.json', ['--checkpoint-limit', '2']);
      expect(limitedHandoff.checkpoints).toHaveLength(2);
      expect(limitedHandoff.checkpoints.map(entry => entry.name)).toEqual([
        'checkpoint-6.json',
        'checkpoint-5.json',
      ]);
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
