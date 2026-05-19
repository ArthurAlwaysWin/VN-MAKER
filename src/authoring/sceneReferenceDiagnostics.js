import { collectSceneReferences } from '../shared/sceneGraph.js';

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function sceneIdsFromChangedPaths(changedPaths = []) {
  if (!Array.isArray(changedPaths)) {
    return [];
  }

  return uniqueValues(changedPaths.map((changedPath) => {
    const match = /^scenes\.([^.]+)/.exec(String(changedPath));
    return match?.[1] ?? null;
  }));
}

export function collectSceneReferenceDiagnostics(script = {}, options = {}) {
  const sceneIds = uniqueValues([
    ...(options.sceneIds ?? []),
    ...sceneIdsFromChangedPaths(options.changedPaths ?? []),
  ]).filter((sceneId) => script.scenes?.[sceneId]);

  return sceneIds
    .map((sceneId) => {
      const references = collectSceneReferences(script, sceneId);
      if (references.length === 0) {
        return null;
      }

      return {
        source: 'scene-references',
        severity: 'info',
        code: 'scene-incoming-references',
        sceneId,
        pathString: `scenes.${sceneId}`,
        message: `Scene "${sceneId}" has ${references.length} incoming reference(s). Review them before renaming, deleting, or retargeting this scene.`,
        referenceCount: references.length,
        references: references.slice(0, options.referenceLimit ?? 10),
        suggestedAction: {
          summary: 'Inspect or retarget incoming scene references before structural scene edits.',
          commands: [
            {
              command: 'scene-references',
              args: { scene: sceneId },
            },
            {
              command: 'retarget-scene',
              args: { from: sceneId, to: '<target-scene-id>' },
            },
          ],
        },
      };
    })
    .filter(Boolean);
}
