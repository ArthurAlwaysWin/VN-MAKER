/**
 * Design Token Vocabulary — canonical defaults for the theme system.
 *
 * Keys are unprefixed token names. The CSS consumes them as `var(--gm-{key}, fallback)`.
 * ThemeManager (Phase 24) will apply overrides via:
 *   container.style.setProperty(`--gm-${key}`, userValue)
 *
 * Every value here matches the v0.5 hardcoded value exactly — zero visual regression.
 *
 * @type {Record<string, string>}
 */
export const DEFAULT_TOKENS = {
  // ─── Core Colors ────────────────────────────────
  'primary': 'rgba(180, 160, 255, 0.9)',
  'primary-subtle': 'rgba(180, 160, 255, 0.08)',
  'danger': '#ff6b6b',
  'danger-hover': 'rgba(255, 100, 100, 0.9)',
  'accent': 'rgba(255, 107, 157, 0.25)',
  'accent-border': 'rgba(255, 107, 157, 0.5)',
  'shadow': 'rgba(100, 60, 180, 0.3)',
  'title-glow': 'rgba(180, 140, 255, 0.3)',
  'save-title': 'rgba(180, 160, 255, 0.9)',
  'load-title': 'rgba(100, 170, 255, 0.9)',

  // ─── Text ───────────────────────────────────────
  'text': 'rgba(255, 255, 255, 0.92)',
  'text-heading': 'rgba(255, 255, 255, 0.85)',
  'text-secondary': 'rgba(255, 255, 255, 0.75)',
  'text-muted': 'rgba(255, 255, 255, 0.5)',
  'text-dim': 'rgba(255, 255, 255, 0.4)',
  'text-faint': 'rgba(255, 255, 255, 0.3)',

  // ─── Borders ────────────────────────────────────
  'border': 'rgba(255, 255, 255, 0.08)',
  'border-hover': 'rgba(180, 160, 255, 0.3)',
  'border-active': 'rgba(180, 160, 255, 0.5)',

  // ─── Backgrounds ────────────────────────────────
  'dialogue-bg': 'linear-gradient(to top, rgba(8, 8, 20, 0.92) 0%, rgba(8, 8, 20, 0.88) 70%, rgba(8, 8, 20, 0.75) 100%)',
  'panel-bg': 'rgba(10, 10, 20, 0.95)',
  'menu-bg': 'rgba(0, 0, 0, 0.7)',
  'card-bg': 'rgba(30, 30, 50, 0.6)',
  'card-bg-hover': 'rgba(40, 35, 65, 0.6)',
  'title-bg': 'linear-gradient(135deg, #0d0d1a 0%, #1a1025 30%, #15101f 60%, #0d0d1a 100%)',
  'confirm-bg': 'rgba(30, 30, 50, 0.95)',

  // ─── Buttons ────────────────────────────────────
  'btn-bg': 'rgba(60, 60, 100, 0.6)',
  'btn-text': 'rgba(255, 255, 255, 0.9)',
  'btn-border': 'rgba(255, 255, 255, 0.1)',
  'btn-hover-bg': 'rgba(100, 80, 160, 0.7)',
  'btn-hover-text': 'rgba(255, 255, 255, 0.95)',
  'btn-hover-border': 'rgba(180, 160, 255, 0.3)',

  // ─── Fonts ──────────────────────────────────────
  'font-body': "'Noto Sans SC', 'Segoe UI', 'Microsoft YaHei', sans-serif",
  'font-display': "'Noto Serif SC', serif",

  // ─── Radii ──────────────────────────────────────
  'radius': '4px',
  'radius-lg': '6px',

  // ─── Blur ───────────────────────────────────────
  'blur': '8px',

  // ─── Controls ───────────────────────────────────
  'slider-track': 'rgba(255, 255, 255, 0.1)',
  'slider-thumb': 'rgba(180, 160, 255, 0.8)',
  'scrollbar': 'rgba(255, 255, 255, 0.1)',

  // ─── Speaker ────────────────────────────────────
  'speaker-shadow': 'rgba(255, 255, 255, 0.2)',
};
