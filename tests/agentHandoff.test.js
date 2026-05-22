import { describe, expect, it } from 'vitest';

import { createAgentHandoff } from '../src/authoring/agentHandoff.js';

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
