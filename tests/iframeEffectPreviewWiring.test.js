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

describe('iframe effect preview wiring', () => {
  it('declares shared preview-effect runtime state and helpers in main.js', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toContain('let activeEffectPreview = null');
    expect(src).toContain('let previewRestorePending = false');
    expect(src).toContain('function applyPreviewScriptSnapshot(');
    expect(src).toContain('function establishPreviewPageBaseline(');
    expect(src).toContain('async function restorePreviewSnapshot(');
    expect(src).toContain('function postEffectPreviewResult(');
  });

  it('captures a runtime snapshot and restores it through one shared cleanup-first helper', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/const snapshot = engine\.getState\(\);/);
    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*cancelPageTransitionGate\(\);/);
    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*camera\.clear\(\);/);
    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*audio\.stopVoice\(\);/);
    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*characters\.clear\(\);/);
    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*background\.clear\(\);/);
    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*engine\.restoreState\(snapshot\);/);
    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*engine\.resetRenderState\(\);/);
    expect(src).toMatch(/async function restorePreviewSnapshot\([\s\S]*engine\.renderCurrentPage\(\);/);
  });

  it('handles preview-effect and preview-effect-stop messages with explicit result statuses', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/case 'preview-effect': \{/);
    expect(src).toMatch(/case 'preview-effect-stop': \{/);
    expect(src).toContain("status: 'accepted'");
    expect(src).toContain("status: 'completed'");
    expect(src).toMatch(/async function cancelActiveEffectPreview\(status = 'cancelled'/);
    expect(src).toContain("status: 'rejected'");
    expect(src).toContain("status: 'failed'");
  });

  it('rejects runtime requests explicitly for preview-busy, unsupported-effect, restore-failed, and runtime-error paths', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toContain("reason: 'preview-busy'");
    expect(src).toContain("reason: 'unsupported-effect'");
    expect(src).toContain("reason: 'restore-failed'");
    expect(src).toContain("reason: 'runtime-error'");
  });

  it('hydrates a fresh incoming script snapshot before establishing the selected page baseline', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/case 'preview-effect': \{[\s\S]*applyPreviewScriptSnapshot\(msg\);/);
    expect(src).toMatch(/function applyPreviewScriptSnapshot\([\s\S]*engine\.script = request\.script;/);
    expect(src).toMatch(/function applyPreviewScriptSnapshot\([\s\S]*applyTheme\(gameContainer, engine\.script\.ui\?\.theme\);/);
    expect(src).toMatch(/function applyPreviewScriptSnapshot\([\s\S]*applyTitleScreenLayout\(\);/);
    expect(src).toMatch(/function applyPreviewScriptSnapshot\([\s\S]*settingsScreen\.setLayout\(engine\.script\.ui\?\.settingsScreen\);/);
    expect(src).toMatch(/function establishPreviewPageBaseline\([\s\S]*engine\.restoreState\(\{[\s\S]*currentScene: request\.sceneId \|\| 'start'/);
  });

  it('replays each effect kind through its sole owner only', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/if \(request\.effectKind === 'character'\) \{[\s\S]*characters\.show\(/);
    expect(src).toMatch(/if \(request\.effectKind === 'camera'\) \{[\s\S]*camera\.play\(/);
    expect(src).toMatch(/if \(request\.effectKind === 'transition'\) \{[\s\S]*background\.setBackground\(/);
  });

  it('keeps transition preview on the current page identity while using a same-page BackgroundLayer variant', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/if \(request\.effectKind === 'transition'\) \{[\s\S]*previewVariant: 'same-page'/);
    expect(src).toMatch(/if \(request\.effectKind === 'transition'\) \{[\s\S]*await background\.setBackground\(/);
    expect(src).toMatch(/if \(request\.effectKind === 'transition'\) \{[\s\S]*const page = engine\._currentPage\(\);/);
  });

  it('cancels and restores the previous preview before accepting a superseding request', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toMatch(/if \(activeEffectPreview\) \{[\s\S]*await cancelActiveEffectPreview\('cancelled', null, 'superseded'\);/);
    expect(src).toMatch(/async function cancelActiveEffectPreview\([\s\S]*await restorePreviewSnapshot\(preview\.snapshot\);/);
    expect(src).toMatch(/async function cancelActiveEffectPreview\([\s\S]*cancelDetail: cancelDetail/);
  });

  it('orders preview stop and supersede through restorePreviewSnapshot before any next replay starts', () => {
    const src = readProjectFile('src/main.js');

    expectOrdered(src, [
      "case 'preview-effect': {",
      'if (activeEffectPreview) {',
      "await cancelActiveEffectPreview('cancelled', null, 'superseded');",
      'applyPreviewScriptSnapshot(msg);',
      'establishPreviewPageBaseline(msg);',
      'await runEffectPreview(msg);',
    ]);
    expect(src).toMatch(/case 'preview-effect-stop': \{[\s\S]*await cancelActiveEffectPreview\('cancelled', null, 'stop'\);/);
  });
});
