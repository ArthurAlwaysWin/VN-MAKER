import { normalizeUiDocument } from '../shared/uiDocumentContract.js';
import { normalizeUiLayout } from '../shared/uiLayoutContract.js';
import { createUiRuntimeHost } from './renderer/createUiRendererHost.js';

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

export function createSharedConfirmationDocument({
  viewport = { width: 1280, height: 720 },
  title = 'Confirm',
  body = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmAction = { type: 'close-screen' },
  cancelAction = { type: 'close-screen' },
} = {}) {
  return normalizeUiDocument({
    schemaVersion: 2,
    id: 'confirmation',
    kind: 'overlay',
    authority: 'canonical-active',
    rootId: 'confirmation.root',
    viewport,
    nodes: [
      {
        id: 'confirmation.root',
        type: 'panel',
        parentId: null,
        order: 0,
        layout: normalizeUiLayout(),
        parts: [],
        style: { backgroundColor: 'rgba(0,0,0,0.55)' },
      },
      {
        id: 'confirmation.dialog',
        type: 'confirmation',
        parentId: 'confirmation.root',
        order: 0,
        layout: normalizeUiLayout({
          anchor: { minX: 0.5, minY: 0.5, maxX: 0.5, maxY: 0.5 },
          size: { width: 420, height: 220 },
        }),
        parts: ['body', 'cancel', 'confirm', 'title'],
        style: { backgroundColor: '#1d2229', borderColor: '#8db6ff', borderWidth: 1, borderRadius: 8, color: '#f4f7fb' },
        content: {
          accessibleName: title,
          modal: true,
          text: title,
          label: title,
          cancelAction: clone(cancelAction),
        },
      },
      {
        id: 'confirmation.title',
        type: 'text',
        parentId: 'confirmation.dialog',
        order: 0,
        layout: normalizeUiLayout({
          anchor: { minX: 0.5, minY: 0.18, maxX: 0.5, maxY: 0.18 },
          size: { width: 340, height: 36 },
        }),
        parts: [],
        content: { text: title },
        style: { color: '#ffffff', fontSize: 20, fontWeight: 700 },
      },
      {
        id: 'confirmation.body',
        type: 'text',
        parentId: 'confirmation.dialog',
        order: 1,
        layout: normalizeUiLayout({
          anchor: { minX: 0.5, minY: 0.42, maxX: 0.5, maxY: 0.42 },
          size: { width: 340, height: 54 },
        }),
        parts: [],
        content: { text: body },
        style: { color: '#d8e2f2', fontSize: 15 },
      },
      {
        id: 'confirmation.confirm',
        type: 'button',
        parentId: 'confirmation.dialog',
        order: 2,
        layout: normalizeUiLayout({
          anchor: { minX: 0.38, minY: 0.76, maxX: 0.38, maxY: 0.76 },
          size: { width: 130, height: 42 },
        }),
        parts: [],
        content: { text: confirmText, accessibleName: confirmText },
        action: clone(confirmAction),
        style: { backgroundColor: '#8db6ff', color: '#11151b', borderRadius: 6 },
      },
      {
        id: 'confirmation.cancel',
        type: 'button',
        parentId: 'confirmation.dialog',
        order: 3,
        layout: normalizeUiLayout({
          anchor: { minX: 0.66, minY: 0.76, maxX: 0.66, maxY: 0.76 },
          size: { width: 130, height: 42 },
        }),
        parts: [],
        content: { text: cancelText, accessibleName: cancelText },
        action: clone(cancelAction),
        style: { backgroundColor: '#303743', color: '#f4f7fb', borderRadius: 6 },
      },
    ],
  });
}

export class SharedConfirmationOverlay {
  constructor(container, { resolveAssetUrl = path => path } = {}) {
    this.container = container;
    this.resolveAssetUrl = resolveAssetUrl;
    this.host = null;
    this.el = null;
    this.active = false;
    this.document = null;
  }

  setDocument(document) {
    this.document = document ? normalizeUiDocument(clone(document)) : null;
  }

  show(options = {}) {
    this.hide();
    const returnFocus = this.container.ownerDocument.activeElement;
    this.el = this.container.ownerDocument.createElement('div');
    this.el.className = 'shared-confirmation-overlay';
    this.el.style.position = 'absolute';
    this.el.style.inset = '0';
    this.el.style.zIndex = '5';
    this.container.appendChild(this.el);
    const onConfirm = options.onConfirm;
    const onCancel = options.onCancel;
    const finish = callback => {
      if (!this.active) return;
      this.hide();
      callback?.();
      if (returnFocus?.isConnected && typeof returnFocus.focus === 'function') returnFocus.focus();
    };
    this.host = createUiRuntimeHost({
      container: this.el,
      resolveAssetUrl: this.resolveAssetUrl,
      semanticWidgets: { confirmation: { mount() {}, update() {}, unmount() {} } },
      actions: {
        'open-screen': params => finish(() => onConfirm?.(params)),
        'close-screen': params => finish(() => onCancel?.(params)),
      },
    });
    const dynamicDocument = createSharedConfirmationDocument(options);
    const document = this.document
      ? normalizeUiDocument({
          ...dynamicDocument,
          viewport: clone(options.viewport ?? this.document.viewport ?? dynamicDocument.viewport),
          nodes: dynamicDocument.nodes.map(dynamicNode => {
            const projectNode = this.document.nodes.find(item => item.id === dynamicNode.id)
              ?? (dynamicNode.id === 'confirmation.dialog'
                ? this.document.nodes.find(item => item.type === 'confirmation')
                : null);
            if (!projectNode) return clone(dynamicNode);
            return {
              ...clone(dynamicNode),
              layout: clone(projectNode.layout ?? dynamicNode.layout),
              style: { ...clone(dynamicNode.style ?? {}), ...clone(projectNode.style ?? {}) },
              asset: clone(projectNode.asset ?? dynamicNode.asset),
              content: dynamicNode.content
                ? { ...clone(projectNode.content ?? {}), ...clone(dynamicNode.content) }
                : clone(projectNode.content),
              action: dynamicNode.action ? clone(dynamicNode.action) : clone(projectNode.action),
            };
          }),
        })
      : dynamicDocument;
    this.active = true;
    this.host.mount(document, { acquireFocusNodeId: 'confirmation.dialog' });
    const dialog = this.host.renderer.root.querySelector('[data-gm-ui-node-id="confirmation.dialog"]');
    if (dialog) {
      dialog.style.maxWidth = 'calc(100% - 24px)';
      dialog.style.maxHeight = 'calc(100% - 24px)';
      dialog.style.boxSizing = 'border-box';
    }
    return document;
  }

  hide() {
    this.host?.unmount();
    this.host = null;
    this.el?.remove();
    this.el = null;
    this.active = false;
  }
}
