/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChoiceMenu } from '../src/ui/ChoiceMenu.js';

describe('ChoiceMenu decorative badges', () => {
  let menu;

  beforeEach(() => {
    document.body.innerHTML = '';
    const container = document.createElement('div');
    document.body.appendChild(container);
    menu = new ChoiceMenu(container);
    globalThis.requestAnimationFrame = vi.fn();
  });

  it('renders no badge nodes without configuration', () => {
    menu.show({ options: [{ text: 'One' }, { text: 'Two' }] });
    expect(menu.el.querySelectorAll('.choice-badge')).toHaveLength(0);
  });

  it('cycles fixed A/B/C slots and keeps badges decorative', () => {
    menu.setChoiceBadgeConfig({
      a: 'ui/themes/moonlight/choices/badge-a.svg',
      b: 'ui/themes/moonlight/choices/badge-b.svg',
      c: 'ui/themes/moonlight/choices/badge-c.svg',
    });
    menu.show({
      options: [
        { text: 'One' },
        { text: 'Two' },
        { text: 'Three' },
        { text: 'Four' },
      ],
    });

    const buttons = [...menu.el.querySelectorAll('.choice-button')];
    expect(buttons.map(button => button.querySelector('.choice-badge')?.classList[1])).toEqual([
      'choice-badge-a',
      'choice-badge-b',
      'choice-badge-c',
      'choice-badge-a',
    ]);
    for (const badge of menu.el.querySelectorAll('.choice-badge')) {
      expect(badge.getAttribute('aria-hidden')).toBe('true');
    }
    expect(buttons.map(button => button.textContent)).toEqual(['One', 'Two', 'Three', 'Four']);
  });

  it('preserves fixed slot positions when only some slots are configured', () => {
    menu.setChoiceBadgeConfig({
      a: 'ui/themes/moonlight/choices/badge-a.svg',
      c: 'ui/themes/moonlight/choices/badge-c.svg',
    });
    menu.show({
      options: [{ text: 'A' }, { text: 'B' }, { text: 'C' }, { text: 'D' }],
    });

    const buttons = [...menu.el.querySelectorAll('.choice-button')];
    expect(buttons[0].querySelector('.choice-badge-a')).toBeTruthy();
    expect(buttons[1].querySelector('.choice-badge')).toBeNull();
    expect(buttons[2].querySelector('.choice-badge-c')).toBeTruthy();
    expect(buttons[3].querySelector('.choice-badge-a')).toBeTruthy();
  });

  it('resets badge configuration and does not change selection semantics', () => {
    const onSelect = vi.fn();
    menu.onSelect = onSelect;
    menu.setChoiceBadgeConfig({ a: 'ui/themes/moonlight/choices/badge-a.svg' });
    menu.setChoiceBadgeConfig(null);
    menu.show({ options: [{ text: 'Choose me' }] });

    const button = menu.el.querySelector('.choice-button');
    expect(button.querySelector('.choice-badge')).toBeNull();
    button.click();
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(0);

    menu.show({ previewOnly: true, options: [{ text: 'Preview' }] });
    menu.el.querySelector('.choice-button').click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
