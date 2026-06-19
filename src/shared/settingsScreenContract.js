export const SETTINGS_CUSTOM_BUTTON_ACTIONS = Object.freeze(['close', 'reset']);
export const SETTINGS_FOOTER_BUTTON_ACTIONS = Object.freeze(['close', 'title', 'reset']);

export function isKnownSettingsCustomButtonAction(action) {
  return SETTINGS_CUSTOM_BUTTON_ACTIONS.includes(action);
}

export function isKnownSettingsFooterButtonAction(action) {
  return SETTINGS_FOOTER_BUTTON_ACTIONS.includes(action);
}
