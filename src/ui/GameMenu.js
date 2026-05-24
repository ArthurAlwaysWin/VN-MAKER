/**
 * GameMenu — In-game pause menu (ESC / right-click)
 */
import { sanitizeCssValue, clamp, clampField } from './sanitize.js';
import { resolvePath } from '../engine/assetPath.js';
import { clearScreenDecorations, renderScreenDecorations } from './screenDecorations.js';
import { attachThemeIconFallback, resolveThemeIcon } from './themeIconHelpers.js';

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

    /** @type {object|null} Theme-level icons from ui.theme.icons */
    this._themeIcons = null;

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

  /**
   * Apply theme-level icon configuration (Phase 75 — ICO-01).
   * @param {object|null} icons — ui.theme.icons object
   */
  setThemeIcons(icons) {
    this._themeIcons = icons || null;
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

    const panel = document.createElement('div');
    panel.className = 'game-menu-panel';

    for (const action of BUTTON_ORDER) {
      const btnCfg = cfg.buttons?.[action];
      const label = btnCfg?.text || DEFAULT_LABELS[action];
      const button = document.createElement('button');
      button.className = 'game-menu-button';
      button.dataset.action = action;

      // Per-button icon takes precedence; fall back to theme icon (ICO-01)
      if (btnCfg?.icon) {
        const img = document.createElement('img');
        img.src = resolvePath(btnCfg.icon);
        img.className = 'game-menu-icon';
        img.alt = '';
        button.appendChild(img);
      } else if (this._themeIcons?.gameMenu) {
        const template = document.createElement('template');
        template.innerHTML = resolveThemeIcon(this._themeIcons, 'gameMenu', '', 'game-menu-icon');
        button.appendChild(template.content.cloneNode(true));
      }

      button.appendChild(document.createTextNode(label));
      panel.appendChild(button);
    }

    this.el.replaceChildren(panel);

    // Apply styles
    const buttons = panel.querySelectorAll('.game-menu-button');

    // Background color → overlay (dims game content behind)
    const safeBg = cfg.background ? sanitizeCssValue(cfg.background) : null;
    if (safeBg) this.el.style.background = safeBg;

    // Backdrop blur → overlay (blurs game content behind)
    if (cfg.backdropBlur != null) {
      const blur = clamp(cfg.backdropBlur, 0, 100);
      if (blur !== undefined) this.el.style.backdropFilter = `blur(${blur}px)`;
    }

    // Position — horizontal alignment via overlay's justify-content
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

    // Background image → panel (covers panel area)
    // Chrome path takes precedence; @deprecated legacy fallback for migration
    const bgImage = cfg.chrome?.backgroundImage || cfg.backgroundImage;
    if (bgImage) {
      const safeBgImg = sanitizeCssValue(bgImage);
      if (safeBgImg) {
        panel.style.backgroundImage = `url("${resolvePath(safeBgImg)}")`;
        panel.style.backgroundSize = 'cover';
        panel.style.backgroundPosition = 'center';
      }
    }

    // Border radius → each button
    if (cfg.borderRadius != null) {
      const br = clampField('borderRadius', cfg.borderRadius);
      if (br !== undefined) {
        buttons.forEach(btn => { btn.style.borderRadius = br + 'px'; });
      }
    }

    // Padding
    panel.style.padding = '20px';

    // Button gap
    if (cfg.buttonGap != null) {
      const gap = clampField('padding', cfg.buttonGap);
      if (gap !== undefined) panel.style.gap = gap + 'px';
    }

    // ── Chrome decorations (Phase 74) ──
    clearScreenDecorations(this.el);
    if (cfg.chrome?.decorations) {
      renderScreenDecorations(this.el, cfg.chrome.decorations);
    }

    attachThemeIconFallback(this.el);
  }
}
