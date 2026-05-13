/**
 * snapGuides.js — Shared snapping, guide, alignment & distribution utilities.
 * Framework-agnostic; unit-testable without Vue.
 */

const DEFAULT_THRESHOLD = 6; // visual px at 1× zoom
const DEFAULT_GRID_SIZE = 16;

// ─── Bounds ─────────────────────────────────────────────────────────

/**
 * Derive an axis-aligned bounding box from an element-like object.
 * Supports both page-canvas elements (characters with x/y/scale) and
 * title-designer elements (x/y/width/height).
 *
 * Returns { left, top, right, bottom, centerX, centerY, width, height, id? }
 */
export function getElementBounds(element) {
  const x = element.x ?? 0;
  const y = element.y ?? 0;
  const w = element.width ?? element._width ?? 0;
  const h = element.height ?? element._height ?? 0;
  const sc = element.scale ?? 1;

  // For characters that use scale instead of explicit width/height,
  // estimate a reasonable bounding box from the scaled placeholder.
  const sw = w * sc;
  const sh = h * sc;

  return {
    id: element.id ?? null,
    left: x,
    top: y,
    right: x + sw,
    bottom: y + sh,
    centerX: x + sw / 2,
    centerY: y + sh / 2,
    width: sw,
    height: sh,
  };
}

// ─── Snap target generation ─────────────────────────────────────────

/**
 * Return snap targets for the canvas itself (edges + centers).
 * canvasBounds = { width, height } or a full bounds object.
 */
export function getCanvasSnapTargets(canvasBounds) {
  const w = canvasBounds.width;
  const h = canvasBounds.height;
  return [
    { axis: 'x', at: 0, kind: 'canvas-edge' },
    { axis: 'x', at: w, kind: 'canvas-edge' },
    { axis: 'x', at: w / 2, kind: 'canvas-center' },
    { axis: 'y', at: 0, kind: 'canvas-edge' },
    { axis: 'y', at: h, kind: 'canvas-edge' },
    { axis: 'y', at: h / 2, kind: 'canvas-center' },
  ];
}

/**
 * Return snap targets for peer elements (excludes activeIds).
 * Each element should have x, y, width, height (or _width/_height).
 */
export function getElementSnapTargets(elements, activeIds = new Set()) {
  const targets = [];
  for (const el of elements) {
    const id = el.id;
    if (activeIds.has(id)) continue;
    const b = getElementBounds(el);
    targets.push(
      { axis: 'x', at: b.left, kind: 'peer-edge', peerId: id },
      { axis: 'x', at: b.right, kind: 'peer-edge', peerId: id },
      { axis: 'x', at: b.centerX, kind: 'peer-center', peerId: id },
      { axis: 'y', at: b.top, kind: 'peer-edge', peerId: id },
      { axis: 'y', at: b.bottom, kind: 'peer-edge', peerId: id },
      { axis: 'y', at: b.centerY, kind: 'peer-center', peerId: id },
    );
  }
  return targets;
}

// ─── Core snap computation ────────────────────────────────────────────

/**
 * Compute snap result for a single active element being dragged.
 *
 * @param {object} opts
 * @param {object} opts.activeBounds  — bounds of the element being dragged
 * @param {object} opts.canvasBounds  — { width, height }
 * @param {object[]} opts.peerBounds  — bounds objects of peer elements
 * @param {number}  [opts.threshold]  — visual px threshold (default 6)
 * @param {number}  [opts.zoom]        — current canvas zoom (default 1)
 * @param {string[]} [opts.axes]      — 'x', 'y', or both (default both)
 * @param {boolean} [opts.enableCanvas] — snap to canvas (default true)
 * @param {boolean} [opts.enablePeers]  — snap to peers (default true)
 * @param {boolean} [opts.enableGrid]   — snap to grid (default false)
 * @param {number}  [opts.gridSize]     — grid spacing in canvas px (default 16)
 *
 * @returns {{ deltaX, deltaY, guides, matches }}
 */
export function computeSnap({
  activeBounds,
  canvasBounds,
  peerBounds = [],
  threshold = DEFAULT_THRESHOLD,
  zoom = 1,
  axes = ['x', 'y'],
  enableCanvas = true,
  enablePeers = true,
  enableGrid = false,
  gridSize = DEFAULT_GRID_SIZE,
}) {
  // Convert visual threshold to canvas coordinate space
  const canvasThreshold = threshold / zoom;

  // Build the list of snap-point sources on the active element
  const activePoints = [];
  if (axes.includes('x')) {
    activePoints.push({ axis: 'x', source: 'left', value: activeBounds.left });
    activePoints.push({ axis: 'x', source: 'right', value: activeBounds.right });
    activePoints.push({ axis: 'x', source: 'centerX', value: activeBounds.centerX });
  }
  if (axes.includes('y')) {
    activePoints.push({ axis: 'y', source: 'top', value: activeBounds.top });
    activePoints.push({ axis: 'y', source: 'bottom', value: activeBounds.bottom });
    activePoints.push({ axis: 'y', source: 'centerY', value: activeBounds.centerY });
  }

  // Collect all target snap points
  const targets = [];
  if (enableCanvas) targets.push(...getCanvasSnapTargets(canvasBounds));
  if (enablePeers) targets.push(...getElementSnapTargets(peerBounds));
  if (enableGrid) {
    targets.push(...getGridSnapTargets(canvasBounds, gridSize));
  }

  // Find closest match per axis
  const best = { x: null, y: null };
  const matches = [];
  const guides = [];

  for (const ap of activePoints) {
    for (const tp of targets) {
      if (ap.axis !== tp.axis) continue;
      const distance = Math.abs(ap.value - tp.at);
      if (distance > canvasThreshold) continue;

      const current = best[ap.axis];
      if (!current || distance < current.distance) {
        best[ap.axis] = {
          axis: ap.axis,
          source: ap.source,
          target: tp.kind.includes('edge') ? ap.source : ap.source, // symmetric
          targetId: tp.peerId ?? null,
          kind: tp.kind,
          distance,
          snapTo: tp.at,
          activeValue: ap.value,
        };
      }
    }
  }

  // Compute delta and collect guides/matches
  let deltaX = 0;
  let deltaY = 0;

  for (const axis of ['x', 'y']) {
    const m = best[axis];
    if (!m) continue;
    const delta = m.snapTo - m.activeValue;
    if (axis === 'x') deltaX = delta;
    else deltaY = delta;

    guides.push({ axis: m.axis, at: m.snapTo, kind: m.kind });
    matches.push({
      axis: m.axis,
      source: m.source,
      target: m.source, // e.g. "top matched top" — the edge/center type
      targetId: m.targetId,
      distance: m.distance,
    });
  }

  return { deltaX, deltaY, guides, matches };
}

/**
 * Generate grid snap targets covering the canvas area.
 */
function getGridSnapTargets(canvasBounds, gridSize) {
  const targets = [];
  const w = canvasBounds.width;
  const h = canvasBounds.height;
  for (let x = gridSize; x < w; x += gridSize) {
    targets.push({ axis: 'x', at: x, kind: 'grid' });
  }
  for (let y = gridSize; y < h; y += gridSize) {
    targets.push({ axis: 'y', at: y, kind: 'grid' });
  }
  return targets;
}

// ─── Snap delta application ──────────────────────────────────────────

/**
 * Apply snap delta to a bounds object, returning a new bounds.
 */
export function applySnapDelta(bounds, snapResult) {
  return {
    ...bounds,
    left: bounds.left + snapResult.deltaX,
    top: bounds.top + snapResult.deltaY,
    right: bounds.right + snapResult.deltaX,
    bottom: bounds.bottom + snapResult.deltaY,
    centerX: bounds.centerX + snapResult.deltaX,
    centerY: bounds.centerY + snapResult.deltaY,
  };
}

/**
 * Derive alignment guides from a snap result (for rendering).
 * Returns the `guides` array directly — each has { axis, at, kind }.
 */
export function computeAlignmentGuides(snapResult) {
  return snapResult.guides ?? [];
}

// ─── Alignment commands ──────────────────────────────────────────────

const ALIGN_COMMANDS = {
  left: (b) => b.left,
  'horizontal-center': (b) => b.centerX,
  right: (b) => b.right,
  top: (b) => b.top,
  'vertical-center': (b) => b.centerY,
  bottom: (b) => b.bottom,
};

/**
 * Align selected elements along a command axis.
 *
 * @param {object[]} elements     — full element objects (mutated in place)
 * @param {Set}      selectedIds  — ids of elements to align
 * @param {string}   command      — 'left'|'horizontal-center'|'right'|'top'|'vertical-center'|'bottom'
 * @param {object}   canvasBounds — { width, height } (unused but reserved)
 * @returns {object[]} the aligned elements (same references)
 */
export function alignElements(elements, selectedIds, command, canvasBounds) {
  const getter = ALIGN_COMMANDS[command];
  if (!getter) throw new Error(`Unknown alignment command: ${command}`);

  const selected = elements.filter(e => selectedIds.has(e.id));
  if (selected.length < 2) return elements;

  const bounds = selected.map(e => ({ el: e, b: getElementBounds(e) }));

  // Find the reference value — the element whose relevant edge is most
  // "leading" (minimum for left/top/center, maximum for right/bottom).
  let refValue;
  if (command === 'right' || command === 'bottom') {
    refValue = Math.max(...bounds.map(({ b }) => getter(b)));
  } else {
    refValue = Math.min(...bounds.map(({ b }) => getter(b)));
  }

  // Apply alignment — shift each selected element
  for (const { el, b } of bounds) {
    const currentVal = getter(b);
    const delta = refValue - currentVal;
    if (command === 'left' || command === 'horizontal-center' || command === 'right') {
      el.x = (el.x ?? 0) + delta;
    } else {
      el.y = (el.y ?? 0) + delta;
    }
  }

  return elements;
}

// ─── Distribution commands ───────────────────────────────────────────

/**
 * Distribute selected elements evenly along an axis.
 *
 * @param {object[]} elements     — full element objects (mutated in place)
 * @param {Set}      selectedIds  — ids of elements to distribute
 * @param {string}   axis         — 'x' or 'y'
 * @returns {object[]} the distributed elements (same references)
 */
export function distributeElements(elements, selectedIds, axis) {
  const selected = elements.filter(e => selectedIds.has(e.id));
  if (selected.length < 3) return elements;

  const prop = axis === 'x' ? 'x' : 'y';
  const centerProp = axis === 'x' ? 'centerX' : 'centerY';

  const items = selected.map(e => ({
    el: e,
    center: getElementBounds(e)[centerProp],
  }));

  // Sort by current center position
  items.sort((a, b) => a.center - b.center);

  const first = items[0].center;
  const last = items[items.length - 1].center;
  const step = (last - first) / (items.length - 1);

  for (let i = 1; i < items.length - 1; i++) {
    const targetCenter = first + step * i;
    const delta = targetCenter - items[i].center;
    const el = items[i].el;
    if (axis === 'x') {
      el.x = (el.x ?? 0) + delta;
    } else {
      el.y = (el.y ?? 0) + delta;
    }
  }

  return elements;
}
