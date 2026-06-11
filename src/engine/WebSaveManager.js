/**
 * WebSaveManager — IndexedDB-based save/load for standalone Web mode.
 *
 * Drop-in replacement for SaveManager with identical async public API.
 * Uses IndexedDB instead of Electron IPC. 108 regular slots + 1 quicksave.
 * Stores thumbnail data URLs in Web mode so exported games can show save previews.
 *
 * Per D-01: IndexedDB backend, 108 slots + 1 quicksave, matching Electron version.
 */
function normalizeThumbnail(thumbnail) {
  if (typeof thumbnail !== 'string') return null;
  const trimmed = thumbnail.trim();
  return /^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(trimmed) ? trimmed : null;
}

export class WebSaveManager {
  constructor(projectId = null) {
    /** @type {number} Maximum save slots */
    this.slotCount = 108;

    /** @type {string|null} Stable project namespace for browser saves */
    this._projectId = null;

    /** @type {IDBDatabase|null} */
    this._db = null;

    /** @type {Map<number|string, Object>} In-memory cache */
    this._cache = new Map();

    /** @type {boolean|undefined} Quick save existence (lazy) */
    this._hasQuickSave = undefined;

    /** @type {number} Compat with SaveManager */
    this._lastMigrationCount = 0;

    /** @type {import('./PlayerDataRepository.js').PlayerDataRepository|null} */
    this._playerDataRepository = null;

    if (projectId) {
      this.setProjectId(projectId);
    }
  }

  // ─── Public API (all async) ────────────────────────────────

  /**
   * Save game state to a slot
   * @param {number} slot — slot number (1-108)
   * @param {Object} state — engine state from ScriptEngine.getState()
   * @param {string} previewText — truncated dialogue text for display
   * @param {string|null} [thumbnail=null] — data URL thumbnail from Web screenshot capture
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async save(slot, state, previewText, thumbnail = null) {
    // Deep-clone to strip Vue Proxy wrappers
    const plainState = JSON.parse(JSON.stringify(state));

    // Truncate history to 50 entries
    if (plainState.history?.length > 50) {
      plainState.history = plainState.history.slice(-50);
    }

    const sceneName = plainState.currentScene || '';
    const timestamp = Date.now();
    const date = new Date().toLocaleString('zh-CN');
    const thumbnailData = normalizeThumbnail(thumbnail);

    const record = {
      slot,
      version: 1,
      state: plainState,
      previewText: previewText || '',
      sceneName,
      timestamp,
      date,
      thumbnail: thumbnailData,
      hasThumbnail: !!thumbnailData,
    };

    try {
      const db = await this._getDb();
      await this._put(db, 'saves', record);
      this._cache.set(slot, {
        slot,
        previewText: previewText || '',
        sceneName,
        timestamp,
        date,
        thumbnail: thumbnailData,
        hasThumbnail: !!thumbnailData,
      });
      return { success: true };
    } catch (e) {
      console.error('[WebSaveManager] Save failed:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Load game state from a slot
   * @param {number} slot
   * @returns {Promise<Object|null>} — { version, state, previewText, sceneName, timestamp, date } or null
   */
  async load(slot) {
    try {
      const db = await this._getDb();
      const record = await this._get(db, 'saves', slot);
      if (!record) {
        console.error('[WebSaveManager] Slot not found:', slot);
        return null;
      }
      const thumbnail = normalizeThumbnail(record.thumbnail);
      return {
        version: record.version,
        state: record.state,
        previewText: record.previewText,
        sceneName: record.sceneName,
        timestamp: record.timestamp,
        date: record.date,
        thumbnail,
        hasThumbnail: !!thumbnail,
      };
    } catch (e) {
      console.error('[WebSaveManager] Load failed:', e.message);
      return null;
    }
  }

  /**
   * Delete a save slot
   * @param {number} slot
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async delete(slot) {
    try {
      const db = await this._getDb();
      await this._delete(db, 'saves', slot);
      this._cache.delete(slot);
      return { success: true };
    } catch (e) {
      console.error('[WebSaveManager] Delete failed:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Get all save slot metadata — excludes quicksave record
   * @returns {Promise<Array<Object>>}
   */
  async getAllSlots() {
    try {
      const db = await this._getDb();
      const all = await this._getAll(db, 'saves');

      // Filter out quicksave record
      const regular = all.filter(r => r.slot !== 'quick');

      // Rebuild cache from fresh data
      this._cache.clear();
      for (const r of regular) {
        const thumbnail = normalizeThumbnail(r.thumbnail);
        this._cache.set(r.slot, {
          slot: r.slot,
          previewText: r.previewText,
          sceneName: r.sceneName,
          timestamp: r.timestamp,
          date: r.date,
          thumbnail,
          hasThumbnail: !!thumbnail,
        });
      }

      return regular.map((r) => {
        const thumbnail = normalizeThumbnail(r.thumbnail);
        return {
          slot: r.slot,
          previewText: r.previewText,
          sceneName: r.sceneName,
          timestamp: r.timestamp,
          date: r.date,
          thumbnail,
          hasThumbnail: !!thumbnail,
        };
      });
    } catch (e) {
      console.error('[WebSaveManager] getAllSlots failed:', e.message);
      return [];
    }
  }

  /**
   * Check if any saves exist — for "继续游戏" button on title screen
   * @returns {Promise<boolean>}
   */
  async hasAnySave() {
    const slots = await this.getAllSlots();
    return slots.length > 0;
  }

  // ─── Quicksave API ─────────────────────────────────────────

  /**
   * Save game state to the quicksave slot (always overwrites)
   * @param {Object} state — engine state from ScriptEngine.getState()
   * @param {string} previewText — truncated dialogue text for display
   * @param {string|null} [thumbnail=null] — data URL thumbnail from Web screenshot capture
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async quickSave(state, previewText, thumbnail = null) {
    // Deep-clone to strip Vue Proxy wrappers
    const plainState = JSON.parse(JSON.stringify(state));

    // Truncate history to 50 entries
    if (plainState.history?.length > 50) {
      plainState.history = plainState.history.slice(-50);
    }

    const sceneName = plainState.currentScene || '';
    const timestamp = Date.now();
    const date = new Date().toLocaleString('zh-CN');
    const thumbnailData = normalizeThumbnail(thumbnail);

    const record = {
      slot: 'quick',
      version: 1,
      state: plainState,
      previewText: previewText || '',
      sceneName,
      timestamp,
      date,
      thumbnail: thumbnailData,
      hasThumbnail: !!thumbnailData,
    };

    try {
      const db = await this._getDb();
      await this._put(db, 'saves', record);
      this._hasQuickSave = true;
      return { success: true };
    } catch (e) {
      console.error('[WebSaveManager] Quick save failed:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Load game state from the quicksave slot
   * @returns {Promise<Object|null>} — { version, state, previewText, ... } or null
   */
  async quickLoad() {
    try {
      const db = await this._getDb();
      const record = await this._get(db, 'saves', 'quick');
      if (!record) {
        console.error('[WebSaveManager] No quicksave found');
        return null;
      }
      const thumbnail = normalizeThumbnail(record.thumbnail);
      return {
        version: record.version,
        state: record.state,
        previewText: record.previewText,
        sceneName: record.sceneName,
        timestamp: record.timestamp,
        date: record.date,
        thumbnail,
        hasThumbnail: !!thumbnail,
      };
    } catch (e) {
      console.error('[WebSaveManager] Quick load failed:', e.message);
      return null;
    }
  }

  /**
   * Check if a quicksave exists — used for quickload button state
   * @returns {Promise<boolean>}
   */
  async hasQuickSave() {
    if (this._hasQuickSave !== undefined) return this._hasQuickSave;
    try {
      const db = await this._getDb();
      const record = await this._get(db, 'saves', 'quick');
      this._hasQuickSave = record !== null;
      return this._hasQuickSave;
    } catch (e) {
      console.error('[WebSaveManager] hasQuickSave failed:', e.message);
      this._hasQuickSave = false;
      return false;
    }
  }

  setPlayerDataRepository(repository) {
    this._playerDataRepository = repository;
  }

  setProjectId(projectId) {
    if (typeof projectId !== 'string' || !projectId.trim()) {
      throw new Error('WebSaveManager requires a stable projectId');
    }

    const normalizedProjectId = projectId.trim();
    if (this._projectId === normalizedProjectId) {
      return;
    }

    this._db?.close?.();
    this._db = null;
    this._cache.clear();
    this._hasQuickSave = undefined;
    this._projectId = normalizedProjectId;
  }

  async resetPlayerData(scope) {
    if (!this._playerDataRepository) {
      return { success: false, error: 'No player data repository configured' };
    }

    return this._playerDataRepository.reset(scope);
  }

  async rebuildPlayerData() {
    if (!this._playerDataRepository) {
      return { success: false, error: 'No player data repository configured' };
    }

    return this._playerDataRepository.rebuild();
  }

  async _clearAllSaves() {
    try {
      const db = await this._getDb();
      await this._clear(db, 'saves');
      this._cache.clear();
      this._hasQuickSave = false;
      return { success: true };
    } catch (e) {
      console.error('[WebSaveManager] Clear saves failed:', e.message);
      return { success: false, error: e.message };
    }
  }

  // ─── Private Helpers ───────────────────────────────────────

  /**
   * Open or return cached IndexedDB database
   * @returns {Promise<IDBDatabase>}
   * @private
   */
  async _getDb() {
    if (this._db) return this._db;
    if (!this._projectId) {
      throw new Error('WebSaveManager projectId has not been configured');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`galgame-saves:${this._projectId}`, 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'slot' });
        }
      };

      request.onsuccess = (e) => {
        this._db = e.target.result;
        resolve(this._db);
      };

      request.onerror = (e) => {
        reject(new Error(`IndexedDB open failed: ${e.target.error?.message || 'unknown'}`));
      };
    });
  }

  /**
   * Put a record into an object store
   * @param {IDBDatabase} db
   * @param {string} storeName
   * @param {Object} record
   * @returns {Promise<void>}
   * @private
   */
  _put(db, storeName, record) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(new Error(`put failed: ${e.target.error?.message || 'unknown'}`));
    });
  }

  /**
   * Get a record from an object store by key
   * @param {IDBDatabase} db
   * @param {string} storeName
   * @param {*} key
   * @returns {Promise<Object|null>}
   * @private
   */
  _get(db, storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(new Error(`get failed: ${e.target.error?.message || 'unknown'}`));
    });
  }

  /**
   * Delete a record from an object store by key
   * @param {IDBDatabase} db
   * @param {string} storeName
   * @param {*} key
   * @returns {Promise<void>}
   * @private
   */
  _delete(db, storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(new Error(`delete failed: ${e.target.error?.message || 'unknown'}`));
    });
  }

  /**
   * Get all records from an object store
   * @param {IDBDatabase} db
   * @param {string} storeName
   * @returns {Promise<Array>}
   * @private
   */
  _getAll(db, storeName) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(new Error(`getAll failed: ${e.target.error?.message || 'unknown'}`));
    });
  }

  _clear(db, storeName) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(new Error(`clear failed: ${e.target.error?.message || 'unknown'}`));
    });
  }
}
