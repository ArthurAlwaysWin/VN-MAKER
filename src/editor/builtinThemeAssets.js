/**
 * Built-in bundled asset declarations for the shared theme installer.
 *
 * Source paths are relative to `public/`. Target paths must stay inside the
 * canonical `ui/themes/<themeId>/...` namespace so built-in and imported theme
 * installs keep the same project-local semantics.
 */

function freezeEntries(entries = []) {
  return Object.freeze(entries.map(entry => Object.freeze({ ...entry })));
}

export const BUILTIN_THEME_ASSETS = Object.freeze({
  default: freezeEntries([
    {
      sourcePath: 'builtin-themes/default/dialogue-nameplate.svg',
      targetPath: 'ui/themes/default/dialogue/nameplate.svg',
    },
    {
      sourcePath: 'builtin-themes/default/screen-chrome.svg',
      targetPath: 'ui/themes/default/screens/chrome.svg',
    },
    {
      sourcePath: 'builtin-themes/default/title-background.svg',
      targetPath: 'ui/themes/default/title/background.svg',
    },
    {
      sourcePath: 'builtin-themes/default/title-mark.svg',
      targetPath: 'ui/themes/default/title/mark.svg',
    },
  ]),
  wafuu: freezeEntries([]),
  'modern-sky': freezeEntries([]),
  'fantasy-dark': freezeEntries([]),
  'minimal-white': freezeEntries([]),
});

export function getBuiltinThemeAssets(themeId) {
  return BUILTIN_THEME_ASSETS[themeId] ?? [];
}
