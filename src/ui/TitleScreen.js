/**
 * TitleScreen — Main menu (start, continue, gallery, settings)
 * Supports custom layout from script.json ui.titleScreen config.
 */
import { sanitizeCssValue, clampField } from './sanitize.js';
import { resolvePath } from '../engine/assetPath.js';

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
    /** @type {Function|null} */ this.onGallery = null;

    /** @type {boolean} */ this.hasSave = false;
    /** @type {boolean} */ this.hasGallery = false;
    /** @type {ReturnType<typeof setTimeout>|null} */ this._hideTimer = null;
  }

  /**
   * Set custom layout configuration from script.json
   * @param {Object|null} layout — ui.titleScreen config object
   */
  setLayout(layout) {
    this.layout = layout;
    if (this.isVisible) this.show(this.hasSave, this.hasGallery);
  }

  /** Whether the title screen is currently showing */
  get isVisible() {
    return this.el.classList.contains('visible');
  }

  show(hasSave = false, hasGallery = false) {
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
    this.hasSave = hasSave;
    this.hasGallery = hasGallery;
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
    if (this._hideTimer) clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      this.el.classList.add('hidden');
      this._hideTimer = null;
    }, 800);
  }

  _renderDefault() {
    this.el.style.cssText = '';
    this.el.innerHTML = `
      <div class="title-game-name"></div>
      <div class="title-menu">
        <button class="title-button" id="title-start">开 始 游 戏</button>
        ${this.hasSave ? '<button class="title-button" id="title-continue">继 续 游 戏</button>' : ''}
        ${this.hasGallery ? '<button class="title-button" id="title-gallery">CG 鉴 赏</button>' : ''}
        <button class="title-button" id="title-settings">设 定</button>
      </div>
      <div class="title-subtitle">Powered by Galgame Maker</div>
    `;
    // Use textContent to safely set game title — avoids XSS via innerHTML interpolation
    this.el.querySelector('.title-game-name').textContent = this.gameTitle;
    this._bindButtons();
  }

  _renderCustom() {
    this.el.innerHTML = '';
    this.el.style.position = 'absolute';
    this.el.style.inset = '0';

    if (this.layout.background) {
      const safeBg = sanitizeCssValue(this.layout.background);
      if (safeBg) {
        const bgUrl = resolvePath(safeBg);
        this.el.style.backgroundImage = `url('${bgUrl}')`;
        this.el.style.backgroundSize = 'cover';
        this.el.style.backgroundPosition = 'center';
      }
    }

    this.layout.elements.forEach(elem => {
      if (elem.type === 'text') {
        this._createTextElement(elem);
      } else if (elem.type === 'button') {
        this._createButtonElement(elem);
      } else if (elem.type === 'image') {
        this._createImageElement(elem);
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
      const origBg = bgColor || '';
      btn.addEventListener('mouseenter', () => { btn.style.background = hoverColor; });
      btn.addEventListener('mouseleave', () => { btn.style.background = origBg; });
    }

    const action = cfg.action;
    if (action === 'start') {
      btn.addEventListener('click', () => { if (this.onStart) this.onStart(); });
    } else if (action === 'continue' || action === 'load') {
      if (!this.hasSave) { btn.style.opacity = '0.3'; btn.style.pointerEvents = 'none'; }
      btn.addEventListener('click', () => { if (this.onContinue) this.onContinue(); });
    } else if (action === 'settings') {
      btn.addEventListener('click', () => { if (this.onSettings) this.onSettings(); });
    } else if (action === 'gallery') {
      btn.addEventListener('click', () => { if (this.onGallery) this.onGallery(); });
    } else if (action === 'quit') {
      btn.addEventListener('click', () => { if (window.close) window.close(); });
    }
    this.el.appendChild(btn);
  }

  _createImageElement(cfg) {
    const el = document.createElement('div');
    el.className = 'title-custom-element title-custom-image';
    this._applyPosition(el, cfg);
    if (cfg.width) el.style.width = `${clampField('width', cfg.width)}px`;
    if (cfg.height) el.style.height = `${clampField('height', cfg.height)}px`;
    el.style.overflow = 'hidden';

    const src = sanitizeCssValue(cfg.src);
    if (src) {
      const img = document.createElement('img');
      img.src = resolvePath(src);
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.display = 'block';
      img.draggable = false;
      el.appendChild(img);
    }
    this.el.appendChild(el);
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
    this.el.querySelector('#title-gallery')?.addEventListener('click', () => {
      if (this.onGallery) this.onGallery();
    });
  }
}
