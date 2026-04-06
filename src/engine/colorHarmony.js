/**
 * Color Harmony — HSL-wheel palette generation algorithms.
 *
 * Pure-function module with zero dependencies (D-08). Provides 4 harmony
 * algorithms (D-09) and a palette generator that maps a single primary
 * color to a partial set of --gm-* token-compatible key/value pairs.
 *
 * @module colorHarmony
 */

// ─── Internal Helpers ──────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ─── HSL Conversion ────────────────────────────────────

/**
 * Convert hex color to HSL.
 *
 * @param {string} hex — '#rrggbb'
 * @returns {[number, number, number]} [h (0-360), s (0-100), l (0-100)]
 */
export function hexToHsl(hex) {
  const [rr, gg, bb] = hexToRgb(hex);
  const r = rr / 255;
  const g = gg / 255;
  const b = bb / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;

  if (d === 0) return [0, 0, Math.round(l * 100)];

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Convert HSL to hex color.
 *
 * @param {number} h — hue 0-360
 * @param {number} s — saturation 0-100
 * @param {number} l — lightness 0-100
 * @returns {string} '#rrggbb' lowercase
 */
export function hslToHex(h, s, l) {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const toHex = (c) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// ─── Harmony Algorithms (D-09) ─────────────────────────

export function complementary(h) {
  return [h, (h + 180) % 360];
}

export function analogous(h) {
  return [(h + 330) % 360, h, (h + 30) % 360];
}

export function triadic(h) {
  return [h, (h + 120) % 360, (h + 240) % 360];
}

export function splitComplementary(h) {
  return [h, (h + 150) % 360, (h + 210) % 360];
}

// ─── Palette Generation ────────────────────────────────

const ALGORITHMS = {
  'complementary': complementary,
  'analogous': analogous,
  'triadic': triadic,
  'split-complementary': splitComplementary,
};

/**
 * Generate a coordinated color palette from a single primary color.
 * Returns a partial tokens object (color keys only) that can be spread
 * into ui.theme.tokens by the editor.
 *
 * @param {string} primaryHex — '#rrggbb' primary color
 * @param {string} [algorithm='complementary'] — one of 'complementary'|'analogous'|'triadic'|'split-complementary'
 * @returns {Record<string, string>} Partial token object with hex color values
 */
export function generatePalette(primaryHex, algorithm = 'complementary') {
  const [h, s, l] = hexToHsl(primaryHex);
  const hues = (ALGORITHMS[algorithm] || complementary)(h);
  const h0 = hues[0];
  const h1 = hues[1] !== undefined ? hues[1] : (h + 180) % 360;

  const hex = (hue, sat, lit) => hslToHex(hue, sat, lit);

  return {
    // Core colors
    'primary': hex(h0, clamp(s, 0, 80), clamp(l, 55, 75)),
    'primary-subtle': hex(h0, clamp(s, 0, 30), 15),
    'accent': hex(h1, clamp(s, 0, 70), 60),
    'accent-border': hex(h1, clamp(s, 0, 50), 50),
    'shadow': hex(h0, clamp(s, 0, 40), 30),
    'title-glow': hex(h0, clamp(s, 0, 50), 55),
    'save-title': hex(h0, clamp(s, 0, 80), clamp(l, 55, 75)),
    'load-title': hex(h1, clamp(s, 0, 70), 65),

    // Text — near-white with subtle hue tint
    'text': hex(h0, 5, 95),
    'text-heading': hex(h0, 5, 90),
    'text-secondary': hex(h0, 5, 78),
    'text-muted': hex(h0, 5, 55),
    'text-dim': hex(h0, 5, 42),
    'text-faint': hex(h0, 5, 32),

    // Backgrounds — very dark desaturated
    'dialogue-bg': hex(h0, clamp(s, 0, 15), 5),
    'panel-bg': hex(h0, clamp(s, 0, 20), 6),
    'menu-bg': hex(h0, clamp(s, 0, 10), 4),
    'card-bg': hex(h0, clamp(s, 0, 25), 12),
    'card-bg-hover': hex(h0, clamp(s, 0, 30), 16),
    'title-bg': hex(h0, clamp(s, 0, 20), 7),
    'confirm-bg': hex(h0, clamp(s, 0, 20), 8),

    // Borders
    'border': hex(h0, clamp(s, 0, 20), 20),
    'border-hover': hex(h0, clamp(s, 0, 60), 45),
    'border-active': hex(h0, clamp(s, 0, 70), 55),

    // Buttons
    'btn-bg': hex(h0, clamp(s, 0, 40), 25),
    'btn-text': hex(h0, 5, 92),
    'btn-border': hex(h0, clamp(s, 0, 15), 22),
    'btn-hover-bg': hex(h0, clamp(s, 0, 55), 35),
    'btn-hover-text': hex(h0, 5, 96),
    'btn-hover-border': hex(h0, clamp(s, 0, 60), 45),

    // Controls
    'slider-track': hex(h0, clamp(s, 0, 10), 15),
    'slider-thumb': hex(h0, clamp(s, 0, 70), 65),
    'scrollbar': hex(h0, clamp(s, 0, 10), 15),

    // Speaker
    'speaker-shadow': hex(h0, 5, 55),
  };
}
