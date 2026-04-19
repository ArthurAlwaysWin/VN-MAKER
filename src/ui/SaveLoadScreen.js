/**
 * SaveLoadScreen — 108-slot paginated save/load UI
 *
 * Displays a 3×3 grid of slot cards with 12 navigable pages (108 total slots).
 * Occupied cards show thumbnail, slot number, preview text, and timestamp.
 * Empty cards show dashed border with centered '— 空 —' text.
 * Inline confirmation overlays for overwrite (save mode) and delete actions.
 * Arrow keys ←/→ navigate pages; mode-colored title (purple=save, blue=load).
 */

const SLOTS_PER_PAGE = 9;
const TOTAL_PAGES = 12;

import { resolvePath } from '../engine/assetPath.js';
import { sanitizeCssValue, clampField } from './sanitize.js';


export class SaveLoadScreen {
  /**
   * @param {HTMLElement} container
   * @param {import('../engine/SaveManager.js').SaveManager} saveManager
   */
  constructor(container, saveManager) {
    this.container = container;
    this.saveManager = saveManager;

    this.el = document.createElement('div');
    this.el.id = 'save-load-screen';
    this.el.classList.add('hidden');
    this.container.appendChild(this.el);

    /** @type {'save'|'load'} */
    this.mode = 'save';
    /** @type {string} Close routing source — 'bar'|'menu'|'title' */
    this._source = 'bar';
    /** @type {number} Current page (1-12) */
    this._currentPage = 1;
    /** @type {Function|null} */
    this.onSave = null;
    /** @type {Function|null} */
    this.onLoad = null;
    /** @type {Function|null} */
    this.onDelete = null;
    /** @type {Function|null} Source-routed close callback: (source) => void */
    this.onClose = null;
    /** @type {Function|null} Keyboard listener reference */
    this._keyHandler = null;
    /** @type {HTMLElement|null} Current confirmation overlay */
    this._activeConfirmation = null;
    /** @type {Array|null} Cached slot data to avoid re-fetching on pagination */
    this._cachedSlots = null;
    /** @type {Object|null} Custom layout configuration from setLayout() */
    this._layoutConfig = null;
  }

  // ─── Public API ──────────────────────────────────────────

  /**
   * Apply a layout configuration for custom rendering.
   * Pass null/undefined to revert to default hardcoded rendering (COMPAT-02).
   * @param {Object|null} config — layout config from ui.saveLoadScreen schema
   */
  setLayout(config) {
    this._layoutConfig = config || null;
    if (this.el.classList.contains('visible')) this._render();
  }

  /**
   * Show the save/load screen
   * @param {'save'|'load'} mode
   * @param {string} source — close routing source ('bar'|'menu'|'title')
   */
  show(mode = 'save', source = 'bar') {
    this.mode = mode;
    this._source = source;
    this._currentPage = 1;
    this._cachedSlots = null; // Invalidate cache on fresh open
    this.el.dataset.mode = mode;
    this._render();
    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));
    this._attachKeyboard();
  }

  /**
   * Hide the save/load screen
   * @param {boolean} skipRoute — if true, skip onClose routing (e.g. after load success)
   */
  hide(skipRoute = false) {
    this._detachKeyboard();
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
    if (!skipRoute && this.onClose) {
      this.onClose(this._source);
    }
  }

  // ─── Layout Helpers ──────────────────────────────────────

  /**
   * Get slots per page — from config or default constant.
   * @returns {number}
   * @private
   */
  _getSlotsPerPage() {
    const cfg = this._layoutConfig;
    if (cfg?.slotGrid?.columns && cfg?.slotGrid?.rows) {
      return cfg.slotGrid.columns * cfg.slotGrid.rows;
    }
    return SLOTS_PER_PAGE;
  }

  /**
   * Get total page count — derived from slots per page.
   * @returns {number}
   * @private
   */
  _getTotalPages() {
    return Math.ceil(108 / this._getSlotsPerPage());
  }

  // ─── Render ──────────────────────────────────────────────

  /** @private Full rebuild of el.innerHTML */
  _render() {
    const cfg = this._layoutConfig;

    if (cfg) {
      // ── Custom layout rendering ──
      const hdr = cfg.header || {};
      const title = this.mode === 'save'
        ? (hdr.saveTitle || '存 档')
        : (hdr.loadTitle || '読 档');

      this.el.innerHTML = `
        <div class="save-load-header">
          <div class="save-load-title">${title}</div>
          <button class="save-load-close">返回</button>
        </div>
        <div class="save-load-grid"></div>
        <div class="save-load-pagination"></div>
      `;

      // Apply background
      this.el.style.backgroundImage = '';
      this.el.style.backdropFilter = '';
      if (cfg.background) {
        const safeBg = sanitizeCssValue(cfg.background);
        if (safeBg) {
          this.el.style.backgroundImage = `url("${resolvePath(safeBg)}")`;
        }
      }
      if (cfg.backdropBlur != null) {
        const blur = clampField('padding', cfg.backdropBlur); // reuse padding bounds [0,200]
        if (blur !== undefined) {
          this.el.style.backdropFilter = `blur(${blur}px)`;
        }
      }

      // Apply header styling
      const header = this.el.querySelector('.save-load-header');
      if (hdr.height != null) {
        const h = clampField('height', hdr.height);
        if (h !== undefined) header.style.height = h + 'px';
      }
      if (hdr.backgroundImage) {
        const safeHdrBg = sanitizeCssValue(hdr.backgroundImage);
        if (safeHdrBg) {
          header.style.backgroundImage = `url("${resolvePath(safeHdrBg)}")`;
        }
      }

      // Apply title color
      const titleEl = this.el.querySelector('.save-load-title');
      const titleColor = this.mode === 'save' ? hdr.saveTitleColor : hdr.loadTitleColor;
      if (titleColor) {
        const safeColor = sanitizeCssValue(titleColor);
        if (safeColor) titleEl.style.color = safeColor;
      }

      // Apply grid styling
      const gridEl = this.el.querySelector('.save-load-grid');
      const sg = cfg.slotGrid || {};
      if (sg.x != null) { const v = clampField('x', sg.x); if (v !== undefined) gridEl.style.left = v + 'px'; }
      if (sg.y != null) { const v = clampField('y', sg.y); if (v !== undefined) gridEl.style.top = v + 'px'; }
      if (sg.width != null) { const v = clampField('width', sg.width); if (v !== undefined) gridEl.style.width = v + 'px'; }
      if (sg.height != null) { const v = clampField('height', sg.height); if (v !== undefined) gridEl.style.height = v + 'px'; }
      if (sg.gap != null) { const v = clampField('padding', sg.gap); if (v !== undefined) gridEl.style.gap = v + 'px'; }
      if (sg.columns) {
        gridEl.style.gridTemplateColumns = `repeat(${sg.columns}, 1fr)`;
      }
    } else {
      // ── Default layout (COMPAT-02: unchanged) ──
      const title = this.mode === 'save' ? '存 档' : '読 档';
      this.el.innerHTML = `
        <div class="save-load-header">
          <div class="save-load-title">${title}</div>
          <button class="save-load-close">返回</button>
        </div>
        <div class="save-load-grid"></div>
        <div class="save-load-pagination"></div>
      `;
    }

    this.el.querySelector('.save-load-close').addEventListener('click', () => this.hide());
    this._renderGrid();
    this._renderPagination();
  }

  /** @private Partial re-render of grid section only */
  async _renderGrid() {
    const grid = this.el.querySelector('.save-load-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Use cached data for pagination; fetch only on first load or after invalidation
    if (!this._cachedSlots) {
      if (this.saveManager) {
        const allSlots = await this.saveManager.getAllSlots();
        this._cachedSlots = new Map();
        for (const s of allSlots) this._cachedSlots.set(s.slot, s);
      } else {
        // Preview mode — no saveManager, show empty placeholder slots
        this._cachedSlots = new Map();
      }
    }

    const slotsPerPage = this._getSlotsPerPage();
    const startSlot = (this._currentPage - 1) * slotsPerPage + 1;
    const endSlot = this._currentPage * slotsPerPage;

    for (let i = startSlot; i <= endSlot; i++) {
      grid.appendChild(this._createSlotCard(i, this._cachedSlots.get(i) || null));
    }
  }

  /** @private Partial re-render of pagination section only */
  _renderPagination() {
    const pagination = this.el.querySelector('.save-load-pagination');
    if (!pagination) return;
    pagination.innerHTML = '';

    const cfg = this._layoutConfig;
    const totalPages = this._getTotalPages();
    const pag = cfg?.pagination || {};
    const useDots = cfg && pag.style === 'dots';

    for (let p = 1; p <= totalPages; p++) {
      if (useDots) {
        const dot = document.createElement('span');
        dot.className = `page-dot${p === this._currentPage ? ' active' : ''}`;
        // Apply dot colors
        if (p === this._currentPage && pag.activeColor) {
          const safeColor = sanitizeCssValue(pag.activeColor);
          if (safeColor) dot.style.backgroundColor = safeColor;
        } else if (p !== this._currentPage && pag.inactiveColor) {
          const safeColor = sanitizeCssValue(pag.inactiveColor);
          if (safeColor) dot.style.backgroundColor = safeColor;
        }
        dot.addEventListener('click', () => {
          this._currentPage = p;
          this._renderGrid();
          this._renderPagination();
        });
        pagination.appendChild(dot);
      } else {
        // Default page-tab buttons (COMPAT-02: unchanged when no config)
        const btn = document.createElement('button');
        btn.className = `page-tab${p === this._currentPage ? ' active' : ''}`;
        btn.textContent = p;
        if (cfg && pag.activeColor && p === this._currentPage) {
          const safeColor = sanitizeCssValue(pag.activeColor);
          if (safeColor) btn.style.backgroundColor = safeColor;
        }
        if (cfg && pag.inactiveColor && p !== this._currentPage) {
          const safeColor = sanitizeCssValue(pag.inactiveColor);
          if (safeColor) btn.style.backgroundColor = safeColor;
        }
        btn.addEventListener('click', () => {
          this._currentPage = p;
          this._renderGrid();
          this._renderPagination();
        });
        pagination.appendChild(btn);
      }
    }
  }

  // ─── Slot Card ───────────────────────────────────────────

  /**
   * Create a single slot card element
   * @param {number} slotNum
   * @param {Object|null} slotData
   * @returns {HTMLElement}
   * @private
   */
  _createSlotCard(slotNum, slotData) {
    const slotEl = document.createElement('div');
    slotEl.className = `save-slot${slotData ? '' : ' empty'}`;

    const cfg = this._layoutConfig;
    const slotCfg = cfg?.slot || {};

    // Apply slot styling from config
    if (cfg) {
      if (slotCfg.background) {
        const safeBg = sanitizeCssValue(slotCfg.background);
        if (safeBg) slotEl.style.background = safeBg;
      }
      if (slotCfg.backgroundImage) {
        const safeBgImg = sanitizeCssValue(slotCfg.backgroundImage);
        if (safeBgImg) slotEl.style.backgroundImage = `url("${resolvePath(safeBgImg)}")`;
      }
      if (slotCfg.borderRadius != null) {
        const br = clampField('borderRadius', slotCfg.borderRadius);
        if (br !== undefined) slotEl.style.borderRadius = br + 'px';
      }
      if (slotCfg.border) {
        const safeBorder = sanitizeCssValue(slotCfg.border);
        if (safeBorder) slotEl.style.border = safeBorder;
      }
    }

    if (slotData) {
      // ── Occupied slot ──
      const padded = String(slotNum).padStart(3, '0');
      const thumbHtml = slotData.hasThumbnail
        ? `<img class="save-slot-thumb" src="${resolvePath(`saves/slot_${padded}.jpg`)}" alt="" />`
        : `<div class="save-slot-no-thumb"></div>`;

      const previewSafe = slotData.previewText || '(无预览)';

      slotEl.innerHTML = `
        ${thumbHtml}
        <div class="save-slot-info">
          <div class="save-slot-label">存档 ${slotNum}</div>
          <div class="save-slot-text"></div>
          <div class="save-slot-time">${slotData.date}</div>
        </div>
        <button class="save-slot-delete" title="删除">✕</button>
      `;

      // Apply thumbnail radius from config
      if (cfg && slotCfg.thumbnailRadius != null) {
        const thumb = slotEl.querySelector('.save-slot-thumb');
        if (thumb) {
          const tr = clampField('borderRadius', slotCfg.thumbnailRadius);
          if (tr !== undefined) thumb.style.borderRadius = tr + 'px';
        }
      }

      // Set preview text via textContent to prevent XSS
      slotEl.querySelector('.save-slot-text').textContent = previewSafe;

      // Delete button — inline confirmation
      slotEl.querySelector('.save-slot-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        this._showConfirmation(slotEl, slotNum, 'delete');
      });

      // Card click — mode-dependent behavior
      slotEl.addEventListener('click', () => {
        if (this.mode === 'save') {
          this._showConfirmation(slotEl, slotNum, 'overwrite');
        } else if (this.mode === 'load') {
          if (this.onLoad) this.onLoad(slotNum);
          this.hide(true);
        }
      });
    } else {
      // ── Empty slot ──
      const emptyText = (cfg && slotCfg.emptyText) ? slotCfg.emptyText : '— 空 —';
      slotEl.innerHTML = `<span class="save-slot-empty-text">${emptyText}</span>`;

      // In save mode: direct save (no confirmation needed)
      if (this.mode === 'save') {
        slotEl.addEventListener('click', async () => {
          if (this.onSave) await this.onSave(slotNum);
          this._cachedSlots = null; // Invalidate after save
          this._renderGrid();
        });
      }
      // In load mode: CSS pointer-events: none handles disabling
    }

    return slotEl;
  }

  // ─── Inline Confirmation ─────────────────────────────────

  /**
   * Show inline confirmation overlay on a slot card
   * @param {HTMLElement} slotEl
   * @param {number} slotNum
   * @param {'overwrite'|'delete'} type
   * @private
   */
  _showConfirmation(slotEl, slotNum, type) {
    this._clearConfirmation();

    const isDelete = type === 'delete';
    const overlay = document.createElement('div');
    overlay.className = 'save-confirm-overlay';
    overlay.innerHTML = `
      <div class="save-confirm-text">${isDelete ? '确定删除?' : '确定覆盖?'}</div>
      <div class="save-confirm-actions">
        <button class="save-confirm-btn ${isDelete ? 'confirm-delete' : 'confirm'}">${isDelete ? '删除' : '覆盖'}</button>
        <button class="save-confirm-btn cancel">取消</button>
      </div>
    `;

    // Confirm action
    overlay.querySelector(`.save-confirm-btn.${isDelete ? 'confirm-delete' : 'confirm'}`).addEventListener('click', async (e) => {
      e.stopPropagation();
      if (isDelete) {
        if (this.onDelete) await this.onDelete(slotNum);
      } else {
        if (this.onSave) await this.onSave(slotNum);
      }
      this._cachedSlots = null; // Invalidate after save/delete
      this._renderGrid();
    });

    // Cancel action
    overlay.querySelector('.save-confirm-btn.cancel').addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.remove();
      this._activeConfirmation = null;
    });

    // Prevent click-through to card
    overlay.addEventListener('click', (e) => e.stopPropagation());

    slotEl.appendChild(overlay);
    this._activeConfirmation = overlay;
  }

  /** @private Remove any active confirmation overlay */
  _clearConfirmation() {
    if (this._activeConfirmation) {
      this._activeConfirmation.remove();
      this._activeConfirmation = null;
    }
  }

  // ─── Keyboard Navigation ─────────────────────────────────

  /** @private Attach arrow-key page navigation */
  _attachKeyboard() {
    this._keyHandler = (e) => {
      const totalPages = this._getTotalPages();
      if (e.key === 'ArrowLeft' && this._currentPage > 1) {
        this._currentPage--;
        this._renderGrid();
        this._renderPagination();
      } else if (e.key === 'ArrowRight' && this._currentPage < totalPages) {
        this._currentPage++;
        this._renderGrid();
        this._renderPagination();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  /** @private Detach keyboard listener */
  _detachKeyboard() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  }
}
