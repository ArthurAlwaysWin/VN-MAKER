import { UI_BINDING_REGISTRY } from '../../shared/uiDocumentContract.js';

export function createUiDataSourceRegistry(initial = {}) {
  const values = new Map();
  const allowed = new Set(UI_BINDING_REGISTRY);
  const set = (name, value) => {
    if (!allowed.has(name)) throw new Error(`Unknown canonical UI data source: ${name}`);
    values.set(name, value);
  };
  for (const [name, value] of Object.entries(initial)) set(name, value);
  return {
    has: name => allowed.has(name) && values.has(name),
    get: name => allowed.has(name) ? values.get(name) : undefined,
    set,
    replace(next = {}) {
      values.clear();
      for (const [name, value] of Object.entries(next)) set(name, value);
    },
    list: () => Object.fromEntries(values),
  };
}
