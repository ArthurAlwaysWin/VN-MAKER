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

describe('background transition wiring', () => {
  it('declares concrete gate state for deferred page-enter fan-out', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toContain('let pendingPageEnter = null');
    expect(src).toContain('let pendingCharacterEvents = []');
    expect(src).toContain('let pendingUiEvent = null');
    expect(src).toContain('let pageTransitionGateOpen = false');
    expect(src).toContain('let instantReplayMode = false');
    expect(src).toContain('function flushPageTransitionGate(');
    expect(src).toContain('function cancelPageTransitionGate(');
  });

  it('queues new-page character and expression work while keeping hide_character immediate', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/engine\.on\('show_character',[\s\S]*if \(pageTransitionGateOpen\) \{[\s\S]*pendingCharacterEvents\.push\(/);
    expect(src).toMatch(/engine\.on\('set_expression',[\s\S]*if \(pageTransitionGateOpen\) \{[\s\S]*pendingCharacterEvents\.push\(/);
    expect(src).toMatch(/engine\.on\('hide_character',[\s\S]*characters\.hide\(/);
  });

  it('queues dialogue and choice ui until the background gate flushes', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/engine\.on\('dialogue',[\s\S]*if \(pageTransitionGateOpen\) \{[\s\S]*pendingUiEvent = \{/);
    expect(src).toMatch(/engine\.on\('choice',[\s\S]*if \(pageTransitionGateOpen\) \{[\s\S]*pendingUiEvent = \{/);
    expect(src).toMatch(/function flushPageTransitionGate\([\s\S]*pendingUiEvent/);
  });

  it('waits for BackgroundLayer completion before releasing page_enter side effects', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/engine\.on\('page_enter',[\s\S]*pendingPageEnter = data/);
    expect(src).not.toMatch(/engine\.on\('page_enter',[\s\S]*camera\.play\(data\.camera\)/);
    expect(src).toMatch(/engine\.on\('set_background', async \(data\) => \{/);
    expect(src).toMatch(/await background\.setBackground\(/);
    expect(src).toMatch(/engine\.on\('set_background', async \(data\) => \{[\s\S]*flushPageTransitionGate\(/);
  });

  it('bypasses page-transition gating during instant save-load replay', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/engine\.on\('page_enter', \(data\) => \{[\s\S]*if \(instantReplayMode\) \{[\s\S]*handlePageEnterEffects\(data\);[\s\S]*return;/);
    expect(src).toMatch(/engine\.on\('set_background', async \(data\) => \{[\s\S]*if \(instantReplayMode\) \{[\s\S]*background\.setBackground\(\{ \.\.\.data, duration: 0, transition: 'cut' \}\);[\s\S]*return;/);
    expect(src).toMatch(/function replayCurrentPage\(\{ instant = false \} = \{\}\) \{[\s\S]*instantReplayMode = Boolean\(instant\) \|\| previousInstantReplayMode;[\s\S]*engine\.renderCurrentPage\(\);[\s\S]*instantReplayMode = previousInstantReplayMode;/);
  });

  it('flushes immediately for skip cut and unchanged-background pages', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/background\.setBackground\(\{ \.\.\.data, duration: 0, transition: 'cut' \}\)/);
    expect(src).toMatch(/queueMicrotask\(\(\) => \{[\s\S]*flushPageTransitionGate\(/);
    expect(src).toMatch(/if \(!pageTransitionGateOpen\) return/);
  });

  it('flushes deferred work in stable order after the background resolves', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/function flushPageTransitionGate\([\s\S]*for \(const event of characterEvents\)[\s\S]*playCharacterEvent\(event\.type, event\.data\);/);
    expect(src).toMatch(/function flushPageTransitionGate\([\s\S]*handlePageEnterEffects\(pageEnterData\);/);
    expect(src).toMatch(/function flushPageTransitionGate\([\s\S]*showDialogueEvent\(uiEvent\.data\);/);
    expect(src).toMatch(/function flushPageTransitionGate\([\s\S]*showChoiceEvent\(uiEvent\.data\);/);
  });

  it('fully resets deferred gate buffers when cancellation runs', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/function cancelPageTransitionGate\(\) \{[\s\S]*pageTransitionToken \+= 1;/);
    expect(src).toMatch(/function cancelPageTransitionGate\(\) \{[\s\S]*pendingPageEnter = null;/);
    expect(src).toMatch(/function cancelPageTransitionGate\(\) \{[\s\S]*pendingCharacterEvents = \[\];/);
    expect(src).toMatch(/function cancelPageTransitionGate\(\) \{[\s\S]*pendingUiEvent = null;/);
    expect(src).toMatch(/function cancelPageTransitionGate\(\) \{[\s\S]*pageTransitionGateOpen = false;/);
    expect(src).toMatch(/function cancelPageTransitionGate\(\) \{[\s\S]*backgroundTransitionPending = false;/);
  });

  it('cancels pending gate state on replay, title, preview lifecycle, and end flows', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/function replayCurrentPage\(\{ instant = false \} = \{\}\) \{[\s\S]*cancelPageTransitionGate\(\);[\s\S]*dialogueBox\.hide\(\);[\s\S]*camera\.clear\(\);[\s\S]*background\.clear\(\);/);
    expect(src).toMatch(/gameMenu\.onTitle = async \(\) => \{[\s\S]*cancelPageTransitionGate\(\);[\s\S]*camera\.clear\(\)/);
    expect(src).toMatch(/case 'start': \{[\s\S]*cancelPageTransitionGate\(\);[\s\S]*camera\.clear\(\);[\s\S]*background\.clear\(\);/);
    expect(src).toMatch(/case 'stop': \{[\s\S]*cancelPageTransitionGate\(\);[\s\S]*camera\.clear\(\);[\s\S]*background\.clear\(\);/);
    expect(src).toMatch(/if \(engine\._previewMode\) \{[\s\S]*cancelPageTransitionGate\(\);[\s\S]*camera\.clear\(\)/);
    expect(src).toMatch(/setTimeout\(\(\) => \{[\s\S]*cancelPageTransitionGate\(\);[\s\S]*camera\.clear\(\);[\s\S]*background\.clear\(\);/);
  });

  it('keeps normal load aligned with quick-load by stopping auto and skip before replay cleanup runs', () => {
    const src = readProjectFile('src/main.js');
    const normalLoad = sliceBetween(src, 'saveLoadScreen.onLoad = async (slot) => {', 'saveLoadScreen.onDelete = async (slot) => {');
    const quickLoad = sliceBetween(src, 'quickBar.onQuickLoad = async () => {', 'quickBar.onSettings = () => {');

    expect(quickLoad).toContain('stopAuto();');
    expect(quickLoad).toContain('stopSkip();');
    expect(quickLoad).toContain('replayCurrentPage({ instant: true });');

    expect(normalLoad).toContain('stopAuto();');
    expect(normalLoad).toContain('stopSkip();');
    expect(normalLoad).toContain('replayCurrentPage({ instant: true });');
  });

  it('restores effect preview snapshots through the same gate cleanup path used by replay and preview lifecycle resets', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*cancelPageTransitionGate\(\);/);
    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*background\.clear\(\);/);
    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*engine\.renderCurrentPage\(\);/);
    expect(src).toMatch(/async function cancelActiveEffectPreview\([\s\S]*restorePreviewSnapshot\(preview\.snapshot\);/);
  });
});
