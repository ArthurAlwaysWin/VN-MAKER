/**
 * CharacterLayer — Manages character sprites (show/hide/expression changes)
 * Uses dual-layer DOM: container div + two img children (A/B) for crossfade transitions.
 */
import { clampField } from './sanitize.js';

export class CharacterLayer {
  /**
   * @param {HTMLElement} container — the #character-layer element
   * @param {string} basePath — base path for character images
   */
  constructor(container, basePath = '/game/') {
    this.container = container;
    this.basePath = basePath;

    /** @type {Map<string, {container: HTMLDivElement, motion: HTMLDivElement, imgA: HTMLImageElement, imgB: HTMLImageElement, activeImg: 'A'|'B', currentImage: string|null, _crossfadeGen: number, _crossfadeTimer: number|null}>} */
    this.characters = new Map();
  }

  /**
   * Show a character sprite
   * @param {Object} data — { id, expression, position, transition, duration, image, x?, y?, scale?, skip? }
   */
  show(data) {
    let entry = this.characters.get(data.id);
    const isNew = !entry;

    if (isNew) {
      const container = document.createElement('div');
      container.classList.add('character-sprite');
      container.dataset.characterId = data.id;

      const motion = document.createElement('div');
      motion.className = 'character-motion';

      const imgA = document.createElement('img');
      imgA.className = 'char-img-a active';
      imgA.draggable = false;

      const imgB = document.createElement('img');
      imgB.className = 'char-img-b';
      imgB.draggable = false;

      motion.appendChild(imgA);
      motion.appendChild(imgB);
      container.appendChild(motion);
      this.container.appendChild(container);

      entry = { container, motion, imgA, imgB, activeImg: 'A', currentImage: null, _crossfadeGen: 0, _crossfadeTimer: null };
      this.characters.set(data.id, entry);
    }

    // ─── Image handling ───
    if (data.image) {
      if (isNew) {
        const activeEl = entry.imgA;
        activeEl.src = this.basePath + data.image;
        entry.currentImage = data.image;
        this._updateContainerSize(entry, activeEl);
      } else if (entry.currentImage !== data.image) {
        // Existing character with changed expression — crossfade (D-02)
        entry.currentImage = data.image;
        this._crossfade(entry, this.basePath + data.image, { skip: !!data.skip });
      }
    }

    // ─── Container positioning ───
    entry.container.className = 'character-sprite';
    entry.container.style.left = '';
    entry.container.style.right = '';
    entry.container.style.top = '';
    entry.container.style.bottom = '';
    entry.container.style.transform = '';

    if (data.x !== undefined || data.y !== undefined) {
      entry.container.classList.add('pos-custom');
      entry.container.style.left = `${clampField('x', data.x ?? 640)}px`;
      if (data.y !== undefined) {
        entry.container.style.bottom = 'auto';
        entry.container.style.top = `${clampField('y', data.y)}px`;
      }
      if (data.scale) {
        entry.container.style.transform = `scale(${clampField('scale', data.scale)})`;
      }
    } else {
      entry.container.classList.add(`pos-${data.position || 'center'}`);
    }

    // ─── Container enter transition ───
    const transition = data.transition || 'fade';
    const duration = data.duration || 500;
    entry.container.style.transitionDuration = `${duration}ms`;

    if (transition === 'fade') {
      entry.container.classList.add('enter-fade');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => entry.container.classList.add('entered'));
      });
    } else if (transition === 'slide_left') {
      entry.container.classList.add('enter-slide-left');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => entry.container.classList.add('entered'));
      });
    } else if (transition === 'slide_right') {
      entry.container.classList.add('enter-slide-right');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => entry.container.classList.add('entered'));
      });
    } else {
      entry.container.classList.add('entered');
    }
  }

  /**
   * Hide a character
   * @param {Object} data — { id, transition, duration }
   */
  hide(data) {
    const entry = this.characters.get(data.id);
    if (!entry) return;

    if (entry._crossfadeTimer) {
      clearTimeout(entry._crossfadeTimer);
      entry._crossfadeTimer = null;
    }

    const duration = data.duration || 400;
    entry.container.style.transitionDuration = `${duration}ms`;
    entry.container.classList.remove('entered');

    setTimeout(() => {
      entry.container.remove();
      this.characters.delete(data.id);
    }, duration);
  }

  /**
   * Change a character's expression with crossfade transition.
   * @param {Object} data — { id, expression, image, skip? }
   */
  setExpression(data) {
    const entry = this.characters.get(data.id);
    if (!entry) return;

    if (entry.currentImage === data.image) return;

    entry.currentImage = data.image;
    this._crossfade(entry, this.basePath + data.image, { skip: !!data.skip });
  }

  /**
   * Remove all characters (e.g. when returning to title)
   */
  clear() {
    this.characters.forEach(entry => {
      if (entry._crossfadeTimer) clearTimeout(entry._crossfadeTimer);
      entry.container.remove();
    });
    this.characters.clear();
  }

  /**
   * @private
   * Set container aspect-ratio from loaded image dimensions.
   */
  _updateContainerSize(entry, imgEl) {
    const apply = () => {
      if (imgEl.naturalWidth && imgEl.naturalHeight) {
        entry.container.style.aspectRatio = `${imgEl.naturalWidth} / ${imgEl.naturalHeight}`;
      }
    };
    if (imgEl.complete && imgEl.naturalWidth) {
      apply();
    } else {
      imgEl.onload = apply;
    }
  }

  /**
   * Crossfade between A/B img layers with preloading.
   * @param {Object} entry — character Map entry
   * @param {string} newImageUrl — full resolved image URL (basePath + relative)
   * @param {{ skip?: boolean }} opts — skip: true for 0ms instant swap
   * @private
   */
  async _crossfade(entry, newImageUrl, opts = {}) {
    const skip = opts.skip || false;
    const duration = skip ? 0 : 300;

    // Increment generation to cancel any pending crossfade
    entry._crossfadeGen = (entry._crossfadeGen || 0) + 1;
    const gen = entry._crossfadeGen;

    if (entry._crossfadeTimer) {
      clearTimeout(entry._crossfadeTimer);
      entry._crossfadeTimer = null;
    }

    const incoming = entry.activeImg === 'A' ? entry.imgB : entry.imgA;
    const outgoing = entry.activeImg === 'A' ? entry.imgA : entry.imgB;

    incoming.src = newImageUrl;

    // Preload: wait for decode before starting transition (prevents flash-white)
    if (duration > 0) {
      try {
        await incoming.decode();
      } catch (e) {
        // decode() failed (broken/missing image) — proceed anyway
      }
      if (entry._crossfadeGen !== gen) return;
    }

    incoming.style.transitionDuration = `${duration}ms`;
    outgoing.style.transitionDuration = `${duration}ms`;

    incoming.classList.add('active');
    outgoing.classList.remove('active');

    entry.activeImg = entry.activeImg === 'A' ? 'B' : 'A';

    this._updateContainerSize(entry, incoming);

    if (duration > 0) {
      entry._crossfadeTimer = setTimeout(() => {
        outgoing.src = '';
        outgoing.style.transitionDuration = '';
        incoming.style.transitionDuration = '';
        entry._crossfadeTimer = null;
      }, duration + 50);
    } else {
      outgoing.src = '';
      outgoing.style.transitionDuration = '';
      incoming.style.transitionDuration = '';
    }
  }
}
