/**
 * ParticleLayer — procedural canvas atmosphere layer.
 */
import {
  PARTICLE_PRESET_DEFS,
  normalizeParticleConfig,
} from '../shared/particleContract.js';

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function directionVector(direction) {
  switch (direction) {
    case 'up':
      return { x: 0, y: -1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    case 'down':
    default:
      return { x: 0, y: 1 };
  }
}

function placeParticleAtSpawnEdge(particle, initial, width, height, direction) {
  if (initial) {
    particle.x = randomBetween(-40, width + 40);
    particle.y = randomBetween(-40, height + 40);
    return;
  }

  if (direction === 'up') {
    particle.x = randomBetween(-40, width + 40);
    particle.y = height + randomBetween(12, 80);
  } else if (direction === 'left') {
    particle.x = width + randomBetween(12, 80);
    particle.y = randomBetween(-40, height + 40);
  } else if (direction === 'right') {
    particle.x = -randomBetween(12, 80);
    particle.y = randomBetween(-40, height + 40);
  } else {
    particle.x = randomBetween(-40, width + 40);
    particle.y = -randomBetween(12, 80);
  }
}

function prefersReducedMotion() {
  return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

export class ParticleLayer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'particle-canvas';
    this.canvas.className = 'particle-canvas';
    this.container.appendChild(this.canvas);

    this.ctx = typeof this.canvas.getContext === 'function'
      ? this.canvas.getContext('2d')
      : null;
    this.particles = [];
    this.config = null;
    this._raf = null;
    this._lastTime = 0;
    this._fadeStart = 0;
    this._fadeEnd = 0;
    this._fadeFromOpacity = 1;
    this._boundResize = () => this.resize();
    this._boundVisibility = () => this._handleVisibilityChange();

    window.addEventListener?.('resize', this._boundResize);
    document.addEventListener?.('visibilitychange', this._boundVisibility);
    this.resize();
  }

  play(config) {
    const normalized = normalizeParticleConfig(config);
    if (!normalized || prefersReducedMotion()) {
      this.clear();
      return;
    }

    const configChanged = JSON.stringify(this.config) !== JSON.stringify(normalized);
    this.config = normalized;
    this._fadeStart = 0;
    this._fadeEnd = 0;
    const def = PARTICLE_PRESET_DEFS[normalized.preset] || PARTICLE_PRESET_DEFS.dust;
    const count = Math.min(def.cap, Math.max(0, Math.round(def.cap * normalized.density)));
    while (this.particles.length < count) {
      this.particles.push(this._createParticle(true));
    }
    this.particles.length = count;
    for (const particle of this.particles) {
      if (!particle.ready || configChanged) this._resetParticle(particle, true);
    }
    this._start();
  }

  stop(fadeOutMs = 600) {
    if (!this.particles.length) {
      this.clear();
      return;
    }
    const duration = Math.max(0, Number(fadeOutMs) || 0);
    if (duration === 0 || !this.ctx) {
      this.clear();
      return;
    }
    const now = performance.now();
    this._fadeStart = now;
    this._fadeEnd = now + duration;
    this._fadeFromOpacity = this.config?.opacity ?? 1;
    this._start();
  }

  clear() {
    this.particles = [];
    this.config = null;
    this._fadeStart = 0;
    this._fadeEnd = 0;
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  resize() {
    const dpr = Math.min(Number(window.devicePixelRatio) || 1, 2);
    const rect = this.container.getBoundingClientRect?.();
    const width = Math.max(1, Math.round(rect?.width || this.container.clientWidth || DEFAULT_WIDTH));
    const height = Math.max(1, Math.round(rect?.height || this.container.clientHeight || DEFAULT_HEIGHT));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  destroy() {
    this.clear();
    window.removeEventListener?.('resize', this._boundResize);
    document.removeEventListener?.('visibilitychange', this._boundVisibility);
    this.canvas.remove();
  }

  _start() {
    if (!this.ctx || this._raf || document.hidden) return;
    this._lastTime = performance.now();
    this._raf = requestAnimationFrame((time) => this._tick(time));
  }

  _tick(time) {
    this._raf = null;
    if (!this.ctx || document.hidden) return;

    const dt = Math.min(64, Math.max(0, time - this._lastTime)) / 16.67;
    this._lastTime = time;
    this._draw(time, dt);

    if (this.config && this.particles.length) {
      this._raf = requestAnimationFrame((nextTime) => this._tick(nextTime));
    }
  }

  _draw(time, dt) {
    const width = this.canvas.clientWidth || DEFAULT_WIDTH;
    const height = this.canvas.clientHeight || DEFAULT_HEIGHT;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    let opacity = this.config?.opacity ?? 1;
    if (this._fadeEnd > 0) {
      const progress = Math.min(1, Math.max(0, (time - this._fadeStart) / (this._fadeEnd - this._fadeStart)));
      opacity = this._fadeFromOpacity * (1 - progress);
      if (progress >= 1) {
        this.clear();
        return;
      }
    }

    for (const particle of this.particles) {
      this._stepParticle(particle, dt, width, height);
      this._drawParticle(ctx, particle, opacity);
    }
  }

  _createParticle(initial = false) {
    const particle = { ready: false };
    this._resetParticle(particle, initial);
    return particle;
  }

  _resetParticle(particle, initial = false) {
    const width = this.canvas.clientWidth || DEFAULT_WIDTH;
    const height = this.canvas.clientHeight || DEFAULT_HEIGHT;
    const config = this.config || normalizeParticleConfig({ preset: 'dust' });
    const speed = config.speed || 1;
    const direction = config.direction || 'down';
    const vector = directionVector(direction);
    const drift = config.wind || 0;
    const baseVelocity = randomBetween(0.35, 1.2) * speed;
    particle.ready = true;
    placeParticleAtSpawnEdge(particle, initial, width, height, direction);
    particle.size = randomBetween(3, 9);
    particle.rotation = randomBetween(0, Math.PI * 2);
    particle.spin = randomBetween(-0.035, 0.035);
    particle.vx = vector.x * baseVelocity + (vector.y !== 0 ? drift * randomBetween(0.6, 1.8) : 0);
    particle.vy = vector.y * baseVelocity + (vector.x !== 0 ? drift * randomBetween(0.6, 1.8) : 0);

    if (config.preset === 'rain') {
      particle.size = randomBetween(10, 22);
      const rainVelocity = randomBetween(8, 14) * Math.max(0.2, speed);
      particle.vx = vector.x * rainVelocity + (vector.y !== 0 ? drift * 6 : 0);
      particle.vy = vector.y * rainVelocity + (vector.x !== 0 ? drift * 6 : 0);
    } else if (config.preset === 'firefly' || config.preset === 'sparkle') {
      particle.size = randomBetween(2, 5);
      const floatVelocity = randomBetween(0.12, 0.45) * speed;
      particle.vx = vector.x * floatVelocity + (vector.y !== 0 ? drift * 0.4 : randomBetween(-0.25, 0.25));
      particle.vy = vector.y * floatVelocity + (vector.x !== 0 ? drift * 0.4 : randomBetween(-0.25, 0.25));
    } else if (config.preset === 'bubbles') {
      particle.size = randomBetween(5, 14);
      const bubbleVelocity = randomBetween(0.4, 1.1) * Math.max(0.2, speed);
      particle.vx = vector.x * bubbleVelocity + (vector.y !== 0 ? drift * 0.6 : 0);
      particle.vy = vector.y * bubbleVelocity + (vector.x !== 0 ? drift * 0.6 : 0);
    }
  }

  _stepParticle(particle, dt, width, height) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.rotation += particle.spin * dt;

    if (
      particle.y > height + 90
      || particle.y < -100
      || particle.x < -120
      || particle.x > width + 120
    ) {
      this._resetParticle(particle, false);
    }
  }

  _drawParticle(ctx, particle, opacity) {
    const config = this.config;
    if (!config) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.fillStyle = config.color;
    ctx.strokeStyle = config.color;

    if (config.preset === 'rain') {
      const vector = directionVector(config.direction);
      const wind = config.wind || 0;
      const tailX = vector.x * particle.size + (vector.y !== 0 ? wind * 8 : 0);
      const tailY = vector.y * particle.size + (vector.x !== 0 ? wind * 8 : 0);
      ctx.globalAlpha = opacity * 0.72;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    } else if (config.preset === 'sakura' || config.preset === 'leaves') {
      ctx.scale(1.5, 0.75);
      ctx.beginPath();
      ctx.ellipse(0, 0, particle.size, particle.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (config.preset === 'sparkle') {
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-particle.size, 0);
      ctx.lineTo(particle.size, 0);
      ctx.moveTo(0, -particle.size);
      ctx.lineTo(0, particle.size);
      ctx.stroke();
    } else if (config.preset === 'bubbles') {
      ctx.globalAlpha = opacity * 0.5;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _handleVisibilityChange() {
    if (document.hidden && this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    } else if (!document.hidden && this.config && this.particles.length) {
      this._start();
    }
  }
}
