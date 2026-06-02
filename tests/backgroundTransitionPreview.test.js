/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundLayer } from '../src/ui/BackgroundLayer.js';

function makeLayer() {
  document.body.innerHTML = '<div id="background-layer"></div>';
  const container = document.getElementById('background-layer');
  return new BackgroundLayer(container, '/game/');
}

describe('background transition preview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps same-page transition preview visible with preview-only classes even when the background image does not change', async () => {
    const background = makeLayer();

    await background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'fade',
      duration: 0,
    });

    const completion = background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'scale',
      duration: 420,
      previewVariant: 'same-page',
    });

    const previewIn = [background.layerA, background.layerB]
      .find(layer => layer.classList.contains('bg-preview-same-page'));
    const previewOut = [background.layerA, background.layerB]
      .find(layer => layer.classList.contains('bg-preview-same-page-out'));

    expect(previewIn?.classList.contains('bg-transition-scale')).toBe(true);
    expect(previewIn?.classList.contains('bg-preview-same-page')).toBe(true);
    expect(previewOut?.classList.contains('bg-preview-same-page-out')).toBe(true);

    vi.advanceTimersByTime(421);
    await completion;

    expect(background.layerA.classList.contains('bg-preview-same-page')).toBe(false);
    expect(background.layerB.classList.contains('bg-preview-same-page')).toBe(false);
    expect(background.layerA.classList.contains('bg-preview-same-page-out')).toBe(false);
    expect(background.layerB.classList.contains('bg-preview-same-page-out')).toBe(false);
  });

  it('previews Milestone 7 CSS-only transition ids without fallback rejection', async () => {
    const background = makeLayer();

    await background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'fade',
      duration: 0,
    });

    const completion = background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'glitch-lite',
      duration: 360,
      previewVariant: 'same-page',
    });

    const previewIn = [background.layerA, background.layerB]
      .find(layer => layer.classList.contains('bg-preview-same-page'));

    expect(previewIn?.classList.contains('bg-transition-glitch-lite')).toBe(true);

    vi.advanceTimersByTime(361);
    await completion;
  });

  it('previews canvas-mask transition ids on the same page without CSS fallback classes', async () => {
    const context = {
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    for (const [transition, fallbackClass] of [
      ['noise-dissolve', '.bg-transition-dissolve'],
      ['ripple', '.bg-transition-crossfade-pan'],
      ['burn', '.bg-transition-fade-white'],
    ]) {
      const background = makeLayer();

      await background.setBackground({
        image: 'backgrounds/scene-a.png',
        transition: 'fade',
        duration: 0,
      });

      const completion = background.setBackground({
        image: 'backgrounds/scene-a.png',
        transition,
        duration: 160,
        previewVariant: 'same-page',
      });

      expect(background.container.querySelector('.transition-mask-canvas')).not.toBeNull();
      expect(background.container.querySelector(fallbackClass)).toBeNull();

      vi.advanceTimersByTime(220);
      await completion;
    }
  });

  it('cleans preview-only classes, css vars, and stale outgoing imagery on interruption and clear', async () => {
    const background = makeLayer();

    await background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'fade',
      duration: 0,
    });

    const first = background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'blur',
      duration: 500,
      previewVariant: 'same-page',
    });
    const second = background.setBackground({
      image: 'backgrounds/scene-a.png',
      transition: 'wipe-up',
      duration: 250,
      previewVariant: 'same-page',
    });

    vi.advanceTimersByTime(251);
    await Promise.all([first, second]);
    background.clear();

    expect(background.layerA.className).toBe('bg-image-layer active');
    expect(background.layerB.className).toBe('bg-image-layer');
    expect(background.layerA.style.getPropertyValue('--bg-preview-opacity')).toBe('');
    expect(background.layerB.style.getPropertyValue('--bg-preview-opacity')).toBe('');
    expect(background.layerA.style.backgroundImage).toBe('');
    expect(background.layerB.style.backgroundImage).toBe('');
  });
});
