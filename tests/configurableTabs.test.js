/**
 * Tests for Phase 53 — Configurable Tabs Engine.
 *
 * Covers normalizeTabs(), resolveTabSettingKeys(), and backward-compatible
 * rendering logic in SettingsScreen.
 *
 * Run: node --test tests/configurableTabs.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// ── Import SUT ────────────────────────────────────────────
import { normalizeTabs, resolveTabSettingKeys } from '../src/ui/SettingsScreen.js';
import { createTabBar } from '../src/ui/widgets/TabWidget.js';
import { SETTING_DEFS } from '../src/engine/settingDefs.js';

const ALL_KEYS = Object.keys(SETTING_DEFS);

// ── 1. normalizeTabs ─────────────────────────────────────

describe('normalizeTabs', () => {
  it('returns null for undefined input', () => {
    assert.equal(normalizeTabs(undefined), null);
  });

  it('returns null for null input', () => {
    assert.equal(normalizeTabs(null), null);
  });

  it('returns null for empty array', () => {
    assert.equal(normalizeTabs([]), null);
  });

  it('converts string array to object array', () => {
    const result = normalizeTabs(['A', 'B']);
    assert.deepStrictEqual(result, [{ label: 'A' }, { label: 'B' }]);
  });

  it('passes through object array unchanged', () => {
    const input = [{ label: 'X', icon: 'x.png', settingKeys: ['bgm-volume'] }];
    const result = normalizeTabs(input);
    assert.deepStrictEqual(result, input);
  });

  it('returns null for non-array input', () => {
    assert.equal(normalizeTabs('not-array'), null);
    assert.equal(normalizeTabs(42), null);
  });

  it('handles single-element string array', () => {
    const result = normalizeTabs(['Solo']);
    assert.deepStrictEqual(result, [{ label: 'Solo' }]);
  });
});

// ── 2. resolveTabSettingKeys ─────────────────────────────

describe('resolveTabSettingKeys', () => {
  it('uses explicit settingKeys when provided', () => {
    const tabs = [
      { label: 'A', settingKeys: ['bgm-volume', 'se-volume'] },
      { label: 'B', settingKeys: ['text-speed'] },
    ];
    const resolved = resolveTabSettingKeys(tabs);
    assert.deepStrictEqual(resolved[0].settingKeys.slice(0, 2), ['bgm-volume', 'se-volume']);
    assert.deepStrictEqual(resolved[1].settingKeys[0], 'text-speed');
  });

  it('falls back to SETTING_GROUP_KEYS for tabs without settingKeys', () => {
    const tabs = [{ label: '声音' }, { label: '画面' }, { label: '游戏' }];
    const resolved = resolveTabSettingKeys(tabs);
    // Tab 0 should have the sound settings (master, bgm, se, voice)
    assert.ok(resolved[0].settingKeys.includes('master-volume'));
    assert.ok(resolved[0].settingKeys.includes('bgm-volume'));
  });

  it('appends unassigned keys to last tab', () => {
    const tabs = [
      { label: 'A', settingKeys: ['bgm-volume'] },
    ];
    const resolved = resolveTabSettingKeys(tabs);
    // Single tab = last tab, should get all remaining 8 keys
    const totalKeys = resolved[0].settingKeys.length;
    assert.equal(totalKeys, ALL_KEYS.length, `expected all ${ALL_KEYS.length} keys, got ${totalKeys}`);
  });

  it('removes duplicate keys across tabs (keeps first occurrence)', () => {
    const tabs = [
      { label: 'A', settingKeys: ['bgm-volume', 'se-volume'] },
      { label: 'B', settingKeys: ['bgm-volume', 'text-speed'] },
    ];
    const resolved = resolveTabSettingKeys(tabs);
    // bgm-volume should only be in A, not B
    assert.ok(resolved[0].settingKeys.includes('bgm-volume'));
    assert.ok(!resolved[1].settingKeys.includes('bgm-volume'));
    assert.ok(resolved[1].settingKeys.includes('text-speed'));
  });

  it('all SETTING_DEFS keys appear exactly once across all tabs', () => {
    const tabs = [
      { label: 'A', settingKeys: ['bgm-volume', 'se-volume'] },
      { label: 'B', settingKeys: ['text-speed'] },
    ];
    const resolved = resolveTabSettingKeys(tabs);
    const allResolved = resolved.flatMap(t => t.settingKeys);
    const uniqueResolved = new Set(allResolved);
    // Every SETTING_DEFS key present
    for (const k of ALL_KEYS) {
      assert.ok(uniqueResolved.has(k), `Missing key: ${k}`);
    }
    // No duplicates
    assert.equal(allResolved.length, uniqueResolved.size, 'Duplicate keys detected');
  });

  it('preserves icon property in resolved output', () => {
    const tabs = [
      { label: 'Sound', icon: 'icons/sound.png', settingKeys: ['bgm-volume'] },
    ];
    const resolved = resolveTabSettingKeys(tabs);
    assert.equal(resolved[0].icon, 'icons/sound.png');
  });

  it('handles 4+ custom tabs', () => {
    const tabs = [
      { label: 'A', settingKeys: ['bgm-volume'] },
      { label: 'B', settingKeys: ['se-volume'] },
      { label: 'C', settingKeys: ['voice-volume'] },
      { label: 'D', settingKeys: ['text-speed'] },
    ];
    const resolved = resolveTabSettingKeys(tabs);
    assert.equal(resolved.length, 4);
    // Remaining 5 keys appended to tab D (last)
    const lastKeys = resolved[3].settingKeys;
    assert.ok(lastKeys.includes('text-speed'));
    assert.ok(lastKeys.length > 1, 'Last tab should have text-speed + unassigned keys');
  });
});

// ── 3. Integration — 4-tab config ───────────────────────

describe('Integration: 4-tab configuration', () => {
  it('4 tabs each with custom labels produce 4 resolved entries', () => {
    const tabs = normalizeTabs([
      { label: 'Audio', settingKeys: ['master-volume', 'bgm-volume', 'se-volume', 'voice-volume'] },
      { label: 'Display', settingKeys: ['dialogue-opacity', 'window-mode'] },
      { label: 'Gameplay', settingKeys: ['text-speed', 'auto-speed'] },
      { label: 'Advanced', settingKeys: ['skip-mode'] },
    ]);
    const resolved = resolveTabSettingKeys(tabs);
    assert.equal(resolved.length, 4);
    assert.equal(resolved[0].label, 'Audio');
    assert.equal(resolved[3].label, 'Advanced');
  });

  it('tab with icon has label + icon in resolved output', () => {
    const tabs = normalizeTabs([
      { label: 'Sound', icon: 'icons/vol.png', settingKeys: ['bgm-volume'] },
    ]);
    const resolved = resolveTabSettingKeys(tabs);
    assert.equal(resolved[0].label, 'Sound');
    assert.equal(resolved[0].icon, 'icons/vol.png');
    assert.ok(Array.isArray(resolved[0].settingKeys));
  });

  it('all 9 setting keys are accounted for in resolved tabs', () => {
    const tabs = normalizeTabs([
      { label: 'A', settingKeys: ['bgm-volume', 'se-volume'] },
      { label: 'B', settingKeys: ['text-speed', 'auto-speed'] },
    ]);
    const resolved = resolveTabSettingKeys(tabs);
    const total = resolved.reduce((sum, t) => sum + t.settingKeys.length, 0);
    assert.equal(total, ALL_KEYS.length, `Expected ${ALL_KEYS.length} total keys`);
  });
});

// ── 4. Backward compatibility ────────────────────────────

describe('Backward compatibility', () => {
  it('undefined tabBar.tabs → null from normalizeTabs', () => {
    assert.equal(normalizeTabs(undefined), null);
  });

  it('string array tabBar.tabs → converted to objects', () => {
    const result = normalizeTabs(['声音', '画面', '游戏']);
    assert.equal(result.length, 3);
    assert.equal(result[0].label, '声音');
    assert.equal(result[2].label, '游戏');
  });

  it('3-tab defaults produce same key grouping as SETTING_GROUP_KEYS', () => {
    const defaults = ['声音', '画面', '游戏'].map((label, i) => ({
      label,
    }));
    const resolved = resolveTabSettingKeys(defaults);
    // Tab 0 should have sound keys
    assert.ok(resolved[0].settingKeys.includes('master-volume'));
    assert.ok(resolved[0].settingKeys.includes('bgm-volume'));
    // Tab 1 should have display keys
    assert.ok(resolved[1].settingKeys.includes('dialogue-opacity'));
    assert.ok(resolved[1].settingKeys.includes('window-mode'));
    // Tab 2 should have gameplay keys
    assert.ok(resolved[2].settingKeys.includes('text-speed'));
    assert.ok(resolved[2].settingKeys.includes('skip-mode'));
  });
});

// ── 5. Widget tab selected-state parity ───────────────────

describe('createTabBar selected-state parity', () => {
  it('setActive toggles .active on gm-tab buttons', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost/',
    });
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    const previousHTMLElement = globalThis.HTMLElement;
    const previousHTMLButtonElement = globalThis.HTMLButtonElement;
    const previousHTMLDivElement = globalThis.HTMLDivElement;

    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    globalThis.HTMLElement = dom.window.HTMLElement;
    globalThis.HTMLButtonElement = dom.window.HTMLButtonElement;
    globalThis.HTMLDivElement = dom.window.HTMLDivElement;

    try {
      const { el, setActive } = createTabBar(['声音', '画面', '游戏'], {}, () => {});
      const buttons = Array.from(el.querySelectorAll('.gm-tab'));

      assert.equal(buttons.length, 3);
      assert.equal(buttons[0].classList.contains('active'), true);
      assert.equal(buttons[1].classList.contains('active'), false);
      assert.equal(buttons[2].classList.contains('active'), false);

      setActive(1);
      assert.equal(buttons[0].classList.contains('active'), false);
      assert.equal(buttons[1].classList.contains('active'), true);
      assert.equal(buttons[2].classList.contains('active'), false);

      setActive(2);
      assert.equal(buttons[1].classList.contains('active'), false);
      assert.equal(buttons[2].classList.contains('active'), true);
    } finally {
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
      globalThis.HTMLElement = previousHTMLElement;
      globalThis.HTMLButtonElement = previousHTMLButtonElement;
      globalThis.HTMLDivElement = previousHTMLDivElement;
      dom.window.close();
    }
  });
});
