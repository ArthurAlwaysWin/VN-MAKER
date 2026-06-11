/**
 * SaveLoadScreen.setLayout(config) tests
 *
 * Covers:
 *   - SCREEN-01: setLayout(config) applies background/header/slotGrid/slot/pagination
 *   - COMPAT-02: setLayout(null) produces identical rendering to no-config behavior
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────

// Mock resolvePath to return a predictable value
vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: (p) => `resolved://${p}`,
}));

import { SaveLoadScreen } from '../src/ui/SaveLoadScreen.js';
import { applyButtonFamilies, resetButtonFamilies } from '../src/engine/ThemeManager.js';

// ─── Helpers ──────────────────────────────────────────────

/** Create a minimal SaveManager stub */
function stubSaveManager(slots = []) {
  return {
    getAllSlots: vi.fn().mockResolvedValue(slots),
    saveToSlot: vi.fn(),
    deleteSlot: vi.fn(),
  };
}

/** Full config matching design spec Section 5.1 */
function fullConfig() {
  return {
    background: 'ui/save_bg.png',
    backdropBlur: 8,
    header: {
      saveTitle: 'セーブ',
      loadTitle: 'ロード',
      saveTitleColor: '#ff0000',
      loadTitleColor: '#0000ff',
      backgroundImage: 'ui/header_bg.png',
      height: 80,
    },
    slotGrid: {
      columns: 4,
      rows: 2,
      gap: 16,
      x: 40,
      y: 100,
      width: 1200,
      height: 500,
    },
    slot: {
      background: 'rgba(50,50,80,0.8)',
      backgroundImage: 'ui/slot_bg.png',
      borderRadius: 10,
      border: '2px solid rgba(255,255,255,0.3)',
      emptyText: '空きスロット',
      thumbnailRadius: 8,
    },
    pagination: {
      style: 'dots',
      activeColor: '#ff0',
      inactiveColor: '#666',
    },
  };
}

/** Partial config — only overrides some fields */
function partialConfig() {
  return {
    header: {
      saveTitle: 'Save',
    },
    slot: {
      emptyText: 'Empty',
    },
  };
}

// ─── Test Suites ──────────────────────────────────────────

describe('SaveLoadScreen.setLayout', () => {
  let container;
  let sm;
  let screen;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    document.head.innerHTML = '';
    sm = stubSaveManager();
    screen = new SaveLoadScreen(container, sm);
  });

  // ── API existence ──

  it('has setLayout method', () => {
    expect(typeof screen.setLayout).toBe('function');
  });

  it('setLayout(config) stores config internally', () => {
    const cfg = fullConfig();
    screen.setLayout(cfg);
    expect(screen._layoutConfig).toBe(cfg);
  });

  it('setLayout(null) clears config to null', () => {
    screen.setLayout(fullConfig());
    screen.setLayout(null);
    expect(screen._layoutConfig).toBeNull();
  });

  it('setLayout(undefined) clears config to null', () => {
    screen.setLayout(fullConfig());
    screen.setLayout(undefined);
    expect(screen._layoutConfig).toBeNull();
  });

  it('_layoutConfig is null by default', () => {
    expect(screen._layoutConfig).toBeNull();
  });

  // ── COMPAT-02: null config = identical rendering ──

  describe('COMPAT-02: null config rendering', () => {
    it('renders default title "存 档" in save mode with null config', async () => {
      screen.setLayout(null);
      screen.show('save');
      await vi.waitFor(() => {
        const title = screen.el.querySelector('.save-load-title');
        expect(title).not.toBeNull();
        expect(title.textContent).toBe('存 档');
      });
    });

    it('renders default title "読 档" in load mode with null config', async () => {
      screen.setLayout(null);
      screen.show('load');
      await vi.waitFor(() => {
        const title = screen.el.querySelector('.save-load-title');
        expect(title).not.toBeNull();
        expect(title.textContent).toBe('読 档');
      });
    });

    it('renders page-tab buttons (not dots) with null config', async () => {
      screen.setLayout(null);
      screen.show('save');
      await vi.waitFor(() => {
        const tabs = screen.el.querySelectorAll('.page-tab');
        expect(tabs.length).toBe(12);
        const dots = screen.el.querySelectorAll('.page-dot');
        expect(dots.length).toBe(0);
      });
    });

    it('renders 9 slot cards per page with null config', async () => {
      screen.setLayout(null);
      screen.show('save');
      await vi.waitFor(() => {
        const grid = screen.el.querySelector('.save-load-grid');
        expect(grid.children.length).toBe(9);
      });
    });

    it('renders default empty text "— 空 —" with null config', async () => {
      screen.setLayout(null);
      screen.show('save');
      await vi.waitFor(() => {
        const emptyTexts = screen.el.querySelectorAll('.save-slot-empty-text');
        expect(emptyTexts.length).toBeGreaterThan(0);
        expect(emptyTexts[0].textContent).toBe('— 空 —');
      });
    });

    it('has identical HTML to never calling setLayout', async () => {
      // Render without setLayout
      const screenA = new SaveLoadScreen(document.createElement('div'), stubSaveManager());
      document.body.appendChild(screenA.container);
      screenA.show('save');

      // Render with setLayout(null)
      const screenB = new SaveLoadScreen(document.createElement('div'), stubSaveManager());
      document.body.appendChild(screenB.container);
      screenB.setLayout(null);
      screenB.show('save');

      await vi.waitFor(() => {
        expect(screenA.el.innerHTML).toBe(screenB.el.innerHTML);
      });
    });

    it('keeps close and pager selectors intact when button-family imagery is applied', async () => {
      applyButtonFamilies({
        buttonFamilies: {
          closeButton: {
            normal: 'ui/buttons/close-normal.webp',
          },
          pageTabPager: {
            normal: 'ui/buttons/page-tab-normal.webp',
            selected: 'ui/buttons/page-tab-selected.webp',
          },
        },
      });

      screen.setLayout(null);
      screen.show('save');
      await vi.waitFor(() => {
        expect(screen.el.querySelector('.save-load-close')).not.toBeNull();
        expect(screen.el.querySelectorAll('.page-tab').length).toBe(12);
      });

      const css = document.getElementById('galgame-button-families')?.textContent ?? '';
      expect(css).toContain('.save-load-close::before');
      expect(css).toContain('.page-tab.active::before, .page-dot.active::before');

      resetButtonFamilies();
    });

    it('falls back to 返回 when a broken close theme icon fails to load', async () => {
      screen.setThemeIcons({ close: 'ui/icons/close.png' });
      screen.show('save');

      await vi.waitFor(() => {
        const img = screen.el.querySelector('.save-load-close img.close-icon');
        expect(img).not.toBeNull();
        img.dispatchEvent(new Event('error'));
        expect(screen.el.querySelector('.save-load-close img')).toBeNull();
        expect(screen.el.querySelector('.save-load-close').textContent).toBe('返回');
      });
    });
  });

  // ── SCREEN-01: Config application ──

  describe('SCREEN-01: config application', () => {
    describe('header', () => {
      it('applies custom save title from config', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const title = screen.el.querySelector('.save-load-title');
          expect(title.textContent).toBe('セーブ');
        });
      });

      it('applies custom load title from config', async () => {
        screen.setLayout(fullConfig());
        screen.show('load');
        await vi.waitFor(() => {
          const title = screen.el.querySelector('.save-load-title');
          expect(title.textContent).toBe('ロード');
        });
      });

      it('renders custom title text as text instead of HTML', async () => {
        const cfg = fullConfig();
        cfg.header.saveTitle = '<img src=x onerror=alert(1)>';
        screen.setLayout(cfg);
        screen.show('save');
        await vi.waitFor(() => {
          const title = screen.el.querySelector('.save-load-title');
          expect(title.textContent).toBe('<img src=x onerror=alert(1)>');
          expect(title.querySelector('img')).toBeNull();
        });
      });

      it('applies save title color', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const title = screen.el.querySelector('.save-load-title');
          expect(title.style.color).toBe('rgb(255, 0, 0)');
        });
      });

      it('applies load title color', async () => {
        screen.setLayout(fullConfig());
        screen.show('load');
        await vi.waitFor(() => {
          const title = screen.el.querySelector('.save-load-title');
          expect(title.style.color).toBe('rgb(0, 0, 255)');
        });
      });

      it('applies header height', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const header = screen.el.querySelector('.save-load-header');
          expect(header.style.height).toBe('80px');
        });
      });

      it('applies header background image', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const header = screen.el.querySelector('.save-load-header');
          expect(header.style.backgroundImage).toContain('resolved://ui/header_bg.png');
        });
      });
    });

    describe('background', () => {
      it('applies background image to main element', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          expect(screen.el.style.backgroundImage).toContain('resolved://ui/save_bg.png');
        });
      });

      it('applies backdrop blur', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          expect(screen.el.style.backdropFilter).toContain('blur(8px)');
        });
      });

      it('does not set background image when config.background is null', async () => {
        const cfg = fullConfig();
        cfg.background = null;
        screen.setLayout(cfg);
        screen.show('save');
        await vi.waitFor(() => {
          expect(screen.el.style.backgroundImage).toBe('');
        });
      });
    });

    describe('slotGrid', () => {
      it('applies custom columns × rows slots per page', async () => {
        screen.setLayout(fullConfig()); // 4×2 = 8 slots per page
        screen.show('save');
        await vi.waitFor(() => {
          const grid = screen.el.querySelector('.save-load-grid');
          expect(grid.children.length).toBe(8);
        });
      });

      it('recalculates total pages based on slots per page', async () => {
        screen.setLayout(fullConfig()); // 4×2 = 8 slots → ceil(108/8) = 14 pages
        screen.show('save');
        await vi.waitFor(() => {
          const pagination = screen.el.querySelector('.save-load-pagination');
          expect(pagination.children.length).toBe(14);
        });
      });

      it('applies grid position (x, y)', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const grid = screen.el.querySelector('.save-load-grid');
          expect(grid.style.left).toBe('40px');
          expect(grid.style.top).toBe('100px');
        });
      });

      it('applies grid dimensions (width, height)', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const grid = screen.el.querySelector('.save-load-grid');
          expect(grid.style.width).toBe('1200px');
          expect(grid.style.height).toBe('500px');
        });
      });

      it('applies grid gap', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const grid = screen.el.querySelector('.save-load-grid');
          expect(grid.style.gap).toBe('16px');
        });
      });

      it('applies grid-template-columns matching column count', async () => {
        screen.setLayout(fullConfig()); // 4 columns
        screen.show('save');
        await vi.waitFor(() => {
          const grid = screen.el.querySelector('.save-load-grid');
          expect(grid.style.gridTemplateColumns).toBe('repeat(4, 1fr)');
        });
      });
    });

    describe('slot styling', () => {
      it('applies slot background color', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const slot = screen.el.querySelector('.save-slot');
          expect(slot.style.background).toContain('rgba(50, 50, 80, 0.8)');
        });
      });

      it('applies slot border radius', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const slot = screen.el.querySelector('.save-slot');
          expect(slot.style.borderRadius).toBe('10px');
        });
      });

      it('applies slot border', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const slot = screen.el.querySelector('.save-slot');
          expect(slot.style.border).toBe('2px solid rgba(255, 255, 255, 0.3)');
        });
      });

      it('applies custom empty text', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const emptyText = screen.el.querySelector('.save-slot-empty-text');
          expect(emptyText.textContent).toBe('空きスロット');
        });
      });

      it('renders custom empty text as text instead of HTML', async () => {
        const cfg = fullConfig();
        cfg.slot.emptyText = '<img src=x onerror=alert(1)>';
        screen.setLayout(cfg);
        screen.show('save');
        await vi.waitFor(() => {
          const emptyText = screen.el.querySelector('.save-slot-empty-text');
          expect(emptyText.textContent).toBe('<img src=x onerror=alert(1)>');
          expect(emptyText.querySelector('img')).toBeNull();
        });
      });

      it('renders save timestamps as text instead of HTML', async () => {
        const occupiedScreen = new SaveLoadScreen(
          document.body.appendChild(document.createElement('div')),
          stubSaveManager([{
            slot: 1,
            hasThumbnail: false,
            previewText: 'Preview',
            date: '<img src=x onerror=alert(1)>',
          }]),
        );
        occupiedScreen.show('save');
        await vi.waitFor(() => {
          const time = occupiedScreen.el.querySelector('.save-slot-time');
          expect(time.textContent).toBe('<img src=x onerror=alert(1)>');
          expect(time.querySelector('img')).toBeNull();
        });
      });

      it('applies slot background image', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const slot = screen.el.querySelector('.save-slot');
          expect(slot.style.backgroundImage).toContain('resolved://ui/slot_bg.png');
        });
      });
    });

    describe('pagination', () => {
      it('renders dots style when config.pagination.style is "dots"', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const dots = screen.el.querySelectorAll('.page-dot');
          expect(dots.length).toBeGreaterThan(0);
          const tabs = screen.el.querySelectorAll('.page-tab');
          expect(tabs.length).toBe(0);
        });
      });

      it('applies active dot color', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const activeDot = screen.el.querySelector('.page-dot.active');
          expect(activeDot).not.toBeNull();
          expect(activeDot.style.backgroundColor).toBe('rgb(255, 255, 0)');
        });
      });

      it('applies inactive dot color', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const inactiveDots = screen.el.querySelectorAll('.page-dot:not(.active)');
          expect(inactiveDots.length).toBeGreaterThan(0);
          expect(inactiveDots[0].style.backgroundColor).toBe('rgb(102, 102, 102)');
        });
      });

      it('renders page-tab buttons when pagination.style is "tabs"', async () => {
        const cfg = fullConfig();
        cfg.pagination.style = 'tabs';
        screen.setLayout(cfg);
        screen.show('save');
        await vi.waitFor(() => {
          const tabs = screen.el.querySelectorAll('.page-tab');
          expect(tabs.length).toBeGreaterThan(0);
        });
      });

      it('dot click navigates to correct page', async () => {
        screen.setLayout(fullConfig());
        screen.show('save');
        await vi.waitFor(() => {
          const dots = screen.el.querySelectorAll('.page-dot');
          expect(dots.length).toBeGreaterThan(1);
        });
        // Click page 2 dot
        const dots = screen.el.querySelectorAll('.page-dot');
        dots[1].click();
        await vi.waitFor(() => {
          expect(screen._currentPage).toBe(2);
        });
      });

      it('discards stale asynchronous grid renders after navigation', async () => {
        let resolveSlots;
        const slotsPromise = new Promise((resolve) => { resolveSlots = resolve; });
        sm.getAllSlots.mockReturnValue(slotsPromise);
        screen.setLayout(fullConfig());
        screen.show('save');

        screen.el.querySelectorAll('.page-dot')[1].click();
        resolveSlots([]);

        await vi.waitFor(() => {
          const grid = screen.el.querySelector('.save-load-grid');
          expect(screen._currentPage).toBe(2);
          expect(grid.children.length).toBe(8);
        });
      });

      it('does not let a stale grid request overwrite the current slot cache', async () => {
        let resolveFirst;
        let resolveSecond;
        sm.getAllSlots
          .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
          .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));
        screen.setLayout(fullConfig());
        screen.show('load');
        screen.el.querySelectorAll('.page-dot')[1].click();

        resolveSecond([{ slot: 9, previewText: 'Current save' }]);
        await vi.waitFor(() => {
          expect(screen._cachedSlots.get(9)?.previewText).toBe('Current save');
        });

        resolveFirst([{ slot: 9, previewText: 'Stale save' }]);
        await Promise.resolve();
        expect(screen._cachedSlots.get(9)?.previewText).toBe('Current save');
      });
    });

    describe('partial config', () => {
      it('applies overridden fields, uses defaults for rest', async () => {
        screen.setLayout(partialConfig());
        screen.show('save');
        await vi.waitFor(() => {
          // Custom title
          const title = screen.el.querySelector('.save-load-title');
          expect(title.textContent).toBe('Save');
          // Custom empty text
          const emptyText = screen.el.querySelector('.save-slot-empty-text');
          expect(emptyText.textContent).toBe('Empty');
          // Default grid layout (9 slots = 3×3)
          const grid = screen.el.querySelector('.save-load-grid');
          expect(grid.children.length).toBe(9);
          // Default pagination (tabs not dots)
          const tabs = screen.el.querySelectorAll('.page-tab');
          expect(tabs.length).toBe(12);
        });
      });
    });

    describe('_getSlotsPerPage and _getTotalPages', () => {
      it('_getSlotsPerPage returns 9 with null config', () => {
        screen.setLayout(null);
        expect(screen._getSlotsPerPage()).toBe(9);
      });

      it('_getSlotsPerPage returns columns × rows from config', () => {
        screen.setLayout(fullConfig()); // 4×2
        expect(screen._getSlotsPerPage()).toBe(8);
      });

      it('_getTotalPages returns 12 with null config', () => {
        screen.setLayout(null);
        expect(screen._getTotalPages()).toBe(12);
      });

      it('_getTotalPages returns ceil(108 / slotsPerPage)', () => {
        screen.setLayout(fullConfig()); // 8 per page → ceil(108/8) = 14
        expect(screen._getTotalPages()).toBe(14);
      });
    });

    describe('keyboard navigation with config', () => {
      it('arrow keys respect custom total pages', async () => {
        screen.setLayout(fullConfig()); // 14 pages
        screen.show('save');
        await vi.waitFor(() => {
          expect(screen._currentPage).toBe(1);
        });
        // Navigate to page 13 (beyond default 12)
        for (let i = 0; i < 13; i++) {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        }
        expect(screen._currentPage).toBe(14);
        // Should not go beyond 14
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        expect(screen._currentPage).toBe(14);
      });
    });

    describe('occupied slot with config', () => {
      it('renders occupied slot card with custom styling', async () => {
        const slotData = [
          { slot: 1, hasThumbnail: true, previewText: 'Test preview', date: '2024-01-01' },
        ];
        const smWithData = stubSaveManager(slotData);
        const s = new SaveLoadScreen(document.createElement('div'), smWithData);
        document.body.appendChild(s.container);
        s.setLayout(fullConfig());
        s.show('save');
        await vi.waitFor(() => {
          const occupiedSlot = s.el.querySelector('.save-slot:not(.empty)');
          expect(occupiedSlot).not.toBeNull();
          expect(occupiedSlot.style.borderRadius).toBe('10px');
        });
      });

      it('applies thumbnail radius from config', async () => {
        const slotData = [
          { slot: 1, hasThumbnail: true, previewText: 'Test', date: '2024-01-01' },
        ];
        const smWithData = stubSaveManager(slotData);
        const s = new SaveLoadScreen(document.createElement('div'), smWithData);
        document.body.appendChild(s.container);
        s.setLayout(fullConfig());
        s.show('save');
        await vi.waitFor(() => {
          const thumb = s.el.querySelector('.save-slot-thumb');
          expect(thumb).not.toBeNull();
          expect(thumb.style.borderRadius).toBe('8px');
        });
      });

      it('renders inline data URL thumbnails from web exports', async () => {
        const thumbnail = 'data:image/jpeg;base64,aGVsbG8=';
        const slotData = [
          { slot: 1, hasThumbnail: true, thumbnail, previewText: 'Test', date: '2024-01-01' },
        ];
        const smWithData = stubSaveManager(slotData);
        const s = new SaveLoadScreen(document.createElement('div'), smWithData);
        document.body.appendChild(s.container);
        s.show('save');
        await vi.waitFor(() => {
          const thumb = s.el.querySelector('.save-slot-thumb');
          expect(thumb).not.toBeNull();
          expect(thumb.getAttribute('src')).toBe(thumbnail);
        });
      });
    });

    describe('CSS injection safety', () => {
      it('rejects CSS injection in background', async () => {
        const cfg = fullConfig();
        cfg.background = 'url(javascript:alert(1))';
        screen.setLayout(cfg);
        screen.show('save');
        await vi.waitFor(() => {
          expect(screen.el.style.backgroundImage).toBe('');
        });
      });

      it('rejects CSS injection in slot border', async () => {
        const cfg = fullConfig();
        cfg.slot.border = '1px; background: red';
        screen.setLayout(cfg);
        screen.show('save');
        await vi.waitFor(() => {
          const slot = screen.el.querySelector('.save-slot');
          expect(slot.style.border).not.toContain('background');
        });
      });

      it('rejects CSS injection in title color', async () => {
        const cfg = fullConfig();
        cfg.header.saveTitleColor = 'expression(alert(1))';
        screen.setLayout(cfg);
        screen.show('save');
        await vi.waitFor(() => {
          const title = screen.el.querySelector('.save-load-title');
          expect(title.style.color).toBe('');
        });
      });
    });

    describe('chrome.decorations (Phase 74)', () => {
      it('renders chrome.decorations as .screen-decoration elements', async () => {
        const cfg = fullConfig();
        cfg.chrome = {
          decorations: [
            { src: 'ui/sl/decor1.png', x: 10, y: 20, width: 100, height: 50 },
          ],
        };
        screen.setLayout(cfg);
        screen.show('save');
        await vi.waitFor(() => {
          const decorations = screen.el.querySelectorAll('.screen-decoration');
          expect(decorations.length).toBe(1);
        });
        const decorations = screen.el.querySelectorAll('.screen-decoration');
        // Use getAttribute('src') to avoid jsdom URL normalization
        const srcAttr = decorations[0].getAttribute('src');
        expect(srcAttr).toContain('ui/sl/decor1.png');
        expect(decorations[0].style.left).toBe('10px');
      });

      it('re-calling setLayout replaces decorations instead of accumulating', async () => {
        const cfg1 = { ...fullConfig(), chrome: { decorations: [{ src: 'ui/sl/a.png', x: 0, y: 0, width: 50, height: 50 }] } };
        screen.setLayout(cfg1);
        screen.show('save');
        await vi.waitFor(() => {
          expect(screen.el.querySelectorAll('.screen-decoration').length).toBe(1);
        });

        // Hide and re-show with different config
        screen.hide();
        const cfg2 = { ...fullConfig(), chrome: { decorations: [
          { src: 'ui/sl/b.png', x: 0, y: 0, width: 50, height: 50 },
          { src: 'ui/sl/c.png', x: 0, y: 0, width: 50, height: 50 },
        ] } };
        screen.setLayout(cfg2);
        screen.show('save');
        await vi.waitFor(() => {
          expect(screen.el.querySelectorAll('.screen-decoration').length).toBe(2);
        });
      });

      it('empty chrome.decorations array produces no decoration elements', async () => {
        const cfg = { ...fullConfig(), chrome: { decorations: [] } };
        screen.setLayout(cfg);
        screen.show('save');
        await vi.waitFor(() => {
          expect(screen.el.querySelectorAll('.screen-decoration').length).toBe(0);
        });
      });
    });
  });
});
