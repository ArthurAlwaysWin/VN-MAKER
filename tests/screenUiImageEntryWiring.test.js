import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSource(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('screen UI image entry wiring', () => {
  it('rewires DecorationSection image editing to shared picker helpers', () => {
    const source = readSource('src/editor/components/layout/DecorationSection.vue');

    expect(source).toContain('pickUiImage');
    expect(source).toContain('clearUiImage');
    expect(source).not.toContain("onFieldInput(idx, 'src', $event.target.value || '')");
  });

  it('rewires PanelBackgroundSection to shared picker helpers and writes the real settings screen root', () => {
    const source = readSource('src/editor/components/layout/PanelBackgroundSection.vue');

    expect(source).toContain('pickUiImage');
    expect(source).toContain('clearUiImage');
    expect(source).not.toContain('raw.settingsScreen');
    expect(source).not.toContain('cfg.value.settingsScreen?.background');
  });

  it('rewires BacklogSection image fields to shared picker helpers', () => {
    const source = readSource('src/editor/components/layout/BacklogSection.vue');

    expect(source).toContain('pickUiImage');
    expect(source).toContain('clearUiImage');
    expect(source).not.toContain("onField('backgroundImage', $event.target.value || null)");
    expect(source).not.toContain("onNested('header', 'backgroundImage', $event.target.value || null)");
  });

  it('rewires GameMenuSection image fields to shared picker helpers', () => {
    const source = readSource('src/editor/components/layout/GameMenuSection.vue');

    expect(source).toContain('pickUiImage');
    expect(source).toContain('clearUiImage');
    expect(source).not.toContain("onField('backgroundImage', $event.target.value || null)");
  });

  it('rewires SaveLoadSection image fields to shared picker helpers', () => {
    const source = readSource('src/editor/components/layout/SaveLoadSection.vue');

    expect(source).toContain('pickUiImage');
    expect(source).toContain('clearUiImage');
    expect(source).not.toContain("onField('background', $event.target.value || null)");
    expect(source).not.toContain("onNested('header', 'backgroundImage', $event.target.value || null)");
  });
});
