/**
 * Color Recipe persistence + three-layer merge tests (COLOR-05)
 *
 * Tests the merge logic: finalTokens = { ...deriveTokens(recipe), ...overrides }
 * Covers: recipe derivation, override priority, override persistence across
 * recipe changes, clearTokenOverrides behavior, dark/light mode switching.
 *
 * Run with: npx vitest run tests/colorRecipe.test.js
 */

import { describe, it } from 'node:test';
import { strictEqual, ok, deepStrictEqual, notStrictEqual } from 'node:assert/strict';
import { deriveTokens } from '../src/engine/oklch.js';
import { DEFAULT_TOKENS } from '../src/engine/tokens.js';

// ─── Helpers ──────────────────────────────────────────

const COLOR_KEYS = Object.keys(DEFAULT_TOKENS).filter(
  (k) => !['font-body', 'font-display', 'radius', 'radius-lg', 'blur'].includes(k),
);

function threeMerge(recipe, overrides = {}) {
  const derived = deriveTokens(recipe.primary, recipe.accent, recipe.mode);
  return { ...derived, ...overrides };
}

// ─── Group 1: Derivation Output Completeness ──────────

describe('Color Recipe — derivation output', () => {
  it('deriveTokens dark mode produces all 36 color token keys', () => {
    const tokens = deriveTokens('#7733aa', '#ff6b9d', 'dark');
    const keys = Object.keys(tokens);
    strictEqual(keys.length, 36);
    for (const key of COLOR_KEYS) {
      ok(key in tokens, `missing token: ${key}`);
    }
  });

  it('deriveTokens light mode produces all 36 color token keys', () => {
    const tokens = deriveTokens('#7733aa', '#ff6b9d', 'light');
    strictEqual(Object.keys(tokens).length, 36);
  });

  it('auto-accent (null) produces valid 36-token set', () => {
    const tokens = deriveTokens('#3366cc', null, 'dark');
    strictEqual(Object.keys(tokens).length, 36);
    ok(tokens['primary'].startsWith('rgba('), 'primary should be rgba');
  });

  it('dark and light modes produce different text tokens', () => {
    const dark = deriveTokens('#7733aa', '#ff6b9d', 'dark');
    const light = deriveTokens('#7733aa', '#ff6b9d', 'light');
    notStrictEqual(dark['text'], light['text']);
    notStrictEqual(dark['panel-bg'], light['panel-bg']);
  });
});

// ─── Group 2: Three-Layer Merge (D-08) ────────────────

describe('Color Recipe — three-layer merge', () => {
  const recipe = { primary: '#7733aa', accent: '#ff6b9d', mode: 'dark' };

  it('with no overrides, final tokens equal derived tokens', () => {
    const derived = deriveTokens(recipe.primary, recipe.accent, recipe.mode);
    const final = threeMerge(recipe, {});
    deepStrictEqual(final, derived);
  });

  it('override wins over derived value', () => {
    const overrides = { 'primary': '#ff0000' };
    const final = threeMerge(recipe, overrides);
    strictEqual(final['primary'], '#ff0000');
  });

  it('non-overridden tokens remain derived', () => {
    const derived = deriveTokens(recipe.primary, recipe.accent, recipe.mode);
    const overrides = { 'primary': '#ff0000' };
    const final = threeMerge(recipe, overrides);
    strictEqual(final['text'], derived['text']);
    strictEqual(final['panel-bg'], derived['panel-bg']);
  });

  it('multiple overrides all persist', () => {
    const overrides = {
      'primary': '#ff0000',
      'accent': 'rgba(0, 255, 0, 0.50)',
      'btn-bg': 'rgba(100, 100, 100, 0.80)',
    };
    const final = threeMerge(recipe, overrides);
    strictEqual(final['primary'], '#ff0000');
    strictEqual(final['accent'], 'rgba(0, 255, 0, 0.50)');
    strictEqual(final['btn-bg'], 'rgba(100, 100, 100, 0.80)');
  });
});

// ─── Group 3: Override Persistence Across Recipe Changes ─

describe('Color Recipe — overrides survive recipe changes (D-09)', () => {
  it('overrides persist when primary changes', () => {
    const overrides = { 'primary': '#custom1' };
    const recipe1 = { primary: '#7733aa', accent: '#ff6b9d', mode: 'dark' };
    const recipe2 = { primary: '#3366cc', accent: '#ff6b9d', mode: 'dark' };

    const final1 = threeMerge(recipe1, overrides);
    const final2 = threeMerge(recipe2, overrides);

    strictEqual(final1['primary'], '#custom1');
    strictEqual(final2['primary'], '#custom1');
    // Non-overridden token should change with recipe
    notStrictEqual(final1['btn-bg'], final2['btn-bg']);
  });

  it('overrides persist when mode changes', () => {
    const overrides = { 'accent': 'rgba(0, 0, 0, 1.00)' };
    const dark = threeMerge({ primary: '#7733aa', accent: '#ff6b9d', mode: 'dark' }, overrides);
    const light = threeMerge({ primary: '#7733aa', accent: '#ff6b9d', mode: 'light' }, overrides);

    strictEqual(dark['accent'], 'rgba(0, 0, 0, 1.00)');
    strictEqual(light['accent'], 'rgba(0, 0, 0, 1.00)');
  });
});

// ─── Group 4: Clear Overrides ─────────────────────────

describe('Color Recipe — clear overrides (D-22)', () => {
  it('clearing overrides restores fully derived tokens', () => {
    const recipe = { primary: '#7733aa', accent: '#ff6b9d', mode: 'dark' };
    const derived = deriveTokens(recipe.primary, recipe.accent, recipe.mode);
    const overrides = { 'primary': '#custom', 'text': 'rgba(0,0,0,1)' };

    const withOverrides = threeMerge(recipe, overrides);
    notStrictEqual(withOverrides['primary'], derived['primary']);

    const cleared = threeMerge(recipe, {});
    deepStrictEqual(cleared, derived);
  });
});
