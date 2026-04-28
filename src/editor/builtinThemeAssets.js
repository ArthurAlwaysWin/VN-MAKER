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
  'modern-sky': freezeEntries([
    {
      sourcePath: 'builtin-themes/modern-sky/dialogue-nameplate.svg',
      targetPath: 'ui/themes/modern-sky/dialogue/nameplate.svg',
    },
    {
      sourcePath: 'builtin-themes/modern-sky/screen-chrome.svg',
      targetPath: 'ui/themes/modern-sky/screens/chrome.svg',
    },
    {
      sourcePath: 'builtin-themes/modern-sky/title-background.svg',
      targetPath: 'ui/themes/modern-sky/title/background.svg',
    },
    {
      sourcePath: 'builtin-themes/modern-sky/title-mark.svg',
      targetPath: 'ui/themes/modern-sky/title/mark.svg',
    },
  ]),
  'fantasy-dark': freezeEntries([
    {
      sourcePath: 'builtin-themes/fantasy-dark/dialogue-nameplate.svg',
      targetPath: 'ui/themes/fantasy-dark/dialogue/nameplate.svg',
    },
    {
      sourcePath: 'builtin-themes/fantasy-dark/screen-chrome.svg',
      targetPath: 'ui/themes/fantasy-dark/screens/chrome.svg',
    },
    {
      sourcePath: 'builtin-themes/fantasy-dark/title-background.svg',
      targetPath: 'ui/themes/fantasy-dark/title/background.svg',
    },
    {
      sourcePath: 'builtin-themes/fantasy-dark/title-mark.svg',
      targetPath: 'ui/themes/fantasy-dark/title/mark.svg',
    },
  ]),
  'minimal-white': freezeEntries([
    {
      sourcePath: 'builtin-themes/minimal-white/dialogue-nameplate.svg',
      targetPath: 'ui/themes/minimal-white/dialogue/nameplate.svg',
    },
    {
      sourcePath: 'builtin-themes/minimal-white/screen-chrome.svg',
      targetPath: 'ui/themes/minimal-white/screens/chrome.svg',
    },
    {
      sourcePath: 'builtin-themes/minimal-white/title-background.svg',
      targetPath: 'ui/themes/minimal-white/title/background.svg',
    },
    {
      sourcePath: 'builtin-themes/minimal-white/title-mark.svg',
      targetPath: 'ui/themes/minimal-white/title/mark.svg',
    },
  ]),
});

export function getBuiltinThemeAssets(themeId) {
  return BUILTIN_THEME_ASSETS[themeId] ?? [];
}
