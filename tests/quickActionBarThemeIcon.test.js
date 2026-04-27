/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: vi.fn((value) => `resolved:${value}`),
}));

import { QuickActionBar } from '../src/ui/QuickActionBar.js';

describe('QuickActionBar theme icon rendering', () => {
  let container;
  let quickBar;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    quickBar = new QuickActionBar(container);
  });

  it('renders the themed qab icon on all 8 buttons when configured', () => {
    quickBar.setThemeIcons({ qab: 'ui/icons/qab.png' });

    const buttons = quickBar.el.querySelectorAll('.qab-btn');
    expect(buttons).toHaveLength(8);
    expect(quickBar.el.querySelectorAll('.qab-btn img.qab-theme-icon')).toHaveLength(8);
    expect(quickBar.el.querySelectorAll('.qab-btn svg')).toHaveLength(0);
    expect(quickBar.el.innerHTML).toContain('resolved:ui/icons/qab.png');
  });

  it('keeps the default SVG, active, and disabled behavior when the qab slot is empty', () => {
    quickBar.setAutoActive(true);
    quickBar.setQuickLoadEnabled(false);
    quickBar.setThemeIcons(null);

    expect(quickBar.el.querySelectorAll('.qab-btn svg')).toHaveLength(8);
    expect(quickBar.el.querySelectorAll('.qab-btn img')).toHaveLength(0);
    expect(quickBar.el.querySelector('[data-action="auto"]').classList.contains('active')).toBe(true);
    expect(quickBar.el.querySelector('[data-action="quickload"]').classList.contains('disabled')).toBe(true);
  });

  it('restores the default SVG set when themed icons are cleared after rendering', () => {
    quickBar.setThemeIcons({ qab: 'ui/icons/qab.png' });
    expect(quickBar.el.querySelectorAll('.qab-btn img.qab-theme-icon')).toHaveLength(8);

    quickBar.setThemeIcons({});

    expect(quickBar.el.querySelectorAll('.qab-btn svg')).toHaveLength(8);
    expect(quickBar.el.querySelectorAll('.qab-btn img')).toHaveLength(0);
  });

  it('falls back to the built-in SVG icons when themed qab assets fail to load', () => {
    quickBar.setThemeIcons({ qab: 'ui/icons/qab.png' });

    const icons = Array.from(quickBar.el.querySelectorAll('.qab-btn img.qab-theme-icon'));
    expect(icons).toHaveLength(8);

    icons.forEach((icon) => {
      icon.dispatchEvent(new Event('error'));
    });

    expect(quickBar.el.querySelectorAll('.qab-btn img')).toHaveLength(0);
    expect(quickBar.el.querySelectorAll('.qab-btn svg')).toHaveLength(8);
  });
});
