import { resolvePath } from '../engine/assetPath.js';

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
  }

  show(registry = {}, unlocked = {}) {
    const entries = sortedEntries(registry);
    this.el.innerHTML = `
      <div class="gallery-header">
        <div class="gallery-title">CG GALLERY</div>
        <button class="gallery-close" type="button">返回</button>
      </div>
      <div class="gallery-body">
        <div class="gallery-focus">
          <div class="gallery-focus-empty">选择已解锁的 CG 查看大图</div>
        </div>
        <div class="gallery-grid"></div>
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

    this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.el.classList.add('visible'));
  }

  hide() {
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
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
      card.addEventListener('click', () => this._showFocus(entry));
    }
    return card;
  }

  _showFocus(entry, imageIndex = 0) {
    const focus = this.el.querySelector('.gallery-focus');
    focus.innerHTML = '';
    const images = Array.isArray(entry.images) && entry.images.length > 0
      ? entry.images
      : [entry.thumbnail].filter(Boolean);
    const safeIndex = Math.min(
      Math.max(Number(imageIndex) || 0, 0),
      Math.max(images.length - 1, 0),
    );
    const imagePath = images[safeIndex] ?? entry.thumbnail;
    focus.classList.toggle('has-navigation', images.length > 1);
    focus.appendChild(this._createImage(imagePath, entry.title || entry.id, 'gallery-focus-image'));
    const title = document.createElement('p');
    title.className = 'gallery-focus-title';
    title.textContent = entry.title || entry.id;
    focus.appendChild(title);

    if (images.length > 1) {
      const controls = document.createElement('div');
      controls.className = 'gallery-focus-controls';
      const previous = document.createElement('button');
      previous.className = 'gallery-nav gallery-nav-prev';
      previous.type = 'button';
      previous.textContent = '上一张';
      previous.disabled = safeIndex === 0;
      previous.addEventListener('click', () => this._showFocus(entry, safeIndex - 1));
      const position = document.createElement('span');
      position.className = 'gallery-position';
      position.textContent = `${safeIndex + 1} / ${images.length}`;
      const next = document.createElement('button');
      next.className = 'gallery-nav gallery-nav-next';
      next.type = 'button';
      next.textContent = '下一张';
      next.disabled = safeIndex === images.length - 1;
      next.addEventListener('click', () => this._showFocus(entry, safeIndex + 1));
      controls.append(previous, position, next);
      focus.appendChild(controls);
    }
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
