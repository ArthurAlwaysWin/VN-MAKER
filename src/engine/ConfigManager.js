/**
 * ConfigManager — Persists user settings (volumes, text speed, etc.)
 */
export class ConfigManager {
  constructor(storageKey = 'galgame-maker-config') {
    this.storageKey = storageKey;

    /** @type {Object} Default config */
    this.defaults = {
      bgmVolume: 0.5,
      seVolume: 0.8,
      voiceVolume: 0.8,     // 0–1, voice channel volume
      textSpeed: 30,        // ms per character
      autoSpeed: 2000,      // ms wait after line completes in auto mode
      fullscreen: false,        // deprecated, kept for backward compat
      windowMode: 'windowed',   // 'windowed' | 'fullscreen' | 'borderless'
      dialogueOpacity: 0.8, // 0.1–1, dialogue box background alpha
      masterVolume: 1,      // 0–1, scales bgmVolume & seVolume proportionally
      skipMode: 'readOnly',     // 'all' | 'readOnly' — skip mode preference
    };

    this.config = { ...this.defaults };
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        Object.assign(this.config, JSON.parse(raw));
      }
    } catch (e) {
      console.warn('[ConfigManager] Failed to load config:', e);
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.config));
  }

  get(key) {
    return this.config[key] ?? this.defaults[key];
  }

  set(key, value) {
    this.config[key] = value;
    this.save();
  }

  reset() {
    this.config = { ...this.defaults };
    this.save();
  }
}
