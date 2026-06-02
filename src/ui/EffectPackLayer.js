import {
  BUILTIN_EFFECT_PACK_ADAPTERS,
  normalizeEffectPackParams,
} from '../shared/effectPackContract.js';

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const MAX_DPR = 2;
const FRAME_MS = 1000 / 12;

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp01(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(1, Math.max(0, numeric)) : fallback;
}

export class EffectPackLayer {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'effect-pack-canvas';
    this.canvas.className = 'effect-pack-canvas';
    this.container.appendChild(this.canvas);
    this.ctx = typeof this.canvas.getContext === 'function'
      ? this.canvas.getContext('2d')
      : null;
    this.effects = [];
    this._timer = null;
    this._startedAt = 0;
    this._boundResize = () => this.resize();
    window.addEventListener?.('resize', this._boundResize);
    this.resize();
  }

  play(effects = []) {
    if (!this.ctx || prefersReducedMotion()) {
      this.clear();
      return;
    }

    this.effects = Array.isArray(effects)
      ? effects.filter((effect) => effect?.manifest?.adapter === 'canvas2d:film-flicker')
      : [];
    if (this.effects.length === 0) {
      this.clear();
      return;
    }

    this.canvas.style.opacity = '1';
    this._startedAt = performance.now();
    this._start();
  }

  clear() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this.effects = [];
    this.ctx?.clearRect(0, 0, this._width || DEFAULT_WIDTH, this._height || DEFAULT_HEIGHT);
    this.canvas.style.opacity = '0';
  }

  resize() {
    const rect = this.container?.getBoundingClientRect?.();
    const width = Math.max(1, Math.round(rect?.width || this.container?.clientWidth || DEFAULT_WIDTH));
    const height = Math.max(1, Math.round(rect?.height || this.container?.clientHeight || DEFAULT_HEIGHT));
    const dpr = Math.min(MAX_DPR, Math.max(1, Number(window.devicePixelRatio) || 1));
    this._width = width;
    this._height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx?.setTransform?.(dpr, 0, 0, dpr, 0, 0);
  }

  destroy() {
    this.clear();
    window.removeEventListener?.('resize', this._boundResize);
    this.canvas.remove();
  }

  _start() {
    if (this._timer) return;
    const step = () => {
      this._timer = null;
      if (this.effects.length === 0) return;
      this._draw();
      this._timer = setTimeout(step, FRAME_MS);
    };
    step();
  }

  _draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    const width = this._width || DEFAULT_WIDTH;
    const height = this._height || DEFAULT_HEIGHT;
    ctx.clearRect(0, 0, width, height);

    for (const effect of this.effects) {
      const adapter = BUILTIN_EFFECT_PACK_ADAPTERS[effect.manifest.adapter];
      const params = normalizeEffectPackParams(effect.params, adapter.paramsSchema);
      this._drawFilmFlicker(ctx, width, height, params);
    }
  }

  _drawFilmFlicker(ctx, width, height, params) {
    const elapsed = performance.now() - this._startedAt;
    const intensity = clamp01(params.intensity, 0.45);
    const grain = clamp01(params.grain, 0.35);
    const vignette = clamp01(params.vignette, 0.25);
    const flicker = 0.5 + Math.sin(elapsed * 0.035) * 0.5;

    ctx.fillStyle = `rgba(255, 244, 214, ${0.08 * intensity * flicker})`;
    ctx.fillRect(0, 0, width, height);

    const lineCount = Math.max(4, Math.round(18 * grain));
    ctx.fillStyle = `rgba(255, 255, 255, ${0.05 * intensity})`;
    for (let i = 0; i < lineCount; i += 1) {
      const seed = Math.sin((elapsed * 0.01 + i + 1) * 78.233) * 43758.5453;
      const y = Math.abs(seed - Math.floor(seed)) * height;
      ctx.fillRect(0, y, width, 1);
    }

    const speckCount = Math.max(8, Math.round(48 * grain));
    ctx.fillStyle = `rgba(0, 0, 0, ${0.12 * intensity})`;
    for (let i = 0; i < speckCount; i += 1) {
      const seedX = Math.sin((elapsed * 0.017 + i + 17) * 12.9898) * 43758.5453;
      const seedY = Math.sin((elapsed * 0.013 + i + 31) * 78.233) * 43758.5453;
      const x = Math.abs(seedX - Math.floor(seedX)) * width;
      const y = Math.abs(seedY - Math.floor(seedY)) * height;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    if (vignette > 0) {
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.25,
        width / 2,
        height / 2,
        Math.hypot(width, height) * 0.55,
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(1, `rgba(0, 0, 0, ${0.55 * vignette * intensity})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  }
}
