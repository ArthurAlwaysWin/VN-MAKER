/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/engine/assetPath.js', () => ({
  resolvePath: vi.fn((value) => `resolved:${value}`),
}));

import { applyButtonFamilies, resetButtonFamilies } from '../src/engine/ThemeManager.js';
import { QuickActionBar } from '../src/ui/QuickActionBar.js';

describe('QuickActionBar button-family semantics', () => {
  let container;
  let quickBar;

  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    quickBar = new QuickActionBar(container);
  });

  it('keeps active and disabled classes plus SVG icons while using button-family underlay CSS', () => {
    quickBar.setAutoActive(true);
    quickBar.setQuickLoadEnabled(false);

    applyButtonFamilies({
      buttonFamilies: {
        qab: {
          normal: 'ui/buttons/qab-normal.webp',
          hover: 'ui/buttons/qab-hover.webp',
          pressed: 'ui/buttons/qab-pressed.webp',
        },
      },
    });

    const buttons = quickBar.el.querySelectorAll('.qab-btn');
    expect(buttons).toHaveLength(8);
    expect(quickBar.el.querySelector('[data-action="auto"]').classList.contains('active')).toBe(true);
    expect(quickBar.el.querySelector('[data-action="quickload"]').classList.contains('disabled')).toBe(true);
    expect(quickBar.el.querySelectorAll('.qab-btn svg')).toHaveLength(8);

    const css = document.getElementById('galgame-button-families')?.textContent ?? '';
    expect(css).toContain('.qab-btn::before {');
    expect(css).toContain('.qab-btn:hover::before {');
    expect(css).toContain('.qab-btn:active::before {');

    resetButtonFamilies();
  });

  it('keeps button-family underlay and click delegation intact when using themed qab icons', () => {
    const onAuto = vi.fn();
    quickBar.onAuto = onAuto;
    quickBar.setThemeIcons({ qab: 'ui/icons/qab.png' });

    applyButtonFamilies({
      buttonFamilies: {
        qab: {
          normal: 'ui/buttons/qab-normal.webp',
          hover: 'ui/buttons/qab-hover.webp',
          pressed: 'ui/buttons/qab-pressed.webp',
        },
      },
    });

    const autoBtn = quickBar.el.querySelector('[data-action="auto"]');
    const icon = autoBtn.querySelector('img.qab-theme-icon');
    expect(icon).not.toBeNull();
    expect(autoBtn.classList.contains('qab-btn')).toBe(true);

    const wrapperClick = vi.fn();
    container.addEventListener('click', wrapperClick);
    icon.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onAuto).toHaveBeenCalledOnce();
    expect(wrapperClick).not.toHaveBeenCalled();

    const css = document.getElementById('galgame-button-families')?.textContent ?? '';
    expect(css).toContain('.qab-btn::before {');

    resetButtonFamilies();
  });
});
