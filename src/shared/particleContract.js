/**
 * Shared particle/weather contract.
 *
 * Page particles use explicit object/null/omitted semantics:
 * object = play/update, null/false = stop, omitted/undefined = inherit.
 */

const PARTICLE_DIRECTIONS = Object.freeze(['down', 'up', 'left', 'right']);
const FALLBACK_PRESET = 'dust';

export const PARTICLE_PRESET_DEFS = Object.freeze({
  sakura: Object.freeze({
    id: 'sakura',
    label: '樱花',
    defaultDensity: 0.45,
    cap: 35,
    color: '#ffc6d9',
    direction: 'down',
    notes: 'Rotating soft petals.',
  }),
  snow: Object.freeze({
    id: 'snow',
    label: '雪',
    defaultDensity: 0.55,
    cap: 60,
    color: '#ffffff',
    direction: 'down',
    notes: 'Round flakes, slow drift.',
  }),
  rain: Object.freeze({
    id: 'rain',
    label: '雨',
    defaultDensity: 0.65,
    cap: 100,
    color: '#9ecbff',
    direction: 'down',
    notes: 'Fast streak lines.',
  }),
  firefly: Object.freeze({
    id: 'firefly',
    label: '萤火',
    defaultDensity: 0.35,
    cap: 18,
    color: '#d8ff8f',
    direction: 'up',
    notes: 'Glowing dots.',
  }),
  dust: Object.freeze({
    id: 'dust',
    label: '尘埃',
    defaultDensity: 0.35,
    cap: 35,
    color: '#f0e6d2',
    direction: 'down',
    notes: 'Subtle floating dots.',
  }),
  sparkle: Object.freeze({
    id: 'sparkle',
    label: '星光',
    defaultDensity: 0.35,
    cap: 24,
    color: '#fff4a8',
    direction: 'down',
    notes: 'Cross sparkle.',
  }),
  leaves: Object.freeze({
    id: 'leaves',
    label: '落叶',
    defaultDensity: 0.35,
    cap: 28,
    color: '#d89b45',
    direction: 'down',
    notes: 'Rotating leaf ellipses.',
  }),
  bubbles: Object.freeze({
    id: 'bubbles',
    label: '气泡',
    defaultDensity: 0.30,
    cap: 24,
    color: '#b7f3ff',
    direction: 'up',
    notes: 'Upward circles.',
  }),
});

export const PARTICLE_PRESETS = Object.freeze(Object.keys(PARTICLE_PRESET_DEFS));

export const PARTICLE_FIELD_SCHEMA = Object.freeze({
  preset: Object.freeze({ type: 'enum', values: PARTICLE_PRESETS, required: true }),
  density: Object.freeze({ type: 'number', minimum: 0, maximum: 1 }),
  speed: Object.freeze({ type: 'number', minimum: 0, maximum: 2, default: 1 }),
  wind: Object.freeze({ type: 'number', minimum: -1, maximum: 1, default: 0 }),
  opacity: Object.freeze({ type: 'number', minimum: 0, maximum: 1, default: 1 }),
  color: Object.freeze({ type: 'color', pattern: '^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$' }),
  direction: Object.freeze({ type: 'enum', values: PARTICLE_DIRECTIONS }),
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clampNumber(value, { minimum, maximum, default: defaultValue }) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return defaultValue;
  }
  return Math.min(maximum, Math.max(minimum, number));
}

function normalizeColor(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)
    ? trimmed
    : fallback;
}

export function isKnownParticlePreset(preset) {
  return typeof preset === 'string' && Object.hasOwn(PARTICLE_PRESET_DEFS, preset);
}

export function normalizeParticleConfig(config, options = {}) {
  if (!isPlainObject(config)) {
    return null;
  }

  const rawPreset = typeof config.preset === 'string' ? config.preset.trim() : '';
  const preset = isKnownParticlePreset(rawPreset) ? rawPreset : FALLBACK_PRESET;
  const presetDef = PARTICLE_PRESET_DEFS[preset];

  const normalized = {
    preset,
    density: clampNumber(config.density, {
      minimum: PARTICLE_FIELD_SCHEMA.density.minimum,
      maximum: PARTICLE_FIELD_SCHEMA.density.maximum,
      default: presetDef.defaultDensity,
    }),
    speed: clampNumber(config.speed, PARTICLE_FIELD_SCHEMA.speed),
    wind: clampNumber(config.wind, PARTICLE_FIELD_SCHEMA.wind),
    opacity: clampNumber(config.opacity, PARTICLE_FIELD_SCHEMA.opacity),
    color: normalizeColor(config.color, presetDef.color),
    direction: PARTICLE_DIRECTIONS.includes(config.direction) ? config.direction : presetDef.direction,
  };

  if (options.preserveUnknown === true) {
    for (const [key, value] of Object.entries(config)) {
      if (!Object.hasOwn(normalized, key)) {
        normalized[key] = value;
      }
    }
  }

  return normalized;
}

export function normalizePageParticles(value, options = {}) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === false) {
    return null;
  }
  if (!isPlainObject(value)) {
    return null;
  }
  return normalizeParticleConfig(value, options);
}

export function resolveEffectivePageParticles(script, sceneId, pageIndex) {
  const pages = script?.scenes?.[sceneId]?.pages;
  if (!Array.isArray(pages) || pageIndex < 0) {
    return null;
  }

  let effective = null;
  const lastIndex = Math.min(Math.floor(pageIndex), pages.length - 1);
  for (let index = 0; index <= lastIndex; index += 1) {
    const page = pages[index];
    if (!page || !Object.hasOwn(page, 'particles')) {
      continue;
    }
    const normalized = normalizePageParticles(page.particles);
    if (normalized !== undefined) {
      effective = normalized;
    }
  }
  return effective;
}

export function formatParticleLabel(preset) {
  return PARTICLE_PRESET_DEFS[preset]?.label || String(preset || '');
}
