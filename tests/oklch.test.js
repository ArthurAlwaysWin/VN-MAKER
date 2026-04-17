/**
 * OKLCH module unit tests
 *
 * Covers: RGB↔OKLCH roundtrip (COLOR-01), gamut clamping (COLOR-01),
 * rule table completeness (COLOR-02), deriveTokens correctness (COLOR-03),
 * auto-accent derivation, value format validation.
 *
 * Run with: npx vitest run tests/oklch.test.js
 */

import { describe, it } from 'node:test';
import { strictEqual, ok, deepStrictEqual } from 'node:assert/strict';
import {
  rgbToOklch,
  oklchToRgb,
  hexToOklch,
  isInGamut,
  clampChroma,
  deriveTokens,
} from '../src/engine/oklch.js';
import { DEFAULT_TOKENS } from '../src/engine/tokens.js';

// ─── Helpers ──────────────────────────────────────────

const COLOR_KEYS = Object.keys(DEFAULT_TOKENS).filter(
  (k) => !['font-body', 'font-display', 'radius', 'radius-lg', 'blur'].includes(k),
);

function assertClose(actual, expected, tolerance, msg) {
  ok(
    Math.abs(actual - expected) <= tolerance,
    `${msg}: expected ${expected}±${tolerance}, got ${actual}`,
  );
}

function parseRgba(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [+m[1], +m[2], +m[3]];
}

// ─── Group 1: OKLCH Conversion Roundtrip (COLOR-01) ───

describe('rgbToOklch + oklchToRgb roundtrip', () => {
  const testColors = [
    { name: 'pure red',      hex: '#ff0000', rgb: [255, 0, 0] },
    { name: 'pure green',    hex: '#00ff00', rgb: [0, 255, 0] },
    { name: 'pure blue',     hex: '#0000ff', rgb: [0, 0, 255] },
    { name: 'primary purple', hex: '#b4a0ff', rgb: [180, 160, 255] },
    { name: 'accent pink',   hex: '#ff6b9d', rgb: [255, 107, 157] },
  ];

  for (const { name, rgb } of testColors) {
    it(`roundtrips ${name} within ±2 per channel`, () => {
      const oklch = rgbToOklch(...rgb);
      const back = oklchToRgb(oklch.l, oklch.c, oklch.h);
      assertClose(back[0], rgb[0], 2, `${name} R`);
      assertClose(back[1], rgb[1], 2, `${name} G`);
      assertClose(back[2], rgb[2], 2, `${name} B`);
    });
  }

  it('maps black to L≈0', () => {
    const { l } = rgbToOklch(0, 0, 0);
    assertClose(l, 0, 0.01, 'black L');
  });

  it('maps white to L≈1', () => {
    const { l } = rgbToOklch(255, 255, 255);
    assertClose(l, 1, 0.01, 'white L');
  });
});

describe('hexToOklch', () => {
  it('parses hex and converts correctly', () => {
    const oklch = hexToOklch('#b4a0ff');
    assertClose(oklch.l, 0.76, 0.02, 'L');
    assertClose(oklch.c, 0.135, 0.02, 'C');
    ok(oklch.h > 280 && oklch.h < 310, `H expected 280-310, got ${oklch.h}`);
  });
});

// ─── Group 2: Gamut Clamping (COLOR-01) ───────────────

describe('gamut clamping', () => {
  it('isInGamut returns true for low-chroma color', () => {
    strictEqual(isInGamut(0.5, 0.01, 0), true);
  });

  it('isInGamut returns false for high-chroma green', () => {
    strictEqual(isInGamut(0.5, 0.5, 150), false);
  });

  it('clampChroma reduces out-of-gamut chroma', () => {
    const clamped = clampChroma(0.5, 0.5, 150);
    ok(clamped < 0.5, `clamped should be < 0.5, got ${clamped}`);
    ok(clamped > 0, `clamped should be > 0, got ${clamped}`);
  });

  it('clampChroma preserves in-gamut chroma', () => {
    const clamped = clampChroma(0.5, 0.05, 150);
    assertClose(clamped, 0.05, 0.002, 'in-gamut chroma');
  });

  it('clampChroma handles zero chroma', () => {
    strictEqual(clampChroma(0.5, 0, 0), 0);
  });
});

// ─── Group 3: Rule Table Completeness (COLOR-02) ──────

describe('rule table completeness', () => {
  const darkTokens = deriveTokens('#b4a0ff', '#ff6b9d', 'dark');

  it(`returns exactly ${COLOR_KEYS.length} color token keys`, () => {
    strictEqual(Object.keys(darkTokens).length, COLOR_KEYS.length);
  });

  it('every output key exists in DEFAULT_TOKENS', () => {
    for (const key of Object.keys(darkTokens)) {
      ok(key in DEFAULT_TOKENS, `unexpected key: ${key}`);
    }
  });

  it('every DEFAULT_TOKENS color key exists in output', () => {
    for (const key of COLOR_KEYS) {
      ok(key in darkTokens, `missing key: ${key}`);
    }
  });

  it('light mode returns same key set as dark mode', () => {
    const lightTokens = deriveTokens('#b4a0ff', '#ff6b9d', 'light');
    deepStrictEqual(
      Object.keys(lightTokens).sort(),
      Object.keys(darkTokens).sort(),
    );
  });
});

// ─── Group 4: deriveTokens Correctness (COLOR-03) ─────

describe('deriveTokens dark mode', () => {
  const tokens = deriveTokens('#b4a0ff', '#ff6b9d', 'dark');

  it('text token has high RGB (near-white)', () => {
    const rgb = parseRgba(tokens['text']);
    ok(rgb, 'text should be rgba format');
    ok(rgb[0] > 240, `text R > 240, got ${rgb[0]}`);
    ok(rgb[1] > 240, `text G > 240, got ${rgb[1]}`);
    ok(rgb[2] > 240, `text B > 240, got ${rgb[2]}`);
  });

  it('menu-bg is rgba(0, 0, 0, 0.70)', () => {
    ok(tokens['menu-bg'].startsWith('rgba(0, 0, 0,'), `got: ${tokens['menu-bg']}`);
  });

  it('danger is exactly #ff6b6b', () => {
    strictEqual(tokens['danger'], '#ff6b6b');
  });

  it('danger-hover is exactly rgba(255, 100, 100, 0.90)', () => {
    strictEqual(tokens['danger-hover'], 'rgba(255, 100, 100, 0.90)');
  });

  it('dialogue-bg is a linear-gradient', () => {
    ok(tokens['dialogue-bg'].startsWith('linear-gradient('), `got: ${tokens['dialogue-bg']}`);
  });

  it('title-bg is a 135deg linear-gradient', () => {
    ok(tokens['title-bg'].startsWith('linear-gradient(135deg,'), `got: ${tokens['title-bg']}`);
  });

  it('primary alpha is 0.90', () => {
    ok(tokens['primary'].includes('0.90'), `got: ${tokens['primary']}`);
  });

  it('background tokens have dark RGB values', () => {
    const rgb = parseRgba(tokens['panel-bg']);
    ok(rgb, 'panel-bg should be rgba format');
    ok(rgb[0] < 40, `panel-bg R < 40, got ${rgb[0]}`);
    ok(rgb[1] < 40, `panel-bg G < 40, got ${rgb[1]}`);
    ok(rgb[2] < 60, `panel-bg B < 60, got ${rgb[2]}`);
  });
});

describe('deriveTokens light mode', () => {
  const tokens = deriveTokens('#b4a0ff', '#ff6b9d', 'light');

  it('text token has low RGB (near-black)', () => {
    const rgb = parseRgba(tokens['text']);
    ok(rgb, 'text should be rgba format');
    ok(rgb[0] < 80, `text R < 80, got ${rgb[0]}`);
    ok(rgb[1] < 80, `text G < 80, got ${rgb[1]}`);
    ok(rgb[2] < 80, `text B < 80, got ${rgb[2]}`);
  });

  it('background tokens have light RGB values', () => {
    const rgb = parseRgba(tokens['panel-bg']);
    ok(rgb, 'panel-bg should be rgba format');
    ok(rgb[0] > 220, `panel-bg R > 220, got ${rgb[0]}`);
    ok(rgb[1] > 220, `panel-bg G > 220, got ${rgb[1]}`);
    ok(rgb[2] > 220, `panel-bg B > 220, got ${rgb[2]}`);
  });

  it('danger is still #ff6b6b (fixed, mode-independent)', () => {
    strictEqual(tokens['danger'], '#ff6b6b');
  });
});

// ─── Group 5: Auto-accent Derivation (COLOR-03) ──────

describe('auto-accent derivation', () => {
  it('returns full token set with null accent', () => {
    const tokens = deriveTokens('#b4a0ff', null, 'dark');
    strictEqual(Object.keys(tokens).length, COLOR_KEYS.length);
  });

  it('returns full token set with undefined accent', () => {
    const tokens = deriveTokens('#b4a0ff', undefined, 'dark');
    strictEqual(Object.keys(tokens).length, COLOR_KEYS.length);
  });

  it('auto-derived accent differs from primary', () => {
    const tokens = deriveTokens('#b4a0ff', null, 'dark');
    ok(tokens['accent'] !== tokens['primary'], 'accent should differ from primary');
  });
});

// ─── Group 6: Value Format Validation ─────────────────

describe('value format validation', () => {
  const tokens = deriveTokens('#b4a0ff', '#ff6b9d', 'dark');

  it('every value matches rgba(), hex, or linear-gradient()', () => {
    const validPattern = /^(rgba\(|#[0-9a-f]{6}$|linear-gradient\()/;
    for (const [key, value] of Object.entries(tokens)) {
      ok(validPattern.test(value), `${key}: invalid format: ${value}`);
    }
  });

  it('no NaN in any token value', () => {
    for (const [key, value] of Object.entries(tokens)) {
      ok(!value.includes('NaN'), `${key} contains NaN: ${value}`);
    }
  });

  it('no undefined in any token value', () => {
    for (const [key, value] of Object.entries(tokens)) {
      ok(!value.includes('undefined'), `${key} contains undefined: ${value}`);
    }
  });

  it('rgba alpha values are between 0 and 1', () => {
    const rgbaPattern = /rgba\(\d+,\s*\d+,\s*\d+,\s*(\d+\.\d+)\)/g;
    for (const [key, value] of Object.entries(tokens)) {
      let match;
      while ((match = rgbaPattern.exec(value)) !== null) {
        const alpha = parseFloat(match[1]);
        ok(alpha >= 0 && alpha <= 1, `${key}: alpha ${alpha} out of range`);
      }
    }
  });

  it('RGB values in rgba() are 0-255 integers', () => {
    for (const [key, value] of Object.entries(tokens)) {
      if (!value.startsWith('rgba(')) continue;
      const rgb = parseRgba(value);
      if (!rgb) continue;
      for (const ch of rgb) {
        ok(ch >= 0 && ch <= 255 && Number.isInteger(ch),
          `${key}: channel ${ch} out of range or not integer`);
      }
    }
  });
});

// ─── Group 7: Diverse Primary Colors ─────────────────

describe('diverse primary colors', () => {
  const primaries = [
    '#ff0000', // red
    '#00cc44', // green
    '#0066ff', // blue
    '#ffcc00', // yellow
    '#ff6600', // orange
    '#663399', // dark purple
    '#00cccc', // cyan
  ];

  for (const hex of primaries) {
    it(`produces valid tokens for ${hex}`, () => {
      const tokens = deriveTokens(hex, null, 'dark');
      strictEqual(Object.keys(tokens).length, COLOR_KEYS.length);
      for (const value of Object.values(tokens)) {
        ok(!value.includes('NaN'), `NaN found for ${hex}`);
        ok(!value.includes('undefined'), `undefined found for ${hex}`);
      }
    });
  }
});
