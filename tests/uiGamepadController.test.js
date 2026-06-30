/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { createUiGamepadController } from '../src/ui/renderer/uiGamepadController.js';

function gamepad(buttonIndexes = [], axes = [0, 0]) {
  return {
    axes,
    buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: buttonIndexes.includes(index) })),
  };
}

describe('shared UI gamepad controller', () => {
  it('navigates, activates, goes back, and debounces held buttons', () => {
    document.body.innerHTML = '<div id="root"><button id="one">One</button><button id="two">Two</button></div>';
    const root = document.getElementById('root');
    const onBack = vi.fn();
    const onActivate = vi.fn();
    document.getElementById('two').addEventListener('click', onActivate);
    const controller = createUiGamepadController(root, { onBack });

    controller.update(gamepad([13]));
    expect(document.activeElement.id).toBe('one');
    controller.update(gamepad());
    controller.update(gamepad([13]));
    expect(document.activeElement.id).toBe('two');
    controller.update(gamepad());
    controller.update(gamepad([0]));
    controller.update(gamepad([0]));
    expect(onActivate).toHaveBeenCalledTimes(1);
    controller.update(gamepad());
    controller.update(gamepad([1]));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('wraps navigation and ignores hidden or disabled controls', () => {
    document.body.innerHTML = '<div id="root"><button id="one">One</button><button disabled>Disabled</button><button id="hidden" hidden>Hidden</button><button id="two">Two</button></div>';
    const root = document.getElementById('root');
    const controller = createUiGamepadController(root);
    document.getElementById('one').focus();
    controller.update(gamepad([12]));
    expect(document.activeElement.id).toBe('two');
  });
});
