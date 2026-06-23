/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createUiPreviewHost } from '../src/ui/renderer/createUiRendererHost.js';
import { createUiPreviewBridge, UI_PREVIEW_MESSAGE_TYPES } from '../src/ui/renderer/uiPreviewBridge.js';
import { UI_RENDERER_FIXTURE_DATA, UI_RENDERER_FIXTURE_DOCUMENT } from '../src/ui/renderer/uiRendererFixtures.js';

describe('Phase 3 preview document bridge', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="host"></div>'; });

  it('mounts, incrementally updates, and unmounts deterministic snapshots', () => {
    const postResult = vi.fn();
    const host = createUiPreviewHost({ container: document.getElementById('host') });
    const bridge = createUiPreviewBridge(host, { postResult });
    expect(bridge.handle({ type: UI_PREVIEW_MESSAGE_TYPES.MOUNT, requestId: 'mount-1', document: UI_RENDERER_FIXTURE_DOCUMENT, dataSources: UI_RENDERER_FIXTURE_DATA })).toBe(true);
    const heading = host.renderer.root.querySelector('[data-gm-ui-node-id="title.heading"]');
    const updated = structuredClone(UI_RENDERER_FIXTURE_DOCUMENT);
    updated.nodes.find(node => node.id === 'title.heading').content.text = 'Incremental update';
    bridge.handle({ type: UI_PREVIEW_MESSAGE_TYPES.UPDATE, requestId: 'update-1', document: updated });
    expect(host.renderer.root.querySelector('[data-gm-ui-node-id="title.heading"]')).toBe(heading);
    expect(heading.textContent).toBe('Incremental update');
    bridge.handle({ type: UI_PREVIEW_MESSAGE_TYPES.UNMOUNT, requestId: 'unmount-1' });
    expect(host.renderer.root.childElementCount).toBe(0);
    expect(postResult).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'ui-document-result', requestId: 'unmount-1' }));
  });

  it('ignores unrelated legacy preview messages', () => {
    const host = createUiPreviewHost({ container: document.getElementById('host') });
    expect(createUiPreviewBridge(host).handle({ type: 'show-screen', screenId: 'titleScreen' })).toBe(false);
  });
});
