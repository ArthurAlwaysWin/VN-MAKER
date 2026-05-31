/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ParticleLayer } from '../src/ui/ParticleLayer.js';

function mockCanvasContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    set fillStyle(value) {},
    set globalAlpha(value) {},
    set lineWidth(value) {},
    set strokeStyle(value) {},
  };
}

describe('ParticleLayer', () => {
  let container;
  let originalGetContext;
  let originalRaf;
  let originalCancel;
  let rafQueue;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 640, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 360, configurable: true });
    container.getBoundingClientRect = () => ({ width: 640, height: 360 });
    document.body.appendChild(container);

    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext());

    originalRaf = globalThis.requestAnimationFrame;
    originalCancel = globalThis.cancelAnimationFrame;
    rafQueue = [];
    globalThis.requestAnimationFrame = vi.fn((cb) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    globalThis.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancel;
    document.body.innerHTML = '';
  });

  it('creates one canvas and starts particle state on play', () => {
    const layer = new ParticleLayer(container);

    layer.play({ preset: 'sakura', density: 0.5 });

    expect(container.querySelectorAll('#particle-canvas')).toHaveLength(1);
    expect(layer.canvas.width).toBe(640);
    expect(layer.canvas.height).toBe(360);
    expect(layer.config.preset).toBe('sakura');
    expect(layer.particles.length).toBeGreaterThan(0);
    expect(layer.particles.length).toBeLessThanOrEqual(35);
    expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
  });

  it('clear removes particles and stops animation safely', () => {
    const layer = new ParticleLayer(container);
    layer.play({ preset: 'snow', density: 1 });

    layer.clear();

    expect(layer.particles).toHaveLength(0);
    expect(layer.config).toBeNull();
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('unknown or invalid configs do not throw', () => {
    const layer = new ParticleLayer(container);

    expect(() => layer.play({ preset: 'future-weather', density: 0.25 })).not.toThrow();
    expect(layer.config.preset).toBe('dust');
    expect(() => layer.play('broken')).not.toThrow();
    expect(layer.config).toBeNull();
  });

  it('applies authored direction to particle velocity', () => {
    const layer = new ParticleLayer(container);

    layer.play({ preset: 'dust', density: 0.2, direction: 'right', wind: 0 });
    expect(layer.particles.length).toBeGreaterThan(0);
    expect(layer.particles.every((particle) => particle.vx > 0)).toBe(true);

    layer.play({ preset: 'dust', density: 0.2, direction: 'left', wind: 0 });
    expect(layer.particles.length).toBeGreaterThan(0);
    expect(layer.particles.every((particle) => particle.vx < 0)).toBe(true);
  });

  it('destroy removes the canvas', () => {
    const layer = new ParticleLayer(container);
    layer.play({ preset: 'dust' });

    layer.destroy();

    expect(container.querySelector('#particle-canvas')).toBeNull();
  });
});
