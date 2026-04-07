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
  }

  // ─── Public API ──────────────────────────────────────────

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

  // ─── Render ──────────────────────────────────────────────

  /** @private Full rebuild of el.innerHTML */
  _render() {
    const title = this.mode === 'save' ? '存 档' : '読 档';
    this.el.innerHTML = `
      <div class="save-load-header">
        <div class="save-load-title">${title}</div>
        <button class="save-load-close">返回</button>
      </div>
      <div class="save-load-grid"></div>
      <div class="save-load-pagination"></div>
    `;

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
      const allSlots = await this.saveManager.getAllSlots();
      this._cachedSlots = new Map();
      for (const s of allSlots) this._cachedSlots.set(s.slot, s);
    }

    const startSlot = (this._currentPage - 1) * SLOTS_PER_PAGE + 1;
    const endSlot = this._currentPage * SLOTS_PER_PAGE;

    for (let i = startSlot; i <= endSlot; i++) {
      grid.appendChild(this._createSlotCard(i, this._cachedSlots.get(i) || null));
    }
  }

  /** @private Partial re-render of pagination section only */
  _renderPagination() {
    const pagination = this.el.querySelector('.save-load-pagination');
    if (!pagination) return;
    pagination.innerHTML = '';

    for (let p = 1; p <= TOTAL_PAGES; p++) {
      const btn = document.createElement('button');
      btn.className = `page-tab${p === this._currentPage ? ' active' : ''}`;
      btn.textContent = p;
      btn.addEventListener('click', () => {
        this._currentPage = p;
        this._renderGrid();
        this._renderPagination();
      });
      pagination.appendChild(btn);
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
      slotEl.innerHTML = '<span class="save-slot-empty-text">— 空 —</span>';

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
      if (e.key === 'ArrowLeft' && this._currentPage > 1) {
        this._currentPage--;
        this._renderGrid();
        this._renderPagination();
      } else if (e.key === 'ArrowRight' && this._currentPage < TOTAL_PAGES) {
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
