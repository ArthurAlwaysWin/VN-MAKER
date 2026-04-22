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

function addCanonicalUiImage(add, value) {
  const normalized = normalizeUiImageSelection(value);
  if (normalized) {
    add(normalized);
  }
}

function collectThemeUiImages(script, add) {
  const definitions = script?.ui?.theme?.nineSlice;
  if (!definitions || typeof definitions !== 'object') {
    return;
  }

  for (const config of Object.values(definitions)) {
    if (!config || typeof config !== 'object') {
      continue;
    }

    addCanonicalUiImage(add, config.src);
    addCanonicalUiImage(add, config.states?.hover?.src);
    addCanonicalUiImage(add, config.states?.active?.src);
  }
}

function collectScreenChromeUiImages(script, add) {
  const saveLoad = script?.ui?.saveLoadScreen;
  addCanonicalUiImage(add, saveLoad?.background);
  addCanonicalUiImage(add, saveLoad?.header?.backgroundImage);
  addCanonicalUiImage(add, saveLoad?.slot?.backgroundImage);

  const backlog = script?.ui?.backlogScreen;
  addCanonicalUiImage(add, backlog?.backgroundImage);
  addCanonicalUiImage(add, backlog?.header?.backgroundImage);

  const gameMenu = script?.ui?.gameMenu;
  addCanonicalUiImage(add, gameMenu?.backgroundImage);
  for (const button of Object.values(gameMenu?.buttons || {})) {
    addCanonicalUiImage(add, button?.icon);
  }

  const settings = script?.ui?.settingsScreen;
  addCanonicalUiImage(add, settings?.background);
  addCanonicalUiImage(add, settings?.header?.backgroundImage);
  for (const decoration of settings?.header?.decorations || []) {
    addCanonicalUiImage(add, decoration?.src);
  }
  for (const tab of settings?.tabBar?.tabs || []) {
    addCanonicalUiImage(add, tab?.icon);
  }
}

function collectWidgetStyleUiImages(script, add) {
  const widgetStyles = script?.ui?.widgetStyles;
  addCanonicalUiImage(add, widgetStyles?.tab?.activeBackgroundImage);
  addCanonicalUiImage(add, widgetStyles?.tab?.nineSlice?.src);
  addCanonicalUiImage(add, widgetStyles?.panel?.backgroundImage);
  addCanonicalUiImage(add, widgetStyles?.panel?.nineSlice?.src);
  addCanonicalUiImage(add, widgetStyles?.slider?.thumbImage);
  addCanonicalUiImage(add, widgetStyles?.slider?.trackImage);
  addCanonicalUiImage(add, widgetStyles?.button?.nineSlice?.src);
}

export const UI_IMAGE_SCAN_REGISTRY = [
  collectThemeUiImages,
  collectScreenChromeUiImages,
  collectWidgetStyleUiImages,
];

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
