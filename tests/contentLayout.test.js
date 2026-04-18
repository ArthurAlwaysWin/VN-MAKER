/**
 * @vitest-environment jsdom
 */

/**
 * Content Layout + Row Styling unit tests
 *
 * Covers STRUCT-04 (dual-column grid) and STRUCT-05 (row styling):
 *   - columns=2 renders 2-column CSS Grid
 *   - columns=1 or omitted preserves block flow
 *   - showDividers hairline separators (row-aware with 2-col)
 *   - alternateBackground zebra stripes (row-based)
 *   - labelPosition top/left with flexDirection
 *   - labelWidth custom min-width
 *   - showValueLabel gates slider numeric readout
 *
 * Run with: npx vitest run tests/contentLayout.test.js
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
    el.dataset.labels = labels.join(',');
    labels.forEach((label) => {
      const btn = document.createElement('button');
      btn.className = 'gm-tab';
      btn.textContent = label;
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
import { createTabBar } from '../src/ui/widgets/TabWidget.js';
import { createSlider } from '../src/ui/widgets/SliderWidget.js';
import { createToggle } from '../src/ui/widgets/ToggleWidget.js';
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
    config: { ...defaults },
  };
}

/**
 * Layout fixture with configurable columns.
 * When columns is undefined, the property is omitted entirely.
 */
function structuredLayoutWithColumns(columns) {
  const contentArea = { x: 40, y: 160, width: 1200, height: 500 };
  if (columns !== undefined) contentArea.columns = columns;
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
    contentArea,
    footer: {
      height: 60,
      buttons: [{ id: 'back-to-title', text: '返回标题', x: 1050, y: 15 }],
    },
    elements: [],
  };
}

/**
 * Layout fixture with configurable itemStyle overrides.
 * Default columns: 1 unless overrides include columns.
 */
function structuredLayoutWithItemStyle(itemStyleOverrides) {
  const contentArea = {
    x: 40,
    y: 160,
    width: 1200,
    height: 500,
    columns: itemStyleOverrides.columns ?? 1,
    itemStyle: { ...itemStyleOverrides },
  };
  // Remove columns from itemStyle if accidentally passed
  delete contentArea.itemStyle.columns;
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
    contentArea,
    footer: {
      height: 60,
      buttons: [{ id: 'back-to-title', text: '返回标题', x: 1050, y: 15 }],
    },
    elements: [],
  };
}

// ─── Tests ────────────────────────────────────────────────

describe('content layout — STRUCT-04 grid', () => {

  let container, screen, cfg;

  beforeEach(() => {
    container = makeContainer();
    cfg = mockConfigManager();
    screen = new SettingsScreen(container, cfg);
    _tabOnSelect = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('columns=2 sets container to CSS Grid with 1fr 1fr', () => {
    screen.setLayout(structuredLayoutWithColumns(2));
    screen.show();
    const content = screen.el.querySelector('.settings-structured-content');
    expect(content.style.display).toBe('grid');
    expect(content.style.gridTemplateColumns).toBe('1fr 1fr');
    expect(content.style.gap).toBe('12px 24px');
  });

  it('columns=1 keeps container as block flow', () => {
    screen.setLayout(structuredLayoutWithColumns(1));
    screen.show();
    const content = screen.el.querySelector('.settings-structured-content');
    expect(content.style.display).toBe('block');
    expect(content.style.gridTemplateColumns).toBe('');
  });

  it('columns omitted preserves block flow (backward compat)', () => {
    screen.setLayout(structuredLayoutWithColumns(undefined));
    screen.show();
    const content = screen.el.querySelector('.settings-structured-content');
    expect(content.style.display).toBe('block');
    expect(content.style.gridTemplateColumns).toBe('');
  });

  it('items have padding "0" when columns=2', () => {
    screen.setLayout(structuredLayoutWithColumns(2));
    screen.show();
    const items = screen.el.querySelectorAll('.settings-structured-item');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.style.padding).toBe('0px');
    }
  });

  it('items have padding "12px 0" when columns=1', () => {
    screen.setLayout(structuredLayoutWithColumns(1));
    screen.show();
    const items = screen.el.querySelectorAll('.settings-structured-item');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.style.padding).toBe('12px 0px');
    }
  });
});

describe('content layout — STRUCT-05 row styling', () => {

  let container, screen, cfg;

  beforeEach(() => {
    container = makeContainer();
    cfg = mockConfigManager();
    screen = new SettingsScreen(container, cfg);
    _tabOnSelect = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('showDividers=true draws borderBottom on non-last-row items (1-col)', () => {
    screen.setLayout(structuredLayoutWithItemStyle({ showDividers: true }));
    screen.show();
    const items = screen.el.querySelectorAll('.settings-structured-item');
    expect(items.length).toBeGreaterThan(1);
    // All except last should have border
    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].style.borderBottom).toBe('1px solid rgba(255, 255, 255, 0.15)');
    }
    // Last item has no border
    expect(items[items.length - 1].style.borderBottom).toBe('');
  });

  it('showDividers=true + columns=2 — last row items have no borderBottom', () => {
    screen.setLayout(structuredLayoutWithItemStyle({ showDividers: true, columns: 2 }));
    screen.show();
    const items = screen.el.querySelectorAll('.settings-structured-item');
    expect(items.length).toBeGreaterThan(2);
    // Tab 0 has 4 items → 2 rows. Last row = items[2], items[3]
    const lastRowStart = items.length - (items.length % 2 === 0 ? 2 : 1);
    for (let i = lastRowStart; i < items.length; i++) {
      expect(items[i].style.borderBottom).toBe('');
    }
    // First row items should have border
    expect(items[0].style.borderBottom).toBe('1px solid rgba(255, 255, 255, 0.15)');
  });

  it('alternateBackground=true applies zebra on odd rows (1-col)', () => {
    screen.setLayout(structuredLayoutWithItemStyle({ alternateBackground: true }));
    screen.show();
    const items = screen.el.querySelectorAll('.settings-structured-item');
    expect(items.length).toBeGreaterThan(1);
    // Row 0 (even) = no bg, Row 1 (odd) = zebra
    expect(items[0].style.background).toBe('');
    expect(items[1].style.background).toBe('rgba(255, 255, 255, 0.04)');
  });

  it('alternateBackground=true + columns=2 — both cells in same row share background', () => {
    screen.setLayout(structuredLayoutWithItemStyle({ alternateBackground: true, columns: 2 }));
    screen.show();
    const items = screen.el.querySelectorAll('.settings-structured-item');
    // Tab 0 has 4 items → 2 rows. Row 0 = items[0,1], Row 1 = items[2,3]
    expect(items.length).toBe(4);
    // Row 0 (even) - no background
    expect(items[0].style.background).toBe('');
    expect(items[1].style.background).toBe('');
    // Row 1 (odd) - zebra
    expect(items[2].style.background).toBe('rgba(255, 255, 255, 0.04)');
    expect(items[3].style.background).toBe('rgba(255, 255, 255, 0.04)');
  });

  it('labelPosition="top" sets flexDirection=column and alignItems=stretch', () => {
    screen.setLayout(structuredLayoutWithItemStyle({ labelPosition: 'top' }));
    screen.show();
    const items = screen.el.querySelectorAll('.settings-structured-item');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.style.flexDirection).toBe('column');
      expect(item.style.alignItems).toBe('stretch');
    }
  });

  it('labelPosition="left" (default) keeps flexDirection=row with label minWidth', () => {
    screen.setLayout(structuredLayoutWithItemStyle({ labelPosition: 'left' }));
    screen.show();
    const items = screen.el.querySelectorAll('.settings-structured-item');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.style.flexDirection).toBe('row');
      expect(item.style.alignItems).toBe('center');
    }
    const label = items[0].querySelector('.settings-structured-label');
    expect(label.style.minWidth).toBe('140px');
  });

  it('labelWidth=200 + labelPosition="left" sets label minWidth to 200px', () => {
    screen.setLayout(structuredLayoutWithItemStyle({ labelPosition: 'left', labelWidth: 200 }));
    screen.show();
    const label = screen.el.querySelector('.settings-structured-label');
    expect(label.style.minWidth).toBe('200px');
  });

  it('showValueLabel=false hides sc-setting-value span in slider items', () => {
    screen.setLayout(structuredLayoutWithItemStyle({ showValueLabel: false }));
    screen.show();
    const valueLabels = screen.el.querySelectorAll('.sc-setting-value');
    expect(valueLabels.length).toBe(0);
  });

  it('showValueLabel=true (default) shows sc-setting-value span in slider items', () => {
    screen.setLayout(structuredLayoutWithItemStyle({ showValueLabel: true }));
    screen.show();
    const valueLabels = screen.el.querySelectorAll('.sc-setting-value');
    expect(valueLabels.length).toBeGreaterThan(0);
  });

  it('showValueLabel omitted still shows sc-setting-value (backward compat)', () => {
    screen.setLayout(structuredLayoutWithItemStyle({}));
    screen.show();
    const valueLabels = screen.el.querySelectorAll('.sc-setting-value');
    expect(valueLabels.length).toBeGreaterThan(0);
  });
});
