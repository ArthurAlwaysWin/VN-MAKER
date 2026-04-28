/**
 * variableRegistry — shared Phase 84 variable registry helpers.
 *
 * Normalizes author-owned variable registry data, derives runtime defaults,
 * overlays saved variable state onto registry truth, and scans reverse
 * references for later rename/delete safety UI work.
 */

import { normalizeEffects } from './effectDsl.js';
import { normalizeConditionPage } from './branchingContract.js';

export const VARIABLE_TYPES = Object.freeze([
  'bool',
  'number',
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

function normalizeVariableId(variableId) {
  if (typeof variableId !== 'string') {
    return null;
  }

  const normalized = variableId.trim();
  return normalized || null;
}

function normalizeVariableType(type) {
  return VARIABLE_TYPES.includes(type) ? type : 'number';
}

function normalizeBooleanValue(value) {
  return Boolean(value);
}

function normalizeNumberValue(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function normalizeRuntimeValueForEntry(entry = {}, value) {
  return entry.type === 'bool'
    ? normalizeBooleanValue(value)
    : normalizeNumberValue(value);
}

export function normalizeVariableEntry(entry = {}) {
  const normalized = isPlainObject(entry)
    ? cloneJsonValue(entry)
    : {};

  normalized.type = normalizeVariableType(normalized.type);
  normalized.initial = normalizeRuntimeValueForEntry(normalized, normalized.initial);
  return normalized;
}

export function normalizeVariableRegistry(registry = {}) {
  if (!isPlainObject(registry)) {
    return {};
  }

  const normalized = {};
  for (const [rawId, entry] of Object.entries(registry)) {
    const variableId = normalizeVariableId(rawId);
    if (!variableId) {
      continue;
    }

    normalized[variableId] = normalizeVariableEntry(entry);
  }

  return normalized;
}

export function getVariableInitialValue(entry = {}) {
  const normalized = normalizeVariableEntry(entry);
  return cloneJsonValue(normalized.initial);
}

export function seedRuntimeVariablesFromRegistry(registry = {}) {
  const normalizedRegistry = normalizeVariableRegistry(registry);
  const seeded = new Map();

  for (const [variableId, entry] of Object.entries(normalizedRegistry)) {
    seeded.set(variableId, getVariableInitialValue(entry));
  }

  return seeded;
}

export function mergeRuntimeVariables(registry = {}, savedVariables = {}) {
  const normalizedRegistry = normalizeVariableRegistry(registry);
  const merged = seedRuntimeVariablesFromRegistry(normalizedRegistry);
  const sourceEntries = savedVariables instanceof Map
    ? [...savedVariables.entries()]
    : Object.entries(isPlainObject(savedVariables) ? savedVariables : {});

  for (const [variableId, value] of sourceEntries) {
    const normalizedId = normalizeVariableId(variableId);
    if (!normalizedId) {
      continue;
    }

    const entry = normalizedRegistry[normalizedId];
    if (entry) {
      merged.set(normalizedId, normalizeRuntimeValueForEntry(entry, value));
      continue;
    }

    merged.set(normalizedId, cloneJsonValue(value));
  }

  return merged;
}

function isVariableEffect(effect) {
  return effect?.type === 'var:set'
    || effect?.type === 'var:add'
    || effect?.type === 'var:sub';
}

export function collectVariableReferences(scriptData = {}) {
  const references = [];

  if (!scriptData?.scenes) {
    return references;
  }

  for (const [sceneId, scene] of Object.entries(scriptData.scenes)) {
    if (!Array.isArray(scene?.pages)) {
      continue;
    }

    scene.pages.forEach((page, pageIndex) => {
      if (!page) {
        return;
      }

      if (page.type === 'choice') {
        (page.options ?? []).forEach((option, optionIndex) => {
          normalizeEffects(option).forEach((effect, effectIndex) => {
            if (!isVariableEffect(effect)) {
              return;
            }

            references.push({
              variableId: effect.id,
              sceneId,
              sceneName: scene.name || sceneId,
              pageIndex,
              pageType: 'choice',
              source: 'choice-effect',
              optionIndex,
              effectIndex,
            });
          });
        });
      }

      if (page.type === 'condition') {
        const normalizedPage = normalizeConditionPage(page);
        normalizedPage.conditions.forEach((condition, conditionIndex) => {
          references.push({
            variableId: condition.variableId,
            sceneId,
            sceneName: scene.name || sceneId,
            pageIndex,
            pageType: 'condition',
            source: 'condition',
            conditionIndex,
          });
        });
      }
    });
  }

  return references;
}
