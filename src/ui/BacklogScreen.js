/**
 * BacklogScreen — Shows dialogue history with voice replay
 */
export class BacklogScreen {
  /**
   * @param {HTMLElement} container
   * @param {import('../engine/AudioManager').AudioManager|null} audio
   */
  constructor(container, audio = null) {
    this.container = container;
    this.audio = audio;
    this._playingEntry = null;
    this.el = document.createElement('div');
    this.el.id = 'backlog-screen';
    this.el.classList.add('hidden');
    this.container.appendChild(this.el);
  }

  /**
   * @param {Array<{speaker:string|null, speakerName:string|null, text:string, voice:string|null}>} history
   * @param {Object} characters — character definitions (for colors)
   */
  show(history, characters = {}) {
    this.el.innerHTML = `
      <div class="backlog-header">
        <div class="backlog-title">回 想</div>
        <button class="backlog-close">返回</button>
      </div>
      <div class="backlog-content"></div>
    `;

    this.el.querySelector('.backlog-close').addEventListener('click', () => this.hide());

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

      // Voice replay button (D-01, D-02)
      if (entry.voice && this.audio) {
        const btn = document.createElement('button');
        btn.className = 'backlog-voice-btn';
        btn.textContent = '▶';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._playVoice(div, btn, entry.voice);
        });
        div.insertBefore(btn, div.firstChild);
        div.classList.add('backlog-has-voice');
      }

      content.appendChild(div);
    });

    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));

    // Scroll to bottom
    requestAnimationFrame(() => {
      content.scrollTop = content.scrollHeight;
    });
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
    btn.textContent = '■';
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
      if (btn) btn.textContent = '▶';
      entry.classList.remove('backlog-playing');
    }
  }

  /** @private */
  _restoreEntry(entryEl, btn) {
    this._playingEntry = null;
    btn.textContent = '▶';
    entryEl.classList.remove('backlog-playing');
  }

  hide() {
    this._stopCurrentVoice(); // D-03: stop voice on close
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
  }
}
