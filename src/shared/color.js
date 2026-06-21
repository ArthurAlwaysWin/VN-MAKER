/**
 * Convert a six-digit hex color to RGB channels.
 *
 * This intentionally preserves the existing permissive parsing behavior used
 * by the color engine: the first `#` is optional and malformed channels yield
 * `NaN` rather than throwing.
 *
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}
