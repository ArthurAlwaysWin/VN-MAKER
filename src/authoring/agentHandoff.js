import { createExportReadiness } from './exportReadiness.js';
import { lintProjectLayout } from './layoutLint.js';
import { createProjectReport } from './projectReport.js';

function summarizeCheckpoint(entry = {}) {
  return {
    path: entry.path,
    name: entry.name ?? null,
    createdAt: entry.createdAt ?? null,
    size: entry.size ?? null,
  };
}

function collectReviewItems({ validation, layout, readiness }) {
  return [
    ...(validation.errors ?? []).map((issue) => ({
      source: 'validation',
      severity: 'error',
      code: issue.code,
      pathString: issue.pathString ?? '',
      message: issue.message,
    })),
    ...(validation.warnings ?? []).map((issue) => ({
      source: 'validation',
      severity: 'warning',
      code: issue.code,
      pathString: issue.pathString ?? '',
      message: issue.message,
    })),
    ...(layout.warnings ?? []).map((issue) => ({
      source: 'layout',
      severity: issue.severity ?? 'warning',
      code: issue.code,
      pathString: issue.pathString ?? '',
      message: issue.message,
      suggestedAction: issue.suggestedAction,
    })),
    ...(readiness.blockers ?? []).map((issue) => ({
      source: 'readiness',
      severity: 'error',
      code: issue.code,
      pathString: issue.pathString ?? '',
      message: issue.message,
      suggestedAction: issue.suggestedAction,
    })),
    ...(readiness.warnings ?? []).map((issue) => ({
      source: 'readiness',
      severity: 'warning',
      code: issue.code,
      pathString: issue.pathString ?? '',
      message: issue.message,
      suggestedAction: issue.suggestedAction,
    })),
  ];
}

export function createAgentHandoff(script = {}, options = {}) {
  const validationOptions = options.validation ?? {};
  const readinessOptions = options.readiness ?? {};
  const projectReport = createProjectReport(script, {
    validation: validationOptions,
    layout: options.layout,
    readiness: readinessOptions,
  });
  const validation = projectReport.validation;
  const layout = projectReport.layout;
  const readiness = projectReport.readiness ?? createExportReadiness(script, readinessOptions);
  const reviewItems = collectReviewItems({ validation, layout, readiness });
  const checkpoints = (options.checkpoints ?? []).map(summarizeCheckpoint);
  const gates = {
    validation: validation.ok,
    layout: layout.ok,
    readiness: readiness.ready,
  };

  return {
    kind: 'agent-authoring-handoff',
    version: 1,
    createdAt: options.createdAt ?? new Date().toISOString(),
    scriptPath: options.scriptPath ?? null,
    title: projectReport.title,
    projectId: projectReport.projectId,
    gates,
    ok: Object.values(gates).every(Boolean),
    counts: projectReport.counts,
    sceneGraph: projectReport.sceneGraph,
    checkpoints,
    latestCheckpointPath: checkpoints[0]?.path ?? null,
    reviewItems,
    reviewItemCount: reviewItems.length,
    notes: options.notes ?? [],
  };
}
