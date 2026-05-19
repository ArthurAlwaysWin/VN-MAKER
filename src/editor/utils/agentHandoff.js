function uniqueValues(values = []) {
  return [...new Set(values.filter((value) => value != null && value !== ''))];
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
