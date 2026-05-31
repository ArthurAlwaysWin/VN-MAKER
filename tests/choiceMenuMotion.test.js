/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChoiceMenu } from '../src/ui/ChoiceMenu.js';

describe('ChoiceMenu motion baseline', () => {
  let container;
  let originalRaf;
  let rafQueue;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    originalRaf = globalThis.requestAnimationFrame;
    rafQueue = [];
    globalThis.requestAnimationFrame = vi.fn((cb) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf;
    document.body.innerHTML = '';
  });

  function flushRaf() {
    const pending = [...rafQueue];
    rafQueue = [];
    pending.forEach((cb) => cb());
  }

  it('creates stable choice classes and applies visible state during show', () => {
    const menu = new ChoiceMenu(container);

    menu.show({
      prompt: 'Choose',
      options: [{ text: 'A' }, { text: 'B' }],
    });

    expect(menu.el.classList.contains('hidden')).toBe(false);
    expect(menu.el.classList.contains('visible')).toBe(false);

    const buttons = Array.from(menu.el.querySelectorAll('.choice-button'));
    expect(buttons).toHaveLength(2);
    expect(buttons[0].style.getPropertyValue('--choice-index')).toBe('0');
    expect(buttons[1].style.getPropertyValue('--choice-index')).toBe('1');

    flushRaf();
    expect(menu.el.classList.contains('visible')).toBe(true);
  });

  it('renders prompt and option text as text content, not HTML', () => {
    const menu = new ChoiceMenu(container);

    menu.show({
      prompt: '<img src=x onerror=alert(1)>',
      options: [{ text: '<img src=x onerror=alert(1)>' }],
    });

    const prompt = menu.el.querySelector('.choice-prompt');
    const button = menu.el.querySelector('.choice-button');

    expect(prompt.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(button.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(prompt.querySelector('img')).toBeNull();
    expect(button.querySelector('img')).toBeNull();
  });

  it('resets visible before rebuilding so repeated shows can replay entrance motion', () => {
    const menu = new ChoiceMenu(container);
    menu.show({ options: [{ text: 'First' }] });
    flushRaf();
    expect(menu.el.classList.contains('visible')).toBe(true);

    menu.show({ options: [{ text: 'Second' }] });

    expect(menu.el.classList.contains('visible')).toBe(false);
    expect(menu.el.querySelector('.choice-button').textContent).toBe('Second');
  });
});
