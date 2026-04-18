/**
 * Tests for tabLayoutHelpers — pure data functions for tab CRUD
 * and setting-key assignment.
 *
 * Run: node --test tests/tabLayoutEditor.test.js
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_TABS,
  ensureDefaultTabs,
  addTab,
  deleteTab,
  setTabLabel,
  setTabIcon,
  toggleKeyAssignment,
  getUnassignedKeys,
  isKeyInTab,
} from '../src/editor/components/layout/tabLayoutHelpers.js';

// ─── ensureDefaultTabs ─────────────────────────────────

describe('ensureDefaultTabs', () => {
  it('returns null for falsy input', () => {
    assert.equal(ensureDefaultTabs(null), null);
    assert.equal(ensureDefaultTabs(undefined), null);
  });

  it('populates tabs when tabBar is absent', () => {
    const cfg = {};
    ensureDefaultTabs(cfg);
    assert.ok(Array.isArray(cfg.tabBar.tabs));
    assert.equal(cfg.tabBar.tabs.length, DEFAULT_TABS.length);
  });

  it('populates tabs when tabs array is empty', () => {
    const cfg = { tabBar: { tabs: [] } };
    ensureDefaultTabs(cfg);
    assert.equal(cfg.tabBar.tabs.length, DEFAULT_TABS.length);
  });

  it('does not overwrite existing non-empty tabs', () => {
    const cfg = { tabBar: { tabs: [{ label: 'X', settingKeys: [] }] } };
    ensureDefaultTabs(cfg);
    assert.equal(cfg.tabBar.tabs.length, 1);
    assert.equal(cfg.tabBar.tabs[0].label, 'X');
  });

  it('deep-copies DEFAULT_TABS so mutations do not leak', () => {
    const cfg1 = {};
    const cfg2 = {};
    ensureDefaultTabs(cfg1);
    ensureDefaultTabs(cfg2);
    cfg1.tabBar.tabs[0].label = 'changed';
    assert.notEqual(cfg2.tabBar.tabs[0].label, 'changed');
  });
});

// ─── addTab / deleteTab ────────────────────────────────

describe('addTab', () => {
  it('appends a new tab with default label', () => {
    const cfg = { tabBar: { tabs: [{ label: 'A', settingKeys: [] }] } };
    addTab(cfg);
    assert.equal(cfg.tabBar.tabs.length, 2);
    assert.equal(cfg.tabBar.tabs[1].label, '新标签');
    assert.deepEqual(cfg.tabBar.tabs[1].settingKeys, []);
  });

  it('creates tabBar.tabs if missing', () => {
    const cfg = {};
    addTab(cfg);
    assert.equal(cfg.tabBar.tabs.length, 1);
  });

  it('no-ops on null cfg', () => {
    addTab(null); // should not throw
  });
});

describe('deleteTab', () => {
  it('removes a tab by index', () => {
    const cfg = { tabBar: { tabs: [{ label: 'A' }, { label: 'B' }, { label: 'C' }] } };
    deleteTab(cfg, 1);
    assert.equal(cfg.tabBar.tabs.length, 2);
    assert.equal(cfg.tabBar.tabs[0].label, 'A');
    assert.equal(cfg.tabBar.tabs[1].label, 'C');
  });

  it('no-ops when tabs array is absent', () => {
    deleteTab({}, 0); // should not throw
    deleteTab(null, 0); // should not throw
  });
});

// ─── setTabLabel / setTabIcon ──────────────────────────

describe('setTabLabel / setTabIcon', () => {
  let cfg;
  beforeEach(() => {
    cfg = { tabBar: { tabs: [{ label: 'A', settingKeys: [] }] } };
  });

  it('sets label on valid index', () => {
    setTabLabel(cfg, 0, '测试');
    assert.equal(cfg.tabBar.tabs[0].label, '测试');
  });

  it('no-ops for out-of-range index', () => {
    setTabLabel(cfg, 5, 'nope'); // should not throw
  });

  it('sets icon on valid index', () => {
    setTabIcon(cfg, 0, 'sound.png');
    assert.equal(cfg.tabBar.tabs[0].icon, 'sound.png');
  });

  it('no-ops for null cfg', () => {
    setTabIcon(null, 0, 'icon'); // should not throw
  });
});

// ─── toggleKeyAssignment ───────────────────────────────

describe('toggleKeyAssignment', () => {
  let cfg;
  beforeEach(() => {
    cfg = {
      tabBar: {
        tabs: [
          { label: 'A', settingKeys: ['bgm-volume'] },
          { label: 'B', settingKeys: ['text-speed'] },
        ],
      },
    };
  });

  it('assigns key to target tab, removing from previous', () => {
    toggleKeyAssignment(cfg, 'bgm-volume', 1);
    assert.ok(!cfg.tabBar.tabs[0].settingKeys.includes('bgm-volume'));
    assert.ok(cfg.tabBar.tabs[1].settingKeys.includes('bgm-volume'));
  });

  it('unassigns key when toggled in same tab', () => {
    toggleKeyAssignment(cfg, 'bgm-volume', 0);
    assert.ok(!cfg.tabBar.tabs[0].settingKeys.includes('bgm-volume'));
    assert.ok(!cfg.tabBar.tabs[1].settingKeys.includes('bgm-volume'));
  });

  it('assigns previously unassigned key', () => {
    toggleKeyAssignment(cfg, 'skip-mode', 0);
    assert.ok(cfg.tabBar.tabs[0].settingKeys.includes('skip-mode'));
  });

  it('no-ops for null cfg', () => {
    toggleKeyAssignment(null, 'x', 0); // should not throw
  });
});

// ─── getUnassignedKeys / isKeyInTab ────────────────────

describe('getUnassignedKeys / isKeyInTab', () => {
  const allKeys = ['a', 'b', 'c', 'd'];
  const tabs = [
    { label: 'T1', settingKeys: ['a', 'c'] },
    { label: 'T2', settingKeys: ['d'] },
  ];

  it('returns keys not assigned to any tab', () => {
    const unassigned = getUnassignedKeys(tabs, allKeys);
    assert.deepEqual(unassigned, ['b']);
  });

  it('returns all keys when tabs is null', () => {
    assert.deepEqual(getUnassignedKeys(null, allKeys), allKeys);
  });

  it('returns all keys when tabs is empty', () => {
    assert.deepEqual(getUnassignedKeys([], allKeys), allKeys);
  });

  it('isKeyInTab returns true for present key', () => {
    assert.ok(isKeyInTab(tabs, 'a', 0));
  });

  it('isKeyInTab returns false for absent key', () => {
    assert.ok(!isKeyInTab(tabs, 'b', 0));
  });

  it('isKeyInTab returns false for out-of-range tab', () => {
    assert.ok(!isKeyInTab(tabs, 'a', 99));
  });

  it('isKeyInTab returns false for null tabs', () => {
    assert.ok(!isKeyInTab(null, 'a', 0));
  });
});
