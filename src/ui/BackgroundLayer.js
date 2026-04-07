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
  }

  /**
   * Set background image with transition
   * @param {Object} data — { image, transition, duration }
   */
  setBackground(data) {
    const imageUrl = `url(${this.basePath}${data.image})`;
    const duration = data.duration || 800;

    const incoming = this._activeLayer === 'A' ? this.layerB : this.layerA;
    const outgoing = this._activeLayer === 'A' ? this.layerA : this.layerB;

    incoming.style.backgroundImage = imageUrl;
    incoming.style.transitionDuration = `${duration}ms`;
    outgoing.style.transitionDuration = `${duration}ms`;

    if (data.transition === 'fade') {
      incoming.classList.add('active');
      outgoing.classList.remove('active');
      // Clean up outgoing image after transition to free memory
      setTimeout(() => { outgoing.style.backgroundImage = ''; }, duration);
    } else {
      // Instant switch
      incoming.style.transitionDuration = '0ms';
      incoming.classList.add('active');
      outgoing.classList.remove('active');
    }

    this._activeLayer = this._activeLayer === 'A' ? 'B' : 'A';
  }

  /**
   * Clear background to black
   */
  clear() {
    this.layerA.style.backgroundImage = '';
    this.layerB.style.backgroundImage = '';
    this.layerA.classList.add('active');
    this.layerB.classList.remove('active');
    this._activeLayer = 'A';
  }
}
