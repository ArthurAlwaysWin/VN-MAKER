/**
 * SettingsScreen — Renders game settings UI.
 *
 * Supports two modes:
 *  - Custom layout: renders elements from ui.settingsScreen JSON at absolute positions
 *  - Default layout: built-in settings page (fallback when no custom layout exists)
 */
import { SETTING_DEFS, DEFAULT_SETTING_STYLE, DEFAULT_LABEL_STYLE, DEFAULT_BUTTON_STYLE } from '../engine/settingDefs.js';
import { sanitizeCssValue, clampField } from './sanitize.js';

export class SettingsScreen {
  /**
   * @param {HTMLElement} container
   * @param {import('../engine/ConfigManager.js').ConfigManager} configManager
   */
  constructor(container, configManager) {
    this.container = container;
    this.configManager = configManager;
    this.customLayout = null;

    this.el = document.createElement('div');
    this.el.id = 'settings-screen';
    this.el.classList.add('hidden');
    this.container.appendChild(this.el);

    /** @type {Function|null} Called when any setting value changes */
    this.onChange = null;
  }

  /** Whether the settings overlay is currently showing */
  get isVisible() {
    return this.el.classList.contains('visible');
  }

  /** Load a custom layout from script.json ui.settingsScreen */
  setLayout(layout) {
    this.customLayout = layout;
  }

  show() {
    if (this.customLayout?.elements?.length > 0) {
      this._renderCustom(this.customLayout);
    } else {
      this._renderDefault();
    }
    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));
  }

  hide() {
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
  }

  // ── Custom layout rendering ───────────────────────────

  _renderCustom(layout) {
    this.el.innerHTML = '';
    this.el.classList.add('settings-custom');
    // Clear any previously set inline background styles
    this.el.style.backgroundImage = '';
    this.el.style.backgroundSize = '';
    this.el.style.backgroundPosition = '';

    if (layout.background) {
      const safeBg = sanitizeCssValue(layout.background);
      if (safeBg) {
        // D-05: Custom bg rendered as semi-transparent child layer
        // so game scene is faintly visible through it
        const bgLayer = document.createElement('div');
        bgLayer.className = 'settings-bg-layer';
        bgLayer.style.backgroundImage = `url("asset://${safeBg}")`;
        this.el.appendChild(bgLayer);
        // Make element bg transparent — backdrop-filter still blurs game behind
        this.el.style.backgroundColor = 'transparent';
      }
    } else {
      // No custom bg — reset to CSS default (dark semi-transparent + blur)
      this.el.style.backgroundColor = '';
    }

    for (const elem of layout.elements) {
      switch (elem.type) {
        case 'setting': this._renderSettingElem(elem); break;
        case 'label':   this._renderLabelElem(elem);   break;
        case 'image':   this._renderImageElem(elem);    break;
        case 'button':  this._renderButtonElem(elem);   break;
      }
    }
  }

  _renderSettingElem(elem) {
    const def = SETTING_DEFS[elem.settingType];
    if (!def) return;

    const cfg = this.configManager;
    const style = { ...DEFAULT_SETTING_STYLE, ...(elem.style || {}) };
    const wrapper = this._positioned(elem);
    wrapper.classList.add('sc-setting');

    // Label
    const label = document.createElement('div');
    label.classList.add('sc-setting-label');
    label.textContent = elem.label || def.label;
    this._applyTextStyle(label, style.labelColor, style.fontSize, style.fontFamily);
    wrapper.appendChild(label);

    if (def.type === 'slider') {
      this._buildSlider(wrapper, def, cfg, style);
    } else if (def.type === 'toggle') {
      this._buildToggle(wrapper, def, cfg, style);
    } else if (def.type === 'select') {
      this._buildSelect(wrapper, def, cfg, style);
    }

    this.el.appendChild(wrapper);
  }

  _buildSlider(wrapper, def, cfg, style) {
    const control = document.createElement('input');
    control.type = 'range';
    control.classList.add('sc-slider');
    control.min = def.min;
    control.max = def.max;
    control.step = def.step;
    control.value = cfg.get(def.settingKey);

    const safeFill = sanitizeCssValue(style.fillColor);
    const safeTrack = sanitizeCssValue(style.trackColor);
    const safeThumb = sanitizeCssValue(style.thumbColor);
    if (safeFill) control.style.setProperty('--fill-color', safeFill);
    if (safeTrack) control.style.setProperty('--track-color', safeTrack);
    if (safeThumb) control.style.setProperty('--thumb-color', safeThumb);

    const valueEl = document.createElement('span');
    valueEl.classList.add('sc-setting-value');
    this._applyTextStyle(valueEl, style.labelColor, style.fontSize, style.fontFamily);
    valueEl.textContent = this._formatValue(def, cfg.get(def.settingKey));

    control.addEventListener('input', () => {
      const v = Number(control.value);
      cfg.set(def.settingKey, v);
      valueEl.textContent = this._formatValue(def, v);
      this._notifyChange();
    });

    wrapper.appendChild(control);
    wrapper.appendChild(valueEl);
  }

  _buildToggle(wrapper, def, cfg, style) {
    const toggle = document.createElement('label');
    toggle.classList.add('sc-toggle');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!cfg.get(def.settingKey);
    const track = document.createElement('span');
    track.classList.add('sc-toggle-track');

    const safeFill = sanitizeCssValue(style.fillColor);
    if (safeFill) track.style.setProperty('--toggle-active', safeFill);

    input.addEventListener('change', () => {
      cfg.set(def.settingKey, input.checked);
      this._notifyChange();
    });

    toggle.appendChild(input);
    toggle.appendChild(track);
    wrapper.appendChild(toggle);
  }

  _buildSelect(wrapper, def, cfg, style) {
    const group = document.createElement('div');
    group.classList.add('sc-segment-group');
    const currentVal = cfg.get(def.settingKey) || def.default;

    for (const opt of def.options) {
      const btn = document.createElement('button');
      btn.classList.add('sc-segment-btn');
      if (opt.value === currentVal) btn.classList.add('active');
      btn.textContent = opt.label;
      this._applyTextStyle(btn, style.labelColor, style.fontSize, style.fontFamily);

      btn.addEventListener('click', () => {
        group.querySelectorAll('.sc-segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cfg.set(def.settingKey, opt.value);
        this._notifyChange();
      });

      group.appendChild(btn);
    }
    wrapper.appendChild(group);
  }

  _renderLabelElem(elem) {
    const style = { ...DEFAULT_LABEL_STYLE, ...(elem.style || {}) };
    const wrapper = this._positioned(elem);
    wrapper.classList.add('sc-label');
    wrapper.textContent = elem.text || '';
    this._applyTextStyle(wrapper, style.color, style.fontSize, style.fontFamily);
    this.el.appendChild(wrapper);
  }

  _renderImageElem(elem) {
    const wrapper = this._positioned(elem);
    wrapper.classList.add('sc-image');

    if (elem.src) {
      const safeSrc = sanitizeCssValue(elem.src);
      if (safeSrc) {
        const img = document.createElement('img');
        img.src = `asset://${safeSrc}`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.draggable = false;
        wrapper.appendChild(img);
      }
    }

    this.el.appendChild(wrapper);
  }

  _renderButtonElem(elem) {
    const style = { ...DEFAULT_BUTTON_STYLE, ...(elem.style || {}) };
    const wrapper = this._positioned(elem);
    wrapper.classList.add('sc-button');

    const btn = document.createElement('button');
    if (elem.displayMode === 'icon') {
      btn.textContent = '×';
      btn.classList.add('sc-close-icon');
    } else {
      btn.textContent = elem.label || '返回';
    }
    btn.style.width = '100%';
    btn.style.height = '100%';

    const safeBg = sanitizeCssValue(style.backgroundColor);
    if (safeBg) btn.style.backgroundColor = safeBg;
    this._applyTextStyle(btn, style.textColor, style.fontSize, style.fontFamily);
    const br = clampField('borderRadius', style.borderRadius);
    if (br !== undefined) btn.style.borderRadius = br + 'px';

    btn.addEventListener('click', () => {
      if (elem.action === 'close') this.hide();
    });

    wrapper.appendChild(btn);
    this.el.appendChild(wrapper);
  }

  // ── Custom layout helpers ─────────────────────────────

  _positioned(elem) {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    const x = clampField('x', elem.x);
    const y = clampField('y', elem.y);
    if (x !== undefined) div.style.left = x + 'px';
    if (y !== undefined) div.style.top = y + 'px';
    if (elem.width) {
      const w = clampField('width', elem.width);
      if (w !== undefined) div.style.width = w + 'px';
    }
    if (elem.height) {
      const h = clampField('height', elem.height);
      if (h !== undefined) div.style.height = h + 'px';
    }
    return div;
  }

  _applyTextStyle(el, color, fontSize, fontFamily) {
    const c = sanitizeCssValue(color);
    if (c) el.style.color = c;
    const fs = clampField('fontSize', fontSize);
    if (fs) el.style.fontSize = fs + 'px';
    const ff = sanitizeCssValue(fontFamily);
    if (ff) el.style.fontFamily = ff;
  }

  _formatValue(def, value) {
    if (def.settingKey === 'textSpeed') return String(this._msToSpeed(value));
    if (def.settingKey === 'autoSpeed') return (value / 1000).toFixed(1) + 's';
    if (def.max <= 1) return Math.round(value * 100) + '%';
    return String(value);
  }

  // ── Default layout (fallback) ─────────────────────────

  _renderDefault() {
    this.el.classList.remove('settings-custom');
    this.el.style.backgroundImage = '';
    this.el.style.backgroundColor = '';
    const cfg = this.configManager;

    this.el.innerHTML = `
      <div class="settings-header">
        <div class="settings-title">设 定</div>
        <button class="settings-close">返回</button>
      </div>
      <div class="settings-content">
        <div class="settings-item">
          <span class="settings-label">总音量</span>
          <input type="range" class="settings-slider" id="s-master-vol" min="0" max="100" value="${Math.round(cfg.get('masterVolume') * 100)}" />
          <span class="settings-value" id="s-master-val">${Math.round(cfg.get('masterVolume') * 100)}%</span>
        </div>
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
        <div class="settings-item">
          <span class="settings-label">对话框透明度</span>
          <input type="range" class="settings-slider" id="s-dlg-opacity" min="10" max="100" value="${Math.round(cfg.get('dialogueOpacity') * 100)}" />
          <span class="settings-value" id="s-dlg-val">${Math.round(cfg.get('dialogueOpacity') * 100)}%</span>
        </div>
        <div class="settings-item">
          <span class="settings-label">窗口模式</span>
          <div class="sc-segment-group" id="s-window-mode">
            <button class="sc-segment-btn ${cfg.get('windowMode') === 'windowed' || !cfg.get('windowMode') ? 'active' : ''}" data-value="windowed">窗口</button>
            <button class="sc-segment-btn ${cfg.get('windowMode') === 'fullscreen' ? 'active' : ''}" data-value="fullscreen">全屏</button>
            <button class="sc-segment-btn ${cfg.get('windowMode') === 'borderless' ? 'active' : ''}" data-value="borderless">无边框窗口</button>
          </div>
        </div>
      </div>
    `;

    this.el.querySelector('.settings-close').addEventListener('click', () => this.hide());

    this._bindSlider('s-master-vol', 's-master-val', (v) => {
      cfg.set('masterVolume', v / 100);
      this._notifyChange();
      return `${Math.round(v)}%`;
    });

    this._bindSlider('s-bgm-vol', 's-bgm-val', (v) => {
      cfg.set('bgmVolume', v / 100);
      this._notifyChange();
      return `${Math.round(v)}%`;
    });

    this._bindSlider('s-se-vol', 's-se-val', (v) => {
      cfg.set('seVolume', v / 100);
      this._notifyChange();
      return `${Math.round(v)}%`;
    });

    this._bindSlider('s-text-speed', 's-text-val', (v) => {
      cfg.set('textSpeed', this._speedToMs(v));
      this._notifyChange();
      return `${v}`;
    });

    this._bindSlider('s-auto-speed', 's-auto-val', (v) => {
      cfg.set('autoSpeed', v);
      this._notifyChange();
      return `${(v / 1000).toFixed(1)}s`;
    });

    this._bindSlider('s-dlg-opacity', 's-dlg-val', (v) => {
      cfg.set('dialogueOpacity', v / 100);
      this._notifyChange();
      return `${Math.round(v)}%`;
    });

    const wmGroup = this.el.querySelector('#s-window-mode');
    wmGroup.querySelectorAll('.sc-segment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        wmGroup.querySelectorAll('.sc-segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cfg.set('windowMode', btn.dataset.value);
        this._notifyChange();
      });
    });
  }

  // ── Shared utilities ──────────────────────────────────

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

  _speedToMs(speed) {
    return Math.round(90 - speed * 8);
  }

  _msToSpeed(ms) {
    return Math.max(1, Math.min(10, Math.round((90 - ms) / 8)));
  }
}
