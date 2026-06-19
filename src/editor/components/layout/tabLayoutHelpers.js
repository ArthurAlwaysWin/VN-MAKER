/**
 * Tab & Layout Editor helpers — pure data functions for tab CRUD
 * and setting assignment. Testable without Vue/JSDOM.
 *
 * @module components/layout/tabLayoutHelpers
 */

// ─── Default Tabs (mirrors engine defaults) ────────────
export const DEFAULT_TABS = [
  { label: '声音', settingKeys: ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'] },
  { label: '画面', settingKeys: ['dialogue-opacity', 'window-mode'] },
  { label: '游戏', settingKeys: ['text-speed', 'auto-speed', 'skip-mode'] },
];

// ─── Tab Initialization ────────────────────────────────

/**
 * If cfg.tabBar.tabs is absent or empty, deep-copy DEFAULT_TABS into it.
 * @param {object|null} cfg - settingsScreen config object
 * @returns {object|null} cfg (or null if cfg is falsy)
 */
export function ensureDefaultTabs(cfg) {
  if (!cfg) return null;
  cfg.tabBar ??= {};
  if (!Array.isArray(cfg.tabBar.tabs) || cfg.tabBar.tabs.length === 0) {
    cfg.tabBar.tabs = DEFAULT_TABS.map(t => ({
      ...t,
      settingKeys: [...t.settingKeys],
    }));
  }
  return cfg;
}

/** Toggle canonical tab mode without discarding existing assignments. */
export function setTabBarEnabled(cfg, enabled) {
  if (!cfg) return null;
  cfg.tabBar ??= {};
  cfg.tabBar.enabled = enabled !== false;
  if (cfg.tabBar.enabled) ensureDefaultTabs(cfg);
  return cfg;
}

// ─── Tab CRUD ──────────────────────────────────────────

export function addTab(cfg) {
  if (!cfg) return;
  cfg.tabBar ??= {};
  cfg.tabBar.tabs ??= [];
  cfg.tabBar.tabs.push({ label: '新标签', settingKeys: [] });
}

export function deleteTab(cfg, index) {
  if (!cfg?.tabBar?.tabs) return;
  cfg.tabBar.tabs.splice(index, 1);
}

export function setTabLabel(cfg, index, label) {
  if (!cfg?.tabBar?.tabs?.[index]) return;
  cfg.tabBar.tabs[index].label = label;
}

export function setTabIcon(cfg, index, icon) {
  if (!cfg?.tabBar?.tabs?.[index]) return;
  cfg.tabBar.tabs[index].icon = icon;
}

// ─── Setting Key Assignment ────────────────────────────

/**
 * Exclusive toggle: assign key to tabIndex (removing from others),
 * or unassign if already in that tab.
 */
export function toggleKeyAssignment(cfg, key, tabIndex) {
  if (!cfg?.tabBar?.tabs) return;
  const tabs = cfg.tabBar.tabs;

  const wasInTarget = tabs[tabIndex]?.settingKeys?.includes(key);

  // Remove key from ALL tabs
  for (const tab of tabs) {
    if (!tab.settingKeys) continue;
    const idx = tab.settingKeys.indexOf(key);
    if (idx !== -1) tab.settingKeys.splice(idx, 1);
  }

  // If it wasn't in the target tab, assign it there
  if (!wasInTarget && tabs[tabIndex]) {
    tabs[tabIndex].settingKeys ??= [];
    tabs[tabIndex].settingKeys.push(key);
  }
}

/**
 * Returns keys from allKeys not assigned to any tab.
 */
export function getUnassignedKeys(tabs, allKeys) {
  const assigned = new Set();
  if (Array.isArray(tabs)) {
    for (const tab of tabs) {
      if (Array.isArray(tab.settingKeys)) {
        for (const k of tab.settingKeys) assigned.add(k);
      }
    }
  }
  return allKeys.filter(k => !assigned.has(k));
}

export function isKeyInTab(tabs, key, tabIndex) {
  return tabs?.[tabIndex]?.settingKeys?.includes(key) ?? false;
}
