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
  const dir = await mkdtemp(path.join(tmpdir(), 'ui-motion-flow-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function baseScript() {
  return {
    projectId: 'gm_ui_motion',
    characters: {},
    scenes: {
      start: {
        pages: [
          { type: 'normal', dialogues: [{ speaker: null, text: 'Motion.' }] },
        ],
      },
    },
  };
}

describe('UI motion contract-first flow', () => {
  it('authors ui.motion through project session with exact changed path', () => {
    const session = createProjectSession({ script: baseScript() });

    expect(session.setUiMotion({
      motion: {
        intensity: 'dramatic',
        title: 'cinematic-slow',
        choices: 'suspense-delay',
      },
    })).toEqual({
      uiPath: 'ui.motion',
      motion: {
        intensity: 'dramatic',
        title: 'cinematic-slow',
        dialogue: 'soft-pop',
        choices: 'suspense-delay',
        menus: 'panel-fade',
      },
      changedPaths: ['ui.motion'],
    });
    expect(session.toJSON().ui.motion.choices).toBe('suspense-delay');
  });

  it('validates unsupported ui.motion values without blocking export', () => {
    const report = validateProject({
      ...baseScript(),
      ui: {
        motion: {
          intensity: 'extreme',
          title: 'spin',
        },
      },
    });

    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'invalid-ui-motion-intensity',
        pathString: 'ui.motion.intensity',
      }),
      expect.objectContaining({
        code: 'invalid-ui-motion-preset',
        pathString: 'ui.motion.title',
      }),
    ]));
  });

  it('routes ui.motion handoff to all major screen previews', () => {
    const handoff = createAgentHandoff(baseScript(), {
      readiness: { knownAssets: [], requireAssetCheck: false },
      transaction: {
        transaction: { command: 'set-ui-motion', status: 'written', wrote: true },
        changeSummary: { changedPaths: ['ui.motion'] },
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
        screenId: 'titleScreen',
      }),
    ]));
  });

  it('supports direct CLI and apply-plan set-ui-motion', async () => {
    await withTempDir(async (dir) => {
      const scriptPath = path.join(dir, 'script.json');
      const planPath = path.join(dir, 'motion-plan.json');
      await writeFile(scriptPath, JSON.stringify(baseScript()), 'utf8');
      await writeFile(planPath, JSON.stringify({
        operations: [
          {
            id: 'motion',
            command: 'set-ui-motion',
            params: {
              intensity: 'subtle',
              title: 'glow-pulse',
              dialogue: 'slide-up',
              choices: 'card-pop',
              menus: 'panel-slide',
            },
          },
        ],
      }), 'utf8');

      const direct = JSON.parse((await execFileAsync('node', [
        cliPath,
        'set-ui-motion',
        '--script',
        scriptPath,
        '--intensity',
        'dramatic',
        '--title',
        'cinematic-slow',
        '--force',
        '--json',
      ])).stdout);
      expect(direct.changeSummary.changedPaths).toEqual(['ui.motion']);
      expect(direct.result.motion).toMatchObject({
        intensity: 'dramatic',
        title: 'cinematic-slow',
      });

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
        id: 'motion',
        command: 'set-ui-motion',
        changedPaths: ['ui.motion'],
      });
      expect(plan.changeSummary.changedPaths).toEqual(['ui.motion']);

      const updated = JSON.parse(await readFile(scriptPath, 'utf8'));
      expect(updated.ui.motion).toEqual({
        intensity: 'subtle',
        title: 'glow-pulse',
        dialogue: 'slide-up',
        choices: 'card-pop',
        menus: 'panel-slide',
      });
    });
  });

  it('wires runtime root motion classes and preview update messages', () => {
    return Promise.all([
      readFile(path.resolve('src/main.js'), 'utf8'),
      readFile(path.resolve('src/style.css'), 'utf8'),
      readFile(path.resolve('src/editor/views/ProjectSettings.vue'), 'utf8'),
    ]).then(([mainSource, styleSource, projectSettingsSource]) => {
      expect(mainSource).toContain('applyUiMotion(engine.script.ui?.motion)');
      expect(mainSource).toContain("case 'update-ui-motion'");
      expect(styleSource).toContain('.gm-motion-intensity-off');
      expect(styleSource).toContain('.gm-motion-title-glow-pulse');
      expect(projectSettingsSource).toContain('UI_MOTION_FIELD_SCHEMA');
      expect(projectSettingsSource).toContain('script.updateUiMotion(next)');
    });
  });
});
