/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfigManager } from '../src/engine/ConfigManager.js';
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

  it('uses a finite fill percentage when a slider has a zero-width range', () => {
    const slider = createSlider({}, 5, 5, 5, 1, () => {});
    const input = slider.el.querySelector('input');

    expect(input.style.getPropertyValue('--gm-fill-pct')).toBe('0%');
    slider.setValue(5);
    expect(input.style.getPropertyValue('--gm-fill-pct')).toBe('0%');
  });
});
