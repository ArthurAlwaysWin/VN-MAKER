/**
 * SettingsScreen — Renders game settings UI.
 *
 * Supports three modes:
 *  - Custom layout: renders elements from ui.settingsScreen JSON at absolute positions
 *  - Structured layout: auto-renders SETTING_DEFS grouped into tabs (header/tabBar/contentArea)
 *  - Default layout: built-in settings page (fallback when no custom layout exists)
 */
import { SETTING_DEFS, DEFAULT_SETTING_STYLE, DEFAULT_LABEL_STYLE, DEFAULT_BUTTON_STYLE } from '../engine/settingDefs.js';
import { sanitizeCssValue, clampField } from './sanitize.js';
import { resolvePath } from '../engine/assetPath.js';
import { deepMergeWidgetStyles } from '../engine/widgetDefaults.js';
import { createToggle } from './widgets/ToggleWidget.js';
import { createSlider, getSliderCSS } from './widgets/SliderWidget.js';
import { createTabBar } from './widgets/TabWidget.js';

// ─── Structured Mode Constants ───────────────────────────

/** Setting keys grouped by tab (index-ordered) */
const SETTING_GROUP_KEYS = [
  ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'],   // Tab 0: 声音
  ['dialogue-opacity', 'window-mode'],                              // Tab 1: 画面
  ['text-speed', 'auto-speed', 'skip-mode'],                       // Tab 2: 游戏
];

/** Default tab labels when layout.tabBar.tabs is not specified */
const DEFAULT_TAB_LABELS = ['声音', '画面', '游戏'];

/**
 * Normalize tabBar.tabs input to a uniform `{label, icon?, settingKeys?}[]` format.
 * Returns null when input is absent (signals "use defaults").
 * @param {*} rawTabs — undefined, string[], or {label,icon?,settingKeys?}[]
 * @returns {{label:string, icon?:string, settingKeys?:string[]}[] | null}
 */
export function normalizeTabs(rawTabs) {
  if (!Array.isArray(rawTabs) || rawTabs.length === 0) return null;
  if (typeof rawTabs[0] === 'string') {
    return rawTabs.map(s => ({ label: String(s) }));
  }
  return rawTabs;
}

/**
 * Resolve each tab's settingKeys — fall back to SETTING_GROUP_KEYS, append
 * unassigned SETTING_DEFS keys to the last tab, and strip cross-tab duplicates.
 * @param {{label:string, icon?:string, settingKeys?:string[]}[]} tabs
 * @returns {{label:string, icon?:string, settingKeys:string[]}[]}
 */
export function resolveTabSettingKeys(tabs) {
  const allKeys = Object.keys(SETTING_DEFS);
  const seen = new Set();
  const resolved = tabs.map((tab, idx) => {
    const raw = Array.isArray(tab.settingKeys)
      ? tab.settingKeys
      : (SETTING_GROUP_KEYS[idx] || []);
    const unique = raw.filter(k => {
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return { label: tab.label, icon: tab.icon, settingKeys: unique };
  });
  // Append unassigned keys to the last tab
  const unassigned = allKeys.filter(k => !seen.has(k));
  if (unassigned.length > 0 && resolved.length > 0) {
    resolved[resolved.length - 1].settingKeys.push(...unassigned);
  }
  return resolved;
}

export class SettingsScreen {
  /**
   * @param {HTMLElement} container
   * @param {import('../engine/ConfigManager.js').ConfigManager} configManager
   */
  constructor(container, configManager) {
    this.container = container;
    this.configManager = configManager;
    this.customLayout = null;
    /** @type {object|null} Merged widgetStyles config, null = use legacy rendering */
    this._widgetStyles = null;
    this._sliderCssInjected = false;
    /** @type {number} Active tab index for structured mode */
    this._activeTab = 0;

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
    if (this.isVisible) this.show();
  }

  /**
   * Set widget styles configuration. When non-null, controls render using
   * new widget renderers (SliderWidget, ToggleWidget). When null, legacy
   * rendering is preserved for backward compatibility (COMPAT-01).
   *
   * @param {object|null} styles — raw widgetStyles from script.json, or null
   */
  setWidgetStyles(styles) {
    this._widgetStyles = styles ? deepMergeWidgetStyles(styles) : null;
    if (this.isVisible) this.show();
  }

  show() {
    // Inject slider CSS once when widget styles are active
    if (this._widgetStyles && !this._sliderCssInjected) {
      const styleEl = document.createElement('style');
      styleEl.id = 'gm-slider-styles';
      styleEl.textContent = getSliderCSS();
      document.head.appendChild(styleEl);
      this._sliderCssInjected = true;
    }

    if (this.customLayout?.elements?.length > 0) {
      this._renderCustom(this.customLayout);
    } else if (this.customLayout?.header || this.customLayout?.tabBar || this.customLayout?.contentArea) {
      this._renderStructured(this.customLayout);
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
        bgLayer.style.backgroundImage = `url("${resolvePath(safeBg)}")`;
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

  _buildSlider(wrapper, def, cfg, style, showValueLabel = true) {
    if (this._widgetStyles) {
      // New widget-based slider
      const sliderConfig = this._widgetStyles.slider;
      let valueEl = null;
      const { el, setValue } = createSlider(
        sliderConfig,
        cfg.get(def.settingKey),
        def.min,
        def.max,
        def.step,
        (v) => {
          cfg.set(def.settingKey, v);
          if (valueEl) valueEl.textContent = this._formatValue(def, v);
          this._notifyChange();
        }
      );
      if (showValueLabel) {
        valueEl = document.createElement('span');
        valueEl.classList.add('sc-setting-value');
        this._applyTextStyle(valueEl, style.labelColor, style.fontSize, style.fontFamily);
        valueEl.textContent = this._formatValue(def, cfg.get(def.settingKey));
      }
      wrapper.appendChild(el);
      if (valueEl) wrapper.appendChild(valueEl);
      return;
    }
    // Legacy slider (COMPAT-01: preserved exactly)
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

    let valueEl = null;
    if (showValueLabel) {
      valueEl = document.createElement('span');
      valueEl.classList.add('sc-setting-value');
      this._applyTextStyle(valueEl, style.labelColor, style.fontSize, style.fontFamily);
      valueEl.textContent = this._formatValue(def, cfg.get(def.settingKey));
    }

    control.addEventListener('input', () => {
      const v = Number(control.value);
      cfg.set(def.settingKey, v);
      if (valueEl) valueEl.textContent = this._formatValue(def, v);
      this._notifyChange();
    });

    wrapper.appendChild(control);
    if (valueEl) wrapper.appendChild(valueEl);
  }

  _buildToggle(wrapper, def, cfg, style) {
    if (this._widgetStyles) {
      // New widget-based toggle
      const toggleConfig = this._widgetStyles.toggle;
      const { el } = createToggle(
        def.settingKey,
        toggleConfig,
        !!cfg.get(def.settingKey),
        (newVal) => {
          cfg.set(def.settingKey, newVal);
          this._notifyChange();
        }
      );
      wrapper.appendChild(el);
      return;
    }
    // Legacy toggle (COMPAT-01: preserved exactly)
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
        img.src = resolvePath(safeSrc);
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

  // ── Structured layout rendering ───────────────────────

  /**
   * Render structured mode: header + tab bar + content area + footer.
   * Activated when elements[] is empty but header/tabBar/contentArea exist.
   *
   * @param {object} layout — customLayout with header/tabBar/contentArea/footer
   * @private
   */
  _renderStructured(layout) {
    this.el.innerHTML = '';
    this.el.classList.remove('settings-custom');
    this.el.classList.add('settings-structured');
    this.el.style.backgroundImage = '';
    this.el.style.backgroundColor = '';

    const tabPosition = (layout.tabBar?.position === 'left') ? 'left' : 'top';

    // ── Panel background (DECOR-03) ─────────────────────
    const ssCfg = layout.settingsScreen || {};
    if (ssCfg.background) {
      const safePanelBg = sanitizeCssValue(ssCfg.background);
      if (safePanelBg) {
        const bgDiv = document.createElement('div');
        bgDiv.className = 'settings-panel-bg';
        bgDiv.style.position = 'absolute';
        bgDiv.style.inset = '0';
        bgDiv.style.zIndex = '0';
        bgDiv.style.backgroundImage = `url("${resolvePath(safePanelBg)}")`;
        bgDiv.style.backgroundSize = 'cover';
        bgDiv.style.backgroundPosition = 'center';
        bgDiv.style.pointerEvents = 'none';
        const opacity = clampField('scale', ssCfg.backgroundOpacity) ?? 1;
        bgDiv.style.opacity = String(opacity);
        this.el.appendChild(bgDiv);
      }
    }

    // ── Header ──────────────────────────────────────────
    const hdr = layout.header || {};
    const header = document.createElement('div');
    header.className = 'settings-structured-header';
    const hdrHeight = clampField('height', hdr.height) || 90;
    header.style.height = hdrHeight + 'px';
    header.style.position = 'relative';

    if (hdr.backgroundImage) {
      const safeBg = sanitizeCssValue(hdr.backgroundImage);
      if (safeBg) {
        header.style.backgroundImage = `url("${resolvePath(safeBg)}")`;
        header.style.backgroundSize = 'cover';
        header.style.backgroundPosition = 'center';
      }
    }

    // Title
    const title = document.createElement('div');
    title.className = 'settings-structured-title';
    title.textContent = hdr.title?.text || '系统设定';
    const titleStyle = hdr.title || {};
    this._applyTextStyle(
      title,
      titleStyle.color || '#fff',
      titleStyle.fontSize || 28,
      titleStyle.fontFamily
    );
    const tx = clampField('x', titleStyle.x);
    const ty = clampField('y', titleStyle.y);
    title.style.position = 'absolute';
    if (tx !== undefined) title.style.left = tx + 'px';
    if (ty !== undefined) title.style.top = ty + 'px';
    title.style.zIndex = '2';
    header.appendChild(title);

    // Header decorations (DECOR-01)
    if (Array.isArray(hdr.decorations)) {
      for (const deco of hdr.decorations) {
        if (!deco.src) continue;
        const safeSrc = sanitizeCssValue(deco.src);
        if (!safeSrc) continue;
        const img = document.createElement('img');
        img.className = 'settings-decoration';
        img.src = resolvePath(safeSrc);
        img.style.position = 'absolute';
        img.style.zIndex = '1';
        const dx = clampField('x', deco.x);
        const dy = clampField('y', deco.y);
        const dw = clampField('width', deco.width);
        const dh = clampField('height', deco.height);
        if (dx !== undefined) img.style.left = dx + 'px';
        if (dy !== undefined) img.style.top = dy + 'px';
        if (dw !== undefined) img.style.width = dw + 'px';
        if (dh !== undefined) img.style.height = dh + 'px';
        img.style.pointerEvents = 'none';
        header.appendChild(img);
      }
    }

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'settings-structured-close';
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.right = '16px';
    closeBtn.style.top = '50%';
    closeBtn.style.transform = 'translateY(-50%)';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.fontSize = '28px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.zIndex = '2';
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);

    this.el.appendChild(header);

    // ── Tab bar / Sidebar ───────────────────────────────
    const tabCfg = layout.tabBar || {};
    const normalized = normalizeTabs(tabCfg.tabs);
    const resolvedTabs = normalized
      ? resolveTabSettingKeys(normalized)
      : DEFAULT_TAB_LABELS.map((label, i) => ({ label, settingKeys: SETTING_GROUP_KEYS[i] }));
    this._resolvedTabs = resolvedTabs;

    // ── Content area ────────────────────────────────────
    const areaCfg = layout.contentArea || {};
    const contentWrap = document.createElement('div');
    contentWrap.className = 'settings-structured-content';
    contentWrap.style.overflowY = 'auto';
    contentWrap.style.zIndex = '1';

    // ── Footer ──────────────────────────────────────────
    let footer = null;
    if (layout.footer?.buttons?.length) {
      footer = document.createElement('div');
      footer.className = 'settings-structured-footer';
      footer.style.position = 'relative';
      footer.style.height = (clampField('height', layout.footer.height) || 60) + 'px';

      for (const btnCfg of layout.footer.buttons) {
        const btn = document.createElement('button');
        btn.className = 'settings-structured-footer-btn';
        btn.textContent = btnCfg.text || '';
        btn.style.position = 'absolute';
        const bx = clampField('x', btnCfg.x);
        const by = clampField('y', btnCfg.y);
        if (bx !== undefined) btn.style.left = bx + 'px';
        if (by !== undefined) btn.style.top = by + 'px';
        btn.style.background = 'none';
        btn.style.border = 'none';
        btn.style.color = '#fff';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '16px';

        btn.addEventListener('click', () => {
          const action = btnCfg.action || '';
          if (action === 'title' && this.onTitle) {
            this.onTitle();
          } else if (action === 'reset') {
            this.configManager.reset();
            this._notifyChange();
            this._renderStructuredContent(layout);
          } else if (action === 'close') {
            this.hide();
          } else if (btnCfg.id && btnCfg.id.includes('title') && this.onTitle) {
            this.onTitle();
          } else {
            this.hide();
          }
        });

        footer.appendChild(btn);
      }
    }

    // ── Layout assembly ─────────────────────────────────
    if (tabPosition === 'left') {
      // Left-tab sidebar layout (STRUCT-06)
      const outer = document.createElement('div');
      outer.className = 'settings-structured-outer';
      outer.style.display = 'flex';
      outer.style.flexDirection = 'row';
      outer.style.height = '100%';

      // Sidebar with tab buttons
      const sidebar = document.createElement('div');
      sidebar.className = 'settings-structured-sidebar';
      const sidebarW = clampField('width', tabCfg.width) || 180;
      sidebar.style.width = sidebarW + 'px';
      sidebar.style.flexShrink = '0';
      sidebar.style.display = 'flex';
      sidebar.style.flexDirection = 'column';
      sidebar.style.gap = '4px';
      sidebar.style.padding = '12px 8px';
      const safeSideBg = sanitizeCssValue(tabCfg.background);
      if (safeSideBg) sidebar.style.background = safeSideBg;

      resolvedTabs.forEach((tab, i) => {
        const btn = document.createElement('button');
        btn.className = `settings-tab-btn${i === this._activeTab ? ' active' : ''}`;
        btn.style.width = '100%';
        btn.style.textAlign = 'left';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '8px';
        btn.style.padding = '10px 12px';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '15px';
        btn.style.borderRadius = '4px';
        btn.style.background = i === this._activeTab ? 'rgba(255,255,255,0.12)' : 'none';
        btn.style.color = i === this._activeTab ? '#fff' : 'rgba(255,255,255,0.5)';

        if (tab.icon) {
          const img = document.createElement('img');
          img.src = resolvePath(tab.icon);
          img.width = 24;
          img.height = 24;
          img.style.objectFit = 'contain';
          img.alt = '';
          btn.appendChild(img);
          const span = document.createElement('span');
          span.textContent = tab.label;
          btn.appendChild(span);
        } else {
          const span = document.createElement('span');
          span.textContent = tab.label;
          btn.appendChild(span);
        }

        btn.addEventListener('click', () => {
          this._activeTab = i;
          this._renderStructured(layout);
        });
        sidebar.appendChild(btn);
      });

      // Right column: header + content + footer
      const right = document.createElement('div');
      right.className = 'settings-structured-right';
      right.style.flex = '1';
      right.style.display = 'flex';
      right.style.flexDirection = 'column';
      right.style.overflow = 'hidden';
      right.style.position = 'relative';

      right.appendChild(header);

      // Content in left-mode uses flow positioning (not absolute)
      contentWrap.style.position = 'relative';
      contentWrap.style.flex = '1';
      right.appendChild(contentWrap);

      if (footer) right.appendChild(footer);

      outer.appendChild(sidebar);
      outer.appendChild(right);
      this.el.appendChild(outer);
    } else {
      // Top-tab horizontal layout (default)
      this.el.appendChild(header);

      const tabContainer = document.createElement('div');
      tabContainer.className = 'settings-structured-tab-bar';
      const tabY = clampField('y', tabCfg.y);
      const tabH = clampField('height', tabCfg.height) || 56;
      tabContainer.style.height = tabH + 'px';
      if (tabY !== undefined) tabContainer.style.marginTop = '0';
      const safeBg = sanitizeCssValue(tabCfg.background);
      if (safeBg) tabContainer.style.background = safeBg;
      tabContainer.style.display = 'flex';
      tabContainer.style.alignItems = 'center';

      if (this._widgetStyles) {
        const { el: tabEl, setActive } = createTabBar(
          resolvedTabs,
          this._widgetStyles.tab,
          (index) => {
            this._activeTab = index;
            this._renderStructuredContent(layout);
          }
        );
        this._tabSetActive = setActive;
        tabContainer.appendChild(tabEl);
      } else {
        resolvedTabs.forEach((tab, i) => {
          const btn = document.createElement('button');
          btn.className = `settings-tab-btn${i === this._activeTab ? ' active' : ''}`;

          if (tab.icon) {
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.gap = '6px';
            const img = document.createElement('img');
            img.src = resolvePath(tab.icon);
            img.width = 24;
            img.height = 24;
            img.style.objectFit = 'contain';
            img.alt = '';
            btn.appendChild(img);
            const span = document.createElement('span');
            span.textContent = tab.label;
            btn.appendChild(span);
          } else {
            btn.textContent = tab.label;
          }

          btn.style.background = 'none';
          btn.style.border = 'none';
          btn.style.color = i === this._activeTab ? '#fff' : 'rgba(255,255,255,0.5)';
          btn.style.cursor = 'pointer';
          btn.style.padding = '8px 20px';
          btn.style.fontSize = '16px';
          btn.addEventListener('click', () => {
            this._activeTab = i;
            tabContainer.querySelectorAll('.settings-tab-btn').forEach((b, idx) => {
              b.classList.toggle('active', idx === i);
              b.style.color = idx === i ? '#fff' : 'rgba(255,255,255,0.5)';
            });
            this._renderStructuredContent(layout);
          });
          tabContainer.appendChild(btn);
        });
      }

      this.el.appendChild(tabContainer);

      // Content in top-mode uses absolute positioning
      contentWrap.style.position = 'absolute';
      const cx = clampField('x', areaCfg.x) || 40;
      const cy = clampField('y', areaCfg.y) || 160;
      const cw = clampField('width', areaCfg.width) || 1200;
      const ch = clampField('height', areaCfg.height) || 500;
      contentWrap.style.left = cx + 'px';
      contentWrap.style.top = cy + 'px';
      contentWrap.style.width = cw + 'px';
      contentWrap.style.height = ch + 'px';
      this.el.appendChild(contentWrap);

      if (footer) this.el.appendChild(footer);
    }

    // Populate tab content
    this._renderStructuredContent(layout);
  }

  /**
   * Render setting items for the active tab in the structured content area.
   * Called on initial render and on each tab switch.
   *
   * @param {object} layout — customLayout reference for positioning
   * @private
   */
  _renderStructuredContent(layout) {
    const container = this.el.querySelector('.settings-structured-content');
    if (!container) return;
    container.innerHTML = '';

    const groupKeys = this._resolvedTabs?.[this._activeTab]?.settingKeys
      || SETTING_GROUP_KEYS[this._activeTab];
    if (!groupKeys) return;

    const cfg = this.configManager;

    // ── Grid + row style config ──────────────────────────
    const areaCfg = layout.contentArea || {};
    const columns = areaCfg.columns === 2 ? 2 : 1;
    const itemStyle = areaCfg.itemStyle || {};
    const showDividers = itemStyle.showDividers === true;
    const alternateBackground = itemStyle.alternateBackground === true;
    const labelPosition = itemStyle.labelPosition === 'top' ? 'top' : 'left';
    const labelWidth = clampField('width', itemStyle.labelWidth) || 140;
    const showValueLabel = itemStyle.showValueLabel !== false;

    // ── Container layout ─────────────────────────────────
    if (columns === 2) {
      container.style.display = 'grid';
      container.style.gridTemplateColumns = '1fr 1fr';
      container.style.gap = '12px 24px';
    } else {
      container.style.display = 'block';
      container.style.gridTemplateColumns = '';
      container.style.gap = '';
    }

    // Pre-compute total valid items and last row index
    const totalItems = groupKeys.filter(k => SETTING_DEFS[k]).length;
    const lastRowIndex = Math.floor((totalItems - 1) / columns);
    let itemIndex = 0;

    for (let i = 0; i < groupKeys.length; i++) {
      const key = groupKeys[i];
      const def = SETTING_DEFS[key];
      if (!def) continue;

      const rowIndex = Math.floor(itemIndex / columns);

      const item = document.createElement('div');
      item.className = 'settings-structured-item';
      item.style.display = 'flex';
      item.style.padding = columns === 2 ? '0' : '12px 0';

      // Label position
      if (labelPosition === 'top') {
        item.style.flexDirection = 'column';
        item.style.alignItems = 'stretch';
      } else {
        item.style.flexDirection = 'row';
        item.style.alignItems = 'center';
      }

      // Zebra row background
      if (alternateBackground && rowIndex % 2 === 1) {
        item.style.background = 'rgba(255,255,255,0.04)';
      }

      // Dividers (not on last row)
      if (showDividers && rowIndex < lastRowIndex) {
        item.style.borderBottom = '1px solid rgba(255,255,255,0.15)';
      }

      const label = document.createElement('div');
      label.className = 'settings-structured-label';
      label.textContent = def.label;
      label.style.color = '#fff';
      if (labelPosition === 'left') {
        label.style.minWidth = labelWidth + 'px';
      }
      item.appendChild(label);

      const control = document.createElement('div');
      control.className = 'settings-structured-control';
      control.style.flex = '1';

      if (def.type === 'slider') {
        this._buildSlider(control, def, cfg, DEFAULT_SETTING_STYLE, showValueLabel);
      } else if (def.type === 'toggle') {
        this._buildToggle(control, def, cfg, DEFAULT_SETTING_STYLE);
      } else if (def.type === 'select') {
        this._buildSelect(control, def, cfg, DEFAULT_SETTING_STYLE);
      }

      item.appendChild(control);
      container.appendChild(item);
      itemIndex++;
    }
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
          <span class="settings-label">语音音量</span>
          <input type="range" class="settings-slider" id="s-voice-vol" min="0" max="100" value="${Math.round(cfg.get('voiceVolume') * 100)}" />
          <span class="settings-value" id="s-voice-val">${Math.round(cfg.get('voiceVolume') * 100)}%</span>
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
        <div class="settings-item">
          <span class="settings-label">快进模式</span>
          <div class="sc-segment-group" id="s-skip-mode">
            <button class="sc-segment-btn ${cfg.get('skipMode') === 'all' ? 'active' : ''}" data-value="all">全部跳过</button>
            <button class="sc-segment-btn ${cfg.get('skipMode') === 'readOnly' || !cfg.get('skipMode') ? 'active' : ''}" data-value="readOnly">只跳已读</button>
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

    this._bindSlider('s-voice-vol', 's-voice-val', (v) => {
      cfg.set('voiceVolume', v / 100);
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

    const smGroup = this.el.querySelector('#s-skip-mode');
    smGroup.querySelectorAll('.sc-segment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        smGroup.querySelectorAll('.sc-segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        cfg.set('skipMode', btn.dataset.value);
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
