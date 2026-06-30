import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';

import { createUiRuntimeHost } from '../src/ui/renderer/createUiRendererHost.js';
import { normalizeUiLayout } from '../src/shared/uiLayoutContract.js';
import { applySyntheticNodePatch, createUnifiedEditorShellFixture } from '../src/editor/screen-designer/unifiedEditorShellModel.js';

const outputPath = path.resolve(process.argv[2] || '.tmp/phase11-performance.json');
const dom = new JSDOM('<!doctype html><div id="host" style="width:1280px;height:720px"></div>', { pretendToBeVisual: true });
const document = dom.window.document;
const nodes = [{
  id: 'large.root', type: 'panel', parentId: null, order: 0, parts: [], layout: normalizeUiLayout(),
}];
for (let index = 0; index < 300; index += 1) {
  nodes.push({
    id: `large.item.${index}`,
    type: 'button',
    parentId: 'large.root',
    order: index,
    parts: [],
    layout: normalizeUiLayout({
      anchor: { minX: (index % 10) / 10, minY: Math.floor(index / 10) / 30, maxX: (index % 10) / 10, maxY: Math.floor(index / 10) / 30 },
      size: { width: 110, height: 28 },
    }),
    content: { text: `Item ${index}`, accessibleName: `Item ${index}` },
    action: { type: 'close-screen' },
  });
}
const largeDocument = { schemaVersion: 2, id: 'large-list', kind: 'screen', authority: 'canonical-active', rootId: 'large.root', viewport: { width: 1280, height: 720 }, nodes };
const host = createUiRuntimeHost({ container: document.getElementById('host'), actions: { 'close-screen': () => {} } });

const mounted = host.mount(largeDocument);
for (let index = 0; index < 25; index += 1) {
  const next = JSON.parse(JSON.stringify(largeDocument));
  next.nodes[index + 1].content.text = `Updated ${index}`;
  host.update(next);
}
const rendererSamples = host.measurements.samples.filter(sample => ['mount', 'update'].includes(sample.operation));
const coldMountMs = rendererSamples.find(sample => sample.operation === 'mount')?.elapsedMs ?? null;
const updateSamples = rendererSamples.filter(sample => sample.operation === 'update').map(sample => sample.elapsedMs);
const sortedUpdates = [...updateSamples].sort((left, right) => left - right);
const warmUpdateMedianMs = sortedUpdates[Math.floor(sortedUpdates.length / 2)] ?? null;
const warmUpdateP95Ms = sortedUpdates[Math.floor(sortedUpdates.length * 0.95)] ?? null;

let editorDocument = createUnifiedEditorShellFixture();
const editorStarted = performance.now();
for (let index = 0; index < 1000; index += 1) {
  editorDocument = applySyntheticNodePatch(editorDocument, 'title.start', { path: 'layout.offset.x', value: index % 40 });
}
const editorPatchMs = performance.now() - editorStarted;

const gamepadStarted = performance.now();
for (let index = 0; index < 1000; index += 1) host.renderer.gamepad.move(index % 2 ? 1 : -1);
const gamepadNavigationMs = performance.now() - gamepadStarted;

host.unmount();
const report = {
  generatedAt: new Date().toISOString(),
  renderer: {
    nodeCount: nodes.length,
    coldMountMs,
    warmUpdateMedianMs,
    warmUpdateP95Ms,
    coldToWarmRatio: coldMountMs && warmUpdateMedianMs ? coldMountMs / warmUpdateMedianMs : null,
    unmountedEntries: host.renderer.entries.size,
    remainingRootChildren: host.renderer.root.childElementCount,
  },
  editor: { operationCount: 1000, totalMs: editorPatchMs, averageMs: editorPatchMs / 1000 },
  gamepad: { operationCount: 1000, totalMs: gamepadNavigationMs, averageMs: gamepadNavigationMs / 1000 },
};
report.ok = report.renderer.unmountedEntries === 0
  && report.renderer.remainingRootChildren === 0
  && report.renderer.warmUpdateP95Ms < 100
  && report.editor.averageMs < 5
  && report.gamepad.averageMs < 5;
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
