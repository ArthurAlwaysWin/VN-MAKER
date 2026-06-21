const UNSAFE_OBJECT_MAP_KEYS = new Set(Object.getOwnPropertyNames(Object.prototype));

/**
 * Returns whether a key can be assigned to a plain object map without
 * colliding with an Object.prototype property.
 */
export function isSafeObjectMapKey(key) {
  return !UNSAFE_OBJECT_MAP_KEYS.has(key);
}
