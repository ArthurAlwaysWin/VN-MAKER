/**
 * BackgroundLayer — Manages background image display with transitions
 */
import {
  BACKGROUND_TRANSITION_DURATION_SCHEMA,
  clampNumericTransitionParam,
  getTransitionCatalogEntry,
  listTransitionCatalog,
} from '../shared/transitionCatalog.js';
import { getRuntimeTransitionType } from '../shared/cinematicContract.js';
import { runCanvasMaskTransition } from './TransitionMask.js';

const BACKGROUND_TRANSITION_CLASS_NAMES = Object.freeze(
  listTransitionCatalog({ target: 'background', supportedOnly: true })
    .flatMap((entry) => [`bg-transition-${entry.id}`, `bg-transition-${entry.id}-out`])
    .filter((className) => !['bg-transition-fade', 'bg-transition-fade-out', 'bg-transition-none', 'bg-transition-none-out'].includes(className)),
);

export class BackgroundLayer {
  /**
   * @param {HTMLElement} container — the #background-layer element
   * @param {string} basePath — base path for background images
   */
  constructor(container, basePath = '/game/') {
    this.container = container;
    this.basePath = basePath;

    // Use two layers for crossfade
    this.layerA = document.createElement('div');
    this.layerA.className = 'bg-image-layer active';
    this.layerB = document.createElement('div');
    this.layerB.className = 'bg-image-layer';

    this.container.appendChild(this.layerA);
    this.container.appendChild(this.layerB);

    /** @type {'A'|'B'} Which layer is currently on top */
    this._activeLayer = 'A';
    this._transitionTimer = null;
    this._transitionToken = 0;
    this._pendingResolve = null;
    this._canvasMaskAbortController = null;
  }

  /**
   * Set background image with transition
   * @param {Object} data — { image, transition, duration }
   */
  setBackground(data) {
    this._cancelActiveTransition();

    const safeImagePath = String(data.image).replace(/#/g, '%23').replace(/\?/g, '%3F');
    const imageUrl = `url(${this.basePath}${safeImagePath})`;
    const duration = clampNumericTransitionParam(data.duration, BACKGROUND_TRANSITION_DURATION_SCHEMA);
    const transition = this._normalizeTransition(data.transition);
    const transitionEntry = getTransitionCatalogEntry('background', transition);
    const previewVariant = data.previewVariant === 'same-page' ? 'same-page' : null;
    const token = ++this._transitionToken;

    const incoming = this._activeLayer === 'A' ? this.layerB : this.layerA;
    const outgoing = this._activeLayer === 'A' ? this.layerA : this.layerB;

    this._clearLayerState(incoming);
    this._clearLayerState(outgoing);

    incoming.style.backgroundImage = imageUrl;
    incoming.style.transitionDuration = `${duration}ms`;
    outgoing.style.transitionDuration = `${duration}ms`;
    incoming.style.setProperty('--bg-transition-duration', `${duration}ms`);
    outgoing.style.setProperty('--bg-transition-duration', `${duration}ms`);

    if (transition === 'cut' || transition === 'none' || duration === 0) {
      incoming.classList.add('active');
      outgoing.classList.remove('active');
      outgoing.style.backgroundImage = '';
      this._activeLayer = this._activeLayer === 'A' ? 'B' : 'A';
      return Promise.resolve();
    }

    this._activeLayer = this._activeLayer === 'A' ? 'B' : 'A';

    if (transitionEntry?.renderMode === 'canvas-mask') {
      return this._playCanvasMaskTransition({
        incoming,
        outgoing,
        transition,
        fallbackTransition: this._normalizeTransition(transitionEntry.fallbackId),
        duration,
        token,
        previewVariant,
      });
    }

    return this._playCssTransition({ incoming, outgoing, transition, duration, token, previewVariant });
  }

  _playCssTransition({ incoming, outgoing, transition, duration, token, previewVariant }) {
    if (transition !== 'fade') {
      incoming.classList.add(`bg-transition-${transition}`);
      outgoing.classList.add(`bg-transition-${transition}-out`);
    }
    if (previewVariant === 'same-page') {
      incoming.classList.add('bg-preview-same-page');
      outgoing.classList.add('bg-preview-same-page-out');
      incoming.style.setProperty('--bg-preview-opacity', '0.18');
      outgoing.style.setProperty('--bg-preview-opacity', '0.12');
    }

    incoming.classList.add('active');
    outgoing.classList.remove('active');

    return new Promise((resolve) => {
      this._pendingResolve = resolve;
      this._transitionTimer = setTimeout(() => {
        if (token !== this._transitionToken) {
          resolve();
          return;
        }

        this._clearLayerState(incoming);
        this._clearLayerState(outgoing);
        incoming.classList.add('active');
        outgoing.classList.remove('active');
        outgoing.style.backgroundImage = '';
        this._transitionTimer = null;
        this._pendingResolve = null;
        resolve();
      }, duration);
    });
  }

  _playCanvasMaskTransition({ incoming, outgoing, transition, fallbackTransition, duration, token, previewVariant }) {
    return new Promise((resolve) => {
      this._pendingResolve = resolve;
      this._canvasMaskAbortController = new AbortController();
      runCanvasMaskTransition({
        incoming,
        outgoing,
        type: transition,
        duration,
        signal: this._canvasMaskAbortController.signal,
      }).then(() => {
        if (token !== this._transitionToken) {
          resolve();
          return;
        }
        this._clearLayerState(incoming);
        this._clearLayerState(outgoing);
        incoming.classList.add('active');
        outgoing.classList.remove('active');
        outgoing.style.backgroundImage = '';
        this._canvasMaskAbortController = null;
        this._pendingResolve = null;
        resolve();
      }).catch(() => {
        if (token !== this._transitionToken) {
          resolve();
          return;
        }
        this._canvasMaskAbortController = null;
        this._pendingResolve = null;
        this._clearLayerState(incoming);
        this._clearLayerState(outgoing);
        this._playCssTransition({
          incoming,
          outgoing,
          transition: fallbackTransition || 'fade',
          duration,
          token,
          previewVariant,
        }).then(resolve);
      });
    });
  }

  /**
   * Clear background to black
   */
  clear() {
    this._cancelActiveTransition();
    this._clearLayerState(this.layerA);
    this._clearLayerState(this.layerB);
    this.layerA.style.backgroundImage = '';
    this.layerB.style.backgroundImage = '';
    this.layerA.classList.add('active');
    this.layerB.classList.remove('active');
    this._activeLayer = 'A';
  }

  _normalizeTransition(transition) {
    return transition === 'cut' ? 'cut' : getRuntimeTransitionType(transition);
  }

  _cancelActiveTransition() {
    this._transitionToken += 1;
    if (this._transitionTimer) {
      clearTimeout(this._transitionTimer);
      this._transitionTimer = null;
    }
    if (this._canvasMaskAbortController) {
      this._canvasMaskAbortController.abort();
      this._canvasMaskAbortController = null;
    }
    if (this._pendingResolve) {
      const resolve = this._pendingResolve;
      this._pendingResolve = null;
      resolve();
    }
    this._clearLayerState(this.layerA);
    this._clearLayerState(this.layerB);
  }

  _clearLayerState(layer) {
    layer.classList.remove(
      ...BACKGROUND_TRANSITION_CLASS_NAMES,
      'bg-preview-same-page',
      'bg-preview-same-page-out',
    );
    layer.style.filter = '';
    layer.style.transform = '';
    layer.style.clipPath = '';
    layer.style.boxShadow = '';
    layer.style.removeProperty('--bg-transition-duration');
    layer.style.removeProperty('--bg-preview-opacity');
  }
}
