import fs from 'node:fs/promises';
import path from 'node:path';

import { unzipSync } from 'fflate';

import { BUILTIN_THEMES } from '../src/editor/builtinThemes.js';
import { parseThemeZip } from '../src/utils/themePackager.js';
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

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
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
  return bundle;
}

function createBuiltInThemeUi(theme) {
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
  const relativeParts = relativeUiPath.split('/');
  const destination = path.join(projectPath, 'assets', ...relativeParts);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes);
}

export async function installThemePackage({
  source,
  filePath,
  themeId,
  projectPath,
  builtinThemes = BUILTIN_THEMES,
} = {}) {
  if (!projectPath) {
    return { success: false, error: 'No project loaded' };
  }

  if (source === 'builtin') {
    const theme = builtinThemes.find(item => item.id === themeId);
    if (!theme) {
      return { success: false, error: `Unknown built-in theme: ${themeId}` };
    }

    return {
      success: true,
      bundle: normalizeInstalledBundle(createBuiltInThemeUi(theme)),
      packageMeta: {
        source: 'builtin',
        themeId: theme.id,
        mode: 'full',
        assetRoot: `ui/themes/${theme.id}/`,
      },
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

  const unzipped = unzipSync(zipBuffer);
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
    },
    actions: preflight.actions ?? [],
  };
}
