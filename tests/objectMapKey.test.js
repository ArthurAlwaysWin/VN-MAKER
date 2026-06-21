import { describe, expect, it } from 'vitest';
import { isSafeObjectMapKey } from '../src/shared/objectMapKey.js';
import { assertStableId, isStableId } from '../src/shared/stableId.js';
import { isValidVideoId, normalizeVideoRegistry } from '../src/shared/videoContract.js';
import { collectTextTemplateVariableIds, interpolateTextTemplate } from '../src/shared/textTemplate.js';

describe('safe plain-object map keys', () => {
  it('rejects every Object.prototype property while allowing ordinary IDs', () => {
    for (const key of Object.getOwnPropertyNames(Object.prototype)) {
      expect(isSafeObjectMapKey(key), key).toBe(false);
    }
    expect(isSafeObjectMapKey('safe_id')).toBe(true);
  });

  it('preserves stable-ID rejection and error behavior', () => {
    expect(isStableId('__proto__')).toBe(false);
    expect(isStableId('constructor')).toBe(false);
    expect(isStableId('safe-id')).toBe(true);
    expect(() => assertStableId('constructor', 'scene.id')).toThrow(
      'scene.id must start with a letter or underscore and contain only letters, numbers, underscores, or hyphens',
    );
  });

  it('keeps unsafe video IDs out of normalized registries', () => {
    const registry = normalizeVideoRegistry(JSON.parse(
      '{"__proto__":{"file":"videos/bad.mp4"},"constructor":{"file":"videos/bad2.mp4"},"safe":{"file":"videos/safe.mp4"}}',
    ));

    expect(isValidVideoId('__proto__')).toBe(false);
    expect(isValidVideoId('constructor')).toBe(false);
    expect(Object.hasOwn(registry, '__proto__')).toBe(false);
    expect(Object.hasOwn(registry, 'constructor')).toBe(false);
    expect(registry.safe.file).toBe('videos/safe.mp4');
  });

  it('does not resolve Object.prototype names in text templates', () => {
    const variables = { constructor: 'polluted', safe: 'value' };
    expect(collectTextTemplateVariableIds('${constructor} ${safe}')).toEqual(['safe']);
    expect(interpolateTextTemplate('${constructor} ${safe}', variables)).toBe('${constructor} value');
  });
});
