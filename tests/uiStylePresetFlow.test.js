import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

import { createAgentHandoff } from '../src/authoring/agentHandoff.js';
import { createProjectSession } from '../src/authoring/projectSession.js';
import { validateProject } from '../src/shared/projectValidator.js';

const execFileAsync = promisify(execFile);
const cliPath = path.resolve('tools/vn-author/index.js');

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'ui-style-preset-flow-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function baseScript() {
  return {
    projectId: 'gm_ui_style_preset_flow',
    characters: {},
    scenes: {
      start: {
        pages: [
          { type: 'normal', dialogues: [{ speaker: null, text: 'Style preset.' }] },
        ],
      },
    },
  };
}

describe('UI style preset contract-first flow', () => {
  it('authors a style preset through project session with exact changed paths', () => {
    const session = createProjectSession({ script: baseScript() });
    expect(session.listUiStylePresets().map((preset) => preset.id)).toContain('dark-cinema');

    const result = session.applyUiStylePreset({
      presetId: 'dark-cinema',
      scope: 'screens',
    });

    expect(result).toMatchObject({
      ok: true,
      presetId: 'dark-cinema',
      scope: 'screens',
      changedPaths: [
        'ui.theme',
        'ui.titleScreen',
        'ui.widgetStyles',
        'ui.gameMenu',
        'ui.saveLoadScreen',
        'ui.backlogScreen',
        'ui.settingsScreen',
        'ui.motion',
      ],
      impactSummary: expect.objectContaining({
        scope: 'screens',
        confirmationRequired: false,
      }),
    });
    expect(result.impactSummary.sections.map((section) => section.label)).toEqual([
      '主题令牌',
      '标题界面',
      '选项与控件',
      '游戏菜单',
      '存读档界面',
      '回想界面',
      '设置界面',
      '界面动效',
    ]);
    expect(session.toJSON().ui.stylePreset).toBeUndefined();
    expect(session.toJSON().ui.titleScreen.elements).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'button', action: 'start' }),
      expect.objectContaining({ type: 'button', action: 'settings' }),
    ]));
    expect(session.toJSON().ui.gameMenu.background).toBe('rgba(0, 0, 0, 0.78)');
    expect(session.toJSON().ui.motion.menus).toBe('panel-fade');
  });

  it('warns if opaque ui.stylePreset data is manually added', () => {
    const report = validateProject({
      ...baseScript(),
      ui: {
        stylePreset: 'suspense-noir',
      },
    });

    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'noncanonical-ui-style-preset-field',
        pathString: 'ui.stylePreset',
        knownPreset: true,
      }),
    ]));
  });

  it('routes preset changes to editable screen previews and handoff review items', () => {
    const handoff = createAgentHandoff(baseScript(), {
      readiness: { knownAssets: [], requireAssetCheck: false },
      transaction: {
        transaction: { command: 'apply-ui-style-preset', status: 'written', wrote: true },
        changeSummary: {
          changedPaths: [
            'ui.theme',
            'ui.titleScreen',
            'ui.dialogueBox',
            'ui.widgetStyles',
            'ui.gameMenu',
            'ui.saveLoadScreen',
            'ui.backlogScreen',
            'ui.settingsScreen',
            'ui.motion',
          ],
        },
      },
    });

    expect(handoff.previewTargets).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'screen', screenId: 'titleScreen' }),
      expect.objectContaining({ type: 'screen', screenId: 'settingsScreen' }),
      expect.objectContaining({ type: 'screen', screenId: 'gameMenu' }),
      expect.objectContaining({ type: 'screen', screenId: 'saveLoadScreen' }),
      expect.objectContaining({ type: 'screen', screenId: 'backlogScreen' }),
    ]));
    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: 'screen-ui-preview',
        code: 'screen-ui-preview-required',
        screenId: 'settingsScreen',
      }),
    ]));
  });

  it('supports list, direct CLI, and apply-plan preset operations', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'style-plan.json');
      await writeFile(scriptPath, JSON.stringify(baseScript()), 'utf8');
      await writeFile(planPath, JSON.stringify({
        operations: [
          {
            id: 'style',
            command: 'apply-ui-style-preset',
            params: {
              preset: 'soft-romance',
              scope: 'dialogue',
            },
          },
        ],
      }), 'utf8');

      const list = JSON.parse((await execFileAsync('node', [
        cliPath,
        'list-ui-style-presets',
        '--json',
      ])).stdout);
      expect(list.presets.map((preset) => preset.id)).toEqual([
        'classic-adv',
        'glass-school',
        'dark-cinema',
        'suspense-noir',
        'sci-fi-hud',
        'soft-romance',
      ]);

      const direct = JSON.parse((await execFileAsync('node', [
        cliPath,
        'apply-ui-style-preset',
        '--script',
        scriptPath,
        '--preset',
        'suspense-noir',
        '--scope',
        'choices',
        '--force',
        '--json',
      ])).stdout);
      expect(direct.changeSummary.changedPaths).toEqual(['ui.theme', 'ui.widgetStyles', 'ui.motion']);
      expect(direct.result.scope).toBe('choices');
      expect(direct.result.impactSummary.sections.map((section) => section.path)).toEqual(['ui.theme', 'ui.widgetStyles', 'ui.motion']);

      const plan = JSON.parse((await execFileAsync('node', [
        cliPath,
        'apply-plan',
        planPath,
        '--script',
        scriptPath,
        '--force',
        '--json',
      ])).stdout);
      expect(plan.operations[0]).toMatchObject({
        id: 'style',
        command: 'apply-ui-style-preset',
        changedPaths: ['ui.theme', 'ui.dialogueBox', 'ui.motion'],
      });
      expect(plan.operations[0].result.impactSummary.changedPaths).toEqual(['ui.theme', 'ui.dialogueBox', 'ui.motion']);
      expect(plan.changeSummary.changedPaths).toEqual(['ui.theme', 'ui.dialogueBox', 'ui.motion']);

      const updated = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(updated.ui.stylePreset).toBeUndefined();
      expect(updated.ui.dialogueBox.nameplateStyle).toBe('floating');
      expect(updated.ui.motion.dialogue).toBe('soft-pop');
    });
  });

  it('wires the no-code Project Settings preset cards and preview path', async () => {
    const source = await readFile(path.resolve('src/editor/views/ProjectSettings.vue'), 'utf8');
    expect(source).toContain('listUiStylePresets');
    expect(source).toContain('uiStylePresetScope');
    expect(source).toContain('uiStylePresetImpactSections');
    expect(source).toContain('previewUiStylePreset');
    expect(source).toContain('window.confirm');
    expect(source).toContain('show-choice-preview');
    expect(source).toContain('script.applyUiStylePreset');
    expect(source).not.toContain('textarea v-model="uiStyle');

    const mainSource = await readFile(path.resolve('src/main.js'), 'utf8');
    expect(mainSource).toContain('titleScreen.setLayout(engine.script.ui?.titleScreen)');
    expect(mainSource).toContain('choiceMenu.setWidgetStyles(engine.script.ui?.widgetStyles)');
    expect(mainSource).toContain('choiceMenu.setWidgetStyles(msg.widgetStyles)');
    expect(mainSource).toContain("case 'titleScreen': titleScreen.show(false); break;");
  });
});
