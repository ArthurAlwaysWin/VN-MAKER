/**
 * AudioManager — Handles BGM and SE playback
 */
export class AudioManager {
  /**
   * @param {string} basePath — base path for audio files
   */
  constructor(basePath = '/game/') {
    this.basePath = basePath;

    /** @type {HTMLAudioElement|null} Currently playing BGM */
    this._bgm = null;
    /** @type {number} Master BGM volume (0-1) */
    this.bgmVolume = 0.5;
    /** @type {number} Master SE volume (0-1) */
    this.seVolume = 0.8;
    /** @type {number|null} Fade interval ID */
    this._fadeTimer = null;
    /** @type {boolean} Whether audio context has been unlocked */
    this._unlocked = false;

    // Unlock audio on first user interaction
    this._unlockHandler = () => this._unlock();
    document.addEventListener('click', this._unlockHandler, { once: true });
    document.addEventListener('keydown', this._unlockHandler, { once: true });
  }

  _unlock() {
    this._unlocked = true;
    // Resume any suspended audio context
    if (this._bgm) {
      this._bgm.play().catch(() => {});
    }
  }

  /**
   * Play BGM
   * @param {Object} data — { file, volume, fadeIn }
   */
  playBgm(data) {
    this.stopBgm({ fadeOut: 0 });

    this._bgm = new Audio(this.basePath + data.file);
    this._bgm.loop = true;

    const targetVolume = (data.volume ?? 0.5) * this.bgmVolume;

    if (data.fadeIn && data.fadeIn > 0) {
      this._bgm.volume = 0;
      this._bgm.play().catch(() => {});
      this._fadeVolume(this._bgm, 0, targetVolume, data.fadeIn);
    } else {
      this._bgm.volume = targetVolume;
      this._bgm.play().catch(() => {});
    }
  }

  /**
   * Stop BGM
   * @param {Object} data — { fadeOut }
   */
  stopBgm(data) {
    if (this._fadeTimer) {
      clearInterval(this._fadeTimer);
      this._fadeTimer = null;
    }

    if (!this._bgm) return;

    const fadeOut = data?.fadeOut || 0;
    if (fadeOut > 0) {
      const bgm = this._bgm;
      this._fadeVolume(bgm, bgm.volume, 0, fadeOut, () => {
        bgm.pause();
        bgm.currentTime = 0;
      });
    } else {
      this._bgm.pause();
      this._bgm.currentTime = 0;
    }
    this._bgm = null;
  }

  /**
   * Play a sound effect (one-shot)
   * @param {Object} data — { file }
   */
  playSe(data) {
    const se = new Audio(this.basePath + data.file);
    se.volume = this.seVolume;
    se.play().catch(() => {});
  }

  /**
   * Update BGM master volume (called from settings)
   * @param {number} vol — 0-1
   */
  setBgmVolume(vol) {
    this.bgmVolume = vol;
    if (this._bgm) {
      this._bgm.volume = vol;
    }
  }

  /**
   * Update SE master volume
   * @param {number} vol — 0-1
   */
  setSeVolume(vol) {
    this.seVolume = vol;
  }

  /**
   * Fade volume from start to end over duration ms
   * @private
   */
  _fadeVolume(audio, from, to, duration, onComplete) {
    const steps = 20;
    const interval = duration / steps;
    const delta = (to - from) / steps;
    let current = from;
    let step = 0;

    if (this._fadeTimer) clearInterval(this._fadeTimer);

    this._fadeTimer = setInterval(() => {
      step++;
      current += delta;
      audio.volume = Math.max(0, Math.min(1, current));
      if (step >= steps) {
        clearInterval(this._fadeTimer);
        this._fadeTimer = null;
        audio.volume = Math.max(0, Math.min(1, to));
        if (onComplete) onComplete();
      }
    }, interval);
  }

  /**
   * Stop everything (for cleanup)
   */
  clear() {
    this.stopBgm({ fadeOut: 0 });
  }
}
