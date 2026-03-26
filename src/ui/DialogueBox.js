/**
 * DialogueBox — Displays dialogue text with typewriter effect
 */
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

    // Speaker name
    if (data.speakerName) {
      this.nameEl.textContent = data.speakerName;
      this.nameEl.style.color = data.speakerColor || '#fff';
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
