import { SETTING_DEFS } from '../engine/settingDefs.js';

export const SETTINGS_CUSTOM_BUTTON_ACTIONS = Object.freeze(['close', 'reset']);
export const SETTINGS_FOOTER_BUTTON_ACTIONS = Object.freeze(['close', 'title', 'reset']);
export const REGISTERED_SETTING_IDS = Object.freeze(Object.keys(SETTING_DEFS));
export const DEFAULT_SETTINGS_TABS = Object.freeze([
  Object.freeze({ id: 'audio', label: '声音', settingIds: Object.freeze(['master-volume', 'bgm-volume', 'se-volume', 'voice-volume']) }),
  Object.freeze({ id: 'display', label: '画面', settingIds: Object.freeze(['dialogue-opacity', 'window-mode']) }),
  Object.freeze({ id: 'gameplay', label: '游戏', settingIds: Object.freeze(['text-speed', 'auto-speed', 'skip-mode']) }),
]);

const issue = (severity, code, message, path = [], details = {}) => ({ severity, code, message, path, pathString: path.join('.'), ...details });

export function isRegisteredSettingId(settingId) {
  return REGISTERED_SETTING_IDS.includes(settingId);
}

/**
 * Preserve the legacy deterministic rule: first assignment wins, unknown keys
 * are discarded, and every unassigned registered key is appended to the last
 * group. The returned diagnostics make every lossy decision reviewable.
 */
export function normalizeSettingsAssignments(rawTabs, { tabsEnabled = true, path = ['ui', 'settingsScreen', 'tabBar', 'tabs'] } = {}) {
  const source = tabsEnabled && Array.isArray(rawTabs) && rawTabs.length
    ? rawTabs
    : tabsEnabled
      ? DEFAULT_SETTINGS_TABS
      : [{ id: 'all', label: '全部', settingIds: REGISTERED_SETTING_IDS }];
  const seen = new Set();
  const diagnostics = [];
  const tabs = source.map((rawTab, tabIndex) => {
    const rawIds = rawTab?.settingIds ?? rawTab?.settingKeys ?? DEFAULT_SETTINGS_TABS[tabIndex]?.settingIds ?? [];
    const settingIds = [];
    for (const [settingIndex, settingId] of (Array.isArray(rawIds) ? rawIds : []).entries()) {
      const settingPath = [...path, tabIndex, 'settingKeys', settingIndex];
      if (!isRegisteredSettingId(settingId)) {
        diagnostics.push(issue('warning', 'settings-assignment-unknown', `Unknown setting assignment "${settingId}" was ignored.`, settingPath, { settingId }));
        continue;
      }
      if (seen.has(settingId)) {
        diagnostics.push(issue('warning', 'settings-assignment-duplicate', `Duplicate setting assignment "${settingId}" was ignored after its first assignment.`, settingPath, { settingId }));
        continue;
      }
      seen.add(settingId);
      settingIds.push(settingId);
    }
    return {
      id: String(rawTab?.id ?? `tab-${tabIndex + 1}`),
      label: String(rawTab?.label ?? DEFAULT_SETTINGS_TABS[tabIndex]?.label ?? `Tab ${tabIndex + 1}`),
      ...(rawTab?.icon ? { icon: rawTab.icon } : {}),
      settingIds,
    };
  });
  if (!tabs.length) tabs.push({ id: 'all', label: '全部', settingIds: [] });
  const unassigned = REGISTERED_SETTING_IDS.filter(settingId => !seen.has(settingId));
  tabs.at(-1).settingIds.push(...unassigned);
  return { mode: tabsEnabled ? 'tabbed' : 'single-page', tabs, diagnostics };
}

export function validateCanonicalSettingsDocument(document, { path = ['ui', 'screens', 'settings'] } = {}) {
  if (document?.id !== 'settings' || !Array.isArray(document?.nodes)) return [];
  const diagnostics = [];
  const groups = document.nodes.filter(node => node?.type === 'settings-group');
  const controls = document.nodes.filter(node => node?.type === 'settings-control');
  const groupIds = new Set(groups.map(group => group.id));
  const seen = new Set();
  for (const control of controls) {
    const index = document.nodes.indexOf(control);
    const settingId = control?.content?.settingId;
    if (!isRegisteredSettingId(settingId)) {
      diagnostics.push(issue('error', 'settings-control-key-unknown', `Settings controls must reference a registered setting id; received "${settingId ?? ''}".`, [...path, 'nodes', index, 'content', 'settingId'], { allowedValues: REGISTERED_SETTING_IDS }));
    } else if (seen.has(settingId)) {
      diagnostics.push(issue('error', 'settings-control-key-duplicate', `Registered setting "${settingId}" must appear exactly once.`, [...path, 'nodes', index, 'content', 'settingId'], { settingId }));
    } else {
      seen.add(settingId);
    }
    if (!groupIds.has(control.parentId)) diagnostics.push(issue('error', 'settings-control-group-missing', 'A settings-control must be a child of a settings-group.', [...path, 'nodes', index, 'parentId']));
    const presentation = control?.content?.presentation;
    if (presentation !== undefined && !['default', 'toggle'].includes(presentation)) diagnostics.push(issue('error', 'settings-control-presentation-invalid', 'Settings control presentation must be default or toggle.', [...path, 'nodes', index, 'content', 'presentation']));
    if (presentation === 'toggle') {
      const options = SETTING_DEFS[settingId]?.options?.map(option => option.value) ?? [];
      if (!options.includes(control.content?.trueValue) || !options.includes(control.content?.falseValue) || control.content.trueValue === control.content.falseValue) diagnostics.push(issue('error', 'settings-control-toggle-values-invalid', 'Toggle presentation requires distinct trueValue/falseValue entries from the registered setting options.', [...path, 'nodes', index, 'content']));
    }
  }
  for (const settingId of REGISTERED_SETTING_IDS) {
    if (!seen.has(settingId)) diagnostics.push(issue('error', 'settings-control-key-missing', `Registered setting "${settingId}" must appear exactly once.`, [...path, 'nodes'], { settingId }));
  }
  if (!groups.length) diagnostics.push(issue('error', 'settings-group-missing', 'Canonical Settings requires at least one settings-group.', [...path, 'nodes']));
  const mode = document?.behavior?.mode ?? 'tabbed';
  if (!['tabbed', 'single-page'].includes(mode)) diagnostics.push(issue('error', 'settings-mode-invalid', 'Settings behavior.mode must be tabbed or single-page.', [...path, 'behavior', 'mode']));
  return diagnostics;
}

export function isKnownSettingsCustomButtonAction(action) {
  return SETTINGS_CUSTOM_BUTTON_ACTIONS.includes(action);
}

export function isKnownSettingsFooterButtonAction(action) {
  return SETTINGS_FOOTER_BUTTON_ACTIONS.includes(action);
}
