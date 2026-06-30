/**
 * TextInputScreen — Generic runtime text input for story variables.
 */
import { createUiRuntimeHost } from './renderer/createUiRendererHost.js';

export class TextInputScreen {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.onSubmit = null;
    this.onCancel = null;
    this._canonicalDocument = null;
    this._canonicalHost = null;
    this._lastFocused = null;
    this._data = {};

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
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        this._submit();
      }
    });
    this.inputEl.addEventListener('input', () => this._updateSubmitState());
  }

  setDocument(document) {
    this._canonicalDocument = document || null;
  }

  show(data = {}) {
    this._data = { ...data };
    this._lastFocused = this.el.ownerDocument.activeElement;
    if (this._canonicalDocument) this._renderCanonical();
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
    this._canonicalHost?.unmount();
    this._canonicalHost = null;
    this._lastFocused?.focus?.();
    this._lastFocused = null;
  }

  _updateSubmitState() {
    this.submitEl.disabled = this.required && !this.inputEl.value.trim();
  }

  _submit() {
    const value = this.inputEl.value;
    if (this.required && !value.trim()) {
      this._showValidation(this._data.validationRequired || '请输入内容');
      this.inputEl.focus();
      return;
    }

    if (this.onSubmit?.(value) !== false) {
      this.hide();
    } else {
      this._showValidation(this._data.validationMessage || '输入无效，请检查后重试');
    }
  }

  _cancel() {
    this.onCancel?.();
    this.hide();
  }

  _showValidation(message = '') {
    const validation = this.el.querySelector('.text-input-validation');
    if (!validation) return;
    validation.textContent = message;
    validation.hidden = !message;
  }

  _renderCanonical() {
    this._canonicalHost?.unmount();
    this.el.innerHTML = '';
    const semanticWidgets = {
      'text-input': {
        mount: ({ element }) => {
          element.classList.add('text-input-panel');
          const prompt = element.ownerDocument.createElement('label');
          prompt.className = 'text-input-prompt';
          prompt.dataset.gmUiPart = 'prompt';
          const input = element.ownerDocument.createElement('input');
          input.className = 'text-input-field';
          input.dataset.gmUiPart = 'input';
          input.type = 'text';
          input.autocomplete = 'off';
          input.spellcheck = false;
          prompt.htmlFor = `gm-text-input-${Date.now()}`;
          input.id = prompt.htmlFor;
          const validation = element.ownerDocument.createElement('p');
          validation.className = 'text-input-validation';
          validation.dataset.gmUiPart = 'validation';
          validation.setAttribute('role', 'alert');
          validation.hidden = true;
          const confirm = element.ownerDocument.createElement('button');
          confirm.className = 'text-input-submit';
          confirm.dataset.gmUiPart = 'confirm';
          confirm.type = 'button';
          const cancel = element.ownerDocument.createElement('button');
          cancel.className = 'text-input-cancel';
          cancel.dataset.gmUiPart = 'cancel';
          cancel.type = 'button';
          element.append(prompt, input, validation, confirm, cancel);
        },
        update: ({ element, node }) => {
          this.promptEl = element.querySelector('.text-input-prompt');
          this.inputEl = element.querySelector('.text-input-field');
          this.submitEl = element.querySelector('.text-input-submit');
          const cancel = element.querySelector('.text-input-cancel');
          this.submitEl.textContent = this._data.submitText || node.content?.confirmLabel || '确定';
          cancel.textContent = this._data.cancelText || node.content?.cancelLabel || '取消';
          this.promptEl.textContent = this._data.prompt || '请输入名称';
          this.inputEl.value = this._data.defaultValue || '';
          this.inputEl.placeholder = this._data.placeholder || '';
          this.inputEl.maxLength = Number.isInteger(Number(this._data.maxLength)) && Number(this._data.maxLength) > 0 ? Number(this._data.maxLength) : 24;
          this.required = this._data.required !== false;
          this.inputEl.setAttribute('aria-describedby', `${this.inputEl.id}-validation`);
          element.querySelector('.text-input-validation').id = `${this.inputEl.id}-validation`;
          this.submitEl.onclick = () => this._submit();
          cancel.onclick = () => this._cancel();
          this.inputEl.oninput = () => { this._showValidation(''); this._updateSubmitState(); };
          this.inputEl.onkeydown = event => {
            if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); this._submit(); }
            if (event.key === 'Escape') { event.preventDefault(); this._cancel(); }
          };
          element.onkeydown = event => {
            if (event.key !== 'Tab') return;
            const focusable = [this.inputEl, this.submitEl, cancel].filter(item => !item.disabled);
            const index = focusable.indexOf(element.ownerDocument.activeElement);
            if (event.shiftKey && index <= 0) { event.preventDefault(); focusable.at(-1)?.focus(); }
            else if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0]?.focus(); }
          };
          this._updateSubmitState();
        },
        unmount: ({ element }) => { element.onkeydown = null; },
      },
    };
    this._canonicalHost = createUiRuntimeHost({ container: this.el, dataSources: { 'input.value': this._data.defaultValue ?? '' }, semanticWidgets });
    this._canonicalHost.mount(this._canonicalDocument);
  }
}
