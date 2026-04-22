const CANONICAL_UI_PREFIX = 'ui/';
const LEGACY_DATA_URL_PREFIX = 'data:image/';

export const UI_THEME_ROOT = 'ui.theme';
export const UI_DIALOGUE_BOX_ROOT = 'ui.dialogueBox';
export const UI_SCREEN_CHROME_ROOTS = Object.freeze({
  saveLoadScreen: 'ui.saveLoadScreen.chrome',
  backlogScreen: 'ui.backlogScreen.chrome',
  gameMenu: 'ui.gameMenu.chrome',
  settingsScreen: 'ui.settingsScreen.chrome',
});

export const UI_IMAGE_SCAN_REGISTRY = [];

function trimUiImageValue(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function isCanonicalUiImagePath(value) {
  const candidate = trimUiImageValue(value);
  if (!candidate.startsWith(CANONICAL_UI_PREFIX)) {
    return false;
  }

  if (candidate.startsWith('assets/ui/')) {
    return false;
  }

  if (candidate.startsWith('/')) {
    return false;
  }

  if (/^[a-zA-Z]:[\\/]/.test(candidate)) {
    return false;
  }

  if (candidate.includes('\\')) {
    return false;
  }

  return candidate.length > CANONICAL_UI_PREFIX.length;
}

export function classifyUiImageValue(value) {
  const candidate = trimUiImageValue(value);
  if (!candidate) {
    return 'empty';
  }

  if (isCanonicalUiImagePath(candidate)) {
    return 'canonical';
  }

  if (candidate.startsWith(LEGACY_DATA_URL_PREFIX)) {
    return 'legacy-data-url';
  }

  return 'legacy-path';
}

export function normalizeUiImageSelection(value) {
  const candidate = trimUiImageValue(value);
  return isCanonicalUiImagePath(candidate) ? candidate : null;
}

export function getUiScreenChromeRoot(screenId) {
  return UI_SCREEN_CHROME_ROOTS[screenId] ?? null;
}

export function registerUiImageCollector(collector) {
  if (typeof collector !== 'function') {
    throw new TypeError('UI image collector must be a function');
  }

  UI_IMAGE_SCAN_REGISTRY.push(collector);

  return () => {
    const index = UI_IMAGE_SCAN_REGISTRY.indexOf(collector);
    if (index >= 0) {
      UI_IMAGE_SCAN_REGISTRY.splice(index, 1);
    }
  };
}

export function collectUiImagePaths(script, add, registry = UI_IMAGE_SCAN_REGISTRY) {
  for (const collector of registry) {
    collector(script, add);
  }
}
