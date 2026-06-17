/**
 * effectDsl — shared Phase 83 player-state effect helpers.
 *
 * Normalizes legacy `setVariable` input into the minimal canonical `effects[]`
 * DSL and provides one runtime executor for variable math plus explicit
 * ending/CG unlock writes.
 */

export const EFFECT_TYPES = Object.freeze([
  'var:set',
  'var:add',
  'var:sub',
  'unlock:ending',
  'unlock:cg',
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

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeEffectId(id) {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Effect requires a non-empty string id');
  }

  return id.trim();
}

function normalizeLegacySetVariable(setVariable) {
  if (!isPlainObject(setVariable)) {
    return [];
  }

  const effects = [];
  for (const [id, rawValue] of Object.entries(setVariable)) {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      continue;
    }

    if (value < 0) {
      effects.push({
        type: 'var:sub',
        id: normalizeEffectId(id),
        value: Math.abs(value),
      });
      continue;
    }

    effects.push({
      type: 'var:add',
      id: normalizeEffectId(id),
      value,
    });
  }

  return effects;
}

function normalizeVarSetValue(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  throw new Error('var:set requires a string, boolean, or finite numeric value');
}

function normalizeVariableMathValue(value, type) {
  if (!isFiniteNumber(value)) {
    throw new Error(`${type} requires a finite numeric value`);
  }

  return value;
}

function normalizeEffect(effect) {
  if (!isPlainObject(effect)) {
    throw new Error('Effect entries must be plain objects');
  }

  if (!EFFECT_TYPES.includes(effect.type)) {
    throw new Error(`Unsupported effect type: ${effect.type}`);
  }

  switch (effect.type) {
    case 'var:set':
      return {
        type: effect.type,
        id: normalizeEffectId(effect.id),
        value: normalizeVarSetValue(effect.value),
      };
    case 'var:add':
    case 'var:sub':
      return {
        type: effect.type,
        id: normalizeEffectId(effect.id),
        value: normalizeVariableMathValue(effect.value, effect.type),
      };
    case 'unlock:ending':
    case 'unlock:cg':
      return {
        type: effect.type,
        id: normalizeEffectId(effect.id),
      };
    default:
      throw new Error(`Unsupported effect type: ${effect.type}`);
  }
}

function getContainerEffects(source) {
  if (Array.isArray(source)) {
    return source;
  }

  if (!isPlainObject(source)) {
    return [];
  }

  if (Array.isArray(source.effects) && source.effects.length > 0) {
    return source.effects;
  }

  return normalizeLegacySetVariable(source.setVariable);
}

function asEffectArray(source) {
  return getContainerEffects(source).map((effect) => normalizeEffect(effect));
}

function isVariableEffectType(type) {
  return type === 'var:set' || type === 'var:add' || type === 'var:sub';
}

function isLegacyVariableCompatEffect(effect) {
  return effect?.type === 'var:add' || effect?.type === 'var:sub';
}

function toNumericVariableValue(value) {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

export function normalizeEffects(source = []) {
  return asEffectArray(source);
}

export function normalizeEffectContainer(container = {}) {
  const normalized = isPlainObject(container)
    ? { ...container }
    : {};
  const effects = normalizeEffects(container);

  delete normalized.setVariable;

  if (effects.length > 0) {
    normalized.effects = effects;
  } else {
    delete normalized.effects;
  }

  return normalized;
}

export function getLegacySetVariableCompat(source = {}) {
  const effects = normalizeEffects(source);
  const compatEffect = effects.find((effect) => isLegacyVariableCompatEffect(effect));
  if (!compatEffect) {
    return null;
  }

  return {
    [compatEffect.id]: compatEffect.type === 'var:sub'
      ? -compatEffect.value
      : compatEffect.value,
  };
}

export function setLegacySetVariableCompat(container = {}, variableId, value) {
  const normalized = normalizeEffectContainer(container);
  const numericValue = Number(value);
  if (typeof variableId === 'string' && variableId.trim() && !Number.isFinite(numericValue)) {
    throw new Error(`Variable effect value for "${variableId.trim()}" must be a finite number`);
  }
  const nextVarEffects = typeof variableId === 'string' && variableId.trim()
    ? normalizeEffects({
      setVariable: {
        [variableId.trim()]: numericValue,
      },
    })
    : [];
  const rebuiltEffects = [];
  let replacedCompatEffect = false;

  for (const effect of normalized.effects ?? []) {
    if (isLegacyVariableCompatEffect(effect)) {
      if (!replacedCompatEffect) {
        rebuiltEffects.push(...nextVarEffects);
        replacedCompatEffect = true;
      } else {
        rebuiltEffects.push(effect);
      }
      continue;
    }

    rebuiltEffects.push(effect);
  }

  if (!replacedCompatEffect) {
    rebuiltEffects.push(...nextVarEffects);
  }

  if (rebuiltEffects.length > 0) {
    normalized.effects = rebuiltEffects;
  } else {
    delete normalized.effects;
  }

  delete normalized.setVariable;
  return normalized;
}

export async function applyEffects(source = [], {
  variables = new Map(),
  playerDataRepository = null,
} = {}) {
  const effects = normalizeEffects(source);
  const persistenceWrites = [];

  for (const effect of effects) {
    switch (effect.type) {
      case 'var:set':
        variables.set(effect.id, cloneJsonValue(effect.value));
        break;
      case 'var:add':
        variables.set(effect.id, toNumericVariableValue(variables.get(effect.id)) + effect.value);
        break;
      case 'var:sub':
        variables.set(effect.id, toNumericVariableValue(variables.get(effect.id)) - effect.value);
        break;
      case 'unlock:ending':
        if (typeof playerDataRepository?.unlockEnding === 'function') {
          persistenceWrites.push(playerDataRepository.unlockEnding(effect.id));
        }
        break;
      case 'unlock:cg':
        if (typeof playerDataRepository?.unlockCg === 'function') {
          persistenceWrites.push(playerDataRepository.unlockCg(effect.id));
        }
        break;
      default:
        throw new Error(`Unsupported effect type: ${effect.type}`);
    }
  }

  if (persistenceWrites.length > 0) {
    await Promise.all(persistenceWrites);
  }

  return {
    effects,
    variables,
  };
}
