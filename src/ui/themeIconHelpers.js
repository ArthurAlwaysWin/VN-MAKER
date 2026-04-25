/**
 * themeIconHelpers — Resolve theme-level icon images for UI components.
 *
 * Provides fallback-safe icon resolution: if ui.theme.icons[slot] is
 * configured, returns an <img> HTML string; otherwise returns the
 * default text/emoji so the UI never breaks.
 *
 * Phase 75 — ICO-01
 * @module themeIconHelpers
 */
import { resolvePath } from '../engine/assetPath.js';

/**
 * Resolve an icon slot to an <img> element or fall back to default text.
 *
 * @param {object|null|undefined} icons — ui.theme.icons object
 * @param {string} slotKey — one of 'gameMenu', 'qab', 'close', 'voiceReplay'
 * @param {string} fallbackText — default text/emoji when no icon is configured
 * @param {string} [cssClass] — optional CSS class for the <img>
 * @returns {string} HTML string (<img> or escaped text)
 */
export function resolveThemeIcon(icons, slotKey, fallbackText, cssClass = '') {
  const src = icons?.[slotKey];
  if (!src) return escapeHtml(fallbackText);

  const resolved = resolvePath(src);
  const classAttr = cssClass ? ` class="${cssClass}"` : '';
  return `<img src="${resolved}"${classAttr} alt="${escapeHtml(fallbackText)}" />`;
}

/**
 * Check if a theme icon slot is configured.
 *
 * @param {object|null|undefined} icons — ui.theme.icons object
 * @param {string} slotKey — slot key
 * @returns {boolean}
 */
export function hasThemeIcon(icons, slotKey) {
  return !!(icons?.[slotKey]);
}

/**
 * Minimal HTML escaping for fallback text.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
