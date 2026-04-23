/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: vi.fn((value) => `resolved:${value}`),
}));

import {
  BUTTON_FAMILY_SELECTOR_REGISTRY,
  applyButtonFamilies,
  applyNineSlice,
  resetButtonFamilies,
  resetNineSlice,
} from '../src/engine/ThemeManager.js';
import { resolvePath } from '../src/engine/assetPath.js';

function getNineSliceCss() {
  return document.getElementById('galgame-nine-slice')?.textContent ?? '';
}

function getButtonFamilyCss() {
  return document.getElementById('galgame-button-families')?.textContent ?? '';
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

  it('keeps dialogueBox nine-slice overflow visible so floating nameplates are not clipped above the frame', () => {
    applyNineSlice({
      nineSlice: {
        dialogueBox: {
          src: 'ui/dialogue/frame.webp',
          slice: [24, 24, 24, 24],
          width: [24, 24, 24, 24],
        },
      },
    });

    const css = getNineSliceCss();
    expect(css).toContain('#dialogue-box { overflow: visible; isolation: isolate;');
    expect(css).not.toContain('#dialogue-box { overflow: hidden; isolation: isolate;');
    expect(css).toContain('url("resolved:ui/dialogue/frame.webp")');
  });

  it('exports the locked button-family selector registry and resolves three-state family imagery', () => {
    expect(BUTTON_FAMILY_SELECTOR_REGISTRY).toEqual({
      gameMenuButton: ['.game-menu-button'],
      qab: ['.qab-btn'],
      closeButton: [
        '.save-load-close',
        '.backlog-close',
        '.settings-close',
        '.settings-structured-close',
        '.settings-structured-footer-close',
        '.settings-custom-close',
      ],
      pageTabPager: ['.page-tab', '.page-dot'],
      settingsTab: ['.settings-tab-btn', '.gm-tab'],
    });

    applyButtonFamilies({
      buttonFamilies: {
        gameMenuButton: {
          normal: 'ui/buttons/game-menu-normal.webp',
          hover: 'ui/buttons/game-menu-hover.webp',
          pressed: 'ui/buttons/game-menu-pressed.webp',
        },
        qab: {
          normal: 'ui/buttons/qab-normal.webp',
          hover: 'ui/buttons/qab-hover.webp',
          pressed: 'ui/buttons/qab-pressed.webp',
        },
        closeButton: {
          normal: 'ui/buttons/close-normal.webp',
          hover: 'ui/buttons/close-hover.webp',
          pressed: 'ui/buttons/close-pressed.webp',
        },
      },
    });

    expect(resolvePath).toHaveBeenCalledWith('ui/buttons/game-menu-normal.webp');
    expect(resolvePath).toHaveBeenCalledWith('ui/buttons/game-menu-hover.webp');
    expect(resolvePath).toHaveBeenCalledWith('ui/buttons/game-menu-pressed.webp');
    expect(resolvePath).toHaveBeenCalledWith('ui/buttons/qab-normal.webp');
    expect(resolvePath).toHaveBeenCalledWith('ui/buttons/qab-hover.webp');
    expect(resolvePath).toHaveBeenCalledWith('ui/buttons/qab-pressed.webp');
    expect(resolvePath).toHaveBeenCalledWith('ui/buttons/close-normal.webp');
    expect(resolvePath).toHaveBeenCalledWith('ui/buttons/close-hover.webp');
    expect(resolvePath).toHaveBeenCalledWith('ui/buttons/close-pressed.webp');

    const css = getButtonFamilyCss();
    expect(css).toContain('.game-menu-button {');
    expect(css).toContain('url("resolved:ui/buttons/game-menu-normal.webp")');
    expect(css).toContain('.game-menu-button:hover {');
    expect(css).toContain('url("resolved:ui/buttons/game-menu-hover.webp")');
    expect(css).toContain('.game-menu-button:active {');
    expect(css).toContain('url("resolved:ui/buttons/game-menu-pressed.webp")');
    expect(css).toContain('.qab-btn {');
    expect(css).toContain('url("resolved:ui/buttons/qab-normal.webp")');
    expect(css).toContain('.save-load-close, .backlog-close, .settings-close, .settings-structured-close, .settings-structured-footer-close, .settings-custom-close {');
    expect(css).toContain('url("resolved:ui/buttons/close-normal.webp")');
    expect(css).toContain('.save-load-close:hover, .backlog-close:hover, .settings-close:hover, .settings-structured-close:hover, .settings-structured-footer-close:hover, .settings-custom-close:hover {');
    expect(css).toContain('url("resolved:ui/buttons/close-hover.webp")');
    expect(css).toContain('.save-load-close:active, .backlog-close:active, .settings-close:active, .settings-structured-close:active, .settings-structured-footer-close:active, .settings-custom-close:active {');
    expect(css).toContain('url("resolved:ui/buttons/close-pressed.webp")');
  });

  it('maps selected-state button imagery onto existing active semantics for pager and settings tabs', () => {
    applyButtonFamilies({
      buttonFamilies: {
        pageTabPager: {
          normal: 'ui/buttons/page-tab-normal.webp',
          hover: 'ui/buttons/page-tab-hover.webp',
          pressed: 'ui/buttons/page-tab-pressed.webp',
          selected: 'ui/buttons/page-tab-selected.webp',
        },
        settingsTab: {
          normal: 'ui/buttons/settings-tab-normal.webp',
          hover: 'ui/buttons/settings-tab-hover.webp',
          pressed: 'ui/buttons/settings-tab-pressed.webp',
          selected: 'ui/buttons/settings-tab-selected.webp',
        },
      },
    });

    const css = getButtonFamilyCss();
    expect(css).toContain('.page-tab, .page-dot {');
    expect(css).toContain('.page-tab:hover, .page-dot:hover {');
    expect(css).toContain('.page-tab:active, .page-dot:active {');
    expect(css).toContain('.page-tab.active, .page-dot.active {');
    expect(css).toContain('url("resolved:ui/buttons/page-tab-selected.webp")');
    expect(css).toContain('.settings-tab-btn, .gm-tab {');
    expect(css).toContain('.settings-tab-btn.active, .gm-tab.active {');
    expect(css).toContain('url("resolved:ui/buttons/settings-tab-selected.webp")');
  });

  it('skips missing optional states without emitting broken rules or clearing fallback CSS', () => {
    applyButtonFamilies({
      buttonFamilies: {
        settingsTab: {
          normal: 'ui/buttons/settings-tab-normal.webp',
          selected: 'ui/buttons/settings-tab-selected.webp',
        },
      },
    });

    const css = getButtonFamilyCss();
    expect(css).toContain('url("resolved:ui/buttons/settings-tab-normal.webp")');
    expect(css).toContain('.settings-tab-btn.active, .gm-tab.active {');
    expect(css).toContain('url("resolved:ui/buttons/settings-tab-selected.webp")');
    expect(css).not.toContain(':hover');
    expect(css).not.toContain(':active');
    expect(css).not.toContain('undefined');

    resetButtonFamilies();
    expect(getButtonFamilyCss()).toBe('');
  });
});
