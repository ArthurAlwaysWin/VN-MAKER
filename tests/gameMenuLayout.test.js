/**
 * @vitest-environment jsdom
 */

/**
 * GameMenu.setLayout(config) unit tests
 *
 * Covers SCREEN-03 and COMPAT-02:
 *   - setLayout(config) stores config and triggers re-render
 *   - setLayout(null) clears config back to null
 *   - _render with null config produces hardcoded default HTML (COMPAT-02)
 *   - Config-driven render applies position/width/background/borderRadius/backdropBlur/buttonGap
 *   - Config-driven buttons use custom text and icons
 *   - Default button labels used when config.buttons entry missing
 *   - CSS values are sanitized, numeric values clamped
 *   - backgroundImage uses resolvePath()
 *   - Click delegation still works after setLayout re-render
 *
 * Run with: npx vitest run tests/gameMenuLayout.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────

vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: vi.fn((p) => `resolved:${p}`),
}));

import { GameMenu } from '../src/ui/GameMenu.js';
import { resolvePath } from '../src/engine/assetPath.js';

// ─── Helpers ──────────────────────────────────────────────

function makeContainer() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

/** Full config matching design spec Section 5.2 */
function fullConfig() {
  return {
    position: 'center',
    width: 260,
    background: 'rgba(0,0,0,0.75)',
    backgroundImage: null,
    borderRadius: 8,
    backdropBlur: 12,
    buttonGap: 8,
    buttons: {
      save:     { text: 'セーブ', icon: null },
      load:     { text: 'ロード', icon: null },
      backlog:  { text: '履歴', icon: null },
      settings: { text: '設定', icon: null },
      title:    { text: 'タイトル', icon: null },
      close:    { text: '戻る', icon: null },
    },
  };
}

/** The 6 default hardcoded button labels */
const DEFAULT_LABELS = {
  save: '存 档',
  load: '读 档',
  backlog: '回 想',
  settings: '设 定',
  title: '返回标题',
  close: '返 回',
};

const ACTIONS = ['save', 'load', 'backlog', 'settings', 'title', 'close'];

// ─── setLayout storage ────────────────────────────────────

describe('GameMenu.setLayout()', () => {
  let container;
  let menu;

  beforeEach(() => {
    container = makeContainer();
    menu = new GameMenu(container);
    resolvePath.mockClear();
  });

  it('starts with _layoutConfig = null', () => {
    expect(menu._layoutConfig).toBe(null);
  });

  it('stores config object on setLayout(config)', () => {
    const cfg = fullConfig();
    menu.setLayout(cfg);
    expect(menu._layoutConfig).toBe(cfg);
  });

  it('clears config on setLayout(null)', () => {
    menu.setLayout(fullConfig());
    menu.setLayout(null);
    expect(menu._layoutConfig).toBe(null);
  });

  it('clears config on setLayout(undefined)', () => {
    menu.setLayout(fullConfig());
    menu.setLayout(undefined);
    expect(menu._layoutConfig).toBe(null);
  });

  it('re-renders on each setLayout call', () => {
    const cfg = fullConfig();
    menu.setLayout(cfg);
    const saveBtn = menu.el.querySelector('[data-action="save"]');
    expect(saveBtn.textContent).toBe('セーブ');

    // Revert to null → back to hardcoded
    menu.setLayout(null);
    const saveBtnAfter = menu.el.querySelector('[data-action="save"]');
    expect(saveBtnAfter.textContent).toBe('存 档');
  });
});

// ─── COMPAT-02: Null config → default rendering ──────────

describe('COMPAT-02: null config default rendering', () => {
  let container;
  let menu;

  beforeEach(() => {
    container = makeContainer();
    menu = new GameMenu(container);
  });

  it('renders all 6 buttons with hardcoded labels', () => {
    const buttons = menu.el.querySelectorAll('.game-menu-button');
    expect(buttons.length).toBe(6);

    for (const btn of buttons) {
      const action = btn.dataset.action;
      expect(ACTIONS).toContain(action);
      expect(btn.textContent).toBe(DEFAULT_LABELS[action]);
    }
  });

  it('renders buttons in correct order', () => {
    const buttons = menu.el.querySelectorAll('.game-menu-button');
    const actions = Array.from(buttons).map((b) => b.dataset.action);
    expect(actions).toEqual(ACTIONS);
  });

  it('has a .game-menu-panel container', () => {
    const panel = menu.el.querySelector('.game-menu-panel');
    expect(panel).not.toBeNull();
  });

  it('does not apply inline styles to panel', () => {
    const panel = menu.el.querySelector('.game-menu-panel');
    expect(panel.style.width).toBe('');
    expect(panel.style.background).toBe('');
    expect(panel.style.borderRadius).toBe('');
    expect(panel.style.backdropFilter).toBe('');
    expect(panel.style.gap).toBe('');
    expect(panel.style.alignSelf).toBe('');
  });

  it('no icon images in default buttons', () => {
    const icons = menu.el.querySelectorAll('.game-menu-icon');
    expect(icons.length).toBe(0);
  });

  it('setLayout(null) after config reverts to identical default', () => {
    // Capture default HTML
    const defaultHtml = menu.el.querySelector('.game-menu-panel').outerHTML;

    // Apply config, then revert
    menu.setLayout(fullConfig());
    menu.setLayout(null);

    const revertedHtml = menu.el.querySelector('.game-menu-panel').outerHTML;
    expect(revertedHtml).toBe(defaultHtml);
  });
});

// ─── Config-driven panel styles ───────────────────────────

describe('Config-driven panel styles', () => {
  let container;
  let menu;

  beforeEach(() => {
    container = makeContainer();
    menu = new GameMenu(container);
  });

  it('position "left" → justifyContent flex-start', () => {
    menu.setLayout({ position: 'left' });
    expect(menu.el.style.justifyContent).toBe('flex-start');
  });

  it('position "right" → justifyContent flex-end', () => {
    menu.setLayout({ position: 'right' });
    expect(menu.el.style.justifyContent).toBe('flex-end');
  });

  it('position "center" → justifyContent center', () => {
    menu.setLayout({ position: 'center' });
    expect(menu.el.style.justifyContent).toBe('center');
  });

  it('width sets panel width in px', () => {
    menu.setLayout({ width: 300 });
    const panel = menu.el.querySelector('.game-menu-panel');
    expect(panel.style.width).toBe('300px');
  });

  it('background sets overlay background', () => {
    menu.setLayout({ background: 'rgba(0,0,0,0.75)' });
    expect(menu.el.style.background).toContain('rgba(0, 0, 0, 0.75)');
  });

  it('background with injection pattern is rejected', () => {
    menu.setLayout({ background: 'red; position: absolute' });
    // Injection rejected → overlay background not changed
    expect(menu.el.style.background).toBe('');
  });

  it('backgroundImage uses resolvePath and sets cover/center', () => {
    menu.setLayout({ backgroundImage: 'ui/menu_bg.png' });
    const panel = menu.el.querySelector('.game-menu-panel');
    expect(resolvePath).toHaveBeenCalledWith('ui/menu_bg.png');
    expect(panel.style.backgroundImage).toContain('resolved:ui/menu_bg.png');
    expect(panel.style.backgroundSize).toBe('cover');
    expect(panel.style.backgroundPosition).toContain('center');
  });

  it('backgroundImage with injection pattern is rejected', () => {
    menu.setLayout({ backgroundImage: 'javascript:alert(1)' });
    const panel = menu.el.querySelector('.game-menu-panel');
    expect(panel.style.backgroundImage).toBe('');
  });

  it('borderRadius sets button border-radius in px', () => {
    menu.setLayout({ borderRadius: 12 });
    const buttons = menu.el.querySelectorAll('.game-menu-button');
    buttons.forEach(btn => {
      expect(btn.style.borderRadius).toBe('12px');
    });
  });

  it('backdropBlur sets overlay backdrop-filter blur', () => {
    menu.setLayout({ backdropBlur: 8 });
    expect(menu.el.style.backdropFilter).toBe('blur(8px)');
  });

  it('buttonGap sets panel gap in px', () => {
    menu.setLayout({ buttonGap: 16 });
    const panel = menu.el.querySelector('.game-menu-panel');
    expect(panel.style.gap).toBe('16px');
  });

  it('null backgroundImage does not set background-image', () => {
    menu.setLayout({ backgroundImage: null });
    const panel = menu.el.querySelector('.game-menu-panel');
    expect(panel.style.backgroundImage).toBe('');
  });
});

// ─── Config-driven button text and icons ──────────────────

describe('Config-driven button text and icons', () => {
  let container;
  let menu;

  beforeEach(() => {
    container = makeContainer();
    menu = new GameMenu(container);
  });

  it('custom text replaces default labels', () => {
    const cfg = fullConfig();
    menu.setLayout(cfg);

    const saveBtn = menu.el.querySelector('[data-action="save"]');
    expect(saveBtn.textContent).toBe('セーブ');

    const loadBtn = menu.el.querySelector('[data-action="load"]');
    expect(loadBtn.textContent).toBe('ロード');
  });

  it('missing buttons config falls back to defaults', () => {
    menu.setLayout({ position: 'center' }); // no buttons key
    for (const action of ACTIONS) {
      const btn = menu.el.querySelector(`[data-action="${action}"]`);
      expect(btn).not.toBeNull();
      expect(btn.textContent).toBe(DEFAULT_LABELS[action]);
    }
  });

  it('partial buttons config: configured buttons get custom text, others get defaults', () => {
    menu.setLayout({
      buttons: {
        save: { text: 'SAVE', icon: null },
        // other buttons not specified
      },
    });
    const saveBtn = menu.el.querySelector('[data-action="save"]');
    expect(saveBtn.textContent).toBe('SAVE');

    const loadBtn = menu.el.querySelector('[data-action="load"]');
    expect(loadBtn.textContent).toBe(DEFAULT_LABELS.load);
  });

  it('button with icon renders img element', () => {
    menu.setLayout({
      buttons: {
        save: { text: 'Save', icon: 'icons/save.png' },
      },
    });
    const saveBtn = menu.el.querySelector('[data-action="save"]');
    const img = saveBtn.querySelector('.game-menu-icon');
    expect(img).not.toBeNull();
    expect(img.tagName).toBe('IMG');
    expect(img.src).toContain('resolved:icons/save.png');
    expect(img.alt).toBe('');
    expect(resolvePath).toHaveBeenCalledWith('icons/save.png');
  });

  it('button with null icon has no img element', () => {
    menu.setLayout({
      buttons: {
        save: { text: 'Save', icon: null },
      },
    });
    const saveBtn = menu.el.querySelector('[data-action="save"]');
    const img = saveBtn.querySelector('.game-menu-icon');
    expect(img).toBeNull();
  });

  it('all 6 buttons rendered in correct order with config', () => {
    menu.setLayout(fullConfig());
    const buttons = menu.el.querySelectorAll('.game-menu-button');
    expect(buttons.length).toBe(6);
    const actions = Array.from(buttons).map((b) => b.dataset.action);
    expect(actions).toEqual(ACTIONS);
  });
});

// ─── Click delegation after re-render ─────────────────────

describe('Click delegation after setLayout re-render', () => {
  let container;
  let menu;

  beforeEach(() => {
    container = makeContainer();
    menu = new GameMenu(container);
  });

  it('callbacks fire after config-driven re-render', () => {
    const saveFn = vi.fn();
    const loadFn = vi.fn();
    menu.onSave = saveFn;
    menu.onLoad = loadFn;

    // Re-render with config
    menu.setLayout(fullConfig());

    // Simulate click on save button
    menu.el.classList.remove('hidden');
    const saveBtn = menu.el.querySelector('[data-action="save"]');
    saveBtn.click();
    expect(saveFn).toHaveBeenCalledOnce();

    // Show again for next click
    menu.el.classList.remove('hidden');
    const loadBtn = menu.el.querySelector('[data-action="load"]');
    loadBtn.click();
    expect(loadFn).toHaveBeenCalledOnce();
  });

  it('close action hides menu without callback', () => {
    menu.setLayout(fullConfig());
    menu.el.classList.remove('hidden');
    menu.el.classList.add('visible');

    const closeBtn = menu.el.querySelector('[data-action="close"]');
    closeBtn.click();
    expect(menu.el.classList.contains('hidden')).toBe(true);
  });

  it('no duplicate callbacks after multiple setLayout calls', () => {
    const saveFn = vi.fn();
    menu.onSave = saveFn;

    // Re-render multiple times
    menu.setLayout(fullConfig());
    menu.setLayout(null);
    menu.setLayout(fullConfig());

    menu.el.classList.remove('hidden');
    const saveBtn = menu.el.querySelector('[data-action="save"]');
    saveBtn.click();
    // Should fire exactly once, not 3 times
    expect(saveFn).toHaveBeenCalledOnce();
  });
});

// ─── Full config integration ──────────────────────────────

describe('Full config integration', () => {
  it('applies all styles from full config', () => {
    const container = makeContainer();
    const menu = new GameMenu(container);
    menu.setLayout(fullConfig());

    const panel = menu.el.querySelector('.game-menu-panel');
    const buttons = menu.el.querySelectorAll('.game-menu-button');
    // position "center" → justifyContent center on overlay
    expect(menu.el.style.justifyContent).toBe('center');
    expect(panel.style.width).toBe('260px');
    // background/blur → overlay
    expect(menu.el.style.background).toContain('rgba(0, 0, 0, 0.75)');
    expect(menu.el.style.backdropFilter).toBe('blur(12px)');
    // borderRadius → each button
    buttons.forEach(btn => {
      expect(btn.style.borderRadius).toBe('8px');
    });
    expect(panel.style.gap).toBe('8px');
  });
});
