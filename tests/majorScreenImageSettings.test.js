/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  addChromeDecoration,
  deleteChromeDecoration,
  setChromeDecorationField,
} from '../src/editor/components/layout/chromeDecorHelpers.js';

// ─── Pure data function tests ────────────────────────────

describe('chromeDecorHelpers', () => {
  it('addChromeDecoration creates chrome.decorations array with a default entry', () => {
    const cfg = {};
    addChromeDecoration(cfg);
    expect(cfg.chrome).toBeDefined();
    expect(cfg.chrome.decorations).toHaveLength(1);
    expect(cfg.chrome.decorations[0]).toEqual({ src: '', x: 0, y: 0, width: 100, height: 100 });
  });

  it('addChromeDecoration appends to existing decorations', () => {
    const cfg = { chrome: { decorations: [{ src: 'ui/a.png', x: 10, y: 20, width: 50, height: 50 }] } };
    addChromeDecoration(cfg);
    expect(cfg.chrome.decorations).toHaveLength(2);
    expect(cfg.chrome.decorations[1]).toEqual({ src: '', x: 0, y: 0, width: 100, height: 100 });
  });

  it('addChromeDecoration does nothing for null config', () => {
    expect(() => addChromeDecoration(null)).not.toThrow();
  });

  it('deleteChromeDecoration removes item at index', () => {
    const cfg = { chrome: { decorations: [{ src: 'a' }, { src: 'b' }, { src: 'c' }] } };
    deleteChromeDecoration(cfg, 1);
    expect(cfg.chrome.decorations).toHaveLength(2);
    expect(cfg.chrome.decorations.map(d => d.src)).toEqual(['a', 'c']);
  });

  it('deleteChromeDecoration does nothing for missing array', () => {
    const cfg = { chrome: {} };
    expect(() => deleteChromeDecoration(cfg, 0)).not.toThrow();
  });

  it('setChromeDecorationField sets a field on a decoration entry', () => {
    const cfg = { chrome: { decorations: [{ src: '', x: 0, y: 0, width: 100, height: 100 }] } };
    setChromeDecorationField(cfg, 0, 'x', 42);
    expect(cfg.chrome.decorations[0].x).toBe(42);
  });

  it('setChromeDecorationField does nothing for out-of-bounds index', () => {
    const cfg = { chrome: { decorations: [{ src: '' }] } };
    expect(() => setChromeDecorationField(cfg, 5, 'x', 42)).not.toThrow();
    expect(cfg.chrome.decorations[0].x).toBeUndefined();
  });
});

// ─── Source file surface tests ───────────────────────────

describe('MajorScreenImageSettings.vue', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src', 'editor', 'components', 'layout', 'MajorScreenImageSettings.vue'),
    'utf8',
  );

  it('uses pickUiImage and clearUiImage for chrome.backgroundImage', () => {
    expect(source).toContain('pickUiImage');
    expect(source).toContain('clearUiImage');
    expect(source).toContain("setScreenNestedField('chrome', 'backgroundImage'");
  });

  it('renders decoration list with src, x, y, width, height inputs', () => {
    expect(source).toContain('chrome.value.decorations');
    expect(source).toContain("'x'");
    expect(source).toContain("'y'");
    expect(source).toContain("'width'");
    expect(source).toContain("'height'");
  });

  it('shows performance hint when decorations exceed 3', () => {
    expect(source).toContain('decorations.length > 3');
    expect(source).toContain('装饰层较多可能影响性能');
  });

  it('uses chrome decoration helpers for add/delete/set', () => {
    expect(source).toContain('addChromeDecoration');
    expect(source).toContain('deleteChromeDecoration');
    expect(source).toContain('setChromeDecorationField');
  });

  it('does not use FileReader or freeform path input', () => {
    expect(source).not.toContain('FileReader');
    expect(source).not.toContain('readAsDataURL');
  });

  it('propagates changes via useScreenLayoutEditor', () => {
    expect(source).toContain('useScreenLayoutEditor');
    expect(source).toContain('setScreenNestedField');
    expect(source).toContain('sendScreenLayoutToPreview');
    expect(source).toContain('commitScreenLayout');
  });
});

describe('MajorScreenImageSettings integration in section components', () => {
  it('SaveLoadSection imports and renders MajorScreenImageSettings', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'layout', 'SaveLoadSection.vue'),
      'utf8',
    );
    expect(source).toContain('MajorScreenImageSettings');
    expect(source).toContain("import MajorScreenImageSettings from './MajorScreenImageSettings.vue'");
  });

  it('BacklogSection imports and renders MajorScreenImageSettings', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'layout', 'BacklogSection.vue'),
      'utf8',
    );
    expect(source).toContain('MajorScreenImageSettings');
    expect(source).toContain("import MajorScreenImageSettings from './MajorScreenImageSettings.vue'");
  });

  it('GameMenuSection imports and renders MajorScreenImageSettings', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'layout', 'GameMenuSection.vue'),
      'utf8',
    );
    expect(source).toContain('MajorScreenImageSettings');
    expect(source).toContain("import MajorScreenImageSettings from './MajorScreenImageSettings.vue'");
  });

  it('DecorationSection supports chrome-level background and decorations', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'layout', 'DecorationSection.vue'),
      'utf8',
    );
    expect(source).toContain('chrome.backgroundImage');
    expect(source).toContain('chromeDecorations');
    expect(source).toContain('addChromeDecoration');
    expect(source).toContain('屏幕背景与装饰');
    expect(source).toContain('装饰层较多可能影响性能');
    // Still has header decorations
    expect(source).toContain('页头装饰');
  });
});
