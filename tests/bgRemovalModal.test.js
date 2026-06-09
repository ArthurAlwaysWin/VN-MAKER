import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { assetFilename, toAssetUrl } from '../src/editor/utils/assetUrl.js';

describe('background removal modal loading', () => {
  it('builds asset URLs that preserve special characters in filenames', () => {
    expect(toAssetUrl('characters/放学后 #1?.png')).toBe(
      'asset://characters/%E6%94%BE%E5%AD%A6%E5%90%8E%20%231%3F.png'
    );
  });

  it('extracts filenames from normalized or Windows-style asset paths', () => {
    expect(assetFilename('characters/hero.png')).toBe('hero.png');
    expect(assetFilename('characters\\hero.png')).toBe('hero.png');
  });

  it('keeps local asset images readable by avoiding unconditional CORS mode', () => {
    const source = readFileSync('src/editor/components/resource-library/BgRemovalModal.vue', 'utf8');

    expect(source).toContain("if (/^https?:\\/\\//i.test(src))");
    expect(source).not.toContain("img.crossOrigin = 'anonymous';\n  img.onload");
    expect(source).toContain('img.onerror = () =>');
    expect(source).toContain('loadError.value');
  });
});
