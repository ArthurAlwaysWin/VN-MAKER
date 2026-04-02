/**
 * Setting Component Registry — defines all preset setting component types.
 *
 * Adding a new setting component requires ONLY a new entry here.
 * The editor palette, canvas renderer, and runtime renderer all read from this registry.
 *
 * Each entry describes:
 *  - type:       'slider' | 'toggle' | 'select' — determines the UI control rendered by the engine
 *  - settingKey: ConfigManager key this component reads/writes
 *  - label:      default display label (user can override per-element)
 *  - min/max/step/default: value constraints (sliders only)
 *
 * @type {Record<string, SettingDef>}
 */
export const SETTING_DEFS = {
  'bgm-volume': {
    type: 'slider',
    settingKey: 'bgmVolume',
    label: 'BGM 音量',
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.5,
  },
  'se-volume': {
    type: 'slider',
    settingKey: 'seVolume',
    label: 'SE 音量',
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.8,
  },
  'voice-volume': {
    type: 'slider',
    settingKey: 'voiceVolume',
    label: '语音音量',
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.8,
  },
  'text-speed': {
    type: 'slider',
    settingKey: 'textSpeed',
    label: '文字速度',
    min: 10,
    max: 100,
    step: 1,
    default: 30,
  },
  'auto-speed': {
    type: 'slider',
    settingKey: 'autoSpeed',
    label: '自动播放速度',
    min: 500,
    max: 5000,
    step: 100,
    default: 2000,
  },
  'window-mode': {
    type: 'select',
    settingKey: 'windowMode',
    label: '窗口模式',
    options: [
      { value: 'windowed', label: '窗口' },
      { value: 'fullscreen', label: '全屏' },
      { value: 'borderless', label: '无边框窗口' },
    ],
    default: 'windowed',
  },
  'dialogue-opacity': {
    type: 'slider',
    settingKey: 'dialogueOpacity',
    label: '对话框透明度',
    min: 0.1,
    max: 1,
    step: 0.01,
    default: 0.8,
  },
  'master-volume': {
    type: 'slider',
    settingKey: 'masterVolume',
    label: '总音量',
    min: 0,
    max: 1,
    step: 0.01,
    default: 1,
  },
};

/**
 * settingsScreen schema:
 *
 * script.json → ui.settingsScreen = {
 *   background: 'backgrounds/settings_bg.png' | null,
 *   elements: SettingsElement[]
 * }
 *
 * Element types:
 *
 *   Setting element (type: 'setting')
 *   ─────────────────────────────────
 *   { id, type: 'setting', settingType: SETTING_DEFS key,
 *     x, y, width, height, label?, style? }
 *
 *   Text label (type: 'label')
 *   ──────────────────────────
 *   { id, type: 'label', x, y, text,
 *     style: { color, fontSize, fontFamily } }
 *
 *   Decorative image (type: 'image')
 *   ─────────────────────────────────
 *   { id, type: 'image', x, y, width, height, src }
 *
 *   Close/return button (type: 'button')
 *   ─────────────────────────────────────
 *   { id, type: 'button', action: 'close',
 *     x, y, width, height, label?, style? }
 */

/** Default style values for setting elements */
export const DEFAULT_SETTING_STYLE = {
  trackColor: '#555555',
  fillColor: '#ff6b9d',
  thumbColor: '#ffffff',
  labelColor: '#ffffff',
  fontSize: 16,
  fontFamily: 'sans-serif',
};

/** Default style values for text labels */
export const DEFAULT_LABEL_STYLE = {
  color: '#ffffff',
  fontSize: 24,
  fontFamily: 'sans-serif',
};

/** Default style values for buttons */
export const DEFAULT_BUTTON_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.15)',
  textColor: '#ffffff',
  fontSize: 18,
  fontFamily: 'sans-serif',
  borderRadius: 8,
};

/**
 * Creates an empty settingsScreen data structure.
 * Used when initializing a project or resetting the settings layout.
 */
export function createEmptySettingsScreen() {
  return {
    background: null,
    elements: [],
  };
}

let _idCounter = 0;

/** Generates a unique element ID */
export function generateElementId(type) {
  return `${type}-${Date.now()}-${++_idCounter}`;
}

/**
 * Creates a new setting element with defaults from SETTING_DEFS.
 * @param {string} settingType — key in SETTING_DEFS
 * @param {number} x
 * @param {number} y
 */
export function createSettingElement(settingType, x = 0, y = 0) {
  const def = SETTING_DEFS[settingType];
  if (!def) throw new Error(`Unknown setting type: ${settingType}`);
  return {
    id: generateElementId('setting'),
    type: 'setting',
    settingType,
    x,
    y,
    width: 280,
    height: def.type === 'toggle' ? 36 : 40,
    label: def.label,
    style: { ...DEFAULT_SETTING_STYLE },
  };
}

/** Creates a new text label element */
export function createLabelElement(text = '标题', x = 0, y = 0) {
  return {
    id: generateElementId('label'),
    type: 'label',
    x,
    y,
    text,
    style: { ...DEFAULT_LABEL_STYLE },
  };
}

/** Creates a new decorative image element */
export function createImageElement(src = '', x = 0, y = 0) {
  return {
    id: generateElementId('image'),
    type: 'image',
    x,
    y,
    width: 200,
    height: 200,
    src,
  };
}

/** Creates a close/return button element */
export function createButtonElement(x = 1180, y = 50) {
  return {
    id: generateElementId('button'),
    type: 'button',
    action: 'close',
    x,
    y,
    width: 48,
    height: 48,
    displayMode: 'icon',  // 'icon' = × cross, 'text' = custom label
    label: '返回',
    style: { ...DEFAULT_BUTTON_STYLE },
  };
}
