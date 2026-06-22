import { describe, expect, it } from 'vitest';
import { normalizeUiLayout } from '../src/shared/uiLayoutContract.js';
import { UI_CAPABILITIES, normalizeUiDocument, validateUiDocument, validateUiProjectContract } from '../src/shared/uiDocumentContract.js';
import { validateProject } from '../src/shared/projectValidator.js';

const root = () => ({ id: 'title.root', type: 'panel', parentId: null, order: 0, layout: normalizeUiLayout(), parts: [] });
const button = (overrides = {}) => ({ id: 'title.start', type: 'button', parentId: 'title.root', order: 0, layout: normalizeUiLayout(), parts: [], action: { type: 'start-game' }, ...overrides });
const document = (nodes = [root(), button()]) => ({ schemaVersion: 2, id: 'title', kind: 'screen', authority: 'canonical-active', rootId: 'title.root', viewport: { width: 1280, height: 720 }, nodes });
const codes = diagnostics => diagnostics.map(item => item.code);

describe('canonical UI document contract', () => {
  it('normalizes deterministic ordering and is idempotent', () => {
    const first = normalizeUiDocument(document([button({ order: 2 }), root(), button({ id: 'title.alt', order: 1 })]));
    expect(first.nodes.map(node => node.id)).toEqual(['title.root', 'title.alt', 'title.start']);
    expect(normalizeUiDocument(first)).toEqual(first);
  });

  it.each([
    [[root(), button(), button()], 'ui-node-id-duplicate'],
    [[root(), button({ parentId: 'missing' })], 'ui-node-parent-missing'],
    [[root(), button({ parentId: 'title.start' })], 'ui-hierarchy-cycle'],
    [[root(), button({ parentId: null })], 'ui-node-unreachable'],
    [[root(), button({ type: 'iframe' })], 'ui-widget-type-unknown'],
    [[root(), button({ action: { type: 'eval' } })], 'ui-action-unknown'],
    [[root(), button({ binding: { source: 'window.location' } })], 'ui-binding-unknown'],
    [[root(), button({ style: { css: 'display:none' } })], 'ui-style-property-unknown'],
    [[root(), button({ asset: { kind: 'image', path: '../secret.png' } })], 'ui-asset-reference-invalid'],
  ])('rejects malformed hierarchy or node contract', (nodes, expected) => {
    expect(codes(validateUiDocument(document(nodes), { screenId: 'title' }))).toContain(expected);
  });

  it('protects semantic required parts', () => {
    const semantic = button({ id: 'title.settings', type: 'settings-group', parts: [] });
    expect(codes(validateUiDocument(document([root(), semantic]), { screenId: 'title' }))).toContain('ui-required-part-missing');
  });

  it('gates advanced envelopes until matching capabilities are registered', () => {
    const advanced = { ...document(), variants: { compact: { when: { key: 'viewport.width', operator: 'lt', value: 800 }, overrides: {} } } };
    expect(codes(validateUiDocument(advanced, { screenId: 'title' }))).toContain('ui-capability-unregistered');
    const enabled = validateUiDocument(advanced, { screenId: 'title', capabilities: [UI_CAPABILITIES.RESPONSIVE_VARIANTS, UI_CAPABILITIES.CONTEXT_PREDICATES] });
    expect(enabled).toEqual([]);
  });

  it('rejects legacy/canonical writer conflicts through the project validator', () => {
    const script = { projectId: 'gm_ui_contract', characters: {}, scenes: {}, systems: {}, ui: { screenSchemaVersion: 2, screenAuthorities: { title: 'legacy-only' }, screens: { title: document() } } };
    expect(codes(validateUiProjectContract(script))).toContain('ui-authority-conflict');
    expect(validateProject(script).errors.some(item => item.code === 'ui-authority-conflict')).toBe(true);
  });
});
