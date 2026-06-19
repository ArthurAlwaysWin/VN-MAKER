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
  'alchemy-rose': freezeEntries([
    {
      sourcePath: 'builtin-themes/alchemy-rose/dialogue-frame.svg',
      targetPath: 'ui/themes/alchemy-rose/dialogue/frame.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/dialogue-nameplate.svg',
      targetPath: 'ui/themes/alchemy-rose/dialogue/nameplate.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/corner-ornament.svg',
      targetPath: 'ui/themes/alchemy-rose/dialogue/corner-ornament.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/choice-normal.svg',
      targetPath: 'ui/themes/alchemy-rose/choices/choice-normal.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/choice-hover.svg',
      targetPath: 'ui/themes/alchemy-rose/choices/choice-hover.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/choice-pressed.svg',
      targetPath: 'ui/themes/alchemy-rose/choices/choice-pressed.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/choice-selected.svg',
      targetPath: 'ui/themes/alchemy-rose/choices/choice-selected.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/badge-a.svg',
      targetPath: 'ui/themes/alchemy-rose/choices/badge-a.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/badge-b.svg',
      targetPath: 'ui/themes/alchemy-rose/choices/badge-b.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/badge-c.svg',
      targetPath: 'ui/themes/alchemy-rose/choices/badge-c.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/screen-chrome.svg',
      targetPath: 'ui/themes/alchemy-rose/screens/chrome.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/title-background.svg',
      targetPath: 'ui/themes/alchemy-rose/title/background.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/title-mark.svg',
      targetPath: 'ui/themes/alchemy-rose/title/mark.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/icon-save.svg',
      targetPath: 'ui/themes/alchemy-rose/icons/save.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/icon-load.svg',
      targetPath: 'ui/themes/alchemy-rose/icons/load.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/icon-backlog.svg',
      targetPath: 'ui/themes/alchemy-rose/icons/backlog.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/icon-settings.svg',
      targetPath: 'ui/themes/alchemy-rose/icons/settings.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/icon-title.svg',
      targetPath: 'ui/themes/alchemy-rose/icons/title.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/icon-close.svg',
      targetPath: 'ui/themes/alchemy-rose/icons/close.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/icon-voice.svg',
      targetPath: 'ui/themes/alchemy-rose/icons/voice-replay.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/cursor-default.svg',
      targetPath: 'ui/themes/alchemy-rose/cursors/default.svg',
    },
    {
      sourcePath: 'builtin-themes/alchemy-rose/cursor-pointer.svg',
      targetPath: 'ui/themes/alchemy-rose/cursors/pointer.svg',
    },
  ]),
});

export function getBuiltinThemeAssets(themeId) {
  return BUILTIN_THEME_ASSETS[themeId] ?? [];
}
