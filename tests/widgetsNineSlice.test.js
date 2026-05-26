/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';

import { createStyledButton } from '../src/ui/widgets/ButtonWidget.js';
import { applyPanelStyle } from '../src/ui/widgets/PanelWidget.js';
import { createTabBar } from '../src/ui/widgets/TabWidget.js';

describe('widget nine-slice normalization', () => {
  it('accepts scalar insets for button and panel theme overrides', () => {
    const button = createStyledButton('Save', {
      nineSlice: { src: 'ui/button.png', slice: 12, width: 14, outset: 0 },
    });
    const panel = document.createElement('div');
    applyPanelStyle(panel, {
      nineSlice: { src: 'ui/panel.png', slice: 10 },
    });

    expect(button.querySelector('.gm-btn-nine').style.borderImage).toContain('12 12 12 12 fill');
    expect(panel.querySelector('.gm-panel-nine').style.borderImage).toContain('10 10 10 10 fill');
  });

  it('renders array insets for ribbon tabs as valid space-separated CSS', () => {
    const { el } = createTabBar(['Settings'], {
      shape: 'ribbon',
      nineSlice: { src: 'ui/tab.png', slice: [1, 2, 3, 4] },
    }, () => {});
    const overlay = el.querySelector('.gm-tab-nineslice');

    expect(overlay.style.borderImage).toContain('1 2 3 4 fill');
    expect(overlay.style.borderImage).not.toContain('1,2,3,4');
    expect(overlay.style.borderWidth).toBe('1px 2px 3px 4px');
  });
});
