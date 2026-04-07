/**
 * ReadHistory — Tracks which pages have been read by the player.
 *
 * Uses localStorage with key format `readHistory:{projectId}`.
 * Cross-save shared — all save slots share the same read history.
 * Stores entries as `"sceneId:pageIndex"` strings in a Set.
 */
export class ReadHistory {
  /**
   * @param {string} projectId — unique project identifier
   */
  constructor(projectId) {
    this._storageKey = `readHistory:${projectId}`;
    this._read = new Set();
    this._saveTimer = null;
    this._load();
  }

  /**
   * Mark a page as read. Persists with debounce to avoid excessive writes during skip mode.
   * @param {string} sceneId
   * @param {number} pageIndex
   */
  markRead(sceneId, pageIndex) {
    const key = `${sceneId}:${pageIndex}`;
    if (this._read.has(key)) return;
    this._read.add(key);
    this._debouncedSave();
  }

  /**
   * Check whether a page has been read.
   * @param {string} sceneId
   * @param {number} pageIndex
   * @returns {boolean}
   */
  isRead(sceneId, pageIndex) {
    return this._read.has(`${sceneId}:${pageIndex}`);
  }

  /** Clear all read history and persist. */
  clear() {
    this._read.clear();
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._save();
  }

  /** @returns {number} Number of read entries */
  get size() {
    return this._read.size;
  }

  // ── Private persistence ───────────────────────────────

  /** @private Debounced save — batches rapid markRead calls (e.g. skip mode at 30ms) */
  _debouncedSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._save();
    }, 500);
  }

  /** @private Load read history from localStorage */
  _load() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (raw) {
        const arr = JSON.parse(raw);
        this._read = new Set(arr);
      }
    } catch (e) {
      console.warn('[ReadHistory] Failed to load:', e);
    }
  }

  /** @private Save read history to localStorage */
  _save() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify([...this._read]));
    } catch (e) {
      console.warn('[ReadHistory] Failed to save:', e);
    }
  }
}
