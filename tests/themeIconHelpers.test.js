/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: vi.fn((value) => `resolved:${value}`),
}));

import { resolveThemeIcon, hasThemeIcon } from '../src/ui/themeIconHelpers.js';

describe('themeIconHelpers', () => {
  it('returns escaped fallback text when no icon is configured', () => {
    expect(resolveThemeIcon(null, 'close', '×')).toBe('×');
    expect(resolveThemeIcon({}, 'close', '返回')).toBe('返回');
  });

  it('returns <img> HTML when icon is configured', () => {
    const result = resolveThemeIcon({ close: 'ui/icons/close.png' }, 'close', '×');
    expect(result).toContain('<img');
    expect(result).toContain('src="resolved:ui/icons/close.png"');
    expect(result).toContain('alt="×"');
  });

  it('adds cssClass to <img> when provided', () => {
    const result = resolveThemeIcon({ close: 'ui/icons/close.png' }, 'close', '×', 'close-icon');
    expect(result).toContain('class="close-icon"');
  });

  it('returns fallback for unconfigured slots even when other slots are set', () => {
    expect(resolveThemeIcon({ close: 'ui/icons/close.png' }, 'voiceReplay', '▶')).toBe('▶');
  });

  it('escapes HTML in fallback text', () => {
    expect(resolveThemeIcon(null, 'test', '<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('hasThemeIcon returns true only for configured canonical slots', () => {
    expect(hasThemeIcon({ close: 'ui/icons/close.png' }, 'close')).toBe(true);
    expect(hasThemeIcon({ close: 'ui/icons/close.png' }, 'voiceReplay')).toBe(false);
    expect(hasThemeIcon(null, 'close')).toBe(false);
    expect(hasThemeIcon({}, 'close')).toBe(false);
  });
});
