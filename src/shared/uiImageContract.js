const CANONICAL_UI_PREFIX = 'ui/';
const LEGACY_DATA_URL_PREFIX = 'data:image/';

export const UI_THEME_ROOT = 'ui.theme';
export const UI_DIALOGUE_BOX_ROOT = 'ui.dialogueBox';
export const UI_CURSOR_ROOT = 'ui.theme.cursor';
export const UI_ICON_ROOT = 'ui.theme.icons';
export const UI_SCREEN_CHROME_ROOTS = Object.freeze({
  saveLoadScreen: 'ui.saveLoadScreen.chrome',
  backlogScreen: 'ui.backlogScreen.chrome',
  gameMenu: 'ui.gameMenu.chrome',
  settingsScreen: 'ui.settingsScreen.chrome',
});

/** Locked cursor slot keys (Phase 75 — CUR-01). */
export const UI_CURSOR_SLOT_KEYS = Object.freeze(['default', 'pointer']);

/** Locked icon slot keys (Phase 75 — ICO-01). */
export const UI_ICON_SLOT_KEYS = Object.freeze(['gameMenu', 'qab', 'close', 'voiceReplay']);

/** Locked choice badge slot keys. */
export const UI_CHOICE_BADGE_SLOT_KEYS = Object.freeze(['a', 'b', 'c']);

export const UI_BUTTON_FAMILY_STATE_KEYS = Object.freeze({
  gameMenuButton: Object.freeze(['normal', 'hover', 'pressed']),
  qab: Object.freeze(['normal', 'hover', 'pressed']),
  closeButton: Object.freeze(['normal', 'hover', 'pressed']),
  pageTabPager: Object.freeze(['normal', 'hover', 'pressed', 'selected']),
  settingsTab: Object.freeze(['normal', 'hover', 'pressed', 'selected']),
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

  const segments = candidate.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
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

function collectButtonFamilyUiImages(script, add) {
  const families = script?.ui?.theme?.buttonFamilies;
  if (!families || typeof families !== 'object') {
    return;
  }

  for (const [familyKey, stateKeys] of Object.entries(UI_BUTTON_FAMILY_STATE_KEYS)) {
    const family = families[familyKey];
    if (!family || typeof family !== 'object') {
      continue;
    }

    for (const stateKey of stateKeys) {
      addCanonicalUiImage(add, family[stateKey]);
    }
  }
}

function collectScreenChromeUiImages(script, add) {
  // SaveLoad — legacy + chrome paths
  const saveLoad = script?.ui?.saveLoadScreen;
  addCanonicalUiImage(add, saveLoad?.background);
  addCanonicalUiImage(add, saveLoad?.header?.backgroundImage);
  addCanonicalUiImage(add, saveLoad?.slot?.backgroundImage);
  addCanonicalUiImage(add, saveLoad?.chrome?.backgroundImage);
  for (const decoration of saveLoad?.chrome?.decorations || []) {
    addCanonicalUiImage(add, decoration?.src);
  }

  // Backlog — legacy + chrome paths
  const backlog = script?.ui?.backlogScreen;
  addCanonicalUiImage(add, backlog?.backgroundImage);
  addCanonicalUiImage(add, backlog?.header?.backgroundImage);
  addCanonicalUiImage(add, backlog?.chrome?.backgroundImage);
  for (const decoration of backlog?.chrome?.decorations || []) {
    addCanonicalUiImage(add, decoration?.src);
  }

  // GameMenu — legacy path + chrome paths
  const gameMenu = script?.ui?.gameMenu;
  addCanonicalUiImage(add, gameMenu?.backgroundImage); // @deprecated legacy — Remove in next major milestone (Phase 74 migration path)
  for (const button of Object.values(gameMenu?.buttons || {})) {
    addCanonicalUiImage(add, button?.icon);
  }
  addCanonicalUiImage(add, gameMenu?.chrome?.backgroundImage);
  for (const decoration of gameMenu?.chrome?.decorations || []) {
    addCanonicalUiImage(add, decoration?.src);
  }

  // Settings — legacy + chrome paths
  const settings = script?.ui?.settingsScreen;
  addCanonicalUiImage(add, settings?.background);
  addCanonicalUiImage(add, settings?.header?.backgroundImage);
  for (const decoration of settings?.header?.decorations || []) {
    addCanonicalUiImage(add, decoration?.src);
  }
  for (const tab of settings?.tabBar?.tabs || []) {
    addCanonicalUiImage(add, tab?.icon);
  }
  addCanonicalUiImage(add, settings?.chrome?.backgroundImage);
  for (const decoration of settings?.chrome?.decorations || []) {
    addCanonicalUiImage(add, decoration?.src);
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

function collectCursorIconUiImages(script, add) {
  const theme = script?.ui?.theme;

  // Cursor images (CUR-01)
  const cursor = theme?.cursor;
  if (cursor && typeof cursor === 'object') {
    for (const slotKey of UI_CURSOR_SLOT_KEYS) {
      addCanonicalUiImage(add, cursor[slotKey]);
    }
  }

  // Icon images (ICO-01)
  const icons = theme?.icons;
  if (icons && typeof icons === 'object') {
    for (const slotKey of UI_ICON_SLOT_KEYS) {
      addCanonicalUiImage(add, icons[slotKey]);
    }
  }
}

function collectChoiceBadgeUiImages(script, add) {
  const choiceBadge = script?.ui?.theme?.choiceBadge;
  if (!choiceBadge || typeof choiceBadge !== 'object') {
    return;
  }

  for (const slotKey of UI_CHOICE_BADGE_SLOT_KEYS) {
    addCanonicalUiImage(add, choiceBadge[slotKey]);
  }
}

function collectDialogueBoxUiImages(script, add) {
  const dialogueBox = script?.ui?.dialogueBox;
  addCanonicalUiImage(add, dialogueBox?.nameplateBackgroundImage);
  for (const decoration of dialogueBox?.decorations || []) {
    addCanonicalUiImage(add, decoration?.src);
  }
}

function collectTitleScreenUiImages(script, add) {
  const titleScreen = script?.ui?.titleScreen;
  addCanonicalUiImage(add, titleScreen?.background);

  for (const element of titleScreen?.elements || []) {
    if (element?.type === 'image') {
      addCanonicalUiImage(add, element?.src);
    }
  }
}

export const UI_IMAGE_SCAN_REGISTRY = [
  collectThemeUiImages,
  collectButtonFamilyUiImages,
  collectDialogueBoxUiImages,
  collectTitleScreenUiImages,
  collectScreenChromeUiImages,
  collectWidgetStyleUiImages,
  collectCursorIconUiImages,
  collectChoiceBadgeUiImages,
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
