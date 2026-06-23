import { validateUiAction } from '../../shared/uiActionContract.js';

export const PREVIEW_SAFE_ACTION_DIAGNOSTICS = Object.freeze(new Set([
  'save-slot', 'load-slot', 'delete-slot', 'reset-settings', 'quit-game',
  'quick-save', 'quick-load', 'submit-input', 'video-set-volume',
]));

const diagnostic = (code, message, details = {}) => ({ severity: 'info', code, message, ...details });

export function createUiActionRouter({ mode = 'runtime', handlers = {}, onDiagnostic = () => {} } = {}) {
  return {
    mode,
    async dispatch(action, context = {}) {
      const invalid = validateUiAction(action);
      if (invalid.length) {
        invalid.forEach(onDiagnostic);
        return { status: 'rejected', diagnostics: invalid };
      }
      if (mode === 'preview' && PREVIEW_SAFE_ACTION_DIAGNOSTICS.has(action.type)) {
        const item = diagnostic('ui-preview-action-inert', `Preview did not execute persistent or destructive action "${action.type}".`, {
          action: structuredClone(action), nodeId: context.nodeId ?? null,
        });
        onDiagnostic(item);
        return { status: 'diagnostic', diagnostics: [item] };
      }
      const handler = handlers[action.type];
      if (!handler) {
        const item = diagnostic('ui-action-handler-missing', `No ${mode} handler is registered for "${action.type}".`, {
          action: structuredClone(action), nodeId: context.nodeId ?? null,
        });
        onDiagnostic(item);
        return { status: 'unhandled', diagnostics: [item] };
      }
      return { status: 'handled', value: await handler(action.params ?? {}, context) };
    },
  };
}
