import { resolvePath } from '../engine/assetPath.js';
import { createUiRuntimeHost } from './renderer/createUiRendererHost.js';

function sortedEntries(registry = {}) {
  return Object.entries(registry ?? {})
    .map(([id, entry]) => ({ id, ...(entry ?? {}) }))
    .sort((left, right) => (
      Number(left.order ?? 0) - Number(right.order ?? 0)
      || String(left.title ?? left.id).localeCompare(String(right.title ?? right.id))
    ));
}

export class GalleryScreen {
  constructor(container) {
    this.container = container;
    this.el = document.createElement('div');
    this.el.id = 'gallery-screen';
    this.el.classList.add('hidden');
    this.container.appendChild(this.el);
    this.onClose = null;
    this.onEndingVideoReplay = null;
    this._canonicalDocument = null;
    this._canonicalHost = null;
    this._entries = [];
    this._endingEntries = [];
    this._unlocked = {};
    this._endingUnlocks = {};
    this._lastFocused = null;
    this._focusReturnElement = null;
  }

  setLayout(_legacyLayout, { canonicalDocument = null } = {}) {
    this._canonicalDocument = canonicalDocument || null;
  }

  show(registry = {}, unlocked = {}, { endings = {}, endingUnlocks = {} } = {}) {
    const entries = sortedEntries(registry);
    const endingEntries = sortedEntries(endings);
    this._entries = entries;
    this._endingEntries = endingEntries;
    this._unlocked = unlocked ?? {};
    this._endingUnlocks = endingUnlocks ?? {};
    this._lastFocused = this.el.ownerDocument.activeElement;
    if (this._canonicalDocument) {
      this._renderCanonical();
      this.el.classList.remove('hidden');
      requestAnimationFrame(() => {
        this.el.classList.add('visible');
        this.el.querySelector('button:not([disabled])')?.focus();
      });
      return;
    }
    this._unmountCanonical();
    this.el.innerHTML = `
      <div class="gallery-header">
        <div class="gallery-title">CG GALLERY</div>
        <button class="gallery-close" type="button">返回</button>
      </div>
      <div class="gallery-body">
        <div class="gallery-focus">
          <div class="gallery-focus-empty">选择已解锁的 CG 查看大图</div>
        </div>
        <div class="gallery-library">
          <div class="gallery-grid"></div>
        </div>
      </div>
    `;
    this.el.querySelector('.gallery-close').addEventListener('click', () => {
      this.hide();
      this.onClose?.();
    });

    const grid = this.el.querySelector('.gallery-grid');
    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'gallery-empty';
      empty.textContent = '尚未配置 CG 图库。';
      grid.appendChild(empty);
    } else {
      entries.forEach((entry) => grid.appendChild(this._createCard(entry, unlocked[entry.id])));
    }

    if (endingEntries.length > 0) {
      const endingSection = document.createElement('section');
      endingSection.className = 'gallery-ending-section';
      const heading = document.createElement('h2');
      heading.className = 'gallery-section-title';
      heading.textContent = 'ENDINGS';
      const endingGrid = document.createElement('div');
      endingGrid.className = 'gallery-grid gallery-ending-grid';
      endingEntries.forEach((entry) => {
        endingGrid.appendChild(this._createEndingCard(entry, endingUnlocks[entry.id]));
      });
      endingSection.append(heading, endingGrid);
      grid.parentElement?.appendChild(endingSection);
    }

    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));
  }

  hide() {
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
    this._unmountCanonical();
    this._lastFocused?.focus?.();
    this._lastFocused = null;
    this._focusReturnElement = null;
  }

  _renderCanonical() {
    this._unmountCanonical();
    this.el.innerHTML = '';
    this.el.classList.add('gallery-canonical');
    const galleryData = [
      ...this._entries.map(entry => ({ kind: 'cg', entry, unlockRecord: this._unlocked[entry.id] })),
      ...this._endingEntries.map(entry => ({ kind: 'ending', entry, unlockRecord: this._endingUnlocks[entry.id] })),
    ];
    this._canonicalHost = createUiRuntimeHost({
      container: this.el,
      resolveAssetUrl: path => resolvePath(path),
      actions: { 'close-screen': () => { this.hide(); this.onClose?.(); } },
      dataSources: { 'gallery.items': galleryData },
      semanticWidgets: {
        'gallery-grid': {
          mount: ({ element }) => { element.dataset.gmUiPart = 'items'; element.classList.add('gallery-grid'); },
          update: ({ element, node }) => {
            element.replaceChildren();
            element.style.display = 'grid';
            element.style.gridTemplateColumns = `repeat(${Math.max(1, Number(node.content?.columns) || 3)}, minmax(0, 1fr))`;
            const cgItems = galleryData.filter(item => item.kind === 'cg');
            if (!cgItems.length) {
              const empty = element.ownerDocument.createElement('p');
              empty.className = 'gallery-empty';
              empty.textContent = node.content?.emptyText ?? '尚未配置 CG 图库。';
              element.appendChild(empty);
            }
            for (const item of galleryData) {
              const card = item.kind === 'cg'
                ? this._createCard(item.entry, item.unlockRecord)
                : this._createEndingCard(item.entry, item.unlockRecord);
              card.dataset.galleryKind = item.kind;
              element.appendChild(card);
            }
          },
          unmount() {},
        },
        'focus-viewer': {
          mount: ({ element, node }) => {
            element.classList.add('gallery-focus');
            for (const part of node.parts ?? []) {
              const partElement = element.ownerDocument.createElement('div');
              partElement.dataset.gmUiPart = part;
              element.appendChild(partElement);
            }
          },
          update: ({ element, node }) => {
            const media = element.querySelector('[data-gm-ui-part="media"]');
            if (media && !media.hasChildNodes()) {
              media.className = 'gallery-focus-empty';
              media.textContent = node.content?.emptyText ?? '选择已解锁的 CG 查看大图';
            }
            const close = element.querySelector('[data-gm-ui-part="close"]');
            if (close && !close.hasChildNodes()) close.hidden = true;
          },
          unmount() {},
        },
      },
    });
    this._canonicalHost.mount(this._canonicalDocument);
    this._applyCanonicalResponsiveLayout();
    this._onCanonicalResize = () => this._applyCanonicalResponsiveLayout();
    this.el.ownerDocument.defaultView?.addEventListener('resize', this._onCanonicalResize);
  }

  _applyCanonicalResponsiveLayout() {
    const root = this._canonicalHost?.renderer?.root;
    if (!root) return;
    const focus = root.querySelector('[data-gm-ui-node-type="focus-viewer"]');
    const grid = root.querySelector('[data-gm-ui-node-type="gallery-grid"]');
    if (!focus || !grid) return;
    const width = this.el.ownerDocument.defaultView?.innerWidth ?? this._canonicalDocument?.viewport?.width ?? 1280;
    const mobile = width < 640;
    Object.assign(grid.style, mobile
      ? { left: '12px', right: '12px', top: '76px', bottom: 'auto', width: 'auto', height: '300px', transform: 'none', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', overflowY: 'auto' }
      : { left: '38%', right: '0', top: '14%', bottom: '0', width: 'auto', height: 'auto', transform: 'none', overflowY: 'auto' });
    Object.assign(focus.style, mobile
      ? { left: '12px', right: '12px', top: '390px', bottom: '12px', width: 'auto', height: 'auto', transform: 'none' }
      : { left: '0', right: '62%', top: '14%', bottom: '0', width: 'auto', height: 'auto', transform: 'none' });
    focus.style.display = 'flex';
    focus.style.flexDirection = 'column';
    focus.style.gap = '8px';
    focus.style.padding = mobile ? '12px' : '18px';
    for (const part of focus.querySelectorAll('[data-gm-ui-part]')) {
      const id = part.dataset.gmUiPart;
      part.style.order = String({ close: 0, media: 1, title: 2, description: 3, navigation: 4 }[id] ?? 5);
      if (id === 'media') Object.assign(part.style, { flex: '1 1 auto', minHeight: '0', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' });
      if (id === 'close') Object.assign(part.style, { alignSelf: 'flex-end' });
    }
    const media = focus.querySelector('.gallery-focus-image');
    if (media) Object.assign(media.style, { width: '100%', height: '100%', minHeight: mobile ? '160px' : '220px' });
  }

  _focusElement() {
    return this._canonicalHost?.renderer?.root?.querySelector('[data-gm-ui-node-type="focus-viewer"]')
      ?? this.el.querySelector('.gallery-focus');
  }

  _clearFocus() {
    const focus = this._focusElement();
    if (!focus) return null;
    for (const part of focus.querySelectorAll('[data-gm-ui-part]')) {
      part.replaceChildren();
      part.hidden = part.dataset.gmUiPart === 'close';
    }
    if (!focus.querySelector('[data-gm-ui-part]')) focus.replaceChildren();
    return focus;
  }

  _focusPart(focus, part) {
    return focus.querySelector(`[data-gm-ui-part="${part}"]`) ?? focus;
  }

  _unmountCanonical() {
    if (this._onCanonicalResize) this.el.ownerDocument.defaultView?.removeEventListener('resize', this._onCanonicalResize);
    this._onCanonicalResize = null;
    this._canonicalHost?.unmount();
    this._canonicalHost = null;
    this.el.classList.remove('gallery-canonical');
  }

  _createCard(entry, unlockRecord) {
    const isUnlocked = Boolean(unlockRecord);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `gallery-card${isUnlocked ? ' unlocked' : ' locked'}`;
    card.disabled = !isUnlocked;

    const previewPath = isUnlocked
      ? entry.thumbnail ?? entry.images?.[0]
      : entry.lockedThumbnail;
    const image = this._createImage(previewPath, isUnlocked ? entry.title : 'Locked CG');
    card.appendChild(image);

    const label = document.createElement('span');
    label.className = 'gallery-card-label';
    label.textContent = isUnlocked ? (entry.title || entry.id) : 'LOCKED';
    card.appendChild(label);

    if (isUnlocked) {
      card.addEventListener('click', () => {
        this._focusReturnElement = card;
        this._showFocus(entry);
      });
    }
    return card;
  }

  _createEndingCard(entry, unlockRecord) {
    const isUnlocked = Boolean(unlockRecord) || entry.hiddenUntilUnlocked === false;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `gallery-card gallery-ending-card${isUnlocked ? ' unlocked' : ' locked'}`;
    card.disabled = !isUnlocked;

    const previewPath = isUnlocked ? entry.thumbnail : null;
    card.appendChild(this._createImage(previewPath, isUnlocked ? entry.title : 'Locked Ending'));

    const label = document.createElement('span');
    label.className = 'gallery-card-label';
    label.textContent = isUnlocked ? (entry.title || entry.id) : 'LOCKED';
    card.appendChild(label);

    if (isUnlocked) {
      card.addEventListener('click', () => {
        this._focusReturnElement = card;
        this._showEndingFocus(entry, {
          canReplayEndingVideo: Boolean(unlockRecord),
        });
      });
    }
    return card;
  }

  _showFocus(entry, imageIndex = 0) {
    const focus = this._canonicalDocument ? this._clearFocus() : this.el.querySelector('.gallery-focus');
    if (!focus) return;
    if (!this._canonicalDocument) focus.innerHTML = '';
    const images = Array.isArray(entry.images) && entry.images.length > 0
      ? entry.images
      : [entry.thumbnail].filter(Boolean);
    const safeIndex = Math.min(
      Math.max(Number(imageIndex) || 0, 0),
      Math.max(images.length - 1, 0),
    );
    const imagePath = images[safeIndex] ?? entry.thumbnail;
    focus.classList.toggle('has-navigation', images.length > 1);
    this._focusPart(focus, 'media').appendChild(this._createImage(imagePath, entry.title || entry.id, 'gallery-focus-image'));
    const title = document.createElement('p');
    title.className = 'gallery-focus-title';
    title.textContent = entry.title || entry.id;
    this._focusPart(focus, 'title').appendChild(title);
    if (entry.description) {
      const description = document.createElement('p');
      description.className = 'gallery-focus-description';
      description.textContent = entry.description;
      this._focusPart(focus, 'description').appendChild(description);
    }

    if (images.length > 1) {
      const controls = document.createElement('div');
      controls.className = 'gallery-focus-controls';
      const previous = document.createElement('button');
      previous.className = 'gallery-nav gallery-nav-prev';
      previous.type = 'button';
      previous.textContent = '上一张';
      previous.disabled = safeIndex === 0;
      previous.addEventListener('click', () => {
        this._showFocus(entry, safeIndex - 1);
        this._focusElement()?.querySelector('.gallery-nav-prev:not([disabled]), .gallery-nav-next:not([disabled])')?.focus();
      });
      const position = document.createElement('span');
      position.className = 'gallery-position';
      position.textContent = `${safeIndex + 1} / ${images.length}`;
      const next = document.createElement('button');
      next.className = 'gallery-nav gallery-nav-next';
      next.type = 'button';
      next.textContent = '下一张';
      next.disabled = safeIndex === images.length - 1;
      next.addEventListener('click', () => {
        this._showFocus(entry, safeIndex + 1);
        this._focusElement()?.querySelector('.gallery-nav-next:not([disabled]), .gallery-nav-prev:not([disabled])')?.focus();
      });
      controls.append(previous, position, next);
      this._focusPart(focus, 'navigation').appendChild(controls);
    }
    this._renderFocusClose(focus);
    this._applyCanonicalResponsiveLayout();
  }

  _showEndingFocus(entry, { canReplayEndingVideo = false } = {}) {
    const focus = this._canonicalDocument ? this._clearFocus() : this.el.querySelector('.gallery-focus');
    if (!focus) return;
    if (!this._canonicalDocument) focus.innerHTML = '';
    focus.classList.remove('has-navigation');
    this._focusPart(focus, 'media').appendChild(this._createImage(entry.thumbnail, entry.title || entry.id, 'gallery-focus-image'));

    const title = document.createElement('p');
    title.className = 'gallery-focus-title';
    title.textContent = entry.title || entry.id;
    this._focusPart(focus, 'title').appendChild(title);
    if (entry.description) {
      const description = document.createElement('p');
      description.className = 'gallery-focus-description';
      description.textContent = entry.description;
      this._focusPart(focus, 'description').appendChild(description);
    }

    if (canReplayEndingVideo && entry.endingVideo && (entry.endingVideo.play ?? 'after-unlock') === 'manual') {
      const controls = document.createElement('div');
      controls.className = 'gallery-focus-controls';
      const replay = document.createElement('button');
      replay.className = 'gallery-nav gallery-ending-video-replay';
      replay.type = 'button';
      replay.textContent = '播放 ED';
      replay.addEventListener('click', () => this.onEndingVideoReplay?.(entry.id));
      controls.appendChild(replay);
      this._focusPart(focus, 'navigation').appendChild(controls);
    }
    this._renderFocusClose(focus);
    this._applyCanonicalResponsiveLayout();
  }

  _renderFocusClose(focus) {
    if (!this._canonicalDocument) return;
    const closePart = this._focusPart(focus, 'close');
    closePart.hidden = false;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-focus-close';
    button.textContent = '关闭大图';
    button.addEventListener('click', () => {
      this._clearFocus();
      const media = this._focusPart(focus, 'media');
      media.className = 'gallery-focus-empty';
      media.textContent = '选择已解锁的 CG 查看大图';
      if (this._focusReturnElement?.isConnected) this._focusReturnElement.focus();
    });
    closePart.appendChild(button);
  }

  _createImage(path, alt, className = 'gallery-card-image') {
    const frame = document.createElement('div');
    frame.className = className;
    if (!path) {
      frame.classList.add('missing');
      frame.textContent = 'NO IMAGE';
      return frame;
    }

    const image = document.createElement('img');
    image.src = resolvePath(path);
    image.alt = alt;
    image.addEventListener('error', () => {
      frame.classList.add('missing');
      frame.textContent = 'IMAGE MISSING';
      image.remove();
    });
    frame.appendChild(image);
    return frame;
  }
}
