function uniqueValues(values = []) {
  return [...new Set(values.filter((value) => value != null && value !== ''))];
}

export function createHandoffReviewItemKey(item = {}) {
  return JSON.stringify([
    item.source ?? '',
    item.code ?? '',
    item.pathString ?? '',
    item.sceneId ?? '',
    item.pageIndex ?? '',
    item.message ?? '',
  ]);
}

export function countHandoffReviewStatuses(handoff = null, state = {}) {
  const counts = {
    open: 0,
    acknowledged: 0,
    resolved: 0,
  };

  for (const item of handoff?.reviewItems ?? []) {
    const status = state[createHandoffReviewItemKey(item)]?.status;
    if (status === 'acknowledged') {
      counts.acknowledged += 1;
    } else if (status === 'resolved') {
      counts.resolved += 1;
    } else {
      counts.open += 1;
    }
  }

  return counts;
}

export function parseScenePath(pathString = '') {
  const match = /^scenes\.([^.]+)(?:\.pages\.(\d+))?/.exec(String(pathString));
  if (!match) {
    return null;
  }

  return {
    sceneId: match[1],
    pageIndex: match[2] == null ? null : Number(match[2]),
  };
}

export function parseAgentPathTarget(pathString = '') {
  const normalized = String(pathString);
  const scene = parseScenePath(normalized);
  if (scene) {
    return {
      kind: 'scene',
      tab: 'scenes',
      pathString: normalized,
      ...scene,
    };
  }

  const variableMatch = /^systems\.variables\.([^.]+)/.exec(normalized);
  if (variableMatch) {
    return {
      kind: 'variable',
      tab: 'story-systems',
      id: variableMatch[1],
      pathString: normalized,
    };
  }

  const characterMatch = /^characters\.([^.]+)/.exec(normalized);
  if (characterMatch) {
    return {
      kind: 'character',
      tab: 'resource-library',
      id: characterMatch[1],
      pathString: normalized,
    };
  }

  if (/^(assets|backgrounds|audio|voices|fonts|ui)\./.test(normalized)) {
    return {
      kind: normalized.startsWith('ui.') ? 'ui' : 'asset',
      tab: normalized.startsWith('ui.') ? 'project-settings' : 'resource-library',
      pathString: normalized,
    };
  }

  return null;
}

function getPathGroupKey(pathString = '') {
  const target = parseAgentPathTarget(pathString);
  if (target?.kind === 'scene') {
    return `scene:${target.sceneId}`;
  }
  if (target?.kind === 'variable') {
    return 'systems:variables';
  }
  if (target?.kind === 'character') {
    return 'characters';
  }
  if (target?.kind === 'asset') {
    return 'assets';
  }
  if (target?.kind === 'ui') {
    return 'ui';
  }
  return 'other';
}

function createPathGroup(key) {
  const [kind, id = ''] = key.split(':');
  const labelMap = {
    scene: id ? `Scene ${id}` : 'Scene',
    systems: 'Variables',
    characters: 'Characters',
    assets: 'Assets',
    ui: 'UI',
    other: 'Other paths',
  };

  return {
    key,
    kind,
    label: labelMap[kind] ?? key,
    changedPaths: [],
    reviewItems: [],
  };
}

export function groupHandoffReviewByPath(handoff = null) {
  const groups = new Map();
  const changedPaths = handoff?.transactionSummary?.changedPaths ?? [];
  const reviewItems = handoff?.reviewItems ?? [];

  function ensureGroup(pathString = '') {
    const key = getPathGroupKey(pathString);
    if (!groups.has(key)) {
      groups.set(key, createPathGroup(key));
    }
    return groups.get(key);
  }

  for (const changedPath of changedPaths) {
    ensureGroup(changedPath).changedPaths.push(changedPath);
  }

  for (const item of reviewItems) {
    const pathString = item.pathString || (item.sceneId ? `scenes.${item.sceneId}` : '');
    ensureGroup(pathString).reviewItems.push(item);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      changedPaths: uniqueValues(group.changedPaths),
    }))
    .filter((group) => group.changedPaths.length > 0 || group.reviewItems.length > 0);
}

export function summarizeHandoffByScene(handoff = null) {
  const sceneMap = {};
  const changedPaths = handoff?.transactionSummary?.changedPaths ?? [];
  const reviewItems = handoff?.reviewItems ?? [];

  function ensureScene(sceneId) {
    if (!sceneMap[sceneId]) {
      sceneMap[sceneId] = {
        changedPaths: [],
        changedPages: [],
        reviewItems: [],
        incomingReferenceCount: 0,
      };
    }
    return sceneMap[sceneId];
  }

  for (const changedPath of changedPaths) {
    const parsed = parseScenePath(changedPath);
    if (!parsed) {
      continue;
    }

    const summary = ensureScene(parsed.sceneId);
    summary.changedPaths.push(changedPath);
    if (Number.isInteger(parsed.pageIndex)) {
      summary.changedPages.push(parsed.pageIndex);
    }
  }

  for (const item of reviewItems) {
    const parsed = parseScenePath(item.pathString);
    const sceneId = item.sceneId ?? parsed?.sceneId;
    if (!sceneId) {
      continue;
    }

    const summary = ensureScene(sceneId);
    summary.reviewItems.push(item);
    if (item.code === 'scene-incoming-references') {
      summary.incomingReferenceCount = Math.max(
        summary.incomingReferenceCount,
        item.referenceCount ?? 0,
      );
    }
  }

  for (const summary of Object.values(sceneMap)) {
    summary.changedPaths = uniqueValues(summary.changedPaths);
    summary.changedPages = uniqueValues(summary.changedPages);
  }

  return sceneMap;
}
