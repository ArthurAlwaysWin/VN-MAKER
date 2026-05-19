/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { useProjectStore } from '../src/editor/stores/project.js';
import { parseScenePath, summarizeHandoffByScene } from '../src/editor/utils/agentHandoff.js';

describe('agent handoff editor integration', () => {
  afterEach(() => {
    delete window.ipcRenderer;
    vi.clearAllMocks();
  });

  it('loads agent-handoff.json after opening a project and clears it on close', async () => {
    setActivePinia(createPinia());
    const handoff = {
      kind: 'agent-authoring-handoff',
      gates: { validation: true, layout: false, readiness: true },
      reviewItems: [{ source: 'layout', code: 'layout-blank-page' }],
    };
    window.ipcRenderer = {
      invoke: vi.fn(async (channel) => {
        if (channel === 'load-project') {
          return {
            success: true,
            path: 'E:/demo-project',
            project: { name: 'Demo Project' },
          };
        }
        if (channel === 'read-agent-handoff') {
          return {
            success: true,
            handoff,
            path: 'E:/demo-project/agent-handoff.json',
          };
        }
        return { success: true };
      }),
    };

    const project = useProjectStore();
    await project.loadProject('E:/demo-project');

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('read-agent-handoff');
    expect(project.agentHandoff).toEqual(handoff);
    expect(project.agentHandoffPath).toBe('E:/demo-project/agent-handoff.json');

    project.closeProject();
    expect(project.agentHandoff).toBeNull();
    expect(project.agentHandoffPath).toBeNull();
  });

  it('exposes the safe handoff IPC channel through preload', () => {
    const preload = readFileSync(resolve(process.cwd(), 'electron', 'preload.js'), 'utf8');
    const main = readFileSync(resolve(process.cwd(), 'electron', 'main.js'), 'utf8');
    expect(preload).toContain("'read-agent-handoff'");
    expect(main).toContain("ipcMain.handle('read-agent-handoff'");
    expect(main).toContain("'agent-handoff.json'");
  });

  it('renders compact handoff gates and review items in ProjectSettings', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'views', 'ProjectSettings.vue'),
      'utf8',
    );

    expect(source).toContain('外部 Agent 交接');
    expect(source).toContain('agentGateRows');
    expect(source).toContain('agentReviewItems');
    expect(source).toContain('agentChangedPaths');
    expect(source).toContain('transactionSummary');
    expect(source).toContain('project.loadAgentHandoff()');
    expect(source).toContain('latestCheckpointPath');
  });

  it('summarizes handoff changed paths and review items by scene for editor navigation', () => {
    const summary = summarizeHandoffByScene({
      transactionSummary: {
        changedPaths: [
          'scenes.start',
          'scenes.start.pages.1',
          'scenes.ending.pages.0.dialogues.0.text',
        ],
      },
      reviewItems: [
        {
          source: 'scene-references',
          code: 'scene-incoming-references',
          sceneId: 'ending',
          pathString: 'scenes.ending',
          referenceCount: 2,
        },
        {
          source: 'layout',
          code: 'layout-dialogue-on-blank-stage',
          pathString: 'scenes.start.pages.1',
        },
      ],
    });

    expect(parseScenePath('scenes.start.pages.3.dialogues.0.text')).toEqual({
      sceneId: 'start',
      pageIndex: 3,
    });
    expect(summary.start).toMatchObject({
      changedPaths: ['scenes.start', 'scenes.start.pages.1'],
      changedPages: [1],
      incomingReferenceCount: 0,
    });
    expect(summary.start.reviewItems).toEqual([
      expect.objectContaining({ code: 'layout-dialogue-on-blank-stage' }),
    ]);
    expect(summary.ending).toMatchObject({
      changedPages: [0],
      incomingReferenceCount: 2,
    });
  });

  it('surfaces handoff badges in the PageEditor scene tree', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'page-editor', 'SceneTree.vue'),
      'utf8',
    );

    expect(source).toContain('summarizeHandoffByScene');
    expect(source).toContain('hasAgentSceneChange');
    expect(source).toContain('agentIncomingReferenceCount');
    expect(source).toContain('agentReviewCount');
    expect(source).toContain('agent-page-dot');
  });
});
