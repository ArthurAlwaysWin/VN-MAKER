import { normalizeUiLayout } from '../../shared/uiLayoutContract.js';
import { normalizeUiDocument } from '../../shared/uiDocumentContract.js';

const layout = overrides => normalizeUiLayout(overrides);

export const UI_RENDERER_FIXTURE_DATA = Object.freeze({
  'save.slots': Object.freeze([
    Object.freeze({ slot: '1', previewText: 'Moonlit platform' }),
    Object.freeze({ slot: '2', previewText: 'Archive door' }),
  ]),
});

export const UI_RENDERER_FIXTURE_STYLES = Object.freeze({
  engineStyles: Object.freeze({
    panel: Object.freeze({ color: '#f5f2ff', backgroundColor: '#11182c' }),
    button: Object.freeze({ color: '#11182c', backgroundColor: '#d8c8ff', borderRadius: 8, fontSize: 16 }),
  }),
  theme: Object.freeze({ styles: Object.freeze({
    'buttons.primary': Object.freeze({ backgroundColor: '#e5d9ff', borderRadius: 12 }),
    'panels.fixture': Object.freeze({ backgroundColor: '#18223b' }),
  }) }),
  screenStyles: Object.freeze({
    'buttons.primary': Object.freeze({ color: '#201833' }),
  }),
});

export const UI_RENDERER_FIXTURE_DOCUMENT = Object.freeze(normalizeUiDocument({
  schemaVersion: 2,
  id: 'title',
  kind: 'screen',
  authority: 'canonical-active',
  rootId: 'title.root',
  viewport: { width: 1280, height: 720 },
  nodes: [
    { id: 'title.root', type: 'panel', parentId: null, order: 0, layout: layout(), parts: [], styleRef: 'panels.fixture' },
    { id: 'title.heading', type: 'text', parentId: 'title.root', order: 0, layout: layout({ anchor: { minX: 0.5, maxX: 0.5, minY: 0.12, maxY: 0.12 }, size: { width: 520, height: 80 } }), parts: [], content: { text: 'Shared Renderer Fixture' }, style: { color: '#ffffff', fontSize: 34, fontWeight: 700 } },
    { id: 'title.start', type: 'button', parentId: 'title.root', order: 1, layout: layout({ anchor: { minX: 0.5, maxX: 0.5, minY: 0.36, maxY: 0.36 }, size: { width: 260, height: 56 } }), parts: [], content: { text: 'Start diagnostic', accessibleName: 'Start fixture action' }, styleRef: 'buttons.primary', states: { focused: { borderColor: '#ffffff', borderWidth: 3 } }, action: { type: 'start-game' } },
    { id: 'title.persist', type: 'button', parentId: 'title.root', order: 2, layout: layout({ anchor: { minX: 0.5, maxX: 0.5, minY: 0.48, maxY: 0.48 }, size: { width: 260, height: 56 } }), parts: [], content: { text: 'Persistent action probe', accessibleName: 'Persistent preview action probe' }, styleRef: 'buttons.primary', action: { type: 'delete-slot', params: { slot: '1' } } },
    { id: 'title.slots', type: 'save-slot-grid', parentId: 'title.root', order: 3, layout: layout({ anchor: { minX: 0.5, maxX: 0.5, minY: 0.68, maxY: 0.68 }, size: { width: 420, height: 100 } }), parts: ['slots', 'pagination'], content: { accessibleName: 'Deterministic save slot fixture' }, binding: { source: 'save.slots' } },
  ],
}));
