import { describe, expect, it } from 'vitest';

import {
  getPageCameraContract,
  getPageTransitionContract,
  getRuntimeTransitionType,
  getTransitionUiOptions,
} from '../src/shared/cinematicContract.js';
import {
  getTransitionCatalogEntry,
  listTransitionCatalog,
} from '../src/shared/transitionCatalog.js';

describe('transition catalog', () => {
  it('exposes supported cinematic surfaces and planned fallbacks to agents', () => {
    const supportedBackground = listTransitionCatalog({ target: 'background', supportedOnly: true });
    expect(supportedBackground.map((entry) => entry.id)).toEqual([
      'fade',
      'slide-left',
      'slide-right',
      'none',
      'dissolve',
      'wipe',
      'scale',
      'blur',
      'wipe-left',
      'wipe-right',
      'wipe-up',
      'wipe-down',
    ]);
    expect(getTransitionUiOptions().map((entry) => entry.value)).toEqual(
      supportedBackground.map((entry) => entry.id),
    );

    expect(getTransitionCatalogEntry('background', 'wipe-up')).toMatchObject({
      target: 'background',
      runtimeSupported: true,
      editorSupported: true,
    });
    expect(getTransitionCatalogEntry('background', 'iris-in')).toMatchObject({
      target: 'background',
      runtimeSupported: false,
      editorSupported: false,
      fallbackId: 'fade',
    });
    expect(getRuntimeTransitionType('zoom-in')).toBe('scale');
    expect(getRuntimeTransitionType('crossfade-pan')).toBe('dissolve');
    expect(getTransitionCatalogEntry('camera', 'shake')).toMatchObject({
      storageField: 'camera.effect',
      runtimeSupported: true,
      paramsSchema: {
        durationMs: { minimum: 0, maximum: 2000 },
      },
    });
  });

  it('normalizes bounded transition durations without rewriting unknown ids', () => {
    expect(getPageTransitionContract({ type: 'iris-in', duration: 9000 })).toEqual({
      type: 'iris-in',
      duration: 5000,
    });
    expect(getPageTransitionContract({ type: 'fade', duration: -1 })).toEqual({
      type: 'fade',
      duration: 0,
    });
    expect(getPageCameraContract({
      effect: 'shake',
      durationMs: 99999,
      intensity: 'high',
      direction: 'both',
    })).toEqual({
      effect: 'shake',
      durationMs: 2000,
      intensity: 'high',
      direction: 'both',
      trigger: 'onEnter',
    });
  });
});
