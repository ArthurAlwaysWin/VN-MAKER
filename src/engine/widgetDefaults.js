/**
 * widgetDefaults — Default values and merge logic for widget styles.
 *
 * Provides the canonical WIDGET_DEFAULTS constant (matching design spec
 * Section 4.1) and a deepMergeWidgetStyles function that performs sparse
 * merging of user overrides onto defaults.
 *
 * Usage:
 *   import { WIDGET_DEFAULTS, deepMergeWidgetStyles } from './widgetDefaults.js';
 *   const styles = deepMergeWidgetStyles(scriptData.ui?.widgetStyles);
 *
 * @module widgetDefaults
 */

// ─── Known Widget Categories ─────────────────────────────

/** @type {string[]} The 5 valid widget style category keys */
const CATEGORIES = ['tab', 'toggle', 'slider', 'panel', 'button'];

// ─── Default Values ──────────────────────────────────────

/**
 * Canonical default values for all widget style categories.
 * Deeply frozen to prevent accidental mutation.
 *
 * @type {Readonly<{
 *   tab: Readonly<object>,
 *   toggle: Readonly<object>,
 *   slider: Readonly<object>,
 *   panel: Readonly<object>,
 *   button: Readonly<object>,
 * }>}
 */
export const WIDGET_DEFAULTS = Object.freeze({
  tab: Object.freeze({
    shape: 'rectangle',
    activeColor: 'rgba(180, 160, 255, 0.9)',
    inactiveColor: 'rgba(255,255,255,0.15)',
    activeTextColor: '#fff',
    inactiveTextColor: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: null,
    activeBackgroundImage: null,
    nineSlice: null,
  }),
  toggle: Object.freeze({
    style: 'pill',
    onColor: 'rgba(180, 160, 255, 0.85)',
    offColor: 'rgba(255,255,255,0.15)',
    thumbColor: '#fff',
    onLabel: 'ON',
    offLabel: 'OFF',
    fontSize: 12,
    width: 64,
    height: 28,
  }),
  slider: Object.freeze({
    trackColor: 'rgba(255,255,255,0.15)',
    fillColor: 'rgba(180,160,255,0.8)',
    thumbStyle: 'circle',
    thumbColor: '#fff',
    thumbSize: 16,
    trackHeight: 4,
    trackImage: null,
    thumbImage: null,
  }),
  panel: Object.freeze({
    background: 'rgba(0,0,0,0.6)',
    backgroundImage: null,
    backgroundImageOpacity: 0.3,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    backdropBlur: 12,
    padding: Object.freeze([24, 32]),
  }),
  button: Object.freeze({
    background: 'rgba(255,255,255,0.12)',
    backgroundImage: null,
    hoverBackground: 'rgba(255,255,255,0.2)',
    activeBackground: 'rgba(255,255,255,0.3)',
    textColor: '#fff',
    borderRadius: 8,
    border: 'none',
    fontSize: 14,
    nineSlice: null,
  }),
});

// ─── Deep Merge ──────────────────────────────────────────

/**
 * Deep-merge user widget style overrides onto WIDGET_DEFAULTS.
 *
 * - null/undefined input → returns deep clone of WIDGET_DEFAULTS
 * - Only the 5 known categories are included in output
 * - Within each category, null/undefined fields fall back to defaults
 *
 * @param {object|null|undefined} userStyles — sparse override from ui.widgetStyles
 * @returns {object} A plain (non-frozen) merged result object
 */
export function deepMergeWidgetStyles(userStyles) {
  const result = {};

  for (const cat of CATEGORIES) {
    const defaults = WIDGET_DEFAULTS[cat];
    const userCat = (userStyles != null && typeof userStyles === 'object')
      ? userStyles[cat]
      : null;

    if (userCat == null || typeof userCat !== 'object') {
      // No user overrides for this category — spread defaults
      result[cat] = { ...defaults };
      // Special case: if defaults has a nested frozen array (panel.padding),
      // spread produces a shallow copy which is fine (arrays are value-like here)
      if (Array.isArray(defaults.padding)) {
        result[cat].padding = [...defaults.padding];
      }
    } else {
      // Merge field by field
      const merged = {};
      for (const field of Object.keys(defaults)) {
        const userVal = userCat[field];
        if (userVal === null || userVal === undefined) {
          // Fall back to default for null/undefined fields
          const defVal = defaults[field];
          merged[field] = Array.isArray(defVal) ? [...defVal] : defVal;
        } else {
          merged[field] = Array.isArray(userVal) ? [...userVal] : userVal;
        }
      }
      result[cat] = merged;
    }
  }

  return result;
}
