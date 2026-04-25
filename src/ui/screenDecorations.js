/**
 * Screen decoration rendering helper (Phase 74).
 *
 * Renders chrome.decorations[] as absolute-positioned, non-interactive
 * overlay <img> elements with the .screen-decoration CSS class.
 *
 * @module ui/screenDecorations
 */

import { resolvePath } from '../engine/assetPath.js';
import { sanitizeCssValue, clampField } from './sanitize.js';

/**
 * Remove all existing .screen-decoration elements from a container.
 * Called before re-rendering to prevent accumulation.
 *
 * @param {HTMLElement} container — the screen root element
 */
export function clearScreenDecorations(container) {
  container.querySelectorAll('.screen-decoration').forEach(el => el.remove());
}

/**
 * Render chrome.decorations[] into a container element.
 * Each decoration becomes an <img class="screen-decoration"> with
 * position, dimensions, and pointer-events:none set via CSS class + inline styles.
 *
 * @param {HTMLElement} container — the screen root element
 * @param {Array<{src?:string, x?:number, y?:number, width?:number, height?:number}>|undefined} decorations
 */
export function renderScreenDecorations(container, decorations) {
  if (!Array.isArray(decorations)) return;

  for (const deco of decorations) {
    if (!deco.src) continue;
    const safeSrc = sanitizeCssValue(deco.src);
    if (!safeSrc) continue;

    const img = document.createElement('img');
    img.className = 'screen-decoration';
    img.src = resolvePath(safeSrc);
    img.draggable = false;

    const dx = clampField('x', deco.x);
    const dy = clampField('y', deco.y);
    const dw = clampField('width', deco.width);
    const dh = clampField('height', deco.height);
    if (dx !== undefined) img.style.left = dx + 'px';
    if (dy !== undefined) img.style.top = dy + 'px';
    if (dw !== undefined) img.style.width = dw + 'px';
    if (dh !== undefined) img.style.height = dh + 'px';

    container.appendChild(img);
  }
}
