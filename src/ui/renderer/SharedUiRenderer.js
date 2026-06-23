import { normalizeUiDocument, UI_PRIMITIVE_WIDGETS, UI_SEMANTIC_WIDGETS, validateUiDocument } from '../../shared/uiDocumentContract.js';
import { applyUiAccessibility, createUiFocusManager } from './uiFocusManager.js';
import { applyUiNodeStyle, resolveUiNodeStyle } from './uiStyleResolver.js';

const ELEMENTS = Object.freeze({ panel: 'div', stack: 'div', grid: 'div', text: 'p', image: 'img', button: 'button', spacer: 'div', slot: 'div' });

function setPixels(style, property, value) {
  style[property] = typeof value === 'number' ? `${value}px` : value === null || value === undefined ? '' : String(value);
}

function applyLayout(element, layout, isRoot) {
  const { anchor, pivot, offset, size, constraints, padding, align } = layout;
  element.style.position = isRoot ? 'relative' : 'absolute';
  if (isRoot) {
    element.style.width = '100%';
    element.style.height = '100%';
  } else {
    element.style.left = `calc(${anchor.minX * 100}% + ${offset.x}px)`;
    element.style.top = `calc(${anchor.minY * 100}% + ${offset.y}px)`;
    element.style.right = anchor.maxX > anchor.minX ? `${(1 - anchor.maxX) * 100}%` : '';
    element.style.bottom = anchor.maxY > anchor.minY ? `${(1 - anchor.maxY) * 100}%` : '';
    setPixels(element.style, 'width', size.width);
    setPixels(element.style, 'height', size.height);
    element.style.transform = pivot.x || pivot.y ? `translate(${-pivot.x * 100}%, ${-pivot.y * 100}%)` : '';
  }
  setPixels(element.style, 'minWidth', constraints.minWidth);
  setPixels(element.style, 'minHeight', constraints.minHeight);
  setPixels(element.style, 'maxWidth', constraints.maxWidth);
  setPixels(element.style, 'maxHeight', constraints.maxHeight);
  element.style.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
  element.style.justifySelf = align.horizontal;
  element.style.alignSelf = align.vertical;
}

function createElement(node, ownerDocument) {
  const tag = ELEMENTS[node.type] ?? 'div';
  const element = ownerDocument.createElement(tag);
  if (tag === 'button') element.type = 'button';
  element.dataset.gmUiNodeId = node.id;
  element.dataset.gmUiNodeType = node.type;
  return element;
}

function renderPrimitiveContent(element, node, resolveAssetUrl) {
  if (node.type === 'image') {
    const source = node.asset?.path ?? node.asset?.id;
    if (source) element.src = resolveAssetUrl(source, node.asset);
    element.alt = node.content?.alt ?? node.content?.accessibleName ?? '';
    element.style.objectFit = node.style?.objectFit ?? 'contain';
    return;
  }
  if (node.asset?.kind === 'image') {
    const source = node.asset.path ?? node.asset.id;
    if (source) {
      element.style.backgroundImage = `url("${resolveAssetUrl(source, node.asset)}")`;
      element.style.backgroundSize = node.content?.backgroundSize ?? 'cover';
      element.style.backgroundPosition = node.content?.backgroundPosition ?? 'center';
    }
  } else {
    element.style.backgroundImage = '';
    element.style.backgroundSize = '';
    element.style.backgroundPosition = '';
  }
  if (['text', 'button'].includes(node.type)) element.textContent = node.content?.text ?? '';
}

export class SharedUiRenderer {
  constructor(container, host) {
    if (!container?.ownerDocument) throw new Error('SharedUiRenderer requires a DOM container.');
    this.container = container;
    this.host = host;
    this.root = container.ownerDocument.createElement('div');
    this.root.dataset.gmUiRenderer = 'shared';
    this.root.dataset.gmUiHostMode = host.mode;
    this.root.style.position = 'relative';
    this.root.style.width = '100%';
    this.root.style.height = '100%';
    this.container.appendChild(this.root);
    this.focus = createUiFocusManager(this.root);
    this.entries = new Map();
    this.document = null;
  }

  mount(document, options = {}) {
    if (!this.root.isConnected) this.container.appendChild(this.root);
    this.focus.remember();
    return this.#render(document, options, 'mount');
  }

  update(document, options = {}) {
    return this.#render(document, options, 'update');
  }

  #render(input, options, operation) {
    const started = performance.now();
    const document = normalizeUiDocument(input);
    const diagnostics = validateUiDocument(document, { screenId: document?.id, kind: document?.kind });
    diagnostics.forEach(this.host.reportDiagnostic);
    if (diagnostics.some(item => item.severity === 'error')) return { diagnostics, measurements: this.host.measurements };

    const focusedNodeId = this.focus.activeNodeId();
    const nextIds = new Set(document.nodes.map(node => node.id));
    for (const [id, entry] of this.entries) if (!nextIds.has(id)) this.#removeEntry(id, entry);

    const byId = new Map(document.nodes.map(node => [node.id, node]));
    for (const node of document.nodes) {
      let entry = this.entries.get(node.id);
      if (entry && entry.node.type !== node.type) {
        this.#removeEntry(node.id, entry);
        entry = null;
      }
      if (!entry) {
        const element = createElement(node, this.root.ownerDocument);
        entry = { element, node, cleanups: [], semanticMounted: false, state: 'default', lifecycle: new AbortController(), updateLifecycle: null };
        this.entries.set(node.id, entry);
      }
      this.#updateEntry(entry, node, options);
    }

    for (const node of document.nodes) {
      const entry = this.entries.get(node.id);
      const parent = node.parentId ? this.entries.get(node.parentId)?.element : this.root;
      if (entry.element.parentElement !== parent || entry.element !== parent.lastElementChild) parent.appendChild(entry.element);
    }

    this.root.dataset.gmUiDocumentId = document.id;
    this.root.dataset.gmUiDocumentKind = document.kind;
    this.root.style.aspectRatio = `${document.viewport.width} / ${document.viewport.height}`;
    this.document = document;
    this.focus.restoreNode(focusedNodeId);

    const modal = document.nodes.find(node => node.type === 'confirmation' || node.content?.modal === true);
    if (modal) this.focus.trapModal(this.entries.get(modal.id).element, {
      onEscape: () => modal.content?.cancelAction && this.host.actionRouter.dispatch(modal.content.cancelAction, { nodeId: modal.id }),
    });
    else this.focus.releaseModal();
    if (options.acquireFocusNodeId) this.focus.acquire(options.acquireFocusNodeId);

    const elapsedMs = performance.now() - started;
    this.host.recordMeasurement({ operation, elapsedMs, snapshotBytes: JSON.stringify(document).length, nodeCount: document.nodes.length });
    return { diagnostics, measurements: this.host.measurements, root: this.root };
  }

  #updateEntry(entry, node, options) {
    entry.cleanups.splice(0).forEach(cleanup => cleanup());
    entry.updateLifecycle?.abort();
    entry.updateLifecycle = new AbortController();
    const element = entry.element;
    element.dataset.gmUiNodeId = node.id;
    element.dataset.gmUiNodeType = node.type;
    applyLayout(element, node.layout, node.id === this.document?.rootId || node.parentId === null);
    applyUiAccessibility(element, node, this.host.reportDiagnostic);

    const applyState = state => {
      entry.state = state;
      element.dataset.gmUiState = state;
      applyUiNodeStyle(element, resolveUiNodeStyle(node, { ...this.host.styles, state }));
    };
    applyState(entry.state === 'disabled' ? 'disabled' : 'default');

    const stateEvents = [['pointerenter', 'hover'], ['pointerleave', 'default'], ['focus', 'focused'], ['blur', 'default'], ['pointerdown', 'pressed'], ['pointerup', 'hover']];
    for (const [eventName, state] of stateEvents) {
      const listener = () => applyState(state);
      element.addEventListener(eventName, listener);
      entry.cleanups.push(() => element.removeEventListener(eventName, listener));
    }

    if (node.action) {
      const listener = event => this.host.actionRouter.dispatch(node.action, { event, nodeId: node.id, data: this.host.dataSources.get(node.binding?.source) });
      element.addEventListener('click', listener);
      entry.cleanups.push(() => element.removeEventListener('click', listener));
    }
    if (this.host.mode === 'preview' && this.host.onSelectNode) {
      const listener = event => {
        event.stopPropagation();
        const started = performance.now();
        this.host.onSelectNode({ nodeId: node.id, event });
        this.host.measurements.lastSelectionLatencyMs = performance.now() - started;
      };
      element.addEventListener('pointerdown', listener);
      entry.cleanups.push(() => element.removeEventListener('pointerdown', listener));
    }

    const semantic = UI_SEMANTIC_WIDGETS[node.type];
    if (semantic) {
      const missing = semantic.requiredParts.filter(part => !node.parts.includes(part));
      if (missing.length) {
        this.host.reportDiagnostic({ severity: 'error', code: 'ui-required-part-missing', message: `Node "${node.id}" is missing: ${missing.join(', ')}.`, nodeId: node.id });
      } else {
        const context = {
          element, node, data: this.host.dataSources.get(node.binding?.source), host: this.host,
          signal: entry.lifecycle.signal, updateSignal: entry.updateLifecycle.signal,
        };
        if (!entry.semanticMounted) { this.host.semanticWidgets.mount(node.type, context); entry.semanticMounted = true; }
        this.host.semanticWidgets.update(node.type, context);
      }
    } else if (UI_PRIMITIVE_WIDGETS[node.type]) {
      renderPrimitiveContent(element, node, this.host.resolveAssetUrl);
    }
    entry.node = node;
  }

  #removeEntry(id, entry) {
    entry.cleanups.splice(0).forEach(cleanup => cleanup());
    entry.updateLifecycle?.abort();
    entry.lifecycle.abort();
    if (entry.semanticMounted) this.host.semanticWidgets.unmount(entry.node.type, { element: entry.element, node: entry.node, host: this.host });
    entry.element.remove();
    this.entries.delete(id);
  }

  unmount() {
    for (const [id, entry] of [...this.entries]) this.#removeEntry(id, entry);
    this.focus.restore();
    this.root.replaceChildren();
    this.document = null;
    this.host.recordMeasurement({ operation: 'unmount', elapsedMs: 0, snapshotBytes: 0, nodeCount: 0 });
  }
}
