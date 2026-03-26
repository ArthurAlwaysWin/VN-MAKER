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
