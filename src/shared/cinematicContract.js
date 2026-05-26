/**
 * Cinematic contract compatibility helpers
 *
 * Freezes the editor/runtime compatibility rules for cinematic fields so
 * unknown future enum values survive round-trips while current UI/runtime
 * paths degrade safely.
 */

import {
  BACKGROUND_TRANSITION_DURATION_SCHEMA,
  CAMERA_EFFECT_DURATION_SCHEMA,
  clampNumericTransitionParam,
  getTransitionCatalogEntry,
  listTransitionCatalog,
} from './transitionCatalog.js';

export const DEFAULT_PAGE_CAMERA = null;
export const DEFAULT_CHARACTER_ANIMATION = 'none';
export const DEFAULT_CAMERA_TRIGGER = 'onEnter';
export const KNOWN_CHARACTER_ANIMATIONS = listTransitionCatalog({ target: 'character', supportedOnly: true })
  .map((entry) => entry.id)
  .filter((id) => id !== DEFAULT_CHARACTER_ANIMATION);

export function isKnownCharacterAnimation(animation) {
  return KNOWN_CHARACTER_ANIMATIONS.includes(animation);
}

const CHARACTER_ANIMATION_LABELS = {
  none: '无',
  'fade-in': '淡入',
  'slide-in-left': '左滑入',
  'slide-in-right': '右滑入',
  shake: '抖动',
  nod: '点头',
  breathe: '呼吸',
  bounce: '弹跳',
};

export const KNOWN_CAMERA_EFFECTS = listTransitionCatalog({ target: 'camera', supportedOnly: true })
  .map((entry) => entry.id);
export const CAMERA_EFFECT_DIRECTION_OPTIONS = {
  shake: ['horizontal', 'vertical', 'both'],
  zoom: null,
  pan: ['left', 'right', 'up', 'down'],
  flash: null,
};

export function isKnownCameraEffect(effect) {
  return KNOWN_CAMERA_EFFECTS.includes(effect);
}

const CAMERA_EFFECT_LABELS = {
  '': '无',
  shake: '震动',
  zoom: '缩放',
  pan: '平移',
  flash: '闪白',
};

const CAMERA_DIRECTION_LABELS = {
  horizontal: '水平',
  vertical: '垂直',
  both: '双向',
  left: '向左',
  right: '向右',
  up: '向上',
  down: '向下',
};

export const CAMERA_INTENSITY_UI_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
];

function appendUnknownUiOption(options, currentValue, labelPrefix) {
  if (typeof currentValue !== 'string' || !currentValue.trim()) {
    return options;
  }

  if (options.some(option => option.value === currentValue)) {
    return options;
  }

  return [
    ...options,
    {
      value: currentValue,
      label: `${labelPrefix}：${currentValue}`,
      known: false,
    },
  ];
}

export function getCharacterAnimationUiOptions(currentAnimation) {
  const options = [
    {
      value: DEFAULT_CHARACTER_ANIMATION,
      label: CHARACTER_ANIMATION_LABELS[DEFAULT_CHARACTER_ANIMATION],
      known: true,
    },
    ...KNOWN_CHARACTER_ANIMATIONS.map(animation => ({
      value: animation,
      label: CHARACTER_ANIMATION_LABELS[animation] || animation,
      known: true,
    })),
  ];

  return appendUnknownUiOption(options, currentAnimation, '未知动画');
}

export function getCameraEffectUiOptions(currentEffect) {
  const options = [
    {
      value: '',
      label: CAMERA_EFFECT_LABELS[''],
      known: true,
    },
    ...KNOWN_CAMERA_EFFECTS.map(effect => ({
      value: effect,
      label: CAMERA_EFFECT_LABELS[effect] || effect,
      known: true,
    })),
  ];

  return appendUnknownUiOption(options, currentEffect, '未知镜头');
}

export function getCameraDirectionUiOptions(effect, currentDirection) {
  const directions = CAMERA_EFFECT_DIRECTION_OPTIONS[effect];
  if (!Array.isArray(directions)) {
    return [];
  }

  const options = directions.map(direction => ({
    value: direction,
    label: CAMERA_DIRECTION_LABELS[direction] || direction,
    known: true,
  }));

  return appendUnknownUiOption(options, currentDirection, '未知方向');
}

const KNOWN_TRANSITION_OPTIONS = listTransitionCatalog({ target: 'background', supportedOnly: true })
  .filter((entry) => entry.editorSupported)
  .map((entry) => ({ value: entry.id, label: entry.label, known: true }));

export const LEGACY_TRANSITION_TYPES = KNOWN_TRANSITION_OPTIONS.map(option => option.value);

export function isKnownTransitionType(type) {
  return LEGACY_TRANSITION_TYPES.includes(type);
}

export function getTransitionUiOption(type) {
  if (isKnownTransitionType(type)) {
    return KNOWN_TRANSITION_OPTIONS.find(option => option.value === type);
  }

  if (typeof type === 'string' && type.trim()) {
    return {
      value: type,
      label: `未知转场：${type}`,
      known: false,
    };
  }

  return KNOWN_TRANSITION_OPTIONS[0];
}

export function getTransitionUiOptions(currentType) {
  const options = [...KNOWN_TRANSITION_OPTIONS];
  const currentOption = getTransitionUiOption(currentType);

  if (!currentOption.known) {
    options.push(currentOption);
  }

  return options;
}

export function getRuntimeTransitionType(type) {
  if (isKnownTransitionType(type)) {
    return type;
  }

  const fallbackId = getTransitionCatalogEntry('background', type)?.fallbackId;
  return isKnownTransitionType(fallbackId) ? fallbackId : 'fade';
}

export function getCharacterAnimationValue(animation) {
  if (typeof animation === 'string' && animation.trim()) {
    return animation;
  }
  return DEFAULT_CHARACTER_ANIMATION;
}

function cloneValue(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

export function getPageCameraContract(camera) {
  if (camera == null) return DEFAULT_PAGE_CAMERA;

  const contract = cloneValue(camera);
  if (!contract || typeof contract !== 'object') {
    return DEFAULT_PAGE_CAMERA;
  }

  contract.trigger = DEFAULT_CAMERA_TRIGGER;
  if (contract.durationMs !== undefined) {
    contract.durationMs = clampNumericTransitionParam(contract.durationMs, CAMERA_EFFECT_DURATION_SCHEMA);
  }

  if (contract.effect === 'zoom' || contract.effect === 'flash') {
    delete contract.direction;
  }

  return contract;
}

export function getPageTransitionContract(transition) {
  if (transition == null) return null;

  const contract = cloneValue(transition);
  if (!contract || typeof contract !== 'object') {
    return {
      type: 'fade',
      duration: BACKGROUND_TRANSITION_DURATION_SCHEMA.default,
    };
  }

  contract.type = typeof contract.type === 'string' && contract.type.trim()
    ? contract.type.trim()
    : 'fade';
  contract.duration = clampNumericTransitionParam(
    contract.duration ?? BACKGROUND_TRANSITION_DURATION_SCHEMA.default,
    BACKGROUND_TRANSITION_DURATION_SCHEMA,
  );
  return contract;
}

export function copyPageCinematicFields(sourcePage, targetPage) {
  if (!sourcePage || !targetPage) return targetPage;

  targetPage.camera = cloneValue(sourcePage.camera ?? DEFAULT_PAGE_CAMERA);
  targetPage.transition = cloneValue(sourcePage.transition) ?? { type: 'fade', duration: 800 };

  if (Array.isArray(targetPage.characters)) {
    targetPage.characters = targetPage.characters.map(char => ({
      ...char,
      animation: getCharacterAnimationValue(char.animation),
    }));
  }

  return targetPage;
}
