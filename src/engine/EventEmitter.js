/**
 * EventEmitter — Lightweight event system for engine modules
 */
export class EventEmitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return this;
  }

  /**
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    this._listeners.get(event)?.delete(callback);
    return this;
  }

  /**
   * Emit an event to all registered listeners.
   * NOTE: Does NOT await async handlers — any returned Promise is silently discarded.
   * If you need to wait for async processing, use a different coordination mechanism
   * (e.g. gate flags, microtask queues) rather than relying on emit() return values.
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    this._listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (error) {
        console.error(`[EventEmitter] Listener for "${event}" failed:`, error);
      }
    });
  }
}
