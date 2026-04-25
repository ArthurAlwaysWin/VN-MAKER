import { isKnownCameraEffect } from '../shared/cinematicContract.js';

const EFFECT_CLASSES = ['camera-shake', 'camera-zoom', 'camera-pan'];
const INTENSITY_PRESETS = {
  low: { shake: 8, zoom: 1.03, pan: 18, flash: 0.45 },
  medium: { shake: 14, zoom: 1.06, pan: 32, flash: 0.7 },
  high: { shake: 22, zoom: 1.1, pan: 48, flash: 0.9 },
};

export class CameraController {
  constructor(stageLayer) {
    this.stageLayer = stageLayer;
    this._timer = null;
    this._flashOverlay = document.createElement('div');
    this._flashOverlay.className = 'camera-flash-overlay';
    this.stageLayer.appendChild(this._flashOverlay);
  }

  play(camera, options = {}) {
    this.clear();

    if (!camera || !isKnownCameraEffect(camera.effect)) {
      return;
    }

    const durationMs = Math.max(0, Number(camera.durationMs) || 0);
    if (options.immediate || durationMs === 0) {
      return;
    }

    const intensity = INTENSITY_PRESETS[camera.intensity] || INTENSITY_PRESETS.medium;
    this.stageLayer.style.setProperty('--camera-duration-ms', `${durationMs}ms`);

    switch (camera.effect) {
      case 'shake':
        this._applyShake(camera.direction, intensity.shake);
        this.stageLayer.classList.add('camera-shake');
        break;
      case 'zoom':
        this.stageLayer.style.setProperty('--camera-zoom-scale', String(intensity.zoom));
        this.stageLayer.classList.add('camera-zoom');
        break;
      case 'pan':
        this._applyPan(camera.direction, intensity.pan);
        this.stageLayer.classList.add('camera-pan');
        break;
      case 'flash':
        this._flashOverlay.style.setProperty('--camera-flash-opacity', String(intensity.flash));
        this._flashOverlay.classList.add('active');
        break;
      default:
        return;
    }

    this._timer = setTimeout(() => this.clear(), durationMs + 50);
  }

  clear() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    this.stageLayer.classList.remove(...EFFECT_CLASSES);
    this.stageLayer.style.transform = '';
    this.stageLayer.style.filter = '';
    this.stageLayer.style.removeProperty('--camera-duration-ms');
    this.stageLayer.style.removeProperty('--camera-shake-x');
    this.stageLayer.style.removeProperty('--camera-shake-y');
    this.stageLayer.style.removeProperty('--camera-pan-x');
    this.stageLayer.style.removeProperty('--camera-pan-y');
    this.stageLayer.style.removeProperty('--camera-zoom-scale');

    this._flashOverlay.classList.remove('active');
    this._flashOverlay.style.removeProperty('--camera-flash-opacity');
  }

  _applyShake(direction, distance) {
    let x = 0;
    let y = 0;

    if (direction === 'vertical') {
      y = distance;
    } else if (direction === 'both') {
      x = distance;
      y = distance;
    } else {
      x = distance;
    }

    this.stageLayer.style.setProperty('--camera-shake-x', `${x}px`);
    this.stageLayer.style.setProperty('--camera-shake-y', `${y}px`);
  }

  _applyPan(direction, distance) {
    let x = 0;
    let y = 0;

    switch (direction) {
      case 'right':
        x = distance;
        break;
      case 'up':
        y = -distance;
        break;
      case 'down':
        y = distance;
        break;
      case 'left':
      default:
        x = -distance;
        break;
    }

    this.stageLayer.style.setProperty('--camera-pan-x', `${x}px`);
    this.stageLayer.style.setProperty('--camera-pan-y', `${y}px`);
  }
}
