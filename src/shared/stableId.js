const STABLE_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const UNSAFE_OBJECT_MAP_KEYS = new Set(Object.getOwnPropertyNames(Object.prototype));

export function isStableId(value) {
  return typeof value === 'string'
    && STABLE_ID_PATTERN.test(value)
    && !UNSAFE_OBJECT_MAP_KEYS.has(value);
}

export function assertStableId(value, label = 'id') {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }

  const id = value.trim();
  if (!isStableId(id)) {
    throw new Error(`${label} must start with a letter or underscore and contain only letters, numbers, underscores, or hyphens`);
  }

  return id;
}
