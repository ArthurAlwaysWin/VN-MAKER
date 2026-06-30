/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adaptLegacyUiScreen, projectCanonicalThemeScreens } from '../src/shared/uiLegacyAdapters.js';
import { applyUiDocumentVariant, validateUiDocument } from '../src/shared/uiDocumentContract.js';
import { createProjectSession } from '../src/authoring/projectSession.js';
import { getSyntheticNodeOperations, applySyntheticNodeOperation } from '../src/editor/screen-designer/unifiedEditorShellModel.js';
import { SaveLoadScreen } from '../src/ui/SaveLoadScreen.js';
import { BacklogScreen } from '../src/ui/BacklogScreen.js';
import { scanAssets } from '../src/engine/scanAssets.js';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const baseScript = () => ({ meta: { resolution: { width: 1280, height: 720 } }, ui: {} });

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Phase 7 canonical stateful screens', () => {
  it('maps Save/Load legacy layout into one valid variant document without losing protected parts', () => {
    const { document, authority } = adaptLegacyUiScreen({
      ...baseScript(),
      ui: { saveLoadScreen: { header: { saveTitle: 'Save now', loadTitle: 'Load now' }, slotGrid: { columns: 3, rows: 3 }, slot: { emptyText: 'Empty' }, pagination: { style: 'dots' } } },
    }, 'saveLoad');
    expect(authority).toBe('legacy-only');
    expect(validateUiDocument(document, { screenId: 'saveLoad' })).toEqual([]);
    expect(document.variants).toHaveProperty('save');
    expect(document.variants).toHaveProperty('load');
    expect(document.nodes.find(node => node.type === 'save-slot-grid').parts).toEqual(['pagination', 'slots']);
    expect(applyUiDocumentVariant(document, 'load').nodes.find(node => node.id === 'saveLoad.header').content.text).toBe('Load now');
  });

  it('renders canonical Save/Load through SharedUiRenderer while preserving cache, actions, paging and delete confirmation focus', async () => {
    const container = document.body.appendChild(document.createElement('div'));
    const getAllSlots = vi.fn().mockResolvedValue([{ slot: 1, previewText: 'Chapter 1', date: 'today' }]);
    const screen = new SaveLoadScreen(container, { getAllSlots });
    screen.onDelete = vi.fn().mockResolvedValue(undefined);
    const documentModel = adaptLegacyUiScreen({ ...baseScript(), ui: { saveLoadScreen: { slotGrid: { columns: 3, rows: 3 } } } }, 'saveLoad').document;
    screen.setLayout(null, { canonicalDocument: documentModel });
    screen.show('load', 'menu');
    await tick();
    expect(screen.el.querySelector('[data-gm-ui-renderer="shared"]')).not.toBeNull();
    expect(screen.el.querySelector('[data-gm-ui-node-id="saveLoad.header"]').textContent).toBe('读 档');
    expect(screen.el.querySelectorAll('.save-slot')).toHaveLength(9);
    expect(screen.el.querySelector('.save-slot-text').textContent).toBe('Chapter 1');
    screen._currentPage = 2;
    await screen._renderGrid();
    expect(getAllSlots).toHaveBeenCalledTimes(1);
    screen._currentPage = 1;
    await screen._renderGrid();
    const deleteButton = screen.el.querySelector('.save-slot-delete');
    deleteButton.focus();
    deleteButton.click();
    expect(screen._confirmation.host?.diagnostics).toEqual([]);
    expect(screen._confirmation.active).toBe(true);
    expect(screen.el.querySelector('[data-gm-ui-document-id="confirmation"]')).not.toBeNull();
    screen.el.querySelector('[data-gm-ui-node-id="confirmation.cancel"]').click();
    expect(document.activeElement).toBe(deleteButton);
  });

  it('renders canonical Backlog history in order, scrolls, and preserves voice success/error lifecycle', async () => {
    const container = document.body.appendChild(document.createElement('div'));
    const audio = { playVoice: vi.fn().mockRejectedValueOnce(new Error('bad audio')).mockResolvedValueOnce(), stopVoice: vi.fn() };
    const screen = new BacklogScreen(container, audio);
    const documentModel = adaptLegacyUiScreen({ ...baseScript(), ui: { backlogScreen: { header: { title: 'History' } } } }, 'backlog').document;
    screen.setLayout(null, { canonicalDocument: documentModel });
    screen.show([{ speakerName: 'A', text: 'first', voice: 'a.ogg' }, { speakerName: 'B', text: 'second', voice: 'b.ogg' }]);
    await tick();
    const entries = [...screen.el.querySelectorAll('.backlog-entry')];
    expect(entries.map(entry => entry.querySelector('.backlog-text').textContent)).toEqual(['first', 'second']);
    entries[0].querySelector('button').click();
    await tick();
    expect(entries[0].classList.contains('backlog-playing')).toBe(false);
    entries[1].querySelector('button').click();
    await tick();
    expect(entries[1].classList.contains('backlog-playing')).toBe(false);
  });

  it('renders a canonical Backlog empty state without changing runtime history ownership', async () => {
    const container = document.body.appendChild(document.createElement('div'));
    const screen = new BacklogScreen(container, null);
    const documentModel = adaptLegacyUiScreen({ ...baseScript(), ui: { backlogScreen: {} } }, 'backlog').document;
    screen.setLayout(null, { canonicalDocument: documentModel });
    screen.show([], {});
    await tick();
    expect(screen.el.querySelector('.backlog-empty').textContent).toBe('暂无历史记录');
  });

  it('keeps semantic invariants non-deletable and exposes typed migration/update operations', () => {
    const script = { ...baseScript(), ui: { saveLoadScreen: {}, backlogScreen: {} } };
    const session = createProjectSession({ script });
    expect(session.migrateStatefulUiScreen({ screenId: 'saveLoad' }).changedPaths).toContain('ui.screens.saveLoad');
    expect(session.migrateStatefulUiScreen({ screenId: 'backlog' }).changedPaths).toContain('ui.screens.backlog');
    expect(session.updateStatefulUiNode({ screenId: 'backlog', nodeId: 'backlog.header', path: 'content.text', value: 'Log' }).changedPaths).toContain('ui.screens.backlog.nodes.backlog.header');
    const documentModel = session.toJSON().ui.screens.saveLoad;
    const semantic = documentModel.nodes.find(node => node.type === 'save-slot-grid');
    expect(getSyntheticNodeOperations(documentModel, semantic.id).find(item => item.id === 'delete').enabled).toBe(false);
    expect(applySyntheticNodeOperation(documentModel, semantic.id, 'delete').changed).toBe(false);
  });

  it('projects canonical stateful visuals into theme/export asset paths without player data', () => {
    const script = baseScript();
    script.ui.saveLoadScreen = { background: 'ui/save-bg.png', header: { backgroundImage: 'ui/save-header.png' } };
    script.ui.backlogScreen = { backgroundImage: 'ui/backlog-bg.png', header: { backgroundImage: 'ui/backlog-header.png' } };
    const session = createProjectSession({ script });
    session.migrateStatefulUiScreen({ screenId: 'saveLoad' });
    session.migrateStatefulUiScreen({ screenId: 'backlog' });
    const canonical = session.toJSON();
    const projection = projectCanonicalThemeScreens(canonical);
    expect(Object.keys(projection.screens)).toEqual(expect.arrayContaining(['saveLoad', 'backlog']));
    expect(JSON.stringify(projection)).not.toContain('previewText');
    expect(scanAssets(canonical).backgrounds).toEqual(expect.arrayContaining(['ui/save-bg.png', 'ui/save-header.png', 'ui/backlog-bg.png', 'ui/backlog-header.png']));
  });
});
