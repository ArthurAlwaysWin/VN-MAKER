/**
 * @vitest-environment jsdom
 */

/**
 * Left-Tab Mode + Decorations unit tests
 *
 * Covers:
 *   STRUCT-06: Left-tab sidebar navigation (tabBar.position='left')
 *   DECOR-01:  Header decorations (header.decorations[])
 *   DECOR-02:  Footer reset button (action='reset')
 *   DECOR-03:  Panel background (settingsScreen.background)
 *
 * Run with: npx vitest run tests/leftTabDecorations.test.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────

vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: vi.fn((p) => `resolved:${p}`),
}));

let _tabOnSelect = null;
vi.mock('../src/ui/widgets/TabWidget.js', () => ({
  createTabBar: vi.fn((labels, config, onSelect) => {
    _tabOnSelect = onSelect;
    const el = document.createElement('div');
    el.className = 'gm-tab-bar';
    el.dataset.labels = labels.map(t => t.label || t).join(',');
    labels.forEach((tab) => {
      const btn = document.createElement('button');
      btn.className = 'gm-tab';
      btn.textContent = tab.label || tab;
      el.appendChild(btn);
    });
    const setActive = vi.fn();
    return { el, setActive };
  }),
}));

vi.mock('../src/ui/widgets/SliderWidget.js', () => ({
  createSlider: vi.fn((config, value, min, max, step, onChange) => {
    const el = document.createElement('div');
    el.className = 'gm-slider';
    el.dataset.value = String(value);
    return { el, setValue: vi.fn() };
  }),
  getSliderCSS: vi.fn(() => '.gm-slider {}'),
}));

vi.mock('../src/ui/widgets/ToggleWidget.js', () => ({
  createToggle: vi.fn((key, config, checked, onChange) => {
    const el = document.createElement('div');
    el.className = 'gm-toggle';
    el.dataset.key = key;
    return { el };
  }),
}));

vi.mock('../src/engine/widgetDefaults.js', () => ({
  deepMergeWidgetStyles: vi.fn((styles) => ({
    tab: { shape: 'rectangle', activeColor: '#fff', ...(styles?.tab || {}) },
    toggle: { style: 'pill', activeColor: '#4caf50', ...(styles?.toggle || {}) },
    slider: { trackColor: '#555', fillColor: '#ff6b9d', ...(styles?.slider || {}) },
    panel: {},
    button: {},
  })),
}));

import { SettingsScreen } from '../src/ui/SettingsScreen.js';
import { resolvePath } from '../src/engine/assetPath.js';

// ─── Helpers ──────────────────────────────────────────────

function makeContainer() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

function mockConfigManager() {
  const defaults = {
    masterVolume: 1,
    bgmVolume: 0.5,
    seVolume: 0.8,
    voiceVolume: 0.8,
    textSpeed: 30,
    autoSpeed: 2000,
    dialogueOpacity: 0.8,
    windowMode: 'windowed',
    skipMode: 'readOnly',
  };
  return {
    get: vi.fn((key) => defaults[key]),
    set: vi.fn(),
    save: vi.fn(),
    reset: vi.fn(() => {}),
    config: { ...defaults },
    defaults: { ...defaults },
  };
}

// ─── Layout Fixtures ──────────────────────────────────────

function structuredLayoutWithPosition(position, tabBarOverrides = {}) {
  const tabBar = {
    y: 90,
    height: 56,
    background: 'rgba(0,0,0,0.2)',
    tabs: ['声音', '画面', '游戏'],
    ...tabBarOverrides,
  };
  if (position !== undefined) tabBar.position = position;
  return {
    header: {
      height: 90,
      backgroundImage: null,
      title: { text: '系统设定', fontSize: 28, fontFamily: null, color: '#fff', x: 60, y: 28 },
    },
    tabBar,
    contentArea: { x: 40, y: 160, width: 1200, height: 500 },
    footer: {
      height: 60,
      buttons: [{ id: 'back-to-title', text: '返回标题', x: 1050, y: 15 }],
    },
    elements: [],
  };
}

function structuredLayoutWithDecorations(decorations) {
  return {
    header: {
      height: 90,
      backgroundImage: null,
      title: { text: '系统设定', fontSize: 28, fontFamily: null, color: '#fff', x: 60, y: 28 },
      decorations,
    },
    tabBar: {
      y: 90,
      height: 56,
      background: 'rgba(0,0,0,0.2)',
      tabs: ['声音', '画面', '游戏'],
    },
    contentArea: { x: 40, y: 160, width: 1200, height: 500 },
    footer: {
      height: 60,
      buttons: [{ id: 'back-to-title', text: '返回标题', x: 1050, y: 15 }],
    },
    elements: [],
  };
}

function structuredLayoutWithReset() {
  return {
    header: {
      height: 90,
      backgroundImage: null,
      title: { text: '系统设定', fontSize: 28, fontFamily: null, color: '#fff', x: 60, y: 28 },
    },
    tabBar: {
      y: 90,
      height: 56,
      background: 'rgba(0,0,0,0.2)',
      tabs: ['声音', '画面', '游戏'],
    },
    contentArea: { x: 40, y: 160, width: 1200, height: 500 },
    footer: {
      height: 60,
      buttons: [{ text: '恢复默认', action: 'reset', x: 900, y: 15 }],
    },
    elements: [],
  };
}

function structuredLayoutWithPanelBg(bg, opacity) {
  const layout = {
    header: {
      height: 90,
      backgroundImage: null,
      title: { text: '系统设定', fontSize: 28, fontFamily: null, color: '#fff', x: 60, y: 28 },
    },
    tabBar: {
      y: 90,
      height: 56,
      background: 'rgba(0,0,0,0.2)',
      tabs: ['声音', '画面', '游戏'],
    },
    contentArea: { x: 40, y: 160, width: 1200, height: 500 },
    footer: {
      height: 60,
      buttons: [{ id: 'back-to-title', text: '返回标题', x: 1050, y: 15 }],
    },
    elements: [],
    settingsScreen: {},
  };
  if (bg !== undefined) layout.settingsScreen.background = bg;
  if (opacity !== undefined) layout.settingsScreen.backgroundOpacity = opacity;
  return layout;
}

function structuredLayoutWithFooterActions(buttons) {
  return {
    header: {
      height: 90,
      backgroundImage: null,
      title: { text: '系统设定', fontSize: 28, fontFamily: null, color: '#fff', x: 60, y: 28 },
    },
    tabBar: {
      y: 90,
      height: 56,
      background: 'rgba(0,0,0,0.2)',
      tabs: ['声音', '画面', '游戏'],
    },
    contentArea: { x: 40, y: 160, width: 1200, height: 500 },
    footer: {
      height: 60,
      buttons,
    },
    elements: [],
  };
}

// ─── Tests ────────────────────────────────────────────────

describe('left-tab mode — STRUCT-06', () => {
  let container, screen, cm;

  beforeEach(() => {
    container = makeContainer();
    cm = mockConfigManager();
    screen = new SettingsScreen(container, cm);
    screen.setWidgetStyles({});
    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
  });

  it('position=left creates outer wrapper with flexDirection=row', () => {
    const layout = structuredLayoutWithPosition('left');
    screen.setLayout(layout);
    screen.show();
    const outer = container.querySelector('.settings-structured-outer');
    expect(outer).not.toBeNull();
    expect(outer.style.flexDirection).toBe('row');
  });

  it('position=left creates sidebar with default width 180px', () => {
    const layout = structuredLayoutWithPosition('left');
    screen.setLayout(layout);
    screen.show();
    const sidebar = container.querySelector('.settings-structured-sidebar');
    expect(sidebar).not.toBeNull();
    expect(sidebar.style.width).toBe('180px');
    expect(sidebar.style.flexDirection).toBe('column');
  });

  it('position=left sidebar contains tab buttons stacked vertically', () => {
    const layout = structuredLayoutWithPosition('left');
    screen.setLayout(layout);
    screen.show();
    const sidebar = container.querySelector('.settings-structured-sidebar');
    const buttons = sidebar.querySelectorAll('.settings-tab-btn');
    expect(buttons.length).toBe(3);
    buttons.forEach(btn => {
      expect(btn.style.width).toBe('100%');
    });
  });

  it('position=left creates right column containing header, content, footer', () => {
    const layout = structuredLayoutWithPosition('left');
    screen.setLayout(layout);
    screen.show();
    const right = container.querySelector('.settings-structured-right');
    expect(right).not.toBeNull();
    expect(right.querySelector('.settings-structured-header')).not.toBeNull();
    expect(right.querySelector('.settings-structured-content')).not.toBeNull();
    expect(right.querySelector('.settings-structured-footer')).not.toBeNull();
  });

  it('position=left with tabBar.width=220 sets sidebar width to 220px', () => {
    const layout = structuredLayoutWithPosition('left', { width: 220 });
    screen.setLayout(layout);
    screen.show();
    const sidebar = container.querySelector('.settings-structured-sidebar');
    expect(sidebar.style.width).toBe('220px');
  });

  it('position=left tab with icon renders 24×24 img inside button', () => {
    const layout = structuredLayoutWithPosition('left');
    layout.tabBar.tabs = [
      { label: '声音', icon: 'icons/sound.png' },
      { label: '画面' },
      { label: '游戏' },
    ];
    screen.setLayout(layout);
    screen.show();
    const sidebar = container.querySelector('.settings-structured-sidebar');
    const firstBtn = sidebar.querySelector('.settings-tab-btn');
    const img = firstBtn.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.width).toBe(24);
    expect(img.height).toBe(24);
    expect(img.src).toContain('resolved:icons/sound.png');
  });

  it('position=top renders NO sidebar, horizontal tab bar present', () => {
    const layout = structuredLayoutWithPosition('top');
    screen.setLayout(layout);
    screen.show();
    expect(container.querySelector('.settings-structured-sidebar')).toBeNull();
    expect(container.querySelector('.settings-structured-outer')).toBeNull();
    expect(container.querySelector('.settings-structured-tab-bar')).not.toBeNull();
  });

  it('position omitted renders same as top (backward compat)', () => {
    const layout = structuredLayoutWithPosition(undefined);
    screen.setLayout(layout);
    screen.show();
    expect(container.querySelector('.settings-structured-sidebar')).toBeNull();
    expect(container.querySelector('.settings-structured-outer')).toBeNull();
    expect(container.querySelector('.settings-structured-tab-bar')).not.toBeNull();
  });
});

describe('header decorations — DECOR-01', () => {
  let container, screen, cm;

  beforeEach(() => {
    container = makeContainer();
    cm = mockConfigManager();
    screen = new SettingsScreen(container, cm);
    screen.setWidgetStyles({});
    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
  });

  it('decorations array with 2 items renders 2 img.settings-decoration elements', () => {
    const layout = structuredLayoutWithDecorations([
      { src: 'deco/corner1.png', x: 0, y: 0, width: 60, height: 60 },
      { src: 'deco/corner2.png', x: 900, y: 0, width: 60, height: 60 },
    ]);
    screen.setLayout(layout);
    screen.show();
    const decos = container.querySelectorAll('.settings-decoration');
    expect(decos.length).toBe(2);
  });

  it('each decoration img has absolute position and clamped coordinates', () => {
    const layout = structuredLayoutWithDecorations([
      { src: 'deco/ornament.png', x: 10, y: 20, width: 100, height: 50 },
    ]);
    screen.setLayout(layout);
    screen.show();
    const img = container.querySelector('.settings-decoration');
    expect(img.style.position).toBe('absolute');
    expect(img.src).toContain('resolved:deco/ornament.png');
    expect(img.style.left).toBe('10px');
    expect(img.style.top).toBe('20px');
    expect(img.style.width).toBe('100px');
    expect(img.style.height).toBe('50px');
  });

  it('decoration z-index is 1, title z-index is 2', () => {
    const layout = structuredLayoutWithDecorations([
      { src: 'deco/line.png', x: 0, y: 80, width: 1280, height: 2 },
    ]);
    screen.setLayout(layout);
    screen.show();
    const deco = container.querySelector('.settings-decoration');
    const title = container.querySelector('.settings-structured-title');
    expect(deco.style.zIndex).toBe('1');
    expect(title.style.zIndex).toBe('2');
  });

  it('empty/omitted decorations renders no .settings-decoration elements', () => {
    const layout = structuredLayoutWithDecorations([]);
    screen.setLayout(layout);
    screen.show();
    expect(container.querySelectorAll('.settings-decoration').length).toBe(0);

    const layout2 = structuredLayoutWithDecorations(undefined);
    screen.setLayout(layout2);
    screen.show();
    expect(container.querySelectorAll('.settings-decoration').length).toBe(0);
  });

  it('decoration with missing src is skipped', () => {
    const layout = structuredLayoutWithDecorations([
      { x: 0, y: 0, width: 60, height: 60 },
      { src: 'deco/valid.png', x: 100, y: 0, width: 60, height: 60 },
    ]);
    screen.setLayout(layout);
    screen.show();
    expect(container.querySelectorAll('.settings-decoration').length).toBe(1);
  });
});

describe('footer reset button — DECOR-02', () => {
  let container, screen, cm;

  beforeEach(() => {
    container = makeContainer();
    cm = mockConfigManager();
    screen = new SettingsScreen(container, cm);
    screen.setWidgetStyles({});
    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
  });

  it('action=reset calls configManager.reset() on click', () => {
    const layout = structuredLayoutWithReset();
    screen.setLayout(layout);
    screen.show();
    const resetBtn = container.querySelector('.settings-structured-footer-btn');
    resetBtn.click();
    expect(cm.reset).toHaveBeenCalledTimes(1);
  });

  it('after reset click, content area is re-rendered', () => {
    const layout = structuredLayoutWithReset();
    screen.setLayout(layout);
    screen.show();
    const contentBefore = container.querySelector('.settings-structured-content');
    expect(contentBefore).not.toBeNull();
    const spy = vi.spyOn(screen, '_renderStructuredContent');
    const resetBtn = container.querySelector('.settings-structured-footer-btn');
    resetBtn.click();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('after reset click, onChange callback is fired', () => {
    const layout = structuredLayoutWithReset();
    screen.setLayout(layout);
    const onChangeSpy = vi.fn();
    screen.onChange = onChangeSpy;
    screen.show();
    const resetBtn = container.querySelector('.settings-structured-footer-btn');
    resetBtn.click();
    expect(onChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('action=title calls onTitle callback', () => {
    const layout = structuredLayoutWithFooterActions([
      { text: '返回标题', action: 'title', x: 1050, y: 15 },
    ]);
    screen.setLayout(layout);
    const onTitleSpy = vi.fn();
    screen.onTitle = onTitleSpy;
    screen.show();
    const btn = container.querySelector('.settings-structured-footer-btn');
    btn.click();
    expect(onTitleSpy).toHaveBeenCalledTimes(1);
  });

  it('action=close calls hide()', () => {
    const layout = structuredLayoutWithFooterActions([
      { text: '关闭', action: 'close', x: 1050, y: 15 },
    ]);
    screen.setLayout(layout);
    screen.show();
    const hideSpy = vi.spyOn(screen, 'hide');
    const btn = container.querySelector('.settings-structured-footer-btn');
    btn.click();
    expect(hideSpy).toHaveBeenCalledTimes(1);
    hideSpy.mockRestore();
  });

  it('legacy button with id containing title but no action still calls onTitle', () => {
    const layout = structuredLayoutWithFooterActions([
      { id: 'back-to-title', text: '返回标题', x: 1050, y: 15 },
    ]);
    screen.setLayout(layout);
    const onTitleSpy = vi.fn();
    screen.onTitle = onTitleSpy;
    screen.show();
    const btn = container.querySelector('.settings-structured-footer-btn');
    btn.click();
    expect(onTitleSpy).toHaveBeenCalledTimes(1);
  });
});

describe('panel background — DECOR-03', () => {
  let container, screen, cm;

  beforeEach(() => {
    container = makeContainer();
    cm = mockConfigManager();
    screen = new SettingsScreen(container, cm);
    screen.setWidgetStyles({});
    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
  });

  it('settingsScreen.background creates div.settings-panel-bg with backgroundImage', () => {
    const layout = structuredLayoutWithPanelBg('bg.png');
    screen.setLayout(layout);
    screen.show();
    const bgDiv = container.querySelector('.settings-panel-bg');
    expect(bgDiv).not.toBeNull();
    expect(bgDiv.style.backgroundImage).toContain('resolved:bg.png');
  });

  it('panel bg div has position=absolute, inset=0, zIndex=0, pointerEvents=none', () => {
    const layout = structuredLayoutWithPanelBg('bg.png');
    screen.setLayout(layout);
    screen.show();
    const bgDiv = container.querySelector('.settings-panel-bg');
    expect(bgDiv.style.position).toBe('absolute');
    expect(bgDiv.style.inset).toBe('0px');
    expect(bgDiv.style.zIndex).toBe('0');
    expect(bgDiv.style.pointerEvents).toBe('none');
  });

  it('settingsScreen.backgroundOpacity=0.3 sets panel bg opacity to 0.3', () => {
    const layout = structuredLayoutWithPanelBg('bg.png', 0.3);
    screen.setLayout(layout);
    screen.show();
    const bgDiv = container.querySelector('.settings-panel-bg');
    expect(bgDiv.style.opacity).toBe('0.3');
  });

  it('backgroundOpacity omitted defaults to opacity 1', () => {
    const layout = structuredLayoutWithPanelBg('bg.png');
    screen.setLayout(layout);
    screen.show();
    const bgDiv = container.querySelector('.settings-panel-bg');
    expect(bgDiv.style.opacity).toBe('1');
  });

  it('settingsScreen.background omitted creates no .settings-panel-bg div', () => {
    const layout = structuredLayoutWithPanelBg(undefined);
    screen.setLayout(layout);
    screen.show();
    expect(container.querySelector('.settings-panel-bg')).toBeNull();
  });

  it('content elements sit above panel bg (content has zIndex=1)', () => {
    const layout = structuredLayoutWithPanelBg('bg.png');
    screen.setLayout(layout);
    screen.show();
    const content = container.querySelector('.settings-structured-content');
    expect(content.style.zIndex).toBe('1');
  });
});
