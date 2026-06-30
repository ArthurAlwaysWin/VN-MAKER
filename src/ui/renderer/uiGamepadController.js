const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibleFocusableElements(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter(element => (
    !element.hidden
    && element.getAttribute('aria-hidden') !== 'true'
    && element.closest('[hidden]') === null
  ));
}

function pressed(gamepad, index) {
  return Boolean(gamepad?.buttons?.[index]?.pressed);
}

export function createUiGamepadController(root, { onBack = () => {} } = {}) {
  let frameId = null;
  let previous = new Set();

  const move = delta => {
    const items = visibleFocusableElements(root);
    if (!items.length) return false;
    const active = root.ownerDocument.activeElement;
    const index = items.indexOf(active);
    const nextIndex = index < 0
      ? (delta > 0 ? 0 : items.length - 1)
      : (index + delta + items.length) % items.length;
    items[nextIndex].focus();
    return true;
  };

  const update = gamepad => {
    const current = new Set();
    const axisX = Number(gamepad?.axes?.[0] ?? 0);
    const axisY = Number(gamepad?.axes?.[1] ?? 0);
    if (pressed(gamepad, 12) || pressed(gamepad, 14) || axisX < -0.6 || axisY < -0.6) current.add('previous');
    if (pressed(gamepad, 13) || pressed(gamepad, 15) || axisX > 0.6 || axisY > 0.6) current.add('next');
    if (pressed(gamepad, 0)) current.add('activate');
    if (pressed(gamepad, 1)) current.add('back');

    for (const action of current) {
      if (previous.has(action)) continue;
      if (action === 'previous') move(-1);
      if (action === 'next') move(1);
      if (action === 'activate') root.ownerDocument.activeElement?.click?.();
      if (action === 'back') onBack();
    }
    previous = current;
  };

  const tick = () => {
    const gamepads = root.ownerDocument.defaultView?.navigator?.getGamepads?.() ?? [];
    update([...gamepads].find(Boolean) ?? null);
    frameId = root.ownerDocument.defaultView?.requestAnimationFrame?.(tick) ?? null;
  };

  return {
    move,
    update,
    start() {
      if (frameId !== null || typeof root.ownerDocument.defaultView?.navigator?.getGamepads !== 'function') return;
      frameId = root.ownerDocument.defaultView?.requestAnimationFrame?.(tick) ?? null;
    },
    stop() {
      if (frameId !== null) root.ownerDocument.defaultView?.cancelAnimationFrame?.(frameId);
      frameId = null;
      previous = new Set();
    },
  };
}
