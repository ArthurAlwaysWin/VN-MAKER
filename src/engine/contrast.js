/**
 * WCAG Contrast — relative luminance contrast ratio and auto-fix.
 *
 * Implements the WCAG 2.x contrast ratio formula using exact sRGB
 * linearization. Provides autoFix that binary-searches HSL lightness
 * to meet a target contrast ratio, trying both lighter and darker
 * directions and returning the one closer to the original (D-11).
 *
 * @module contrast
 */

import { hexToHsl, hslToHex } from './colorHarmony.js';

// ─── Internal Helpers ──────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// ─── sRGB Linearization (WCAG 2.x spec) ────────────────

function linearize(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r, g, b) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

// ─── Contrast Ratio ────────────────────────────────────

/**
 * Calculate WCAG 2.x contrast ratio between two colors.
 *
 * @param {string} hex1 — '#rrggbb'
 * @param {string} hex2 — '#rrggbb'
 * @returns {number} — contrast ratio ≥ 1.0 (e.g., 4.5 means 4.5:1)
 */
export function contrastRatio(hex1, hex2) {
  const L1 = relativeLuminance(...hexToRgb(hex1));
  const L2 = relativeLuminance(...hexToRgb(hex2));
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Auto-Fix Binary Search ────────────────────────────

const MAX_ITERATIONS = 20;
const PRECISION = 0.5;

function binarySearchLighter(h, s, origL, bgHex, target) {
  let lo = origL;
  let hi = 100;
  let resultHex = null;
  let resultL = null;
  let resultRatio = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    const hex = hslToHex(h, s, mid);
    const ratio = contrastRatio(hex, bgHex);

    if (ratio >= target) {
      resultHex = hex;
      resultL = mid;
      resultRatio = ratio;
      hi = mid; // try closer to original (lower L)
    } else {
      lo = mid; // need more contrast (higher L)
    }

    if (hi - lo < PRECISION) break;
  }

  if (!resultHex) return null;
  return { hex: resultHex, ratio: resultRatio, l: resultL, direction: 'lighter' };
}

function binarySearchDarker(h, s, origL, bgHex, target) {
  let lo = 0;
  let hi = origL;
  let resultHex = null;
  let resultL = null;
  let resultRatio = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    const hex = hslToHex(h, s, mid);
    const ratio = contrastRatio(hex, bgHex);

    if (ratio >= target) {
      resultHex = hex;
      resultL = mid;
      resultRatio = ratio;
      lo = mid; // try closer to original (higher L)
    } else {
      hi = mid; // need more contrast (lower L)
    }

    if (hi - lo < PRECISION) break;
  }

  if (!resultHex) return null;
  return { hex: resultHex, ratio: resultRatio, l: resultL, direction: 'darker' };
}

/**
 * Auto-fix foreground color to meet target contrast ratio against background.
 * Uses binary search on HSL lightness, trying both lighter and darker directions.
 * Returns the direction closer to the original color (D-11).
 *
 * @param {string} fgHex — foreground '#rrggbb'
 * @param {string} bgHex — background '#rrggbb'
 * @param {number} [target=4.5] — minimum contrast ratio (4.5 for normal text, 3.0 for large text)
 * @returns {{ hex: string, ratio: number, direction: 'none'|'lighter'|'darker' }|null}
 *   null if neither direction can achieve the target (extremely rare)
 */
export function autoFix(fgHex, bgHex, target = 4.5) {
  const currentRatio = contrastRatio(fgHex, bgHex);
  if (currentRatio >= target) {
    return { hex: fgHex, ratio: currentRatio, direction: 'none' };
  }

  const [h, s, origL] = hexToHsl(fgHex);

  const lighter = binarySearchLighter(h, s, origL, bgHex, target);
  const darker = binarySearchDarker(h, s, origL, bgHex, target);

  if (!lighter && !darker) return null;
  if (!lighter) return darker;
  if (!darker) return lighter;

  // Return the one closer to original lightness
  return Math.abs(lighter.l - origL) <= Math.abs(darker.l - origL)
    ? lighter : darker;
}
