/**
 * Generate Theme Presets — dev-time script to regenerate preset token values.
 *
 * Uses the engine's colorHarmony + contrast modules to produce
 * 4 coordinated preset palettes from primary colors + harmony algorithms.
 * Applies alpha preservation, gradient generation, contrast checks,
 * and non-color token customization.
 *
 * Usage: node tools/generatePresets.js
 * Output: JSON to stdout (4 preset objects)
 *
 * @module tools/generatePresets
 */

import { generatePalette, hexToHsl, hslToHex } from '../src/engine/colorHarmony.js';
import { contrastRatio, autoFix } from '../src/engine/contrast.js';
import { DEFAULT_TOKENS } from '../src/engine/tokens.js';

// ─── Preset Definitions (D-04) ─────────────────────────

const PRESET_DEFS = [
  {
    id: 'modern',
    name: '现代',
    description: '清新蓝色调，适合现代都市题材',
    primaryColor: '#4A90D9',
    algorithm: 'complementary',
  },
  {
    id: 'japanese',
    name: '和风',
    description: '温暖大地色调，适合日本传统题材',
    primaryColor: '#C8A882',
    algorithm: 'analogous',
  },
  {
    id: 'fantasy',
    name: '幻想',
    description: '神秘紫色调，适合奇幻冒险题材',
    primaryColor: '#7B2FBE',
    algorithm: 'triadic',
  },
  {
    id: 'minimal',
    name: '简约',
    description: '低饱和度灰色调，适合简洁现代题材',
    primaryColor: '#333333',
    algorithm: 'complementary',
  },
];

// ─── Radius Customization per Preset ───────────────────

const RADIUS_MAP = {
  modern:   { radius: '4px', 'radius-lg': '6px' },
  japanese: { radius: '2px', 'radius-lg': '4px' },
  fantasy:  { radius: '6px', 'radius-lg': '8px' },
  minimal:  { radius: '4px', 'radius-lg': '6px' },
};

// ─── Helpers ───────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/**
 * Extract alpha from an rgba() string.
 * @param {string} rgba — e.g. 'rgba(180, 160, 255, 0.9)'
 * @returns {number} alpha value, or 1 if not found
 */
function extractAlpha(rgba) {
  const m = rgba.match(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

/**
 * Wrap a hex color with the alpha from the DEFAULT_TOKENS value.
 * @param {string} hex — '#rrggbb'
 * @param {number} alpha — 0..1
 * @returns {string} 'rgba(r, g, b, alpha)'
 */
function hexToRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

/**
 * Generate a dark gradient for dialogue-bg using the preset's dark bg hex.
 * @param {string} bgHex — dark background hex from palette
 * @returns {string} linear-gradient string
 */
function makeDialogueGradient(bgHex) {
  const [r, g, b] = hexToRgb(bgHex);
  return `linear-gradient(to top, rgba(${r}, ${g}, ${b}, 0.92) 0%, rgba(${r}, ${g}, ${b}, 0.88) 70%, rgba(${r}, ${g}, ${b}, 0.75) 100%)`;
}

/**
 * Generate a dark gradient for title-bg using the preset's dark bg hex.
 * @param {string} bgHex — dark background hex from palette
 * @param {string} accentHex — accent dark hex for variation
 * @returns {string} linear-gradient string
 */
function makeTitleGradient(bgHex, accentHex) {
  const [r1, g1, b1] = hexToRgb(bgHex);
  const [r2, g2, b2] = hexToRgb(accentHex);
  return `linear-gradient(135deg, rgb(${r1}, ${g1}, ${b1}) 0%, rgb(${r2}, ${g2}, ${b2}) 30%, rgb(${Math.round((r1 + r2) / 2)}, ${Math.round((g1 + g2) / 2)}, ${Math.round((b1 + b2) / 2)}) 60%, rgb(${r1}, ${g1}, ${b1}) 100%)`;
}

// ─── Generate Presets ──────────────────────────────────

const presets = PRESET_DEFS.map(def => {
  const palette = generatePalette(def.primaryColor, def.algorithm);
  const tokens = {};

  // Apply hex palette with alpha preservation from DEFAULT_TOKENS
  for (const [key, hexVal] of Object.entries(palette)) {
    const defaultVal = DEFAULT_TOKENS[key];

    if (key === 'dialogue-bg') {
      // Generate gradient using dialogue-bg hex from palette
      tokens[key] = makeDialogueGradient(hexVal);
    } else if (key === 'title-bg') {
      // Generate gradient using title-bg and confirm-bg hexes
      tokens[key] = makeTitleGradient(hexVal, palette['confirm-bg'] || hexVal);
    } else if (defaultVal && defaultVal.startsWith('rgba')) {
      // Preserve alpha from DEFAULT_TOKENS
      const alpha = extractAlpha(defaultVal);
      tokens[key] = hexToRgba(hexVal, alpha);
    } else {
      // Keep hex value
      tokens[key] = hexVal;
    }
  }

  // Override danger tokens (red is a UX convention, not theme-dependent)
  tokens['danger'] = '#ff6b6b';
  tokens['danger-hover'] = 'rgba(255, 100, 100, 0.90)';

  // Add non-color tokens
  tokens['font-body'] = DEFAULT_TOKENS['font-body'];
  tokens['font-display'] = DEFAULT_TOKENS['font-display'];
  tokens['blur'] = '8px';

  // Radius customization per preset
  const radii = RADIUS_MAP[def.id];
  tokens['radius'] = radii.radius;
  tokens['radius-lg'] = radii['radius-lg'];

  // ─── Contrast Check & Auto-fix ─────────────────────
  // Check text vs panel-bg
  const textHex = palette['text'];
  const panelBgHex = palette['panel-bg'];
  const textRatio = contrastRatio(textHex, panelBgHex);
  if (textRatio < 4.5) {
    const fixed = autoFix(textHex, panelBgHex, 4.5);
    if (fixed && fixed.direction !== 'none') {
      const alpha = extractAlpha(DEFAULT_TOKENS['text']);
      tokens['text'] = hexToRgba(fixed.hex, alpha);
      console.error(`[${def.id}] text contrast fixed: ${textRatio.toFixed(2)} → ${fixed.ratio.toFixed(2)}`);
    }
  }

  // Check btn-text vs btn-bg
  const btnTextHex = palette['btn-text'];
  const btnBgHex = palette['btn-bg'];
  const btnRatio = contrastRatio(btnTextHex, btnBgHex);
  if (btnRatio < 4.5) {
    const fixed = autoFix(btnTextHex, btnBgHex, 4.5);
    if (fixed && fixed.direction !== 'none') {
      const alpha = extractAlpha(DEFAULT_TOKENS['btn-text']);
      tokens['btn-text'] = hexToRgba(fixed.hex, alpha);
      console.error(`[${def.id}] btn-text contrast fixed: ${btnRatio.toFixed(2)} → ${fixed.ratio.toFixed(2)}`);
    }
  }

  return {
    id: def.id,
    name: def.name,
    description: def.description,
    primaryColor: def.primaryColor,
    tokens,
  };
});

// ─── Output ────────────────────────────────────────────

console.log(JSON.stringify(presets, null, 2));
