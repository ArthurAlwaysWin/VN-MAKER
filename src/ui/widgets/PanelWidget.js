/**
 * PanelWidget — applies panel styling from widgetStyles.panel config.
 * Supports background color, background image with opacity, border,
 * borderRadius, backdropBlur, padding, and nineSlice backgrounds.
 *
 * @module PanelWidget
 */

import { sanitizeCssValue } from '../sanitize.js';
import { resolvePath } from '../../engine/assetPath.js';

// ─── Panel Style Application ─────────────────────────────

/**
 * Apply panel styling to an existing DOM element.
 *
 * @param {HTMLElement} el — the element to style
 * @param {object} config — merged widgetStyles.panel object (from deepMergeWidgetStyles)
 */
export function applyPanelStyle(el, config) {
  if (!el || !config) return;

  // ─── Basic Styles ────────────────────────────────────
  el.style.background = sanitizeCssValue(config.background) || '';
  el.style.borderRadius = (typeof config.borderRadius === 'number')
    ? config.borderRadius + 'px' : '';
  el.style.border = sanitizeCssValue(config.border) || '';

  // Backdrop blur (with Safari compat)
  if (typeof config.backdropBlur === 'number') {
    const blurVal = 'blur(' + config.backdropBlur + 'px)';
    el.style.backdropFilter = blurVal;
    el.style.webkitBackdropFilter = blurVal;
  } else {
    el.style.backdropFilter = '';
    el.style.webkitBackdropFilter = '';
  }

  // Padding: [top, side] array or single number
  if (Array.isArray(config.padding) && config.padding.length >= 2) {
    el.style.padding = config.padding[0] + 'px ' + config.padding[1] + 'px';
  } else if (typeof config.padding === 'number') {
    el.style.padding = config.padding + 'px';
  } else {
    el.style.padding = '';
  }

  // ─── Background Image Layer ──────────────────────────
  if (config.backgroundImage && sanitizeCssValue(config.backgroundImage)) {
    const bgLayer = document.createElement('div');
    bgLayer.className = 'gm-panel-bg-layer';
    bgLayer.style.position = 'absolute';
    bgLayer.style.inset = '0';
    bgLayer.style.zIndex = '-1';
    bgLayer.style.backgroundImage = 'url("' + resolvePath(config.backgroundImage) + '")';
    bgLayer.style.backgroundSize = 'cover';
    bgLayer.style.backgroundPosition = 'center';
    bgLayer.style.opacity = String(config.backgroundImageOpacity ?? 0.3);
    bgLayer.style.pointerEvents = 'none';

    _ensureStackingContext(el);
    el.appendChild(bgLayer);
  }

  // ─── NineSlice Background Layer ──────────────────────
  if (config.nineSlice?.src) {
    const nineEl = document.createElement('div');
    nineEl.className = 'gm-panel-nine';
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

    _ensureStackingContext(el);
    el.appendChild(nineEl);
  }
}

// ─── Private Helpers ─────────────────────────────────────

/**
 * Ensure the parent element has a stacking context for z-index:-1 children.
 * @param {HTMLElement} el
 * @private
 */
function _ensureStackingContext(el) {
  const pos = getComputedStyle(el).position;
  if (pos === 'static' || pos === '') {
    el.style.position = 'relative';
  }
  el.style.isolation = 'isolate';
}
