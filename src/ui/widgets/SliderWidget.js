/**
 * SliderWidget — creates slider controls from widgetStyles.slider config.
 * Supports configurable track/fill/thumb colors, sizes, shapes,
 * and optional thumb/track images.
 */

import { sanitizeCssValue } from '../sanitize.js';
import { resolvePath } from '../../engine/assetPath.js';

// ─── CSS Injection Flag ──────────────────────────────────

let _cssInjected = false;

// ─── Public API ──────────────────────────────────────────

/**
 * Create a slider control with configurable styling via CSS custom properties.
 *
 * @param {object} config — merged widgetStyles.slider config
 * @param {string} [config.trackColor] — track background color
 * @param {string} [config.fillColor] — fill (progress) color
 * @param {string} [config.thumbColor] — thumb color
 * @param {string} [config.thumbStyle='circle'] — 'circle' or 'square'
 * @param {number} [config.thumbSize=16] — thumb diameter/size in px
 * @param {number} [config.trackHeight=4] — track height in px
 * @param {string} [config.thumbImage] — asset path for custom thumb image
 * @param {string} [config.trackImage] — asset path for custom track image
 * @param {number} value — initial numeric value
 * @param {number} min — minimum value
 * @param {number} max — maximum value
 * @param {number} step — step increment
 * @param {(newValue: number) => void} onChange — callback on value change
 * @returns {{ el: HTMLDivElement, setValue: (n: number) => void, getValue: () => number }}
 */
export function createSlider(config, value, min, max, step, onChange) {
  // Ensure slider CSS is injected once
  if (!_cssInjected) {
    _injectCSS();
    _cssInjected = true;
  }

  const thumbSize = config.thumbSize || 16;
  const trackHeight = config.trackHeight || 4;
  const thumbStyle = config.thumbStyle || 'circle';

  // ─── Container ─────────────────────────────────────
  const el = document.createElement('div');
  el.className = 'gm-slider';
  Object.assign(el.style, {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  });

  // ─── Range Input ───────────────────────────────────
  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'gm-slider-input';
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  Object.assign(input.style, {
    width: '100%',
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'transparent',
    cursor: 'pointer',
    margin: '0',
  });

  // ─── CSS Custom Properties ─────────────────────────
  const safeTrack = sanitizeCssValue(config.trackColor) || 'rgba(255,255,255,0.15)';
  const safeFill = sanitizeCssValue(config.fillColor) || 'rgba(180,160,255,0.8)';
  const safeThumb = sanitizeCssValue(config.thumbColor) || '#fff';
  const thumbRadius = thumbStyle === 'square' ? '2px' : '50%';

  input.style.setProperty('--gm-track-color', safeTrack);
  input.style.setProperty('--gm-fill-color', safeFill);
  input.style.setProperty('--gm-thumb-color', safeThumb);
  input.style.setProperty('--gm-thumb-size', `${thumbSize}px`);
  input.style.setProperty('--gm-track-height', `${trackHeight}px`);
  input.style.setProperty('--gm-thumb-radius', thumbRadius);

  // Optional thumb image
  if (config.thumbImage) {
    input.style.setProperty('--gm-thumb-image', `url("${resolvePath(config.thumbImage)}")`);
  }

  // Optional track image
  if (config.trackImage) {
    input.style.setProperty('--gm-track-image', `url("${resolvePath(config.trackImage)}")`);
  }

  // ─── Fill Gradient (Webkit) ────────────────────────
  function _updateFillGradient() {
    const pct = ((input.value - min) / (max - min)) * 100;
    input.style.setProperty('--gm-fill-pct', `${pct}%`);
  }
  _updateFillGradient();

  // ─── Event Handler ─────────────────────────────────
  input.addEventListener('input', () => {
    _updateFillGradient();
    if (typeof onChange === 'function') onChange(Number(input.value));
  });

  el.appendChild(input);

  // ─── Public Methods ────────────────────────────────

  /**
   * Set the slider value programmatically (does not trigger onChange).
   * @param {number} n
   */
  function setValue(n) {
    input.value = n;
    _updateFillGradient();
  }

  /**
   * Get the current slider value.
   * @returns {number}
   */
  function getValue() {
    return Number(input.value);
  }

  return { el, setValue, getValue };
}

// ─── Slider CSS ──────────────────────────────────────────

/**
 * Returns the CSS string needed for cross-browser slider styling.
 * Targets `.gm-slider-input` elements and uses CSS custom properties
 * set by `createSlider()` for per-instance theming.
 *
 * @returns {string} CSS text
 */
export function getSliderCSS() {
  return `
/* ─── GM Slider — Cross-Browser Styles ─── */

.gm-slider-input {
  --gm-fill-pct: 0%;
}

/* Webkit Track */
.gm-slider-input::-webkit-slider-runnable-track {
  height: var(--gm-track-height, 4px);
  background: linear-gradient(
    to right,
    var(--gm-fill-color, rgba(180,160,255,0.8)) 0%,
    var(--gm-fill-color, rgba(180,160,255,0.8)) var(--gm-fill-pct, 0%),
    var(--gm-track-color, rgba(255,255,255,0.15)) var(--gm-fill-pct, 0%),
    var(--gm-track-color, rgba(255,255,255,0.15)) 100%
  );
  border-radius: 2px;
  border: none;
}

/* Webkit Thumb */
.gm-slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: var(--gm-thumb-size, 16px);
  height: var(--gm-thumb-size, 16px);
  background: var(--gm-thumb-image, var(--gm-thumb-color, #fff));
  background-size: contain;
  background-repeat: no-repeat;
  border-radius: var(--gm-thumb-radius, 50%);
  border: none;
  cursor: pointer;
  margin-top: calc((var(--gm-track-height, 4px) - var(--gm-thumb-size, 16px)) / 2);
}

/* Firefox Track */
.gm-slider-input::-moz-range-track {
  height: var(--gm-track-height, 4px);
  background: var(--gm-track-color, rgba(255,255,255,0.15));
  border-radius: 2px;
  border: none;
}

/* Firefox Progress (fill) */
.gm-slider-input::-moz-range-progress {
  height: var(--gm-track-height, 4px);
  background: var(--gm-fill-color, rgba(180,160,255,0.8));
  border-radius: 2px;
}

/* Firefox Thumb */
.gm-slider-input::-moz-range-thumb {
  width: var(--gm-thumb-size, 16px);
  height: var(--gm-thumb-size, 16px);
  background: var(--gm-thumb-image, var(--gm-thumb-color, #fff));
  background-size: contain;
  background-repeat: no-repeat;
  border-radius: var(--gm-thumb-radius, 50%);
  border: none;
  cursor: pointer;
}
`.trim();
}

// ─── Private Helpers ─────────────────────────────────────

/**
 * Inject the slider CSS into the document head (once).
 * @private
 */
function _injectCSS() {
  const style = document.createElement('style');
  style.setAttribute('data-gm-slider', '');
  style.textContent = getSliderCSS();
  document.head.appendChild(style);
}
