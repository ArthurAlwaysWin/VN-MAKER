import { describe, expect, it } from 'vitest';

import { createAgentHandoff } from '../src/authoring/agentHandoff.js';
import { checkAgentDslSourceMapStaleness } from '../src/authoring/agentDsl/sourceMap.js';

describe('agent handoff report', () => {
  it('summarizes gates, checkpoints, and editor review items', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff',
      characters: {},
      scenes: {
        start: {
          next: 'reviewed_scene',
          pages: [
            { type: 'normal', dialogues: [] },
          ],
        },
        reviewed_scene: {
          pages: [
            { type: 'normal', background: 'bg/room.png', dialogues: [] },
          ],
        },
      },
    }, {
      scriptPath: 'public/game/script.json',
      createdAt: '2026-05-19T10:00:00.000Z',
      readiness: { knownAssets: [], requireAssetCheck: false },
      checkpoints: [
        {
          path: 'public/game/.checkpoints/script.2026.json',
          name: 'script.2026.json',
          createdAt: '2026-05-19T09:59:00.000Z',
          size: 120,
        },
      ],
      transaction: {
        dryRun: false,
        transaction: {
          command: 'apply-plan',
          status: 'written',
          wrote: true,
          checkpointPath: 'public/game/.checkpoints/script.2026.json',
        },
        operations: [{ command: 'add-scene' }, { command: 'add-page' }],
        changeSummary: {
          operationCount: 2,
          changedPaths: ['scenes.reviewed_scene', 'scenes.reviewed_scene.pages.0'],
          validation: { ok: true, errorCount: 0, warningCount: 0 },
        },
      },
      notes: ['Review the newly authored branch in the editor.'],
    });

    expect(handoff).toMatchObject({
      kind: 'agent-authoring-handoff',
      version: 1,
      createdAt: '2026-05-19T10:00:00.000Z',
      scriptPath: 'public/game/script.json',
      projectId: 'gm_handoff',
      gates: {
        validation: true,
        layout: false,
        readiness: false,
      },
      ok: false,
      latestCheckpointPath: 'public/game/.checkpoints/script.2026.json',
      transactionSummary: {
        command: 'apply-plan',
        status: 'written',
        wrote: true,
        operationCount: 2,
        changedPathCount: 2,
        changedPaths: ['scenes.reviewed_scene', 'scenes.reviewed_scene.pages.0'],
      },
      checkpoints: [
        {
          path: 'public/game/.checkpoints/script.2026.json',
          size: 120,
        },
      ],
      notes: ['Review the newly authored branch in the editor.'],
    });
    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'layout',
        code: 'layout-blank-page',
      }),
      expect.objectContaining({
        source: 'readiness',
        code: 'layout-blank-page',
      }),
      expect.objectContaining({
        source: 'scene-references',
        code: 'scene-incoming-references',
        sceneId: 'reviewed_scene',
        referenceCount: 1,
      }),
    ]));
  });

  it('includes preview targets for changed scene pages and screen UI paths', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff_preview_targets',
      characters: {},
      scenes: {
        start: {
          pages: [
            { type: 'normal', background: 'bg/room.png', dialogues: [{ text: 'Ready.' }] },
          ],
        },
      },
    }, {
      readiness: { knownAssets: [], requireAssetCheck: false },
      transaction: {
        transaction: { command: 'apply-plan', status: 'written', wrote: true },
        changeSummary: {
          changedPaths: [
            'scenes.start',
            'scenes.start.pages.0',
            'ui.titleScreen',
            'ui.gameMenu.chrome',
            'ui.gameMenu.buttons',
          ],
        },
      },
    });

    expect(handoff.previewTargets).toEqual([
      { type: 'scene', sceneId: 'start', pageIndex: 0 },
      {
        type: 'branch-graph',
        kind: 'branch-graph',
        pathString: 'analysis.sceneGraph',
        reason: 'changed-scene-flow',
      },
      { type: 'screen', screenId: 'titleScreen' },
      { type: 'screen', screenId: 'gameMenu' },
    ]);
    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'preview',
        category: 'screen-ui-preview',
        code: 'screen-ui-preview-required',
        pathString: 'ui.titleScreen',
        screenId: 'titleScreen',
      }),
      expect.objectContaining({
        source: 'preview',
        category: 'screen-ui-preview',
        code: 'screen-ui-preview-required',
        pathString: 'ui.gameMenu',
        screenId: 'gameMenu',
      }),
      expect.objectContaining({
        source: 'preview',
        category: 'branch-graph-preview',
        code: 'branch-graph-preview-required',
        pathString: 'analysis.sceneGraph',
      }),
    ]));
  });

  it('adds Agent DSL provenance and stale warnings to handoff artifacts', () => {
    const script = {
      projectId: 'gm_handoff_agent_dsl',
      characters: {},
      scenes: {
        start: {
          pages: [
            { type: 'normal', background: 'bg/room.png', dialogues: [{ text: 'Ready.' }] },
          ],
        },
      },
    };
    const sourceMap = {
      version: 1,
      compiler: 'agent-dsl',
      languageVersion: 1,
      sources: [{ id: 'src-00001', path: 'agent-src/main.gmdsl' }],
      mappings: [
        {
          id: 'map-00001',
          sourceId: 'src-00001',
          span: { start: { line: 4, column: 3 }, end: { line: 5, column: 1 } },
          astKind: 'page',
          operationId: 'dsl-add-page-start-1',
          projectPaths: ['scenes.start.pages.0'],
          fingerprint: {},
        },
      ],
    };
    const handoff = createAgentHandoff(script, {
      readiness: { knownAssets: [], requireAssetCheck: false },
      transaction: {
        transaction: { command: 'apply-plan', status: 'written', wrote: true },
        changeSummary: {
          changedPaths: ['scenes.start.pages.0'],
        },
      },
      dslSourceMap: sourceMap,
      dslSourceMapPath: '.tmp/agent-dsl-source-map.applied.json',
      dslStaleness: checkAgentDslSourceMapStaleness(sourceMap, script),
    });

    expect(handoff.dslSourceMap).toMatchObject({
      path: '.tmp/agent-dsl-source-map.applied.json',
      mappingCount: 1,
      stale: {
        ok: false,
        staleCount: 1,
      },
    });
    expect(handoff.previewTargets[0]).toMatchObject({
      type: 'scene',
      sceneId: 'start',
      pageIndex: 0,
      source: {
        kind: 'agent-dsl',
        file: 'agent-src/main.gmdsl',
        line: 4,
        mappingId: 'map-00001',
      },
    });
    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'agent-dsl',
        severity: 'info',
        code: 'dsl-generated-change',
        pathString: 'scenes.start.pages.0',
        message: 'Generated from agent-src/main.gmdsl:4.',
      }),
      expect.objectContaining({
        source: 'agent-dsl',
        severity: 'warning',
        code: 'dsl-generated-region-untracked',
        pathString: 'scenes.start.pages.0',
        status: 'untracked',
      }),
    ]));
  });

  it('adds particle preview review items for changed page particle paths', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff_particles',
      characters: {},
      scenes: {
        start: {
          pages: [
            { type: 'normal', particles: { preset: 'snow' }, dialogues: [{ text: 'Snow.' }] },
          ],
        },
      },
    }, {
      readiness: { knownAssets: [], requireAssetCheck: false },
      transaction: {
        transaction: { command: 'apply-plan', status: 'written', wrote: true },
        changeSummary: {
          changedPaths: ['scenes.start.pages.0.particles'],
        },
      },
    });

    expect(handoff.previewTargets).toEqual(expect.arrayContaining([
      {
        type: 'scene',
        kind: 'scene-page',
        sceneId: 'start',
        pageIndex: 0,
        reason: 'changed-particles',
        pathString: 'scenes.start.pages.0.particles',
      },
    ]));
    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'preview',
        category: 'particle-preview',
        code: 'particle-preview-required',
        pathString: 'scenes.start.pages.0.particles',
        sceneId: 'start',
        pageIndex: 0,
      }),
    ]));
  });

  it('adds transition preview review items for changed page transition paths', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff_transitions',
      characters: {},
      scenes: {
        start: {
          pages: [
            { type: 'normal', transition: { type: 'noise-dissolve', duration: 900 }, dialogues: [{ text: 'Cut.' }] },
          ],
        },
      },
    }, {
      readiness: { knownAssets: [], requireAssetCheck: false },
      transaction: {
        transaction: { command: 'apply-plan', status: 'written', wrote: true },
        changeSummary: {
          changedPaths: ['scenes.start.pages.0.transition'],
        },
      },
    });

    expect(handoff.previewTargets).toEqual(expect.arrayContaining([
      {
        type: 'scene',
        kind: 'scene-page',
        sceneId: 'start',
        pageIndex: 0,
        reason: 'changed-transition',
        pathString: 'scenes.start.pages.0.transition',
      },
    ]));
    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'preview',
        category: 'transition-preview',
        code: 'transition-preview-required',
        pathString: 'scenes.start.pages.0.transition',
        sceneId: 'start',
        pageIndex: 0,
      }),
    ]));
  });

  it('adds effect pack preview review items for changed page effect pack paths', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff_effect_packs',
      characters: {},
      assets: {
        effectPacks: {
          old_film: {
            id: 'old_film',
            name: 'Old Film',
            kind: 'postprocess',
            adapter: 'canvas2d:film-flicker',
          },
        },
      },
      scenes: {
        start: {
          pages: [
            {
              type: 'normal',
              effectPacks: [{ id: 'old_film', params: { intensity: 0.4 } }],
              dialogues: [{ text: 'Film.' }],
            },
          ],
        },
      },
    }, {
      readiness: { knownAssets: [], requireAssetCheck: false },
      transaction: {
        transaction: { command: 'apply-plan', status: 'written', wrote: true },
        changeSummary: {
          changedPaths: ['scenes.start.pages.0.effectPacks'],
        },
      },
    });

    expect(handoff.previewTargets).toEqual(expect.arrayContaining([
      {
        type: 'scene',
        kind: 'scene-page',
        sceneId: 'start',
        pageIndex: 0,
        reason: 'changed-effect-packs',
        pathString: 'scenes.start.pages.0.effectPacks',
      },
    ]));
    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'preview',
        category: 'effect-pack-preview',
        code: 'effect-pack-preview-required',
        pathString: 'scenes.start.pages.0.effectPacks',
        sceneId: 'start',
        pageIndex: 0,
      }),
    ]));
  });

  it('includes ending-list preview targets for changed ending registry paths', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff_ending_targets',
      characters: {},
      systems: {
        endings: {
          good_end: { title: 'Good End' },
        },
      },
      scenes: {
        start: {
          pages: [
            {
              type: 'choice',
              prompt: 'End?',
              options: [
                {
                  text: 'Good',
                  effects: [{ type: 'unlock:ending', id: 'good_end' }],
                },
              ],
            },
          ],
        },
      },
    }, {
      readiness: { knownAssets: [], requireAssetCheck: false },
      transaction: {
        transaction: { command: 'apply-plan', status: 'written', wrote: true },
        changeSummary: {
          changedPaths: ['systems.endings.good_end'],
        },
      },
    });

    expect(handoff.previewTargets).toEqual([
      {
        type: 'ending-list',
        kind: 'ending-list',
        pathString: 'systems.endings',
        reason: 'changed-ending-registry',
      },
    ]);
    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'preview',
        category: 'ending-list-preview',
        code: 'ending-list-preview-required',
        pathString: 'systems.endings',
      }),
    ]));
  });

  it('includes gallery preview targets for changed CG registry paths', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff_gallery_targets',
      systems: {
        gallery: {
          cg: {
            confession: {
              title: 'Confession',
              images: ['backgrounds/cg/confession.png'],
              thumbnail: 'backgrounds/cg/confession.png',
            },
          },
        },
      },
      scenes: {
        start: {
          pages: [{
            type: 'choice',
            options: [{ effects: [{ type: 'unlock:cg', id: 'confession' }] }],
          }],
        },
      },
    }, {
      readiness: { knownAssets: [], requireAssetCheck: false },
      transaction: {
        transaction: { command: 'apply-plan', status: 'written', wrote: true },
        changeSummary: { changedPaths: ['systems.gallery.cg.confession'] },
      },
    });

    expect(handoff.previewTargets).toEqual([
      {
        type: 'gallery',
        kind: 'gallery',
        pathString: 'systems.gallery.cg',
        reason: 'changed-cg-registry',
      },
    ]);
    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'preview',
        category: 'gallery-preview',
        code: 'gallery-preview-required',
        pathString: 'systems.gallery.cg',
      }),
    ]));
  });

  it('provides repair guidance for deterministic condition route findings', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff_condition_analysis',
      systems: {
        variables: {
          affection: { type: 'number', initial: 0 },
        },
      },
      scenes: {
        start: {
          pages: [{
            type: 'condition',
            conditionMode: 'all',
            conditions: [
              { variableId: 'affection', operator: '>=', value: 5 },
              { variableId: 'affection', operator: '<', value: 5 },
            ],
            trueTarget: 'good',
            falseTarget: 'bad',
          }],
        },
        good: { pages: [{ type: 'normal', dialogues: [{ text: 'Good.' }] }] },
        bad: { pages: [{ type: 'normal', dialogues: [{ text: 'Bad.' }] }] },
      },
    }, {
      readiness: { knownAssets: [], requireAssetCheck: false },
    });

    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'validation',
        code: 'condition-always-false',
        pathString: 'scenes.start.pages.0',
        variableId: 'affection',
        outcome: false,
        suggestedAction: expect.objectContaining({
          commands: [expect.objectContaining({ command: 'set-condition-page' })],
        }),
      }),
    ]));
  });

  it('provides repair guidance for broken and unresolved branch flow routes', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff_branch_flow',
      systems: {
        endings: { good: { title: 'Good End' } },
      },
      scenes: {
        start: {
          pages: [{
            type: 'choice',
            options: [
              { text: 'Broken', target: 'missing_route' },
              { text: 'Stranded', target: 'dead' },
            ],
          }],
        },
        dead: { pages: [{ type: 'normal', dialogues: [{ text: 'Lost.' }] }] },
      },
    }, {
      readiness: { knownAssets: [], requireAssetCheck: false },
    });

    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'validation',
        code: 'missing-scene-target',
        target: 'missing_route',
        pathString: 'scenes.start.pages.0.options.0.target',
        suggestedAction: expect.objectContaining({
          commands: expect.arrayContaining([
            expect.objectContaining({ command: 'repair-scene-target' }),
          ]),
        }),
      }),
      expect.objectContaining({
        source: 'validation',
        code: 'dead-end-scene',
        sceneId: 'dead',
        suggestedAction: expect.objectContaining({
          commands: expect.arrayContaining([
            expect.objectContaining({ command: 'add-ending-unlock' }),
          ]),
        }),
      }),
    ]));
  });

  it('turns transaction reference screenshot notes into screen fidelity review items', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff_reference_fidelity',
      characters: {},
      scenes: {
        start: {
          pages: [
            { type: 'normal', background: 'backgrounds/room.png', dialogues: [{ text: 'Ready.' }] },
          ],
        },
      },
      ui: {
        gameMenu: {
          panel: { width: 360 },
        },
      },
    }, {
      readiness: { knownAssets: [], requireAssetCheck: false },
      transaction: {
        handoff: {
          referenceScreenshotNotes: [
            {
              screenId: 'gameMenu',
              reference: 'reference/game-menu.png',
              summary: 'Matched the left-side menu column and cool glass panel treatment.',
              matched: ['left menu alignment', 'low-contrast blue panel'],
              gaps: ['exact glow intensity needs human preview'],
            },
          ],
        },
        changeSummary: {
          changedPaths: ['ui.gameMenu'],
        },
      },
    });

    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'preview',
        category: 'reference-screenshot-fidelity',
        code: 'reference-screenshot-fidelity-note',
        pathString: 'ui.gameMenu',
        screenId: 'gameMenu',
        reference: 'reference/game-menu.png',
        matched: ['left menu alignment', 'low-contrast blue panel'],
        gaps: ['exact glow intensity needs human preview'],
      }),
    ]));
  });

  it('enriches missing and unused asset review items for human handoff', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff_asset_review',
      characters: {},
      scenes: {
        start: {
          pages: [
            {
              type: 'normal',
              background: 'backgrounds/missing_school_gate.png',
              characters: [],
              dialogues: [{ text: 'The gate is quiet.' }],
            },
          ],
        },
      },
    }, {
      readiness: {
        knownAssets: ['backgrounds/unused_room.png'],
        requireAssetCheck: true,
      },
    });

    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'readiness',
        severity: 'error',
        category: 'missing-asset',
        code: 'missing-asset-reference',
        assetKind: 'background',
        assetPath: 'backgrounds/missing_school_gate.png',
        pathString: 'scenes.start.pages.0.background',
        suggestedAction: expect.objectContaining({
          commands: expect.arrayContaining([
            expect.objectContaining({ command: 'list-assets' }),
            expect.objectContaining({ command: 'validate' }),
          ]),
        }),
      }),
      expect.objectContaining({
        source: 'readiness',
        severity: 'warning',
        category: 'unused-asset',
        code: 'unused-asset',
        assetPath: 'backgrounds/unused_room.png',
      }),
    ]));
  });

  it('flags placeholder and ambiguous referenced asset names for handoff review', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff_asset_names',
      characters: {
        sakura: {
          name: 'Sakura',
          expressions: {
            normal: 'characters/placeholder_sakura.png',
            smile: 'characters/img01.png',
          },
        },
      },
      scenes: {
        start: {
          pages: [
            {
              type: 'normal',
              background: 'backgrounds/bg01.png',
              characters: [{ id: 'sakura', expression: 'normal' }],
              dialogues: [
                { speaker: 'sakura', text: 'Ready.', voice: 'voices/todo_line.wav' },
              ],
            },
          ],
        },
      },
      ui: {
        titleScreen: {
          background: 'ui/title_placeholder.png',
          elements: [
            { type: 'image', src: 'ui/button.png' },
          ],
        },
      },
    }, {
      readiness: { knownAssets: [], requireAssetCheck: false },
    });

    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'asset-review',
        category: 'placeholder-asset',
        code: 'placeholder-asset-reference',
        assetPath: 'characters/placeholder_sakura.png',
        pathString: 'characters.sakura.expressions.normal',
      }),
      expect.objectContaining({
        source: 'asset-review',
        category: 'placeholder-asset',
        code: 'placeholder-asset-reference',
        assetPath: 'voices/todo_line.wav',
        pathString: 'scenes.start.pages.0.dialogues.0.voice',
      }),
      expect.objectContaining({
        source: 'asset-review',
        category: 'ambiguous-asset',
        code: 'ambiguous-asset-name',
        assetPath: 'backgrounds/bg01.png',
        pathString: 'scenes.start.pages.0.background',
      }),
      expect.objectContaining({
        source: 'asset-review',
        category: 'ambiguous-asset',
        code: 'ambiguous-asset-name',
        assetPath: 'ui/button.png',
        pathString: 'ui.titleScreen.elements.0.src',
      }),
    ]));
  });
});
