export const TEXT_TEMPLATE_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_-]*)\}/g;
const VARIABLE_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const UNSAFE_OBJECT_MAP_KEYS = new Set(Object.getOwnPropertyNames(Object.prototype));

function isValidTemplateVariableId(variableId) {
  return Boolean(
    typeof variableId === 'string'
    && VARIABLE_ID_PATTERN.test(variableId)
    && !UNSAFE_OBJECT_MAP_KEYS.has(variableId),
  );
}

function readVariableValue(variables, variableId) {
  if (variables instanceof Map) {
    return variables.get(variableId);
  }

  return variables?.[variableId];
}

function stringifyTemplateValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

export function interpolateTextTemplate(text, variables = new Map()) {
  if (typeof text !== 'string' || !text.includes('${')) {
    return text;
  }

  TEXT_TEMPLATE_PATTERN.lastIndex = 0;
  return text.replace(TEXT_TEMPLATE_PATTERN, (match, variableId) => {
    if (!isValidTemplateVariableId(variableId)) {
      return match;
    }

    const value = readVariableValue(variables, variableId);
    if (value === undefined) {
      return match;
    }

    return stringifyTemplateValue(value);
  });
}

export function collectTextTemplateVariableIds(text) {
  if (typeof text !== 'string' || !text.includes('${')) {
    return [];
  }

  const ids = new Set();
  TEXT_TEMPLATE_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(TEXT_TEMPLATE_PATTERN)) {
    const variableId = match[1];
    if (isValidTemplateVariableId(variableId)) {
      ids.add(variableId);
    }
  }

  return [...ids];
}

export function replaceTextTemplateVariableId(text, fromVariableId, toVariableId) {
  if (typeof text !== 'string' || !text.includes('${') || !fromVariableId || !toVariableId) {
    return text;
  }

  TEXT_TEMPLATE_PATTERN.lastIndex = 0;
  return text.replace(TEXT_TEMPLATE_PATTERN, (match, variableId) => (
    variableId === fromVariableId ? `\${${toVariableId}}` : match
  ));
}
