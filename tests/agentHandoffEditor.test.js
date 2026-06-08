/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { useProjectStore } from '../src/editor/stores/project.js';
import ExternalScriptDiffPanel from '../src/editor/components/ExternalScriptDiffPanel.vue';
import { createScriptDiffSummary } from '../src/editor/utils/scriptDiff.js';
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
    await Promise.resolve();
    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith('write-agent-review-state', expect.objectContaining({
      handoffCreatedAt: '2026-05-20T10:00:00.000Z',
      items: expect.any(Object),
    }));
  });

  it('loads persisted handoff review lifecycle state from the project artifact when available', async () => {
    setActivePinia(createPinia());
    const reviewItem = { source: 'layout', code: 'layout-blank-page', pathString: 'scenes.start.pages.0' };
    const itemKey = createHandoffReviewItemKey(reviewItem);
    const handoff = {
      kind: 'agent-authoring-handoff',
      createdAt: '2026-05-20T10:00:00.000Z',
      reviewItems: [reviewItem],
    };
    window.ipcRenderer = {
      invoke: vi.fn(async (channel) => {
        if (channel === 'load-project') {
          return { success: true, path: 'E:/demo-project', project: { name: 'Demo Project' } };
        }
        if (channel === 'read-agent-handoff') {
          return { success: true, handoff, path: 'E:/demo-project/agent-handoff.json' };
        }
        if (channel === 'read-agent-review-state') {
          return {
            success: true,
            state: {
              handoffCreatedAt: handoff.createdAt,
              items: { [itemKey]: { status: 'resolved', updatedAt: '2026-05-21T00:00:00.000Z' } },
            },
          };
        }
        return { success: true };
      }),
    };

    const project = useProjectStore();
    await project.loadProject('E:/demo-project');

    expect(project.agentReviewState[itemKey].status).toBe('resolved');
    expect(countHandoffReviewStatuses(handoff, project.agentReviewState)).toEqual({
      open: 0,
      acknowledged: 0,
      resolved: 1,
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
    expect(project.requestAgentPathNavigation('analysis.sceneGraph')).toBe(true);
    expect(project.agentPathNavigationRequest).toMatchObject({
      kind: 'graph',
      tab: 'story-systems',
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
    expect(preload).toContain("'read-agent-review-state'");
    expect(preload).toContain("'write-agent-review-state'");
    expect(preload).toContain("'check-project-file-state'");
    expect(preload).toContain("'read-project-script-for-conflict'");
    expect(main).toContain("ipcMain.handle('read-agent-handoff'");
    expect(main).toContain("ipcMain.handle('read-agent-review-state'");
    expect(main).toContain("ipcMain.handle('write-agent-review-state'");
    expect(main).toContain("ipcMain.handle('check-project-file-state'");
    expect(main).toContain("ipcMain.handle('read-project-script-for-conflict'");
    expect(main).toContain('expectedScriptFileState');
    expect(main).toContain('conflict: true');
    expect(main).toContain("'agent-handoff.json'");
  });

  it('grants project load paths only from main-process project discovery', () => {
    const preload = readFileSync(resolve(process.cwd(), 'electron', 'preload.js'), 'utf8');
    const main = readFileSync(resolve(process.cwd(), 'electron', 'main.js'), 'utf8');

    expect(preload).not.toContain("'update-recent-projects'");
    expect(main).not.toContain("ipcMain.handle('update-recent-projects'");
    expect(main).toContain('const grantedProjectPaths = new Set();');
    expect(main).toContain('rememberProjectPath(projectDir);');
    expect(main).toContain('rememberProjectPath(dir);');
    expect(main).toMatch(/ipcMain\.handle\('load-project'[\s\S]*if \(!hasProjectGrant\(projectPath\)\)/);
  });

  it('wires the editor project library through the main process and welcome screen', () => {
    const preload = readFileSync(resolve(process.cwd(), 'electron', 'preload.js'), 'utf8');
    const main = readFileSync(resolve(process.cwd(), 'electron', 'main.js'), 'utf8');
    const store = readFileSync(resolve(process.cwd(), 'src', 'editor', 'stores', 'project.js'), 'utf8');
    const welcome = readFileSync(resolve(process.cwd(), 'src', 'editor', 'views', 'WelcomeScreen.vue'), 'utf8');
    const quickCreate = readFileSync(resolve(process.cwd(), 'src', 'editor', 'views', 'CreateProjectQuick.vue'), 'utf8');
    const wizard = readFileSync(resolve(process.cwd(), 'src', 'editor', 'views', 'CreateProjectWizard.vue'), 'utf8');

    expect(preload).toContain("'choose-project-library'");
    expect(main).toContain("ipcMain.handle('choose-project-library'");
    expect(main).toContain('ensureProjectLibraryDir');
    expect(main).toContain('getRecommendedProjectRootCandidates');
    expect(store).toContain('projectLibraryDir');
    expect(store).toContain('chooseProjectLibrary');
    expect(welcome).toContain('project-library');
    expect(welcome).toContain('项目库');
    expect(quickCreate).toContain('location.value = project.projectLibraryDir');
    expect(wizard).toContain('form.location = project.projectLibraryDir');
  });

  it('keeps packaged editor metadata in the portable data directory', () => {
    const main = readFileSync(resolve(process.cwd(), 'electron', 'main.js'), 'utf8');
    const cli = readFileSync(resolve(process.cwd(), 'tools', 'vn-author', 'index.js'), 'utf8');

    expect(main).toContain('function configureUserDataPath()');
    expect(main).toContain("path.join(path.dirname(process.execPath), 'data')");
    expect(main).toContain("app.setPath('userData', portableUserData)");
    expect(cli).toContain("path.join(repoRoot, 'release', 'Galgame Maker-win32-x64', 'data')");
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
        if (channel === 'read-project-script-for-conflict') {
          return {
            success: true,
            script: { projectId: 'demo', scenes: { new_route: { pages: [] } } },
            scriptFileState: changedState,
          };
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
    await expect(project.checkExternalScriptChange({ projectId: 'demo', scenes: {} })).resolves.toBe(true);
    expect(project.externalScriptChange).toMatchObject({
      source: 'poll',
      scriptFileState: changedState,
      expectedScriptFileState: loadedState,
    });
    expect(project.externalScriptDiff).toMatchObject({
      changedPathCount: 1,
      entries: [expect.objectContaining({ pathString: 'scenes.new_route', type: 'added-on-disk' })],
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

  it('creates stable structured path summaries for external script conflict review', () => {
    const diff = createScriptDiffSummary({
      scenes: { start: { pages: [{ type: 'normal', background: 'backgrounds/old.png' }] } },
      systems: { endings: { good: { title: 'Good' } } },
    }, {
      scenes: { start: { pages: [{ type: 'normal', background: 'backgrounds/new.png' }] }, bonus: { pages: [] } },
      systems: { endings: {} },
    });

    expect(diff.changedPathCount).toBe(3);
    expect(diff.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ pathString: 'scenes.bonus', type: 'added-on-disk' }),
      expect.objectContaining({ pathString: 'scenes.start.pages.0.background', type: 'changed-on-disk' }),
      expect.objectContaining({ pathString: 'systems.endings.good', type: 'removed-on-disk' }),
    ]));
  });

  it('mounts the external script diff review panel with actions and structured changes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const refresh = vi.fn();
    const reload = vi.fn();
    const dismiss = vi.fn();
    const app = createApp(ExternalScriptDiffPanel, {
      diff: {
        changedPathCount: 1,
        entries: [{
          pathString: 'scenes.start.pages.0.background',
          type: 'changed-on-disk',
          editorValue: '"backgrounds/old.png"',
          diskValue: '"backgrounds/new.png"',
        }],
        truncated: false,
      },
      onRefresh: refresh,
      onReload: reload,
      onDismiss: dismiss,
    });
    app.mount(container);
    await nextTick();

    expect(container.textContent).toContain('1 处结构化变更');
    expect(container.textContent).toContain('scenes.start.pages.0.background');
    container.querySelector('[data-test="refresh-external-diff"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    container.querySelector('[data-test="reload-external-script"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    container.querySelector('[data-test="dismiss-external-change"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(refresh).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledOnce();
    app.unmount();
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
    expect(source).toContain('branch-graph-preview');
    expect(source).toContain('flow preview');
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
    const panelSource = readFileSync(resolve(process.cwd(), 'src', 'editor', 'components', 'ExternalScriptDiffPanel.vue'), 'utf8');

    expect(source).toContain('project.externalScriptChange');
    expect(source).toContain('ExternalScriptDiffPanel');
    expect(source).toContain('project.externalScriptDiff');
    expect(source).toContain('loadExternalScriptDiff');
    expect(source).toContain('reloadCurrentProject');
    expect(source).toContain('project.checkExternalScriptChange(script.data)');
    expect(panelSource).toContain('检测到 script.json 已被外部工具修改');
    expect(panelSource).toContain('external-script-diff');
  });

  it('keeps Agent Live Mode opt-in and gated on a clean editor state', () => {
    const source = readFileSync(resolve(process.cwd(), 'src', 'editor', 'App.vue'), 'utf8');

    expect(source).toContain('VITE_AGENT_LIVE_MODE');
    expect(source).toContain('galgame-maker:agent-live-mode');
    expect(source).toContain('if (changed && isAgentLiveModeEnabled() && !project.isDirty)');
    expect(source).toContain('await reloadCurrentProject()');
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
          'analysis.sceneGraph',
          'ui.theme.buttonFamilies.qab',
        ],
      },
      reviewItems: [
        { source: 'layout', code: 'layout-warning', pathString: 'scenes.start.pages.1' },
        { source: 'validation', code: 'missing-character', pathString: 'characters.sakura' },
        { source: 'validation', code: 'bad-variable', pathString: 'systems.variables.sakura_affection' },
        { source: 'validation', code: 'ending-never-unlocked', pathString: 'systems.endings.good_end' },
        { source: 'validation', code: 'cg-never-unlocked', pathString: 'systems.gallery.cg.confession' },
        { source: 'preview', code: 'branch-graph-preview-required', pathString: 'analysis.sceneGraph' },
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
    expect(parseAgentPathTarget('analysis.sceneGraph')).toMatchObject({
      kind: 'graph',
      tab: 'story-systems',
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
      'analysis:graph',
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
    expect(groups.find((group) => group.key === 'analysis:graph')).toMatchObject({
      label: 'Branch Flow',
      changedPaths: ['analysis.sceneGraph'],
      reviewItems: [expect.objectContaining({ code: 'branch-graph-preview-required' })],
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
    expect(source).toContain('createBranchGraphReport');
    expect(source).toContain('isSceneUnreachable');
    expect(source).toContain('isSceneDeadEnd');
    expect(source).toContain('isSceneClosedCycle');
    expect(source).toContain('isSceneEnding');
    expect(source).toContain('flow-badge');
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
    expect(pageInspectorSource).toContain('addPageEndingUnlockRow');
    expect(pageInspectorSource).toContain('page-ending-effects');
    expect(pageInspectorSource).toContain('endingOptions');
    expect(storySystemsSource).toContain('CgRegistryList');
    expect(storySystemsSource).toContain('CgInspector');
    expect(storySystemsSource).toContain("script.storySystemsPanel === 'cgs'");
    expect(storySystemsSource).toContain('collectCgUnlockReferences');
    expect(pageInspectorSource).toContain('unlock:cg');
    expect(pageInspectorSource).toContain('addCgUnlockRow');
    expect(pageInspectorSource).toContain('cgOptions');
    expect(storySystemsSource).toContain('BranchGraphPanel');
    expect(storySystemsSource).toContain("script.storySystemsPanel === 'graph'");
    expect(storySystemsSource).toContain('openGraphPath');
    expect(storySystemsSource).toContain('requestAgentPathNavigation');
    const graphPanelSource = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'story-systems', 'BranchGraphPanel.vue'),
      'utf8',
    );
    expect(graphPanelSource).toContain('condition-always-false');
    expect(graphPanelSource).toContain('condition-always-true');
    expect(graphPanelSource).toContain('missingTargetEdges');
    expect(graphPanelSource).toContain('assetReviewItems');
    expect(graphPanelSource).toContain('reviewCountForScene');
    expect(graphPanelSource).toContain("emit('navigate-path'");
  });
});
