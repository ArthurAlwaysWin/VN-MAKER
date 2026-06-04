/**
 * Shared manifest-only effect-pack contract.
 *
 * Effect packs are data declarations. Project-local JavaScript is never
 * executed; runtime dispatch is limited to allowlisted built-in adapters.
 */

const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
const EFFECT_ROOT = 'effects';

export const EFFECT_PACK_KINDS = Object.freeze(['postprocess']);
export const EFFECT_PACK_PARAM_TYPES = Object.freeze(['number', 'boolean', 'enum', 'color']);
export const BUILTIN_EFFECT_PACK_ADAPTERS = Object.freeze({
  'canvas2d:film-flicker': Object.freeze({
    id: 'canvas2d:film-flicker',
    kind: 'postprocess',
    label: 'Old film flicker',
    paramsSchema: Object.freeze({
      intensity: Object.freeze({ type: 'number', minimum: 0, maximum: 1, default: 0.45 }),
      grain: Object.freeze({ type: 'number', minimum: 0, maximum: 1, default: 0.35 }),
      vignette: Object.freeze({ type: 'number', minimum: 0, maximum: 1, default: 0.25 }),
    }),
  }),
});

export const EFFECT_PACK_UNSAFE_MANIFEST_KEYS = Object.freeze([
  'entry',
  'runtime',
  'runtimeJs',
  'script',
  'code',
  'source',
  'module',
  'import',
  'url',
]);

export const EFFECT_PACK_FORBIDDEN_CAPABILITIES = Object.freeze([
  'network',
  'filesystem',
  'eval',
  'dom',
  'arbitraryDom',
  'webgl',
  'shader',
  'plugin',
  'aiChat',
  'storage',
]);

const FILE_ROLES = Object.freeze(['manifest', 'preview', 'texture']);

function cloneJsonValue(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function isValidEffectPackId(id) {
  return typeof id === 'string' && ID_PATTERN.test(id);
}

export function isKnownEffectPackAdapter(adapter) {
  return typeof adapter === 'string' && Object.hasOwn(BUILTIN_EFFECT_PACK_ADAPTERS, adapter);
}

export function normalizeEffectPackAssetPath(assetPath) {
  if (typeof assetPath !== 'string' || !assetPath.trim()) {
    return null;
  }
  const normalized = assetPath.trim().replace(/\\/g, '/').replace(/^\.?\//, '');
  if (
    !normalized
    || /^(?:https?:|data:|asset:|file:|blob:|javascript:)/i.test(normalized)
    || normalized.startsWith('/')
    || normalized.split('/').includes('..')
    || normalized.split('/')[0] !== EFFECT_ROOT
  ) {
    return null;
  }
  return normalized;
}

function validateParamSchemaEntry(key, schema, errors) {
  if (!isValidEffectPackId(key)) {
    errors.push(`paramsSchema key "${key}" must be a stable identifier`);
    return null;
  }
  if (!isPlainObject(schema) || !EFFECT_PACK_PARAM_TYPES.includes(schema.type)) {
    errors.push(`paramsSchema.${key} has an unsupported type`);
    return null;
  }

  if (schema.type === 'number') {
    const minimum = Number(schema.minimum ?? 0);
    const maximum = Number(schema.maximum ?? 1);
    const defaultValue = Number(schema.default ?? minimum);
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum > maximum) {
      errors.push(`paramsSchema.${key} has invalid numeric bounds`);
      return null;
    }
    return {
      type: 'number',
      minimum,
      maximum,
      default: Number.isFinite(defaultValue) ? Math.min(maximum, Math.max(minimum, defaultValue)) : minimum,
    };
  }

  if (schema.type === 'boolean') {
    return {
      type: 'boolean',
      default: Boolean(schema.default),
    };
  }

  if (schema.type === 'enum') {
    const values = Array.isArray(schema.values)
      ? schema.values.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim())
      : [];
    if (values.length === 0) {
      errors.push(`paramsSchema.${key} enum requires values`);
      return null;
    }
    return {
      type: 'enum',
      values: unique(values),
      default: values.includes(schema.default) ? schema.default : values[0],
    };
  }

  if (schema.type === 'color') {
    const fallback = typeof schema.default === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(schema.default)
      ? schema.default
      : '#ffffff';
    return { type: 'color', default: fallback };
  }

  return null;
}

function normalizeParamsSchema(schema, errors) {
  if (schema === undefined) return {};
  if (!isPlainObject(schema)) {
    errors.push('paramsSchema must be an object');
    return {};
  }

  const normalized = {};
  for (const [key, value] of Object.entries(schema)) {
    const entry = validateParamSchemaEntry(key, value, errors);
    if (entry) normalized[key] = entry;
  }
  return normalized;
}

function normalizeManifestFiles(manifest, errors) {
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const normalized = [];
  const expectedPrefix = `${EFFECT_ROOT}/${manifest.id}/`;

  for (const [index, file] of files.entries()) {
    if (!isPlainObject(file)) {
      errors.push(`files.${index} must be an object`);
      continue;
    }
    const path = normalizeEffectPackAssetPath(file.path);
    if (!path || !path.startsWith(expectedPrefix)) {
      errors.push(`files.${index}.path must stay inside ${expectedPrefix}`);
      continue;
    }
    normalized.push({
      path,
      role: FILE_ROLES.includes(file.role) ? file.role : 'texture',
      ...(typeof file.sha256 === 'string' && file.sha256.trim() ? { sha256: file.sha256.trim() } : {}),
      ...(Number.isFinite(file.bytes) && file.bytes >= 0 ? { bytes: file.bytes } : {}),
    });
  }

  return normalized;
}

function validateCapabilities(capabilities, errors) {
  if (capabilities === undefined) return {};
  if (!isPlainObject(capabilities)) {
    errors.push('capabilities must be an object');
    return {};
  }

  const normalized = {};
  for (const key of EFFECT_PACK_FORBIDDEN_CAPABILITIES) {
    if (capabilities[key]) {
      errors.push(`capability "${key}" is forbidden`);
    }
    if (capabilities[key] !== undefined) {
      normalized[key] = Boolean(capabilities[key]);
    }
  }
  return normalized;
}

export function validateEffectPackManifest(manifest) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(manifest)) {
    return {
      ok: false,
      manifest: null,
      errors: ['manifest must be an object'],
      warnings,
    };
  }

  for (const key of EFFECT_PACK_UNSAFE_MANIFEST_KEYS) {
    if (manifest[key] !== undefined) {
      errors.push(`manifest key "${key}" is not allowed`);
    }
  }

  const id = typeof manifest.id === 'string' ? manifest.id.trim() : '';
  if (!isValidEffectPackId(id)) {
    errors.push('id must start with a letter and contain only letters, numbers, underscores, or hyphens');
  }

  const kind = EFFECT_PACK_KINDS.includes(manifest.kind) ? manifest.kind : 'postprocess';
  if (manifest.kind !== undefined && !EFFECT_PACK_KINDS.includes(manifest.kind)) {
    warnings.push(`kind "${manifest.kind}" is unsupported and will be treated as postprocess`);
  }

  const adapter = typeof manifest.adapter === 'string' ? manifest.adapter.trim() : '';
  if (!adapter) {
    errors.push('adapter is required');
  } else if (!isKnownEffectPackAdapter(adapter)) {
    warnings.push(`adapter "${adapter}" is not built in and will not run`);
  }

  const version = Number(manifest.version ?? 1);
  if (!Number.isInteger(version) || version !== 1) {
    errors.push('version must be 1');
  }

  const normalized = {
    id,
    kind,
    label: typeof manifest.label === 'string' && manifest.label.trim() ? manifest.label.trim() : id,
    version: 1,
    adapter,
    paramsSchema: normalizeParamsSchema(manifest.paramsSchema, errors),
    defaults: isPlainObject(manifest.defaults) ? cloneJsonValue(manifest.defaults) : {},
    files: normalizeManifestFiles({ ...manifest, id }, errors),
    performance: isPlainObject(manifest.performance) ? cloneJsonValue(manifest.performance) : {},
    capabilities: validateCapabilities(manifest.capabilities, errors),
  };

  return {
    ok: errors.length === 0,
    manifest: normalized,
    errors: unique(errors),
    warnings: unique(warnings),
  };
}

export function normalizeEffectPackManifest(manifest) {
  return validateEffectPackManifest(manifest).manifest;
}

function normalizeParamValue(value, schema) {
  if (!schema) return undefined;
  if (schema.type === 'number') {
    const numeric = Number(value ?? schema.default);
    return Number.isFinite(numeric)
      ? Math.min(schema.maximum, Math.max(schema.minimum, numeric))
      : schema.default;
  }
  if (schema.type === 'boolean') {
    return typeof value === 'boolean' ? value : schema.default;
  }
  if (schema.type === 'enum') {
    return schema.values.includes(value) ? value : schema.default;
  }
  if (schema.type === 'color') {
    return typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
      ? value
      : schema.default;
  }
  return undefined;
}

export function normalizeEffectPackParams(params = {}, paramsSchema = {}) {
  const source = isPlainObject(params) ? params : {};
  const normalized = {};
  for (const [key, schema] of Object.entries(paramsSchema)) {
    normalized[key] = normalizeParamValue(source[key], schema);
  }
  return normalized;
}

export function normalizeEffectPackReference(reference, manifests = {}) {
  if (!isPlainObject(reference)) {
    return null;
  }
  const id = typeof reference.id === 'string' ? reference.id.trim() : '';
  if (!isValidEffectPackId(id)) {
    return null;
  }
  const manifest = manifests[id] ?? null;
  const paramsSchema = manifest?.paramsSchema ?? {};
  return {
    id,
    enabled: reference.enabled !== false,
    params: normalizeEffectPackParams(reference.params, paramsSchema),
  };
}

export function getEffectPackRegistry(script = {}) {
  const registry = script?.assets?.effectPacks;
  return isPlainObject(registry) ? registry : {};
}

export function normalizeEffectPackRegistry(registry = {}) {
  const normalized = {};
  if (!isPlainObject(registry)) return normalized;
  for (const [id, manifest] of Object.entries(registry)) {
    const result = validateEffectPackManifest({ ...manifest, id: manifest?.id ?? id });
    if (result.ok && result.manifest) {
      normalized[result.manifest.id] = result.manifest;
    }
  }
  return normalized;
}

export function listEffectPackManifests(script = {}) {
  return Object.values(normalizeEffectPackRegistry(getEffectPackRegistry(script)))
    .map((manifest) => cloneJsonValue(manifest))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function resolvePageEffectPacks(script = {}, page = {}) {
  if (!Array.isArray(page?.effectPacks)) {
    return [];
  }
  const manifests = normalizeEffectPackRegistry(getEffectPackRegistry(script));
  return page.effectPacks
    .map((reference) => normalizeEffectPackReference(reference, manifests))
    .filter((reference) => reference?.enabled && isKnownEffectPackAdapter(manifests[reference.id]?.adapter))
    .map((reference) => ({
      ...reference,
      manifest: cloneJsonValue(manifests[reference.id]),
    }));
}

export function collectEffectPackAssetPaths(script = {}) {
  const paths = [];
  for (const scene of Object.values(script?.scenes ?? {})) {
    for (const page of (scene?.pages ?? [])) {
      if (!['normal', 'choice', 'input'].includes(page?.type)) {
        continue;
      }
      for (const effect of resolvePageEffectPacks(script, page)) {
        for (const file of effect.manifest?.files ?? []) {
          paths.push(file.path);
        }
      }
    }
  }
  return unique(paths).sort();
}
