/**
 * ReadHistory — Tracks which pages have been read by the player.
 *
 * Uses PlayerDataRepository profile truth keyed by `projectId`.
 * Cross-save shared — all save slots share the same read history.
 * Stores entries as `"sceneId:pageIndex"` strings in a Set.
 */
export class ReadHistory {
  /**
   * @param {import('./PlayerDataRepository.js').PlayerDataRepository} repository
   */
  constructor(repository) {
    this._repository = repository;
    this._read = new Set();
    this._saveTimer = null;
    this._handleBeforeUnload = () => this.flush();
    this._handleVisibilityChange = () => {
      if (globalThis.document?.visibilityState === 'hidden') {
        this.flush();
      }
    };
    this._loadFromRepository();
    globalThis.window?.addEventListener?.('beforeunload', this._handleBeforeUnload);
    globalThis.document?.addEventListener?.('visibilitychange', this._handleVisibilityChange);
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
    this._saveTimer = null;
    this._save();
  }

  /** Flush any pending debounced save immediately. */
  flush() {
    if (!this._saveTimer) return;
    clearTimeout(this._saveTimer);
    this._saveTimer = null;
    this._save();
  }

  /** Remove lifecycle listeners for tests or explicit teardown. */
  dispose() {
    this.flush();
    globalThis.window?.removeEventListener?.('beforeunload', this._handleBeforeUnload);
    globalThis.document?.removeEventListener?.('visibilitychange', this._handleVisibilityChange);
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

  /** @private Load read history from the repository profile */
  _loadFromRepository() {
    const pages = this._repository?.getProfile?.().readHistory?.pages ?? [];
    this._read = new Set(pages);
  }

  /** @private Save read history to the repository profile */
  _save() {
    try {
      Promise.resolve(this._repository.replaceReadHistoryPages([...this._read])).catch((e) => {
        console.warn('[ReadHistory] Failed to save:', e);
      });
    } catch (e) {
      console.warn('[ReadHistory] Failed to save:', e);
    }
  }
}
