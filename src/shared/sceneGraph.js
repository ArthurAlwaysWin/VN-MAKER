import { normalizeConditionPage } from './branchingContract.js';

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function collectPageSceneTargets(page) {
  if (!isPlainObject(page)) {
    return [];
  }

  if (page.type === 'choice' && Array.isArray(page.options)) {
    return page.options
      .map((option) => option?.target)
      .filter(isNonEmptyString);
  }

  if (page.type === 'condition') {
    const normalized = normalizeConditionPage(page);
    return [normalized.trueTarget, normalized.falseTarget].filter(isNonEmptyString);
  }

  return [];
}

export function collectSceneGraph(script = {}) {
  const scenes = isPlainObject(script?.scenes) ? script.scenes : {};
  const graph = {};

  for (const [sceneId, scene] of Object.entries(scenes)) {
    const targets = [];
    if (isNonEmptyString(scene?.next)) {
      targets.push(scene.next);
    }

    if (Array.isArray(scene?.pages)) {
      for (const page of scene.pages) {
        targets.push(...collectPageSceneTargets(page));
      }
    }

    graph[sceneId] = [...new Set(targets)];
  }

  return graph;
}

export function collectSceneReferences(script = {}, targetSceneId = null) {
  const scenes = isPlainObject(script?.scenes) ? script.scenes : {};
  const references = [];
  if (!isNonEmptyString(targetSceneId)) {
    return references;
  }

  for (const [sceneId, scene] of Object.entries(scenes)) {
    if (scene?.next === targetSceneId) {
      references.push({
        kind: 'scene-next',
        sceneId,
        pageIndex: null,
        optionIndex: null,
        targetField: 'next',
        path: ['scenes', sceneId, 'next'],
        pathString: `scenes.${sceneId}.next`,
      });
    }

    for (const [pageIndex, page] of (scene?.pages ?? []).entries()) {
      if (page?.type === 'choice') {
        for (const [optionIndex, option] of (page.options ?? []).entries()) {
          if (option?.target === targetSceneId) {
            references.push({
              kind: 'choice-option',
              sceneId,
              pageIndex,
              optionIndex,
              targetField: 'target',
              path: ['scenes', sceneId, 'pages', pageIndex, 'options', optionIndex, 'target'],
              pathString: `scenes.${sceneId}.pages.${pageIndex}.options.${optionIndex}.target`,
            });
          }
        }
      }

      if (page?.type === 'condition') {
        const normalized = normalizeConditionPage(page);
        if (normalized.trueTarget === targetSceneId) {
          references.push({
            kind: 'condition-true-target',
            sceneId,
            pageIndex,
            optionIndex: null,
            targetField: 'trueTarget',
            path: ['scenes', sceneId, 'pages', pageIndex, 'trueTarget'],
            pathString: `scenes.${sceneId}.pages.${pageIndex}.trueTarget`,
          });
        }
        if (normalized.falseTarget === targetSceneId) {
          references.push({
            kind: 'condition-false-target',
            sceneId,
            pageIndex,
            optionIndex: null,
            targetField: 'falseTarget',
            path: ['scenes', sceneId, 'pages', pageIndex, 'falseTarget'],
            pathString: `scenes.${sceneId}.pages.${pageIndex}.falseTarget`,
          });
        }
      }
    }
  }

  return references;
}

export function resolveEntrySceneId(script = {}, preferredEntrySceneId = null) {
  const scenes = isPlainObject(script?.scenes) ? script.scenes : {};
  const sceneIds = Object.keys(scenes);
  if (sceneIds.length === 0) {
    return null;
  }

  if (isNonEmptyString(preferredEntrySceneId) && scenes[preferredEntrySceneId]) {
    return preferredEntrySceneId;
  }

  return scenes.start ? 'start' : sceneIds[0];
}

export function traceReachableScenes(script = {}, options = {}) {
  const scenes = isPlainObject(script?.scenes) ? script.scenes : {};
  const sceneIds = Object.keys(scenes);
  const entrySceneId = resolveEntrySceneId(script, options.entrySceneId);
  const graph = collectSceneGraph(script);
  const reachable = new Set();
  const queue = entrySceneId ? [entrySceneId] : [];

  while (queue.length > 0) {
    const sceneId = queue.shift();
    if (reachable.has(sceneId) || !scenes[sceneId]) {
      continue;
    }

    reachable.add(sceneId);
    for (const target of graph[sceneId] ?? []) {
      if (!reachable.has(target)) {
        queue.push(target);
      }
    }
  }

  return {
    entrySceneId,
    graph,
    reachableSceneIds: sceneIds.filter((sceneId) => reachable.has(sceneId)),
    unreachableSceneIds: sceneIds.filter((sceneId) => !reachable.has(sceneId)),
  };
}
