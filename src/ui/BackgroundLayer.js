/**
 * BackgroundLayer — Manages background image display with transitions
 */
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
  }

  /**
   * Set background image with transition
   * @param {Object} data — { image, transition, duration }
   */
  setBackground(data) {
    this._cancelActiveTransition();

    const imageUrl = `url(${this.basePath}${data.image})`;
    const duration = Math.max(0, Number(data.duration) || 0);
    const transition = this._normalizeTransition(data.transition);
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

    this._activeLayer = this._activeLayer === 'A' ? 'B' : 'A';

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
    return typeof transition === 'string' && transition.trim() ? transition : 'fade';
  }

  _cancelActiveTransition() {
    if (this._transitionTimer) {
      clearTimeout(this._transitionTimer);
      this._transitionTimer = null;
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
      'bg-transition-dissolve',
      'bg-transition-wipe',
      'bg-transition-scale',
      'bg-transition-blur',
      'bg-transition-slide-left',
      'bg-transition-slide-right',
      'bg-transition-dissolve-out',
      'bg-transition-wipe-out',
      'bg-transition-scale-out',
      'bg-transition-blur-out',
      'bg-transition-slide-left-out',
      'bg-transition-slide-right-out',
      'bg-preview-same-page',
      'bg-preview-same-page-out',
    );
    layer.style.filter = '';
    layer.style.transform = '';
    layer.style.clipPath = '';
    layer.style.removeProperty('--bg-transition-duration');
    layer.style.removeProperty('--bg-preview-opacity');
  }
}
