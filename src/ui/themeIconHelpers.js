/**
 * themeIconHelpers — Resolve theme-level icon images for UI components.
 *
 * Provides fallback-safe icon resolution: if ui.theme.icons[slot] is
 * configured, returns themed icon markup; otherwise returns the
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
  const fallbackHtml = renderFallbackContent(fallbackText);
  if (!src) return fallbackHtml;

  const resolved = resolvePath(src);
  const classAttr = cssClass ? ` class="${cssClass}"` : '';
  const altText = stripMarkup(fallbackText) || slotKey;
  return `<span class="theme-icon-shell" data-theme-icon-shell="1" data-theme-icon-fallback="${encodeURIComponent(fallbackHtml)}"><img src="${resolved}"${classAttr} data-theme-icon-image="1" alt="${escapeHtml(altText)}" /></span>`;
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
 * Attach one shared broken-asset fallback contract to themed icons.
 *
 * @param {ParentNode|HTMLElement|null} root
   */
export function attachThemeIconFallback(root) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll('[data-theme-icon-shell="1"]').forEach((shell) => {
    const img = shell.querySelector('[data-theme-icon-image="1"]');
    if (!img || img.dataset.themeIconBound === '1') {
      return;
    }
    img.dataset.themeIconBound = '1';
    img.addEventListener('error', () => {
      const fallbackHtml = decodeURIComponent(shell.dataset.themeIconFallback || '');
      const template = document.createElement('template');
      template.innerHTML = fallbackHtml;
      shell.replaceWith(template.content.cloneNode(true));
    }, { once: true });
  });
}

function renderFallbackContent(text) {
  const value = String(text ?? '');
  return /^\s*<svg[\s>]/i.test(value) ? value : escapeHtml(value);
}

/**
 * Minimal HTML escaping for fallback text.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripMarkup(text) {
  return String(text ?? '').replace(/<[^>]+>/g, '').trim();
}
