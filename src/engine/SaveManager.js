/**
 * SaveManager — Async file-system save/load via Electron IPC
 *
 * Replaces the old localStorage-based SaveManager with a 108-slot
 * file system backend accessed through IPC handlers in electron/main.js.
 * All methods are async. Includes lazy migration from legacy localStorage saves.
 */
export class SaveManager {
  constructor() {
    /** @type {number} Maximum save slots */
    this.slotCount = 108;

    /** @type {Map<number, Object>} In-memory cache of slot metadata */
    this._cache = new Map();

    /** @type {boolean} Whether migration from localStorage has been checked */
    this._migrationChecked = false;

    /** @type {number} Number of saves migrated in last _checkMigration call */
    this._lastMigrationCount = 0;

    /** @type {boolean|undefined} Whether a quicksave file exists (lazy-loaded) */
    this._hasQuickSave = undefined;

    /** @type {import('./PlayerDataRepository.js').PlayerDataRepository|null} */
    this._playerDataRepository = null;
  }

  // ─── Public API (all async) ────────────────────────────────

  /**
   * Save game state to a slot
   * @param {number} slot — slot number (1-108)
   * @param {Object} state — engine state from ScriptEngine.getState()
   * @param {string} previewText — truncated dialogue text for display
   * @param {Uint8Array|null} [thumbnail=null] — JPEG bytes from capture-screenshot
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async save(slot, state, previewText, thumbnail = null) {
    // Deep-clone to strip Vue Proxy wrappers (P11 prevention)
    const plainState = JSON.parse(JSON.stringify(state));

    // Truncate history to 50 entries (D-07, SAVE-08)
    if (plainState.history && plainState.history.length > 50) {
      plainState.history = plainState.history.slice(-50);
    }

    const result = await window.ipcRenderer.invoke('save-slot', {
      slot,
      state: plainState,
      previewText: previewText || '',
      thumbnail,
    });

    if (result.success) {
      this._cache.set(slot, {
        slot,
        previewText: previewText || '',
        sceneName: plainState.currentScene || '',
        timestamp: Date.now(),
        date: new Date().toLocaleString('zh-CN'),
        hasThumbnail: !!thumbnail,
      });
    }

    return result;
  }

  /**
   * Load game state from a slot
   * @param {number} slot
   * @returns {Promise<Object|null>} — { version, state, previewText, sceneName, timestamp, date } or null
   */
  async load(slot) {
    const result = await window.ipcRenderer.invoke('load-slot', { slot });
    if (!result.success) {
      console.error('[SaveManager] Load failed:', result.error);
      return null;
    }
    return result.data;
  }

  /**
   * Delete a save slot
   * @param {number} slot
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async delete(slot) {
    const result = await window.ipcRenderer.invoke('delete-slot', { slot });
    if (result.success) {
      this._cache.delete(slot);
    }
    return result;
  }

  /**
   * Get all save slot metadata — single IPC call (P15 prevention)
   * Triggers lazy migration on first call.
   * @returns {Promise<Array<Object>>}
   */
  async getAllSlots() {
    if (!this._migrationChecked) {
      await this._checkMigration();
    }

    const result = await window.ipcRenderer.invoke('list-saves');
    if (!result.success) {
      console.error('[SaveManager] list-saves failed:', result.error);
      return [];
    }

    // Rebuild cache from fresh data
    this._cache.clear();
    for (const slot of result.data) {
      this._cache.set(slot.slot, slot);
    }

    return result.data;
  }

  /**
   * Check if any saves exist — for "继续游戏" button on title screen
   * @returns {Promise<boolean>}
   */
  async hasAnySave() {
    const slots = await this.getAllSlots();
    return slots.length > 0;
  }

  // ─── Quicksave API (D-10, D-11, D-12) ────────────────────

  /**
   * Save game state to the quicksave slot (always overwrites — D-11)
   * @param {Object} state — engine state from ScriptEngine.getState()
   * @param {string} previewText — truncated dialogue text for display
   * @param {Uint8Array|null} [thumbnail=null] — JPEG bytes from capture-screenshot
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async quickSave(state, previewText, thumbnail = null) {
    // Deep-clone to strip Vue Proxy wrappers (same as save())
    const plainState = JSON.parse(JSON.stringify(state));

    // Truncate history to 50 entries (same as save())
    if (plainState.history && plainState.history.length > 50) {
      plainState.history = plainState.history.slice(-50);
    }

    const result = await window.ipcRenderer.invoke('save-quickslot', {
      state: plainState,
      previewText: previewText || '',
      thumbnail,
    });

    if (result.success) {
      this._hasQuickSave = true;
    }

    return result;
  }

  /**
   * Load game state from the quicksave slot
   * @returns {Promise<Object|null>} — { version, state, previewText, ... } or null
   */
  async quickLoad() {
    const result = await window.ipcRenderer.invoke('load-quickslot');
    if (!result.success) {
      console.error('[SaveManager] Quick load failed:', result.error);
      return null;
    }
    return result.data;
  }

  /**
   * Check if a quicksave exists — used for quickload button state (D-13)
   * @returns {Promise<boolean>}
   */
  async hasQuickSave() {
    if (this._hasQuickSave !== undefined) return this._hasQuickSave;
    const result = await window.ipcRenderer.invoke('load-quickslot');
    this._hasQuickSave = result.success && result.data !== null;
    return this._hasQuickSave;
  }

  setPlayerDataRepository(repository) {
    this._playerDataRepository = repository;
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

  // ─── Legacy Migration (D-09, D-10, SAVE-05) ───────────────

  /**
   * Check for and migrate legacy localStorage saves on first call.
   * Reads old keys `galgame-maker_save_0` through `_save_7`, sends to
   * main process via migrate-legacy-saves IPC, sets markers.
   * @returns {Promise<number>} Number of saves migrated (0 if already done)
   * @private
   */
  async _checkMigration() {
    this._migrationChecked = true;

    // Skip if no IPC available (iframe preview — D-13)
    if (!window.ipcRenderer) return 0;

    // Skip if already migrated (renderer-side flag)
    if (localStorage.getItem('galgame-maker_migrated')) return 0;

    // Collect old saves from localStorage
    const oldSaves = [];
    for (let i = 0; i < 8; i++) {
      const key = `galgame-maker_save_${i}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          oldSaves.push({ slot: i, data: JSON.parse(raw) });
        } catch {
          // Skip corrupt entries
        }
      }
    }

    if (oldSaves.length === 0) {
      // No old saves — mark as checked so we don't re-read localStorage
      localStorage.setItem('galgame-maker_migrated', '1');
      return 0;
    }

    // Send to main process for file writing
    const result = await window.ipcRenderer.invoke('migrate-legacy-saves', {
      saves: oldSaves,
    });

    if (result.success) {
      // Set renderer-side flag to avoid re-reading localStorage
      localStorage.setItem('galgame-maker_migrated', '1');
      console.log(`[SaveManager] Migrated ${result.migrated} legacy saves`);
      this._lastMigrationCount = result.migrated;
      return result.migrated;
    }

    console.error('[SaveManager] Migration failed:', result.error);
    return 0;
  }
}
