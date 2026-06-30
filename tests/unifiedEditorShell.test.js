/**
 * @vitest-environment jsdom
 */

import { createApp, nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import UnifiedScreenDesignerShell from '../src/editor/components/screen-designer/UnifiedScreenDesignerShell.vue';
import { adaptLegacyUiScreen } from '../src/shared/uiLegacyAdapters.js';
import {
  applySyntheticNodeOperation,
  applySyntheticNodePatch,
  buildHierarchy,
  createUnifiedEditorShellFixture,
  getSyntheticNodeOperations,
  summarizeNode,
} from '../src/editor/screen-designer/unifiedEditorShellModel.js';
import {
  anchorPivotToCanvasOrigin,
  calculateLetterboxRect,
  canvasPointToScreenPoint,
  nudgeLayout,
  resizeLayout,
  screenPointToCanvasPoint,
} from '../src/editor/screen-designer/unifiedEditorGeometry.js';

let harness = null;

async function mountShell() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = createApp(UnifiedScreenDesignerShell);
  const vm = app.mount(container);
  await nextTick();
  await nextTick();
  harness = { app, container, vm };
  return harness;
}

async function mountShellWithProps(props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const app = createApp(UnifiedScreenDesignerShell, props);
  const vm = app.mount(container);
  await nextTick();
  await nextTick();
  harness = { app, container, vm };
  return harness;
}

afterEach(() => {
  harness?.app.unmount();
  harness?.container.remove();
  harness = null;
  document.body.innerHTML = '';
});

describe('Phase 4a unified editor shell', () => {
  it('builds a stable hierarchy and preserves advanced fields through safe synthetic patches', () => {
    const fixture = createUnifiedEditorShellFixture();
    expect(buildHierarchy(fixture).map(node => `${node.depth}:${node.id}`)).toEqual([
      '0:title.root',
      '1:title.heading',
      '1:title.menu',
      '2:title.start',
      '2:title.persist',
      '1:title.slots',
    ]);

    const before = fixture.nodes.find(node => node.id === 'title.persist');
    expect(summarizeNode(before).advancedKeys).toContain('advanced');

    const patched = applySyntheticNodePatch(fixture, 'title.persist', {
      path: 'content.text',
      value: 'Patched persistent probe',
    });
    const after = patched.nodes.find(node => node.id === 'title.persist');
    expect(after.content.text).toBe('Patched persistent probe');
    expect(after.advanced).toEqual(before.advanced);
    const moved = applySyntheticNodePatch(fixture, 'title.start', {
      path: 'layout.offset.x',
      value: 10,
    });
    expect(moved.nodes.find(node => node.id === 'title.start').layout.offset.x).toBe(10);
    const assetPatched = applySyntheticNodePatch(fixture, 'title.persist', {
      path: 'asset.path',
      value: 'unsafe.png',
    });
    expect(assetPatched.nodes.find(node => node.id === 'title.persist').asset.path).toBe('unsafe.png');
    expect(assetPatched.nodes.find(node => node.id === 'title.persist').advanced).toEqual(before.advanced);
  });

  it('renders the synthetic fixture through SharedUiRenderer and syncs canvas selection to hierarchy and inspector', async () => {
    const { container } = await mountShell();
    const canvas = container.querySelector('[data-test="usd-canvas-host"]');
    expect(canvas.querySelector('[data-gm-ui-renderer="shared"]')).toBeTruthy();
    expect(canvas.querySelector('[data-gm-ui-node-id="title.heading"]').textContent).toContain('Unified Editor Shell');

    const start = canvas.querySelector('[data-gm-ui-node-id="title.start"]');
    start.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await nextTick();

    const hierarchySelection = container.querySelector('[data-test="usd-hierarchy"] button[aria-selected="true"]');
    expect(hierarchySelection.dataset.nodeId).toBe('title.start');
    expect(container.querySelector('[data-test="usd-inspector-id"]').textContent).toBe('title.start');
    expect(container.querySelector('[data-test="usd-inspector-type"]').textContent).toBe('button');
    expect(container.querySelector('[data-test="usd-inspector-action"]').textContent).toContain('start-game');
  });

  it('syncs hierarchy selection back to canvas chrome and inspector advanced summary', async () => {
    const { container } = await mountShell();
    container.querySelector('[data-test="usd-hierarchy"] [data-node-id="title.persist"]').click();
    await nextTick();

    const selectedCanvasNode = container.querySelector('[data-gm-ui-node-id="title.persist"]');
    expect(selectedCanvasNode.dataset.gmUiEditorSelected).toBe('true');
    expect(container.querySelector('[data-test="usd-inspector-id"]').textContent).toBe('title.persist');
    expect(container.querySelector('[data-test="usd-advanced-summary"]').textContent).toContain('destructivePreviewPolicy');
  });

  it('patches only the synthetic fixture and updates rendered DOM without dropping unknown fields', async () => {
    const { container, vm } = await mountShell();
    container.querySelector('[data-test="usd-hierarchy"] [data-node-id="title.heading"]').click();
    await nextTick();

    const input = container.querySelector('[data-test="usd-text-patch"]');
    input.value = 'Patched heading';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(container.querySelector('[data-gm-ui-node-id="title.heading"]').textContent).toContain('Patched heading');
    const node = vm.state.document.nodes.find(item => item.id === 'title.heading');
    expect(node.agentMetadata).toEqual({ recipeId: 'phase-4a-synthetic', locked: false });
    expect(vm.state.patches).toContainEqual({
      nodeId: 'title.heading',
      path: 'content.text',
      value: 'Patched heading',
    });
  });
});

describe('Phase 4b unified editor shell interactions', () => {
  it('offers valid synthetic context operations and applies them without dropping advanced fields', () => {
    const fixture = createUnifiedEditorShellFixture();
    expect(getSyntheticNodeOperations(fixture, fixture.rootId).find(operation => operation.id === 'delete').enabled).toBe(false);
    expect(getSyntheticNodeOperations(fixture, 'title.start').find(operation => operation.id === 'duplicate').enabled).toBe(true);

    const duplicated = applySyntheticNodeOperation(fixture, 'title.persist', 'duplicate');
    expect(duplicated.selectedNodeId).toBe('title.persist.copy');
    expect(duplicated.document.nodes.find(node => node.id === 'title.persist.copy').advanced).toEqual({ destructivePreviewPolicy: 'diagnostic-only' });

    const moved = applySyntheticNodeOperation(duplicated.document, 'title.persist.copy', 'move-up');
    const menuChildren = buildHierarchy(moved.document).filter(node => node.parentId === 'title.menu').map(node => node.id);
    expect(menuChildren).toEqual(['title.start', 'title.persist.copy', 'title.persist']);

    const wrapped = applySyntheticNodeOperation(moved.document, 'title.persist.copy', 'wrap');
    expect(wrapped.document.nodes.find(node => node.id === 'title.persist.copy').parentId).toBe('title.persist.copy.group');

    const reset = applySyntheticNodeOperation(wrapped.document, 'title.start', 'reset-overrides');
    expect(reset.document.nodes.find(node => node.id === 'title.start')).not.toHaveProperty('states');

    const deleted = applySyntheticNodeOperation(reset.document, 'title.persist.copy.group', 'delete');
    expect(deleted.document.nodes.some(node => node.id === 'title.persist.copy')).toBe(false);
  });

  it('converts anchor, pivot, resize, zoom, and letterboxed points through geometry utilities', () => {
    const letterbox = calculateLetterboxRect(
      { left: 10, top: 20, width: 1000, height: 700 },
      { width: 1280, height: 720 },
      1,
    );
    expect(letterbox.width).toBeCloseTo(1000);
    expect(letterbox.height).toBeCloseTo(562.5);

    const canvasPoint = screenPointToCanvasPoint({ clientX: letterbox.x + letterbox.scale * 100, clientY: letterbox.y + letterbox.scale * 50 }, letterbox);
    expect(canvasPoint).toEqual({ x: 100, y: 50 });
    expect(canvasPointToScreenPoint(canvasPoint, letterbox).x).toBeCloseTo(letterbox.x + letterbox.scale * 100);

    const layout = createUnifiedEditorShellFixture().nodes.find(node => node.id === 'title.start').layout;
    expect(anchorPivotToCanvasOrigin(layout, { width: 1280, height: 720 })).toEqual({ x: 20, y: 0 });
    expect(nudgeLayout(layout, { x: 4, y: -3 }).offset).toEqual({ x: 24, y: -3 });
    expect(resizeLayout(layout, { x: 12, y: 8 }, 'bottom-right').size).toEqual({ width: 292, height: 64 });
  });

  it('right-click selects the canvas target before showing the context menu and records one undoable duplicate transaction', async () => {
    const { container, vm } = await mountShell();
    const persist = container.querySelector('[data-gm-ui-node-id="title.persist"]');
    persist.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 80, clientY: 90 }));
    await nextTick();

    expect(container.querySelector('[data-test="usd-inspector-id"]').textContent).toBe('title.persist');
    const menu = container.querySelector('[data-test="usd-context-menu"]');
    expect(menu).toBeTruthy();
    menu.querySelector('[data-operation-id="duplicate"]').click();
    await nextTick();

    expect(vm.state.selectedNodeId).toBe('title.persist.copy');
    expect(vm.state.transactions).toHaveLength(1);
    expect(vm.state.transactions[0].operation).toBe('duplicate');
    expect(vm.state.history).toHaveLength(2);
    expect(container.querySelector('[data-gm-ui-node-id="title.persist.copy"]')).toBeTruthy();

    container.querySelector('[data-test="usd-undo"]').click();
    await nextTick();
    expect(container.querySelector('[data-gm-ui-node-id="title.persist.copy"]')).toBeFalsy();

    container.querySelector('[data-test="usd-redo"]').click();
    await nextTick();
    expect(container.querySelector('[data-gm-ui-node-id="title.persist.copy"]')).toBeTruthy();
  });

  it('keeps Delete focus-safe and supports keyboard nudge/delete with synthetic undo', async () => {
    const { container, vm } = await mountShell();
    const shell = container.querySelector('[data-test="unified-editor-shell"]');
    container.querySelector('[data-test="usd-hierarchy"] [data-node-id="title.heading"]').click();
    await nextTick();

    const input = container.querySelector('[data-test="usd-text-patch"]');
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await nextTick();
    expect(vm.state.document.nodes.some(node => node.id === 'title.heading')).toBe(true);

    shell.focus();
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await nextTick();
    expect(vm.state.document.nodes.find(node => node.id === 'title.heading').layout.offset.x).toBe(1);
    expect(vm.state.transactions.at(-1).operation).toBe('nudge');

    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await nextTick();
    expect(vm.state.document.nodes.some(node => node.id === 'title.heading')).toBe(false);

    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    await nextTick();
    expect(vm.state.document.nodes.some(node => node.id === 'title.heading')).toBe(true);

    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }));
    await nextTick();
    expect(vm.state.document.nodes.some(node => node.id === 'title.heading')).toBe(false);
  });
});

describe('Phase 6 production game menu shell', () => {
  it('renders canonical Game Menu in the shared shell and keeps context, keyboard, and undo transactions working', async () => {
    const document = adaptLegacyUiScreen({
      meta: { resolution: { width: 1280, height: 720 } },
      ui: { gameMenu: { buttons: { save: { text: 'Save' }, title: { text: 'Title' } } } },
    }, 'gameMenu').document;
    const { container, vm } = await mountShellWithProps({
      initialDocument: document,
      productionScreenId: 'gameMenu',
      productionScreenLabel: 'Game Menu',
    });

    expect(container.querySelector('[data-test="usd-screen-selector"]').value).toBe('gameMenu');
    expect(container.querySelector('[data-gm-ui-node-id="gameMenu.save"]').textContent).toContain('Save');

    const save = container.querySelector('[data-gm-ui-node-id="gameMenu.save"]');
    save.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 40, clientY: 50 }));
    await nextTick();
    container.querySelector('[data-test="usd-context-menu"] [data-operation-id="duplicate"]').click();
    await nextTick();
    expect(vm.state.selectedNodeId).toBe('gameMenu.save.copy');
    expect(vm.state.transactions.at(-1).operation).toBe('duplicate');

    const shell = container.querySelector('[data-test="unified-editor-shell"]');
    shell.focus();
    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await nextTick();
    expect(vm.state.document.nodes.some(node => node.id === 'gameMenu.save.copy')).toBe(false);

    shell.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    await nextTick();
    expect(vm.state.document.nodes.some(node => node.id === 'gameMenu.save.copy')).toBe(true);
  });
});
