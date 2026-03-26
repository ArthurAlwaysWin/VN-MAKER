/**
 * TitleScreen — Main menu (start, continue, settings)
 */
export class TitleScreen {
  /**
   * @param {HTMLElement} container — the #ui-overlay or #game-container
   * @param {string} gameTitle
   */
  constructor(container, gameTitle = 'Galgame Maker') {
    this.container = container;
    this.gameTitle = gameTitle;

    this.el = document.createElement('div');
    this.el.id = 'title-screen';
    this.container.appendChild(this.el);

    /** @type {Function|null} */ this.onStart = null;
    /** @type {Function|null} */ this.onContinue = null;
    /** @type {Function|null} */ this.onSettings = null;

    /** @type {boolean} Whether a save exists */
    this.hasSave = false;
  }

  /**
   * @param {boolean} hasSave
   */
  show(hasSave = false) {
    this.hasSave = hasSave;
    this._render();
    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));
  }

  hide() {
    this.el.classList.remove('visible');
    setTimeout(() => this.el.classList.add('hidden'), 800);
  }

  _render() {
    this.el.innerHTML = `
      <div class="title-game-name">${this.gameTitle}</div>
      <div class="title-menu">
        <button class="title-button" id="title-start">开 始 游 戏</button>
        ${this.hasSave ? '<button class="title-button" id="title-continue">继 续 游 戏</button>' : ''}
        <button class="title-button" id="title-settings">设 定</button>
      </div>
      <div class="title-subtitle">Powered by Galgame Maker</div>
    `;

    this.el.querySelector('#title-start').addEventListener('click', () => {
      if (this.onStart) this.onStart();
    });

    const continueBtn = this.el.querySelector('#title-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (this.onContinue) this.onContinue();
      });
    }

    this.el.querySelector('#title-settings').addEventListener('click', () => {
      if (this.onSettings) this.onSettings();
    });
  }
}
