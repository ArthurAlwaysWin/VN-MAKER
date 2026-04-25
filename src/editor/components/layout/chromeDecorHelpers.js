/**
 * Chrome decoration layout helpers — pure data functions for
 * chrome-level decoration CRUD (Phase 74).
 * Testable without Vue/JSDOM.
 *
 * @module components/layout/chromeDecorHelpers
 */

// ─── Chrome Decoration CRUD ──────────────────────────────

export function addChromeDecoration(cfg) {
  if (!cfg) return;
  cfg.chrome ??= {};
  cfg.chrome.decorations ??= [];
  cfg.chrome.decorations.push({ src: '', x: 0, y: 0, width: 100, height: 100 });
}

export function deleteChromeDecoration(cfg, index) {
  if (!cfg?.chrome?.decorations) return;
  cfg.chrome.decorations.splice(index, 1);
}

export function setChromeDecorationField(cfg, index, field, value) {
  if (!cfg?.chrome?.decorations?.[index]) return;
  cfg.chrome.decorations[index][field] = value;
}
