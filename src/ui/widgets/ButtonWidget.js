/**
 * ButtonWidget — creates styled buttons from widgetStyles.button config.
 * Supports background with hover/active states, text styling,
 * border, borderRadius, and nineSlice backgrounds.
 *
 * @module ButtonWidget
 */

import { sanitizeCssValue } from '../sanitize.js';
import { resolvePath } from '../../engine/assetPath.js';

// ─── Button Creation ─────────────────────────────────────

/**
 * Create a styled button element from widget config.
 *
 * @param {string} text — button label
 * @param {object} config — merged widgetStyles.button object (from deepMergeWidgetStyles)
 * @param {Function} [onClick] — click handler
 * @returns {HTMLButtonElement} the created button element
 */
export function createStyledButton(text, config, onClick) {
  const btn = document.createElement('button');
  btn.className = 'gm-styled-btn';
  btn.textContent = text;

  // ─── Base Styles ───────────────────────────────────
  const baseBg = sanitizeCssValue(config.background) || '';
  btn.style.background = baseBg;
  btn.style.color = sanitizeCssValue(config.textColor) || '';
  btn.style.borderRadius = (typeof config.borderRadius === 'number')
    ? config.borderRadius + 'px' : '';
  btn.style.border = sanitizeCssValue(config.border) || '';
  btn.style.fontSize = (typeof config.fontSize === 'number')
    ? config.fontSize + 'px' : '';
  btn.style.cursor = 'pointer';
  btn.style.outline = 'none';

  // ─── Hover / Active State Handlers ─────────────────
  const hoverBg = sanitizeCssValue(config.hoverBackground);
  const activeBg = sanitizeCssValue(config.activeBackground);

  btn.addEventListener('mouseenter', () => {
    btn.style.background = hoverBg || btn.style.background;
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.background = baseBg;
  });

  btn.addEventListener('mousedown', () => {
    btn.style.background = activeBg || btn.style.background;
  });

  btn.addEventListener('mouseup', () => {
    btn.style.background = hoverBg || btn.style.background;
  });

  // ─── Click Handler ─────────────────────────────────
  if (typeof onClick === 'function') {
    btn.addEventListener('click', onClick);
  }

  // ─── NineSlice Background ──────────────────────────
  if (config.nineSlice?.src) {
    // When nineSlice is active, image replaces color background
    btn.style.background = 'transparent';

    const nineEl = document.createElement('div');
    nineEl.className = 'gm-btn-nine';
    nineEl.style.position = 'absolute';
    nineEl.style.inset = '0';
    nineEl.style.zIndex = '-1';
    nineEl.style.pointerEvents = 'none';

    // Build border-image following ThemeManager pattern
    const slice = (config.nineSlice.slice || [0, 0, 0, 0]).join(' ') + ' fill';
    const width = (config.nineSlice.width || config.nineSlice.slice || [0, 0, 0, 0])
      .map(v => v + 'px').join(' ');
    const outset = (config.nineSlice.outset || [0, 0, 0, 0])
      .map(v => v + 'px').join(' ');
    const repeat = config.nineSlice.repeat || 'stretch';

    nineEl.style.borderImage = 'url("' + resolvePath(config.nineSlice.src) + '") '
      + slice + ' / ' + width + ' / ' + outset + ' ' + repeat;

    // Ensure stacking context
    btn.style.position = 'relative';
    btn.style.isolation = 'isolate';
    btn.appendChild(nineEl);
  }

  return btn;
}
