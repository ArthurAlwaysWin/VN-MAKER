import {
  UI_CHOICE_BADGE_SLOT_KEYS,
  UI_CURSOR_SLOT_KEYS,
  UI_ICON_SLOT_KEYS,
  isCanonicalUiImagePath,
} from './uiImageContract.js';

export const LEGACY_THEME_FORMAT_VERSION = 1;
export const FULL_THEME_FORMAT_VERSION = 2;

export const FULL_THEME_COVERAGE_KEYS = Object.freeze([
  'theme',
  'widgetStyles',
  'dialogueBox',
  'saveLoadScreen',
  'backlogScreen',
  'gameMenu',
  'settingsScreen',
  'titleScreen',
]);

const BUTTON_FAMILY_STATE_KEYS = Object.freeze({
  gameMenuButton: Object.freeze(['normal', 'hover', 'pressed']),
  qab: Object.freeze(['normal', 'hover', 'pressed']),
  closeButton: Object.freeze(['normal', 'hover', 'pressed']),
  pageTabPager: Object.freeze(['normal', 'hover', 'pressed', 'selected']),
  settingsTab: Object.freeze(['normal', 'hover', 'pressed', 'selected']),
});

function normalizeThemeId(themeId) {
  return typeof themeId === 'string' ? themeId.trim() : '';
}

function hasMeaningfulValue(value) {
  if (value == null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some(hasMeaningfulValue);
  }

  if (typeof value === 'object') {
    return Object.values(value).some(hasMeaningfulValue);
  }

  return false;
}

function unique(values) {
  return [...new Set(values)];
}

function pushRef(refs, slot, value) {
  if (typeof value !== 'string' || !value.trim()) {
    return;
  }

  refs.push({
    slot,
    value: value.trim(),
  });
}

function looksLikeAssetReference(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return trimmed.includes('/')
    || trimmed.includes('\\')
    || trimmed.startsWith('data:')
    || /^[a-zA-Z]:/.test(trimmed);
}

function pushMixedIconRef(refs, slot, value) {
  if (looksLikeAssetReference(value)) {
    pushRef(refs, slot, value);
  }
}

function getTitleScreenVisualSnapshot(titleScreen) {
  if (!titleScreen || typeof titleScreen !== 'object') {
    return null;
  }

  return {
    background: titleScreen.background,
    elements: Array.isArray(titleScreen.elements)
      ? titleScreen.elements.map(element => ({ ...(element ?? {}) }))
      : [],
  };
}

function getCanonicalTitleProjection(ui) {
  const title = ui?.canonicalScreens?.title;
  return title && typeof title === 'object' ? title : null;
}

function collectThemeRefs(theme) {
  const refs = [];
  const ui = theme?.ui ?? {};

  const nineSlice = ui.theme?.nineSlice;
  if (nineSlice && typeof nineSlice === 'object') {
    for (const [key, config] of Object.entries(nineSlice)) {
      if (!config || typeof config !== 'object') {
        continue;
      }

      pushRef(refs, `ui.theme.nineSlice.${key}.src`, config.src);
      pushRef(refs, `ui.theme.nineSlice.${key}.states.hover.src`, config.states?.hover?.src);
      pushRef(refs, `ui.theme.nineSlice.${key}.states.active.src`, config.states?.active?.src);
    }
  }

  const buttonFamilies = ui.theme?.buttonFamilies;
  if (buttonFamilies && typeof buttonFamilies === 'object') {
    for (const [familyKey, stateKeys] of Object.entries(BUTTON_FAMILY_STATE_KEYS)) {
      const family = buttonFamilies[familyKey];
      if (!family || typeof family !== 'object') {
        continue;
      }

      for (const stateKey of stateKeys) {
        pushRef(refs, `ui.theme.buttonFamilies.${familyKey}.${stateKey}`, family[stateKey]);
      }
    }
  }

  const cursor = ui.theme?.cursor;
  if (cursor && typeof cursor === 'object') {
    for (const slotKey of UI_CURSOR_SLOT_KEYS) {
      pushRef(refs, `ui.theme.cursor.${slotKey}`, cursor[slotKey]);
    }
  }

  const icons = ui.theme?.icons;
  if (icons && typeof icons === 'object') {
    for (const slotKey of UI_ICON_SLOT_KEYS) {
      pushRef(refs, `ui.theme.icons.${slotKey}`, icons[slotKey]);
    }
  }

  const choiceBadge = ui.theme?.choiceBadge;
  if (choiceBadge && typeof choiceBadge === 'object') {
    for (const slotKey of UI_CHOICE_BADGE_SLOT_KEYS) {
      pushRef(refs, `ui.theme.choiceBadge.${slotKey}`, choiceBadge[slotKey]);
    }
  }

  pushRef(refs, 'ui.widgetStyles.tab.activeBackgroundImage', ui.widgetStyles?.tab?.activeBackgroundImage);
  pushRef(refs, 'ui.widgetStyles.tab.nineSlice.src', ui.widgetStyles?.tab?.nineSlice?.src);
  pushRef(refs, 'ui.widgetStyles.panel.backgroundImage', ui.widgetStyles?.panel?.backgroundImage);
  pushRef(refs, 'ui.widgetStyles.panel.nineSlice.src', ui.widgetStyles?.panel?.nineSlice?.src);
  pushRef(refs, 'ui.widgetStyles.slider.thumbImage', ui.widgetStyles?.slider?.thumbImage);
  pushRef(refs, 'ui.widgetStyles.slider.trackImage', ui.widgetStyles?.slider?.trackImage);
  pushRef(refs, 'ui.widgetStyles.button.nineSlice.src', ui.widgetStyles?.button?.nineSlice?.src);

  pushRef(refs, 'ui.dialogueBox.nameplateBackgroundImage', ui.dialogueBox?.nameplateBackgroundImage);
  for (const [index, decoration] of (ui.dialogueBox?.decorations ?? []).entries()) {
    pushRef(refs, `ui.dialogueBox.decorations.${index}.src`, decoration?.src);
  }

  pushRef(refs, 'ui.saveLoadScreen.background', ui.saveLoadScreen?.background);
  pushRef(refs, 'ui.saveLoadScreen.header.backgroundImage', ui.saveLoadScreen?.header?.backgroundImage);
  pushRef(refs, 'ui.saveLoadScreen.slot.backgroundImage', ui.saveLoadScreen?.slot?.backgroundImage);
  pushRef(refs, 'ui.saveLoadScreen.chrome.backgroundImage', ui.saveLoadScreen?.chrome?.backgroundImage);
  for (const [index, decoration] of (ui.saveLoadScreen?.chrome?.decorations ?? []).entries()) {
    pushRef(refs, `ui.saveLoadScreen.chrome.decorations.${index}.src`, decoration?.src);
  }

  pushRef(refs, 'ui.backlogScreen.backgroundImage', ui.backlogScreen?.backgroundImage);
  pushRef(refs, 'ui.backlogScreen.header.backgroundImage', ui.backlogScreen?.header?.backgroundImage);
  pushRef(refs, 'ui.backlogScreen.chrome.backgroundImage', ui.backlogScreen?.chrome?.backgroundImage);
  for (const [index, decoration] of (ui.backlogScreen?.chrome?.decorations ?? []).entries()) {
    pushRef(refs, `ui.backlogScreen.chrome.decorations.${index}.src`, decoration?.src);
  }

  pushRef(refs, 'ui.gameMenu.backgroundImage', ui.gameMenu?.backgroundImage);
  for (const [key, button] of Object.entries(ui.gameMenu?.buttons ?? {})) {
    pushMixedIconRef(refs, `ui.gameMenu.buttons.${key}.icon`, button?.icon);
  }
  pushRef(refs, 'ui.gameMenu.chrome.backgroundImage', ui.gameMenu?.chrome?.backgroundImage);
  for (const [index, decoration] of (ui.gameMenu?.chrome?.decorations ?? []).entries()) {
    pushRef(refs, `ui.gameMenu.chrome.decorations.${index}.src`, decoration?.src);
  }

  pushRef(refs, 'ui.settingsScreen.background', ui.settingsScreen?.background);
  pushRef(refs, 'ui.settingsScreen.header.backgroundImage', ui.settingsScreen?.header?.backgroundImage);
  for (const [index, decoration] of (ui.settingsScreen?.header?.decorations ?? []).entries()) {
    pushRef(refs, `ui.settingsScreen.header.decorations.${index}.src`, decoration?.src);
  }
  for (const [index, tab] of (ui.settingsScreen?.tabBar?.tabs ?? []).entries()) {
    pushMixedIconRef(refs, `ui.settingsScreen.tabBar.tabs.${index}.icon`, tab?.icon);
  }
  pushRef(refs, 'ui.settingsScreen.chrome.backgroundImage', ui.settingsScreen?.chrome?.backgroundImage);
  for (const [index, decoration] of (ui.settingsScreen?.chrome?.decorations ?? []).entries()) {
    pushRef(refs, `ui.settingsScreen.chrome.decorations.${index}.src`, decoration?.src);
  }

  const titleScreen = getTitleScreenVisualSnapshot(ui.titleScreen);
  pushRef(refs, 'ui.titleScreen.background', titleScreen?.background);
  for (const [index, element] of (titleScreen?.elements ?? []).entries()) {
    if (element?.type === 'image') {
      pushRef(refs, `ui.titleScreen.elements.${index}.src`, element?.src);
    }
  }
  const canonicalTitle = getCanonicalTitleProjection(ui);
  for (const [index, node] of (canonicalTitle?.nodes ?? []).entries()) {
    if (node?.asset?.kind === 'image') {
      pushRef(refs, `ui.canonicalScreens.title.nodes.${index}.asset.path`, node.asset.path ?? node.asset.id);
    }
  }

  return refs;
}

function detectCoverage(theme) {
  const ui = theme?.ui ?? {};
  const coverage = [];

  if (hasMeaningfulValue(ui.theme)) {
    coverage.push('theme');
  }
  if (hasMeaningfulValue(ui.widgetStyles)) {
    coverage.push('widgetStyles');
  }
  if (hasMeaningfulValue(ui.dialogueBox)) {
    coverage.push('dialogueBox');
  }
  if (hasMeaningfulValue(ui.saveLoadScreen)) {
    coverage.push('saveLoadScreen');
  }
  if (hasMeaningfulValue(ui.backlogScreen)) {
    coverage.push('backlogScreen');
  }
  if (hasMeaningfulValue(ui.gameMenu)) {
    coverage.push('gameMenu');
  }
  if (hasMeaningfulValue(ui.settingsScreen)) {
    coverage.push('settingsScreen');
  }
  if (hasMeaningfulValue(getTitleScreenVisualSnapshot(ui.titleScreen)) || hasMeaningfulValue(getCanonicalTitleProjection(ui))) {
    coverage.push('titleScreen');
  }

  return coverage;
}

function validateThemeAssetPath(assetPath, themeId, subject = '资源路径') {
  if (!isCanonicalUiImagePath(assetPath)) {
    return `${subject} 必须使用 canonical ui/... 路径：${assetPath}`;
  }

  if (assetPath.includes('..')) {
    return `${subject} 不允许包含 ..：${assetPath}`;
  }

  const assetRoot = getThemePackageAssetRoot(themeId);
  if (assetRoot && !assetPath.startsWith(assetRoot)) {
    return `${subject} 必须位于 ${assetRoot} 命名空间内：${assetPath}`;
  }

  return null;
}

export function getThemePackageAssetRoot(themeId) {
  const normalizedId = normalizeThemeId(themeId);
  return normalizedId ? `ui/themes/${normalizedId}/` : '';
}

export function validateThemePackageDefinition({
  mode = 'full',
  themeId,
  theme,
  files = [],
} = {}) {
  const blockingErrors = [];
  const warnings = [];
  const normalizedThemeId = normalizeThemeId(themeId);
  const assetRoot = getThemePackageAssetRoot(normalizedThemeId);
  const coverage = detectCoverage(theme);
  const missingCoverage = FULL_THEME_COVERAGE_KEYS.filter(key => !coverage.includes(key));
  const refs = collectThemeRefs(theme);
  const manifestFiles = Array.isArray(files) ? files : [];
  const manifestPaths = new Set();

  if (!normalizedThemeId || /[\\/]/.test(normalizedThemeId) || normalizedThemeId.includes('..')) {
    blockingErrors.push('themeId 非法，必须是稳定的命名空间标识');
  }

  for (const ref of refs) {
    const error = validateThemeAssetPath(ref.value, normalizedThemeId, ref.slot);
    if (error) {
      blockingErrors.push(error);
    }
  }

  for (const file of manifestFiles) {
    if (!file || typeof file !== 'object') {
      blockingErrors.push('files 清单包含非法条目');
      continue;
    }

    const error = validateThemeAssetPath(file.path, normalizedThemeId, 'files[].path');
    if (error) {
      blockingErrors.push(error);
      continue;
    }

    if (typeof file.sha256 !== 'string' || !file.sha256.trim()) {
      blockingErrors.push(`files[].sha256 缺失：${file.path}`);
    }

    if (!Number.isFinite(file.bytes) || file.bytes < 0) {
      blockingErrors.push(`files[].bytes 非法：${file.path}`);
    }

    manifestPaths.add(file.path);
  }

  for (const ref of refs) {
    if (!manifestPaths.has(ref.value)) {
      blockingErrors.push(`主题引用缺少文件清单条目：${ref.value}`);
    }
  }

  if (mode === 'full' && missingCoverage.length > 0) {
    warnings.push(`full-theme 缺少 coverage: ${missingCoverage.join(', ')}`);
  }

  return {
    mode,
    themeId: normalizedThemeId,
    assetRoot,
    coverage,
    missingCoverage,
    refs: refs.map(ref => ref.value),
    files: manifestFiles.map(file => ({ ...file })),
    blockingErrors: unique(blockingErrors),
    warnings: unique(warnings),
  };
}

export function planThemeAssetReimport({
  themeId,
  files = [],
  existingFiles = [],
} = {}) {
  const normalizedThemeId = normalizeThemeId(themeId);
  const blockingErrors = [];
  const existingByPath = new Map();
  const actions = [];

  for (const entry of existingFiles) {
    if (entry?.path) {
      existingByPath.set(entry.path, entry);
    }
  }

  for (const file of Array.isArray(files) ? files : []) {
    if (!file?.path) {
      blockingErrors.push('files 清单包含非法条目');
      continue;
    }

    const error = validateThemeAssetPath(file.path, normalizedThemeId, 'reimport file');
    if (error) {
      blockingErrors.push(error);
      continue;
    }

    const existing = existingByPath.get(file.path);
    if (!existing) {
      actions.push({ type: 'copy', path: file.path });
      continue;
    }

    if (existing.sha256 === file.sha256) {
      actions.push({ type: 'skip', path: file.path });
      continue;
    }

    actions.push({ type: 'overwrite', path: file.path });
  }

  return {
    themeId: normalizedThemeId,
    assetRoot: getThemePackageAssetRoot(normalizedThemeId),
    actions,
    blockingErrors: unique(blockingErrors),
  };
}

export function classifyLegacyThemeCoverage(theme = {}) {
  const coverage = [];

  if (hasMeaningfulValue(theme.tokens) || hasMeaningfulValue(theme.nineSlice)) {
    coverage.push('theme');
  }

  return {
    mode: 'legacy-partial',
    isFullTheme: false,
    coverage,
    missingCoverage: FULL_THEME_COVERAGE_KEYS.filter(key => !coverage.includes(key)),
    blockingErrors: [],
    warnings: ['legacy-theme compatibility import only'],
  };
}
