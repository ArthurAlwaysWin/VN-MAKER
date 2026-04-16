/**
 * TabWidget — creates a tab bar from widgetStyles.tab config.
 * Supports 5 shape variants: rectangle, pill, underline, trapezoid, ribbon.
 * Each shape uses different CSS/DOM to achieve its visual style.
 */

import { sanitizeCssValue } from '../sanitize.js';
import { resolvePath } from '../../engine/assetPath.js';

// ─── Tab Shape Constants ─────────────────────────────────

const TRAPEZOID_CLIP = 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 100%, 0% 100%)';
const RIBBON_CLIP = 'polygon(0% 0%, calc(100% - 16px) 0%, 100% 50%, calc(100% - 16px) 100%, 0% 100%)';

// ─── Public API ──────────────────────────────────────────

/**
 * Create a tab bar with styled tab buttons.
 *
 * @param {string[]} labels — tab label strings (e.g. ['声音', '画面', '游戏'])
 * @param {object} config — merged widgetStyles.tab config
 * @param {string} [config.shape='rectangle'] — rectangle|pill|underline|trapezoid|ribbon
 * @param {string} [config.activeColor] — background color for active tab
 * @param {string} [config.inactiveColor] — background color for inactive tab
 * @param {string} [config.activeTextColor] — text color for active tab
 * @param {string} [config.inactiveTextColor] — text color for inactive tab
 * @param {number} [config.fontSize] — font size in px
 * @param {string} [config.fontFamily] — font family name
 * @param {string} [config.activeBackgroundImage] — image path for active tab bg
 * @param {object} [config.nineSlice] — nine-slice config for ribbon shape
 * @returns {{ el: HTMLDivElement, setActive: (index: number) => void }}
 */
export function createTabBar(labels, config, onSelect) {
  const shape = config.shape || 'rectangle';
  const buttons = [];
  let _activeIndex = 0;

  // ─── Container ─────────────────────────────────────
  const el = document.createElement('div');
  el.className = 'gm-tab-bar';
  Object.assign(el.style, {
    display: 'flex',
    gap: '4px',
    alignItems: 'flex-end',
  });

  // ─── Create Tab Buttons ────────────────────────────
  for (let i = 0; i < labels.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'gm-tab';
    btn.textContent = labels[i];
    _applyBaseStyle(btn, config);
    _applyTabShape(btn, shape, i === 0, config);

    btn.addEventListener('click', () => {
      setActive(i);
      if (typeof onSelect === 'function') onSelect(i);
    });

    buttons.push(btn);
    el.appendChild(btn);
  }

  // ─── setActive ─────────────────────────────────────

  /**
   * Update visual active state to the tab at `index`.
   * @param {number} index
   */
  function setActive(index) {
    if (index < 0 || index >= buttons.length) return;
    _activeIndex = index;
    el._activeIndex = index;
    for (let i = 0; i < buttons.length; i++) {
      _applyTabShape(buttons[i], shape, i === index, config);
    }
  }

  // Initial active state
  el._activeIndex = 0;

  return { el, setActive };
}

// ─── Private Helpers ─────────────────────────────────────

/**
 * Apply base styles shared across all tab shapes.
 * @param {HTMLButtonElement} btn
 * @param {object} config
 * @private
 */
function _applyBaseStyle(btn, config) {
  Object.assign(btn.style, {
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
    lineHeight: '1.4',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  });
  if (config.fontSize) {
    btn.style.fontSize = `${config.fontSize}px`;
  }
  const safeFont = sanitizeCssValue(config.fontFamily);
  if (safeFont) {
    btn.style.fontFamily = safeFont;
  }
}

/**
 * Apply shape-specific styles to a tab button.
 * @param {HTMLButtonElement} btn
 * @param {string} shape — rectangle|pill|underline|trapezoid|ribbon
 * @param {boolean} isActive — whether this tab is currently active
 * @param {object} config — widgetStyles.tab config
 * @private
 */
function _applyTabShape(btn, shape, isActive, config) {
  const activeColor = sanitizeCssValue(config.activeColor) || 'rgba(180,160,255,0.3)';
  const inactiveColor = sanitizeCssValue(config.inactiveColor) || 'rgba(255,255,255,0.08)';
  const activeText = sanitizeCssValue(config.activeTextColor) || '#fff';
  const inactiveText = sanitizeCssValue(config.inactiveTextColor) || 'rgba(255,255,255,0.6)';

  // Reset shape-specific styles
  btn.style.borderRadius = '';
  btn.style.borderBottom = '';
  btn.style.clipPath = '';
  btn.style.backgroundImage = '';
  btn.style.position = '';
  btn.style.isolation = '';
  btn.style.overflow = '';

  // Remove old nineSlice overlay if any
  const oldSlice = btn.querySelector('.gm-tab-nineslice');
  if (oldSlice) oldSlice.remove();

  switch (shape) {
    case 'pill':
      _shapePill(btn, isActive, activeColor, inactiveColor, activeText, inactiveText);
      break;
    case 'underline':
      _shapeUnderline(btn, isActive, activeColor, activeText, inactiveText);
      break;
    case 'trapezoid':
      _shapeTrapezoid(btn, isActive, activeColor, inactiveColor, activeText, inactiveText);
      break;
    case 'ribbon':
      _shapeRibbon(btn, isActive, activeColor, inactiveColor, activeText, inactiveText, config);
      break;
    case 'rectangle':
    default:
      _shapeRectangle(btn, isActive, activeColor, inactiveColor, activeText, inactiveText);
      break;
  }

  // Active background image overlay (all shapes)
  if (isActive && config.activeBackgroundImage) {
    const safeBg = sanitizeCssValue(config.activeBackgroundImage);
    if (safeBg) {
      const resolved = resolvePath(safeBg);
      btn.style.backgroundImage = `url("${resolved}")`;
      btn.style.backgroundSize = 'cover';
      btn.style.backgroundPosition = 'center';
    }
  }
}

/**
 * Rectangle shape — no border-radius, plain bg color.
 * @private
 */
function _shapeRectangle(btn, isActive, activeColor, inactiveColor, activeText, inactiveText) {
  Object.assign(btn.style, {
    padding: '8px 20px',
    borderRadius: '0',
    background: isActive ? activeColor : inactiveColor,
    color: isActive ? activeText : inactiveText,
  });
}

/**
 * Pill shape — capsule with border-radius 999px.
 * @private
 */
function _shapePill(btn, isActive, activeColor, inactiveColor, activeText, inactiveText) {
  Object.assign(btn.style, {
    padding: '8px 20px',
    borderRadius: '999px',
    background: isActive ? activeColor : inactiveColor,
    color: isActive ? activeText : inactiveText,
  });
}

/**
 * Underline shape — transparent background, bottom border on active.
 * @private
 */
function _shapeUnderline(btn, isActive, activeColor, activeText, inactiveText) {
  Object.assign(btn.style, {
    padding: '8px 20px 6px',
    borderRadius: '0',
    background: 'transparent',
    color: isActive ? activeText : inactiveText,
    borderBottom: isActive
      ? `3px solid ${activeColor}`
      : '3px solid transparent',
  });
}

/**
 * Trapezoid shape — clip-path polygon.
 * @private
 */
function _shapeTrapezoid(btn, isActive, activeColor, inactiveColor, activeText, inactiveText) {
  Object.assign(btn.style, {
    padding: '8px 28px',
    borderRadius: '0',
    background: isActive ? activeColor : inactiveColor,
    color: isActive ? activeText : inactiveText,
    clipPath: TRAPEZOID_CLIP,
  });
}

/**
 * Ribbon shape — clip-path or nineSlice image.
 * @private
 */
function _shapeRibbon(btn, isActive, activeColor, inactiveColor, activeText, inactiveText, config) {
  const hasNineSlice = config.nineSlice && config.nineSlice.src;

  if (hasNineSlice) {
    // Nine-slice background mode
    Object.assign(btn.style, {
      padding: '8px 32px 8px 16px',
      borderRadius: '0',
      background: 'transparent',
      color: isActive ? activeText : inactiveText,
      position: 'relative',
      isolation: 'isolate',
      overflow: 'hidden',
    });

    if (isActive) {
      const slice = document.createElement('div');
      slice.className = 'gm-tab-nineslice';
      Object.assign(slice.style, {
        position: 'absolute',
        inset: '0',
        zIndex: '-1',
        borderImage: `url("${resolvePath(config.nineSlice.src)}") ${config.nineSlice.slice || '12'} fill stretch`,
        borderWidth: `${config.nineSlice.slice || 12}px`,
        borderStyle: 'solid',
      });
      btn.appendChild(slice);
    }
  } else {
    // Clip-path ribbon mode
    Object.assign(btn.style, {
      padding: '8px 32px 8px 16px',
      borderRadius: '0',
      background: isActive ? activeColor : inactiveColor,
      color: isActive ? activeText : inactiveText,
      clipPath: RIBBON_CLIP,
    });
  }
}
