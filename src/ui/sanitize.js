/**
 * Sanitization and validation utilities for user-provided style values.
 * Prevents CSS injection and ensures coordinates stay within reasonable bounds.
 */

// Patterns that indicate CSS injection attempts
const CSS_INJECTION_RE = /[;{}]|url\s*\(|expression\s*\(|@import|javascript:|data:/i;

/**
 * Sanitize a CSS string value (fontFamily, color, backgroundColor, etc.).
 * Returns the value if safe, or undefined if it contains injection patterns.
 */
export function sanitizeCssValue(value) {
  if (typeof value !== 'string') return undefined;
  if (CSS_INJECTION_RE.test(value)) return undefined;
  return value;
}

/**
 * Clamp a numeric value within [min, max].
 */
export function clamp(value, min, max) {
  if (typeof value !== 'number' || isNaN(value)) return undefined;
  return Math.max(min, Math.min(max, value));
}

// Reasonable bounds for game coordinates (1280×720 canvas, with overflow margin)
const BOUNDS = {
  x: [-300, 1580],
  y: [-300, 1020],
  width: [1, 2560],
  height: [1, 1440],
  scale: [0.05, 10],
  fontSize: [1, 200],
  borderRadius: [0, 500],
  padding: [0, 200],
  letterSpacing: [-20, 100],
};

/**
 * Clamp a coordinate/dimension value using predefined bounds.
 * @param {string} field — one of 'x', 'y', 'width', 'height', 'scale', etc.
 * @param {number} value
 * @returns {number|undefined}
 */
export function clampField(field, value) {
  const range = BOUNDS[field];
  if (!range) return clamp(value, -10000, 10000);
  return clamp(value, range[0], range[1]);
}
