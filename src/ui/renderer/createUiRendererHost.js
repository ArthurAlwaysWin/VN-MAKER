import { SharedUiRenderer } from './SharedUiRenderer.js';
import { createUiActionRouter } from './uiActionRouter.js';
import { createUiDataSourceRegistry } from './uiDataSourceRegistry.js';
import { createUiSemanticWidgetHost } from './uiSemanticWidgetHost.js';

export function createUiRendererHost({
  container,
  mode = 'runtime',
  actions = {},
  dataSources = {},
  semanticWidgets = {},
  styles = {},
  resolveAssetUrl = path => path,
  onDiagnostic = () => {},
  onSelectNode = null,
} = {}) {
  const diagnostics = [];
  const measurements = { hostMode: 'in-process', mounts: 0, updates: 0, unmounts: 0, samples: [], lastSelectionLatencyMs: null };
  const reportDiagnostic = item => { diagnostics.push(item); onDiagnostic(item); };
  const host = {
    mode, diagnostics, measurements, styles, resolveAssetUrl, onSelectNode,
    reportDiagnostic,
    actionRouter: createUiActionRouter({ mode, handlers: actions, onDiagnostic: reportDiagnostic }),
    dataSources: createUiDataSourceRegistry(dataSources),
    semanticWidgets: createUiSemanticWidgetHost(semanticWidgets),
    recordMeasurement(sample) {
      measurements.samples.push(sample);
      if (measurements.samples.length > 50) measurements.samples.shift();
      if (sample.operation === 'mount') measurements.mounts += 1;
      if (sample.operation === 'update') measurements.updates += 1;
      if (sample.operation === 'unmount') measurements.unmounts += 1;
    },
  };
  host.renderer = new SharedUiRenderer(container, host);
  host.mount = (document, options) => host.renderer.mount(document, options);
  host.update = (document, options) => host.renderer.update(document, options);
  host.unmount = () => host.renderer.unmount();
  host.updateData = (next, document = host.renderer.document) => {
    host.dataSources.replace(next);
    return document ? host.renderer.update(document) : null;
  };
  return host;
}

export const createUiRuntimeHost = options => createUiRendererHost({ ...options, mode: 'runtime' });
export const createUiPreviewHost = options => createUiRendererHost({ ...options, mode: 'preview' });
