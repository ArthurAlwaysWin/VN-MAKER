import { describe, expect, it } from 'vitest';

import {
  collectSceneGraph,
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
});
