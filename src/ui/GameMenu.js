/**
 * GameMenu — In-game pause menu (ESC / right-click)
 */
import { sanitizeCssValue, clampField } from './sanitize.js';
import { resolvePath } from '../engine/assetPath.js';

/** Default button labels matching the hardcoded originals */
const DEFAULT_LABELS = {
  save: '存 档',
  load: '读 档',
  backlog: '回 想',
  settings: '设 定',
  title: '返回标题',
  close: '返 回',
};

/** Ordered list of button actions */
const BUTTON_ORDER = ['save', 'load', 'backlog', 'settings', 'title', 'close'];

export class GameMenu {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;

    this.el = document.createElement('div');
    this.el.id = 'game-menu';
    this.el.classList.add('hidden');
    this.container.appendChild(this.el);

    /** @type {Function|null} */ this.onSave = null;
    /** @type {Function|null} */ this.onLoad = null;
    /** @type {Function|null} */ this.onBacklog = null;
    /** @type {Function|null} */ this.onSettings = null;
    /** @type {Function|null} */ this.onTitle = null;

    /** @type {object|null} Layout config from ui.gameMenu schema */
    this._layoutConfig = null;

    this._render();

    // Click handler uses event delegation — set once in constructor
    // so re-renders via setLayout() don't add duplicate listeners.
    this.el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;

      this.hide();

      switch (action) {
        case 'save': if (this.onSave) this.onSave(); break;
        case 'load': if (this.onLoad) this.onLoad(); break;
        case 'backlog': if (this.onBacklog) this.onBacklog(); break;
        case 'settings': if (this.onSettings) this.onSettings(); break;
        case 'title': if (this.onTitle) this.onTitle(); break;
      }
    });
  }

  /**
   * Apply a layout configuration from ui.gameMenu schema.
   * Pass null to revert to default hardcoded rendering.
   * @param {object|null} config
   */
  setLayout(config) {
    this._layoutConfig = config || null;
    this._render();
  }

  show() {
    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));
  }

  hide() {
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
  }

  toggle() {
    if (this.el.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Rebuild menu DOM. Idempotent — safe to call multiple times.
   * Branches on _layoutConfig: null → hardcoded default, object → config-driven.
   * @private
   */
  _render() {
    if (!this._layoutConfig) {
      // ── Default path (COMPAT-02: unchanged from original) ──────
      // Reset any config-mode style overrides on the overlay
      this.el.style.background = '';
      this.el.style.backdropFilter = '';
      this.el.style.justifyContent = '';
      this.el.innerHTML = `
      <div class="game-menu-panel">
        <button class="game-menu-button" data-action="save">存 档</button>
        <button class="game-menu-button" data-action="load">读 档</button>
        <button class="game-menu-button" data-action="backlog">回 想</button>
        <button class="game-menu-button" data-action="settings">设 定</button>
        <button class="game-menu-button" data-action="title">返回标题</button>
        <button class="game-menu-button" data-action="close">返 回</button>
      </div>
    `;
      return;
    }

    // ── Config-driven path ───────────────────────────────────
    const cfg = this._layoutConfig;

    // Build button HTML from config
    const buttonsHtml = BUTTON_ORDER.map((action) => {
      const btnCfg = cfg.buttons?.[action];
      const label = btnCfg?.text || DEFAULT_LABELS[action];
      let iconHtml = '';
      if (btnCfg?.icon) {
        iconHtml = `<img src="${resolvePath(btnCfg.icon)}" class="game-menu-icon" alt="" />`;
      }
      return `<button class="game-menu-button" data-action="${action}">${iconHtml}${label}</button>`;
    }).join('\n        ');

    this.el.innerHTML = `
      <div class="game-menu-panel">
        ${buttonsHtml}
      </div>
    `;

    // Apply panel styles
    const panel = this.el.querySelector('.game-menu-panel');

    // In config mode, transfer overlay background to panel so
    // borderRadius/blur apply visually to the menu card.
    const safeBg = cfg.background ? sanitizeCssValue(cfg.background) : null;
    panel.style.backgroundColor = safeBg || 'rgba(0,0,0,0.7)';
    this.el.style.background = 'transparent';
    this.el.style.backdropFilter = 'none';

    // Position — control horizontal alignment via overlay's justify-content
    if (cfg.position === 'left') {
      this.el.style.justifyContent = 'flex-start';
      panel.style.marginLeft = '40px';
    } else if (cfg.position === 'right') {
      this.el.style.justifyContent = 'flex-end';
      panel.style.marginRight = '40px';
    } else {
      this.el.style.justifyContent = 'center';
    }

    // Width
    if (cfg.width != null) {
      const w = clampField('width', cfg.width);
      if (w !== undefined) panel.style.width = w + 'px';
    }

    // Background image
    if (cfg.backgroundImage) {
      const safeBgImg = sanitizeCssValue(cfg.backgroundImage);
      if (safeBgImg) {
        panel.style.backgroundImage = `url("${resolvePath(safeBgImg)}")`;
        panel.style.backgroundSize = 'cover';
        panel.style.backgroundPosition = 'center';
      }
    }

    // Border radius
    if (cfg.borderRadius != null) {
      const br = clampField('borderRadius', cfg.borderRadius);
      if (br !== undefined) panel.style.borderRadius = br + 'px';
    }

    // Backdrop blur
    if (cfg.backdropBlur != null) {
      const blur = clampField('padding', cfg.backdropBlur);
      if (blur !== undefined) panel.style.backdropFilter = `blur(${blur}px)`;
    }

    // Padding
    panel.style.padding = '20px';

    // Button gap
    if (cfg.buttonGap != null) {
      const gap = clampField('padding', cfg.buttonGap);
      if (gap !== undefined) panel.style.gap = gap + 'px';
    }
  }
}
