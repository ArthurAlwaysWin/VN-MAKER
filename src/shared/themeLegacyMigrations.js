const LEGACY_WAFUU_TITLE = '系統設定';
const FIXED_WAFUU_TITLE = '系统设定';
const FIXED_WAFUU_FOOTER_BUTTONS = Object.freeze([
  { text: '恢复默认', action: 'reset', x: 1030, y: 14 },
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isAppliedBuiltinWafuu(scriptData = {}) {
  const packageMeta = scriptData?.ui?.theme?.packageMeta;
  return packageMeta?.source === 'builtin' && packageMeta?.themeId === 'wafuu';
}

function hasLegacyWafuuFooter(buttons = []) {
  if (!Array.isArray(buttons) || buttons.length !== 2) {
    return false;
  }

  const fingerprint = buttons
    .map((button) => `${button?.action ?? ''}:${button?.text ?? ''}:${button?.x ?? ''}:${button?.y ?? ''}`)
    .sort();

  return fingerprint[0] === 'close:关闭:0:0'
    && fingerprint[1] === 'reset:恢复默认:0:0';
}

export function migrateLegacyAppliedThemeData(scriptData = {}) {
  if (!isAppliedBuiltinWafuu(scriptData)) {
    return { changed: false, script: scriptData };
  }

  let changed = false;
  const nextScript = clone(scriptData);
  nextScript.ui ??= {};
  nextScript.ui.settingsScreen ??= {};
  nextScript.ui.settingsScreen.header ??= {};
  nextScript.ui.settingsScreen.header.title ??= {};

  if (nextScript.ui.settingsScreen.header.title.text === LEGACY_WAFUU_TITLE) {
    nextScript.ui.settingsScreen.header.title.text = FIXED_WAFUU_TITLE;
    changed = true;
  }

  const legacyButtons = nextScript.ui.settingsScreen.footer?.buttons;
  if (hasLegacyWafuuFooter(legacyButtons)) {
    nextScript.ui.settingsScreen.footer.buttons = clone(FIXED_WAFUU_FOOTER_BUTTONS);
    changed = true;
  }

  return { changed, script: changed ? nextScript : scriptData };
}

