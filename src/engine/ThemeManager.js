/**
 * ThemeManager — applies theme token overrides as CSS custom properties.
 *
 * Reads ui.theme from script.json and merges sparse user overrides
 * with DEFAULT_TOKENS, then injects --gm-* properties onto the
 * game container element.
 *
 * @module ThemeManager
 */
import { DEFAULT_TOKENS } from './tokens.js';

/**
 * Apply theme token overrides onto a container element.
 * Merges sparse user tokens with DEFAULT_TOKENS so all 41 CSS custom
 * properties are always set (no partial state).
 *
 * @param {HTMLElement} container - The game container element (#game-container)
 * @param {object|null|undefined} themeData - The ui.theme object from script.json
 */
export function applyTheme(container, themeData) {
  const merged = { ...DEFAULT_TOKENS, ...(themeData?.tokens ?? {}) };
  for (const [key, value] of Object.entries(merged)) {
    container.style.setProperty(`--gm-${key}`, value);
  }
}

/**
 * Reset all theme tokens to their DEFAULT_TOKENS values (v0.5 appearance).
 *
 * @param {HTMLElement} container - The game container element (#game-container)
 */
export function resetTheme(container) {
  for (const [key, value] of Object.entries(DEFAULT_TOKENS)) {
    container.style.setProperty(`--gm-${key}`, value);
  }
}
