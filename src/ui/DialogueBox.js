/**
 * DialogueBox — Displays dialogue text with typewriter effect
 */
import { sanitizeCssValue, clampField } from './sanitize.js';

export class DialogueBox {
  /**
   * @param {HTMLElement} container — the #dialogue-layer element
   */
  constructor(container) {
    this.container = container;

    // Build DOM structure
    this.el = document.createElement('div');
    this.el.id = 'dialogue-box';
    this.el.innerHTML = `
      <div class="dialogue-name-plate">
        <span class="dialogue-speaker-name"></span>
      </div>
      <div class="dialogue-text-area">
        <span class="dialogue-text"></span>
        <span class="dialogue-indicator">▼</span>
      </div>
    `;
    this.container.appendChild(this.el);

    this.nameEl = this.el.querySelector('.dialogue-speaker-name');
    this.textEl = this.el.querySelector('.dialogue-text');
    this.indicatorEl = this.el.querySelector('.dialogue-indicator');

    /** @type {string} Full text to display */
    this._fullText = '';
    /** @type {number} Characters revealed so far */
    this._charIndex = 0;
    /** @type {number|null} Typewriter interval ID */
    this._typeTimer = null;
    /** @type {boolean} Whether this dialogue line is fully displayed */
    this._complete = false;
    /** @type {number} Milliseconds per character */
    this.typeSpeed = 30;
    /** @type {Function|null} Callback when player clicks to advance */
    this.onAdvance = null;
    /** @type {Object} Global font settings from script.json ui.dialogueBox */
    this._globalSettings = {};
    /** @type {string|null} Active nameplate color (from global or per-page override) */
    this._activeNameplateColor = null;

    // Hidden by default
    this.hide();

    // Click handler
    this.el.addEventListener('click', (e) => {
      e.stopPropagation();
      this._handleClick();
    });
  }

  /**
   * Show a dialogue line with typewriter effect
   * @param {Object} data — { speakerName, speakerColor, text }
   */
  show(data) {
    this.el.classList.add('visible');

    // Apply custom style if provided, with font override support
    this._applyStyle(data.style, data.fontOverride);

    // Speaker name
    if (data.speakerName) {
      this.nameEl.textContent = data.speakerName;
      // Priority: per-character color > active nameplate color (global/override) > white
      this.nameEl.style.color = data.speakerColor || this._activeNameplateColor || '#fff';
      this.nameEl.parentElement.classList.add('visible');
    } else {
      this.nameEl.textContent = '';
      this.nameEl.parentElement.classList.remove('visible');
    }

    // Start typewriter
    this._fullText = data.text;
    this._charIndex = 0;
    this._complete = false;
    this.textEl.textContent = '';
    this.indicatorEl.classList.remove('visible');

    this._startTypewriter();
  }

  _applyStyle(style, fontOverride) {
    // 1. Reset all inline styles
    this.el.style.cssText = '';
    this.textEl.style.cssText = '';
    this.nameEl.style.cssText = '';

    // 2. Re-apply global font settings as baseline
    this._applyFontSettings(this._globalSettings);

    // 3. Apply per-page font override if active
    if (fontOverride && !fontOverride.useGlobal) {
      this._applyFontSettings(fontOverride);
    }

    // 4. Apply per-dialogue position/size/style overrides
    if (!style) return;
    const s = style;
    if (s.x !== undefined) this.el.style.left = `${clampField('x', s.x)}px`;
    if (s.y !== undefined) {
      this.el.style.bottom = 'auto';
      this.el.style.top = `${clampField('y', s.y)}px`;
      this.el.style.right = 'auto';
    }
    if (s.width) this.el.style.width = `${clampField('width', s.width)}px`;
    if (s.height) {
      this.el.style.height = `${clampField('height', s.height)}px`;
      this.el.style.minHeight = 'unset';
    }
    if (s.fontSize) this.textEl.style.fontSize = `${clampField('fontSize', s.fontSize)}px`;
    const fontFamily = sanitizeCssValue(s.fontFamily);
    if (fontFamily) this.textEl.style.fontFamily = fontFamily;
    const textColor = sanitizeCssValue(s.textColor);
    if (textColor) this.textEl.style.color = textColor;
    const bgColor = sanitizeCssValue(s.backgroundColor);
    if (bgColor) this.el.style.background = bgColor;
    if (s.borderRadius !== undefined) this.el.style.borderRadius = `${clampField('borderRadius', s.borderRadius)}px`;
    if (s.padding) {
      const p = Array.isArray(s.padding) ? s.padding : [s.padding, s.padding, s.padding, s.padding];
      this.el.style.padding = p.map(v => `${clampField('padding', v)}px`).join(' ');
    }
  }

  // ─── Global font settings ────────────────────────────────

  /**
   * Apply global dialogue box style from script settings.
   * Called once at engine init; values persist as baseline for _applyStyle resets.
   * @param {Object} settings — ui.dialogueBox from script.json
   */
  applyGlobalStyle(settings) {
    this._globalSettings = settings || {};
    this._applyFontSettings(this._globalSettings);
  }

  /**
   * Apply font settings to dialogue text and nameplate elements.
   * @param {Object} s — font settings object (global or per-page override)
   * @private
   */
  _applyFontSettings(s) {
    if (!s) return;

    // Dialogue text
    if (s.fontSize) {
      const fs = clampField('fontSize', s.fontSize);
      if (fs) this.textEl.style.fontSize = fs + 'px';
    }
    const ff = sanitizeCssValue(s.fontFamily);
    if (ff) this.textEl.style.fontFamily = ff;
    const tc = sanitizeCssValue(s.textColor);
    if (tc) this.textEl.style.color = tc;

    // Nameplate (fully independent)
    if (s.nameplateFontSize) {
      const nfs = clampField('fontSize', s.nameplateFontSize);
      if (nfs) this.nameEl.style.fontSize = nfs + 'px';
    }
    const nff = sanitizeCssValue(s.nameplateFontFamily);
    if (nff) this.nameEl.style.fontFamily = nff;
    const nc = sanitizeCssValue(s.nameplateColor);
    if (nc) {
      this.nameEl.style.color = nc;
      this._activeNameplateColor = nc;
    }
  }

  hide() {
    this.el.classList.remove('visible');
    this._stopTypewriter();
  }

  /**
   * @returns {boolean} Whether the current line is fully displayed
   */
  isComplete() {
    return this._complete;
  }

  _startTypewriter() {
    this._stopTypewriter();
    this._typeTimer = setInterval(() => {
      if (this._charIndex < this._fullText.length) {
        this._charIndex++;
        this.textEl.textContent = this._fullText.substring(0, this._charIndex);
      } else {
        this._finishLine();
      }
    }, this.typeSpeed);
  }

  _stopTypewriter() {
    if (this._typeTimer !== null) {
      clearInterval(this._typeTimer);
      this._typeTimer = null;
    }
  }

  _finishLine() {
    this._stopTypewriter();
    this.textEl.textContent = this._fullText;
    this._charIndex = this._fullText.length;
    this._complete = true;
    this.indicatorEl.classList.add('visible');
  }

  _handleClick() {
    if (!this._complete) {
      // Fast-forward to end of line
      this._finishLine();
    } else {
      // Advance to next command
      if (this.onAdvance) this.onAdvance();
    }
  }
}
