function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function displayValue(value) {
  if (value === undefined) return '(missing)';
  if (value === null) return 'null';
  if (typeof value === 'string') {
    const shortened = value.length > 80 ? `${value.slice(0, 77)}...` : value;
    return JSON.stringify(shortened);
  }
  if (typeof value === 'object') {
    let json;
    try {
      json = JSON.stringify(value);
    } catch {
      return '[unserializable object]';
    }
    return json.length > 80 ? `${json.slice(0, 77)}...` : json;
  }
  return String(value);
}

function addDiff(entries, pathParts, type, editorValue, diskValue) {
  entries.push({
    pathString: pathParts.length ? pathParts.join('.') : '(root)',
    type,
    editorValue: displayValue(editorValue),
    diskValue: displayValue(diskValue),
  });
}

function hasSeenPair(seenPairs, editorValue, diskValue) {
  if (!editorValue || !diskValue || typeof editorValue !== 'object' || typeof diskValue !== 'object') {
    return false;
  }

  let seenDiskValues = seenPairs.get(editorValue);
  if (!seenDiskValues) {
    seenDiskValues = new WeakSet();
    seenPairs.set(editorValue, seenDiskValues);
  } else if (seenDiskValues.has(diskValue)) {
    return true;
  }
  seenDiskValues.add(diskValue);
  return false;
}

function visitDiff(editorValue, diskValue, pathParts, entries, context) {
  if (Object.is(editorValue, diskValue)) {
    return;
  }

  if (pathParts.length >= context.maxDepth) {
    addDiff(entries, pathParts, 'changed-on-disk', editorValue, diskValue);
    return;
  }

  if (hasSeenPair(context.seenPairs, editorValue, diskValue)) {
    return;
  }

  if (Array.isArray(editorValue) && Array.isArray(diskValue)) {
    const length = Math.max(editorValue.length, diskValue.length);
    for (let index = 0; index < length; index += 1) {
      if (index >= editorValue.length) {
        addDiff(entries, [...pathParts, index], 'added-on-disk', undefined, diskValue[index]);
      } else if (index >= diskValue.length) {
        addDiff(entries, [...pathParts, index], 'removed-on-disk', editorValue[index], undefined);
      } else {
        visitDiff(editorValue[index], diskValue[index], [...pathParts, index], entries, context);
      }
    }
    return;
  }

  if (isPlainObject(editorValue) && isPlainObject(diskValue)) {
    const keys = [...new Set([...Object.keys(editorValue), ...Object.keys(diskValue)])].sort();
    for (const key of keys) {
      if (!(key in editorValue)) {
        addDiff(entries, [...pathParts, key], 'added-on-disk', undefined, diskValue[key]);
      } else if (!(key in diskValue)) {
        addDiff(entries, [...pathParts, key], 'removed-on-disk', editorValue[key], undefined);
      } else {
        visitDiff(editorValue[key], diskValue[key], [...pathParts, key], entries, context);
      }
    }
    return;
  }

  addDiff(entries, pathParts, 'changed-on-disk', editorValue, diskValue);
}

export function createScriptDiffSummary(editorScript = {}, diskScript = {}, { limit = 20, maxDepth = 100 } = {}) {
  const entries = [];
  visitDiff(editorScript, diskScript, [], entries, {
    maxDepth,
    seenPairs: new WeakMap(),
  });
  return {
    changedPathCount: entries.length,
    entries: entries.slice(0, limit),
    truncated: entries.length > limit,
  };
}
