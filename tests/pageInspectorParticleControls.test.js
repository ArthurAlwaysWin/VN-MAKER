import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const pageInspectorPath = resolve(projectRoot, 'src/editor/components/page-editor/PageInspector.vue');
const particlePanelPath = resolve(projectRoot, 'src/editor/components/page-editor/ParticlePanel.vue');
const pageEditorPath = resolve(projectRoot, 'src/editor/composables/usePageEditor.js');
const mainPath = resolve(projectRoot, 'src/main.js');
const helpTextsPath = resolve(projectRoot, 'src/editor/helpTexts.js');

function readSource(path) {
  return readFileSync(path, 'utf8');
}

describe('PageInspector particle controls wiring', () => {
  it('adds a dedicated no-code particle panel to page properties', () => {
    const inspector = readSource(pageInspectorPath);
    const panel = readSource(particlePanelPath);

    expect(inspector).toContain("import ParticlePanel from './ParticlePanel.vue';");
    expect(inspector).toContain('<ParticlePanel');
    expect(inspector).toContain(':particles="page.particles"');
    expect(inspector).toContain('@mode-change="setPageParticlesMode"');
    expect(inspector).toContain('@update-particles="setPageParticles"');
    expect(inspector).toContain('@preview="previewPageParticles"');

    expect(panel).toContain('页面粒子');
    expect(panel).toContain('继承上一页');
    expect(panel).toContain('停止粒子');
    expect(panel).toContain('播放粒子');
    expect(panel).toContain('type="range"');
    expect(panel).toContain('type="color"');
    expect(panel).not.toContain('<textarea');
    expect(panel).not.toContain('contenteditable');
    expect(panel).not.toContain('JSON');
  });

  it('commits normalized page particle modes through pushState', () => {
    const inspector = readSource(pageInspectorPath);
    const panel = readSource(particlePanelPath);

    expect(inspector).toContain("import { normalizeParticleConfig } from '../../../shared/particleContract.js';");
    expect(inspector).toMatch(/function\s+setPageParticlesMode\(mode\)/);
    expect(inspector).toMatch(/delete\s+page\.value\.particles;[\s\S]*script\.pushState\(\);/);
    expect(inspector).toMatch(/page\.value\.particles\s*=\s*null;[\s\S]*script\.pushState\(\);/);
    expect(inspector).toMatch(/page\.value\.particles\s*=\s*normalizeParticleConfig/);
    expect(inspector).toMatch(/function\s+setPageParticles\(config\)[\s\S]*script\.pushState\(\);/);

    expect(panel).toContain("defineEmits(['mode-change', 'update-particles', 'preview'])");
    expect(panel).toContain("emit('mode-change', nextMode)");
    expect(panel).toContain("emit('update-particles', normalized)");
    expect(panel).toContain("emit('preview', draftConfig.value)");
  });

  it('routes particle preview through the shared iframe preview-effect surface', () => {
    const inspector = readSource(pageInspectorPath);
    const pageEditor = readSource(pageEditorPath);
    const main = readSource(mainPath);
    const helpTexts = readSource(helpTextsPath);

    expect(inspector).toContain("editor.getEffectPreviewUiState('particle')");
    expect(inspector).toContain("getCurrentPreviewDisabledReason('particle', buildParticlePreviewPayload())");
    expect(inspector).toContain('editor.previewParticleEffect({');
    expect(inspector).toContain('missing-particle-config');
    expect(inspector).toContain('HELP_SCRIPT.pageParticles');

    expect(pageEditor).toMatch(/function\s+previewParticleEffect\(payload\)/);
    expect(pageEditor).toContain("return previewEffect({ effectKind: 'particle', payload });");
    expect(pageEditor).toContain('previewParticleEffect,');
    expect(pageEditor).toContain('missing-particle-config');

    expect(main).toContain("import { normalizeParticleConfig, resolveEffectivePageParticles } from './shared/particleContract.js';");
    expect(main).toMatch(/if \(request\.effectKind === 'particle'\) \{[\s\S]*particles\.play\(particleConfig\)/);
    expect(main).toContain("['character', 'camera', 'transition', 'particle']");

    expect(helpTexts).toContain('pageParticles');
  });
});
