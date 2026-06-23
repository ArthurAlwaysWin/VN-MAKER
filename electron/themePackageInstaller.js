import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getBuiltinThemeAssets } from '../src/editor/builtinThemeAssets.js';
import { BUILTIN_THEMES } from '../src/editor/builtinThemes.js';
import { parseThemeZip, unzipThemeZipBounded } from '../src/utils/themePackager.js';
import { isInsidePath, isPathInsideRealBase } from './pathSecurity.js';
import { preflightThemePackage } from './themePackagePreflight.js';

const OWNED_UI_KEYS = Object.freeze([
  'theme',
  'widgetStyles',
  'dialogueBox',
  'saveLoadScreen',
  'backlogScreen',
  'gameMenu',
  'settingsScreen',
  'titleScreen',
]);

const BUILTIN_THEME_ASSET_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function cloneBrowserMetadata(theme = {}) {
  return {
    preview: theme?.preview && typeof theme.preview === 'object'
      ? { ...theme.preview }
      : undefined,
    visualSignature: theme?.visualSignature && typeof theme.visualSignature === 'object'
      ? {
        ...theme.visualSignature,
        requiredTells: theme.visualSignature.requiredTells && typeof theme.visualSignature.requiredTells === 'object'
          ? { ...theme.visualSignature.requiredTells }
          : undefined,
      }
      : undefined,
  };
}

function cloneThemeOwnedTitleScreen(value) {
  const titleScreen = value && typeof value === 'object' ? value : {};
  return {
    background: titleScreen.background ?? null,
    elements: Array.isArray(titleScreen.elements)
      ? titleScreen.elements.map(element => ({ ...(element ?? {}) }))
      : [],
  };
}

function normalizeInstalledBundle(ui = {}) {
  const bundle = {};
  for (const key of OWNED_UI_KEYS) {
    bundle[key] = key === 'titleScreen'
      ? cloneThemeOwnedTitleScreen(ui[key])
      : clone(ui[key]);
  }
  if (ui.canonicalScreens?.title) {
    bundle.canonicalScreens = { title: clone(ui.canonicalScreens.title) };
  }
  return bundle;
}

function createBuiltInThemeUi(theme) {
  if (theme?.ui && typeof theme.ui === 'object') {
    return {
      theme: clone(theme.ui.theme),
      widgetStyles: clone(theme.ui.widgetStyles),
      dialogueBox: clone(theme.ui.dialogueBox),
      saveLoadScreen: clone(theme.ui.saveLoadScreen),
      backlogScreen: clone(theme.ui.backlogScreen),
      gameMenu: clone(theme.ui.gameMenu),
      settingsScreen: clone(theme.ui.settingsScreen),
      titleScreen: cloneThemeOwnedTitleScreen(theme.ui.titleScreen),
    };
  }

  const ui = {
    theme: {
      tokens: { ...(theme.tokens ?? {}) },
    },
    widgetStyles: clone(theme.widgetStyles),
    dialogueBox: {},
    saveLoadScreen: clone(theme.screens?.saveLoadScreen),
    backlogScreen: clone(theme.screens?.backlogScreen),
    gameMenu: clone(theme.screens?.gameMenu),
    settingsScreen: clone(theme.screens?.settingsScreen),
    titleScreen: cloneThemeOwnedTitleScreen(theme.screens?.titleScreen),
  };

  if (theme.colorRecipe) {
    ui.theme.colorRecipe = { ...theme.colorRecipe };
  }

  return ui;
}

async function writeThemeAsset(projectPath, relativeUiPath, bytes) {
  const assetRoot = path.resolve(projectPath, 'assets');
  const relativeParts = relativeUiPath.split('/');
  const destination = path.resolve(assetRoot, ...relativeParts);
  if (
    !isInsidePath(destination, assetRoot)
    || !await isPathInsideRealBase(destination, assetRoot, { allowMissing: true })
  ) {
    throw new Error(`Theme package asset path escapes project assets: ${relativeUiPath}`);
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes);
}

function isCanonicalBuiltInTargetPath(targetPath, themeId) {
  return typeof targetPath === 'string'
    && targetPath.startsWith(`ui/themes/${themeId}/`)
    && !targetPath.includes('..');
}

async function materializeBuiltInAssets({
  projectPath,
  themeId,
  builtinThemeAssetRoot = BUILTIN_THEME_ASSET_ROOT,
  builtinThemeAssets = getBuiltinThemeAssets(themeId),
} = {}) {
  const actions = [];
  const assetEntries = Array.isArray(builtinThemeAssets)
    ? builtinThemeAssets
    : builtinThemeAssets?.[themeId];

  for (const entry of Array.isArray(assetEntries) ? assetEntries : []) {
    const sourcePath = typeof entry?.sourcePath === 'string' ? entry.sourcePath.trim() : '';
    const targetPath = typeof entry?.targetPath === 'string' ? entry.targetPath.trim() : '';

    if (!sourcePath || !targetPath) {
      return {
        success: false,
        error: `Built-in theme asset declaration is invalid for ${themeId}`,
      };
    }

    if (!isCanonicalBuiltInTargetPath(targetPath, themeId)) {
      return {
        success: false,
        error: `Built-in theme asset target must stay inside ui/themes/${themeId}/`,
      };
    }

    const sourceAbsolutePath = path.resolve(builtinThemeAssetRoot, sourcePath);
    const bytes = await fs.readFile(sourceAbsolutePath).catch(() => null);
    if (!bytes) {
      return {
        success: false,
        error: `Built-in theme asset missing from app bundle: ${sourcePath}`,
      };
    }

    await writeThemeAsset(projectPath, targetPath, bytes);
    actions.push({
      type: 'copy',
      path: targetPath,
      sourcePath,
    });
  }

  return {
    success: true,
    actions,
  };
}

export async function installThemePackage({
  source,
  filePath,
  themeId,
  projectPath,
  builtinThemes = BUILTIN_THEMES,
  builtinThemeAssetRoot = BUILTIN_THEME_ASSET_ROOT,
  builtinThemeAssets,
} = {}) {
  if (!projectPath) {
    return { success: false, error: 'No project loaded' };
  }

  if (source === 'builtin') {
    const theme = builtinThemes.find(item => item.id === themeId);
    if (!theme) {
      return { success: false, error: `Unknown built-in theme: ${themeId}` };
    }

    const materializedAssets = await materializeBuiltInAssets({
      projectPath,
      themeId: theme.id,
      builtinThemeAssetRoot,
      builtinThemeAssets: builtinThemeAssets ?? getBuiltinThemeAssets(theme.id),
    });
    if (!materializedAssets.success) {
      return materializedAssets;
    }

    return {
      success: true,
      bundle: normalizeInstalledBundle(createBuiltInThemeUi(theme)),
      packageMeta: {
        source: 'builtin',
        themeId: theme.id,
        mode: 'full',
        assetRoot: `ui/themes/${theme.id}/`,
        ...cloneBrowserMetadata(theme),
      },
      actions: materializedAssets.actions,
    };
  }

  if (source !== 'file' || !filePath) {
    return { success: false, error: 'Unsupported theme package source' };
  }

  const preflight = await preflightThemePackage({ filePath, projectPath });
  if (!preflight.success) {
    return preflight;
  }
  if (preflight.status !== 'ready') {
    return {
      success: false,
      error: preflight.blockingErrors?.[0] ?? 'Theme package is not ready to install',
      preflight,
    };
  }

  const zipBuffer = await fs.readFile(filePath);
  const parsed = parseThemeZip(zipBuffer);
  if (!parsed.success) {
    return parsed;
  }

  const unzipped = unzipThemeZipBounded(zipBuffer);
  for (const action of preflight.actions ?? []) {
    if (action.type === 'skip') {
      continue;
    }
    const assetBytes = unzipped[`assets/${action.path}`];
    if (!assetBytes) {
      return {
        success: false,
        error: `Theme package asset missing during install: ${action.path}`,
      };
    }
    await writeThemeAsset(projectPath, action.path, assetBytes);
  }

  return {
    success: true,
    bundle: normalizeInstalledBundle(parsed.theme?.ui),
    packageMeta: {
      source: 'file',
      themeId: parsed.themeId,
      mode: 'full',
      assetRoot: parsed.assetRoot,
      ...cloneBrowserMetadata(parsed.theme),
    },
    actions: preflight.actions ?? [],
  };
}
