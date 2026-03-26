/**
 * SettingsScreen — UI for adjusting game settings
 */
export class SettingsScreen {
  /**
   * @param {HTMLElement} container
   * @param {import('../engine/ConfigManager.js').ConfigManager} configManager
   */
  constructor(container, configManager) {
    this.container = container;
    this.configManager = configManager;

    this.el = document.createElement('div');
    this.el.id = 'settings-screen';
    this.el.classList.add('hidden');
    this.container.appendChild(this.el);

    /** @type {Function|null} Called when settings change */
    this.onChange = null;
  }

  show() {
    this._render();
    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));
  }

  hide() {
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
  }

  _render() {
    const cfg = this.configManager;

    this.el.innerHTML = `
      <div class="settings-header">
        <div class="settings-title">设 定</div>
        <button class="settings-close">返回</button>
      </div>
      <div class="settings-content">
        <div class="settings-item">
          <span class="settings-label">BGM 音量</span>
          <input type="range" class="settings-slider" id="s-bgm-vol" min="0" max="100" value="${Math.round(cfg.get('bgmVolume') * 100)}" />
          <span class="settings-value" id="s-bgm-val">${Math.round(cfg.get('bgmVolume') * 100)}%</span>
        </div>
        <div class="settings-item">
          <span class="settings-label">SE 音量</span>
          <input type="range" class="settings-slider" id="s-se-vol" min="0" max="100" value="${Math.round(cfg.get('seVolume') * 100)}" />
          <span class="settings-value" id="s-se-val">${Math.round(cfg.get('seVolume') * 100)}%</span>
        </div>
        <div class="settings-item">
          <span class="settings-label">文字速度</span>
          <input type="range" class="settings-slider" id="s-text-speed" min="1" max="10" value="${this._msToSpeed(cfg.get('textSpeed'))}" />
          <span class="settings-value" id="s-text-val">${this._msToSpeed(cfg.get('textSpeed'))}</span>
        </div>
        <div class="settings-item">
          <span class="settings-label">Auto 等待</span>
          <input type="range" class="settings-slider" id="s-auto-speed" min="500" max="5000" step="100" value="${cfg.get('autoSpeed')}" />
          <span class="settings-value" id="s-auto-val">${(cfg.get('autoSpeed') / 1000).toFixed(1)}s</span>
        </div>
      </div>
    `;

    this.el.querySelector('.settings-close').addEventListener('click', () => this.hide());

    // BGM volume
    this._bindSlider('s-bgm-vol', 's-bgm-val', (v) => {
      cfg.set('bgmVolume', v / 100);
      this._notifyChange();
      return `${Math.round(v)}%`;
    });

    // SE volume
    this._bindSlider('s-se-vol', 's-se-val', (v) => {
      cfg.set('seVolume', v / 100);
      this._notifyChange();
      return `${Math.round(v)}%`;
    });

    // Text speed (slider 1=slowest, 10=fastest → internally 82ms ~ 10ms per char)
    this._bindSlider('s-text-speed', 's-text-val', (v) => {
      cfg.set('textSpeed', this._speedToMs(v));
      this._notifyChange();
      return `${v}`;
    });

    // Auto speed
    this._bindSlider('s-auto-speed', 's-auto-val', (v) => {
      cfg.set('autoSpeed', v);
      this._notifyChange();
      return `${(v / 1000).toFixed(1)}s`;
    });
  }

  _bindSlider(sliderId, valueId, handler) {
    const slider = this.el.querySelector(`#${sliderId}`);
    const valEl = this.el.querySelector(`#${valueId}`);
    slider.addEventListener('input', () => {
      valEl.textContent = handler(Number(slider.value));
    });
  }

  _notifyChange() {
    if (this.onChange) this.onChange(this.configManager.config);
  }

  // Slider 1–10 → ms per char (82ms slowest, 10ms fastest)
  _speedToMs(speed) {
    return Math.round(90 - speed * 8);
  }

  // ms per char → slider 1–10
  _msToSpeed(ms) {
    return Math.max(1, Math.min(10, Math.round((90 - ms) / 8)));
  }
}
