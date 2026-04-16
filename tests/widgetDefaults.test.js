/**
 * widgetDefaults unit tests
 *
 * Covers WIDGET_DEFAULTS constant shape and deepMergeWidgetStyles
 * merge logic: null, undefined, empty, partial override, null-field
 * fallback, unknown keys, and frozen-ness.
 *
 * Run with: node --test tests/widgetDefaults.test.js
 */

import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual, ok } from 'node:assert/strict';
import { WIDGET_DEFAULTS, deepMergeWidgetStyles } from '../src/engine/widgetDefaults.js';

// ─── Helpers ──────────────────────────────────────────────

const KNOWN_KEYS = ['tab', 'toggle', 'slider', 'panel', 'button'];

describe('deepMergeWidgetStyles', () => {
  it('returns object with all 5 keys when called with null', () => {
    const result = deepMergeWidgetStyles(null);
    deepStrictEqual(Object.keys(result).sort(), KNOWN_KEYS.sort());
    // Each field must match WIDGET_DEFAULTS exactly
    for (const key of KNOWN_KEYS) {
      deepStrictEqual(result[key], { ...WIDGET_DEFAULTS[key] });
    }
  });

  it('returns same as null when called with undefined', () => {
    const result = deepMergeWidgetStyles(undefined);
    deepStrictEqual(Object.keys(result).sort(), KNOWN_KEYS.sort());
    for (const key of KNOWN_KEYS) {
      deepStrictEqual(result[key], { ...WIDGET_DEFAULTS[key] });
    }
  });

  it('returns same as WIDGET_DEFAULTS for empty object (no overrides)', () => {
    const result = deepMergeWidgetStyles({});
    for (const key of KNOWN_KEYS) {
      deepStrictEqual(result[key], { ...WIDGET_DEFAULTS[key] });
    }
  });

  it('merges partial tab override — shape=pill, rest defaults', () => {
    const result = deepMergeWidgetStyles({ tab: { shape: 'pill' } });
    strictEqual(result.tab.shape, 'pill');
    strictEqual(result.tab.activeColor, WIDGET_DEFAULTS.tab.activeColor);
    strictEqual(result.tab.inactiveColor, WIDGET_DEFAULTS.tab.inactiveColor);
    strictEqual(result.tab.activeTextColor, WIDGET_DEFAULTS.tab.activeTextColor);
    strictEqual(result.tab.fontSize, WIDGET_DEFAULTS.tab.fontSize);
  });

  it('falls back null field to default — slider.thumbColor null', () => {
    const result = deepMergeWidgetStyles({ slider: { thumbColor: null } });
    strictEqual(result.slider.thumbColor, WIDGET_DEFAULTS.slider.thumbColor);
    strictEqual(result.slider.trackColor, WIDGET_DEFAULTS.slider.trackColor);
    strictEqual(result.slider.fillColor, WIDGET_DEFAULTS.slider.fillColor);
  });

  it('overrides only specified field — toggle.onLabel', () => {
    const result = deepMergeWidgetStyles({ toggle: { onLabel: '开' } });
    strictEqual(result.toggle.onLabel, '开');
    strictEqual(result.toggle.offLabel, WIDGET_DEFAULTS.toggle.offLabel);
    strictEqual(result.toggle.style, WIDGET_DEFAULTS.toggle.style);
    strictEqual(result.toggle.onColor, WIDGET_DEFAULTS.toggle.onColor);
    strictEqual(result.toggle.width, WIDGET_DEFAULTS.toggle.width);
  });

  it('excludes unknown category keys — only 5 known categories', () => {
    const result = deepMergeWidgetStyles({ foo: 'bar', baz: { x: 1 } });
    deepStrictEqual(Object.keys(result).sort(), KNOWN_KEYS.sort());
    strictEqual(result.foo, undefined);
    strictEqual(result.baz, undefined);
  });

  it('WIDGET_DEFAULTS is frozen / unmodifiable', () => {
    ok(Object.isFrozen(WIDGET_DEFAULTS));
    ok(Object.isFrozen(WIDGET_DEFAULTS.tab));
    ok(Object.isFrozen(WIDGET_DEFAULTS.toggle));
    ok(Object.isFrozen(WIDGET_DEFAULTS.slider));
    ok(Object.isFrozen(WIDGET_DEFAULTS.panel));
    ok(Object.isFrozen(WIDGET_DEFAULTS.button));
    ok(Object.isFrozen(WIDGET_DEFAULTS.panel.padding));
  });
});
