import { describe, expect, it } from 'vitest';

import { validateProject } from '../src/shared/projectValidator.js';

function createValidScript(overrides = {}) {
  return {
    projectId: 'gm_test_project',
    contractVersion: 1,
    characters: {
      sakura: {
        name: 'Sakura',
        expressions: {
          normal: 'characters/sakura_normal.svg',
          smile: 'characters/sakura_smile.svg',
        },
      },
    },
    systems: {
      variables: {
        affection: { type: 'number', initial: 0 },
        route_locked: { type: 'bool', initial: false },
      },
      endings: {
        good_end: { title: 'Good End' },
      },
      gallery: {
        cg: {
          cg_001: { title: 'CG 001', image: 'gallery/cg_001.png' },
        },
      },
    },
    scenes: {
      start: {
        name: 'Start',
        next: 'good',
        pages: [
          {
            id: 'p1',
            type: 'normal',
            background: 'backgrounds/school.svg',
            characters: [
              { id: 'sakura', expression: 'smile', position: 'center', scale: 1 },
            ],
            dialogues: [
              { speaker: 'sakura', text: 'Hello.', expression: 'normal' },
            ],
          },
          {
            id: 'p2',
            type: 'choice',
            prompt: 'Go?',
            options: [
              {
                text: 'Yes',
                target: 'good',
                effects: [
                  { type: 'var:add', id: 'affection', value: 1 },
                  { type: 'unlock:ending', id: 'good_end' },
                  { type: 'unlock:cg', id: 'cg_001' },
                ],
              },
            ],
          },
        ],
      },
      good: {
        name: 'Good',
        pages: [
          {
            id: 'p1',
            type: 'condition',
            conditionMode: 'all',
            conditions: [
              { variableId: 'affection', operator: '>=', value: 1 },
              { variableId: 'route_locked', operator: '==', value: false },
            ],
            trueTarget: null,
            falseTarget: null,
          },
        ],
      },
    },
    ...overrides,
  };
}

function codes(report) {
  return [
    ...report.errors.map((issue) => issue.code),
    ...report.warnings.map((issue) => issue.code),
  ];
}

describe('project validator', () => {
  it('accepts a canonical page-based project', () => {
    const report = validateProject(createValidScript());

    expect(report.ok).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it('reports broken scene, character, expression, and variable references', () => {
    const script = createValidScript();
    script.scenes.start.next = 'missing_next';
    script.scenes.start.pages[0].characters[0].id = 'missing_character';
    script.scenes.start.pages[0].dialogues[0].speaker = 'missing_speaker';
    script.scenes.start.pages[1].options[0].target = 'missing_target';
    script.scenes.good.pages[0].conditions[0].variableId = 'missing_variable';

    const report = validateProject(script);

    expect(report.ok).toBe(false);
    expect(codes(report)).toEqual(expect.arrayContaining([
      'missing-scene-target',
      'missing-page-character',
      'missing-dialogue-speaker',
      'unregistered-condition-variable',
    ]));
  });

  it('keeps invalid effects as errors and unregistered unlocks as warnings', () => {
    const script = createValidScript();
    script.scenes.start.pages[1].options[0].effects = [
      { type: 'var:mul', id: 'affection', value: 2 },
    ];

    const invalidReport = validateProject(script);
    expect(invalidReport.ok).toBe(false);
    expect(codes(invalidReport)).toContain('invalid-effects');

    script.scenes.start.pages[1].options[0].effects = [
      { type: 'var:add', id: 'unknown_variable', value: 1 },
      { type: 'unlock:ending', id: 'missing_end' },
      { type: 'unlock:cg', id: 'missing_cg' },
    ];

    const warningReport = validateProject(script);
    expect(warningReport.ok).toBe(true);
    expect(codes(warningReport)).toEqual(expect.arrayContaining([
      'unregistered-variable-effect',
      'unregistered-ending-unlock',
      'unregistered-cg-unlock',
    ]));
  });

  it('warns on missing projectId, empty pages, and long dialogue text', () => {
    const script = createValidScript({
      projectId: '',
      scenes: {
        start: {
          name: 'Start',
          pages: [
            {
              type: 'normal',
              characters: [],
              dialogues: [
                { speaker: null, text: 'x'.repeat(121) },
              ],
            },
          ],
        },
        empty_scene: {
          name: 'Empty',
          pages: [],
        },
      },
    });

    const report = validateProject(script);

    expect(report.ok).toBe(true);
    expect(codes(report)).toEqual(expect.arrayContaining([
      'missing-project-id',
      'long-dialogue-text',
      'empty-scene-pages',
    ]));
  });

  it('optionally warns when referenced assets are not in the known asset set', () => {
    const script = createValidScript();
    script.scenes.start.pages[0].bgm = { file: 'audio/theme.mp3' };
    script.scenes.start.pages[0].se = { file: 'audio/click.wav' };
    script.scenes.start.pages[0].dialogues[0].voice = 'voices/sakura_001.ogg';

    const report = validateProject(script, {
      knownAssets: [
        'characters/sakura_normal.svg',
        'characters/sakura_smile.svg',
        'backgrounds/school.svg',
        'audio/theme.mp3',
      ],
    });

    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'missing-asset-reference',
        assetKind: 'se',
        assetPath: 'audio/click.wav',
      }),
      expect.objectContaining({
        code: 'missing-asset-reference',
        assetKind: 'voice',
        assetPath: 'voices/sakura_001.ogg',
      }),
    ]));
  });

  it('warns about unsupported advanced staging values while preserving runtime fallback', () => {
    const script = createValidScript();
    script.scenes.start.pages[0].camera = { effect: 'spin', durationMs: 300 };
    script.scenes.start.pages[0].transition = { type: 'portal', duration: 800 };
    script.scenes.start.pages[0].characters[0].animation = 'moonwalk';

    const report = validateProject(script);

    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unknown-camera-effect',
        pathString: 'scenes.start.pages.0.camera.effect',
        effect: 'spin',
      }),
      expect.objectContaining({
        code: 'unknown-transition-type',
        pathString: 'scenes.start.pages.0.transition.type',
        transitionType: 'portal',
      }),
      expect.objectContaining({
        code: 'unknown-character-animation',
        pathString: 'scenes.start.pages.0.characters.0.animation',
        animation: 'moonwalk',
      }),
    ]));
  });

  it('warns about scenes that cannot be reached from the entry scene', () => {
    const script = createValidScript();
    script.scenes.orphan = {
      name: 'Orphan',
      pages: [
        {
          type: 'normal',
          background: 'backgrounds/school.svg',
          dialogues: [{ speaker: null, text: 'Nobody gets here.' }],
        },
      ],
    };

    const report = validateProject(script);

    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual([
      expect.objectContaining({
        code: 'unreachable-scene',
        sceneId: 'orphan',
        entrySceneId: 'start',
        pathString: 'scenes.orphan',
      }),
    ]);
  });

  it('can disable scene reachability warnings for partial drafts', () => {
    const script = createValidScript();
    script.scenes.orphan = {
      name: 'Orphan',
      pages: [],
    };

    const report = validateProject(script, { checkReachability: false });

    expect(codes(report)).not.toContain('unreachable-scene');
  });
});
