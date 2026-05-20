/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { useProjectStore } from '../src/editor/stores/project.js';
import {
  groupHandoffReviewByPath,
  parseAgentPathTarget,
  parseScenePath,
  summarizeHandoffByScene,
} from '../src/editor/utils/agentHandoff.js';

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
    expect(project.sceneNavigationRequest).toBeNull();
  });

  it('creates scene navigation requests from handoff paths', () => {
    setActivePinia(createPinia());
    const project = useProjectStore();

    expect(project.requestSceneNavigation('scenes.start.pages.2.dialogues.0.text')).toBe(true);
    expect(project.sceneNavigationRequest).toMatchObject({
      pathString: 'scenes.start.pages.2.dialogues.0.text',
      sceneId: 'start',
      pageIndex: 2,
    });
    expect(project.requestSceneNavigation('characters.sakura')).toBe(false);
  });

  it('creates non-scene navigation requests from handoff paths', () => {
    setActivePinia(createPinia());
    const project = useProjectStore();

    expect(project.requestAgentPathNavigation('systems.variables.sakura_affection')).toBe(true);
    expect(project.agentPathNavigationRequest).toMatchObject({
      kind: 'variable',
      tab: 'story-systems',
      id: 'sakura_affection',
    });
    expect(project.requestAgentPathNavigation('characters.sakura')).toBe(true);
    expect(project.agentPathNavigationRequest).toMatchObject({
      kind: 'character',
      tab: 'resource-library',
      id: 'sakura',
    });
    expect(project.requestAgentPathNavigation('unknown.path')).toBe(false);
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
    expect(source).toContain('agentReviewGroups');
    expect(source).toContain('groupHandoffReviewByPath');
    expect(source).toContain('openAgentPath');
    expect(source).toContain('requestAgentPathNavigation');
    expect(source).toContain('agent-locate-btn');
    expect(source).toContain('agent-review-group');
    expect(source).toContain('transactionSummary');
    expect(source).toContain('project.loadAgentHandoff()');
    expect(source).toContain('latestCheckpointPath');
  });

  it('groups handoff review items by scene and non-scene path targets', () => {
    const groups = groupHandoffReviewByPath({
      transactionSummary: {
        changedPaths: [
          'scenes.start.pages.1',
          'characters.sakura',
          'systems.variables.sakura_affection',
          'ui.theme.buttonFamilies.qab',
        ],
      },
      reviewItems: [
        { source: 'layout', code: 'layout-warning', pathString: 'scenes.start.pages.1' },
        { source: 'validation', code: 'missing-character', pathString: 'characters.sakura' },
        { source: 'validation', code: 'bad-variable', pathString: 'systems.variables.sakura_affection' },
      ],
    });

    expect(parseAgentPathTarget('systems.variables.sakura_affection')).toMatchObject({
      kind: 'variable',
      tab: 'story-systems',
      id: 'sakura_affection',
    });
    expect(parseAgentPathTarget('characters.sakura')).toMatchObject({
      kind: 'character',
      tab: 'resource-library',
      id: 'sakura',
    });
    expect(parseAgentPathTarget('ui.theme.buttonFamilies.qab')).toMatchObject({
      kind: 'ui',
      tab: 'project-settings',
    });
    expect(groups.map((group) => group.key)).toEqual([
      'scene:start',
      'characters',
      'systems:variables',
      'ui',
    ]);
    expect(groups.find((group) => group.key === 'characters')).toMatchObject({
      label: 'Characters',
      changedPaths: ['characters.sakura'],
      reviewItems: [expect.objectContaining({ code: 'missing-character' })],
    });
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

  it('wires scene navigation requests through App and PageEditor', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src', 'editor', 'App.vue'), 'utf8');
    const pageEditorSource = readFileSync(resolve(process.cwd(), 'src', 'editor', 'views', 'PageEditor.vue'), 'utf8');
    const sceneTreeSource = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'page-editor', 'SceneTree.vue'),
      'utf8',
    );

    expect(appSource).toContain('project.sceneNavigationRequest');
    expect(appSource).toContain('project.agentPathNavigationRequest');
    expect(appSource).toContain("activeTab.value = 'scenes'");
    expect(appSource).toContain('activeTab.value = request.tab');
    expect(pageEditorSource).toContain('applySceneNavigationRequest');
    expect(pageEditorSource).toContain('editor.selectPage(request.sceneId, pageIndex)');
    expect(sceneTreeSource).toContain('watch(selectedSceneId');
  });
});
