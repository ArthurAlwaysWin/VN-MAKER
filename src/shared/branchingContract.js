/**
 * branchingContract — shared Phase 84 condition-page helpers.
 *
 * Normalizes legacy single-condition fields into the canonical multi-row
 * contract, evaluates condition rows for runtime use, and exposes summary
 * helpers for future editor UI work.
 */

export const CONDITION_MODES = Object.freeze([
  'all',
  'any',
]);

export const CONDITION_OPERATORS = Object.freeze([
  '==',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
]);

const BOOL_CONDITION_OPERATORS = Object.freeze([
  '==',
  '!=',
]);

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeConditionMode(mode) {
  return CONDITION_MODES.includes(mode) ? mode : 'all';
}

function normalizeConditionTarget(target) {
  if (typeof target !== 'string') {
    return null;
  }

  const normalized = target.trim();
  return normalized || null;
}

function normalizeVariableId(variableId) {
  if (typeof variableId !== 'string') {
    return null;
  }

  const normalized = variableId.trim();
  return normalized || null;
}

function inferConditionValueType(row = {}, registry = {}) {
  const registryType = registry?.[row.variableId]?.type;
  if (registryType === 'bool' || registryType === 'number') {
    return registryType;
  }

  return typeof row.value === 'boolean' ? 'bool' : 'number';
}

function normalizeBooleanValue(value) {
  return Boolean(value);
}

function normalizeNumberValue(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function normalizeConditionOperator(operator, valueType) {
  if (valueType === 'bool') {
    return BOOL_CONDITION_OPERATORS.includes(operator) ? operator : '==';
  }

  return CONDITION_OPERATORS.includes(operator) ? operator : '==';
}

function normalizeConditionValue(value, valueType) {
  return valueType === 'bool'
    ? normalizeBooleanValue(value)
    : normalizeNumberValue(value);
}

function getLegacyConditionRows(page = {}) {
  if (!('variable' in page) && !('operator' in page) && !('value' in page)) {
    return [];
  }

  return [{
    variableId: page.variable,
    operator: page.operator,
    value: page.value,
  }];
}

function getInputConditionRows(page = {}) {
  if (Array.isArray(page.conditions) && page.conditions.length > 0) {
    return page.conditions;
  }

  return getLegacyConditionRows(page);
}

function compareConditionValues(actual, operator, expected) {
  switch (operator) {
    case '==':
      return actual === expected;
    case '!=':
      return actual !== expected;
    case '>':
      return actual > expected;
    case '>=':
      return actual >= expected;
    case '<':
      return actual < expected;
    case '<=':
      return actual <= expected;
    default:
      return false;
  }
}

export function normalizeConditionRow(row = {}, { registry = {} } = {}) {
  const input = isPlainObject(row) ? row : {};
  const variableId = normalizeVariableId(input.variableId ?? input.variable);
  const valueType = inferConditionValueType({
    variableId,
    value: input.value,
  }, registry);

  return {
    variableId,
    operator: normalizeConditionOperator(input.operator, valueType),
    value: normalizeConditionValue(input.value, valueType),
  };
}

export function normalizeConditionPage(page = {}, { registry = {} } = {}) {
  const normalized = isPlainObject(page)
    ? cloneJsonValue(page)
    : {};
  const inputRows = getInputConditionRows(normalized);

  delete normalized.variable;
  delete normalized.operator;
  delete normalized.value;
  delete normalized.target;

  normalized.conditionMode = normalizeConditionMode(normalized.conditionMode);
  normalized.conditions = inputRows
    .slice(0, 3)
    .map((row) => normalizeConditionRow(row, { registry }));
  normalized.trueTarget = normalizeConditionTarget(normalized.trueTarget ?? page.target ?? null);
  normalized.falseTarget = normalizeConditionTarget(normalized.falseTarget);

  return normalized;
}

export function normalizeConditionPages(scriptData = {}, { registry = {} } = {}) {
  if (!scriptData?.scenes) {
    return scriptData;
  }

  for (const scene of Object.values(scriptData.scenes)) {
    if (!Array.isArray(scene?.pages)) {
      continue;
    }

    scene.pages = scene.pages.map((page) => {
      if (!page || page.type !== 'condition') {
        return page;
      }

      return normalizeConditionPage(page, { registry });
    });
  }

  return scriptData;
}

export function evaluateConditionPage(page = {}, {
  variables = new Map(),
  registry = {},
} = {}) {
  const normalized = normalizeConditionPage(page, { registry });
  const rows = normalized.conditions ?? [];

  if (rows.length === 0) {
    return false;
  }

  const rowResults = rows.map((row) => {
    const valueType = inferConditionValueType(row, registry);
    const actualSource = variables instanceof Map
      ? variables.get(row.variableId)
      : variables?.[row.variableId];
    const actual = normalizeConditionValue(actualSource, valueType);
    const expected = normalizeConditionValue(row.value, valueType);
    return compareConditionValues(actual, row.operator, expected);
  });

  return normalized.conditionMode === 'any'
    ? rowResults.some(Boolean)
    : rowResults.every(Boolean);
}

export function formatConditionSummary(page = {}, {
  registry = {},
  sceneLabels = {},
} = {}) {
  const normalized = normalizeConditionPage(page, { registry });
  const joiner = normalized.conditionMode === 'any' ? ' 或 ' : ' 且 ';
  const rows = normalized.conditions.map((row) => {
    const label = registry?.[row.variableId]?.label
      || registry?.[row.variableId]?.name
      || row.variableId
      || '未选择变量';
    return `${label} ${row.operator} ${String(row.value)}`;
  });
  const successLabel = sceneLabels?.[normalized.trueTarget]
    || normalized.trueTarget
    || '未选择场景';
  const failureLabel = sceneLabels?.[normalized.falseTarget]
    || normalized.falseTarget
    || '继续下一页';

  return `若 ${rows.join(joiner) || '条件未配置'} → ${successLabel}，否则 → ${failureLabel}`;
}
