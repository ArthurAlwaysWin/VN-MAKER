/**
 * SaveManager — Handles save/load game state to localStorage
 */
export class SaveManager {
  /**
   * @param {string} gameId — unique game identifier for localStorage namespace
   */
  constructor(gameId = 'galgame-maker') {
    this.gameId = gameId;
    this.slotCount = 8;
  }

  _key(slot) {
    return `${this.gameId}_save_${slot}`;
  }

  /**
   * Save game state to a slot
   * @param {number} slot — slot index (0-7)
   * @param {Object} state — engine state from ScriptEngine.getState()
   * @param {string} [previewText] — preview text for the save slot display
   */
  save(slot, state, previewText = '') {
    const data = {
      state,
      previewText,
      timestamp: Date.now(),
      date: new Date().toLocaleString('zh-CN'),
    };
    localStorage.setItem(this._key(slot), JSON.stringify(data));
  }

  /**
   * Load game state from a slot
   * @param {number} slot
   * @returns {Object|null} — { state, previewText, timestamp, date } or null
   */
  load(slot) {
    const raw = localStorage.getItem(this._key(slot));
    return raw ? JSON.parse(raw) : null;
  }

  /**
   * Delete a save slot
   * @param {number} slot
   */
  delete(slot) {
    localStorage.removeItem(this._key(slot));
  }

  /**
   * Get all save slots info (for display)
   * @returns {Array<Object|null>}
   */
  getAllSlots() {
    const slots = [];
    for (let i = 0; i < this.slotCount; i++) {
      slots.push(this.load(i));
    }
    return slots;
  }

  /**
   * Check if any saves exist (for "Continue" button on title)
   */
  hasAnySave() {
    for (let i = 0; i < this.slotCount; i++) {
      if (localStorage.getItem(this._key(i))) return true;
    }
    return false;
  }
}
