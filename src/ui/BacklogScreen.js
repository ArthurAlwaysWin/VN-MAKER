/**
 * BacklogScreen — Shows dialogue history with voice replay
 */
import { sanitizeCssValue, clampField } from './sanitize.js';
import { resolvePath } from '../engine/assetPath.js';
import { clearScreenDecorations, renderScreenDecorations } from './screenDecorations.js';
import { resolveThemeIcon, hasThemeIcon } from './themeIconHelpers.js';

export class BacklogScreen {
  /**
   * @param {HTMLElement} container
   * @param {import('../engine/AudioManager').AudioManager|null} audio
   */
  constructor(container, audio = null) {
    this.container = container;
    this.audio = audio;
    this._playingEntry = null;
    this._layoutConfig = null;
    this._themeIcons = null;
    this.el = document.createElement('div');
    this.el.id = 'backlog-screen';
    this.el.classList.add('hidden');
    this.container.appendChild(this.el);
  }

  /**
   * Store a layout configuration for customizing appearance.
   * Pass null to revert to default hardcoded rendering (COMPAT-02).
   * @param {object|null} config — layout config from ui.backlogScreen
   */
  setLayout(config) {
    this._layoutConfig = config || null;
    if (this.el.classList.contains('visible')) {
      this.show(this._lastHistory || [], this._lastCharacters || {});
    }
  }

  /**
   * Apply theme-level icon configuration (Phase 75 — ICO-01).
   * @param {object|null} icons — ui.theme.icons object
   */
  setThemeIcons(icons) {
    this._themeIcons = icons || null;
    if (this.el.classList.contains('visible')) {
      this.show(this._lastHistory || [], this._lastCharacters || {});
    }
  }

  /**
   * @param {Array<{speaker:string|null, speakerName:string|null, text:string, voice:string|null}>} history
   * @param {Object} characters — character definitions (for colors)
   */
  show(history, characters = {}) {
    this._lastHistory = history;
    this._lastCharacters = characters;
    const cfg = this._layoutConfig;

    // Reset inline styles from any previous config render (COMPAT-02)
    this.el.style.background = '';
    this.el.style.backgroundImage = '';

    this.el.innerHTML = `
      <div class="backlog-header">
        <div class="backlog-title">回 想</div>
        <button class="backlog-close">${hasThemeIcon(this._themeIcons, 'close') ? resolveThemeIcon(this._themeIcons, 'close', '返回', 'close-icon') : '返回'}</button>
      </div>
      <div class="backlog-content"></div>
    `;

    this.el.querySelector('.backlog-close').addEventListener('click', () => this.hide());

    // ── Apply screen-level config (background, header) ───
    if (cfg) {
      this._applyScreenConfig(cfg);
    }

    const content = this.el.querySelector('.backlog-content');
    history.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'backlog-entry';

      const charColor = entry.speaker && characters[entry.speaker]
        ? characters[entry.speaker].color
        : null;

      if (entry.speakerName) {
        const speakerDiv = document.createElement('div');
        speakerDiv.className = 'backlog-speaker';
        speakerDiv.textContent = entry.speakerName;
        if (charColor) speakerDiv.style.color = charColor;
        div.appendChild(speakerDiv);

        const textDiv = document.createElement('div');
        textDiv.className = 'backlog-text';
        textDiv.textContent = entry.text;
        div.appendChild(textDiv);
      } else {
        const textDiv = document.createElement('div');
        textDiv.className = 'backlog-text';
        textDiv.style.fontStyle = 'italic';
        textDiv.textContent = entry.text;
        div.appendChild(textDiv);
      }

      // Voice replay button (D-01, D-02) — icon or text (ICO-01)
      if (entry.voice && this.audio) {
        const btn = document.createElement('button');
        btn.className = 'backlog-voice-btn';
        if (hasThemeIcon(this._themeIcons, 'voiceReplay')) {
          btn.innerHTML = resolveThemeIcon(this._themeIcons, 'voiceReplay', '▶', 'voice-replay-icon');
          btn.dataset.isIconBtn = '1';
        } else {
          btn.textContent = '▶';
        }
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._playVoice(div, btn, entry.voice);
        });
        div.insertBefore(btn, div.firstChild);
        div.classList.add('backlog-has-voice');
      }

      // ── Apply entry-level config ───────────────────────
      if (cfg?.entry) {
        this._applyEntryConfig(cfg.entry, div, charColor);
      }

      content.appendChild(div);
    });

    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));

    // ── Chrome decorations (Phase 74) ──
    clearScreenDecorations(this.el);
    if (cfg?.chrome?.decorations) {
      renderScreenDecorations(this.el, cfg.chrome.decorations);
    }

    // Scroll to bottom
    requestAnimationFrame(() => {
      content.scrollTop = content.scrollHeight;
    });
  }

  // ── Layout config helpers ─────────────────────────────

  /**
   * Apply screen-level config: background, backgroundImage, header.
   * @param {object} cfg — _layoutConfig
   * @private
   */
  _applyScreenConfig(cfg) {
    // Background color
    if (cfg.background) {
      const safeBg = sanitizeCssValue(cfg.background);
      if (safeBg) this.el.style.background = safeBg;
    }

    // Background image
    if (cfg.backgroundImage) {
      const safeImg = sanitizeCssValue(cfg.backgroundImage);
      if (safeImg) {
        const resolved = resolvePath(safeImg);
        if (resolved) this.el.style.backgroundImage = `url("${resolved}")`;
      }
    }

    // Header config
    if (cfg.header) {
      const header = this.el.querySelector('.backlog-header');

      // Custom title text
      if (cfg.header.title) {
        const titleEl = this.el.querySelector('.backlog-title');
        titleEl.textContent = cfg.header.title;
      }

      // Header background image
      if (cfg.header.backgroundImage) {
        const safeHdrImg = sanitizeCssValue(cfg.header.backgroundImage);
        if (safeHdrImg) {
          const resolved = resolvePath(safeHdrImg);
          if (resolved) header.style.backgroundImage = `url("${resolved}")`;
        }
      }

      // Header height
      if (cfg.header.height != null) {
        const h = clampField('height', cfg.header.height);
        if (h != null) header.style.height = `${h}px`;
      }
    }
  }

  /**
   * Apply entry-level config to a single backlog entry div.
   * @param {object} entryCfg — _layoutConfig.entry
   * @param {HTMLElement} div — the .backlog-entry element
   * @param {string|null} charColor — character color from existing logic
   * @private
   */
  _applyEntryConfig(entryCfg, div, charColor) {
    const speakerDiv = div.querySelector('.backlog-speaker');

    // Speaker color: config overrides character color
    if (speakerDiv) {
      if (entryCfg.speakerColor) {
        const safeColor = sanitizeCssValue(entryCfg.speakerColor);
        if (safeColor) speakerDiv.style.color = safeColor;
      }
      // else: charColor already applied by existing code
    }

    // Speaker font size
    if (speakerDiv && entryCfg.speakerFontSize != null) {
      const size = clampField('fontSize', entryCfg.speakerFontSize);
      if (size != null) speakerDiv.style.fontSize = `${size}px`;
    }

    // Text font size
    if (entryCfg.textFontSize != null) {
      const size = clampField('fontSize', entryCfg.textFontSize);
      if (size != null) {
        const textDiv = div.querySelector('.backlog-text');
        if (textDiv) textDiv.style.fontSize = `${size}px`;
      }
    }

    // Entry background
    if (entryCfg.background) {
      const safeBg = sanitizeCssValue(entryCfg.background);
      if (safeBg) div.style.background = safeBg;
    }

    // Entry border-bottom
    if (entryCfg.borderBottom) {
      const safeBorder = sanitizeCssValue(entryCfg.borderBottom);
      if (safeBorder) div.style.borderBottom = safeBorder;
    }

    // Entry padding (array → CSS string)
    if (Array.isArray(entryCfg.padding)) {
      const clamped = entryCfg.padding
        .map(v => clampField('padding', v))
        .filter(v => v != null);
      if (clamped.length > 0) {
        div.style.padding = clamped.map(v => `${v}px`).join(' ');
      }
    }

    // Hover background (mouseenter/mouseleave)
    if (entryCfg.hoverBackground) {
      const safeHover = sanitizeCssValue(entryCfg.hoverBackground);
      if (safeHover) {
        const baseBg = entryCfg.background
          ? (sanitizeCssValue(entryCfg.background) || '')
          : '';
        div.addEventListener('mouseenter', () => {
          div.style.background = safeHover;
        });
        div.addEventListener('mouseleave', () => {
          div.style.background = baseBg;
        });
      }
    }
  }

  /** @private */
  _playVoice(entryEl, btn, voiceFile) {
    // Clicking same entry that's playing → stop (D-02)
    if (this._playingEntry === entryEl) {
      this._stopCurrentVoice();
      return;
    }

    // Stop previous if any (D-01 — clicking another replaces)
    this._stopCurrentVoice();

    this._playingEntry = entryEl;
    if (btn.dataset.isIconBtn) {
      btn.innerHTML = resolveThemeIcon(this._themeIcons, 'voiceReplay', '■', 'voice-replay-icon');
      btn.classList.add('backlog-voice-playing');
    } else {
      btn.textContent = '■';
    }
    entryEl.classList.add('backlog-playing');

    this.audio.playVoice(voiceFile).then(() => {
      if (this._playingEntry === entryEl) {
        this._restoreEntry(entryEl, btn);
      }
    });
  }

  /** @private */
  _stopCurrentVoice() {
    if (this._playingEntry) {
      const entry = this._playingEntry;
      const btn = entry.querySelector('.backlog-voice-btn');
      this._playingEntry = null;
      this.audio.stopVoice();
      if (btn) {
        if (btn.dataset.isIconBtn) {
          btn.innerHTML = resolveThemeIcon(this._themeIcons, 'voiceReplay', '▶', 'voice-replay-icon');
        } else {
          btn.textContent = '▶';
        }
      }
      entry.classList.remove('backlog-playing');
    }
  }

  /** @private */
  _restoreEntry(entryEl, btn) {
    this._playingEntry = null;
    if (btn.dataset.isIconBtn) {
      btn.innerHTML = resolveThemeIcon(this._themeIcons, 'voiceReplay', '▶', 'voice-replay-icon');
    } else {
      btn.textContent = '▶';
    }
    entryEl.classList.remove('backlog-playing');
  }

  hide() {
    this._stopCurrentVoice(); // D-03: stop voice on close
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
  }
}
