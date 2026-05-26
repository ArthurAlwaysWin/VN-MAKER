/**
 * @vitest-environment jsdom
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundLayer } from '../src/ui/BackgroundLayer.js';

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

  it('supports directional wipes and existing background transitions without a second controller', async () => {
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

  it('defines concrete directional wipe keyframes for runtime rendering', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8');

    for (const direction of ['left', 'right', 'up', 'down']) {
      expect(css).toContain(`.bg-image-layer.bg-transition-wipe-${direction}`);
      expect(css).toContain(`@keyframes bg-transition-wipe-${direction}-in`);
      expect(css).toContain(`@keyframes bg-transition-wipe-${direction}-out`);
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

  it('falls back unknown catalog ids and caps transition waits at the shared safety limit', async () => {
    const background = makeLayer();

    const completion = background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'iris-in',
      duration: 50000,
    });

    expect(background.layerB.classList.contains('bg-transition-iris-in')).toBe(false);
    expect(background.layerB.style.transitionDuration).toBe('5000ms');

    vi.advanceTimersByTime(5001);
    await completion;
  });

  it('plays declared catalog fallbacks for discoverable future transitions', async () => {
    const background = makeLayer();

    const completion = background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'zoom-in',
      duration: 400,
    });

    expect(background.layerB.classList.contains('bg-transition-scale')).toBe(true);
    expect(background.layerB.classList.contains('bg-transition-zoom-in')).toBe(false);

    vi.advanceTimersByTime(401);
    await completion;
  });
});
