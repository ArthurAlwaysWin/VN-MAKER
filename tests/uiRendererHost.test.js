/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUiPreviewHost, createUiRuntimeHost } from '../src/ui/renderer/createUiRendererHost.js';
import { UI_RENDERER_FIXTURE_DATA, UI_RENDERER_FIXTURE_DOCUMENT } from '../src/ui/renderer/uiRendererFixtures.js';

describe('Phase 3 action, data, and semantic host boundaries', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="host"></div>'; });

  it('injects only named data sources into semantic widgets', () => {
    const updates = [];
    const host = createUiRuntimeHost({
      container: document.getElementById('host'), dataSources: UI_RENDERER_FIXTURE_DATA,
      semanticWidgets: { 'save-slot-grid': { mount: vi.fn(), update: context => updates.push(context.data), unmount: vi.fn() } },
    });
    host.mount(UI_RENDERER_FIXTURE_DOCUMENT);
    expect(updates.at(-1)).toEqual(UI_RENDERER_FIXTURE_DATA['save.slots']);
    expect(() => host.dataSources.set('window.location', 'unsafe')).toThrow(/Unknown canonical UI data source/);
  });

  it('aborts semantic update work on replacement and lifetime work on unmount', () => {
    const updateSignals = [];
    let lifetimeSignal;
    const host = createUiRuntimeHost({
      container: document.getElementById('host'), dataSources: UI_RENDERER_FIXTURE_DATA,
      semanticWidgets: { 'save-slot-grid': {
        mount: context => { lifetimeSignal = context.signal; },
        update: context => updateSignals.push(context.updateSignal),
        unmount: vi.fn(),
      } },
    });
    host.mount(UI_RENDERER_FIXTURE_DOCUMENT);
    host.update(UI_RENDERER_FIXTURE_DOCUMENT);
    expect(updateSignals[0].aborted).toBe(true);
    expect(updateSignals[1].aborted).toBe(false);
    host.unmount();
    expect(updateSignals[1].aborted).toBe(true);
    expect(lifetimeSignal.aborted).toBe(true);
  });

  it('routes canonical runtime actions and makes persistent preview actions diagnostic-only', async () => {
    const runtimeDelete = vi.fn();
    const previewDelete = vi.fn();
    const runtime = createUiRuntimeHost({ container: document.getElementById('host'), actions: { 'delete-slot': runtimeDelete } });
    runtime.mount(UI_RENDERER_FIXTURE_DOCUMENT);
    runtime.renderer.root.querySelector('[data-gm-ui-node-id="title.persist"]').click();
    await Promise.resolve();
    expect(runtimeDelete).toHaveBeenCalledWith({ slot: '1' }, expect.objectContaining({ nodeId: 'title.persist' }));
    runtime.unmount();

    const preview = createUiPreviewHost({ container: document.getElementById('host'), actions: { 'delete-slot': previewDelete } });
    preview.mount(UI_RENDERER_FIXTURE_DOCUMENT);
    preview.renderer.root.querySelector('[data-gm-ui-node-id="title.persist"]').click();
    await Promise.resolve();
    expect(previewDelete).not.toHaveBeenCalled();
    expect(preview.diagnostics).toContainEqual(expect.objectContaining({ code: 'ui-preview-action-inert', nodeId: 'title.persist' }));
  });

  it('enforces required semantic parts before mount', () => {
    const fixtureDocument = structuredClone(UI_RENDERER_FIXTURE_DOCUMENT);
    fixtureDocument.nodes.find(node => node.id === 'title.slots').parts = ['slots'];
    const mount = vi.fn();
    const host = createUiRuntimeHost({ container: document.getElementById('host'), semanticWidgets: { 'save-slot-grid': { mount } } });
    const result = host.mount(fixtureDocument);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'ui-required-part-missing' }));
    expect(mount).not.toHaveBeenCalled();
  });

  it('reports missing accessible names without blocking future-safe content fields', () => {
    const fixtureDocument = structuredClone(UI_RENDERER_FIXTURE_DOCUMENT);
    const button = fixtureDocument.nodes.find(node => node.id === 'title.start');
    button.content = { futureHint: { preserved: true } };
    const host = createUiPreviewHost({ container: document.getElementById('host') });
    expect(host.mount(fixtureDocument).diagnostics).toEqual([]);
    expect(host.diagnostics).toContainEqual(expect.objectContaining({ code: 'ui-accessible-name-missing', nodeId: 'title.start' }));
  });
});
