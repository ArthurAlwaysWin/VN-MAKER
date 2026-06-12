import { createHash } from 'node:crypto';
import path from 'node:path';

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash('sha256').update(String(value ?? '')).digest('hex');
}

function hashLabel(value) {
  return `sha256:${sha256(value)}`;
}

function uniqueStringValues(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim()))];
}

function sortedStringValues(values) {
  return uniqueStringValues(values).sort((left, right) => left.localeCompare(right));
}

function toPosixPath(value) {
  return String(value ?? '').replace(/\\/g, '/');
}

function sourcePathFor(file, sourceRoot) {
  if (!file) return 'story.dsl';
  const absoluteSourceRoot = sourceRoot ? path.resolve(sourceRoot) : null;
  const absoluteFile = path.isAbsolute(file) ? path.resolve(file) : null;
  if (absoluteSourceRoot && absoluteFile) {
    const relative = path.relative(absoluteSourceRoot, absoluteFile);
    if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
      return toPosixPath(relative);
    }
  }
  return toPosixPath(file);
}

function spanFor(irOperation) {
  const span = irOperation.source?.span;
  if (!span) return null;
  return {
    start: {
      line: span.start?.line ?? irOperation.source?.line ?? 1,
      column: span.start?.column ?? irOperation.source?.column ?? 1,
      offset: span.start?.offset ?? 0,
    },
    end: {
      line: span.end?.line ?? span.start?.line ?? irOperation.source?.line ?? 1,
      column: span.end?.column ?? span.start?.column ?? irOperation.source?.column ?? 1,
      offset: span.end?.offset ?? span.start?.offset ?? 0,
    },
  };
}

function sourceFingerprintFor(irOperation) {
  const source = irOperation.source ?? {};
  return hashLabel(stableJson({
    file: source.file ?? null,
    line: source.line ?? null,
    column: source.column ?? null,
    span: spanFor(irOperation),
    sourceId: irOperation.sourceId ?? null,
  }));
}

function getProjectPathValue(project, projectPath) {
  const segments = String(projectPath ?? '').split('.').filter(Boolean);
  let current = project;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return { exists: false, value: null };
      }
      current = current[index];
      continue;
    }

    if (!current || typeof current !== 'object' || !Object.hasOwn(current, segment)) {
      return { exists: false, value: null };
    }
    current = current[segment];
  }
  return { exists: true, value: cloneJsonValue(current) };
}

function createProjectPathSnapshot(project, projectPaths = []) {
  return sortedStringValues(projectPaths).map((projectPath) => {
    const resolved = getProjectPathValue(project, projectPath);
    return {
      path: projectPath,
      exists: resolved.exists,
      value: resolved.value,
    };
  });
}

function projectFingerprintForPaths(project, projectPaths = []) {
  return hashLabel(stableJson(createProjectPathSnapshot(project, projectPaths)));
}

export function agentDslSourceMapIdForIndex(index) {
  return `map-${String(index + 1).padStart(5, '0')}`;
}

function sourceIdForIndex(index) {
  return `src-${String(index + 1).padStart(5, '0')}`;
}

export function inferAgentDslProjectPaths(irOperation) {
  const payload = irOperation.payload ?? {};
  if (irOperation.kind === 'DeclareCharacter') {
    return payload.id ? [`characters.${payload.id}`] : [];
  }
  if (irOperation.kind === 'DeclareVariable') {
    return payload.id ? [`systems.variables.${payload.id}`] : [];
  }
  if (irOperation.kind === 'DeclareEnding') {
    return payload.id ? [`systems.endings.${payload.id}`] : [];
  }
  if (irOperation.kind === 'DeclareCg') {
    return payload.id ? [`systems.gallery.cg.${payload.id}`] : [];
  }
  if (irOperation.kind === 'CreateScene') {
    return payload.id ? [`scenes.${payload.id}`] : [];
  }
  if (irOperation.kind === 'CreateNormalPage' || irOperation.kind === 'CreateChoicePage' || irOperation.kind === 'CreateConditionPage') {
    return payload.scene && Number.isInteger(irOperation.source?.details?.pageIndex)
      ? [`scenes.${payload.scene}.pages.${irOperation.source.details.pageIndex}`]
      : [];
  }
  if (irOperation.kind === 'SetSceneNext') {
    return payload.scene ? [`scenes.${payload.scene}.next`] : [];
  }
  return [];
}

export function createAgentDslSourceMap(ir, plan, options = {}) {
  const sourceRoot = options.sourceRoot ?? null;
  const operations = ir.operations ?? [];
  const planOperations = plan?.operations ?? [];
  const sourceByPath = new Map();
  const sourceIds = new Map();

  for (const operation of operations) {
    const sourcePath = sourcePathFor(operation.source?.file, sourceRoot);
    if (!sourceByPath.has(sourcePath)) {
      const id = sourceIdForIndex(sourceByPath.size);
      sourceByPath.set(sourcePath, {
        id,
        path: sourcePath,
        sha256: sha256(options.sourceTextByPath?.[sourcePath] ?? options.sourceText ?? sourcePath),
      });
      sourceIds.set(sourcePath, id);
    }
  }

  const mappings = operations.map((operation, index) => {
    const planOperation = planOperations[index] ?? {};
    const sourcePath = sourcePathFor(operation.source?.file, sourceRoot);
    return {
      id: agentDslSourceMapIdForIndex(index),
      sourceId: sourceIds.get(sourcePath) ?? sourceIdForIndex(0),
      span: spanFor(operation),
      astKind: operation.source?.provenanceKind ?? operation.kind,
      irStableId: operation.stableId,
      operationId: planOperation.id ?? operation.stableId,
      projectPaths: inferAgentDslProjectPaths(operation),
      fingerprint: {
        source: sourceFingerprintFor(operation),
        emitted: hashLabel(stableJson(planOperation.params ?? operation.payload ?? {})),
      },
    };
  });

  return {
    version: 1,
    compiler: 'agent-dsl',
    languageVersion: ir.source?.languageVersion ?? 1,
    sources: [...sourceByPath.values()].map(cloneJsonValue),
    mappings: mappings.map(cloneJsonValue),
  };
}

export function enrichAgentDslSourceMapWithApplyResult(sourceMap, applyPlanResult) {
  const operationsById = new Map();
  for (const operation of applyPlanResult?.operations ?? []) {
    if (operation?.id && Array.isArray(operation.changedPaths)) {
      operationsById.set(operation.id, uniqueStringValues(operation.changedPaths));
    }
  }

  return {
    ...cloneJsonValue(sourceMap ?? {}),
    mappings: (sourceMap?.mappings ?? []).map((mapping) => {
      const projectPaths = operationsById.get(mapping.operationId);
      const nextProjectPaths = projectPaths ?? uniqueStringValues(mapping.projectPaths);
      const generatedFingerprint = projectPaths && applyPlanResult?.project
        ? projectFingerprintForPaths(applyPlanResult.project, nextProjectPaths)
        : null;
      return {
        ...cloneJsonValue(mapping),
        projectPaths: nextProjectPaths,
        fingerprint: {
          ...cloneJsonValue(mapping.fingerprint ?? {}),
          ...(generatedFingerprint ? { generated: generatedFingerprint } : {}),
        },
      };
    }),
  };
}

export function checkAgentDslSourceMapStaleness(sourceMap, project) {
  const mappings = (sourceMap?.mappings ?? []).map((mapping) => {
    const projectPaths = uniqueStringValues(mapping.projectPaths);
    const baseline = mapping.fingerprint?.generated ?? null;
    const snapshot = createProjectPathSnapshot(project, projectPaths);
    const current = hashLabel(stableJson(snapshot));
    const missingPaths = snapshot
      .filter((entry) => !entry.exists)
      .map((entry) => entry.path);
    const status = !baseline
      ? 'untracked'
      : missingPaths.length
        ? 'missing'
        : current === baseline
          ? 'safe'
          : 'stale';

    return {
      id: mapping.id,
      operationId: mapping.operationId,
      sourceId: mapping.sourceId,
      projectPaths,
      status,
      stale: status !== 'safe',
      missingPaths,
      fingerprint: {
        generated: baseline,
        current,
      },
    };
  });
  const staleMappings = mappings.filter((mapping) => mapping.stale);

  return {
    ok: staleMappings.length === 0,
    mappingCount: mappings.length,
    staleCount: staleMappings.length,
    mappings,
    staleMappings,
  };
}
