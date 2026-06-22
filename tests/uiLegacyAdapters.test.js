import { describe, expect, it } from 'vitest';
import { adaptLegacyUiOverlay, adaptLegacyUiScreen, projectCanonicalThemeScreens } from '../src/shared/uiLegacyAdapters.js';
import { validateUiDocument } from '../src/shared/uiDocumentContract.js';
import { CUSTOMIZED_LEGACY_UI } from './fixtures/unifiedScreenDesignerLegacyFixtures.js';

const legacy = {
  meta: { resolution: { width: 1920, height: 1080 } },
  ui: {
    titleScreen: { background: 'ui/title/bg.png', elements: [{ id: 'load', type: 'button', text: 'Load', action: 'load', x: 120, y: 80, width: 300, height: 60 }] },
    gameMenu: { gap: '12px' }, settingsScreen: {}, saveLoadScreen: {}, backlogScreen: {}, dialogueBox: {}, widgetStyles: {}, theme: {}, motion: {},
  },
  systems: { gallery: { cg: {} }, endings: {} },
};

describe('legacy UI adapters and theme projection', () => {
  it('is pure, deterministic, and idempotent across all seven screens', () => {
    const before = structuredClone(legacy);
    for (const id of ['title', 'gameplay', 'gameMenu', 'settings', 'saveLoad', 'backlog', 'gallery']) {
      const first = adaptLegacyUiScreen(legacy, id);
      const second = adaptLegacyUiScreen(legacy, id);
      expect(second).toEqual(first);
      expect(adaptLegacyUiScreen({ ui: { screens: { [id]: first.document } } }, id).document).toEqual(first.document);
    }
    expect(legacy).toEqual(before);
  });

  it('maps resolution-aware title layout and contextual load action', () => {
    const result = adaptLegacyUiScreen(legacy, 'title');
    const load = result.document.nodes.find(node => node.id === 'title.load');
    expect(result.document.viewport).toEqual({ width: 1920, height: 1080 });
    expect(load.layout.offset).toEqual({ x: 120, y: 80 });
    expect(load.action).toEqual({ type: 'open-screen', params: { screenId: 'saveLoad', mode: 'load', source: 'title' } });
  });

  it('maps every customized Phase 1 legacy surface to a valid canonical inspection document', () => {
    const script = { meta: { resolution: { width: 1280, height: 720 } }, ui: CUSTOMIZED_LEGACY_UI, systems: { gallery: { cg: {} }, endings: {} } };
    for (const id of ['title', 'gameplay', 'gameMenu', 'settings', 'saveLoad', 'backlog', 'gallery']) {
      const result = adaptLegacyUiScreen(script, id);
      expect(validateUiDocument(result.document, { screenId: id })).toEqual([]);
    }
  });

  it('reports unsupported and lossy legacy values', () => {
    const unknown = adaptLegacyUiScreen({ ui: { titleScreen: { elements: [{ type: 'html' }] } } }, 'title');
    expect(unknown.diagnostics[0]).toMatchObject({ code: 'ui-legacy-field-unsupported', severity: 'warning' });
    const lossy = adaptLegacyUiScreen({ ui: { gameMenu: { gap: 'calc(10px + 1vw)' } } }, 'gameMenu');
    expect(lossy.diagnostics[0]).toMatchObject({ code: 'ui-legacy-value-loss', severity: 'warning' });
  });

  it('creates protected compatibility envelopes for shared overlays', () => {
    for (const id of ['textInput', 'confirmation', 'videoControls']) expect(adaptLegacyUiOverlay(legacy, id).document.nodes[1].parts.length).toBeGreaterThan(0);
  });

  it('projects theme-owned canonical data without transient state or actions', () => {
    const title = adaptLegacyUiScreen(legacy, 'title').document;
    title.nodes[1].runtimeState = { hovered: true };
    title.tracks = [{ id: 'title.fade' }];
    const projection = projectCanonicalThemeScreens({ ui: { screenAuthorities: { title: 'canonical-active' }, screens: { title } } });
    expect(projection.screens.title.nodes[1]).not.toHaveProperty('runtimeState');
    expect(projection.screens.title.nodes[1]).not.toHaveProperty('action');
    expect(projection.screens.title).not.toHaveProperty('tracks');
    expect(projection.diagnostics[0].code).toBe('ui-theme-projection-unsupported');
  });
});
