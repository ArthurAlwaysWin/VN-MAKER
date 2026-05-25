import { createBranchGraphMermaid, createBranchGraphReport } from '../shared/sceneGraph.js';
import { createExportReadiness } from './exportReadiness.js';

export function createGraphAnalysis(script = {}, options = {}) {
  const report = createBranchGraphReport(script, options);
  return {
    ...report,
    mermaid: createBranchGraphMermaid(report),
  };
}

export function findDeadEnds(script = {}, options = {}) {
  const graph = createGraphAnalysis(script, options);
  return {
    entrySceneId: graph.entrySceneId,
    deadEndSceneIds: graph.deadEndSceneIds,
    cyclesWithoutExit: graph.cyclesWithoutExit,
    terminalSceneIds: graph.terminalSceneIds,
    nodes: graph.nodes.filter((node) => node.deadEnd || node.cycleWithoutExit),
    mermaid: graph.mermaid,
  };
}

export function findAssetIssues(script = {}, options = {}) {
  const readiness = createExportReadiness(script, options);
  return {
    checked: readiness.assets.checked,
    missing: readiness.assets.missing,
    unused: readiness.assets.unused,
    missingIssues: readiness.blockers.filter((issue) => issue.code === 'missing-asset-reference'),
    unusedIssues: readiness.warnings.filter((issue) => issue.code === 'unused-asset'),
  };
}
