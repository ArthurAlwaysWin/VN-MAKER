/**
 * TextInputScreen — Generic runtime text input for story variables.
 */
export class TextInputScreen {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.onSubmit = null;

    this.el = document.createElement('div');
    this.el.id = 'text-input-screen';
    this.el.className = 'hidden';
    this.el.innerHTML = `
      <div class="text-input-panel">
        <div class="text-input-prompt"></div>
        <input class="text-input-field" type="text" autocomplete="off" spellcheck="false" />
        <button class="text-input-submit" type="button"></button>
      </div>
    `;
    this.container.appendChild(this.el);

    this.promptEl = this.el.querySelector('.text-input-prompt');
    this.inputEl = this.el.querySelector('.text-input-field');
    this.submitEl = this.el.querySelector('.text-input-submit');
    this.required = true;

    this.submitEl.addEventListener('click', () => this._submit());
    this.inputEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this._submit();
      }
    });
    this.inputEl.addEventListener('input', () => this._updateSubmitState());
  }

  show(data = {}) {
    this.promptEl.textContent = data.prompt || '请输入名称';
    this.inputEl.value = data.defaultValue || '';
    this.inputEl.placeholder = data.placeholder || '';
    this.inputEl.maxLength = Number.isInteger(Number(data.maxLength)) && Number(data.maxLength) > 0
      ? Number(data.maxLength)
      : 24;
    this.submitEl.textContent = data.submitText || '确定';
    this.required = data.required !== false;
    this._updateSubmitState();

    this.el.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.el.classList.add('visible');
      this.inputEl.focus();
      this.inputEl.select();
    });
  }

  hide() {
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
  }

  _updateSubmitState() {
    this.submitEl.disabled = this.required && !this.inputEl.value.trim();
  }

  _submit() {
    const value = this.inputEl.value;
    if (this.required && !value.trim()) {
      this.inputEl.focus();
      return;
    }

    if (this.onSubmit?.(value) !== false) {
      this.hide();
    }
  }
}
