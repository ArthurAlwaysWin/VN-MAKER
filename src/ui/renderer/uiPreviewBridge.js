export const UI_PREVIEW_MESSAGE_TYPES = Object.freeze({
  MOUNT: 'ui-document-mount', UPDATE: 'ui-document-update', UNMOUNT: 'ui-document-unmount', RESULT: 'ui-document-result',
});

export function createUiPreviewBridge(host, { postResult = () => {} } = {}) {
  return {
    handle(message) {
      if (!message || typeof message !== 'object') return false;
      let result;
      if (message.type === UI_PREVIEW_MESSAGE_TYPES.MOUNT) {
        host.dataSources.replace(message.dataSources ?? {});
        result = host.mount(message.document, { acquireFocusNodeId: message.acquireFocusNodeId });
      } else if (message.type === UI_PREVIEW_MESSAGE_TYPES.UPDATE) {
        host.dataSources.replace(message.dataSources ?? host.dataSources.list());
        result = host.update(message.document, { acquireFocusNodeId: message.acquireFocusNodeId });
      } else if (message.type === UI_PREVIEW_MESSAGE_TYPES.UNMOUNT) {
        host.unmount();
        result = { diagnostics: [], measurements: host.measurements };
      } else return false;
      postResult({ type: UI_PREVIEW_MESSAGE_TYPES.RESULT, requestId: message.requestId ?? null, diagnostics: result.diagnostics ?? [], measurements: result.measurements });
      return true;
    },
  };
}
