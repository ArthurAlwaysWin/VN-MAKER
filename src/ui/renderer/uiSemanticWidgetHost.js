import { UI_SEMANTIC_WIDGETS } from '../../shared/uiDocumentContract.js';

function defaultDefinition(type) {
  if (type === 'settings-group') return {
    mount({ element }) {
      element.dataset.gmUiSemanticWidget = type;
      element.dataset.gmUiPart = 'controls';
    },
    update({ element, node, document }) {
      const groups = (document?.nodes ?? []).filter(candidate => candidate.type === 'settings-group');
      const firstGroup = groups.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))[0];
      element.hidden = document?.behavior?.mode === 'tabbed' && node.id !== firstGroup?.id;
      element.style.display = element.hidden ? 'none' : 'grid';
      element.style.gridTemplateColumns = `repeat(${node.content?.columns === 2 ? 2 : 1}, minmax(0, 1fr))`;
      element.style.gap = '8px';
      element.style.overflowY = 'auto';
    },
    unmount() {},
  };
  if (type === 'settings-control') return {
    mount({ element }) {
      element.dataset.gmUiSemanticWidget = type;
      element.dataset.gmUiPart = 'control';
    },
    update({ element, node }) {
      element.style.position = 'relative';
      element.style.left = 'auto';
      element.style.top = 'auto';
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      element.style.width = 'auto';
      element.style.height = 'auto';
      element.style.transform = 'none';
      element.style.padding = '10px';
      element.textContent = node.content?.label ?? node.content?.settingId ?? '';
    },
    unmount() {},
  };
  if (type === 'tab-bar') return {
    mount({ element }) {
      element.dataset.gmUiSemanticWidget = type;
      element.dataset.gmUiPart = 'tabs';
    },
    update({ element, node, document, host }) {
      element.replaceChildren();
      element.hidden = (document?.behavior?.mode ?? node.content?.mode) === 'single-page';
      element.style.display = element.hidden ? 'none' : 'flex';
      for (const [index, tab] of (node.content?.tabs ?? []).entries()) {
        const button = element.ownerDocument.createElement('button');
        button.type = 'button';
        button.textContent = tab.label ?? `Tab ${index + 1}`;
        button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
        button.addEventListener('click', () => {
          for (const candidate of element.querySelectorAll('button')) candidate.setAttribute('aria-selected', candidate === button ? 'true' : 'false');
          for (const group of host.renderer.root.querySelectorAll('[data-gm-ui-node-type="settings-group"]')) {
            const active = group.dataset.gmUiNodeId === tab.groupId;
            group.hidden = !active;
            group.style.display = active ? 'grid' : 'none';
          }
        });
        element.appendChild(button);
      }
    },
    unmount() {},
  };
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
      const label = node.content?.text ?? node.content?.label ?? node.content?.settingId;
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
