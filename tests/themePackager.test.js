import { zipSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';

import { parseThemeZip } from '../src/utils/themePackager.js';

function createFullThemePackage({
  id = 'moonlight',
  assetRoot = `ui/themes/${id}/`,
  filePath = `ui/themes/${id}/dialogue/nameplate.png`,
  titleBackgroundPath = `ui/themes/${id}/title/background.png`,
  titleLogoPath = `ui/themes/${id}/title/logo.png`,
} = {}) {
  return zipSync({
    'manifest.json': strToU8(JSON.stringify({
      formatVersion: 2,
      packageVersion: '1.0.0',
      id,
      name: 'Moonlight',
      assetRoot,
      preview: 'assets/_meta/preview.png',
        files: [
          {
            path: filePath,
            sha256: 'nameplate-sha',
            bytes: 4,
          },
          {
            path: titleBackgroundPath,
            sha256: 'title-background-sha',
            bytes: 4,
          },
          {
            path: titleLogoPath,
            sha256: 'title-logo-sha',
            bytes: 4,
          },
        ],
      })),
      'theme.json': strToU8(JSON.stringify({
        ui: {
        theme: {
          tokens: {
            primary: '#ffffff',
          },
        },
          dialogueBox: {
            nameplateBackgroundImage: filePath,
          },
          titleScreen: {
            background: titleBackgroundPath,
            bgm: 'audio/title-theme.ogg',
            elements: [
              {
                type: 'image',
                src: titleLogoPath,
                x: 160,
                y: 80,
                width: 320,
                height: 180,
              },
            ],
          },
        },
      })),
    'assets/_meta/preview.png': new Uint8Array([137, 80, 78, 71]),
    [`assets/${filePath}`]: new Uint8Array([1, 2, 3, 4]),
    [`assets/${titleBackgroundPath}`]: new Uint8Array([5, 6, 7, 8]),
    [`assets/${titleLogoPath}`]: new Uint8Array([9, 10, 11, 12]),
  });
}

describe('theme packager', () => {
  it('parses full .gmtheme packages into explicit full-package metadata', () => {
    const parsed = parseThemeZip(createFullThemePackage());

    expect(parsed.success).toBe(true);
    expect(parsed.mode).toBe('full');
    expect(parsed.themeId).toBe('moonlight');
    expect(parsed.assetRoot).toBe('ui/themes/moonlight/');
    expect(parsed.coverage).toContain('theme');
    expect(parsed.coverage).toContain('dialogueBox');
    expect(parsed.coverage).toContain('titleScreen');
    expect(parsed.files).toEqual([
      {
        path: 'ui/themes/moonlight/dialogue/nameplate.png',
        sha256: 'nameplate-sha',
        bytes: 4,
      },
      {
        path: 'ui/themes/moonlight/title/background.png',
        sha256: 'title-background-sha',
        bytes: 4,
      },
      {
        path: 'ui/themes/moonlight/title/logo.png',
        sha256: 'title-logo-sha',
        bytes: 4,
      },
    ]);
    expect(parsed.blockingErrors).toEqual([]);
  });

  it('fails closed for corrupt archives and missing full-package payload files', () => {
    const corrupt = parseThemeZip(new Uint8Array([1, 2, 3, 4]));
    expect(corrupt.success).toBe(false);

    const missingTheme = parseThemeZip(zipSync({
      'manifest.json': strToU8(JSON.stringify({
        formatVersion: 2,
        packageVersion: '1.0.0',
        id: 'moonlight',
        assetRoot: 'ui/themes/moonlight/',
        files: [],
      })),
    }));
    expect(missingTheme.success).toBe(true);
    expect(missingTheme.mode).toBe('full');
    expect(missingTheme.blockingErrors).toContain('主题包缺少 theme.json');

    const invalidPath = parseThemeZip(createFullThemePackage({
      filePath: 'assets/ui/themes/moonlight/dialogue/nameplate.png',
    }));
    expect(invalidPath.success).toBe(true);
    expect(invalidPath.mode).toBe('full');
    expect(invalidPath.blockingErrors.length).toBeGreaterThan(0);
  });

  it('keeps legacy .theme import as explicit compatibility-only partial metadata', () => {
    const legacyZip = zipSync({
      'theme.json': strToU8(JSON.stringify({
        formatVersion: 1,
        name: 'Legacy Theme',
        createdAt: '2026-04-27T00:00:00.000Z',
        tokens: {
          primary: '#ffffff',
        },
        nineSlice: {
          dialogueBox: {
            src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
          },
        },
      })),
    });

    const parsed = parseThemeZip(legacyZip);
    expect(parsed.success).toBe(true);
    expect(parsed.mode).toBe('legacy-partial');
    expect(parsed.isFullTheme).toBe(false);
    expect(parsed.missingCoverage).toContain('widgetStyles');
    expect(parsed.missingCoverage).toContain('saveLoadScreen');
    expect(parsed.missingCoverage).toContain('titleScreen');
    expect(parsed.blockingErrors).toEqual([]);
  });
});
