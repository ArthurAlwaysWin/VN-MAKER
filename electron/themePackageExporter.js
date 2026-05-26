import fs from 'node:fs/promises';
import path from 'node:path';

import { collectUiImagePaths } from '../src/shared/uiImageContract.js';
import { buildFullThemeZip } from '../src/utils/themePackager.js';

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

function extractThemeOwnedTitleScreen(titleScreen) {
  const ownedTitleScreen = titleScreen && typeof titleScreen === 'object' ? titleScreen : {};
  return {
    background: ownedTitleScreen.background ?? null,
    elements: Array.isArray(ownedTitleScreen.elements)
      ? ownedTitleScreen.elements.map(element => ({ ...(element ?? {}) }))
      : [],
  };
}

function rewritePathToThemeNamespace(assetPath, themeId) {
  if (typeof assetPath !== 'string' || !assetPath.startsWith('ui/')) {
    return assetPath;
  }
  const assetRoot = `ui/themes/${themeId}/`;
  if (assetPath.startsWith(assetRoot)) {
    return assetPath;
  }
  return `${assetRoot}${assetPath.slice(3)}`;
}

function isInsidePath(fullPath, basePath) {
  const resolved = path.resolve(fullPath);
  const baseResolved = path.resolve(basePath);
  return resolved === baseResolved || resolved.startsWith(baseResolved + path.sep);
}

function replaceThemeUiRefs(node, rewrite) {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) {
      replaceThemeUiRefs(item, rewrite);
    }
    return;
  }

  for (const key of Object.keys(node)) {
    const value = node[key];
    if (typeof value === 'string') {
      const nextValue = rewrite(value);
      if (nextValue !== value) {
        node[key] = nextValue;
      }
      continue;
    }
    replaceThemeUiRefs(value, rewrite);
  }
}

function extractThemeSnapshot(scriptData) {
  const packageMeta = scriptData?.ui?.theme?.packageMeta ?? {};
  const snapshot = { ui: {} };
  for (const key of OWNED_UI_KEYS) {
    if (key === 'theme') {
      const theme = clone(scriptData?.ui?.theme);
      if (theme && typeof theme === 'object') {
        delete theme.packageMeta;
      }
      snapshot.ui.theme = theme ?? {};
      continue;
    }
    if (key === 'titleScreen') {
      snapshot.ui.titleScreen = extractThemeOwnedTitleScreen(scriptData?.ui?.titleScreen);
      continue;
    }
    snapshot.ui[key] = clone(scriptData?.ui?.[key]);
  }
  if (packageMeta.preview && typeof packageMeta.preview === 'object') {
    snapshot.preview = clone(packageMeta.preview);
  }
  if (packageMeta.visualSignature && typeof packageMeta.visualSignature === 'object') {
    snapshot.visualSignature = clone(packageMeta.visualSignature);
  }
  return snapshot;
}

export async function exportThemePackage({
  projectPath,
  metadata = {},
} = {}) {
  if (!projectPath) {
    return { success: false, error: 'No project loaded' };
  }

  const scriptPath = path.join(projectPath, 'script.json');
  const scriptData = JSON.parse(await fs.readFile(scriptPath, 'utf-8'));
  const packageMeta = scriptData?.ui?.theme?.packageMeta ?? {};
  const themeId = metadata.themeId || packageMeta.themeId;
  if (!themeId) {
    return { success: false, error: 'Current project theme is missing themeId metadata' };
  }

  const snapshot = extractThemeSnapshot(scriptData);
  const originalUiPaths = [];
  collectUiImagePaths(snapshot, (value) => originalUiPaths.push(value));

  const rewrittenAssets = [];
  const seenTargetPaths = new Set();
  const assetRoot = path.join(projectPath, 'assets');
  for (const originalPath of [...new Set(originalUiPaths)]) {
    const targetPath = rewritePathToThemeNamespace(originalPath, themeId);
    if (seenTargetPaths.has(targetPath)) {
      continue;
    }
    seenTargetPaths.add(targetPath);
    const sourcePath = path.join(assetRoot, ...originalPath.split('/'));
    if (!isInsidePath(sourcePath, assetRoot)) {
      throw new Error(`Theme asset path escapes project assets: ${originalPath}`);
    }
    const assetBytes = await fs.readFile(sourcePath);
    rewrittenAssets.push({
      path: targetPath,
      bytes: assetBytes,
    });
  }

  replaceThemeUiRefs(snapshot, (value) => rewritePathToThemeNamespace(value, themeId));

  const buffer = buildFullThemeZip({
    themeId,
    theme: snapshot,
    assets: rewrittenAssets,
    metadata: {
      themeId,
      ...metadata,
    },
  });

  return {
    success: true,
    buffer,
    themeId,
    fileExtension: '.gmtheme',
  };
}
