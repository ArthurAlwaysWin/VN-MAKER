import { validateProject } from '../shared/projectValidator.js';
import { collectSceneReferences, traceReachableScenes } from '../shared/sceneGraph.js';
import { createExportReadiness } from './exportReadiness.js';
import { lintProjectLayout } from './layoutLint.js';

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function countPages(script = {}) {
  let total = 0;
  const byType = {};

  for (const scene of Object.values(script.scenes ?? {})) {
    if (!Array.isArray(scene?.pages)) {
      continue;
    }

    total += scene.pages.length;
    for (const page of scene.pages) {
      const type = page?.type ?? 'unknown';
      byType[type] = (byType[type] ?? 0) + 1;
    }
  }

  return { total, byType };
}

function collectSceneSummaries(script = {}) {
  return Object.entries(script.scenes ?? {}).map(([sceneId, scene]) => {
    const incomingReferences = collectSceneReferences(script, sceneId);
    return {
      id: sceneId,
      name: scene?.name ?? sceneId,
      pageCount: Array.isArray(scene?.pages) ? scene.pages.length : 0,
      next: scene?.next ?? null,
      incomingReferenceCount: incomingReferences.length,
      incomingReferencePaths: incomingReferences.map((reference) => reference.pathString),
      pages: collectPageSummaries(scene?.pages),
    };
  });
}

function collectPageTargets(page = {}) {
  if (page?.type === 'choice') {
    return (page.options ?? [])
      .map((option) => option?.target)
      .filter((target) => typeof target === 'string' && target.trim());
  }

  if (page?.type === 'condition') {
    return [page.trueTarget, page.falseTarget]
      .filter((target) => typeof target === 'string' && target.trim());
  }

  return [];
}

function collectPageSummaries(pages = []) {
  if (!Array.isArray(pages)) {
    return [];
  }

  return pages.map((page, pageIndex) => ({
    index: pageIndex,
    id: page?.id ?? null,
    type: page?.type ?? 'unknown',
    background: page?.background ?? '',
    characterIds: Array.isArray(page?.characters)
      ? page.characters.map((entry) => entry?.id).filter(Boolean)
      : [],
    dialogueCount: Array.isArray(page?.dialogues) ? page.dialogues.length : 0,
    optionCount: Array.isArray(page?.options) ? page.options.length : 0,
    conditionCount: Array.isArray(page?.conditions) ? page.conditions.length : 0,
    targets: collectPageTargets(page),
  }));
}

function collectCharacterSummaries(script = {}) {
  return Object.entries(script.characters ?? {}).map(([characterId, character]) => ({
    id: characterId,
    name: character?.name ?? characterId,
    expressionIds: Object.keys(character?.expressions ?? {}),
  }));
}

function collectVariableSummaries(script = {}) {
  return Object.entries(script.systems?.variables ?? {}).map(([variableId, variable]) => ({
    id: variableId,
    label: variable?.label ?? variable?.name ?? variableId,
    type: variable?.type ?? 'number',
    initial: variable?.initial,
  }));
}

export function createProjectReport(script = {}, options = {}) {
  const validation = validateProject(script, options.validation);
  const layout = lintProjectLayout(script, options.layout);
  const sceneGraph = traceReachableScenes(script, options.graph);
  const readiness = options.readiness
    ? createExportReadiness(script, options.readiness)
    : null;
  const pageCounts = countPages(script);
  const systems = isPlainObject(script.systems) ? script.systems : {};

  return {
    title: script.meta?.title ?? null,
    projectId: script.projectId ?? null,
    contractVersion: script.contractVersion ?? null,
    counts: {
      characters: Object.keys(script.characters ?? {}).length,
      scenes: Object.keys(script.scenes ?? {}).length,
      pages: pageCounts.total,
      pagesByType: pageCounts.byType,
      variables: Object.keys(systems.variables ?? {}).length,
      endings: Object.keys(systems.endings ?? {}).length,
      cgs: Object.keys(systems.gallery?.cg ?? {}).length,
    },
    characters: collectCharacterSummaries(script),
    variables: collectVariableSummaries(script),
    scenes: collectSceneSummaries(script),
    sceneGraph,
    validation,
    layout,
    ...(readiness ? { readiness } : {}),
  };
}
