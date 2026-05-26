import { normalizeConditionPage } from './branchingContract.js';

const BOOL_CONDITION_OPERATORS = new Set(['==', '!=']);

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isBooleanLike(value) {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return value === 0 || value === 1;
  if (typeof value === 'string') {
    return ['false', 'true', '0', '1', 'yes', 'no', 'on', 'off'].includes(value.trim().toLowerCase());
  }
  return false;
}

function isNumberLike(value) {
  return typeof value !== 'boolean' && value !== '' && Number.isFinite(Number(value));
}

function getRawConditionRows(page = {}) {
  if (Array.isArray(page.conditions) && page.conditions.length > 0) {
    return page.conditions;
  }
  if ('variable' in page || 'operator' in page || 'value' in page) {
    return [{
      variableId: page.variable,
      operator: page.operator,
      value: page.value,
    }];
  }
  return [];
}

function evaluateComparison(actual, operator, expected) {
  switch (operator) {
    case '==': return actual === expected;
    case '!=': return actual !== expected;
    case '>': return actual > expected;
    case '>=': return actual >= expected;
    case '<': return actual < expected;
    case '<=': return actual <= expected;
    default: return false;
  }
}

function collectComparisonCandidates(conditions, type) {
  if (type === 'bool') {
    return [false, true];
  }

  const values = [...new Set(conditions.map((condition) => Number(condition.value)))]
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  if (!values.length) {
    return [];
  }

  const candidates = [values[0] - 1, values[values.length - 1] + 1, ...values];
  for (let index = 1; index < values.length; index++) {
    candidates.push((values[index - 1] + values[index]) / 2);
  }
  return candidates;
}

export function analyzeConditionPage(page = {}, { registry = {} } = {}) {
  const normalized = normalizeConditionPage(page, { registry });
  const rawRows = getRawConditionRows(page);
  const findings = [];

  if (
    normalized.trueTarget
    && normalized.falseTarget
    && normalized.trueTarget === normalized.falseTarget
  ) {
    findings.push({
      code: 'condition-identical-targets',
      message: 'Condition page routes both outcomes to the same scene, so the comparison has no routing effect.',
      target: normalized.trueTarget,
    });
  }

  const analyzable = normalized.conditions
    .map((condition, conditionIndex) => {
      const rawCondition = isPlainObject(rawRows[conditionIndex]) ? rawRows[conditionIndex] : {};
      const entry = Object.hasOwn(registry, condition.variableId)
        ? registry[condition.variableId]
        : null;
      if (!entry) {
        return null;
      }

      const rawOperator = rawCondition.operator ?? condition.operator;
      const rawValue = rawCondition.value;
      const isValid = entry.type === 'bool'
        ? BOOL_CONDITION_OPERATORS.has(rawOperator) && isBooleanLike(rawValue)
        : isNumberLike(rawValue);
      return isValid ? { condition, conditionIndex, type: entry.type } : null;
    })
    .filter(Boolean);

  const seenComparisons = new Map();
  for (const item of analyzable) {
    const key = JSON.stringify([
      item.condition.variableId,
      item.condition.operator,
      item.condition.value,
    ]);
    if (seenComparisons.has(key)) {
      findings.push({
        code: 'duplicate-condition-comparison',
        message: `Condition repeats an earlier comparison for variable "${item.condition.variableId}".`,
        variableId: item.condition.variableId,
        conditionIndex: item.conditionIndex,
        relatedConditionIndex: seenComparisons.get(key),
      });
    } else {
      seenComparisons.set(key, item.conditionIndex);
    }
  }

  const groups = new Map();
  for (const item of analyzable) {
    if (!groups.has(item.condition.variableId)) {
      groups.set(item.condition.variableId, []);
    }
    groups.get(item.condition.variableId).push(item);
  }

  for (const [variableId, items] of groups) {
    if (items.length < 2) {
      continue;
    }
    const candidates = collectComparisonCandidates(items.map((item) => item.condition), items[0].type);
    const results = candidates.map((candidate) => {
      const comparisons = items.map(({ condition }) => (
        evaluateComparison(candidate, condition.operator, condition.value)
      ));
      return normalized.conditionMode === 'any'
        ? comparisons.some(Boolean)
        : comparisons.every(Boolean);
    });
    const conditionIndexes = items.map((item) => item.conditionIndex);

    if (normalized.conditionMode === 'all' && results.length && results.every((result) => !result)) {
      findings.push({
        code: 'condition-always-false',
        message: `Condition page contains incompatible comparisons for variable "${variableId}" and can never take its true route.`,
        variableId,
        conditionIndexes,
        outcome: false,
      });
      break;
    }

    if (normalized.conditionMode === 'any' && results.length && results.every(Boolean)) {
      findings.push({
        code: 'condition-always-true',
        message: `Condition page contains exhaustive comparisons for variable "${variableId}" and will always take its true route.`,
        variableId,
        conditionIndexes,
        outcome: true,
      });
      break;
    }
  }

  return findings;
}
