/**
 * ChoiceMenu — Displays choice options for branching
 */
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
  }

  /**
   * Show choice options
   * @param {Object} data — { prompt, options: [{ text, ... }] }
   */
  show(data) {
    this.el.innerHTML = '';
    this.el.style.cssText = '';

    // Custom layout mode
    const isCustom = data.layout === 'custom' && data.style;
    if (isCustom) {
      this.el.classList.add('layout-custom');
      const s = data.style;
      if (s.x !== undefined) this.el.style.left = `${s.x}px`;
      if (s.y !== undefined) this.el.style.top = `${s.y}px`;
      if (s.width) this.el.style.width = `${s.width}px`;
      if (s.backgroundColor) this.el.style.background = s.backgroundColor;
    } else {
      this.el.classList.remove('layout-custom');
    }

    if (data.prompt) {
      const promptEl = document.createElement('div');
      promptEl.className = 'choice-prompt';
      promptEl.textContent = data.prompt;
      this.el.appendChild(promptEl);
    }

    const list = document.createElement('div');
    list.className = 'choice-list';

    data.options.forEach((option, index) => {
      const btn = document.createElement('button');
      btn.className = 'choice-button';
      btn.textContent = option.text;

      // Per-button custom style
      if (option.style) {
        const os = option.style;
        if (os.x !== undefined || os.y !== undefined) {
          btn.style.position = 'absolute';
          btn.style.left = `${os.x ?? 0}px`;
          btn.style.top = `${os.y ?? 0}px`;
        }
        if (os.width) btn.style.width = `${os.width}px`;
        if (os.height) btn.style.height = `${os.height}px`;
        if (os.fontSize) btn.style.fontSize = `${os.fontSize}px`;
        if (os.fontFamily) btn.style.fontFamily = os.fontFamily;
        if (os.color) btn.style.color = os.color;
        if (os.backgroundColor) btn.style.background = os.backgroundColor;
        if (os.borderRadius !== undefined) btn.style.borderRadius = `${os.borderRadius}px`;
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
        if (this.onSelect) this.onSelect(index);
      });
      list.appendChild(btn);
    });

    this.el.appendChild(list);
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
