/**
 * OKLCH Color Space — perceptually uniform color conversion and derivation.
 *
 * Zero-dependency OKLCH ↔ sRGB conversion + gamut clamping + smart token
 * derivation. Replaces HSL-based color math with perceptually uniform
 * OKLCH for consistent palette generation across all hue families.
 *
 * @module oklch
 */

// ─── sRGB ↔ Linear Conversion ─────────────────────────

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// ─── RGB ↔ OKLCH Conversion ───────────────────────────

/**
 * Convert sRGB (0-255) to OKLCH.
 *
 * @param {number} r — red channel 0-255
 * @param {number} g — green channel 0-255
 * @param {number} b — blue channel 0-255
 * @returns {{ l: number, c: number, h: number }} OKLCH values
 */
export function rgbToOklch(r, g, b) {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);

  // Linear RGB → LMS (via M1 matrix)
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  // LMS → OKLab (via M2 matrix)
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bv = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // OKLab → OKLCH (polar form)
  const C = Math.sqrt(a * a + bv * bv);
  let H = Math.atan2(bv, a) * 180 / Math.PI;
  if (H < 0) H += 360;

  return { l: L, c: C, h: H };
}

/**
 * Convert OKLCH to sRGB (0-255).
 *
 * @param {number} l — lightness 0-1
 * @param {number} c — chroma ≥0
 * @param {number} h — hue 0-360
 * @returns {[number, number, number]} [r, g, b] each 0-255
 */
export function oklchToRgb(l, c, h) {
  // OKLCH → OKLab
  const hRad = h * Math.PI / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // OKLab → LMS (inverse M2)
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  // Cube LMS
  const lr = l_ * l_ * l_;
  const lm = m_ * m_ * m_;
  const ls = s_ * s_ * s_;

  // LMS → linear RGB (inverse M1)
  const R = +4.0767416621 * lr - 3.3077115913 * lm + 0.2309699292 * ls;
  const G = -1.2684380046 * lr + 2.6097574011 * lm - 0.3413193965 * ls;
  const B = -0.0041960863 * lr - 0.7034186147 * lm + 1.7076147010 * ls;

  return [
    Math.round(clamp01(linearToSrgb(R)) * 255),
    Math.round(clamp01(linearToSrgb(G)) * 255),
    Math.round(clamp01(linearToSrgb(B)) * 255),
  ];
}

/**
 * Convert hex color to OKLCH.
 *
 * @param {string} hex — '#rrggbb'
 * @returns {{ l: number, c: number, h: number }}
 */
export function hexToOklch(hex) {
  const h = hex.replace('#', '');
  return rgbToOklch(
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  );
}

// ─── Gamut Clamping ───────────────────────────────────

/**
 * Check if an OKLCH color is within the sRGB gamut.
 *
 * @param {number} l — lightness
 * @param {number} c — chroma
 * @param {number} h — hue
 * @returns {boolean}
 */
export function isInGamut(l, c, h) {
  const [r, g, b] = oklchToRgb(l, c, h);
  const check = rgbToOklch(r, g, b);
  return Math.abs(check.c - c) < 0.002;
}

/**
 * Clamp chroma to sRGB gamut via binary search.
 * Preserves lightness and hue, only reduces saturation.
 *
 * @param {number} l — lightness
 * @param {number} c — chroma (target, may be out of gamut)
 * @param {number} h — hue
 * @returns {number} maximum in-gamut chroma ≤ c
 */
export function clampChroma(l, c, h) {
  if (c <= 0) return 0;
  if (isInGamut(l, c, h)) return c;
  let lo = 0;
  let hi = c;
  for (let i = 0; i < 20 && hi - lo > 0.001; i++) {
    const mid = (lo + hi) / 2;
    if (isInGamut(l, mid, h)) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ─── Derivation Rule Tables ───────────────────────────

const DARK_RULES = {
  // ── Primary group: primary color at varying alpha ──
  'primary':          { l: 'p.l', c: 'p.c', h: 'p.h', alpha: 0.90 },
  'primary-subtle':   { l: 'p.l', c: 'p.c', h: 'p.h', alpha: 0.08 },
  'save-title':       { l: 'p.l', c: 'p.c', h: 'p.h', alpha: 0.90 },
  'border-hover':     { l: 'p.l', c: 'p.c', h: 'p.h', alpha: 0.30 },
  'border-active':    { l: 'p.l', c: 'p.c', h: 'p.h', alpha: 0.50 },
  'btn-hover-border': { l: 'p.l', c: 'p.c', h: 'p.h', alpha: 0.30 },
  'slider-thumb':     { l: 'p.l', c: 'p.c', h: 'p.h', alpha: 0.80 },

  // ── Accent group ──
  'accent':           { l: 'a.l', c: 'a.c', h: 'a.h', alpha: 0.25 },
  'accent-border':    { l: 'a.l', c: 'a.c', h: 'a.h', alpha: 0.50 },
  'load-title':       { l: 0.70,  c: 'a.c', h: 'a.h', alpha: 0.90 },

  // ── Text group: near-white with primary hue tint ──
  'text':             { l: 0.99, c: 0.003, h: 'p.h', alpha: 0.92 },
  'text-heading':     { l: 0.99, c: 0.003, h: 'p.h', alpha: 0.85 },
  'text-secondary':   { l: 0.99, c: 0.003, h: 'p.h', alpha: 0.75 },
  'text-muted':       { l: 0.99, c: 0.003, h: 'p.h', alpha: 0.50 },
  'text-dim':         { l: 0.99, c: 0.003, h: 'p.h', alpha: 0.40 },
  'text-faint':       { l: 0.99, c: 0.003, h: 'p.h', alpha: 0.30 },
  'btn-text':         { l: 0.99, c: 0.003, h: 'p.h', alpha: 0.90 },
  'btn-hover-text':   { l: 0.99, c: 0.003, h: 'p.h', alpha: 0.95 },

  // ── Neutral group: white at very low alpha ──
  'border':           { l: 0.99, c: 0.000, h: 0,     alpha: 0.08 },
  'btn-border':       { l: 0.99, c: 0.000, h: 0,     alpha: 0.10 },
  'slider-track':     { l: 0.99, c: 0.000, h: 0,     alpha: 0.10 },
  'scrollbar':        { l: 0.99, c: 0.000, h: 0,     alpha: 0.10 },
  'speaker-shadow':   { l: 0.99, c: 0.000, h: 0,     alpha: 0.20 },

  // ── Background group: very dark, desaturated primary ──
  'menu-bg':          { l: 0.00, c: 0.000, h: 'p.h', alpha: 0.70 },
  'panel-bg':         { l: 0.10, c: 'p.c*0.15', h: 'p.h', alpha: 0.95 },
  'card-bg':          { l: 0.18, c: 'p.c*0.25', h: 'p.h', alpha: 0.60 },
  'card-bg-hover':    { l: 0.22, c: 'p.c*0.30', h: 'p.h', alpha: 0.60 },
  'confirm-bg':       { l: 0.18, c: 'p.c*0.20', h: 'p.h', alpha: 0.95 },
  'btn-bg':           { l: 0.28, c: 'p.c*0.40', h: 'p.h', alpha: 0.60 },
  'btn-hover-bg':     { l: 0.35, c: 'p.c*0.55', h: 'p.h', alpha: 0.70 },

  // ── Special ──
  'shadow':           { l: 0.30, c: 'p.c*0.40', h: 'p.h', alpha: 0.30 },
  'title-glow':       { l: 'p.l', c: 'p.c*0.60', h: 'p.h', alpha: 0.30 },

  // ── Fixed (UX convention) ──
  'danger':           { fixed: '#ff6b6b' },
  'danger-hover':     { fixed: 'rgba(255, 100, 100, 0.90)' },
};

const LIGHT_OVERRIDES = {
  'text':             { l: 0.20, c: 0.003, h: 'p.h', alpha: 0.92 },
  'text-heading':     { l: 0.20, c: 0.003, h: 'p.h', alpha: 0.85 },
  'text-secondary':   { l: 0.35, c: 0.003, h: 'p.h', alpha: 0.75 },
  'text-muted':       { l: 0.35, c: 0.003, h: 'p.h', alpha: 0.50 },
  'text-dim':         { l: 0.35, c: 0.003, h: 'p.h', alpha: 0.40 },
  'text-faint':       { l: 0.35, c: 0.003, h: 'p.h', alpha: 0.30 },
  'btn-text':         { l: 0.20, c: 0.003, h: 'p.h', alpha: 0.90 },
  'btn-hover-text':   { l: 0.20, c: 0.003, h: 'p.h', alpha: 0.95 },
  'border':           { l: 0.15, c: 0.000, h: 0,     alpha: 0.08 },
  'btn-border':       { l: 0.15, c: 0.000, h: 0,     alpha: 0.10 },
  'slider-track':     { l: 0.15, c: 0.000, h: 0,     alpha: 0.10 },
  'scrollbar':        { l: 0.15, c: 0.000, h: 0,     alpha: 0.10 },
  'speaker-shadow':   { l: 0.15, c: 0.000, h: 0,     alpha: 0.20 },
  'menu-bg':          { l: 0.95, c: 0.000, h: 'p.h', alpha: 0.70 },
  'panel-bg':         { l: 0.97, c: 'p.c*0.05', h: 'p.h', alpha: 0.95 },
  'card-bg':          { l: 0.93, c: 'p.c*0.08', h: 'p.h', alpha: 0.60 },
  'card-bg-hover':    { l: 0.91, c: 'p.c*0.10', h: 'p.h', alpha: 0.60 },
  'confirm-bg':       { l: 0.96, c: 'p.c*0.05', h: 'p.h', alpha: 0.95 },
  'btn-bg':           { l: 'p.l', c: 'p.c',     h: 'p.h', alpha: 0.15 },
  'btn-hover-bg':     { l: 'p.l', c: 'p.c',     h: 'p.h', alpha: 0.25 },
  'shadow':           { l: 0.70, c: 'p.c*0.10', h: 'p.h', alpha: 0.15 },
};

// ─── Rule Expression Resolver ─────────────────────────

function resolveValue(expr, p, a) {
  if (typeof expr === 'number') return expr;
  // Direct property references
  if (expr === 'p.l') return p.l;
  if (expr === 'p.c') return p.c;
  if (expr === 'p.h') return p.h;
  if (expr === 'a.l') return a.l;
  if (expr === 'a.c') return a.c;
  if (expr === 'a.h') return a.h;
  // Multiplication expressions: 'p.c*0.15', 'a.c*0.5'
  const mulMatch = expr.match(/^([pa])\.([lch])\*(.+)$/);
  if (mulMatch) {
    const obj = mulMatch[1] === 'p' ? p : a;
    return obj[mulMatch[2]] * parseFloat(mulMatch[3]);
  }
  return parseFloat(expr);
}

function hex2(n) {
  return n.toString(16).padStart(2, '0');
}

// ─── Gradient Builders ────────────────────────────────

function makeDialogueGradient(p, isDark) {
  const l = isDark ? 0.08 : 0.97;
  const rawC = p.c * (isDark ? 0.10 : 0.02);
  const c = clampChroma(l, rawC, p.h);
  const [r, g, b] = oklchToRgb(l, c, p.h);
  return `linear-gradient(to top, rgba(${r}, ${g}, ${b}, 0.92) 0%, rgba(${r}, ${g}, ${b}, 0.88) 70%, rgba(${r}, ${g}, ${b}, 0.75) 100%)`;
}

function makeTitleGradient(p, a, isDark) {
  // Background color
  const bgL = isDark ? 0.08 : 0.97;
  const bgC = clampChroma(bgL, p.c * (isDark ? 0.10 : 0.02), p.h);
  const [bgR, bgG, bgB] = oklchToRgb(bgL, bgC, p.h);

  // Accent tint
  const accL = isDark ? 0.15 : 0.90;
  const accC = clampChroma(accL, a.c * 0.30, a.h);
  const [accR, accG, accB] = oklchToRgb(accL, accC, a.h);

  // Mid blend
  const midL = isDark ? 0.12 : 0.94;
  const midC = clampChroma(midL, p.c * (isDark ? 0.15 : 0.05), p.h);
  const [midR, midG, midB] = oklchToRgb(midL, midC, p.h);

  return `linear-gradient(135deg, rgb(${bgR}, ${bgG}, ${bgB}) 0%, rgb(${accR}, ${accG}, ${accB}) 30%, rgb(${midR}, ${midG}, ${midB}) 60%, rgb(${bgR}, ${bgG}, ${bgB}) 100%)`;
}

// ─── Token Derivation ─────────────────────────────────

/**
 * Derive all 35 color tokens from primary + accent + mode.
 *
 * @param {string} primaryHex — '#rrggbb' primary color
 * @param {string|null} [accentHex] — '#rrggbb' accent color (auto-derived if null)
 * @param {'dark'|'light'} [mode='dark'] — color mode
 * @returns {Record<string, string>} Complete 35-token map (rgba/hex/gradient strings)
 */
export function deriveTokens(primaryHex, accentHex, mode = 'dark') {
  const p = hexToOklch(primaryHex);

  // Auto-derive accent via complementary harmony if not provided
  let a;
  if (accentHex) {
    a = hexToOklch(accentHex);
  } else {
    a = { l: p.l, c: p.c, h: (p.h + 180) % 360 };
  }

  const isDark = mode === 'dark';
  const rules = isDark ? DARK_RULES : { ...DARK_RULES, ...LIGHT_OVERRIDES };
  const tokens = {};

  for (const [key, rule] of Object.entries(rules)) {
    if (rule.fixed) {
      tokens[key] = rule.fixed;
      continue;
    }

    const l = resolveValue(rule.l, p, a);
    const c = resolveValue(rule.c, p, a);
    const h = resolveValue(rule.h, p, a);
    const alpha = rule.alpha;

    const safeC = clampChroma(l, c, h);
    const [r, g, b] = oklchToRgb(l, safeC, h);

    tokens[key] = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }

  // Gradient tokens
  tokens['dialogue-bg'] = makeDialogueGradient(p, isDark);
  tokens['title-bg'] = makeTitleGradient(p, a, isDark);

  return tokens;
}
