import { scanAssets } from '../engine/scanAssets.js';
import { validateProject } from '../shared/projectValidator.js';
import { traceReachableScenes } from '../shared/sceneGraph.js';
import { FULL_THEME_COVERAGE_KEYS } from '../shared/themePackageContract.js';
import {
  UI_BUTTON_FAMILY_STATE_KEYS,
  UI_CHOICE_BADGE_SLOT_KEYS,
  UI_CURSOR_SLOT_KEYS,
  UI_ICON_SLOT_KEYS,
} from '../shared/uiImageContract.js';
import { lintProjectLayout } from './layoutLint.js';

function createReadinessIssue(source, issue, severity = issue?.severity ?? 'warning') {
  return {
    source,
    severity,
    code: issue.code,
    message: issue.message,
    path: issue.path ?? [],
    pathString: issue.pathString ?? '',
    ...('assetPath' in issue ? { assetPath: issue.assetPath } : {}),
    ...('assetKind' in issue ? { assetKind: issue.assetKind } : {}),
    ...('sceneId' in issue ? { sceneId: issue.sceneId } : {}),
    ...('missingSlots' in issue ? { missingSlots: issue.missingSlots } : {}),
    ...('missingStates' in issue ? { missingStates: issue.missingStates } : {}),
    ...('familyKey' in issue ? { familyKey: issue.familyKey } : {}),
  };
}

function countAssets(assetBuckets = {}) {
  const byKind = {};
  let total = 0;

  for (const [kind, values] of Object.entries(assetBuckets)) {
    const count = Array.isArray(values) ? values.length : 0;
    byKind[kind] = count;
    total += count;
  }

  return { total, byKind };
}

function createSyntheticIssue(code, message, details = {}) {
  return {
    severity: 'warning',
    code,
    message,
    path: [],
    pathString: '',
    ...details,
  };
}

function hasMeaningfulValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (typeof value === 'object') return Object.values(value).some(hasMeaningfulValue);
  return false;
}

function isAssetLikePath(assetPath) {
  if (typeof assetPath !== 'string') return false;
  const normalized = assetPath.replace(/\\/g, '/');
  if (!normalized || normalized.endsWith('/')) return false;
  if (normalized === 'script.json' || normalized.endsWith('.json')) return false;
  return /^(backgrounds|characters|audio|fonts|ui|voices)\//.test(normalized);
}

function createReferencedAssetSet(assets) {
  const referenced = new Set();
  for (const values of Object.values(assets)) {
    for (const value of values ?? []) {
      referenced.add(value);
    }
  }
  return referenced;
}

function getUnusedAssets(knownAssets, referencedAssets) {
  if (!(Array.isArray(knownAssets) || knownAssets instanceof Set)) {
    return [];
  }

  return [...knownAssets]
    .map(assetPath => String(assetPath).replace(/\\/g, '/'))
    .filter(isAssetLikePath)
    .filter(assetPath => !referencedAssets.has(assetPath))
    .sort();
}

function getThemeSectionCoverage(script) {
  const ui = script?.ui ?? {};
  const coverage = [];

  if (hasMeaningfulValue(ui.theme)) coverage.push('theme');
  if (hasMeaningfulValue(ui.widgetStyles)) coverage.push('widgetStyles');
  if (hasMeaningfulValue(ui.dialogueBox)) coverage.push('dialogueBox');
  if (hasMeaningfulValue(ui.saveLoadScreen)) coverage.push('saveLoadScreen');
  if (hasMeaningfulValue(ui.backlogScreen)) coverage.push('backlogScreen');
  if (hasMeaningfulValue(ui.gameMenu)) coverage.push('gameMenu');
  if (hasMeaningfulValue(ui.settingsScreen)) coverage.push('settingsScreen');
  if (hasMeaningfulValue({
    background: ui.titleScreen?.background,
    elements: (ui.titleScreen?.elements ?? []).filter(element => element?.type === 'image'),
  })) {
    coverage.push('titleScreen');
  }

  return {
    coverage,
    missingCoverage: FULL_THEME_COVERAGE_KEYS.filter(key => !coverage.includes(key)),
  };
}

function getMissingKeys(config, keys) {
  if (!config || typeof config !== 'object') {
    return keys;
  }

  return keys.filter(key => !hasMeaningfulValue(config[key]));
}

function analyzeThemeAssetCoverage(script) {
  const sectionCoverage = getThemeSectionCoverage(script);
  const theme = script?.ui?.theme ?? {};
  const warnings = [];
  const slotCoverage = {
    buttonFamilies: {},
    cursor: {
      configured: hasMeaningfulValue(theme.cursor),
      missingSlots: [],
    },
    icons: {
      configured: hasMeaningfulValue(theme.icons),
      missingSlots: [],
    },
    choiceBadge: {
      configured: hasMeaningfulValue(theme.choiceBadge),
      missingSlots: [],
    },
  };

  if (slotCoverage.cursor.configured) {
    slotCoverage.cursor.missingSlots = getMissingKeys(theme.cursor, UI_CURSOR_SLOT_KEYS);
  }
  if (slotCoverage.icons.configured) {
    slotCoverage.icons.missingSlots = getMissingKeys(theme.icons, UI_ICON_SLOT_KEYS);
  }
  if (slotCoverage.choiceBadge.configured) {
    slotCoverage.choiceBadge.missingSlots = getMissingKeys(theme.choiceBadge, UI_CHOICE_BADGE_SLOT_KEYS);
  }

  for (const [familyKey, stateKeys] of Object.entries(UI_BUTTON_FAMILY_STATE_KEYS)) {
    const family = theme.buttonFamilies?.[familyKey];
    const configured = hasMeaningfulValue(family);
    const missingStates = configured ? getMissingKeys(family, stateKeys) : [];
    slotCoverage.buttonFamilies[familyKey] = {
      configured,
      missingStates,
    };
  }

  for (const [slot, coverage] of Object.entries({
    cursor: slotCoverage.cursor,
    icons: slotCoverage.icons,
    choiceBadge: slotCoverage.choiceBadge,
  })) {
    if (coverage.configured && coverage.missingSlots.length > 0) {
      warnings.push(createSyntheticIssue(
        `theme-${slot}-partial-coverage`,
        `Theme ${slot} is configured but missing slots: ${coverage.missingSlots.join(', ')}.`,
        {
          path: ['ui', 'theme', slot],
          pathString: `ui.theme.${slot}`,
          missingSlots: coverage.missingSlots,
        },
      ));
    }
  }

  for (const [familyKey, coverage] of Object.entries(slotCoverage.buttonFamilies)) {
    if (coverage.configured && coverage.missingStates.length > 0) {
      warnings.push(createSyntheticIssue(
        'theme-button-family-partial-coverage',
        `Theme button family "${familyKey}" is configured but missing states: ${coverage.missingStates.join(', ')}.`,
        {
          path: ['ui', 'theme', 'buttonFamilies', familyKey],
          pathString: `ui.theme.buttonFamilies.${familyKey}`,
          familyKey,
          missingStates: coverage.missingStates,
        },
      ));
    }
  }

  return {
    ...sectionCoverage,
    slotCoverage,
    warnings,
  };
}

export function createExportReadiness(script = {}, options = {}) {
  const assets = scanAssets(script);
  const assetCounts = countAssets(assets);
  const referencedAssets = createReferencedAssetSet(assets);
  const hasKnownAssets = Array.isArray(options.knownAssets) || options.knownAssets instanceof Set;
  const unusedAssets = getUnusedAssets(options.knownAssets, referencedAssets);
  const themeCoverage = analyzeThemeAssetCoverage(script);
  const validation = validateProject(script, {
    ...options.validation,
    knownAssets: options.knownAssets,
  });
  const layout = lintProjectLayout(script, options.layout);
  const sceneGraph = traceReachableScenes(script, options.graph);
  const blockers = [];
  const warnings = [];

  for (const error of validation.errors) {
    blockers.push(createReadinessIssue('validation', error, 'error'));
  }

  for (const warning of validation.warnings) {
    if (warning.code === 'missing-asset-reference') {
      blockers.push(createReadinessIssue('assets', warning, 'error'));
    } else if (warning.code === 'unreachable-scene') {
      blockers.push(createReadinessIssue('scene-graph', warning, 'error'));
    } else {
      warnings.push(createReadinessIssue('validation', warning));
    }
  }

  for (const warning of layout.warnings) {
    blockers.push(createReadinessIssue('layout', warning, 'error'));
  }

  if (sceneGraph.unreachableSceneIds.length > 0 && !blockers.some((issue) => issue.code === 'unreachable-scene')) {
    for (const sceneId of sceneGraph.unreachableSceneIds) {
      blockers.push(createReadinessIssue('scene-graph', createSyntheticIssue(
        'unreachable-scene',
        `Scene "${sceneId}" is not reachable from entry scene "${sceneGraph.entrySceneId}".`,
        {
          sceneId,
          path: ['scenes', sceneId],
          pathString: `scenes.${sceneId}`,
        },
      ), 'error'));
    }
  }

  if (!hasKnownAssets && options.requireAssetCheck !== false) {
    blockers.push(createReadinessIssue('assets', createSyntheticIssue(
      'asset-check-not-run',
      'Export readiness requires knownAssets so missing files can be detected.',
    ), 'error'));
  }

  for (const assetPath of unusedAssets) {
    warnings.push(createReadinessIssue('assets', createSyntheticIssue(
      'unused-asset',
      `Asset "${assetPath}" exists in the asset root but is not referenced by the script.`,
      {
        assetPath,
      },
    )));
  }

  for (const warning of themeCoverage.warnings) {
    warnings.push(createReadinessIssue('theme', warning));
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    validation: {
      ok: validation.ok,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    },
    layout: {
      ok: layout.ok,
      warningCount: layout.warnings.length,
    },
    sceneGraph: {
      entrySceneId: sceneGraph.entrySceneId,
      reachableCount: sceneGraph.reachableSceneIds.length,
      unreachableSceneIds: sceneGraph.unreachableSceneIds,
    },
    assets: {
      checked: hasKnownAssets,
      counts: assetCounts,
      referenced: assets,
      unused: unusedAssets,
      missing: blockers
        .filter((issue) => issue.code === 'missing-asset-reference')
        .map((issue) => ({
          assetKind: issue.assetKind,
          assetPath: issue.assetPath,
          pathString: issue.pathString,
        })),
    },
    theme: {
      coverage: themeCoverage.coverage,
      missingCoverage: themeCoverage.missingCoverage,
      slotCoverage: themeCoverage.slotCoverage,
      warningCount: themeCoverage.warnings.length,
    },
  };
}
