export const DIALOGUE_DECORATION_NUMBER_BOUNDS = Object.freeze({
  opacity: Object.freeze([0, 1]),
  rotation: Object.freeze([-360, 360]),
});

export function normalizeDialogueDecorationNumber(field, value) {
  const bounds = DIALOGUE_DECORATION_NUMBER_BOUNDS[field];
  if (!bounds) return undefined;
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;

  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return undefined;
  return Math.max(bounds[0], Math.min(bounds[1], normalized));
}
