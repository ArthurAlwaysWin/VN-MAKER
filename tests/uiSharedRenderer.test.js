/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeUiLayout } from '../src/shared/uiLayoutContract.js';
import { createUiPreviewHost, createUiRuntimeHost } from '../src/ui/renderer/createUiRendererHost.js';
import { UI_RENDERER_FIXTURE_DATA, UI_RENDERER_FIXTURE_DOCUMENT, UI_RENDERER_FIXTURE_STYLES } from '../src/ui/renderer/uiRendererFixtures.js';

const nodeMarkup = host => [...host.renderer.root.querySelectorAll('[data-gm-ui-node-id]')].map(element => ({
  id: element.dataset.gmUiNodeId,
  type: element.dataset.gmUiNodeType,
  parent: element.parentElement?.dataset.gmUiNodeId ?? null,
  text: element.textContent,
}));

describe('Phase 3 shared UI renderer', () => {
  beforeEach(() => { document.body.innerHTML = '<button id="before">Before</button><div id="runtime"></div><div id="preview"></div>'; });
  afterEach(() => vi.restoreAllMocks());

  it('renders identical canonical structure through runtime and preview hosts', () => {
    const runtime = createUiRuntimeHost({ container: document.getElementById('runtime'), dataSources: UI_RENDERER_FIXTURE_DATA, styles: UI_RENDERER_FIXTURE_STYLES });
    const preview = createUiPreviewHost({ container: document.getElementById('preview'), dataSources: UI_RENDERER_FIXTURE_DATA, styles: UI_RENDERER_FIXTURE_STYLES });
    runtime.mount(UI_RENDERER_FIXTURE_DOCUMENT);
    preview.mount(UI_RENDERER_FIXTURE_DOCUMENT);
    expect(runtime.renderer.constructor).toBe(preview.renderer.constructor);
    expect(nodeMarkup(runtime)).toEqual(nodeMarkup(preview));
    expect(runtime.measurements.hostMode).toBe('in-process');
    expect(preview.measurements.samples[0]).toMatchObject({ operation: 'mount', nodeCount: 5 });
  });

  it('renders primitives with stable ids and typed style precedence', () => {
    const host = createUiRuntimeHost({ container: document.getElementById('runtime'), styles: UI_RENDERER_FIXTURE_STYLES });
    host.mount(UI_RENDERER_FIXTURE_DOCUMENT);
    const button = host.renderer.root.querySelector('[data-gm-ui-node-id="title.start"]');
    expect(button.tagName).toBe('BUTTON');
    expect(button.style.backgroundColor).toBe('rgb(229, 217, 255)');
    expect(button.style.color).toBe('rgb(32, 24, 51)');
    expect(button.style.borderRadius).toBe('12px');
    expect(button.getAttribute('aria-label')).toBe('Start fixture action');
  });

  it('preserves focused element identity across incremental updates', () => {
    const host = createUiRuntimeHost({ container: document.getElementById('runtime'), styles: UI_RENDERER_FIXTURE_STYLES });
    host.mount(UI_RENDERER_FIXTURE_DOCUMENT);
    const before = host.renderer.root.querySelector('[data-gm-ui-node-id="title.start"]');
    before.focus();
    const updated = structuredClone(UI_RENDERER_FIXTURE_DOCUMENT);
    updated.nodes.find(node => node.id === 'title.heading').content.text = 'Updated heading';
    host.update(updated);
    expect(host.renderer.root.querySelector('[data-gm-ui-node-id="title.start"]')).toBe(before);
    expect(document.activeElement).toBe(before);
    expect(host.measurements.updates).toBe(1);
  });

  it('cleans action listeners on update and unmount', async () => {
    const action = vi.fn();
    const host = createUiRuntimeHost({ container: document.getElementById('runtime'), actions: { 'start-game': action } });
    host.mount(UI_RENDERER_FIXTURE_DOCUMENT);
    const button = host.renderer.root.querySelector('[data-gm-ui-node-id="title.start"]');
    host.update(UI_RENDERER_FIXTURE_DOCUMENT);
    button.click();
    expect(action).toHaveBeenCalledTimes(1);
    host.unmount();
    button.click();
    expect(action).toHaveBeenCalledTimes(1);
    expect(host.measurements.unmounts).toBe(1);
  });

  it('restores outside focus after modal unmount', () => {
    const before = document.getElementById('before');
    before.focus();
    const modalDocument = {
      schemaVersion: 2, id: 'confirmation', kind: 'overlay', authority: 'canonical-active', rootId: 'confirmation.root', viewport: { width: 1280, height: 720 },
      nodes: [
        { id: 'confirmation.root', type: 'panel', parentId: null, order: 0, layout: normalizeUiLayout(), parts: [] },
        { id: 'confirmation.dialog', type: 'confirmation', parentId: 'confirmation.root', order: 0, layout: normalizeUiLayout(), parts: ['title', 'body', 'confirm', 'cancel'], content: { accessibleName: 'Delete save confirmation', modal: true } },
      ],
    };
    const host = createUiPreviewHost({ container: document.getElementById('preview') });
    host.mount(modalDocument);
    expect(host.renderer.root.querySelector('[role="dialog"]')).toBe(document.activeElement);
    host.unmount();
    expect(document.activeElement).toBe(before);
  });
});
