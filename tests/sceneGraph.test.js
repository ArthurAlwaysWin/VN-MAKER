import { describe, expect, it } from 'vitest';

import {
  createBranchGraphMermaid,
  createBranchGraphReport,
  collectSceneGraph,
  collectSceneEdges,
  collectSceneReferences,
  resolveEntrySceneId,
  traceReachableScenes,
} from '../src/shared/sceneGraph.js';

describe('scene graph helpers', () => {
  it('collects scene next, choice, and condition targets', () => {
    const script = {
      scenes: {
        start: {
          next: 'after',
          pages: [
            {
              type: 'choice',
              options: [
                { text: 'A', target: 'route_a' },
                { text: 'B', target: 'route_b' },
              ],
            },
            {
              type: 'condition',
              trueTarget: 'good',
              falseTarget: 'bad',
            },
          ],
        },
        after: { pages: [] },
      },
    };

    expect(collectSceneGraph(script)).toEqual({
      start: ['after', 'route_a', 'route_b', 'good', 'bad'],
      after: [],
    });
  });

  it('traces reachable and unreachable scenes from start by default', () => {
    const script = {
      scenes: {
        start: {
          pages: [
            {
              type: 'choice',
              options: [{ text: 'Go', target: 'end' }],
            },
          ],
        },
        end: { pages: [] },
        orphan: { pages: [] },
      },
    };

    expect(resolveEntrySceneId(script)).toBe('start');
    expect(traceReachableScenes(script)).toMatchObject({
      entrySceneId: 'start',
      reachableSceneIds: ['start', 'end'],
      unreachableSceneIds: ['orphan'],
    });
  });

  it('uses a preferred entry scene when it exists', () => {
    const script = {
      scenes: {
        intro: { next: 'ending', pages: [] },
        ending: { pages: [] },
        start: { pages: [] },
      },
    };

    expect(traceReachableScenes(script, { entrySceneId: 'intro' })).toMatchObject({
      entrySceneId: 'intro',
      reachableSceneIds: ['intro', 'ending'],
      unreachableSceneIds: ['start'],
    });
  });

  it('collects scene reference locations for diagnostics', () => {
    const script = {
      scenes: {
        start: {
          next: 'ending',
          pages: [
            {
              type: 'choice',
              options: [
                { text: 'Go', target: 'ending' },
                { text: 'Stay', target: null },
              ],
            },
            {
              type: 'condition',
              trueTarget: 'ending',
              falseTarget: 'retry',
            },
          ],
        },
        ending: { pages: [] },
      },
    };

    expect(collectSceneReferences(script, 'ending')).toEqual([
      expect.objectContaining({
        kind: 'scene-next',
        sceneId: 'start',
        pageIndex: null,
        pathString: 'scenes.start.next',
      }),
      expect.objectContaining({
        kind: 'choice-option',
        sceneId: 'start',
        pageIndex: 0,
        optionIndex: 0,
        pathString: 'scenes.start.pages.0.options.0.target',
      }),
      expect.objectContaining({
        kind: 'condition-true-target',
        sceneId: 'start',
        pageIndex: 1,
        pathString: 'scenes.start.pages.1.trueTarget',
      }),
    ]);
  });

  it('reports dead ends, closed cycles, unlock reachability, and Mermaid flow output', () => {
    const script = {
      systems: {
        endings: { good: {}, secret: {} },
        gallery: { cg: { hidden_cg: {} } },
      },
      scenes: {
        start: {
          pages: [{
            type: 'choice',
            options: [
              { target: 'final', effects: [{ type: 'unlock:ending', id: 'good' }] },
              { target: 'stranded' },
              { target: 'loop' },
            ],
          }],
        },
        final: { pages: [] },
        stranded: { pages: [] },
        loop: { next: 'loop', pages: [] },
        orphan: {
          pages: [{
            type: 'choice',
            options: [{
              effects: [
                { type: 'unlock:ending', id: 'secret' },
                { type: 'unlock:cg', id: 'hidden_cg' },
              ],
            }],
          }],
        },
      },
    };

    expect(collectSceneEdges(script)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fromSceneId: 'start',
        toSceneId: 'final',
        kind: 'choice-option',
        pathString: 'scenes.start.pages.0.options.0.target',
        targetExists: true,
      }),
    ]));

    const report = createBranchGraphReport(script);
    expect(report).toMatchObject({
      entrySceneId: 'start',
      unreachableSceneIds: ['orphan'],
      deadEndSceneIds: ['stranded'],
      cyclesWithoutExit: [{ sceneIds: ['loop'] }],
      endings: { unreachableUnlockIds: ['secret'] },
      cgs: { unreachableUnlockIds: ['hidden_cg'] },
    });
    expect(report.nodes.find((node) => node.id === 'final')).toMatchObject({
      endingResolved: true,
      deadEnd: false,
    });
    expect(createBranchGraphMermaid(report)).toContain('scene_start -->|choice option| scene_final');
  });

  it('treats terminal normal pages with page-enter ending unlocks as resolved endings', () => {
    const report = createBranchGraphReport({
      systems: { endings: { quiet_end: {} } },
      scenes: {
        start: { next: 'quiet', pages: [] },
        quiet: {
          pages: [{
            type: 'normal',
            effects: [{ type: 'unlock:ending', id: 'quiet_end' }],
          }],
        },
      },
    });

    expect(report.deadEndSceneIds).toEqual([]);
    expect(report.nodes.find((node) => node.id === 'quiet')).toMatchObject({
      terminal: true,
      unlocksEnding: true,
      endingResolved: true,
    });
    expect(report.endings.entries[0]).toMatchObject({
      id: 'quiet_end',
      reachableReferenceCount: 1,
    });
  });

  it('reports broken route edges with repair-ready source paths', () => {
    const report = createBranchGraphReport({
      scenes: {
        start: {
          pages: [{
            type: 'choice',
            options: [{ text: 'Missing', target: 'missing_route' }],
          }],
        },
      },
    });

    expect(report.missingTargetCount).toBe(1);
    expect(report.missingTargetEdges).toEqual([
      expect.objectContaining({
        fromSceneId: 'start',
        toSceneId: 'missing_route',
        pathString: 'scenes.start.pages.0.options.0.target',
        sourceSceneReachable: true,
        suggestedAction: {
          command: 'repair-scene-target',
          params: {
            from: 'missing_route',
            to: '<existing-scene-id>',
          },
        },
      }),
    ]);
  });

  it('keeps colliding sanitized scene ids distinct in Mermaid output', () => {
    const report = createBranchGraphReport({
      scenes: {
        start: { next: 'route-a', pages: [] },
        'route-a': { next: 'route_a', pages: [] },
        route_a: { pages: [] },
      },
    });

    const mermaid = createBranchGraphMermaid(report);
    expect(mermaid).toContain('scene_route_a["route-a');
    expect(mermaid).toContain('scene_route_a_2["route_a');
    expect(mermaid).toContain('scene_route_a -->|next| scene_route_a_2');
  });
});
