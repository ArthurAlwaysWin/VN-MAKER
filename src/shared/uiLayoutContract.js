const DEFAULT_LAYOUT = Object.freeze({
  anchor: Object.freeze({ minX: 0, minY: 0, maxX: 1, maxY: 1 }),
  pivot: Object.freeze({ x: 0.5, y: 0.5 }),
  offset: Object.freeze({ x: 0, y: 0 }),
  size: Object.freeze({ width: 'auto', height: 'auto' }),
  constraints: Object.freeze({ minWidth: 0, minHeight: 0, maxWidth: null, maxHeight: null }),
  padding: Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 }),
  align: Object.freeze({ horizontal: 'stretch', vertical: 'stretch' }),
});

const clone = value => JSON.parse(JSON.stringify(value));
const finite = value => typeof value === 'number' && Number.isFinite(value);

export function normalizeUiLayout(layout = {}) {
  const source = layout && typeof layout === 'object' && !Array.isArray(layout) ? layout : {};
  const out = clone(DEFAULT_LAYOUT);
  for (const section of ['anchor', 'pivot', 'offset', 'size', 'constraints', 'padding', 'align']) {
    if (source[section] && typeof source[section] === 'object' && !Array.isArray(source[section])) Object.assign(out[section], source[section]);
  }
  return out;
}

function diagnostic(code, message, path) {
  return { severity: 'error', code, message, path, pathString: path.join('.') };
}

export function validateUiLayout(layout, path = []) {
  const d = [];
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return [diagnostic('ui-layout-invalid', 'Layout must be an object.', path)];
  const normalized = normalizeUiLayout(layout);
  for (const key of ['minX', 'minY', 'maxX', 'maxY']) {
    const value = normalized.anchor[key];
    if (!finite(value) || value < 0 || value > 1) d.push(diagnostic('ui-layout-anchor-invalid', `Anchor ${key} must be a number from 0 to 1.`, [...path, 'anchor', key]));
  }
  if (finite(normalized.anchor.minX) && finite(normalized.anchor.maxX) && normalized.anchor.minX > normalized.anchor.maxX) d.push(diagnostic('ui-layout-anchor-invalid', 'Anchor minX cannot exceed maxX.', [...path, 'anchor']));
  if (finite(normalized.anchor.minY) && finite(normalized.anchor.maxY) && normalized.anchor.minY > normalized.anchor.maxY) d.push(diagnostic('ui-layout-anchor-invalid', 'Anchor minY cannot exceed maxY.', [...path, 'anchor']));
  for (const key of ['x', 'y']) if (!finite(normalized.pivot[key]) || normalized.pivot[key] < 0 || normalized.pivot[key] > 1) d.push(diagnostic('ui-layout-pivot-invalid', `Pivot ${key} must be a number from 0 to 1.`, [...path, 'pivot', key]));
  for (const key of ['x', 'y']) if (!finite(normalized.offset[key])) d.push(diagnostic('ui-layout-offset-invalid', `Offset ${key} must be finite.`, [...path, 'offset', key]));
  for (const key of ['width', 'height']) if (!(normalized.size[key] === 'auto' || (finite(normalized.size[key]) && normalized.size[key] >= 0))) d.push(diagnostic('ui-layout-size-invalid', `Size ${key} must be "auto" or a non-negative number.`, [...path, 'size', key]));
  for (const key of ['minWidth', 'minHeight']) if (!finite(normalized.constraints[key]) || normalized.constraints[key] < 0) d.push(diagnostic('ui-layout-constraint-invalid', `${key} must be a non-negative number.`, [...path, 'constraints', key]));
  for (const key of ['maxWidth', 'maxHeight']) if (!(normalized.constraints[key] === null || (finite(normalized.constraints[key]) && normalized.constraints[key] >= 0))) d.push(diagnostic('ui-layout-constraint-invalid', `${key} must be null or a non-negative number.`, [...path, 'constraints', key]));
  for (const key of ['top', 'right', 'bottom', 'left']) if (!finite(normalized.padding[key]) || normalized.padding[key] < 0) d.push(diagnostic('ui-layout-padding-invalid', `Padding ${key} must be non-negative.`, [...path, 'padding', key]));
  if (!['start', 'center', 'end', 'stretch'].includes(normalized.align.horizontal)) d.push(diagnostic('ui-layout-alignment-invalid', 'Horizontal alignment is unsupported.', [...path, 'align', 'horizontal']));
  if (!['start', 'center', 'end', 'stretch'].includes(normalized.align.vertical)) d.push(diagnostic('ui-layout-alignment-invalid', 'Vertical alignment is unsupported.', [...path, 'align', 'vertical']));
  return d;
}

export function absoluteLegacyLayout({ x = 0, y = 0, width = 'auto', height = 'auto' } = {}, resolution = { width: 1280, height: 720 }) {
  const rw = finite(resolution.width) && resolution.width > 0 ? resolution.width : 1280;
  const rh = finite(resolution.height) && resolution.height > 0 ? resolution.height : 720;
  return normalizeUiLayout({
    anchor: { minX: 0, minY: 0, maxX: 0, maxY: 0 }, pivot: { x: 0, y: 0 },
    offset: { x: finite(x) ? x : 0, y: finite(y) ? y : 0 }, size: { width: finite(width) ? width : 'auto', height: finite(height) ? height : 'auto' },
    constraints: { minWidth: 0, minHeight: 0, maxWidth: rw, maxHeight: rh },
  });
}

export const UI_LAYOUT_DEFAULTS = DEFAULT_LAYOUT;
