import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readProjectFile(relativePath) {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  return readFileSync(path.resolve(testDir, '..', relativePath), 'utf-8');
}

function sliceBetween(source, startMarker, endMarker) {
  const startIndex = source.indexOf(startMarker);
  expect(startIndex, `Expected to find "${startMarker}"`).toBeGreaterThanOrEqual(0);

  const endIndex = source.indexOf(endMarker, startIndex + startMarker.length);
  expect(endIndex, `Expected to find "${endMarker}" after "${startMarker}"`).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe('camera cleanup wiring', () => {
  it('instantiates CameraController and triggers it from the page-enter release path', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toContain("import { CameraController } from './ui/CameraController.js'");
    expect(src).toContain("const camera = new CameraController(stageLayer)");
    expect(src).toMatch(/engine\.on\('page_enter',[\s\S]*pendingPageEnter = data/);
    expect(src).toMatch(/function handlePageEnterEffects\(data\) \{[\s\S]*camera\.play\(data\.camera\)/);
    expect(src).toMatch(/function handlePageEnterEffects\(data\) \{[\s\S]*if \(skipMode\) \{[\s\S]*camera\.clear\(\)/);
  });

  it('routes load and quick-load recovery through replayCurrentPage cleanup', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/function replayCurrentPage\(\)[\s\S]*camera\.clear\(\)/);
    expect(src).toMatch(/saveLoadScreen\.onLoad = async \(slot\) => \{[\s\S]*replayCurrentPage\(\)/);
    expect(src).toMatch(/quickBar\.onQuickLoad = async \(\) => \{[\s\S]*replayCurrentPage\(\)/);
  });

  it('clears camera state from title, preview lifecycle, and end reset flows', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/gameMenu\.onTitle = async \(\) => \{[\s\S]*camera\.clear\(\)/);
    expect(src).toMatch(/case 'start': \{[\s\S]*camera\.clear\(\)/);
    expect(src).toMatch(/case 'stop': \{[\s\S]*camera\.clear\(\)/);
    expect(src).toMatch(/engine\.on\('end', \(\) => \{[\s\S]*if \(engine\._previewMode\) \{[\s\S]*camera\.clear\(\)/);
    expect(src).toMatch(/setTimeout\(\(\) => \{[\s\S]*camera\.clear\(\)/);
    expect(src).toMatch(/engine\.on\('end',[\s\S]*camera\.clear\(\)/);
  });

  it('keeps camera cleanup adjacent to the existing stage reset owners', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/function replayCurrentPage\(\) \{[\s\S]*camera\.clear\(\);[\s\S]*characters\.clear\(\);[\s\S]*background\.clear\(\);[\s\S]*engine\.resetRenderState\(\);/);
    expect(src).toMatch(/gameMenu\.onTitle = async \(\) => \{[\s\S]*camera\.clear\(\);[\s\S]*audio\.stopBgm/);
    expect(src).toMatch(/case 'stop': \{[\s\S]*camera\.clear\(\);[\s\S]*audio\.stopBgm\(\{ fadeOut: 0 \}\);[\s\S]*audio\.stopVoice\(\);[\s\S]*engine\.resetRenderState\(\);[\s\S]*characters\.clear\(\);[\s\S]*background\.clear\(\);/);
  });

  it('covers both preview-end and normal-end cleanup branches', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/if \(engine\._previewMode\) \{[\s\S]*dialogueBox\.hide\(\);[\s\S]*camera\.clear\(\);[\s\S]*audio\.stopVoice\(\);[\s\S]*window\.parent\.postMessage/);
    expect(src).toMatch(/setTimeout\(\(\) => \{[\s\S]*camera\.clear\(\);[\s\S]*engine\.resetRenderState\(\);[\s\S]*characters\.clear\(\);[\s\S]*background\.clear\(\);[\s\S]*showTitle\(\);/);
  });

  it('clears camera before preview restart renders the requested page', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/case 'start': \{[\s\S]*establishPreviewPageBaseline\(msg\);/);
    expect(src).toMatch(/function establishPreviewPageBaseline\([\s\S]*camera\.clear\(\);[\s\S]*characters\.clear\(\);[\s\S]*background\.clear\(\);[\s\S]*engine\.resetRenderState\(\);[\s\S]*engine\.renderCurrentPage\(\);/);
  });

  it('preserves load and quick-load reset ordering around replayCurrentPage', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/saveLoadScreen\.onLoad = async \(slot\) => \{[\s\S]*engine\.restoreState\(data\.state\);[\s\S]*isPlaying = true;[\s\S]*replayCurrentPage\(\);/);
    expect(src).toMatch(/quickBar\.onQuickLoad = async \(\) => \{[\s\S]*engine\.restoreState\(data\.state\);[\s\S]*isPlaying = true;[\s\S]*replayCurrentPage\(\);/);
  });

  it('requires normal load to stop auto and skip just like quick-load before camera replay cleanup starts', () => {
    const src = readProjectFile('src/main.js');
    const normalLoad = sliceBetween(src, 'saveLoadScreen.onLoad = async (slot) => {', 'saveLoadScreen.onDelete = async (slot) => {');
    const quickLoad = sliceBetween(src, 'quickBar.onQuickLoad = async () => {', 'quickBar.onSettings = () => {');

    expect(quickLoad).toContain('stopAuto();');
    expect(quickLoad).toContain('stopSkip();');
    expect(quickLoad).toContain('replayCurrentPage();');

    expect(normalLoad).toContain('stopAuto();');
    expect(normalLoad).toContain('stopSkip();');
    expect(normalLoad).toContain('replayCurrentPage();');
  });

  it('clears camera inside preview restore and supersede paths before re-rendering the selected page', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*camera\.clear\(\);[\s\S]*audio\.stopVoice\(\);[\s\S]*characters\.clear\(\);[\s\S]*background\.clear\(\);[\s\S]*engine\.renderCurrentPage\(\);/);
    expect(src).toMatch(/async function cancelActiveEffectPreview\([\s\S]*await restorePreviewSnapshot\(preview\.snapshot\);/);
  });
});
