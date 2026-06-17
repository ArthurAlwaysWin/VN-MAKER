/**
 * QuickActionBar — 8-button action bar embedded in dialogue box
 */
import { attachThemeIconFallback, resolveThemeIcon } from './themeIconHelpers.js';

export class QuickActionBar {
  /**
   * @param {HTMLElement} container — the #dialogue-box element
   */
  constructor(container) {
    this.el = document.createElement('div');
    this.el.id = 'quick-action-bar';

    // 8 callback props (GameMenu-style — D-19)
    /** @type {Function|null} */ this.onAuto = null;
    /** @type {Function|null} */ this.onSkip = null;
    /** @type {Function|null} */ this.onBacklog = null;
    /** @type {Function|null} */ this.onSave = null;
    /** @type {Function|null} */ this.onLoad = null;
    /** @type {Function|null} */ this.onQuickSave = null;
    /** @type {Function|null} */ this.onQuickLoad = null;
    /** @type {Function|null} */ this.onSettings = null;

    // Internal state
    this._themeIcons = null;
    this._autoActive = false;
    this._skipActive = false;
    this._quickLoadEnabled = false;

    this._render();
    container.appendChild(this.el);

    // Delegated click handler — e.stopPropagation() is CRITICAL (BAR-05)
    // Prevents clicks from reaching DialogueBox's own click handler
    // which would trigger _handleClick() and advance dialogue
    this.el.addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.target.closest('[data-action]');
      if (!btn || btn.classList.contains('disabled')) return;
      const action = btn.dataset.action;
      switch (action) {
        case 'auto': if (this.onAuto) this.onAuto(); break;
        case 'skip': if (this.onSkip) this.onSkip(); break;
        case 'backlog': if (this.onBacklog) this.onBacklog(); break;
        case 'save': if (this.onSave) this.onSave(); break;
        case 'load': if (this.onLoad) this.onLoad(); break;
        case 'quicksave': if (this.onQuickSave) this.onQuickSave(); break;
        case 'quickload': if (this.onQuickLoad) this.onQuickLoad(); break;
        case 'settings': if (this.onSettings) this.onSettings(); break;
      }
    });
  }

  // ─── State Methods (D-20) ──────────────────────────────────

  /** @param {boolean} active */
  setAutoActive(active) {
    this._autoActive = active;
    this.el.querySelector('[data-action="auto"]')?.classList.toggle('active', active);
  }

  /** @param {boolean} active */
  setSkipActive(active) {
    this._skipActive = active;
    this.el.querySelector('[data-action="skip"]')?.classList.toggle('active', active);
  }

  /** @param {boolean} enabled */
  setQuickLoadEnabled(enabled) {
    this._quickLoadEnabled = enabled;
    this.el.querySelector('[data-action="quickload"]')?.classList.toggle('disabled', !enabled);
  }

  /**
   * Apply theme-level icon configuration (Phase 76 — ICO-01).
   * @param {object|null} icons
   */
  setThemeIcons(icons) {
    this._themeIcons = icons || null;
    this._render();
  }

  /** @returns {boolean} */
  get isQuickLoadEnabled() {
    return this._quickLoadEnabled;
  }

  // ─── Render ────────────────────────────────────────────────

  /** @private */
  _render() {
    const svgAttrs = 'xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    const buttons = [
      { action: 'auto', title: '自动', svg: `<svg ${svgAttrs}><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>` },
      { action: 'skip', title: '快进', svg: `<svg ${svgAttrs}><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>` },
      { action: 'backlog', title: '回想', svg: `<svg ${svgAttrs}><path d="M15 12h-5"></path><path d="M15 8h-5"></path><path d="M19 17V5a2 2 0 0 0-2-2H4"></path><path d="M8 21h12a2 2 0 0 0 2-2v-1"></path><path d="M3 7v13a1 1 0 0 0 1 1h3"></path></svg>` },
      { action: 'save', title: '存档', svg: `<svg ${svgAttrs}><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"></path><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"></path><path d="M7 3v4a1 1 0 0 0 1 1h7"></path></svg>` },
      { action: 'load', title: '读档', svg: `<svg ${svgAttrs}><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"></path></svg>` },
      { action: 'quicksave', title: '快存', svg: `<svg ${svgAttrs}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path><line x1="12" x2="12" y1="7" y2="13"></line><line x1="15" x2="9" y1="10" y2="10"></line></svg>` },
      { action: 'quickload', title: '快读', svg: `<svg ${svgAttrs}><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path><path d="m9 10 2 2 4-4"></path></svg>` },
      { action: 'settings', title: '设置', svg: `<svg ${svgAttrs}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>` },
    ];

    this.el.innerHTML = buttons.map(({ action, title, svg }) => {
      const classes = ['qab-btn'];
      if (action === 'auto' && this._autoActive) classes.push('active');
      if (action === 'skip' && this._skipActive) classes.push('active');
      if (action === 'quickload' && !this._quickLoadEnabled) classes.push('disabled');
      const icon = this._themeIcons?.qab
        ? resolveThemeIcon(this._themeIcons, 'qab', svg, 'qab-theme-icon', { trustedSvgFallback: true })
        : svg;
      return `<button class="${classes.join(' ')}" data-action="${action}" title="${title}">${icon}</button>`;
    }).join('\n');

    attachThemeIconFallback(this.el);
  }
}
