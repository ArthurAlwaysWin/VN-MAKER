/**
 * TitleScreen — Main menu (start, continue, settings)
 * Supports custom layout from script.json ui.titleScreen config.
 */
import { sanitizeCssValue, clampField } from './sanitize.js';

export class TitleScreen {
  /**
   * @param {HTMLElement} container
   * @param {string} gameTitle
   */
  constructor(container, gameTitle = 'Galgame Maker') {
    this.container = container;
    this.gameTitle = gameTitle;
    this.layout = null;

    this.el = document.createElement('div');
    this.el.id = 'title-screen';
    this.container.appendChild(this.el);

    /** @type {Function|null} */ this.onStart = null;
    /** @type {Function|null} */ this.onContinue = null;
    /** @type {Function|null} */ this.onSettings = null;

    /** @type {boolean} */ this.hasSave = false;
  }

  /**
   * Set custom layout configuration from script.json
   * @param {Object|null} layout — ui.titleScreen config object
   */
  setLayout(layout) {
    this.layout = layout;
  }

  show(hasSave = false) {
    this.hasSave = hasSave;
    if (this.layout && this.layout.elements) {
      this._renderCustom();
    } else {
      this._renderDefault();
    }
    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));
  }

  hide() {
    this.el.classList.remove('visible');
    setTimeout(() => this.el.classList.add('hidden'), 800);
  }

  _renderDefault() {
    this.el.style.cssText = '';
    this.el.innerHTML = `
      <div class="title-game-name">${this.gameTitle}</div>
      <div class="title-menu">
        <button class="title-button" id="title-start">开 始 游 戏</button>
        ${this.hasSave ? '<button class="title-button" id="title-continue">继 续 游 戏</button>' : ''}
        <button class="title-button" id="title-settings">设 定</button>
      </div>
      <div class="title-subtitle">Powered by Galgame Maker</div>
    `;
    this._bindButtons();
  }

  _renderCustom() {
    this.el.innerHTML = '';
    this.el.style.position = 'absolute';
    this.el.style.inset = '0';

    if (this.layout.background) {
      this.el.style.backgroundImage = `url('/game/${this.layout.background}')`;
      this.el.style.backgroundSize = 'cover';
      this.el.style.backgroundPosition = 'center';
    }

    this.layout.elements.forEach(elem => {
      if (elem.type === 'text') {
        this._createTextElement(elem);
      } else if (elem.type === 'button') {
        this._createButtonElement(elem);
      }
    });
  }

  _createTextElement(cfg) {
    const el = document.createElement('div');
    el.className = 'title-custom-element';
    el.textContent = cfg.content || this.gameTitle;
    this._applyPosition(el, cfg);
    if (cfg.fontSize) el.style.fontSize = `${clampField('fontSize', cfg.fontSize)}px`;
    const fontFamily = sanitizeCssValue(cfg.fontFamily);
    if (fontFamily) el.style.fontFamily = fontFamily;
    const color = sanitizeCssValue(cfg.color);
    if (color) el.style.color = color;
    if (cfg.letterSpacing) el.style.letterSpacing = `${clampField('letterSpacing', cfg.letterSpacing)}px`;
    const textShadow = sanitizeCssValue(cfg.textShadow);
    if (textShadow) el.style.textShadow = textShadow;
    this.el.appendChild(el);
  }

  _createButtonElement(cfg) {
    const btn = document.createElement('button');
    btn.className = 'title-custom-element title-custom-button';
    btn.textContent = cfg.text || '';
    this._applyPosition(btn, cfg);
    if (cfg.width) btn.style.width = `${clampField('width', cfg.width)}px`;
    if (cfg.height) btn.style.height = `${clampField('height', cfg.height)}px`;
    if (cfg.fontSize) btn.style.fontSize = `${clampField('fontSize', cfg.fontSize)}px`;
    const fontFamily = sanitizeCssValue(cfg.fontFamily);
    if (fontFamily) btn.style.fontFamily = fontFamily;
    const color = sanitizeCssValue(cfg.color);
    if (color) btn.style.color = color;
    const bgColor = sanitizeCssValue(cfg.backgroundColor);
    if (bgColor) btn.style.background = bgColor;
    if (cfg.borderRadius !== undefined) btn.style.borderRadius = `${clampField('borderRadius', cfg.borderRadius)}px`;
    const border = sanitizeCssValue(cfg.border);
    if (border) btn.style.border = border;

    const hoverColor = sanitizeCssValue(cfg.hoverColor);
    if (hoverColor) {
      btn.addEventListener('mouseenter', () => { btn.style.color = hoverColor; });
      btn.addEventListener('mouseleave', () => { btn.style.color = color || ''; });
    }

    const action = cfg.action;
    if (action === 'start') {
      btn.addEventListener('click', () => { if (this.onStart) this.onStart(); });
    } else if (action === 'continue' || action === 'load') {
      if (!this.hasSave) { btn.style.opacity = '0.3'; btn.style.pointerEvents = 'none'; }
      btn.addEventListener('click', () => { if (this.onContinue) this.onContinue(); });
    } else if (action === 'settings') {
      btn.addEventListener('click', () => { if (this.onSettings) this.onSettings(); });
    }
    this.el.appendChild(btn);
  }

  _applyPosition(el, cfg) {
    el.style.position = 'absolute';
    if (cfg.anchor === 'center') {
      el.style.left = `${clampField('x', cfg.x ?? 640)}px`;
      el.style.top = `${clampField('y', cfg.y ?? 360)}px`;
      el.style.transform = 'translate(-50%, -50%)';
    } else {
      if (cfg.x !== undefined) el.style.left = `${clampField('x', cfg.x)}px`;
      if (cfg.y !== undefined) el.style.top = `${clampField('y', cfg.y)}px`;
    }
  }

  _bindButtons() {
    this.el.querySelector('#title-start')?.addEventListener('click', () => {
      if (this.onStart) this.onStart();
    });
    const continueBtn = this.el.querySelector('#title-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (this.onContinue) this.onContinue();
      });
    }
    this.el.querySelector('#title-settings')?.addEventListener('click', () => {
      if (this.onSettings) this.onSettings();
    });
  }
}
