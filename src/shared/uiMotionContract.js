export const UI_MOTION_INTENSITIES = Object.freeze(['off', 'subtle', 'standard', 'dramatic']);

export const UI_MOTION_PRESETS = Object.freeze({
  title: Object.freeze(['none', 'soft-rise', 'cinematic-slow', 'glow-pulse']),
  dialogue: Object.freeze(['none', 'soft-pop', 'slide-up', 'glass-fade']),
  choices: Object.freeze(['none', 'stagger-rise', 'card-pop', 'suspense-delay']),
  menus: Object.freeze(['none', 'panel-fade', 'panel-slide', 'sidebar-sweep']),
});

export const DEFAULT_UI_MOTION = Object.freeze({
  intensity: 'standard',
  title: 'soft-rise',
  dialogue: 'soft-pop',
  choices: 'stagger-rise',
  menus: 'panel-fade',
});

export const UI_MOTION_FIELD_SCHEMA = Object.freeze({
  intensity: Object.freeze({
    label: '动效强度',
    options: UI_MOTION_INTENSITIES,
    default: DEFAULT_UI_MOTION.intensity,
  }),
  title: Object.freeze({
    label: '标题页动效',
    options: UI_MOTION_PRESETS.title,
    default: DEFAULT_UI_MOTION.title,
  }),
  dialogue: Object.freeze({
    label: '对话框动效',
    options: UI_MOTION_PRESETS.dialogue,
    default: DEFAULT_UI_MOTION.dialogue,
  }),
  choices: Object.freeze({
    label: '选项动效',
    options: UI_MOTION_PRESETS.choices,
    default: DEFAULT_UI_MOTION.choices,
  }),
  menus: Object.freeze({
    label: '菜单动效',
    options: UI_MOTION_PRESETS.menus,
    default: DEFAULT_UI_MOTION.menus,
  }),
});

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeEnumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export function isKnownUiMotionIntensity(value) {
  return UI_MOTION_INTENSITIES.includes(value);
}

export function isKnownUiMotionPreset(field, value) {
  return UI_MOTION_PRESETS[field]?.includes(value) ?? false;
}

export function normalizeUiMotion(config = {}) {
  if (config == null) {
    return { ...DEFAULT_UI_MOTION };
  }

  if (!isPlainObject(config)) {
    return { ...DEFAULT_UI_MOTION };
  }

  return {
    intensity: normalizeEnumValue(config.intensity, UI_MOTION_INTENSITIES, DEFAULT_UI_MOTION.intensity),
    title: normalizeEnumValue(config.title, UI_MOTION_PRESETS.title, DEFAULT_UI_MOTION.title),
    dialogue: normalizeEnumValue(config.dialogue, UI_MOTION_PRESETS.dialogue, DEFAULT_UI_MOTION.dialogue),
    choices: normalizeEnumValue(config.choices, UI_MOTION_PRESETS.choices, DEFAULT_UI_MOTION.choices),
    menus: normalizeEnumValue(config.menus, UI_MOTION_PRESETS.menus, DEFAULT_UI_MOTION.menus),
  };
}

export function getUiMotionClassNames(config = {}) {
  const motion = normalizeUiMotion(config);
  return [
    `gm-motion-intensity-${motion.intensity}`,
    `gm-motion-title-${motion.title}`,
    `gm-motion-dialogue-${motion.dialogue}`,
    `gm-motion-choices-${motion.choices}`,
    `gm-motion-menus-${motion.menus}`,
  ];
}
