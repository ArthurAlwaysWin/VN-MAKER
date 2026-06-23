import { UI_STYLE_SCHEMA } from '../../shared/uiDocumentContract.js';

const clone = value => value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};

function pickTypedStyle(style) {
  const result = {};
  for (const [key, value] of Object.entries(clone(style))) {
    if (UI_STYLE_SCHEMA[key]) result[key] = value;
  }
  return result;
}

function lookupStyle(styles, ref) {
  if (!ref || !styles || typeof styles !== 'object') return {};
  if (styles[ref] && typeof styles[ref] === 'object') return styles[ref];
  return ref.split('.').reduce((value, key) => value?.[key], styles) ?? {};
}

export function resolveUiNodeStyle(node, {
  engineStyles = {},
  theme = {},
  screenStyles = {},
  state = 'default',
} = {}) {
  const ref = node?.styleRef;
  return Object.assign(
    {},
    pickTypedStyle(engineStyles[node?.type]),
    pickTypedStyle(lookupStyle(theme.styles ?? theme.widgetStyles, ref)),
    pickTypedStyle(lookupStyle(screenStyles, ref)),
    pickTypedStyle(node?.style),
    pickTypedStyle(node?.states?.default),
    state === 'default' ? {} : pickTypedStyle(node?.states?.[state]),
  );
}

const PIXEL_PROPERTIES = new Set(['fontSize', 'borderWidth', 'borderRadius', 'gap', 'letterSpacing']);

export function applyUiNodeStyle(element, style) {
  for (const property of Object.keys(UI_STYLE_SCHEMA)) {
    const cssProperty = property === 'visible' ? null : property;
    if (cssProperty) element.style[cssProperty] = '';
  }
  for (const [property, value] of Object.entries(pickTypedStyle(style))) {
    if (property === 'visible') {
      element.hidden = value === false;
    } else {
      element.style[property] = PIXEL_PROPERTIES.has(property) && typeof value === 'number' ? `${value}px` : String(value);
    }
  }
}
