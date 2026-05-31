import { describe, expect, it } from 'vitest';

import {
  PARTICLE_FIELD_SCHEMA,
  PARTICLE_PRESET_DEFS,
  PARTICLE_PRESETS,
  formatParticleLabel,
  isKnownParticlePreset,
  normalizePageParticles,
  normalizeParticleConfig,
  resolveEffectivePageParticles,
} from '../src/shared/particleContract.js';

function makeScript() {
  return {
    scenes: {
      start: {
        pages: [
          { type: 'normal' },
          { type: 'normal', particles: { preset: 'sakura', density: 0.4, wind: 0.2 } },
          { type: 'normal' },
          { type: 'normal', particles: null },
          { type: 'normal' },
          { type: 'normal', particles: { preset: 'snow', speed: 0.8 } },
        ],
      },
      other: {
        pages: [
          { type: 'normal' },
        ],
      },
    },
  };
}

describe('particle contract', () => {
  it('normalizes every built-in preset with canonical fields', () => {
    expect(PARTICLE_PRESETS).toEqual([
      'sakura',
      'snow',
      'rain',
      'firefly',
      'dust',
      'sparkle',
      'leaves',
      'bubbles',
    ]);

    for (const preset of PARTICLE_PRESETS) {
      const normalized = normalizeParticleConfig({ preset });
      expect(normalized).toEqual({
        preset,
        density: PARTICLE_PRESET_DEFS[preset].defaultDensity,
        speed: PARTICLE_FIELD_SCHEMA.speed.default,
        wind: PARTICLE_FIELD_SCHEMA.wind.default,
        opacity: PARTICLE_FIELD_SCHEMA.opacity.default,
        color: PARTICLE_PRESET_DEFS[preset].color,
        direction: PARTICLE_PRESET_DEFS[preset].direction,
      });
      expect(isKnownParticlePreset(preset)).toBe(true);
      expect(formatParticleLabel(preset)).toBe(PARTICLE_PRESET_DEFS[preset].label);
    }
  });

  it('falls unknown presets back to dust for runtime safety', () => {
    expect(isKnownParticlePreset('old-film')).toBe(false);
    expect(normalizeParticleConfig({ preset: 'old-film', density: 0.5 })).toMatchObject({
      preset: 'dust',
      density: 0.5,
      color: PARTICLE_PRESET_DEFS.dust.color,
    });
  });

  it('clamps numeric fields and falls invalid values back to defaults', () => {
    expect(normalizeParticleConfig({
      preset: 'rain',
      density: 2,
      speed: -2,
      wind: 5,
      opacity: Number.NaN,
    })).toMatchObject({
      density: 1,
      speed: 0,
      wind: 1,
      opacity: 1,
    });
  });

  it('normalizes color and direction while stripping unknown fields by default', () => {
    expect(normalizeParticleConfig({
      preset: 'bubbles',
      color: '#abc',
      direction: 'left',
      future: true,
    })).toEqual({
      preset: 'bubbles',
      density: PARTICLE_PRESET_DEFS.bubbles.defaultDensity,
      speed: 1,
      wind: 0,
      opacity: 1,
      color: '#abc',
      direction: 'left',
    });

    expect(normalizeParticleConfig({
      preset: 'bubbles',
      color: 'rgb(1,2,3)',
      direction: 'sideways',
      future: true,
    }, { preserveUnknown: true })).toMatchObject({
      color: PARTICLE_PRESET_DEFS.bubbles.color,
      direction: PARTICLE_PRESET_DEFS.bubbles.direction,
      future: true,
    });
  });

  it('keeps page particle omission, stop values, and object values distinct', () => {
    expect(normalizePageParticles(undefined)).toBeUndefined();
    expect(normalizePageParticles(null)).toBeNull();
    expect(normalizePageParticles(false)).toBeNull();
    expect(normalizePageParticles({ preset: 'sparkle' })).toMatchObject({ preset: 'sparkle' });
  });

  it('resolves effective particles by scanning previous pages in the same scene only', () => {
    const script = makeScript();

    expect(resolveEffectivePageParticles(script, 'start', 0)).toBeNull();
    expect(resolveEffectivePageParticles(script, 'start', 1)).toMatchObject({
      preset: 'sakura',
      density: 0.4,
      wind: 0.2,
    });
    expect(resolveEffectivePageParticles(script, 'start', 2)).toMatchObject({
      preset: 'sakura',
    });
    expect(resolveEffectivePageParticles(script, 'other', 0)).toBeNull();
  });

  it('keeps an explicit stop effective until another object appears', () => {
    const script = makeScript();

    expect(resolveEffectivePageParticles(script, 'start', 3)).toBeNull();
    expect(resolveEffectivePageParticles(script, 'start', 4)).toBeNull();
    expect(resolveEffectivePageParticles(script, 'start', 5)).toMatchObject({
      preset: 'snow',
      speed: 0.8,
    });
  });
});
