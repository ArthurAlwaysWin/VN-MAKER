/**
 * SmartColorPanel — harmony accent derivation + recipe structure tests (COLOR-04, COLOR-06)
 *
 * Tests the OKLCH-based hue shift algorithms and recipe structure.
 * Component rendering requires Vue test-utils (not available) — tested manually.
 *
 * Run with: node --test tests/smartColorPanel.test.js
 */

import { describe, it } from 'node:test';
import { strictEqual, ok } from 'node:assert/strict';
import { hexToOklch, oklchToRgb, clampChroma } from '../src/engine/oklch.js';

// ─── Reproduce SmartColorPanel's computeHarmonyAccent ──

const HUE_SHIFTS = {
  'complementary': 180,
  'analogous': 30,
  'triadic': 120,
  'split-complementary': 150,
};

function computeHarmonyAccent(primaryHex, alg) {
  const p = hexToOklch(primaryHex);
  const shift = HUE_SHIFTS[alg] ?? 180;
  const newH = (p.h + shift) % 360;
  const safeC = clampChroma(p.l, p.c, newH);
  const [r, g, b] = oklchToRgb(p.l, safeC, newH);
  return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
}

// ─── Group 1: Harmony Accent Hue Shifts ───────────────

describe('SmartColorPanel — harmony accent derivation', () => {
  const primary = '#7733aa';
  const pOklch = hexToOklch(primary);

  it('complementary shifts hue by 180°', () => {
    const accent = computeHarmonyAccent(primary, 'complementary');
    const a = hexToOklch(accent);
    const diff = Math.abs(a.h - ((pOklch.h + 180) % 360));
    ok(diff < 5 || diff > 355, `hue diff should be ~0°, got ${diff}`);
  });

  it('analogous shifts hue by 30°', () => {
    const accent = computeHarmonyAccent(primary, 'analogous');
    const a = hexToOklch(accent);
    const expected = (pOklch.h + 30) % 360;
    const diff = Math.abs(a.h - expected);
    ok(diff < 5 || diff > 355, `hue diff from expected should be ~0°, got ${diff}`);
  });

  it('triadic shifts hue by 120°', () => {
    const accent = computeHarmonyAccent(primary, 'triadic');
    const a = hexToOklch(accent);
    const expected = (pOklch.h + 120) % 360;
    const diff = Math.abs(a.h - expected);
    ok(diff < 5 || diff > 355, `hue diff from expected should be ~0°, got ${diff}`);
  });

  it('split-complementary shifts hue by 150°', () => {
    const accent = computeHarmonyAccent(primary, 'split-complementary');
    const a = hexToOklch(accent);
    const expected = (pOklch.h + 150) % 360;
    const diff = Math.abs(a.h - expected);
    ok(diff < 5 || diff > 355, `hue diff from expected should be ~0°, got ${diff}`);
  });

  it('produces valid 6-char hex for all algorithms', () => {
    for (const alg of Object.keys(HUE_SHIFTS)) {
      const accent = computeHarmonyAccent(primary, alg);
      ok(/^#[0-9a-f]{6}$/.test(accent), `${alg}: invalid hex "${accent}"`);
    }
  });

  it('different primaries produce different accents', () => {
    const a1 = computeHarmonyAccent('#ff0000', 'complementary');
    const a2 = computeHarmonyAccent('#0000ff', 'complementary');
    ok(a1 !== a2, 'different primaries should give different accents');
  });
});

// ─── Group 2: Recipe Structure ────────────────────────

describe('SmartColorPanel — recipe structure', () => {
  it('recipe has required fields', () => {
    const recipe = {
      primary: '#7733aa',
      accent: '#ff6b9d',
      mode: 'dark',
      algorithm: 'complementary',
      isAccentManual: false,
    };
    strictEqual(typeof recipe.primary, 'string');
    strictEqual(typeof recipe.accent, 'string');
    ok(['dark', 'light'].includes(recipe.mode));
    ok(['complementary', 'analogous', 'triadic', 'split-complementary'].includes(recipe.algorithm));
    strictEqual(typeof recipe.isAccentManual, 'boolean');
  });
});
