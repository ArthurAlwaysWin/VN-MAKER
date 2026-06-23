import { UI_SEMANTIC_WIDGETS } from '../../shared/uiDocumentContract.js';

function defaultDefinition(type) {
  return {
    mount({ element, node }) {
      element.dataset.gmUiSemanticWidget = type;
      for (const part of UI_SEMANTIC_WIDGETS[type].requiredParts) {
        const partElement = element.ownerDocument.createElement('div');
        partElement.dataset.gmUiPart = part;
        element.appendChild(partElement);
      }
      this.update({ element, node, data: undefined });
    },
    update({ element, node, data }) {
      const first = element.querySelector('[data-gm-ui-part]');
      if (!first) return;
      const label = node.content?.text ?? node.content?.label;
      first.textContent = label ?? (Array.isArray(data) ? `${data.length} items` : '');
    },
    unmount() {},
  };
}

export function createUiSemanticWidgetHost(overrides = {}) {
  const definitions = new Map(Object.keys(UI_SEMANTIC_WIDGETS).map(type => [type, defaultDefinition(type)]));
  for (const [type, definition] of Object.entries(overrides)) {
    if (!UI_SEMANTIC_WIDGETS[type]) throw new Error(`Unknown semantic widget type: ${type}`);
    definitions.set(type, definition);
  }
  return {
    has: type => definitions.has(type),
    requiredParts: type => [...(UI_SEMANTIC_WIDGETS[type]?.requiredParts ?? [])],
    mount(type, context) { definitions.get(type)?.mount?.(context); },
    update(type, context) { definitions.get(type)?.update?.(context); },
    unmount(type, context) { definitions.get(type)?.unmount?.(context); },
  };
}
