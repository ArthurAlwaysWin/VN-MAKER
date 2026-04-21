/**
 * Cinematic contract compatibility helpers
 *
 * Freezes the editor/runtime compatibility rules for cinematic fields so
 * unknown future enum values survive round-trips while current UI/runtime
 * paths degrade safely.
 */

export const DEFAULT_PAGE_CAMERA = null;
export const DEFAULT_CHARACTER_ANIMATION = 'none';

const KNOWN_TRANSITION_OPTIONS = [
  { value: 'fade', label: '淡入淡出', known: true },
  { value: 'slide-left', label: '左滑入', known: true },
  { value: 'slide-right', label: '右滑入', known: true },
  { value: 'none', label: '无', known: true },
];

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
  return isKnownTransitionType(type) ? type : 'fade';
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
