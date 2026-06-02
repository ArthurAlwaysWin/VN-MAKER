/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EffectPackLayer } from '../src/ui/EffectPackLayer.js';

function mockCanvasContext() {
  const gradient = {
    addColorStop: vi.fn(),
  };
  const context = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
  };
  return {
    context,
    spy: vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context),
  };
}

function makeEffect() {
  return {
    id: 'old-film',
    enabled: true,
    params: { intensity: 0.4, grain: 0.3, vignette: 0.2 },
    manifest: {
      id: 'old-film',
      adapter: 'canvas2d:film-flicker',
      paramsSchema: {
        intensity: { type: 'number', minimum: 0, maximum: 1, default: 0.45 },
        grain: { type: 'number', minimum: 0, maximum: 1, default: 0.35 },
        vignette: { type: 'number', minimum: 0, maximum: 1, default: 0.25 },
      },
    },
  };
}

describe('EffectPackLayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="stage-layer" style="width: 1280px; height: 720px"></div>';
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders built-in canvas2d film-flicker adapters on one app-owned canvas', () => {
    const { context } = mockCanvasContext();
    const layer = new EffectPackLayer(document.getElementById('stage-layer'));

    layer.play([makeEffect()]);
    vi.advanceTimersByTime(90);

    expect(document.querySelectorAll('.effect-pack-canvas').length).toBe(1);
    expect(context.fillRect).toHaveBeenCalled();
    expect(context.createRadialGradient).toHaveBeenCalled();

    layer.clear();
    expect(layer.canvas.style.opacity).toBe('0');
  });

  it('ignores unsupported project-local adapters instead of executing them', () => {
    const { context } = mockCanvasContext();
    const layer = new EffectPackLayer(document.getElementById('stage-layer'));

    layer.play([
      {
        id: 'future',
        params: {},
        manifest: { adapter: 'project:runtime-js' },
      },
    ]);
    vi.advanceTimersByTime(90);

    expect(layer.effects).toEqual([]);
    expect(context.fillRect).not.toHaveBeenCalled();
  });
});
