/**
 * @vitest-environment jsdom
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundLayer } from '../src/ui/BackgroundLayer.js';

function mockCanvasContext() {
  const context = {
    scale: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
  };
  return vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
}

function makeLayer() {
  document.body.innerHTML = '<div id="background-layer"></div>';
  const container = document.getElementById('background-layer');
  return new BackgroundLayer(container, '/game/');
}

describe('background layer transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('plays the locked transition set on the existing dual-layer owner and returns a completion promise', async () => {
    const background = makeLayer();

    const completion = background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'scale',
      duration: 420,
    });

    expect(typeof completion?.then).toBe('function');
    expect(background.layerB.classList.contains('active')).toBe(true);
    expect(background.layerB.classList.contains('bg-transition-scale')).toBe(true);

    vi.advanceTimersByTime(421);
    await completion;

    expect(background.layerA.classList.contains('active')).toBe(false);
  });

  it('supports all cataloged CSS background transitions without a second controller', async () => {
    const background = makeLayer();
    const transitions = [
      'fade',
      'dissolve',
      'wipe',
      'wipe-left',
      'wipe-right',
      'wipe-up',
      'wipe-down',
      'blur',
      'slide-left',
      'slide-right',
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
      'none',
      'cut',
    ];

    for (const transition of transitions) {
      const completion = background.setBackground({
        image: `backgrounds/${transition}.png`,
        transition,
        duration: 300,
      });

      if (transition !== 'none' && transition !== 'cut' && transition !== 'fade') {
        expect(background.container.querySelector(`.bg-transition-${transition}`)).not.toBeNull();
      }

      vi.advanceTimersByTime(301);
      await completion;
    }

    expect(background.container.querySelectorAll('.bg-image-layer').length).toBe(2);
    expect(background.container.querySelector('.bg-transition-wipe')).toBeNull();
    expect(background.container.querySelector('.bg-transition-wipe-down')).toBeNull();
  });

  it('defines concrete M5 transition keyframes for runtime rendering', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8');

    for (const direction of ['left', 'right', 'up', 'down']) {
      expect(css).toContain(`.bg-image-layer.bg-transition-wipe-${direction}`);
      expect(css).toContain(`@keyframes bg-transition-wipe-${direction}-in`);
      expect(css).toContain(`@keyframes bg-transition-wipe-${direction}-out`);
    }

    for (const type of ['zoom-in', 'zoom-out', 'flash', 'iris-in', 'iris-out', 'crossfade-pan']) {
      expect(css).toContain(`.bg-image-layer.bg-transition-${type}`);
      expect(css).toContain(`@keyframes bg-transition-${type}-in`);
      expect(css).toContain(`@keyframes bg-transition-${type}-out`);
    }

    for (const type of ['fade-white', 'fade-black', 'glitch-lite', 'pixelate-lite', 'diamond', 'circle-open']) {
      expect(css).toContain(`.bg-image-layer.bg-transition-${type}`);
      expect(css).toContain(`@keyframes bg-transition-${type}-in`);
      expect(css).toContain(`@keyframes bg-transition-${type}-out`);
    }
  });

  it('cleans temporary classes, styles, and stale outgoing imagery on replacement and clear', async () => {
    const background = makeLayer();

    const first = background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'blur',
      duration: 500,
    });
    const second = background.setBackground({
      image: 'backgrounds/scene-b.png',
      transition: 'dissolve',
      duration: 250,
    });

    vi.advanceTimersByTime(251);
    await Promise.all([first, second]);
    background.clear();

    expect(background.layerA.className).toBe('bg-image-layer active');
    expect(background.layerB.className).toBe('bg-image-layer');
    expect(background.layerA.style.filter).toBe('');
    expect(background.layerB.style.transform).toBe('');
    expect(background.layerB.style.backgroundImage).toBe('');
  });

  it('falls back unknown ids and caps transition waits at the shared safety limit', async () => {
    const background = makeLayer();

    const completion = background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'legacy-portal',
      duration: 50000,
    });

    expect(background.layerB.classList.contains('bg-transition-legacy-portal')).toBe(false);
    expect(background.layerB.style.transitionDuration).toBe('5000ms');

    vi.advanceTimersByTime(5001);
    await completion;
  });

  it('plays completed catalog entries directly instead of their compatibility fallback', async () => {
    const background = makeLayer();

    const completion = background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'zoom-in',
      duration: 400,
    });

    expect(background.layerB.classList.contains('bg-transition-zoom-in')).toBe(true);
    expect(background.layerB.classList.contains('bg-transition-scale')).toBe(false);

    vi.advanceTimersByTime(401);
    await completion;
  });

  it('routes all canvas-mask transitions through a procedural canvas helper and cleans resources', async () => {
    mockCanvasContext();
    for (const transition of ['noise-dissolve', 'ripple', 'burn']) {
      const background = makeLayer();

      await background.setBackground({
        image: 'backgrounds/scene-a.png',
        transition: 'fade',
        duration: 0,
      });

      const completion = background.setBackground({
        image: 'backgrounds/scene-b.png',
        transition,
        duration: 120,
      });

      expect(background.container.querySelector('.transition-mask-canvas')).not.toBeNull();
      expect(background.container.querySelector(`.bg-transition-${transition}`)).toBeNull();

      vi.advanceTimersByTime(180);
      await completion;

      expect(background.container.querySelector('.transition-mask-canvas')).toBeNull();
      expect(background.layerA.classList.contains('active') || background.layerB.classList.contains('active')).toBe(true);
    }
  });

  it('resolves canvas-mask transitions immediately under reduced motion without creating a canvas', async () => {
    const getContextSpy = mockCanvasContext();
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    const background = makeLayer();

    const completion = background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'noise-dissolve',
      duration: 500,
    });

    await completion;

    expect(getContextSpy).not.toHaveBeenCalled();
    expect(background.container.querySelector('.transition-mask-canvas')).toBeNull();
    expect(background.layerB.classList.contains('active')).toBe(true);
  });

  it('falls back canvas-mask transitions to their catalog fallback when canvas is unavailable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const background = makeLayer();

    await background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'fade',
      duration: 0,
    });

    const completion = background.setBackground({
      image: 'backgrounds/scene-b.png',
      transition: 'burn',
      duration: 120,
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(background.container.querySelector('.bg-transition-fade-white')).not.toBeNull();

    vi.advanceTimersByTime(121);
    await completion;
  });

  it('cancels an active canvas-mask transition before starting the next transition', async () => {
    mockCanvasContext();
    const background = makeLayer();

    const first = background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'ripple',
      duration: 500,
    });
    expect(background.container.querySelectorAll('.transition-mask-canvas').length).toBe(1);

    const second = background.setBackground({
      image: 'backgrounds/scene-b.png',
      transition: 'dissolve',
      duration: 120,
    });

    expect(background.container.querySelectorAll('.transition-mask-canvas').length).toBe(0);
    expect(background.container.querySelector('.bg-transition-dissolve')).not.toBeNull();

    vi.advanceTimersByTime(121);
    await Promise.all([first, second]);
  });
});
