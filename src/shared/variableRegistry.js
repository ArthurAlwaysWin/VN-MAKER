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

export const VARIABLE_KINDS = Object.freeze([
  'generic',
  'affection',
]);

export const VARIABLE_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeVariableId(variableId) {
  if (typeof variableId !== 'string') {
    return null;
  }

  const normalized = variableId.trim();
  return normalized || null;
}

export function isValidVariableId(variableId) {
  const normalized = normalizeVariableId(variableId);
  return Boolean(normalized && VARIABLE_ID_PATTERN.test(normalized));
}

function normalizeVariableType(type) {
  return VARIABLE_TYPES.includes(type) ? type : 'number';
}

function normalizeVariableKind(kind) {
  return VARIABLE_KINDS.includes(kind) ? kind : 'generic';
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function normalizeBooleanValue(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
      return false;
    }
    if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
      return true;
    }
  }

  return Boolean(value);
}

function normalizeNumberValue(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
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
  const hasExplicitKind = normalized.kind !== undefined || normalized.characterId !== undefined;
  normalized.kind = normalizeVariableKind(normalized.kind ?? (normalized.characterId ? 'affection' : 'generic'));
  if (!hasExplicitKind && normalized.kind === 'generic') {
    delete normalized.kind;
  }

  const label = normalizeOptionalString(normalized.label ?? normalized.name);
  if (label) {
    normalized.label = label;
  } else {
    delete normalized.label;
  }

  const group = normalizeOptionalString(normalized.group);
  if (group) {
    normalized.group = group;
  } else {
    delete normalized.group;
  }

  const notes = normalizeOptionalString(normalized.notes);
  if (notes) {
    normalized.notes = notes;
  } else {
    delete normalized.notes;
  }

  if (normalized.kind === 'affection') {
    const characterId = normalizeOptionalString(normalized.characterId);
    if (characterId) {
      normalized.characterId = characterId;
    } else {
      delete normalized.characterId;
    }
  } else {
    delete normalized.characterId;
  }

  if (normalized.type === 'number') {
    const min = normalizeOptionalNumber(normalized.min);
    const max = normalizeOptionalNumber(normalized.max);
    const step = normalizeOptionalNumber(normalized.step);
    if (min != null) normalized.min = min;
    else delete normalized.min;
    if (max != null) normalized.max = max;
    else delete normalized.max;
    if (step != null && step > 0) normalized.step = step;
    else delete normalized.step;
  } else {
    delete normalized.min;
    delete normalized.max;
    delete normalized.step;
  }

  return normalized;
}

export function createAffectionVariableId(characterId) {
  const normalizedCharacterId = normalizeVariableId(characterId);
  return normalizedCharacterId ? `${normalizedCharacterId}_affection` : null;
}

export function createAffectionVariableEntry({
  characterId,
  characterName,
  initial = 0,
  label,
  group = 'Affection',
  notes = '',
  min = 0,
  max = 100,
  step = 1,
} = {}) {
  const displayName = normalizeOptionalString(characterName) ?? normalizeOptionalString(characterId) ?? 'Character';
  return normalizeVariableEntry({
    type: 'number',
    initial,
    label: label ?? `${displayName} Affection`,
    group,
    notes,
    kind: 'affection',
    characterId,
    min,
    max,
    step,
  });
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

function normalizeOptionEffectsForReferences(option) {
  try {
    return normalizeEffects(option);
  } catch {
    return [];
  }
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
        const options = Array.isArray(page.options) ? page.options : [];
        options.forEach((option, optionIndex) => {
          normalizeOptionEffectsForReferences(option).forEach((effect, effectIndex) => {
            if (!isVariableEffect(effect)) {
              return;
            }

            references.push({
              variableId: effect.id,
              kind: 'choice-effect',
              pathString: `scenes.${sceneId}.pages.${pageIndex}.options.${optionIndex}.effects.${effectIndex}`,
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
            kind: 'condition',
            pathString: `scenes.${sceneId}.pages.${pageIndex}.conditions.${conditionIndex}`,
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
