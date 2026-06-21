export const MAX_CONDITION_ROWS = 3;

export function canAddConditionRow(conditions) {
  const rowCount = Array.isArray(conditions) ? conditions.length : 0;
  return rowCount < MAX_CONDITION_ROWS;
}
