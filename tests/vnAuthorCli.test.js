import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { analyzePreviewScreenshot } from '../tools/vn-author/preview-renderer.js';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('tools/vn-author/index.js');

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

  it('keeps the documented example plan executable by apply-plan dry-run', async () => {
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
        operationCount: 8,
        counts: {
          before: { characters: 0, scenes: 0, pages: 0, variables: 0 },
          after: { characters: 1, scenes: 2, pages: 3, variables: 1 },
          delta: { characters: 1, scenes: 2, pages: 3, variables: 1 },
        },
      });
      expect(script.scenes).toEqual({});
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
        });
        expect(result.changeSummary).toMatchObject({
          completedOperationCount: 0,
          failedOperationIndex: 0,
          changedPaths: [],
        });
      }
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

      const { stdout } = await execFileAsync('node', [
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

      const result = JSON.parse(stdout);
      const script = JSON.parse(await readFile(scriptPath, 'utf8'));

      expect(result.validation.ok).toBe(true);
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
      expect(script.scenes.start.pages[1].options[0].effects).toEqual([
        { type: 'var:add', id: 'affection', value: 3 },
      ]);
    });
  });

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
