/**
 * Theme browser normalization helpers for Phase 80.
 *
 * Keeps built-in themes and imported preflight results on one renderer-safe
 * item contract without introducing a second applied-state source.
 */

import { FULL_THEME_COVERAGE_KEYS } from '../../shared/themePackageContract.js';

const COVERAGE_LABELS = Object.freeze({
  theme: '主题基础',
  widgetStyles: '通用控件',
  dialogueBox: '对话框',
  saveLoadScreen: '存档/读档',
  backlogScreen: '回看界面',
  gameMenu: '游戏菜单',
  settingsScreen: '设置界面',
});

const BUILTIN_THEME_AUTHOR = 'Galgame Maker';
const BUILTIN_THEME_VERSION = '内置主题';
const IMPORTED_THEME_AUTHOR = '外部主题包';
const IMPORTED_THEME_VERSION = '导入主题';

function normalizeCoverageList(list, fallback = []) {
  const source = Array.isArray(list) && list.length > 0 ? list : fallback;
  return [...new Set(source.filter(item => typeof item === 'string' && item.trim()))];
}

function labelCoverage(list = []) {
  return normalizeCoverageList(list).map(item => COVERAGE_LABELS[item] ?? item);
}

function normalizeAppliedSource(source) {
  return source === 'file' ? 'imported' : source;
}

function getAppliedPackageMeta(scriptData = {}) {
  return scriptData?.ui?.theme?.packageMeta ?? null;
}

function getAppliedCoverage(scriptData = {}) {
  const packageMeta = getAppliedPackageMeta(scriptData);
  if (packageMeta?.mode === 'full') {
    return FULL_THEME_COVERAGE_KEYS;
  }
  return [];
}

function toSearchText(parts = []) {
  return parts
    .filter(part => typeof part === 'string' && part.trim())
    .join(' ')
    .toLowerCase();
}

function buildApplyEligibility(item) {
  if (item.mode === 'legacy-partial') {
    return {
      canApply: false,
      applyDisabledReason: '兼容导入 / 部分主题仅支持查看覆盖范围',
    };
  }

  if (item.lifecycle === 'applied') {
    return {
      canApply: false,
      applyDisabledReason: '当前已应用',
    };
  }

  if (item.status && item.status !== 'ready' && item.source === 'imported') {
    return {
      canApply: false,
      applyDisabledReason: '该主题包当前不可应用',
    };
  }

  if (!item.rawId) {
    return {
      canApply: false,
      applyDisabledReason: '主题元数据不完整，暂不可应用',
    };
  }

  return {
    canApply: true,
    applyDisabledReason: '',
  };
}

export function resolveThemeBrowserPreview(item = {}) {
  if (item.preview && typeof item.preview === 'object') {
    return {
      kind: 'static',
      mode: item.preview.mode ?? 'asset',
      src: item.preview.src ?? '',
      background: item.preview.background ?? item.primaryColor ?? '#2d2d30',
      accent: item.preview.accent ?? item.tokens?.primary ?? item.primaryColor ?? '#5b8cff',
      text: item.preview.text ?? item.name ?? item.rawId ?? '主题',
      initials: item.preview.initials ?? (item.name ?? item.rawId ?? '主').slice(0, 2),
    };
  }

  const background = item.primaryColor ?? item.tokens?.primary ?? '#2d2d30';
  const accent = item.tokens?.accent ?? item.tokens?.primary ?? item.primaryColor ?? '#5b8cff';

  return {
    kind: 'static',
    mode: 'fallback',
    background,
    accent,
    text: item.name ?? item.rawId ?? '主题',
    initials: (item.name ?? item.rawId ?? '主题').slice(0, 2),
  };
}

export function computeThemeApplyImpact(item = {}, scriptData = {}) {
  const coverage = normalizeCoverageList(item.coverage);

  if (item.mode === 'legacy-partial') {
    return {
      kind: 'inspect-only',
      overlapCoverage: [],
      text: '兼容导入 / 部分主题仅支持查看覆盖范围，不提供整包替换应用。',
    };
  }

  if (coverage.length === 0) {
    return {
      kind: 'conservative',
      overlapCoverage: [],
      text: '主题元数据不完整，暂时无法可靠判断会影响哪些范围。',
    };
  }

  const appliedCoverage = getAppliedCoverage(scriptData);
  const overlapCoverage = coverage.filter(key => appliedCoverage.includes(key));
  const overlapLabels = labelCoverage(overlapCoverage);
  const coverageLabels = labelCoverage(coverage);

  if (overlapCoverage.length > 0) {
    return {
      kind: 'overlap',
      overlapCoverage,
      text: `会覆盖当前主题已接管的范围：${overlapLabels.join('、')}`,
    };
  }

  return {
    kind: 'first-write',
    overlapCoverage: [],
    text: `首次写入这些主题范围：${coverageLabels.join('、')}`,
  };
}

export function computeThemeBrowserLifecycle(item = {}, scriptData = {}) {
  const packageMeta = getAppliedPackageMeta(scriptData);
  if (!packageMeta) {
    return 'available';
  }

  const appliedSource = normalizeAppliedSource(packageMeta.source);
  if (
    packageMeta.themeId === item.rawId
    && appliedSource === item.source
    && packageMeta.mode === item.mode
  ) {
    return 'applied';
  }

  return 'available';
}

export function normalizeThemeBrowserItem(rawTheme = {}, {
  source = 'builtin',
  scriptData = {},
} = {}) {
  const isBuiltin = source === 'builtin';
  const rawId = rawTheme.rawId ?? rawTheme.themeId ?? rawTheme.id ?? '';
  const mode = rawTheme.mode ?? (rawTheme.status === 'legacy-partial' ? 'legacy-partial' : 'full');
  const coverage = isBuiltin
    ? normalizeCoverageList(rawTheme.coverage, FULL_THEME_COVERAGE_KEYS)
    : normalizeCoverageList(rawTheme.coverage);
  const missingCoverage = isBuiltin
    ? []
    : normalizeCoverageList(rawTheme.missingCoverage);

  const item = {
    id: `${source}:${rawId}`,
    rawId,
    name: rawTheme.name ?? rawTheme.title ?? rawId,
    description: rawTheme.description ?? '',
    author: rawTheme.author ?? (isBuiltin ? BUILTIN_THEME_AUTHOR : IMPORTED_THEME_AUTHOR),
    version: rawTheme.version ?? (isBuiltin ? BUILTIN_THEME_VERSION : IMPORTED_THEME_VERSION),
    source,
    appliedSource: normalizeAppliedSource(getAppliedPackageMeta(scriptData)?.source),
    mode,
    status: rawTheme.status ?? (isBuiltin ? 'ready' : ''),
    filePath: rawTheme.filePath ?? '',
    fileName: rawTheme.fileName ?? '',
    assetRoot: rawTheme.assetRoot ?? '',
    warnings: Array.isArray(rawTheme.warnings) ? [...rawTheme.warnings] : [],
    blockingErrors: Array.isArray(rawTheme.blockingErrors) ? [...rawTheme.blockingErrors] : [],
    coverage,
    coverageLabels: labelCoverage(coverage),
    missingCoverage,
    missingCoverageLabels: labelCoverage(missingCoverage),
    primaryColor: rawTheme.primaryColor ?? rawTheme.tokens?.primary ?? '',
    tokens: rawTheme.tokens && typeof rawTheme.tokens === 'object' ? { ...rawTheme.tokens } : {},
  };

  item.lifecycle = computeThemeBrowserLifecycle(item, scriptData);

  const eligibility = buildApplyEligibility(item);
  item.canApply = eligibility.canApply;
  item.applyDisabledReason = eligibility.applyDisabledReason;
  item.applyImpact = computeThemeApplyImpact(item, scriptData);
  item.preview = resolveThemeBrowserPreview({
    ...item,
    preview: rawTheme.preview,
  });
  item.searchText = toSearchText([
    item.name,
    item.description,
    item.author,
    item.version,
    item.rawId,
    ...item.coverageLabels,
    ...item.missingCoverageLabels,
  ]);

  return item;
}

export function buildThemeBrowserItems({
  builtins = [],
  importedEntries = [],
  scriptData = {},
} = {}) {
  const builtinItems = (Array.isArray(builtins) ? builtins : []).map(theme => normalizeThemeBrowserItem(theme, {
    source: 'builtin',
    scriptData,
  }));
  const importedItems = (Array.isArray(importedEntries) ? importedEntries : []).map(entry => normalizeThemeBrowserItem(entry, {
    source: 'imported',
    scriptData,
  }));

  return [...builtinItems, ...importedItems];
}

export function filterThemeBrowserItems(items = [], filterState = {}) {
  const sourceFilter = Array.isArray(filterState.source) ? filterState.source : [];
  const lifecycleFilter = Array.isArray(filterState.lifecycle) ? filterState.lifecycle : [];
  const modeFilter = Array.isArray(filterState.mode) ? filterState.mode : [];
  const coverageFilter = Array.isArray(filterState.coverage) ? filterState.coverage : [];
  const query = typeof filterState.query === 'string' ? filterState.query.trim().toLowerCase() : '';

  return items.filter(item => {
    if (sourceFilter.length > 0 && !sourceFilter.includes(item.source)) {
      return false;
    }
    if (lifecycleFilter.length > 0 && !lifecycleFilter.includes(item.lifecycle)) {
      return false;
    }
    if (modeFilter.length > 0 && !modeFilter.includes(item.mode)) {
      return false;
    }
    if (coverageFilter.length > 0 && !coverageFilter.every(key => item.coverage.includes(key))) {
      return false;
    }
    if (query && !item.searchText.includes(query)) {
      return false;
    }
    return true;
  });
}

export function createImportedThemeBrowserEntry(preflight = {}, scriptData = {}) {
  return normalizeThemeBrowserItem({
    rawId: preflight.themeId ?? '',
    name: preflight.name ?? preflight.themeId ?? preflight.fileName ?? '导入主题',
    description: preflight.assetRoot ? `命名空间：${preflight.assetRoot}` : '',
    status: preflight.status ?? 'blocked',
    mode: preflight.mode ?? (preflight.status === 'legacy-partial' ? 'legacy-partial' : 'full'),
    filePath: preflight.filePath ?? '',
    fileName: preflight.fileName ?? '',
    assetRoot: preflight.assetRoot ?? '',
    coverage: preflight.coverage ?? [],
    missingCoverage: preflight.missingCoverage ?? [],
    warnings: preflight.warnings ?? [],
    blockingErrors: preflight.blockingErrors ?? [],
  }, {
    source: 'imported',
    scriptData,
  });
}
