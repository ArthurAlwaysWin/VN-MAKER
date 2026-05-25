/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { useProjectStore } from '../src/editor/stores/project.js';
import {
  countHandoffReviewStatuses,
  createHandoffReviewItemKey,
  groupHandoffReviewByPath,
  parseAgentPathTarget,
  parseScenePath,
  summarizeHandoffByScene,
} from '../src/editor/utils/agentHandoff.js';

describe('agent handoff editor integration', () => {
  afterEach(() => {
    delete window.ipcRenderer;
    window.localStorage.clear();
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
    expect(project.agentReviewState).toEqual({});
    expect(project.sceneNavigationRequest).toBeNull();
  });

  it('persists local handoff review item lifecycle state by handoff', async () => {
    setActivePinia(createPinia());
    const reviewItem = { source: 'layout', code: 'layout-blank-page', pathString: 'scenes.start.pages.0' };
    const handoff = {
      kind: 'agent-authoring-handoff',
      createdAt: '2026-05-20T10:00:00.000Z',
      reviewItems: [reviewItem],
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

    expect(countHandoffReviewStatuses(handoff, project.agentReviewState)).toEqual({
      open: 1,
      acknowledged: 0,
      resolved: 0,
    });
    expect(project.setAgentReviewItemStatus(reviewItem, 'acknowledged')).toBe(true);
    expect(project.agentReviewState[createHandoffReviewItemKey(reviewItem)]).toMatchObject({
      status: 'acknowledged',
    });
    expect(countHandoffReviewStatuses(handoff, project.agentReviewState)).toEqual({
      open: 0,
      acknowledged: 1,
      resolved: 0,
    });

    expect(project.setAgentReviewItemStatus(reviewItem, 'resolved')).toBe(true);
    expect(countHandoffReviewStatuses(handoff, project.agentReviewState)).toEqual({
      open: 0,
      acknowledged: 0,
      resolved: 1,
    });

    expect(project.clearAgentReviewItemStatus(reviewItem)).toBe(true);
    expect(countHandoffReviewStatuses(handoff, project.agentReviewState)).toEqual({
      open: 1,
      acknowledged: 0,
      resolved: 0,
    });
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
    expect(project.requestAgentPathNavigation('systems.endings.good_end')).toBe(true);
    expect(project.agentPathNavigationRequest).toMatchObject({
      kind: 'ending',
      tab: 'story-systems',
      id: 'good_end',
    });
    expect(project.requestAgentPathNavigation('systems.gallery.cg.confession')).toBe(true);
    expect(project.agentPathNavigationRequest).toMatchObject({
      kind: 'cg',
      tab: 'story-systems',
      id: 'confession',
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
    expect(preload).toContain("'check-project-file-state'");
    expect(main).toContain("ipcMain.handle('read-agent-handoff'");
    expect(main).toContain("ipcMain.handle('check-project-file-state'");
    expect(main).toContain('expectedScriptFileState');
    expect(main).toContain('conflict: true');
    expect(main).toContain("'agent-handoff.json'");
  });

  it('tracks external script changes and blocks stale saves in the project store', async () => {
    setActivePinia(createPinia());
    const loadedState = { path: 'E:/demo-project/script.json', mtimeMs: 1000, size: 10 };
    const changedState = { path: 'E:/demo-project/script.json', mtimeMs: 2000, size: 20 };
    window.ipcRenderer = {
      invoke: vi.fn(async (channel) => {
        if (channel === 'load-project') {
          return {
            success: true,
            path: 'E:/demo-project',
            project: { name: 'Demo Project' },
            script: { projectId: 'demo', scenes: {} },
            scriptFileState: loadedState,
          };
        }
        if (channel === 'read-agent-handoff') {
          return { success: true, handoff: null, path: 'E:/demo-project/agent-handoff.json' };
        }
        if (channel === 'check-project-file-state') {
          return { success: true, scriptFileState: changedState };
        }
        if (channel === 'save-project') {
          return {
            success: false,
            conflict: true,
            scriptFileState: changedState,
            expectedScriptFileState: loadedState,
          };
        }
        return { success: true };
      }),
    };

    const project = useProjectStore();
    await project.loadProject('E:/demo-project');

    expect(project.scriptFileState).toEqual(loadedState);
    await expect(project.checkExternalScriptChange()).resolves.toBe(true);
    expect(project.externalScriptChange).toMatchObject({
      source: 'poll',
      scriptFileState: changedState,
      expectedScriptFileState: loadedState,
    });

    project.clearExternalScriptChange();
    await expect(project.saveProject({ projectId: 'demo', scenes: {} })).resolves.toBe(false);
    expect(project.externalScriptChange).toMatchObject({
      source: 'save-project',
      scriptFileState: changedState,
      expectedScriptFileState: loadedState,
    });
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('save-project', expect.objectContaining({
      expectedScriptFileState: loadedState,
    }));
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
    expect(source).toContain('agentReviewStatusCounts');
    expect(source).toContain('agentPreviewTargets');
    expect(source).toContain('视觉预览目标');
    expect(source).toContain('openPreviewTarget');
    expect(source).toContain('showPreviewScreen');
    expect(source).toContain('getAgentReviewItemLabel');
    expect(source).toContain('reference-screenshot-fidelity');
    expect(source).toContain('reference fidelity');
    expect(source).toContain('ending-list-preview');
    expect(source).toContain('ending preview');
    expect(source).toContain('gallery-preview');
    expect(source).toContain('gallery preview');
    expect(source).toContain('setAgentReviewItemStatus');
    expect(source).toContain('clearAgentReviewItemStatus');
    expect(source).toContain('agent-review-status');
    expect(source).toContain('agent-preview-targets');
    expect(source).toContain('groupHandoffReviewByPath');
    expect(source).toContain('openAgentPath');
    expect(source).toContain('requestAgentPathNavigation');
    expect(source).toContain('agent-locate-btn');
    expect(source).toContain('agent-review-group');
    expect(source).toContain('transactionSummary');
    expect(source).toContain('project.loadAgentHandoff()');
    expect(source).toContain('latestCheckpointPath');
  });

  it('renders external script change warning and reload action in the editor shell', () => {
    const source = readFileSync(resolve(process.cwd(), 'src', 'editor', 'App.vue'), 'utf8');

    expect(source).toContain('project.externalScriptChange');
    expect(source).toContain('检测到 script.json 已被外部工具修改');
    expect(source).toContain('reloadCurrentProject');
    expect(source).toContain('project.checkExternalScriptChange()');
    expect(source).toContain('external-change-banner');
  });

  it('groups handoff review items by scene and non-scene path targets', () => {
    const groups = groupHandoffReviewByPath({
      transactionSummary: {
        changedPaths: [
          'scenes.start.pages.1',
          'characters.sakura',
          'systems.variables.sakura_affection',
          'systems.endings.good_end',
          'systems.gallery.cg.confession',
          'ui.theme.buttonFamilies.qab',
        ],
      },
      reviewItems: [
        { source: 'layout', code: 'layout-warning', pathString: 'scenes.start.pages.1' },
        { source: 'validation', code: 'missing-character', pathString: 'characters.sakura' },
        { source: 'validation', code: 'bad-variable', pathString: 'systems.variables.sakura_affection' },
        { source: 'validation', code: 'ending-never-unlocked', pathString: 'systems.endings.good_end' },
        { source: 'validation', code: 'cg-never-unlocked', pathString: 'systems.gallery.cg.confession' },
      ],
    });

    expect(parseAgentPathTarget('systems.variables.sakura_affection')).toMatchObject({
      kind: 'variable',
      tab: 'story-systems',
      id: 'sakura_affection',
    });
    expect(parseAgentPathTarget('systems.endings.good_end')).toMatchObject({
      kind: 'ending',
      tab: 'story-systems',
      id: 'good_end',
    });
    expect(parseAgentPathTarget('systems.gallery.cg.confession')).toMatchObject({
      kind: 'cg',
      tab: 'story-systems',
      id: 'confession',
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
      'systems:endings',
      'systems:cgs',
      'ui',
    ]);
    expect(groups.find((group) => group.key === 'characters')).toMatchObject({
      label: 'Characters',
      changedPaths: ['characters.sakura'],
      reviewItems: [expect.objectContaining({ code: 'missing-character' })],
    });
    expect(groups.find((group) => group.key === 'systems:endings')).toMatchObject({
      label: 'Endings',
      changedPaths: ['systems.endings.good_end'],
      reviewItems: [expect.objectContaining({ code: 'ending-never-unlocked' })],
    });
    expect(groups.find((group) => group.key === 'systems:cgs')).toMatchObject({
      label: 'CG Gallery',
      changedPaths: ['systems.gallery.cg.confession'],
      reviewItems: [expect.objectContaining({ code: 'cg-never-unlocked' })],
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

  it('wires ending registry editor surfaces and unlock picker source paths', () => {
    const storySystemsSource = readFileSync(resolve(process.cwd(), 'src', 'editor', 'views', 'StorySystems.vue'), 'utf8');
    const pageInspectorSource = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'page-editor', 'PageInspector.vue'),
      'utf8',
    );

    expect(storySystemsSource).toContain('EndingRegistryList');
    expect(storySystemsSource).toContain('EndingInspector');
    expect(storySystemsSource).toContain("script.storySystemsPanel === 'endings'");
    expect(storySystemsSource).toContain('collectEndingUnlockReferences');
    expect(pageInspectorSource).toContain('unlock:ending');
    expect(pageInspectorSource).toContain('addEndingUnlockRow');
    expect(pageInspectorSource).toContain('endingOptions');
    expect(storySystemsSource).toContain('CgRegistryList');
    expect(storySystemsSource).toContain('CgInspector');
    expect(storySystemsSource).toContain("script.storySystemsPanel === 'cgs'");
    expect(storySystemsSource).toContain('collectCgUnlockReferences');
    expect(pageInspectorSource).toContain('unlock:cg');
    expect(pageInspectorSource).toContain('addCgUnlockRow');
    expect(pageInspectorSource).toContain('cgOptions');
  });
});
