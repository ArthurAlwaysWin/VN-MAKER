import { normalizeUiLayout } from '../../shared/uiLayoutContract.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function calculateLetterboxRect(frameRect, viewport, zoom = 1) {
  const width = Number(frameRect?.width ?? 0);
  const height = Number(frameRect?.height ?? 0);
  const viewportWidth = Number(viewport?.width ?? 0);
  const viewportHeight = Number(viewport?.height ?? 0);
  const scale = Math.max(0.01, Number(zoom) || 1);
  if (width <= 0 || height <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return { x: Number(frameRect?.left ?? 0), y: Number(frameRect?.top ?? 0), width: 0, height: 0, scale: 1 };
  }
  const fit = Math.min(width / viewportWidth, height / viewportHeight) * scale;
  const renderedWidth = viewportWidth * fit;
  const renderedHeight = viewportHeight * fit;
  return {
    x: Number(frameRect?.left ?? 0) + (width - renderedWidth) / 2,
    y: Number(frameRect?.top ?? 0) + (height - renderedHeight) / 2,
    width: renderedWidth,
    height: renderedHeight,
    scale: fit,
  };
}

export function screenPointToCanvasPoint(point, letterbox) {
  const scale = letterbox?.scale || 1;
  return {
    x: (Number(point?.x ?? point?.clientX ?? 0) - Number(letterbox?.x ?? 0)) / scale,
    y: (Number(point?.y ?? point?.clientY ?? 0) - Number(letterbox?.y ?? 0)) / scale,
  };
}

export function canvasPointToScreenPoint(point, letterbox) {
  const scale = letterbox?.scale || 1;
  return {
    x: Number(letterbox?.x ?? 0) + Number(point?.x ?? 0) * scale,
    y: Number(letterbox?.y ?? 0) + Number(point?.y ?? 0) * scale,
  };
}

export function anchorPivotToCanvasOrigin(layout, viewport) {
  const normalized = normalizeUiLayout(layout);
  const anchorX = normalized.anchor.minX * Number(viewport?.width ?? 0);
  const anchorY = normalized.anchor.minY * Number(viewport?.height ?? 0);
  return {
    x: anchorX + normalized.offset.x - normalized.pivot.x * normalized.size.width,
    y: anchorY + normalized.offset.y - normalized.pivot.y * normalized.size.height,
  };
}

export function nudgeLayout(layout, delta) {
  const normalized = normalizeUiLayout(layout);
  return normalizeUiLayout({
    ...normalized,
    offset: {
      x: normalized.offset.x + Number(delta?.x ?? 0),
      y: normalized.offset.y + Number(delta?.y ?? 0),
    },
  });
}

export function resizeLayout(layout, delta, edge = 'bottom-right') {
  const normalized = normalizeUiLayout(layout);
  const next = {
    ...normalized,
    offset: { ...normalized.offset },
    size: { ...normalized.size },
  };
  if (edge.includes('left')) {
    next.offset.x += Number(delta?.x ?? 0);
    next.size.width -= Number(delta?.x ?? 0);
  }
  if (edge.includes('right')) next.size.width += Number(delta?.x ?? 0);
  if (edge.includes('top')) {
    next.offset.y += Number(delta?.y ?? 0);
    next.size.height -= Number(delta?.y ?? 0);
  }
  if (edge.includes('bottom')) next.size.height += Number(delta?.y ?? 0);
  next.size.width = clamp(next.size.width, normalized.constraints.minWidth ?? 1, normalized.constraints.maxWidth ?? Number.MAX_SAFE_INTEGER);
  next.size.height = clamp(next.size.height, normalized.constraints.minHeight ?? 1, normalized.constraints.maxHeight ?? Number.MAX_SAFE_INTEGER);
  return normalizeUiLayout(next);
}
