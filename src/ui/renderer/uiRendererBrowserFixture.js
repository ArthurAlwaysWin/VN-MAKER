import { createUiPreviewHost, createUiRuntimeHost } from './createUiRendererHost.js';
import { UI_RENDERER_FIXTURE_DATA, UI_RENDERER_FIXTURE_DOCUMENT, UI_RENDERER_FIXTURE_STYLES } from './uiRendererFixtures.js';

const status = document.getElementById('fixture-status');
const show = message => { status.textContent = message; };
const runtime = createUiRuntimeHost({
  container: document.getElementById('runtime-host'), dataSources: UI_RENDERER_FIXTURE_DATA, styles: UI_RENDERER_FIXTURE_STYLES,
  actions: { 'start-game': () => show('Runtime action handled: start-game') },
  onDiagnostic: item => show(`Runtime diagnostic: ${item.code}`),
});
const preview = createUiPreviewHost({
  container: document.getElementById('preview-host'), dataSources: UI_RENDERER_FIXTURE_DATA, styles: UI_RENDERER_FIXTURE_STYLES,
  actions: { 'start-game': () => show('Preview non-persistent action handled: start-game') },
  onDiagnostic: item => show(`Preview diagnostic: ${item.code}`),
  onSelectNode: ({ nodeId }) => show(`Preview selected: ${nodeId}`),
});

runtime.mount(UI_RENDERER_FIXTURE_DOCUMENT);
preview.mount(UI_RENDERER_FIXTURE_DOCUMENT);
window.__GM_UI_RENDERER_FIXTURE__ = { runtime, preview, document: UI_RENDERER_FIXTURE_DOCUMENT };
