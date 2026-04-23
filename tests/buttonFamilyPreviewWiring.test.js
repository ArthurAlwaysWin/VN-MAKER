/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Button-family preview routing in ProjectSettings', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src', 'editor', 'views', 'ProjectSettings.vue'),
    'utf8',
  );

  it('routes gameMenuButton to show-screen: gameMenu', () => {
    expect(source).toContain("gameMenuButton");
    expect(source).toContain("screenId: 'gameMenu'");
  });

  it('routes pageTabPager to show-screen: saveLoadScreen', () => {
    expect(source).toContain("pageTabPager");
    expect(source).toContain("screenId: 'saveLoadScreen'");
  });

  it('routes settingsTab and closeButton to show-screen: settingsScreen', () => {
    expect(source).toContain("settingsTab");
    expect(source).toContain("closeButton");
    // settingsScreen is already present for other reasons, but the routing map must use it
    expect(source).toContain("screenId: 'settingsScreen'");
  });

  it('routes qab to show-dialogue-preview', () => {
    expect(source).toContain("qab");
    expect(source).toContain("show-dialogue-preview");
  });

  it('sends update-theme (flushPreview) before switching preview target', () => {
    // The handler must call flushPreview before postMessage show-screen/show-dialogue-preview
    expect(source).toContain('flushPreview');
    // Must have a routing map or switch that maps families to preview targets
    expect(source).toMatch(/BUTTON_FAMILY_PREVIEW_MAP|buttonFamilyPreviewMap|familyPreviewRoutes/);
  });

  it('does not introduce any new iframe message types or sandbox preview', () => {
    // Only allowed message types: show-screen, show-dialogue-preview, update-theme, start, ack-preview
    expect(source).not.toContain("'show-button-preview'");
    expect(source).not.toContain("'button-sandbox'");
    expect(source).not.toContain("'preview-button'");
  });
});
