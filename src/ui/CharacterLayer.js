/**
 * CharacterLayer — Manages character sprites (show/hide/expression changes)
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

    /** @type {Map<string, HTMLImageElement>} Currently visible character elements */
    this.characters = new Map();
  }

  /**
   * Show a character sprite
   * @param {Object} data — { id, expression, position, transition, duration, image }
   */
  show(data) {
    let el = this.characters.get(data.id);

    if (!el) {
      el = document.createElement('img');
      el.classList.add('character-sprite');
      el.dataset.characterId = data.id;
      el.draggable = false;
      this.container.appendChild(el);
      this.characters.set(data.id, el);
    }

    el.src = this.basePath + data.image;

    // Reset classes and inline positioning
    el.className = 'character-sprite';
    el.style.left = '';
    el.style.right = '';
    el.style.top = '';
    el.style.bottom = '';
    el.style.transform = '';

    // Positioning: prefer explicit x/y over preset position strings
    if (data.x !== undefined || data.y !== undefined) {
      el.classList.add('pos-custom');
      el.style.left = `${clampField('x', data.x ?? 640)}px`;
      if (data.y !== undefined) {
        el.style.bottom = 'auto';
        el.style.top = `${clampField('y', data.y)}px`;
      }
      if (data.scale) {
        el.style.transform = `scale(${clampField('scale', data.scale)})`;
      }
    } else {
      el.classList.add(`pos-${data.position || 'center'}`);
    }

    // Transition in
    const transition = data.transition || 'fade';
    const duration = data.duration || 500;
    el.style.transitionDuration = `${duration}ms`;

    if (transition === 'fade') {
      el.classList.add('enter-fade');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('entered'));
      });
    } else if (transition === 'slide_left') {
      el.classList.add('enter-slide-left');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('entered'));
      });
    } else if (transition === 'slide_right') {
      el.classList.add('enter-slide-right');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('entered'));
      });
    } else {
      el.classList.add('entered');
    }
  }

  /**
   * Hide a character
   * @param {Object} data — { id, transition, duration }
   */
  hide(data) {
    const el = this.characters.get(data.id);
    if (!el) return;

    const duration = data.duration || 400;
    el.style.transitionDuration = `${duration}ms`;
    el.classList.remove('entered');

    setTimeout(() => {
      el.remove();
      this.characters.delete(data.id);
    }, duration);
  }

  /**
   * Change a character's expression
   * @param {Object} data — { id, expression, image }
   */
  setExpression(data) {
    const el = this.characters.get(data.id);
    if (!el) return;
    el.src = this.basePath + data.image;
  }

  /**
   * Remove all characters (e.g. when returning to title)
   */
  clear() {
    this.characters.forEach(el => el.remove());
    this.characters.clear();
  }
}
