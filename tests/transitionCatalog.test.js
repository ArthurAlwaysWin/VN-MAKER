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
  it('exposes the shared cinematic surfaces to agents', () => {
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
      'zoom-in',
      'zoom-out',
      'flash',
      'iris-in',
      'iris-out',
      'crossfade-pan',
      'diagonal-wipe',
      'cross-wipe',
      'diamond',
      'circle-open',
      'circle-close',
      'curtain-open',
      'curtain-close',
      'blinds-h',
      'blinds-v',
      'clock-wipe',
      'radial-wipe',
      'fade-white',
      'fade-black',
      'glitch-lite',
      'pixelate-lite',
      'noise-dissolve',
      'ripple',
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
      runtimeSupported: true,
      editorSupported: true,
      fallbackId: 'fade',
    });
    expect(getRuntimeTransitionType('zoom-in')).toBe('zoom-in');
    expect(getRuntimeTransitionType('crossfade-pan')).toBe('crossfade-pan');
    expect(getRuntimeTransitionType('fade-black')).toBe('fade-black');
    expect(getRuntimeTransitionType('noise-dissolve')).toBe('noise-dissolve');
    expect(getTransitionCatalogEntry('character', 'pop')).toMatchObject({
      runtimeSupported: true,
      editorSupported: true,
    });
    expect(getTransitionCatalogEntry('camera', 'vignette')).toMatchObject({
      runtimeSupported: true,
      editorSupported: true,
    });
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
