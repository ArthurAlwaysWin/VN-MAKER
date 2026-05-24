/**
 * scanAssets — Extract all referenced asset paths from a script object.
 *
 * Pure function, no filesystem dependency. Receives the full script.json
 * data object and returns a categorized dictionary of deduplicated,
 * sorted relative paths suitable for export.
 *
 * Covers script-referenced assets across 6 categories (per D-01 + Phase 71 UI baseline):
 *   backgrounds — page backgrounds, UI screen backgrounds, UI image elements
 *   audio       — page BGM, page SE, title screen BGM
 *   fonts       — assets.fonts[].file
 *   characters  — characters[id].expressions values
 *   ui          — canonical ui/... chrome/theme/widget image paths
 *   voices      — page dialogues[].voice
 *
 * @module scanAssets
 */

import { collectUiImagePaths } from '../shared/uiImageContract.js';

// ─── Path Filter ─────────────────────────────────────────

const ASSET_ROOTS = new Set(['backgrounds', 'characters', 'audio', 'fonts', 'ui', 'voices']);

/**
 * Add path to set if it's a valid asset file reference.
 * Skips empty values, data: URIs, and http/https URLs.
 * @param {Set<string>} set - Target set to add to
 * @param {*} path - Raw path value (may be null, undefined, non-string)
 * @private
 */
function _add(set, path) {
  if (!path || typeof path !== 'string') return;
  const normalized = path.trim().replace(/\\/g, '/');
  if (
    !normalized
    || /^(?:https?:|data:|asset:|file:|blob:)/i.test(normalized)
    || normalized.startsWith('/')
    || normalized.split('/').includes('..')
  ) {
    return;
  }
  if (!ASSET_ROOTS.has(normalized.split('/')[0])) return;
  set.add(normalized);
}

// ─── Scanner ─────────────────────────────────────────────

/**
 * Scan a script object and extract all referenced asset paths.
 *
 * @param {Object} script - The full script.json data object
 * @returns {{ backgrounds: string[], audio: string[], fonts: string[], characters: string[], ui: string[], voices: string[] }}
 */
export function scanAssets(script) {
  const bg = new Set();
  const audio = new Set();
  const fonts = new Set();
  const chars = new Set();
  const ui = new Set();
  const voices = new Set();

  // 1. Character expression images
  for (const char of Object.values(script.characters || {})) {
    for (const imgPath of Object.values(char.expressions || {})) {
      _add(chars, imgPath);
    }
  }

  // 2. Scene pages
  for (const scene of Object.values(script.scenes || {})) {
    for (const page of (scene.pages || [])) {
      _add(bg, page.background);
      if (page.bgm?.file) _add(audio, page.bgm.file);
      if (page.se?.file) _add(audio, page.se.file);
      for (const dlg of (page.dialogues || [])) {
        if (dlg.voice) _add(voices, dlg.voice);
      }
    }
  }

  // 3. Fonts
  for (const font of (script.assets?.fonts || [])) {
    if (font.file) _add(fonts, font.file);
  }

  // 4. UI screens (titleScreen, settingsScreen)
  for (const screenKey of ['titleScreen', 'settingsScreen']) {
    const screen = script.ui?.[screenKey];
    if (!screen) continue;
    _add(bg, screen.background);
    // titleScreen.bgm is a bare string path (not { file: ... } like page bgm)
    if (screenKey === 'titleScreen' && screen.bgm) {
      _add(audio, screen.bgm);
    }
    for (const elem of (screen.elements || [])) {
      if (elem.type === 'image' && elem.src) {
        _add(bg, elem.src);
      }
    }
  }

  collectUiImagePaths(script, (value) => _add(ui, value));

  // Convert Sets → sorted arrays for deterministic output
  return {
    backgrounds: [...bg].sort(),
    audio: [...audio].sort(),
    fonts: [...fonts].sort(),
    characters: [...chars].sort(),
    ui: [...ui].sort(),
    voices: [...voices].sort(),
  };
}
