import { describe, expect, it } from 'vitest';

import {
  DEFAULT_UI_MOTION,
  UI_MOTION_FIELD_SCHEMA,
  getUiMotionClassNames,
  normalizeUiMotion,
} from '../src/shared/uiMotionContract.js';

describe('UI motion contract', () => {
  it('normalizes missing config to stable defaults', () => {
    expect(normalizeUiMotion()).toEqual(DEFAULT_UI_MOTION);
    expect(normalizeUiMotion(null)).toEqual(DEFAULT_UI_MOTION);
  });

  it('preserves known presets and falls back unknown values', () => {
    expect(normalizeUiMotion({
      intensity: 'dramatic',
      title: 'cinematic-slow',
      dialogue: 'glass-fade',
      choices: 'suspense-delay',
      menus: 'sidebar-sweep',
    })).toEqual({
      intensity: 'dramatic',
      title: 'cinematic-slow',
      dialogue: 'glass-fade',
      choices: 'suspense-delay',
      menus: 'sidebar-sweep',
    });

    expect(normalizeUiMotion({
      intensity: 'extreme',
      title: 'spin',
      dialogue: 'jump',
      choices: 'explode',
      menus: 'warp',
    })).toEqual(DEFAULT_UI_MOTION);
  });

  it('returns root class names used by runtime CSS', () => {
    expect(getUiMotionClassNames({
      intensity: 'subtle',
      title: 'glow-pulse',
      dialogue: 'slide-up',
      choices: 'card-pop',
      menus: 'panel-slide',
    })).toEqual([
      'gm-motion-intensity-subtle',
      'gm-motion-title-glow-pulse',
      'gm-motion-dialogue-slide-up',
      'gm-motion-choices-card-pop',
      'gm-motion-menus-panel-slide',
    ]);
  });

  it('exposes no-code editor field options', () => {
    expect(UI_MOTION_FIELD_SCHEMA.intensity.options).toContain('off');
    expect(UI_MOTION_FIELD_SCHEMA.title.options).toContain('soft-rise');
    expect(UI_MOTION_FIELD_SCHEMA.dialogue.options).toContain('soft-pop');
    expect(UI_MOTION_FIELD_SCHEMA.choices.options).toContain('stagger-rise');
    expect(UI_MOTION_FIELD_SCHEMA.menus.options).toContain('panel-fade');
  });
});
