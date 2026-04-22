/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: vi.fn((value) => `resolved:${value}`),
}));

import { applyNineSlice, resetNineSlice } from '../src/engine/ThemeManager.js';
import { resolvePath } from '../src/engine/assetPath.js';

function getNineSliceCss() {
  return document.getElementById('galgame-nine-slice')?.textContent ?? '';
}

describe('ThemeManager UI image handling', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('resolves canonical ui paths before writing border-image CSS for normal, hover, and active states', () => {
    applyNineSlice({
      nineSlice: {
        choiceButton: {
          src: 'ui/buttons/choice-normal.webp',
          slice: [12, 12, 12, 12],
          width: [12, 12, 12, 12],
          outset: [0, 0, 0, 0],
          repeat: 'stretch',
          states: {
            hover: { src: 'ui/buttons/choice-hover.webp' },
            active: { src: 'ui/buttons/choice-active.webp' },
          },
        },
      },
    });

    expect(resolvePath).toHaveBeenCalledWith('ui/buttons/choice-normal.webp');
    expect(resolvePath).toHaveBeenCalledWith('ui/buttons/choice-hover.webp');
    expect(resolvePath).toHaveBeenCalledWith('ui/buttons/choice-active.webp');

    const css = getNineSliceCss();
    expect(css).toContain('url("resolved:ui/buttons/choice-normal.webp")');
    expect(css).toContain('url("resolved:ui/buttons/choice-hover.webp")');
    expect(css).toContain('url("resolved:ui/buttons/choice-active.webp")');
  });

  it('keeps legacy data URLs intact instead of mangling them through asset prefixes', () => {
    applyNineSlice({
      nineSlice: {
        choiceButton: {
          src: 'data:image/png;base64,legacy-normal',
          slice: [20, 20, 20, 20],
          states: {
            hover: { src: 'data:image/png;base64,legacy-hover' },
          },
        },
      },
    });

    expect(resolvePath).toHaveBeenCalledWith('data:image/png;base64,legacy-normal');
    expect(resolvePath).toHaveBeenCalledWith('data:image/png;base64,legacy-hover');

    const css = getNineSliceCss();
    expect(css).toContain('url("resolved:data:image/png;base64,legacy-normal")');
    expect(css).toContain('url("resolved:data:image/png;base64,legacy-hover")');
  });

  it('does not emit broken hover or active rules when optional states are absent', () => {
    applyNineSlice({
      nineSlice: {
        titleButton: {
          src: 'ui/buttons/title.webp',
          slice: [16, 16, 16, 16],
          states: {},
        },
      },
    });

    const css = getNineSliceCss();
    expect(css).not.toContain(':hover::before');
    expect(css).not.toContain(':active::before');

    resetNineSlice();
    expect(getNineSliceCss()).toBe('');
  });
});
