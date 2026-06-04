import { normalizeConditionPage } from './branchingContract.js';

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function createEdge(fromSceneId, toSceneId, kind, path, details = {}) {
  return {
    fromSceneId,
    toSceneId,
    kind,
    path,
    pathString: path.map((part) => String(part)).join('.'),
    ...details,
  };
}

function collectPageSceneEdges(sceneId, page, pageIndex) {
  if (!isPlainObject(page)) {
    return [];
  }

  if (page.type === 'choice' && Array.isArray(page.options)) {
    return page.options
      .map((option, optionIndex) => isNonEmptyString(option?.target)
        ? createEdge(
          sceneId,
          option.target,
          'choice-option',
          ['scenes', sceneId, 'pages', pageIndex, 'options', optionIndex, 'target'],
          { pageIndex, optionIndex, targetField: 'target' },
        )
        : null)
      .filter(Boolean);
  }

  if (page.type === 'condition') {
    const normalized = normalizeConditionPage(page);
    return [
      isNonEmptyString(normalized.trueTarget)
        ? createEdge(
          sceneId,
          normalized.trueTarget,
          'condition-true-target',
          ['scenes', sceneId, 'pages', pageIndex, 'trueTarget'],
          { pageIndex, optionIndex: null, targetField: 'trueTarget' },
        )
        : null,
      isNonEmptyString(normalized.falseTarget)
        ? createEdge(
          sceneId,
          normalized.falseTarget,
          'condition-false-target',
          ['scenes', sceneId, 'pages', pageIndex, 'falseTarget'],
          { pageIndex, optionIndex: null, targetField: 'falseTarget' },
        )
        : null,
    ].filter(Boolean);
  }

  if (page.type === 'input' && isNonEmptyString(page.target)) {
    return [createEdge(
      sceneId,
      page.target,
      'input-target',
      ['scenes', sceneId, 'pages', pageIndex, 'target'],
      { pageIndex, optionIndex: null, targetField: 'target' },
    )];
  }

  return [];
}

export function collectSceneEdges(script = {}) {
  const scenes = isPlainObject(script?.scenes) ? script.scenes : {};
  const edges = [];

  for (const [sceneId, scene] of Object.entries(scenes)) {
    if (isNonEmptyString(scene?.next)) {
      edges.push(createEdge(
        sceneId,
        scene.next,
        'scene-next',
        ['scenes', sceneId, 'next'],
        { pageIndex: null, optionIndex: null, targetField: 'next' },
      ));
    }

    const pages = Array.isArray(scene?.pages) ? scene.pages : [];
    for (const [pageIndex, page] of pages.entries()) {
      edges.push(...collectPageSceneEdges(sceneId, page, pageIndex));
    }
  }

  return edges.map((edge) => ({
    ...edge,
    targetExists: Boolean(scenes[edge.toSceneId]),
  }));
}

export function collectSceneGraph(script = {}) {
  const scenes = isPlainObject(script?.scenes) ? script.scenes : {};
  const graph = Object.fromEntries(Object.keys(scenes).map((sceneId) => [sceneId, []]));

  for (const edge of collectSceneEdges(script)) {
    if (!graph[edge.fromSceneId].includes(edge.toSceneId)) {
      graph[edge.fromSceneId].push(edge.toSceneId);
    }
  }

  return graph;
}

export function collectSceneReferences(script = {}, targetSceneId = null) {
  if (!isNonEmptyString(targetSceneId)) {
    return [];
  }

  return collectSceneEdges(script)
    .filter((edge) => edge.toSceneId === targetSceneId)
    .map(({ targetExists, fromSceneId, toSceneId, ...edge }) => ({
      ...edge,
      sceneId: fromSceneId,
      targetSceneId: toSceneId,
    }));
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

function collectUnlockReferences(script = {}, type) {
  const references = [];
  for (const [sceneId, scene] of Object.entries(script.scenes ?? {})) {
    const pages = Array.isArray(scene?.pages) ? scene.pages : [];
    for (const [pageIndex, page] of pages.entries()) {
      if (type === 'unlock:ending' && page?.type === 'normal') {
        const effects = Array.isArray(page.effects) ? page.effects : [];
        for (const [effectIndex, effect] of effects.entries()) {
          if (effect?.type !== type || !isNonEmptyString(effect.id)) {
            continue;
          }
          references.push({
            id: effect.id,
            sceneId,
            pageIndex,
            optionIndex: null,
            effectIndex,
            pathString: `scenes.${sceneId}.pages.${pageIndex}.effects.${effectIndex}`,
          });
        }
      }

      if (page?.type !== 'choice') {
        continue;
      }

      const options = Array.isArray(page.options) ? page.options : [];
      for (const [optionIndex, option] of options.entries()) {
        const effects = Array.isArray(option?.effects) ? option.effects : [];
        for (const [effectIndex, effect] of effects.entries()) {
          if (effect?.type !== type || !isNonEmptyString(effect.id)) {
            continue;
          }
          references.push({
            id: effect.id,
            sceneId,
            pageIndex,
            optionIndex,
            effectIndex,
            pathString: `scenes.${sceneId}.pages.${pageIndex}.options.${optionIndex}.effects.${effectIndex}`,
          });
        }
      }
    }
  }
  return references;
}

function findClosedCycles(sceneIds, edges, reachableIds, endingCompletionSceneIds) {
  const adjacency = new Map(sceneIds.map((sceneId) => [sceneId, []]));
  for (const edge of edges.filter((entry) => entry.targetExists)) {
    adjacency.get(edge.fromSceneId)?.push(edge.toSceneId);
  }

  let nextIndex = 0;
  const indices = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function visit(sceneId) {
    indices.set(sceneId, nextIndex);
    lowLinks.set(sceneId, nextIndex);
    nextIndex += 1;
    stack.push(sceneId);
    onStack.add(sceneId);

    for (const targetId of adjacency.get(sceneId) ?? []) {
      if (!indices.has(targetId)) {
        visit(targetId);
        lowLinks.set(sceneId, Math.min(lowLinks.get(sceneId), lowLinks.get(targetId)));
      } else if (onStack.has(targetId)) {
        lowLinks.set(sceneId, Math.min(lowLinks.get(sceneId), indices.get(targetId)));
      }
    }

    if (lowLinks.get(sceneId) === indices.get(sceneId)) {
      const component = [];
      let member = null;
      do {
        member = stack.pop();
        onStack.delete(member);
        component.push(member);
      } while (member !== sceneId);
      components.push(component);
    }
  }

  for (const sceneId of sceneIds) {
    if (!indices.has(sceneId)) {
      visit(sceneId);
    }
  }

  return components
    .filter((component) => component.some((sceneId) => reachableIds.has(sceneId)))
    .map((component) => {
      const members = new Set(component);
      const componentEdges = edges.filter((edge) => members.has(edge.fromSceneId) && edge.targetExists);
      const isCycle = component.length > 1
        || componentEdges.some((edge) => edge.fromSceneId === edge.toSceneId);
      const exitEdges = componentEdges.filter((edge) => !members.has(edge.toSceneId));
      const hasEndingUnlock = component.some((sceneId) => endingCompletionSceneIds.has(sceneId));
      if (!isCycle || exitEdges.length > 0 || hasEndingUnlock) {
        return null;
      }

      return {
        sceneIds: component.slice().sort(),
        edgePaths: componentEdges.map((edge) => edge.pathString),
        hasExit: false,
        hasEndingUnlock: false,
      };
    })
    .filter(Boolean);
}

function summarizeUnlockProgress(registry, references, reachableIds) {
  const referencesById = new Map();
  for (const reference of references) {
    if (!referencesById.has(reference.id)) {
      referencesById.set(reference.id, []);
    }
    referencesById.get(reference.id).push(reference);
  }

  const entries = Object.keys(registry ?? {}).map((id) => {
    const entryReferences = referencesById.get(id) ?? [];
    const reachableReferences = entryReferences.filter((reference) => reachableIds.has(reference.sceneId));
    return {
      id,
      referenceCount: entryReferences.length,
      reachableReferenceCount: reachableReferences.length,
      references: entryReferences,
      reachableReferences,
    };
  });

  return {
    entries,
    neverUnlockedIds: entries.filter((entry) => entry.referenceCount === 0).map((entry) => entry.id),
    unreachableUnlockIds: entries
      .filter((entry) => entry.referenceCount > 0 && entry.reachableReferenceCount === 0)
      .map((entry) => entry.id),
  };
}

export function createBranchGraphReport(script = {}, options = {}) {
  const scenes = isPlainObject(script?.scenes) ? script.scenes : {};
  const sceneIds = Object.keys(scenes);
  const trace = traceReachableScenes(script, options);
  const reachableIds = new Set(trace.reachableSceneIds);
  const edges = collectSceneEdges(script);
  const missingTargetEdges = edges
    .filter((edge) => !edge.targetExists)
    .map((edge) => ({
      ...edge,
      sourceSceneReachable: reachableIds.has(edge.fromSceneId),
      suggestedAction: {
        command: 'repair-scene-target',
        params: {
          from: edge.toSceneId,
          to: '<existing-scene-id>',
        },
      },
    }));
  const endingUnlockReferences = collectUnlockReferences(script, 'unlock:ending');
  const cgUnlockReferences = collectUnlockReferences(script, 'unlock:cg');
  const endingUnlockSceneIds = new Set(endingUnlockReferences.map((reference) => reference.sceneId));
  const cgUnlockSceneIds = new Set(cgUnlockReferences.map((reference) => reference.sceneId));
  const endingCompletionSceneIds = new Set(endingUnlockSceneIds);
  for (const reference of endingUnlockReferences) {
    for (const edge of edges) {
      if (
        edge.kind === 'choice-option'
        && edge.fromSceneId === reference.sceneId
        && edge.pageIndex === reference.pageIndex
        && edge.optionIndex === reference.optionIndex
        && edge.targetExists
      ) {
        endingCompletionSceneIds.add(edge.toSceneId);
      }
    }
  }
  const terminalSceneIds = sceneIds.filter((sceneId) => (
    !edges.some((edge) => edge.fromSceneId === sceneId)
  ));
  const deadEndSceneIds = terminalSceneIds.filter((sceneId) => (
    reachableIds.has(sceneId) && !endingCompletionSceneIds.has(sceneId)
  ));
  const cyclesWithoutExit = findClosedCycles(sceneIds, edges, reachableIds, endingCompletionSceneIds);
  const cycleSceneIds = new Set(cyclesWithoutExit.flatMap((cycle) => cycle.sceneIds));
  const endings = summarizeUnlockProgress(
    isPlainObject(script?.systems?.endings) ? script.systems.endings : {},
    endingUnlockReferences,
    reachableIds,
  );
  const cgs = summarizeUnlockProgress(
    isPlainObject(script?.systems?.gallery?.cg) ? script.systems.gallery.cg : {},
    cgUnlockReferences,
    reachableIds,
  );

  const nodes = sceneIds.map((sceneId) => ({
    id: sceneId,
    name: scenes[sceneId]?.name ?? sceneId,
    reachable: reachableIds.has(sceneId),
    terminal: terminalSceneIds.includes(sceneId),
    deadEnd: deadEndSceneIds.includes(sceneId),
    cycleWithoutExit: cycleSceneIds.has(sceneId),
    unlocksEnding: endingUnlockSceneIds.has(sceneId),
    endingResolved: endingCompletionSceneIds.has(sceneId),
    unlocksCg: cgUnlockSceneIds.has(sceneId),
    incomingEdgeCount: edges.filter((edge) => edge.toSceneId === sceneId).length,
    outgoingEdgeCount: edges.filter((edge) => edge.fromSceneId === sceneId).length,
  }));

  return {
    pathString: 'analysis.sceneGraph',
    entrySceneId: trace.entrySceneId,
    graph: trace.graph,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    missingTargetCount: missingTargetEdges.length,
    nodes,
    edges,
    missingTargetEdges,
    reachableSceneIds: trace.reachableSceneIds,
    unreachableSceneIds: trace.unreachableSceneIds,
    terminalSceneIds,
    deadEndSceneIds,
    cyclesWithoutExit,
    endings,
    cgs,
  };
}

function mermaidId(value) {
  return `scene_${String(value).replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

function escapeMermaidLabel(value) {
  return String(value).replace(/"/g, '&quot;');
}

export function createBranchGraphMermaid(report = {}) {
  const lines = ['flowchart TD'];
  const nodeIds = new Map();
  const usedNodeIds = new Set();
  const resolveNodeId = (value) => {
    if (nodeIds.has(value)) {
      return nodeIds.get(value);
    }

    const baseId = mermaidId(value);
    let nodeId = baseId;
    let suffix = 2;
    while (usedNodeIds.has(nodeId)) {
      nodeId = `${baseId}_${suffix}`;
      suffix += 1;
    }
    nodeIds.set(value, nodeId);
    usedNodeIds.add(nodeId);
    return nodeId;
  };

  for (const node of report.nodes ?? []) {
    const suffix = node.deadEnd
      ? ' [dead end]'
      : node.cycleWithoutExit
        ? ' [closed cycle]'
        : node.unlocksEnding
          ? ' [ending]'
          : '';
    lines.push(`  ${resolveNodeId(node.id)}["${escapeMermaidLabel(node.name)}${suffix}"]`);
  }

  const missingTargets = new Set();
  for (const edge of report.edges ?? []) {
    if (!edge.targetExists && !missingTargets.has(edge.toSceneId)) {
      missingTargets.add(edge.toSceneId);
      lines.push(`  ${resolveNodeId(edge.toSceneId)}["${escapeMermaidLabel(edge.toSceneId)} [missing]"]`);
    }
    const label = edge.kind === 'scene-next' ? 'next' : edge.kind.replace(/-/g, ' ');
    lines.push(`  ${resolveNodeId(edge.fromSceneId)} -->|${label}| ${resolveNodeId(edge.toSceneId)}`);
  }

  return `${lines.join('\n')}\n`;
}
