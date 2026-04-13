/**
 * CharacterLayer — Manages character sprites (show/hide/expression changes)
 * Uses dual-layer DOM: container div + two img children (A/B) for future crossfade.
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

    /** @type {Map<string, {container: HTMLDivElement, imgA: HTMLImageElement, imgB: HTMLImageElement, activeImg: 'A'|'B'}>} */
    this.characters = new Map();
  }

  /**
   * Show a character sprite
   * @param {Object} data — { id, expression, position, transition, duration, image, x?, y?, scale? }
   */
  show(data) {
    let entry = this.characters.get(data.id);

    if (!entry) {
      const container = document.createElement('div');
      container.classList.add('character-sprite');
      container.dataset.characterId = data.id;

      const imgA = document.createElement('img');
      imgA.className = 'char-img-a active';
      imgA.draggable = false;

      const imgB = document.createElement('img');
      imgB.className = 'char-img-b';
      imgB.draggable = false;

      container.appendChild(imgA);
      container.appendChild(imgB);
      this.container.appendChild(container);

      entry = { container, imgA, imgB, activeImg: 'A' };
      this.characters.set(data.id, entry);
    }

    const activeEl = entry.activeImg === 'A' ? entry.imgA : entry.imgB;
    activeEl.src = this.basePath + data.image;
    this._updateContainerSize(entry, activeEl);

    // Reset classes and inline positioning on container
    entry.container.className = 'character-sprite';
    entry.container.style.left = '';
    entry.container.style.right = '';
    entry.container.style.top = '';
    entry.container.style.bottom = '';
    entry.container.style.transform = '';

    // Positioning on container
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

    // Transition in on container
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

    const duration = data.duration || 400;
    entry.container.style.transitionDuration = `${duration}ms`;
    entry.container.classList.remove('entered');

    setTimeout(() => {
      entry.container.remove();
      this.characters.delete(data.id);
    }, duration);
  }

  /**
   * Change a character's expression (instant swap, no crossfade — Phase 38 adds crossfade)
   * @param {Object} data — { id, expression, image }
   */
  setExpression(data) {
    const entry = this.characters.get(data.id);
    if (!entry) return;
    const activeEl = entry.activeImg === 'A' ? entry.imgA : entry.imgB;
    activeEl.src = this.basePath + data.image;
    this._updateContainerSize(entry, activeEl);
  }

  /**
   * Remove all characters (e.g. when returning to title)
   */
  clear() {
    this.characters.forEach(entry => entry.container.remove());
    this.characters.clear();
  }

  /**
   * @private
   * Set container aspect-ratio from loaded image dimensions.
   * A div has no intrinsic size from absolute children, so we derive
   * the width from height × (naturalWidth / naturalHeight) via CSS aspect-ratio.
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
}
