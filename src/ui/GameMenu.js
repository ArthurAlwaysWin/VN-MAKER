/**
 * GameMenu — In-game pause menu (ESC / right-click)
 */
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

  _render() {
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
}
