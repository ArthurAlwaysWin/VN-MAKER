/**
 * ConfigManager — Persists user settings (volumes, text speed, etc.)
 */
const CONFIG_SCHEMA = {
  bgmVolume: { type: 'number', min: 0, max: 1 },
  seVolume: { type: 'number', min: 0, max: 1 },
  voiceVolume: { type: 'number', min: 0, max: 1 },
  textSpeed: { type: 'number', min: 0, max: 1000 },
  autoSpeed: { type: 'number', min: 0, max: 60000 },
  fullscreen: { type: 'boolean' },
  windowMode: { type: 'enum', values: ['windowed', 'fullscreen', 'borderless'] },
  dialogueOpacity: { type: 'number', min: 0.1, max: 1 },
  masterVolume: { type: 'number', min: 0, max: 1 },
  skipMode: { type: 'enum', values: ['all', 'readOnly'] },
};

function normalizeConfigValue(key, value) {
  const schema = CONFIG_SCHEMA[key];
  if (!schema) return undefined;

  if (schema.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    if (value < schema.min || value > schema.max) return undefined;
    return value;
  }

  if (schema.type === 'boolean') {
    return typeof value === 'boolean' ? value : undefined;
  }

  if (schema.type === 'enum') {
    return schema.values.includes(value) ? value : undefined;
  }

  return undefined;
}

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
        const savedConfig = JSON.parse(raw);
        for (const [key, value] of Object.entries(savedConfig)) {
          const normalized = normalizeConfigValue(key, value);
          if (normalized !== undefined) {
            this.config[key] = normalized;
          }
        }
      }
    } catch (e) {
      console.warn('[ConfigManager] Failed to load config:', e);
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
      return true;
    } catch (e) {
      console.warn('[ConfigManager] Failed to save config:', e);
      return false;
    }
  }

  get(key) {
    return this.config[key] ?? this.defaults[key];
  }

  set(key, value) {
    const normalized = normalizeConfigValue(key, value);
    if (normalized === undefined) {
      console.warn('[ConfigManager] Ignored invalid config value:', key);
      return false;
    }
    this.config[key] = normalized;
    return this.save();
  }

  reset() {
    this.config = { ...this.defaults };
    this.save();
  }
}
