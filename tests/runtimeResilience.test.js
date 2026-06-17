/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfigManager } from '../src/engine/ConfigManager.js';
import { EventEmitter } from '../src/engine/EventEmitter.js';
import { createSlider } from '../src/ui/widgets/SliderWidget.js';

describe('runtime resilience', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('does not throw when browser storage rejects a config save', () => {
    const manager = new ConfigManager('config-test');
    const error = new Error('quota exceeded');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw error;
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(manager.save()).toBe(false);
    expect(warn).toHaveBeenCalledWith('[ConfigManager] Failed to save config:', error);
  });

  it('rejects unknown and invalid config values', () => {
    const manager = new ConfigManager('config-test');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(manager.set('windowMode', 'fullscreen')).toBe(true);
    expect(manager.get('windowMode')).toBe('fullscreen');

    expect(manager.set('windowMode', 'floating')).toBe(false);
    expect(manager.get('windowMode')).toBe('fullscreen');

    expect(manager.set('masterVolume', 2)).toBe(false);
    expect(manager.get('masterVolume')).toBe(1);

    expect(manager.set('__proto__', { polluted: true })).toBe(false);
    expect({}.polluted).toBeUndefined();
    expect(warn).toHaveBeenCalledWith('[ConfigManager] Ignored invalid config value:', '__proto__');
  });

  it('ignores invalid persisted config values during load', () => {
    localStorage.setItem('config-test', JSON.stringify({
      windowMode: 'fullscreen',
      skipMode: 'everything',
      masterVolume: Number.NaN,
      extra: 'ignored',
    }));

    const manager = new ConfigManager('config-test');

    expect(manager.get('windowMode')).toBe('fullscreen');
    expect(manager.get('skipMode')).toBe('readOnly');
    expect(manager.get('masterVolume')).toBe(1);
    expect(manager.get('extra')).toBeUndefined();
  });

  it('uses a finite fill percentage when a slider has a zero-width range', () => {
    const slider = createSlider({}, 5, 5, 5, 1, () => {});
    const input = slider.el.querySelector('input');

    expect(input.style.getPropertyValue('--gm-fill-pct')).toBe('0%');
    slider.setValue(5);
    expect(input.style.getPropertyValue('--gm-fill-pct')).toBe('0%');
  });

  it('continues emitting to later listeners when one listener throws', () => {
    const emitter = new EventEmitter();
    const error = new Error('listener failed');
    const second = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    emitter.on('ready', () => {
      throw error;
    });
    emitter.on('ready', second);

    expect(() => emitter.emit('ready', { ok: true })).not.toThrow();
    expect(second).toHaveBeenCalledWith({ ok: true });
    expect(consoleError).toHaveBeenCalledWith('[EventEmitter] Listener for "ready" failed:', error);
  });
});
