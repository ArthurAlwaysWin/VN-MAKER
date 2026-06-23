const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getUiAccessibleName(node) {
  return String(node?.content?.accessibleName ?? node?.content?.text ?? node?.content?.label ?? '').trim();
}

export function applyUiAccessibility(element, node, onDiagnostic = () => {}) {
  const name = getUiAccessibleName(node);
  if (name) element.setAttribute('aria-label', name);
  else element.removeAttribute('aria-label');
  if (['button', 'text-input', 'confirmation'].includes(node.type) && !name) {
    onDiagnostic({ severity: 'warning', code: 'ui-accessible-name-missing', message: `Node "${node.id}" requires an accessible name.`, nodeId: node.id });
  }
  if (node.content?.modal === true || node.type === 'confirmation') {
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', 'true');
    if (!element.hasAttribute('tabindex')) element.tabIndex = -1;
  }
}

export function createUiFocusManager(root) {
  let returnFocus = null;
  let modalCleanup = null;
  const focusNode = nodeId => {
    const target = [...root.querySelectorAll('[data-gm-ui-node-id]')].find(element => element.dataset.gmUiNodeId === nodeId);
    if (!target) return false;
    const focusable = target.matches(FOCUSABLE) ? target : target.querySelector(FOCUSABLE) ?? target;
    focusable.focus();
    return true;
  };
  return {
    remember() {
      const active = root.ownerDocument.activeElement;
      if (active && !root.contains(active)) returnFocus = active;
    },
    activeNodeId() {
      return root.ownerDocument.activeElement?.closest?.('[data-gm-ui-node-id]')?.dataset.gmUiNodeId ?? null;
    },
    focusNode,
    restoreNode(nodeId) {
      if (nodeId) focusNode(nodeId);
    },
    acquire(nodeId) {
      this.remember();
      return focusNode(nodeId);
    },
    trapModal(element, { onEscape } = {}) {
      modalCleanup?.();
      this.remember();
      const onKeyDown = event => {
        if (event.key === 'Escape' && onEscape) {
          event.preventDefault();
          onEscape();
          return;
        }
        if (event.key !== 'Tab') return;
        const items = [...element.querySelectorAll(FOCUSABLE)].filter(item => !item.hidden);
        if (!items.length) { event.preventDefault(); element.focus(); return; }
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && root.ownerDocument.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && root.ownerDocument.activeElement === last) { event.preventDefault(); first.focus(); }
      };
      element.addEventListener('keydown', onKeyDown);
      (element.querySelector(FOCUSABLE) ?? element).focus();
      modalCleanup = () => element.removeEventListener('keydown', onKeyDown);
      return modalCleanup;
    },
    releaseModal() { modalCleanup?.(); modalCleanup = null; },
    restore() {
      this.releaseModal();
      if (returnFocus?.isConnected) returnFocus.focus();
      returnFocus = null;
    },
  };
}
