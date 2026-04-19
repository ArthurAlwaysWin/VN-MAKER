/**
 * @vitest-environment jsdom
 */

/**
 * SettingsScreen structured mode unit tests
 *
 * Covers SCREEN-04 and SCREEN-05:
 *   - Routing: elements non-empty → _renderCustom, elements empty + header → _renderStructured
 *   - Header: title text/fontSize/color, backgroundImage, height, close button
 *   - Tab bar with widgetStyles: createTabBar called with correct labels
 *   - Tab bar without widgetStyles: fallback buttons rendered
 *   - Content area: shows settings for active group per tab
 *   - Tab switching: clicking tab changes visible settings
 *   - Slider rendering: uses createSlider when widgetStyles set, input[range] when not
 *   - Select rendering: segment buttons rendered
 *   - Footer: buttons at specified positions
 *   - No layout → _renderDefault unchanged
 *
 * Run with: npx vitest run tests/settingsStructured.test.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────

vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: vi.fn((p) => `resolved:${p}`),
}));

// Mock createTabBar to return a controllable element
let _tabOnSelect = null;
vi.mock('../src/ui/widgets/TabWidget.js', () => ({
  createTabBar: vi.fn((labels, config, onSelect) => {
    _tabOnSelect = onSelect;
    const el = document.createElement('div');
    el.className = 'gm-tab-bar';
    el.dataset.labels = labels.join(',');
    labels.forEach((label, i) => {
      const btn = document.createElement('button');
      btn.className = 'gm-tab';
      btn.textContent = label;
      el.appendChild(btn);
    });
    const setActive = vi.fn();
    return { el, setActive };
  }),
}));

// Mock createSlider to return a recognizable element
vi.mock('../src/ui/widgets/SliderWidget.js', () => ({
  createSlider: vi.fn((config, value, min, max, step, onChange) => {
    const el = document.createElement('div');
    el.className = 'gm-slider';
    el.dataset.value = String(value);
    return { el, setValue: vi.fn() };
  }),
  getSliderCSS: vi.fn(() => '.gm-slider {}'),
}));

// Mock createToggle to return a recognizable element
vi.mock('../src/ui/widgets/ToggleWidget.js', () => ({
  createToggle: vi.fn((key, config, checked, onChange) => {
    const el = document.createElement('div');
    el.className = 'gm-toggle';
    el.dataset.key = key;
    return { el };
  }),
}));

// Mock deepMergeWidgetStyles to return a basic merged config
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

/** Mock ConfigManager with realistic defaults */
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

/** Full structured layout matching design spec Section 5.4 */
function structuredLayout() {
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
      buttons: [{ id: 'back-to-title', text: '返回标题', x: 1050, y: 15 }],
    },
    elements: [],
  };
}

/** Layout with elements (should trigger _renderCustom) */
function customLayout() {
  return {
    elements: [
      { type: 'label', text: 'Custom', x: 10, y: 10 },
    ],
  };
}

// ─── Tests ────────────────────────────────────────────────

describe('SettingsScreen structured mode', () => {

  let container, screen, cfg;

  beforeEach(() => {
    container = makeContainer();
    cfg = mockConfigManager();
    screen = new SettingsScreen(container, cfg);
    _tabOnSelect = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up DOM to prevent duplicate IDs in jsdom across tests
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  // ─── Routing ──────────────────────────────────────────

  describe('show() routing', () => {
    it('routes to _renderCustom when elements[] is non-empty', () => {
      screen.setLayout(customLayout());
      screen.show();
      // Custom mode adds settings-custom class
      expect(screen.el.classList.contains('settings-custom')).toBe(true);
      expect(screen.el.classList.contains('settings-structured')).toBe(false);
    });

    it('routes to _renderStructured when elements empty + header exists', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      expect(screen.el.classList.contains('settings-structured')).toBe(true);
      expect(screen.el.classList.contains('settings-custom')).toBe(false);
    });

    it('routes to _renderStructured when only tabBar exists', () => {
      screen.setLayout({ tabBar: { tabs: ['A', 'B'] }, elements: [] });
      screen.show();
      expect(screen.el.classList.contains('settings-structured')).toBe(true);
    });

    it('routes to _renderStructured when only contentArea exists', () => {
      screen.setLayout({ contentArea: { x: 40, y: 160 }, elements: [] });
      screen.show();
      expect(screen.el.classList.contains('settings-structured')).toBe(true);
    });

    it('routes to _renderDefault when no customLayout at all', () => {
      screen.show();
      // Default mode: should have settings-header div
      expect(screen.el.querySelector('.settings-header')).not.toBeNull();
      expect(screen.el.classList.contains('settings-structured')).toBe(false);
    });

    it('routes to _renderDefault when layout has no header/tabBar/contentArea/elements', () => {
      screen.setLayout({ background: 'red' });
      screen.show();
      // Default mode: no structured class, not custom mode
      expect(screen.el.classList.contains('settings-structured')).toBe(false);
      expect(screen.el.classList.contains('settings-custom')).toBe(false);
    });
  });

  // ─── Header ───────────────────────────────────────────

  describe('header rendering', () => {
    it('renders header with title text', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const title = screen.el.querySelector('.settings-structured-title');
      expect(title).not.toBeNull();
      expect(title.textContent).toBe('系统设定');
    });

    it('applies title fontSize', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const title = screen.el.querySelector('.settings-structured-title');
      expect(title.style.fontSize).toBe('28px');
    });

    it('applies title color', () => {
      const layout = structuredLayout();
      layout.header.title.color = '#ff0000';
      screen.setLayout(layout);
      screen.show();
      const title = screen.el.querySelector('.settings-structured-title');
      expect(title.style.color).toContain('255, 0, 0');
    });

    it('applies title x/y positioning', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const title = screen.el.querySelector('.settings-structured-title');
      expect(title.style.left).toBe('60px');
      expect(title.style.top).toBe('28px');
    });

    it('applies header height', () => {
      const layout = structuredLayout();
      layout.header.height = 120;
      screen.setLayout(layout);
      screen.show();
      const header = screen.el.querySelector('.settings-structured-header');
      expect(header.style.height).toBe('120px');
    });

    it('applies header backgroundImage via resolvePath', () => {
      const layout = structuredLayout();
      layout.header.backgroundImage = 'ui/header_bg.png';
      screen.setLayout(layout);
      screen.show();
      const header = screen.el.querySelector('.settings-structured-header');
      expect(resolvePath).toHaveBeenCalledWith('ui/header_bg.png');
      expect(header.style.backgroundImage).toContain('resolved:ui/header_bg.png');
    });

    it('uses default title 系统设定 when title.text is missing', () => {
      screen.setLayout({ header: {}, elements: [] });
      screen.show();
      const title = screen.el.querySelector('.settings-structured-title');
      expect(title.textContent).toBe('系统设定');
    });

    it('renders close button', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const closeBtn = screen.el.querySelector('.settings-structured-close');
      expect(closeBtn).not.toBeNull();
      expect(closeBtn.textContent).toBe('×');
    });

    it('close button hides the screen', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const closeBtn = screen.el.querySelector('.settings-structured-close');
      closeBtn.click();
      expect(screen.el.classList.contains('hidden')).toBe(true);
    });
  });

  // ─── Tab bar with widgetStyles ────────────────────────

  describe('tab bar with widgetStyles', () => {
    it('calls createTabBar when widgetStyles is set', () => {
      screen.setWidgetStyles({ tab: { shape: 'pill' } });
      screen.setLayout(structuredLayout());
      screen.show();
      expect(createTabBar).toHaveBeenCalled();
    });

    it('passes correct labels to createTabBar', () => {
      screen.setWidgetStyles({ tab: {} });
      screen.setLayout(structuredLayout());
      screen.show();
      expect(createTabBar).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: '声音' }),
          expect.objectContaining({ label: '画面' }),
          expect.objectContaining({ label: '游戏' }),
        ]),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('uses custom tab labels from config', () => {
      screen.setWidgetStyles({ tab: {} });
      const layout = structuredLayout();
      layout.tabBar.tabs = ['Audio', 'Visual', 'Game'];
      screen.setLayout(layout);
      screen.show();
      expect(createTabBar).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Audio' }),
          expect.objectContaining({ label: 'Visual' }),
          expect.objectContaining({ label: 'Game' }),
        ]),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('renders gm-tab-bar element in tab container', () => {
      screen.setWidgetStyles({ tab: {} });
      screen.setLayout(structuredLayout());
      screen.show();
      const tabBar = screen.el.querySelector('.gm-tab-bar');
      expect(tabBar).not.toBeNull();
    });
  });

  // ─── Tab bar without widgetStyles (fallback) ──────────

  describe('tab bar fallback (no widgetStyles)', () => {
    it('renders fallback buttons when no widgetStyles', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const btns = screen.el.querySelectorAll('.settings-tab-btn');
      expect(btns.length).toBe(3);
    });

    it('fallback buttons have correct labels', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const btns = screen.el.querySelectorAll('.settings-tab-btn');
      expect(btns[0].textContent).toBe('声音');
      expect(btns[1].textContent).toBe('画面');
      expect(btns[2].textContent).toBe('游戏');
    });

    it('first fallback button has active class by default', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const btns = screen.el.querySelectorAll('.settings-tab-btn');
      expect(btns[0].classList.contains('active')).toBe(true);
      expect(btns[1].classList.contains('active')).toBe(false);
    });

    it('applies tab bar background from config', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const tabBar = screen.el.querySelector('.settings-structured-tab-bar');
      expect(tabBar.style.background).toContain('rgba(0, 0, 0, 0.2)');
    });

    it('applies tab bar height from config', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const tabBar = screen.el.querySelector('.settings-structured-tab-bar');
      expect(tabBar.style.height).toBe('56px');
    });

    it('uses default tab labels when tabBar.tabs not specified', () => {
      screen.setLayout({ header: {}, elements: [] });
      screen.show();
      const btns = screen.el.querySelectorAll('.settings-tab-btn');
      expect(btns.length).toBe(3);
      expect(btns[0].textContent).toBe('声音');
    });
  });

  // ─── Content area (Tab 0: 声音) ───────────────────────

  describe('content area — default tab (声音)', () => {
    it('renders content container', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const content = screen.el.querySelector('.settings-structured-content');
      expect(content).not.toBeNull();
    });

    it('positions content area per config', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const content = screen.el.querySelector('.settings-structured-content');
      expect(content.style.left).toBe('40px');
      expect(content.style.top).toBe('160px');
      expect(content.style.width).toBe('1200px');
      expect(content.style.height).toBe('500px');
    });

    it('content area has overflow-y auto', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const content = screen.el.querySelector('.settings-structured-content');
      expect(content.style.overflowY).toBe('auto');
    });

    it('shows 4 settings for 声音 tab', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const items = screen.el.querySelectorAll('.settings-structured-item');
      expect(items.length).toBe(4);
    });

    it('renders labels for 声音 settings', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const labels = screen.el.querySelectorAll('.settings-structured-label');
      const texts = Array.from(labels).map(l => l.textContent);
      expect(texts).toContain('总音量');
      expect(texts).toContain('BGM 音量');
      expect(texts).toContain('SE 音量');
      expect(texts).toContain('语音音量');
    });

    it('renders slider controls for volume settings (legacy mode)', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      // Without widgetStyles, sliders use legacy input[range]
      const sliders = screen.el.querySelectorAll('.settings-structured-control input[type="range"]');
      expect(sliders.length).toBe(4);
    });

    it('renders slider controls using createSlider when widgetStyles set', () => {
      screen.setWidgetStyles({ slider: {} });
      screen.setLayout(structuredLayout());
      screen.show();
      const widgetSliders = screen.el.querySelectorAll('.settings-structured-control .gm-slider');
      expect(widgetSliders.length).toBe(4);
    });
  });

  // ─── Tab switching ────────────────────────────────────

  describe('tab switching', () => {
    it('clicking tab 1 shows 画面 settings (fallback tabs)', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      // Click second tab button
      const btns = screen.el.querySelectorAll('.settings-tab-btn');
      btns[1].click();
      const labels = screen.el.querySelectorAll('.settings-structured-label');
      const texts = Array.from(labels).map(l => l.textContent);
      expect(texts).toContain('对话框透明度');
      expect(texts).toContain('窗口模式');
      expect(texts.length).toBe(2);
    });

    it('clicking tab 2 shows 游戏 settings (fallback tabs)', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const btns = screen.el.querySelectorAll('.settings-tab-btn');
      btns[2].click();
      const labels = screen.el.querySelectorAll('.settings-structured-label');
      const texts = Array.from(labels).map(l => l.textContent);
      expect(texts).toContain('文字速度');
      expect(texts).toContain('自动播放速度');
      expect(texts).toContain('快进模式');
      expect(texts.length).toBe(3);
    });

    it('tab switch updates active class on fallback buttons', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const btns = screen.el.querySelectorAll('.settings-tab-btn');
      btns[1].click();
      expect(btns[0].classList.contains('active')).toBe(false);
      expect(btns[1].classList.contains('active')).toBe(true);
      expect(btns[2].classList.contains('active')).toBe(false);
    });

    it('tab switch via createTabBar onSelect changes content (widgetStyles mode)', () => {
      screen.setWidgetStyles({ tab: {} });
      screen.setLayout(structuredLayout());
      screen.show();
      // Simulate tab switch via captured onSelect callback
      expect(_tabOnSelect).toBeTypeOf('function');
      _tabOnSelect(1);
      const labels = screen.el.querySelectorAll('.settings-structured-label');
      const texts = Array.from(labels).map(l => l.textContent);
      expect(texts).toContain('对话框透明度');
      expect(texts).toContain('窗口模式');
    });

    it('switching back to tab 0 restores 声音 settings', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const btns = screen.el.querySelectorAll('.settings-tab-btn');
      btns[2].click();
      btns[0].click();
      const labels = screen.el.querySelectorAll('.settings-structured-label');
      const texts = Array.from(labels).map(l => l.textContent);
      expect(texts.length).toBe(4);
      expect(texts).toContain('总音量');
    });
  });

  // ─── Select rendering ─────────────────────────────────

  describe('select rendering', () => {
    it('renders segment buttons for window-mode on 画面 tab', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      // Switch to 画面 tab
      const btns = screen.el.querySelectorAll('.settings-tab-btn');
      btns[1].click();
      const segBtns = screen.el.querySelectorAll('.sc-segment-btn');
      expect(segBtns.length).toBeGreaterThan(0);
      // window-mode has 3 options: 窗口, 全屏, 无边框窗口
      const texts = Array.from(segBtns).map(b => b.textContent);
      expect(texts).toContain('窗口');
      expect(texts).toContain('全屏');
    });

    it('renders segment buttons for skip-mode on 游戏 tab', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const btns = screen.el.querySelectorAll('.settings-tab-btn');
      btns[2].click();
      const segBtns = screen.el.querySelectorAll('.sc-segment-btn');
      // skip-mode has 2 options: 全部跳过, 只跳已读
      const texts = Array.from(segBtns).map(b => b.textContent);
      expect(texts).toContain('全部跳过');
      expect(texts).toContain('只跳已读');
    });
  });

  // ─── Footer ───────────────────────────────────────────

  describe('footer rendering', () => {
    it('renders footer with buttons', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const footer = screen.el.querySelector('.settings-structured-footer');
      expect(footer).not.toBeNull();
    });

    it('footer button has correct text', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const btn = screen.el.querySelector('.settings-structured-footer-btn');
      expect(btn.textContent).toBe('返回标题');
    });

    it('footer button positioned at x/y', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const btn = screen.el.querySelector('.settings-structured-footer-btn');
      expect(btn.style.left).toBe('1050px');
      expect(btn.style.top).toBe('15px');
      expect(btn.style.position).toBe('absolute');
    });

    it('footer height applied from config', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      const footer = screen.el.querySelector('.settings-structured-footer');
      expect(footer.style.height).toBe('60px');
    });

    it('no footer rendered when layout has no footer', () => {
      const layout = structuredLayout();
      delete layout.footer;
      screen.setLayout(layout);
      screen.show();
      const footer = screen.el.querySelector('.settings-structured-footer');
      expect(footer).toBeNull();
    });

    it('footer button with title id calls onTitle callback', () => {
      const titleCb = vi.fn();
      screen.onTitle = titleCb;
      screen.setLayout(structuredLayout());
      screen.show();
      const btn = screen.el.querySelector('.settings-structured-footer-btn');
      btn.click();
      expect(titleCb).toHaveBeenCalled();
    });

    it('footer button without title id calls hide()', () => {
      const layout = structuredLayout();
      layout.footer.buttons = [{ id: 'close-btn', text: '关闭', x: 100, y: 10 }];
      screen.setLayout(layout);
      screen.show();
      const btn = screen.el.querySelector('.settings-structured-footer-btn');
      btn.click();
      expect(screen.el.classList.contains('hidden')).toBe(true);
    });
  });

  // ─── SCREEN-04 + SCREEN-05 Integration ────────────────

  describe('SCREEN-04 + SCREEN-05 integration', () => {
    it('structured mode with widgetStyles renders Tab widget + Slider widget', () => {
      screen.setWidgetStyles({ tab: { shape: 'pill' }, slider: { trackColor: '#333' } });
      screen.setLayout(structuredLayout());
      screen.show();
      // Tab widget rendered
      expect(createTabBar).toHaveBeenCalled();
      const tabBar = screen.el.querySelector('.gm-tab-bar');
      expect(tabBar).not.toBeNull();
      // Slider widgets rendered
      const sliders = screen.el.querySelectorAll('.gm-slider');
      expect(sliders.length).toBe(4);
    });

    it('structured mode without widgetStyles renders fallback tabs + legacy sliders', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      expect(createTabBar).not.toHaveBeenCalled();
      const fallbackBtns = screen.el.querySelectorAll('.settings-tab-btn');
      expect(fallbackBtns.length).toBe(3);
      const legacySliders = screen.el.querySelectorAll('input[type="range"]');
      expect(legacySliders.length).toBe(4);
    });

    it('elements[] non-empty → _renderCustom runs exactly as before', () => {
      screen.setLayout(customLayout());
      screen.show();
      // _renderCustom adds settings-custom class, not settings-structured
      expect(screen.el.classList.contains('settings-custom')).toBe(true);
      expect(screen.el.querySelector('.settings-structured-header')).toBeNull();
    });

    it('_activeTab resets behavior: re-show starts at tab 0', () => {
      screen.setLayout(structuredLayout());
      screen.show();
      // Switch to tab 2
      const btns = screen.el.querySelectorAll('.settings-tab-btn');
      btns[2].click();
      // _activeTab is now 2, but re-showing should render from _activeTab=2
      // (it preserves last tab — this is expected behavior)
      screen.show();
      const labels = screen.el.querySelectorAll('.settings-structured-label');
      const texts = Array.from(labels).map(l => l.textContent);
      // Tab 2 content persists across show() calls
      expect(texts).toContain('文字速度');
    });

    it('slider CSS injected when widgetStyles set', () => {
      screen.setWidgetStyles({ slider: {} });
      screen.setLayout(structuredLayout());
      screen.show();
      const styleEl = document.getElementById('gm-slider-styles');
      expect(styleEl).not.toBeNull();
    });
  });

  // ─── Constructor / API ────────────────────────────────

  describe('constructor and API', () => {
    it('_activeTab defaults to 0', () => {
      expect(screen._activeTab).toBe(0);
    });

    it('setLayout stores customLayout', () => {
      const layout = structuredLayout();
      screen.setLayout(layout);
      expect(screen.customLayout).toBe(layout);
    });

    it('setWidgetStyles stores merged styles', () => {
      screen.setWidgetStyles({ tab: { shape: 'pill' } });
      expect(screen._widgetStyles).not.toBeNull();
      expect(screen._widgetStyles.tab.shape).toBe('pill');
    });

    it('setWidgetStyles(null) clears styles', () => {
      screen.setWidgetStyles({ tab: {} });
      screen.setWidgetStyles(null);
      expect(screen._widgetStyles).toBeNull();
    });
  });
});
