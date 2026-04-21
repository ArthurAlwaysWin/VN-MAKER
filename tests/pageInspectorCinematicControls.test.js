import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const pageInspectorPath = resolve(projectRoot, 'src/editor/components/page-editor/PageInspector.vue');
const canvasToolbarPath = resolve(projectRoot, 'src/editor/components/page-editor/CanvasToolbar.vue');
const helpTextsPath = resolve(projectRoot, 'src/editor/helpTexts.js');

function readSource(path) {
  return readFileSync(path, 'utf8');
}

describe('PageInspector cinematic controls wiring', () => {
  it('uses shared cinematic UI helpers instead of local hard-coded option arrays', () => {
    const pageInspectorSource = readSource(pageInspectorPath);

    expect(pageInspectorSource).toContain('getCharacterAnimationUiOptions');
    expect(pageInspectorSource).toContain('getCameraEffectUiOptions');
    expect(pageInspectorSource).toContain('getCameraDirectionUiOptions');
    expect(pageInspectorSource).toContain('getTransitionUiOptions');
    expect(pageInspectorSource).toMatch(/const\s+characterAnimationOptions\s*=\s*computed\(/);
    expect(pageInspectorSource).toMatch(/const\s+cameraEffectOptions\s*=\s*computed\(/);
    expect(pageInspectorSource).toMatch(/const\s+cameraDirectionOptions\s*=\s*computed\(/);
    expect(pageInspectorSource).not.toMatch(/const\s+characterAnimationOptions\s*=\s*\[[\s\S]*fade-in/);
    expect(pageInspectorSource).not.toMatch(/const\s+cameraEffectOptions\s*=\s*\[[\s\S]*shake/);
  });

  it('keeps preview entrypoints inside PageInspector and adds character, camera, and transition replay wiring there', () => {
    const pageInspectorSource = readSource(pageInspectorPath);
    const canvasToolbarSource = readSource(canvasToolbarPath);

    expect(pageInspectorSource).toContain("editor.previewCharacterEffect({ characterId: char.id, animation: char.animation");
    expect(pageInspectorSource).toContain('editor.previewCameraEffect({');
    expect(pageInspectorSource).toContain('editor.previewTransitionEffect({');
    expect(pageInspectorSource).toContain('角色动画');
    expect(pageInspectorSource).toContain('页面镜头');
    expect(pageInspectorSource).toContain('transition-preview');
    expect(pageInspectorSource).toContain('camera-preview');
    expect(pageInspectorSource).toContain('char-animation-row');
    expect(pageInspectorSource).toContain('camera-settings');
    expect(pageInspectorSource).not.toContain('CanvasToolbar');

    expect(canvasToolbarSource).not.toContain('previewCharacterEffect');
    expect(canvasToolbarSource).not.toContain('previewCameraEffect');
    expect(canvasToolbarSource).not.toContain('previewTransitionEffect');
    expect(canvasToolbarSource).not.toContain('效果重播');
  });

  it('renders camera direction conditionally and commits clamped camera setters through pushState', () => {
    const pageInspectorSource = readSource(pageInspectorPath);

    expect(pageInspectorSource).toMatch(/v-if="selectedCameraEffect === 'shake' \|\| selectedCameraEffect === 'pan'"/);
    expect(pageInspectorSource).toMatch(/function\s+setCameraDurationMs\(val\)/);
    expect(pageInspectorSource).toMatch(/Math\.min\(2000,\s*Math\.max\(100,\s*parseInt\(val,\s*10\)\s*\|\|\s*800\)\)/);
    expect(pageInspectorSource).toMatch(/function\s+setCameraIntensity\(value\)/);
    expect(pageInspectorSource).toMatch(/function\s+setCameraDirection\(value\)/);
    expect(pageInspectorSource).toMatch(/page\.value\.camera \?\?= \{\s*effect:\s*'',\s*durationMs:\s*800,\s*intensity:\s*'medium'/);
    expect(pageInspectorSource).toMatch(/script\.pushState\(\);/);
  });

  it('consumes scoped preview UI state and centralized help text keys instead of a local preview state machine', () => {
    const pageInspectorSource = readSource(pageInspectorPath);
    const helpTextsSource = readSource(helpTextsPath);

    expect(pageInspectorSource).toContain("editor.getEffectPreviewUiState('character'");
    expect(pageInspectorSource).toContain("editor.getEffectPreviewUiState('camera'");
    expect(pageInspectorSource).toContain("editor.getEffectPreviewUiState('transition'");
    expect(pageInspectorSource).not.toMatch(/const\s+.*preview.*=\s*reactive\(/);
    expect(pageInspectorSource).not.toMatch(/const\s+.*preview.*=\s*ref\(/);
    expect(pageInspectorSource).toContain('HELP_SCRIPT.charAnimation');
    expect(pageInspectorSource).toContain('HELP_SCRIPT.pageCamera');
    expect(pageInspectorSource).toContain('HELP_SCRIPT.cinematicPreview');
    expect(pageInspectorSource).toContain('previewStatusText');

    expect(helpTextsSource).toContain('charAnimation');
    expect(helpTextsSource).toContain('pageCamera');
    expect(helpTextsSource).toContain('cinematicPreview');
  });
});
