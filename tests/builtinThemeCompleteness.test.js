import { describe, expect, it } from 'vitest';

import { BUILTIN_THEMES } from '../src/editor/builtinThemes.js';
import { FULL_THEME_COVERAGE_KEYS } from '../src/shared/themePackageContract.js';

const SHIPPED_BUILTIN_IDS = Object.freeze([
  'default',
  'wafuu',
  'modern-sky',
  'fantasy-dark',
  'minimal-white',
]);

function hasMeaningfulValue(value) {
  if (value == null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some(hasMeaningfulValue);
  }

  if (typeof value === 'object') {
    return Object.values(value).some(hasMeaningfulValue);
  }

  return false;
}

describe('built-in theme completeness', () => {
  it('enforces the 8-surface contract for the 5 shipped built-in themes', () => {
    const shippedThemes = SHIPPED_BUILTIN_IDS.map(id => BUILTIN_THEMES.find(theme => theme.id === id));

    expect(shippedThemes).toHaveLength(SHIPPED_BUILTIN_IDS.length);

    for (const theme of shippedThemes) {
      expect(theme).toBeTruthy();
      expect(theme.coverage).toEqual(FULL_THEME_COVERAGE_KEYS);

      for (const coverageKey of FULL_THEME_COVERAGE_KEYS) {
        expect(hasMeaningfulValue(theme.ui?.[coverageKey])).toBe(true);
      }
    }
  });
});
