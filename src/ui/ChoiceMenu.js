/**
 * ChoiceMenu — Displays choice options for branching
 */
import { sanitizeCssValue, clampField } from './sanitize.js';
import { UI_CHOICE_BADGE_SLOT_KEYS } from '../shared/uiImageContract.js';

export class ChoiceMenu {
  /**
   * @param {HTMLElement} container — the #ui-overlay element
   */
  constructor(container) {
    this.container = container;

    this.el = document.createElement('div');
    this.el.id = 'choice-menu';
    this.el.classList.add('hidden');
    this.container.appendChild(this.el);

    /** @type {Function|null} Callback when an option is selected */
    this.onSelect = null;
    /** @type {object|null} Explicit ui.widgetStyles.button config for choice buttons. */
    this._buttonWidgetStyle = null;
    /** @type {Record<'a'|'b'|'c', string>|null} Decorative badge image config. */
    this._choiceBadgeConfig = null;
    this._canonicalLayoutActive = false;
  }

  setWidgetStyles(styles) {
    this._buttonWidgetStyle = styles?.button && typeof styles.button === 'object'
      ? { ...styles.button }
      : null;
  }

  setChoiceBadgeConfig(config) {
    if (!config || typeof config !== 'object') {
      this._choiceBadgeConfig = null;
      return;
    }

    const normalized = {};
    for (const slotKey of UI_CHOICE_BADGE_SLOT_KEYS) {
      const src = typeof config[slotKey] === 'string' ? config[slotKey].trim() : '';
      if (src) normalized[slotKey] = src;
    }
    this._choiceBadgeConfig = Object.keys(normalized).length > 0 ? normalized : null;
  }

  setCanonicalLayoutActive(active) {
    this._canonicalLayoutActive = Boolean(active);
    this._applyCanonicalFill();
  }

  _applyCanonicalFill() {
    if (!this._canonicalLayoutActive) return;
    Object.assign(this.el.style, {
      position: 'relative', left: '0px', top: '0px', right: 'auto', bottom: 'auto',
      width: '100%', height: '100%', boxSizing: 'border-box',
    });
  }

  _applyButtonStyle(btn, style = {}) {
    const background = sanitizeCssValue(style.background);
    if (background) btn.style.setProperty('--gm-btn-bg', background);

    const hoverBackground = sanitizeCssValue(style.hoverBackground);
    if (hoverBackground) btn.style.setProperty('--gm-btn-hover-bg', hoverBackground);

    const textColor = sanitizeCssValue(style.textColor);
    if (textColor) btn.style.color = textColor;

    const border = sanitizeCssValue(style.border);
    if (border) btn.style.border = border;

    if (style.borderRadius !== undefined) {
      const radius = clampField('borderRadius', style.borderRadius);
      if (radius !== undefined) btn.style.borderRadius = `${radius}px`;
    }

    if (style.fontSize !== undefined) {
      const fontSize = clampField('fontSize', style.fontSize);
      if (fontSize !== undefined) btn.style.fontSize = `${fontSize}px`;
    }
  }

  /**
   * Show choice options
   * @param {Object} data — { prompt, options: [{ text, ... }] }
   */
  show(data) {
    const choiceData = data && typeof data === 'object' ? data : {};
    this.el.classList.remove('visible');
    this.el.innerHTML = '';
    this.el.style.cssText = '';

    // Custom layout mode
    const isCustom = choiceData.layout === 'custom' && choiceData.style;
    if (isCustom) {
      this.el.classList.add('layout-custom');
      const s = choiceData.style;
      if (s.x !== undefined) this.el.style.left = `${clampField('x', s.x)}px`;
      if (s.y !== undefined) this.el.style.top = `${clampField('y', s.y)}px`;
      if (s.width) this.el.style.width = `${clampField('width', s.width)}px`;
      const bgColor = sanitizeCssValue(s.backgroundColor);
      if (bgColor) this.el.style.background = bgColor;
    } else {
      this.el.classList.remove('layout-custom');
    }

    if (choiceData.prompt) {
      const promptEl = document.createElement('div');
      promptEl.className = 'choice-prompt';
      promptEl.textContent = choiceData.prompt;
      this.el.appendChild(promptEl);
    }

    const list = document.createElement('div');
    list.className = 'choice-list';

    (Array.isArray(choiceData.options) ? choiceData.options : []).forEach((option, index) => {
      const btn = document.createElement('button');
      btn.className = 'choice-button';
      btn.style.setProperty('--choice-index', String(index));
      btn.textContent = option?.text ?? '';
      if (this._buttonWidgetStyle) {
        this._applyButtonStyle(btn, this._buttonWidgetStyle);
      }

      const badgeSlot = UI_CHOICE_BADGE_SLOT_KEYS[index % UI_CHOICE_BADGE_SLOT_KEYS.length];
      if (this._choiceBadgeConfig?.[badgeSlot]) {
        const badge = document.createElement('span');
        badge.className = `choice-badge choice-badge-${badgeSlot}`;
        badge.setAttribute('aria-hidden', 'true');
        btn.prepend(badge);
      }

      // Per-button custom style
      if (option.style) {
        const os = option.style;
        if (os.x !== undefined || os.y !== undefined) {
          btn.style.position = 'absolute';
          btn.style.left = `${clampField('x', os.x ?? 0)}px`;
          btn.style.top = `${clampField('y', os.y ?? 0)}px`;
        }
        if (os.width) btn.style.width = `${clampField('width', os.width)}px`;
        if (os.height) btn.style.height = `${clampField('height', os.height)}px`;
        if (os.fontSize) btn.style.fontSize = `${clampField('fontSize', os.fontSize)}px`;
        const fontFamily = sanitizeCssValue(os.fontFamily);
        if (fontFamily) btn.style.fontFamily = fontFamily;
        const color = sanitizeCssValue(os.color);
        if (color) btn.style.color = color;
        const bgColor = sanitizeCssValue(os.backgroundColor);
        if (bgColor) btn.style.background = bgColor;
        if (os.borderRadius !== undefined) btn.style.borderRadius = `${clampField('borderRadius', os.borderRadius)}px`;
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
        if (!choiceData.previewOnly && this.onSelect) this.onSelect(index);
      });
      list.appendChild(btn);
    });

    this.el.appendChild(list);
    this._applyCanonicalFill();
    this.el.classList.remove('hidden');

    // Animate in
    requestAnimationFrame(() => {
      this.el.classList.add('visible');
    });
  }

  hide() {
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
  }
}
