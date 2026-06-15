import { describe, expect, it } from 'vitest';

import {
  checkAgentDslSourceMapStaleness,
  enrichAgentDslSourceMapWithApplyResult,
} from '../src/authoring/agentDsl/sourceMap.js';
import { createAgentDslBuildArtifacts } from '../src/authoring/agentDslPlan.js';

function createGeneratedScript() {
  return {
    projectId: 'gm_agent_dsl_source_map',
    characters: {
      sakura: {
        name: 'Sakura',
        color: '#ffffff',
        expressions: {},
      },
    },
    scenes: {
      start: {
        name: 'Start',
        next: null,
        pages: [
          {
            type: 'choice',
            background: '',
            characters: [],
            bgm: null,
            se: null,
            prompt: 'Where next?',
            options: [
              { text: 'Stay', target: 'start', effects: [] },
              { text: 'Go', target: 'good', effects: [] },
            ],
            transition: { type: 'fade', duration: 800 },
          },
        ],
      },
      good: {
        name: 'Good',
        next: null,
        pages: [],
      },
    },
    systems: {
      variables: {},
      endings: {},
      gallery: { cg: {} },
    },
  };
}

describe('agent DSL source maps', () => {
  it('maps source spans to plan operations and project paths', () => {
    const { plan, sourceMap } = createAgentDslBuildArtifacts(`
character sakura "Sakura"
variable affection number initial 0
scene start "Start":
  say sakura "Welcome."
  if affection >= 1 -> good else start
scene good "Good":
  end
`, { file: 'agent-src/main.gmdsl' });

    expect(sourceMap).toMatchObject({
      version: 1,
      compiler: 'agent-dsl',
      languageVersion: 1,
      sources: [
        {
          id: 'src-00001',
          path: 'agent-src/main.gmdsl',
        },
      ],
    });
    expect(sourceMap.sources[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(sourceMap.mappings).toHaveLength(plan.operations.length);

    const sceneMapping = sourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-add-scene-start');
    expect(sceneMapping).toMatchObject({
      id: 'map-00003',
      sourceId: 'src-00001',
      astKind: 'scene',
      irStableId: 'dsl-add-scene-start',
      projectPaths: ['scenes.start'],
    });
    expect(sceneMapping.span.start).toMatchObject({ line: 4, column: 1 });
    expect(sceneMapping.fingerprint.source).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(sceneMapping.fingerprint.emitted).toMatch(/^sha256:[a-f0-9]{64}$/);

    const conditionMapping = sourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-add-condition-start-2');
    expect(conditionMapping).toMatchObject({
      astKind: 'condition',
      projectPaths: ['scenes.start.pages.1'],
    });
    expect(plan.operations.find((operation) => operation.id === conditionMapping.operationId).provenance).toMatchObject({
      sourceMapId: conditionMapping.id,
      sourceId: 'agent-src/main.gmdsl:6:3',
    });
  });

  it('maps video DSL operations to canonical video project paths', () => {
    const { plan, sourceMap } = createAgentDslBuildArtifacts(`
video op_main "videos/op_main.mp4" label "Main OP" kind op
video ed_good "videos/ed_good.webm" label "Good ED" kind ed
ending good_end "Good End"
opening video op_main play after-start oncePerProfile true
ending_video good_end ed_good play manual
scene start "Start":
  video op_main target after_video autoAdvance true
scene after_video "After Video":
  end
`, { file: 'agent-src/video.gmdsl' });

    expect(plan.operations.map((operation) => operation.command)).toEqual([
      'add-video',
      'add-video',
      'add-ending',
      'set-opening-video',
      'set-ending-video',
      'add-scene',
      'add-page',
      'add-scene',
    ]);
    expect(sourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-add-video-op_main')).toMatchObject({
      astKind: 'video',
      projectPaths: ['assets.videos.op_main'],
    });
    expect(sourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-set-opening-video')).toMatchObject({
      astKind: 'opening-video',
      projectPaths: ['ui.titleScreen.openingVideo'],
    });
    expect(sourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-set-ending-video-good_end')).toMatchObject({
      astKind: 'ending-video',
      projectPaths: ['systems.endings.good_end.endingVideo'],
    });
    expect(sourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-add-video-page-start-1')).toMatchObject({
      astKind: 'video-page',
      projectPaths: ['scenes.start.pages.0.video'],
    });
  });

  it('enriches mapping project paths from apply-plan operation results', () => {
    const { sourceMap } = createAgentDslBuildArtifacts(`
character sakura "Sakura"
scene start "Start":
  choice "Where next?":
    option "Stay" -> start
    option "Go" -> good
scene good "Good":
  end
`, { file: 'agent-src/main.gmdsl' });
    const originalChoiceMapping = sourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-add-choice-start-1');

    const enriched = enrichAgentDslSourceMapWithApplyResult(sourceMap, {
      project: createGeneratedScript(),
      operations: [
        {
          id: 'dsl-add-choice-start-1',
          changedPaths: [
            'scenes.start.pages.0',
            ' scenes.start.pages.0.options.1 ',
            'scenes.start.pages.0.options.1',
          ],
        },
        {
          id: 'dsl-add-scene-good',
          changedPaths: ['scenes.good'],
        },
        {
          id: 'not-from-this-map',
          changedPaths: ['scenes.unused'],
        },
      ],
    });

    expect(sourceMap.mappings.find((mapping) => mapping.operationId === 'dsl-add-choice-start-1')).toBe(originalChoiceMapping);
    expect(originalChoiceMapping.projectPaths).toEqual(['scenes.start.pages.0']);
    expect(enriched.mappings.find((mapping) => mapping.operationId === 'dsl-add-choice-start-1').projectPaths).toEqual([
      'scenes.start.pages.0',
      'scenes.start.pages.0.options.1',
    ]);
    expect(enriched.mappings.find((mapping) => mapping.operationId === 'dsl-add-choice-start-1').fingerprint.generated).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(enriched.mappings.find((mapping) => mapping.operationId === 'dsl-add-scene-good').projectPaths).toEqual([
      'scenes.good',
    ]);
    expect(enriched.mappings.find((mapping) => mapping.operationId === 'dsl-add-scene-start').projectPaths).toEqual([
      'scenes.start',
    ]);
  });

  it('detects stale generated project paths without flagging unrelated edits', () => {
    const { sourceMap } = createAgentDslBuildArtifacts(`
character sakura "Sakura"
scene start "Start":
  choice "Where next?":
    option "Stay" -> start
    option "Go" -> good
scene good "Good":
  end
`, { file: 'agent-src/main.gmdsl' });
    const generatedScript = createGeneratedScript();
    const enriched = enrichAgentDslSourceMapWithApplyResult(sourceMap, {
      project: generatedScript,
      operations: [
        { id: 'dsl-add-character-sakura', changedPaths: ['characters.sakura'] },
        { id: 'dsl-add-scene-start', changedPaths: ['scenes.start'] },
        { id: 'dsl-add-choice-start-1', changedPaths: ['scenes.start.pages.0'] },
        { id: 'dsl-add-scene-good', changedPaths: ['scenes.good'] },
      ],
    });
    const enrichedAgain = enrichAgentDslSourceMapWithApplyResult(sourceMap, {
      project: generatedScript,
      operations: [
        { id: 'dsl-add-character-sakura', changedPaths: ['characters.sakura'] },
        { id: 'dsl-add-scene-start', changedPaths: ['scenes.start'] },
        { id: 'dsl-add-choice-start-1', changedPaths: ['scenes.start.pages.0'] },
        { id: 'dsl-add-scene-good', changedPaths: ['scenes.good'] },
      ],
    });
    expect(enrichedAgain).toEqual(enriched);

    const unchanged = checkAgentDslSourceMapStaleness(enriched, generatedScript);
    expect(unchanged.ok).toBe(true);
    expect(unchanged.staleCount).toBe(0);
    expect(unchanged.mappings.find((mapping) => mapping.operationId === 'dsl-add-choice-start-1')).toMatchObject({
      status: 'safe',
      stale: false,
    });

    const unrelatedEdit = {
      ...createGeneratedScript(),
      ui: {
        titleScreen: { title: 'Human polish outside generated paths' },
      },
    };
    expect(checkAgentDslSourceMapStaleness(enriched, unrelatedEdit).ok).toBe(true);

    const editedPage = createGeneratedScript();
    editedPage.scenes.start.pages[0].prompt = 'Human-edited prompt';
    const editedCheck = checkAgentDslSourceMapStaleness(enriched, editedPage);
    expect(editedCheck.ok).toBe(false);
    expect(editedCheck.staleMappings.find((mapping) => mapping.operationId === 'dsl-add-choice-start-1')).toMatchObject({
      status: 'stale',
      projectPaths: ['scenes.start.pages.0'],
    });

    const deletedScene = createGeneratedScript();
    delete deletedScene.scenes.start;
    const deletedCheck = checkAgentDslSourceMapStaleness(enriched, deletedScene);
    expect(deletedCheck.ok).toBe(false);
    expect(deletedCheck.staleMappings.find((mapping) => mapping.operationId === 'dsl-add-scene-start')).toMatchObject({
      status: 'missing',
      missingPaths: ['scenes.start'],
    });
  });

  it('marks source maps without generated fingerprints as untracked', () => {
    const { sourceMap } = createAgentDslBuildArtifacts(`
character sakura "Sakura"
scene start "Start":
  say sakura "Welcome."
`, { file: 'agent-src/main.gmdsl' });

    const untracked = checkAgentDslSourceMapStaleness(sourceMap, {
      projectId: 'gm_agent_dsl_untracked_source_map',
      characters: {
        sakura: { name: 'Sakura', expressions: {} },
      },
      scenes: {
        start: {
          name: 'Start',
          pages: [
            {
              type: 'normal',
              dialogues: [{ speaker: 'sakura', text: 'Welcome.' }],
            },
          ],
        },
      },
    });

    expect(untracked.ok).toBe(false);
    expect(untracked.staleCount).toBe(sourceMap.mappings.length);
    expect(untracked.staleMappings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        operationId: 'dsl-add-character-sakura',
        status: 'untracked',
        stale: true,
      }),
      expect.objectContaining({
        operationId: 'dsl-add-page-start-1',
        status: 'untracked',
        stale: true,
      }),
    ]));
  });
});
