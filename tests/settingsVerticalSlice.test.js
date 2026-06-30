/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigManager } from '../src/engine/ConfigManager.js';
import { SETTING_DEFS } from '../src/engine/settingDefs.js';
import { SettingsScreen } from '../src/ui/SettingsScreen.js';
import { adaptLegacyUiScreen } from '../src/shared/uiLegacyAdapters.js';
import {
  REGISTERED_SETTING_IDS,
  normalizeSettingsAssignments,
} from '../src/shared/settingsScreenContract.js';
import { validateUiDocument } from '../src/shared/uiDocumentContract.js';
import { createProjectSession } from '../src/authoring/projectSession.js';
import { scanAssets } from '../src/engine/scanAssets.js';
import { projectCanonicalThemeScreens } from '../src/shared/uiLegacyAdapters.js';
import {
  applySyntheticNodeOperation,
  applySyntheticNodePatch,
  addSettingsTab,
  getSyntheticNodeOperations,
  removeSettingsTab,
} from '../src/editor/screen-designer/unifiedEditorShellModel.js';

const baseScript = settingsScreen => ({
  projectId: 'settings_phase8_fixture',
  meta: { resolution: { width: 1280, height: 720 } },
  characters: {},
  scenes: {},
  ui: { settingsScreen },
});

function assignedSettingIds(document) {
  return document.nodes.filter(node => node.type === 'settings-control').map(node => node.content.settingId);
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  globalThis.requestAnimationFrame = callback => callback();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Phase 8 canonical Settings vertical slice', () => {
  it('keeps first duplicate assignments, diagnoses unknown keys, and appends every unassigned registered setting', () => {
    const result = normalizeSettingsAssignments([
      { id: 'a', label: 'A', settingKeys: ['bgm-volume', 'unknown-setting'] },
      { id: 'b', label: 'B', settingKeys: ['bgm-volume', 'text-speed'] },
    ]);
    expect(result.tabs[0].settingIds).toEqual(['bgm-volume']);
    expect(result.tabs[1].settingIds.slice(0, 1)).toEqual(['text-speed']);
    expect(result.tabs.flatMap(tab => tab.settingIds)).toEqual(expect.arrayContaining(REGISTERED_SETTING_IDS));
    expect(new Set(result.tabs.flatMap(tab => tab.settingIds)).size).toBe(REGISTERED_SETTING_IDS.length);
    expect(result.diagnostics.map(item => item.code)).toEqual(['settings-assignment-unknown', 'settings-assignment-duplicate']);
  });

  it.each([
    ['tabbed', { tabBar: { enabled: true, tabs: [{ label: 'A', settingKeys: ['bgm-volume', 'bgm-volume', 'bad'] }, { label: 'B', settingKeys: [] }] }, contentArea: {} }],
    ['single-page', { tabBar: { enabled: false }, contentArea: {} }],
  ])('maps legacy %s mode to one valid canonical control per registered setting', (mode, legacy) => {
    const adapted = adaptLegacyUiScreen(baseScript(legacy), 'settings');
    expect(adapted.document.behavior.mode).toBe(mode);
    expect(assignedSettingIds(adapted.document).sort()).toEqual([...REGISTERED_SETTING_IDS].sort());
    expect(validateUiDocument(adapted.document, { screenId: 'settings' }).filter(item => item.severity === 'error')).toEqual([]);
  });

  it('rejects unknown, duplicate, and missing canonical controls', () => {
    const document = adaptLegacyUiScreen(baseScript({ tabBar: { enabled: false }, contentArea: {} }), 'settings').document;
    const first = document.nodes.find(node => node.type === 'settings-control');
    first.content.settingId = 'unknown-setting';
    const duplicate = document.nodes.find(node => node.type === 'settings-control' && node !== first);
    duplicate.content.settingId = document.nodes.filter(node => node.type === 'settings-control')[2].content.settingId;
    const codes = validateUiDocument(document, { screenId: 'settings' }).map(item => item.code);
    expect(codes).toContain('settings-control-key-unknown');
    expect(codes).toContain('settings-control-key-duplicate');
    expect(codes).toContain('settings-control-key-missing');
  });

  it('renders canonical controls through the shared renderer while ConfigManager owns values, persistence, and reset', () => {
    const legacy = {
      tabBar: { enabled: true, tabs: [{ label: '声音', settingKeys: ['master-volume'] }, { label: '其余', settingKeys: [] }] },
      contentArea: {},
      footer: { buttons: [{ id: 'reset', text: '重置', action: 'reset' }, { id: 'title', text: '标题', action: 'title' }] },
    };
    const canonical = adaptLegacyUiScreen(baseScript(legacy), 'settings').document;
    Object.assign(canonical.nodes.find(node => node.content?.settingId === 'window-mode').content, {
      presentation: 'toggle', trueValue: 'fullscreen', falseValue: 'windowed',
    });
    const container = document.body.appendChild(document.createElement('div'));
    const config = new ConfigManager('phase8-settings-test');
    const screen = new SettingsScreen(container, config);
    const title = vi.fn();
    screen.onTitle = title;
    screen.setLayout(legacy, { canonicalDocument: canonical });
    screen.show();

    expect(screen.el.querySelectorAll('[data-gm-ui-node-type="settings-control"]')).toHaveLength(Object.keys(SETTING_DEFS).length);
    expect(screen.el.querySelectorAll('.settings-tab-btn')).toHaveLength(2);
    expect(screen.el.querySelectorAll('[data-gm-ui-node-type="settings-group"][hidden]')).toHaveLength(1);

    const slider = screen.el.querySelector('[data-gm-ui-node-id="settings.control.master-volume"] input[type="range"]');
    slider.value = '0.42';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(config.get('masterVolume')).toBe(0.42);
    expect(JSON.parse(localStorage.getItem('phase8-settings-test')).masterVolume).toBe(0.42);

    screen.el.querySelectorAll('.settings-tab-btn')[1].click();
    const toggle = screen.el.querySelector('[data-gm-ui-node-id="settings.control.window-mode"] input[type="checkbox"]');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    expect(config.get('windowMode')).toBe('fullscreen');

    screen.el.querySelector('[data-gm-ui-node-id="settings.reset"]').click();
    expect(config.get('masterVolume')).toBe(config.defaults.masterVolume);
    screen.el.querySelector('[data-gm-ui-node-id="settings.title"]').click();
    expect(title).toHaveBeenCalledTimes(1);
    expect(screen.isVisible).toBe(false);
  });

  it('renders all canonical controls together in single-page mode and restores focus when closed', () => {
    const legacy = { tabBar: { enabled: false }, contentArea: {} };
    const canonical = adaptLegacyUiScreen(baseScript(legacy), 'settings').document;
    const opener = document.body.appendChild(document.createElement('button'));
    opener.focus();
    const screen = new SettingsScreen(document.body, new ConfigManager('phase8-single-page'));
    screen.setLayout(legacy, { canonicalDocument: canonical });
    screen.show();
    expect(screen.el.querySelector('[data-gm-ui-node-type="tab-bar"]').hidden).toBe(true);
    expect(screen.el.querySelectorAll('[data-gm-ui-node-type="settings-group"][hidden]')).toHaveLength(0);
    screen.el.querySelector('[data-gm-ui-node-id="settings.headerClose"]').click();
    expect(document.activeElement).toBe(opener);
  });

  it('provides validated Settings migration/set/update authoring operations with changed paths', () => {
    const script = baseScript({ tabBar: { enabled: false }, contentArea: {} });
    const session = createProjectSession({ script });
    const migrated = session.migrateSettingsScreen();
    expect(migrated.changedPaths).toEqual(['ui.screenSchemaVersion', 'ui.screenAuthorities.settings', 'ui.screens.settings']);
    expect(session.toJSON().ui.screenAuthorities.settings).toBe('canonical-active');
    const updated = session.updateSettingsNode({ nodeId: 'settings.header', path: 'content.text', value: 'Options' });
    expect(updated.changedPaths).toEqual(['ui.screens.settings.nodes.settings.header']);
    expect(session.toJSON().ui.screens.settings.nodes.find(node => node.id === 'settings.header').content.text).toBe('Options');
  });

  it('keeps Settings semantic invariants protected while preserving Agent-authored fields through shell edits', () => {
    const document = adaptLegacyUiScreen(baseScript({ tabBar: { enabled: false }, contentArea: {} }), 'settings').document;
    const control = document.nodes.find(node => node.type === 'settings-control');
    control.agentAuthored = { review: 'preserve-me' };
    const operations = getSyntheticNodeOperations(document, control.id);
    expect(operations.find(operation => operation.id === 'delete').enabled).toBe(false);
    expect(operations.find(operation => operation.id === 'duplicate').enabled).toBe(false);
    const deleted = applySyntheticNodeOperation(document, control.id, 'delete');
    expect(deleted.changed).toBe(false);
    const patched = applySyntheticNodePatch(document, control.id, { path: 'style.color', value: '#abcdef' });
    const next = patched.nodes.find(node => node.id === control.id);
    expect(next.content.settingId).toBe(control.content.settingId);
    expect(next.parts).toEqual(['control']);
    expect(next.agentAuthored).toEqual({ review: 'preserve-me' });
  });

  it('projects canonical Settings into gmtheme data and routes its assets through scanning', () => {
    const script = baseScript({ tabBar: { enabled: false }, contentArea: {} });
    const document = adaptLegacyUiScreen(script, 'settings').document;
    document.nodes.push({
      id: 'settings.badge', type: 'image', parentId: 'settings.root', order: 99,
      layout: document.nodes[0].layout, parts: [], asset: { kind: 'image', path: 'ui/settings/badge.png' }, content: { alt: '' },
    });
    script.ui.screenSchemaVersion = 2;
    script.ui.screens = { settings: document };
    script.ui.screenAuthorities = { settings: 'canonical-active' };
    expect(projectCanonicalThemeScreens(script).screens.settings.nodes.some(node => node.id === 'settings.badge')).toBe(true);
    expect(scanAssets(script).backgrounds).toContain('ui/settings/badge.png');
  });

  it('supports bounded tab CRUD without losing or duplicating registered controls', () => {
    const original = adaptLegacyUiScreen(baseScript({ tabBar: { enabled: true }, contentArea: {} }), 'settings').document;
    const added = addSettingsTab(original, 'Accessibility');
    expect(added.changed).toBe(true);
    expect(added.document.nodes.filter(node => node.type === 'settings-group')).toHaveLength(4);
    expect(added.document.nodes.find(node => node.type === 'tab-bar').content.tabs.at(-1).label).toBe('Accessibility');
    const renamed = applySyntheticNodePatch(added.document, added.selectedNodeId, { path: 'content.label', value: 'Controls' });
    expect(renamed.nodes.find(node => node.type === 'tab-bar').content.tabs.at(-1).label).toBe('Controls');
    const removed = removeSettingsTab(renamed, added.selectedNodeId);
    expect(removed.changed).toBe(true);
    expect(removed.document.nodes.filter(node => node.type === 'settings-group')).toHaveLength(3);
    expect(assignedSettingIds(removed.document).sort()).toEqual([...REGISTERED_SETTING_IDS].sort());
    expect(validateUiDocument(removed.document, { screenId: 'settings' }).filter(item => item.severity === 'error')).toEqual([]);
  });
});
