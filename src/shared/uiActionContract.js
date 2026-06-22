const SCREEN_IDS = Object.freeze(['title', 'gameplay', 'gameMenu', 'settings', 'saveLoad', 'backlog', 'gallery']);

const enumParam = (values, required = true) => Object.freeze({ type: 'enum', values: Object.freeze(values), required });
const stringParam = (required = true) => Object.freeze({ type: 'string', required });
const numberParam = (required = true) => Object.freeze({ type: 'number', required });

export const UI_ACTION_REGISTRY = Object.freeze({
  'start-game': Object.freeze({ params: {} }),
  'continue-game': Object.freeze({ params: {} }),
  'open-screen': Object.freeze({ params: Object.freeze({
    screenId: enumParam(SCREEN_IDS),
    mode: enumParam(['save', 'load'], false),
    source: enumParam(['title', 'gameMenu', 'gameplay'], false),
  }) }),
  'close-screen': Object.freeze({ params: Object.freeze({ destination: enumParam(['title', 'gameMenu', 'gameplay'], false) }) }),
  'save-slot': Object.freeze({ params: Object.freeze({ slot: stringParam(false) }) }),
  'load-slot': Object.freeze({ params: Object.freeze({ slot: stringParam(false) }) }),
  'delete-slot': Object.freeze({ params: Object.freeze({ slot: stringParam(false) }) }),
  'reset-settings': Object.freeze({ params: {} }),
  'quit-game': Object.freeze({ params: {} }),
  'replay-opening-video': Object.freeze({ params: {} }),
  'replay-ending-video': Object.freeze({ params: Object.freeze({ endingId: stringParam(false) }) }),
  'advance-dialogue': Object.freeze({ params: {} }),
  'toggle-auto': Object.freeze({ params: {} }),
  'toggle-skip': Object.freeze({ params: {} }),
  'quick-save': Object.freeze({ params: {} }),
  'quick-load': Object.freeze({ params: {} }),
  'replay-voice': Object.freeze({ params: Object.freeze({ entry: stringParam(false) }) }),
  'submit-input': Object.freeze({ params: {} }),
  'cancel-input': Object.freeze({ params: {} }),
  'video-play-pause': Object.freeze({ params: {} }),
  'video-skip': Object.freeze({ params: {} }),
  'video-set-volume': Object.freeze({ params: Object.freeze({ value: numberParam(false) }) }),
});

function issue(code, message, path = [], details = {}) {
  return { severity: 'error', code, message, path, pathString: path.join('.'), ...details };
}

export function validateUiAction(action, { path = [] } = {}) {
  const diagnostics = [];
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    return [issue('ui-action-invalid', 'Action must be an object with a canonical type.', path)];
  }
  const schema = UI_ACTION_REGISTRY[action.type];
  if (!schema) {
    return [issue('ui-action-unknown', `Unknown canonical UI action "${action.type ?? ''}".`, [...path, 'type'], {
      allowedValues: Object.keys(UI_ACTION_REGISTRY),
    })];
  }
  const params = action.params ?? {};
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return [issue('ui-action-params-invalid', 'Action params must be an object.', [...path, 'params'])];
  }
  for (const key of Object.keys(params)) {
    if (!schema.params[key]) diagnostics.push(issue('ui-action-param-unknown', `Parameter "${key}" is not allowed for ${action.type}.`, [...path, 'params', key]));
  }
  for (const [key, rule] of Object.entries(schema.params)) {
    const value = params[key];
    if (value === undefined) {
      if (rule.required) diagnostics.push(issue('ui-action-param-missing', `Action ${action.type} requires parameter "${key}".`, [...path, 'params', key]));
      continue;
    }
    if (rule.type === 'string' && (typeof value !== 'string' || !value.trim())) {
      diagnostics.push(issue('ui-action-param-invalid', `Parameter "${key}" must be a non-empty string.`, [...path, 'params', key]));
    }
    if (rule.type === 'number' && !(typeof value === 'number' && Number.isFinite(value))) {
      diagnostics.push(issue('ui-action-param-invalid', `Parameter "${key}" must be a finite number.`, [...path, 'params', key]));
    }
    if (rule.type === 'enum' && !rule.values.includes(value)) {
      diagnostics.push(issue('ui-action-param-invalid', `Parameter "${key}" must be one of: ${rule.values.join(', ')}.`, [...path, 'params', key], { allowedValues: rule.values }));
    }
  }
  return diagnostics;
}

const exact = (type, params = {}) => ({ action: { type, ...(Object.keys(params).length ? { params } : {}) }, diagnostics: [] });

export function mapLegacyUiAction(screenId, legacyAction) {
  const value = typeof legacyAction === 'string' ? legacyAction.trim() : '';
  const maps = {
    title: {
      start: () => exact('start-game'),
      continue: () => exact('continue-game'),
      load: () => exact('open-screen', { screenId: 'saveLoad', mode: 'load', source: 'title' }),
      settings: () => exact('open-screen', { screenId: 'settings', source: 'title' }),
      gallery: () => exact('open-screen', { screenId: 'gallery', source: 'title' }),
      'play-opening-video': () => exact('replay-opening-video'),
      quit: () => exact('quit-game'),
    },
    gameMenu: {
      save: () => exact('open-screen', { screenId: 'saveLoad', mode: 'save', source: 'gameMenu' }),
      load: () => exact('open-screen', { screenId: 'saveLoad', mode: 'load', source: 'gameMenu' }),
      backlog: () => exact('open-screen', { screenId: 'backlog', source: 'gameMenu' }),
      settings: () => exact('open-screen', { screenId: 'settings', source: 'gameMenu' }),
      title: () => exact('open-screen', { screenId: 'title', source: 'gameMenu' }),
      close: () => exact('close-screen', { destination: 'gameplay' }),
    },
    settings: {
      close: () => exact('close-screen'),
      title: () => exact('open-screen', { screenId: 'title' }),
      reset: () => exact('reset-settings'),
    },
    saveLoad: {
      save: () => exact('save-slot'),
      load: () => exact('load-slot'),
      delete: () => exact('delete-slot'),
      close: () => exact('close-screen'),
    },
    backlog: { close: () => exact('close-screen'), replay: () => exact('replay-voice') },
    gallery: { close: () => exact('close-screen'), 'replay-ending-video': () => exact('replay-ending-video') },
    gameplay: {
      advance: () => exact('advance-dialogue'), auto: () => exact('toggle-auto'), skip: () => exact('toggle-skip'),
      backlog: () => exact('open-screen', { screenId: 'backlog', source: 'gameplay' }),
      save: () => exact('open-screen', { screenId: 'saveLoad', mode: 'save', source: 'gameplay' }),
      load: () => exact('open-screen', { screenId: 'saveLoad', mode: 'load', source: 'gameplay' }),
      quicksave: () => exact('quick-save'), quickload: () => exact('quick-load'),
      'quick-save': () => exact('quick-save'), 'quick-load': () => exact('quick-load'),
      settings: () => exact('open-screen', { screenId: 'settings', source: 'gameplay' }),
    },
    textInput: { submit: () => exact('submit-input'), cancel: () => exact('cancel-input') },
    confirmation: { confirm: () => exact('close-screen'), cancel: () => exact('close-screen') },
    videoControls: { play: () => exact('video-play-pause'), pause: () => exact('video-play-pause'), skip: () => exact('video-skip'), volume: () => exact('video-set-volume') },
  };
  const mapped = maps[screenId]?.[value];
  if (mapped) return mapped();
  return {
    action: null,
    diagnostics: [issue('ui-legacy-action-unknown', `Legacy action "${value}" is not supported for ${screenId}.`, [], { screenId, legacyAction: value })],
  };
}

export function listUiActionSchema() {
  return JSON.parse(JSON.stringify(UI_ACTION_REGISTRY));
}
