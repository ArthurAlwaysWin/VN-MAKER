/**
 * Decoration & Footer layout helpers — pure data functions for
 * decoration CRUD and footer button management.
 * Testable without Vue/JSDOM.
 *
 * @module components/layout/decorLayoutHelpers
 */

// ─── Decoration CRUD ───────────────────────────────────

export function addDecoration(cfg) {
  if (!cfg) return;
  cfg.header ??= {};
  cfg.header.decorations ??= [];
  cfg.header.decorations.push({ src: '', x: 0, y: 0, width: 100, height: 100 });
}

export function deleteDecoration(cfg, index) {
  if (!cfg?.header?.decorations) return;
  cfg.header.decorations.splice(index, 1);
}

export function setDecorationField(cfg, index, field, value) {
  if (!cfg?.header?.decorations?.[index]) return;
  cfg.header.decorations[index][field] = value;
}

// ─── Footer Button CRUD ────────────────────────────────

export function addFooterButton(cfg) {
  if (!cfg) return;
  cfg.footer ??= {};
  cfg.footer.buttons ??= [];
  cfg.footer.buttons.push({ text: '按钮', action: 'close', x: 0, y: 0 });
}

export function deleteFooterButton(cfg, index) {
  if (!cfg?.footer?.buttons) return;
  cfg.footer.buttons.splice(index, 1);
}

export function setFooterButtonField(cfg, index, field, value) {
  if (!cfg?.footer?.buttons?.[index]) return;
  cfg.footer.buttons[index][field] = value;
}
