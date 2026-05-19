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
