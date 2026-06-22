import { UI_OVERLAY_IDS, UI_SCREEN_IDS, listUiDocumentSchema, validateUiDocument } from '../shared/uiDocumentContract.js';
import { adaptLegacyUiOverlay, adaptLegacyUiScreen, collectCanonicalUiAssetReferences } from '../shared/uiLegacyAdapters.js';

function inspect(script, id, kind) {
  const result = kind === 'overlay' ? adaptLegacyUiOverlay(script, id) : adaptLegacyUiScreen(script, id);
  const path = ['ui', kind === 'overlay' ? 'overlays' : 'screens', id];
  const validation = result.document ? validateUiDocument(result.document, { path, screenId: id, kind }) : [];
  return {
    id, kind, authority: result.authority ?? null, document: result.document,
    diagnostics: [...(result.diagnostics ?? []), ...validation],
    assetReferences: collectCanonicalUiAssetReferences(result.document),
  };
}

export function listUiScreens(script) {
  return {
    schemaVersion: 2,
    screens: UI_SCREEN_IDS.map(id => {
      const value = inspect(script, id, 'screen');
      return { id, authority: value.authority, nodeCount: value.document?.nodes?.length ?? 0, diagnosticCount: value.diagnostics.length };
    }),
    overlays: UI_OVERLAY_IDS.map(id => {
      const value = inspect(script, id, 'overlay');
      return { id, authority: value.authority, nodeCount: value.document?.nodes?.length ?? 0, diagnosticCount: value.diagnostics.length };
    }),
  };
}

export function inspectUiScreen(script, id, { overlay = false } = {}) {
  return inspect(script, id, overlay ? 'overlay' : 'screen');
}

export function listUiNodes(script, id, { overlay = false } = {}) {
  const result = inspectUiScreen(script, id, { overlay });
  return { id, kind: result.kind, authority: result.authority, nodes: result.document?.nodes ?? [], diagnostics: result.diagnostics };
}

export function inspectUiSchema() {
  return listUiDocumentSchema();
}
