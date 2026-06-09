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

  it('loads local asset images with CORS mode so canvas pixels stay readable', () => {
    const source = readFileSync('src/editor/components/resource-library/BgRemovalModal.vue', 'utf8');

    expect(source).toContain("if (/^(https?:|asset:)\\/\\//i.test(src))");
    expect(source).toContain("img.crossOrigin = 'anonymous'");
    expect(source).toContain('img.onerror = () =>');
    expect(source).toContain('loadError.value');
  });

  it('offers an enclosed background removal option without disabling edge-connected safety', () => {
    const source = readFileSync('src/editor/components/resource-library/BgRemovalModal.vue', 'utf8');

    expect(source).toContain('const edgeConnectedOnly = ref(true)');
    expect(source).toContain('const removeEnclosedRegions = ref(true)');
    expect(source).toContain('同时删除封闭背景区域');
    expect(source).toContain('removeEnclosedRegions: edgeConnectedOnly.value && removeEnclosedRegions.value');
  });
});
