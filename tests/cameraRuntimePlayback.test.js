/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeDom() {
  document.body.innerHTML = `
    <div id="game-container">
      <div id="stage-layer"></div>
      <div id="ui-overlay"></div>
    </div>
  `;
  return {
    stageLayer: document.getElementById('stage-layer'),
    uiOverlay: document.getElementById('ui-overlay'),
  };
}

describe('camera runtime playback', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('binds only to #stage-layer and keeps flash overlay inside the stage', async () => {
    const { CameraController } = await import('../src/ui/CameraController.js');
    const { stageLayer, uiOverlay } = makeDom();
    const camera = new CameraController(stageLayer);

    camera.play({ effect: 'shake', durationMs: 300, intensity: 'medium', direction: 'horizontal', trigger: 'onEnter' });
    expect(stageLayer.classList.contains('camera-shake')).toBe(true);

    camera.play({ effect: 'flash', durationMs: 200, intensity: 'high', trigger: 'onEnter' });
    const flashOverlay = stageLayer.querySelector('.camera-flash-overlay');

    expect(flashOverlay).not.toBeNull();
    expect(flashOverlay?.parentElement).toBe(stageLayer);
    expect(uiOverlay.querySelector('.camera-flash-overlay')).toBeNull();
  });

  it('supports the locked page camera effect set on the reserved stage scope', async () => {
    const { CameraController } = await import('../src/ui/CameraController.js');
    const { stageLayer } = makeDom();
    const camera = new CameraController(stageLayer);

    camera.play({ effect: 'shake', durationMs: 300, intensity: 'medium', direction: 'both', trigger: 'onEnter' });
    expect(stageLayer.classList.contains('camera-shake')).toBe(true);
    expect(stageLayer.style.getPropertyValue('--camera-shake-x')).not.toBe('');
    expect(stageLayer.style.getPropertyValue('--camera-shake-y')).not.toBe('');

    camera.play({ effect: 'zoom', durationMs: 180, intensity: 'low', trigger: 'onEnter' });
    expect(stageLayer.classList.contains('camera-zoom')).toBe(true);
    expect(stageLayer.style.getPropertyValue('--camera-zoom-scale')).not.toBe('');

    camera.play({ effect: 'pan', durationMs: 220, intensity: 'high', direction: 'up', trigger: 'onEnter' });
    expect(stageLayer.classList.contains('camera-pan')).toBe(true);
    expect(stageLayer.style.getPropertyValue('--camera-pan-x')).toBe('0px');
    expect(stageLayer.style.getPropertyValue('--camera-pan-y')).toContain('-');

    camera.play({ effect: 'flash', durationMs: 150, intensity: 'medium', trigger: 'onEnter' });
    expect(stageLayer.querySelector('.camera-flash-overlay')?.classList.contains('active')).toBe(true);
  });

  it('clears the previous effect before starting a new one and safe-noops unknown effects without mutating input', async () => {
    const { CameraController } = await import('../src/ui/CameraController.js');
    const { stageLayer } = makeDom();
    const camera = new CameraController(stageLayer);

    camera.play({ effect: 'shake', durationMs: 300, intensity: 'medium', direction: 'horizontal', trigger: 'onEnter' });
    expect(stageLayer.classList.contains('camera-shake')).toBe(true);

    camera.play({ effect: 'zoom', durationMs: 500, intensity: 'low', trigger: 'onEnter' });
    expect(stageLayer.classList.contains('camera-shake')).toBe(false);
    expect(stageLayer.classList.contains('camera-zoom')).toBe(true);

    camera.clear();
    const unknown = {
      effect: 'legacy-rumble',
      durationMs: 250,
      intensity: 'medium',
      direction: 'diagonal',
      trigger: 'onEnter',
    };
    camera.play(unknown);

    expect(unknown).toEqual({
      effect: 'legacy-rumble',
      durationMs: 250,
      intensity: 'medium',
      direction: 'diagonal',
      trigger: 'onEnter',
    });
    expect(stageLayer.className).toBe('');
    expect(stageLayer.style.transform).toBe('');
    expect(stageLayer.style.filter).toBe('');
  });

  it('treats immediate and zero-duration playback as cleanup-first no-op paths', async () => {
    const { CameraController } = await import('../src/ui/CameraController.js');
    const { stageLayer } = makeDom();
    const camera = new CameraController(stageLayer);

    camera.play({ effect: 'shake', durationMs: 300, intensity: 'medium', direction: 'horizontal', trigger: 'onEnter' });
    expect(stageLayer.classList.contains('camera-shake')).toBe(true);

    camera.play({ effect: 'zoom', durationMs: 0, intensity: 'low', trigger: 'onEnter' });
    expect(stageLayer.className).toBe('');

    camera.play({ effect: 'pan', durationMs: 400, intensity: 'medium', direction: 'right', trigger: 'onEnter' });
    expect(stageLayer.classList.contains('camera-pan')).toBe(true);

    camera.play({ effect: 'flash', durationMs: 200, intensity: 'medium', trigger: 'onEnter' }, { immediate: true });
    expect(stageLayer.className).toBe('');
    expect(stageLayer.querySelector('.camera-flash-overlay')?.classList.contains('active')).toBe(false);
  });

  it('removes all stage camera state on clear after rapid re-entry', async () => {
    const { CameraController } = await import('../src/ui/CameraController.js');
    const { stageLayer } = makeDom();
    const camera = new CameraController(stageLayer);

    camera.play({ effect: 'pan', durationMs: 400, intensity: 'high', direction: 'left', trigger: 'onEnter' });
    camera.play({ effect: 'flash', durationMs: 120, intensity: 'medium', trigger: 'onEnter' });
    camera.clear();

    expect(stageLayer.className).toBe('');
    expect(stageLayer.style.transform).toBe('');
    expect(stageLayer.style.filter).toBe('');
    expect(stageLayer.querySelector('.camera-flash-overlay')?.classList.contains('active')).toBe(false);
  });

  it('self-cleans effect state after the configured timer elapses', async () => {
    const { CameraController } = await import('../src/ui/CameraController.js');
    const { stageLayer } = makeDom();
    const camera = new CameraController(stageLayer);

    camera.play({ effect: 'zoom', durationMs: 120, intensity: 'medium', trigger: 'onEnter' });
    expect(stageLayer.classList.contains('camera-zoom')).toBe(true);

    vi.advanceTimersByTime(171);

    expect(stageLayer.className).toBe('');
    expect(stageLayer.style.getPropertyValue('--camera-duration-ms')).toBe('');
    expect(stageLayer.style.getPropertyValue('--camera-zoom-scale')).toBe('');
  });

  it('caps long authored camera effects at the catalog safety limit', async () => {
    const { CameraController } = await import('../src/ui/CameraController.js');
    const { stageLayer } = makeDom();
    const camera = new CameraController(stageLayer);

    camera.play({ effect: 'zoom', durationMs: 50000, intensity: 'medium' });
    expect(stageLayer.style.getPropertyValue('--camera-duration-ms')).toBe('2000ms');

    vi.advanceTimersByTime(2051);
    expect(stageLayer.className).toBe('');
  });
});
