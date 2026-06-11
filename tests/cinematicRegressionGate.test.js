import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readProjectFile(relativePath) {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  return readFileSync(path.resolve(testDir, '..', relativePath), 'utf-8');
}

function expectOrdered(source, orderedSnippets) {
  let lastIndex = -1;

  for (const snippet of orderedSnippets) {
    const nextIndex = source.indexOf(snippet, lastIndex + 1);
    expect(nextIndex, `Expected to find "${snippet}" after index ${lastIndex}`).toBeGreaterThan(lastIndex);
    lastIndex = nextIndex;
  }
}

function sliceBetween(source, startMarker, endMarker) {
  const startIndex = source.indexOf(startMarker);
  expect(startIndex, `Expected to find "${startMarker}"`).toBeGreaterThanOrEqual(0);

  const endIndex = source.indexOf(endMarker, startIndex + startMarker.length);
  expect(endIndex, `Expected to find "${endMarker}" after "${startMarker}"`).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
}

describe('PREV-05 cinematic regression gate', () => {
  it('pins load and quick-load to explicit cleanup-first replay symmetry before the page re-renders', () => {
    const src = readProjectFile('src/main.js');
    const normalLoad = sliceBetween(src, 'saveLoadScreen.onLoad = async (slot) => {', 'saveLoadScreen.onDelete = async (slot) => {');
    const quickLoad = sliceBetween(src, 'quickBar.onQuickLoad = async () => {', 'quickBar.onSettings = () => {');

    expect(src).toMatch(/function replayCurrentPage\(\{ instant = false \} = \{\}\) \{[\s\S]*cancelPageTransitionGate\(\);[\s\S]*dialogueBox\.hide\(\);[\s\S]*camera\.clear\(\);[\s\S]*characters\.clear\(\);[\s\S]*background\.clear\(\);[\s\S]*engine\.resetRenderState\(\);[\s\S]*engine\.renderCurrentPage\(\);/);

    expectOrdered(quickLoad, [
      'if (!engine.restoreState(data.state)) {',
      'stopAuto();',
      'stopSkip();',
      'titleScreen.hide();',
      'audio.stopVoice();',
      'isPlaying = true;',
      'replayCurrentPage({ instant: true });',
    ]);
    expectOrdered(normalLoad, [
      'if (!engine.restoreState(data.state)) {',
      'stopAuto();',
      'stopSkip();',
      'titleScreen.hide();',
      'audio.stopVoice();',
      'isPlaying = true;',
      'replayCurrentPage({ instant: true });',
    ]);
  });

  it('pins skip and auto flows to correctness-first cleanup with safe cut and stale callback cancellation', () => {
    const src = readProjectFile('src/main.js');
    const normalLoad = sliceBetween(src, 'saveLoadScreen.onLoad = async (slot) => {', 'saveLoadScreen.onDelete = async (slot) => {');
    const quickLoad = sliceBetween(src, 'quickBar.onQuickLoad = async () => {', 'quickBar.onSettings = () => {');
    const titleReturn = sliceBetween(src, 'gameMenu.onTitle = async () => {', '// ─── Quick action bar wiring');
    const restorePreview = sliceBetween(src, 'async function restorePreviewSnapshot(snapshot) {', 'async function cancelActiveEffectPreview(');

    expect(src).toMatch(/function handlePageEnterEffects\(data\) \{[\s\S]*if \(skipMode\) \{[\s\S]*camera\.clear\(\);/);
    expect(src).toMatch(/function playCharacterEvent\(type, data\) \{[\s\S]*if \(type === 'show_character'\) \{[\s\S]*if \(skipMode\) \{[\s\S]*characters\.show\(\{ \.\.\.data, duration: 0, transition: 'none', skip: true \}\);/);
    expect(src).toMatch(/engine\.on\('set_background', async \(data\) => \{[\s\S]*if \(skipMode\) \{[\s\S]*background\.setBackground\(\{ \.\.\.data, duration: 0, transition: 'cut' \}\);/);

    expectOrdered(src, [
      'function startAutoTimer() {',
      'const myCallbackId = ++_autoCallbackId;',
      'Promise.all(waits).then(() => {',
      'if (myCallbackId !== _autoCallbackId) return;',
    ]);

    expect(src).toMatch(/function clearAutoTimer\(\) \{[\s\S]*_autoCallbackId\+\+;/);
    expectOrdered(restorePreview, ['stopAuto();', 'stopSkip();']);
    expectOrdered(titleReturn, ['stopAuto();', 'stopSkip();']);
    expectOrdered(quickLoad, ['stopAuto();', 'stopSkip();']);
    expectOrdered(normalLoad, ['stopAuto();', 'stopSkip();']);
  });

  it('pins title return and full preview stop to clean stage owners before stable title or editor surfaces show', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/gameMenu\.onTitle = async \(\) => \{[\s\S]*dialogueBox\.hide\(\);[\s\S]*choiceMenu\.hide\(\);[\s\S]*cancelPageTransitionGate\(\);[\s\S]*camera\.clear\(\);[\s\S]*audio\.stopVoice\(\);[\s\S]*engine\.resetRenderState\(\);[\s\S]*characters\.clear\(\);[\s\S]*background\.clear\(\);[\s\S]*await showTitle\(\);/);
    expect(src).toMatch(/case 'stop': \{[\s\S]*stopAuto\(\);[\s\S]*stopSkip\(\);[\s\S]*dialogueBox\.hide\(\);[\s\S]*choiceMenu\.hide\(\);[\s\S]*cancelPageTransitionGate\(\);[\s\S]*camera\.clear\(\);[\s\S]*audio\.stopBgm\(\{ fadeOut: 0 \}\);[\s\S]*audio\.stopVoice\(\);[\s\S]*engine\.resetRenderState\(\);[\s\S]*characters\.clear\(\);[\s\S]*background\.clear\(\);/);
    expect(src).toMatch(/engine\.on\('end', \(\) => \{[\s\S]*if \(engine\._previewMode\) \{[\s\S]*cancelPageTransitionGate\(\);[\s\S]*camera\.clear\(\);[\s\S]*background\.clear\(\);[\s\S]*audio\.stopVoice\(\);[\s\S]*window\.parent\.postMessage/);
  });

  it('pins preview-effect stop and supersede to restorePreviewSnapshot before any next effect can run', () => {
    const src = readProjectFile('src/main.js');
    const editorSrc = readProjectFile('src/editor/composables/usePageEditor.js');

    expectOrdered(src, [
      "case 'preview-effect': {",
      'if (activeEffectPreview) {',
      "await cancelActiveEffectPreview('cancelled', null, 'superseded');",
      'applyPreviewScriptSnapshot(msg);',
      'establishPreviewPageBaseline(msg);',
      'await runEffectPreview(msg);',
    ]);

    expect(src).toMatch(/case 'preview-effect-stop': \{[\s\S]*await cancelActiveEffectPreview\('cancelled', null, 'stop'\);/);
    expect(src).toMatch(/async function cancelActiveEffectPreview\([\s\S]*await restorePreviewSnapshot\(preview\.snapshot\);/);
    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*cancelPageTransitionGate\(\);[\s\S]*stopAuto\(\);[\s\S]*stopSkip\(\);[\s\S]*camera\.clear\(\);[\s\S]*characters\.clear\(\);[\s\S]*background\.clear\(\);[\s\S]*engine\.renderCurrentPage\(\);/);

    expect(editorSrc).toContain("type: 'preview-effect-stop'");
    expect(editorSrc).toContain("previewSessionType.value === 'effect'");
    expect(editorSrc).not.toContain('createEffectPreviewStateMachine');
    expect(src).not.toContain('cleanupManager');
  });
});
