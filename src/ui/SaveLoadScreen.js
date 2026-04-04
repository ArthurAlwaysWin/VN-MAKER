/**
 * SaveLoadScreen — UI for save / load slots
 */
export class SaveLoadScreen {
  /**
   * @param {HTMLElement} container
   * @param {import('../engine/SaveManager.js').SaveManager} saveManager
   */
  constructor(container, saveManager) {
    this.container = container;
    this.saveManager = saveManager;

    this.el = document.createElement('div');
    this.el.id = 'save-load-screen';
    this.el.classList.add('hidden');
    this.container.appendChild(this.el);

    /** @type {'save'|'load'} */
    this.mode = 'save';
    /** @type {Function|null} */
    this.onSave = null;
    /** @type {Function|null} */
    this.onLoad = null;
  }

  /**
   * @param {'save'|'load'} mode
   */
  show(mode = 'save') {
    this.mode = mode;
    this._render();
    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));
  }

  hide() {
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
  }

  async _render() {
    const title = this.mode === 'save' ? '存 档' : '读 档';

    this.el.innerHTML = `
      <div class="save-load-header">
        <div class="save-load-title">${title}</div>
        <button class="save-load-close">返回</button>
      </div>
      <div class="save-load-grid"></div>
    `;

    this.el.querySelector('.save-load-close').addEventListener('click', () => this.hide());

    const grid = this.el.querySelector('.save-load-grid');
    const allSlots = await this.saveManager.getAllSlots();

    // Build a lookup map: slot number → metadata
    const slotMap = new Map();
    for (const s of allSlots) {
      slotMap.set(s.slot, s);
    }

    // Render 8 slots (keeping current UI layout — Phase 21 expands to 100)
    for (let i = 1; i <= 8; i++) {
      const slot = slotMap.get(i) || null;
      const slotEl = document.createElement('div');
      slotEl.className = `save-slot ${slot ? '' : 'empty'}`;

      if (slot) {
        slotEl.innerHTML = `
          <div class="save-slot-label">存档 ${i}</div>
          <div class="save-slot-text">${slot.previewText || '(无预览)'}</div>
          <div class="save-slot-time">${slot.date}</div>
        `;
      } else {
        slotEl.innerHTML = `
          <div class="save-slot-label">存档 ${i} — 空</div>
        `;
      }

      slotEl.addEventListener('click', () => {
        if (this.mode === 'save') {
          if (this.onSave) this.onSave(i);
          this._render(); // refresh after save (async, fire-and-forget)
        } else {
          if (slot && this.onLoad) {
            this.onLoad(i);
            this.hide();
          }
        }
      });

      grid.appendChild(slotEl);
    }
  }
}
