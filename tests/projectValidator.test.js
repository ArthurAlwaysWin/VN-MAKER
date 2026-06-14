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
            trueTarget: 'start',
            falseTarget: 'good',
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

  it('does not resolve object prototype keys as registered effect targets', () => {
    const script = createValidScript();
    script.systems.variables = JSON.parse('{"constructor":{"type":"number","initial":0}}');
    script.systems.endings = JSON.parse('{"__proto__":{"title":"Bad End"}}');
    script.systems.gallery.cg = JSON.parse('{"constructor":{"title":"Bad CG","image":"bad.png"}}');
    script.scenes.start.pages[1].options[0].effects = [
      { type: 'var:add', id: 'constructor', value: 1 },
      { type: 'unlock:ending', id: '__proto__' },
      { type: 'unlock:cg', id: 'constructor' },
    ];

    const report = validateProject(script);

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-variable-id' }),
      expect.objectContaining({ code: 'invalid-ending-id' }),
      expect.objectContaining({ code: 'invalid-cg-id' }),
    ]));
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unregistered-variable-effect' }),
      expect.objectContaining({ code: 'unregistered-ending-unlock' }),
      expect.objectContaining({ code: 'unregistered-cg-unlock' }),
    ]));
  });

  it('keeps branch analysis safe while reporting malformed choice containers', () => {
    const script = createValidScript();
    script.scenes.start.pages[1].options = { broken: true };

    const report = validateProject(script);

    expect(report.ok).toBe(false);
    expect(codes(report)).toContain('invalid-choice-options');
  });

  it('reports variable registry and branch GUI diagnostics for agent-authored system data', () => {
    const script = createValidScript();
    script.systems.variables['bad id'] = { type: 'number', initial: 0 };
    script.systems.variables[' affection '] = { type: 'number', initial: 0 };
    script.systems.variables.sakura_affection = {
      type: 'number',
      initial: 0,
      kind: 'affection',
      characterId: 'missing_character',
    };
    script.scenes.start.pages[1].options[0].effects = [
      { type: 'var:add', id: 'route_locked', value: 1 },
      { type: 'var:set', id: 'route_locked', value: 2 },
    ];
    script.scenes.good.pages[0] = {
      type: 'condition',
      conditionMode: 'all',
      conditions: [
        { variableId: 'route_locked', operator: '>=', value: 'maybe' },
        { variableId: 'affection', operator: '>=', value: 'many' },
      ],
      trueTarget: null,
      falseTarget: null,
    };

    const report = validateProject(script);

    expect(report.ok).toBe(false);
    expect(codes(report)).toEqual(expect.arrayContaining([
      'invalid-variable-id',
      'duplicate-variable-id',
      'affection-character-missing',
      'variable-type-mismatch',
      'condition-missing-targets',
    ]));
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'condition-missing-targets',
        pathString: 'scenes.good.pages.0',
      }),
      expect.objectContaining({
        code: 'affection-character-missing',
        pathString: 'systems.variables.sakura_affection.characterId',
      }),
    ]));
  });

  it('reports provably ineffective or deterministic condition routing', () => {
    const script = createValidScript();
    script.scenes.good.pages = [
      {
        type: 'condition',
        conditionMode: 'all',
        conditions: [
          { variableId: 'affection', operator: '>=', value: 2 },
          { variableId: 'affection', operator: '<', value: 2 },
        ],
        trueTarget: 'start',
        falseTarget: 'good',
      },
      {
        type: 'condition',
        conditionMode: 'any',
        conditions: [
          { variableId: 'route_locked', operator: '==', value: true },
          { variableId: 'route_locked', operator: '!=', value: true },
        ],
        trueTarget: 'start',
        falseTarget: 'good',
      },
      {
        type: 'condition',
        conditionMode: 'all',
        conditions: [
          { variableId: 'affection', operator: '>=', value: 1 },
          { variableId: 'affection', operator: '>=', value: 1 },
        ],
        trueTarget: 'start',
        falseTarget: 'start',
      },
    ];

    const report = validateProject(script);

    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'condition-always-false',
        pathString: 'scenes.good.pages.0',
        variableId: 'affection',
        outcome: false,
      }),
      expect.objectContaining({
        code: 'condition-always-true',
        pathString: 'scenes.good.pages.1',
        variableId: 'route_locked',
        outcome: true,
      }),
      expect.objectContaining({
        code: 'duplicate-condition-comparison',
        pathString: 'scenes.good.pages.2.conditions.1',
        variableId: 'affection',
      }),
      expect.objectContaining({
        code: 'condition-identical-targets',
        pathString: 'scenes.good.pages.2',
        target: 'start',
      }),
    ]));
  });

  it('reports ending registry and reachable unlock diagnostics', () => {
    const script = createValidScript();
    script.systems.endings = {
      good_end: {
        title: 'Good End',
        hiddenUntilUnlocked: true,
      },
      unused_end: {
        title: 'Unused End',
      },
      'bad id': {
        title: 'Bad End',
      },
    };
    script.scenes.start.pages[1].options[0].effects = [
      { type: 'unlock:ending', id: 'good_end' },
    ];

    const report = validateProject(script);

    expect(report.ok).toBe(false);
    expect(codes(report)).toEqual(expect.arrayContaining([
      'invalid-ending-id',
      'ending-never-unlocked',
      'missing-ending-thumbnail',
    ]));
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'ending-never-unlocked',
        pathString: 'systems.endings.unused_end',
        endingId: 'unused_end',
      }),
      expect.objectContaining({
        code: 'missing-ending-thumbnail',
        pathString: 'systems.endings.good_end.thumbnail',
        endingId: 'good_end',
      }),
    ]));
  });

  it('warns when no registered ending unlock is reachable', () => {
    const script = createValidScript();
    script.systems.endings = {
      secret_end: { title: 'Secret End' },
    };
    script.scenes.start.pages[1].options[0].effects = [];
    script.scenes.orphan = {
      pages: [
        {
          type: 'choice',
          prompt: 'Hidden',
          options: [
            {
              text: 'Unlock',
              effects: [{ type: 'unlock:ending', id: 'secret_end' }],
            },
          ],
        },
      ],
    };

    const report = validateProject(script);

    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'no-reachable-ending',
        pathString: 'systems.endings',
        entrySceneId: 'start',
      }),
    ]));
  });

  it('accepts reachable page-enter ending unlocks and rejects unrelated page-enter effects', () => {
    const script = createValidScript();
    script.scenes.start.pages[1].options[0].effects = [
      { type: 'unlock:cg', id: 'cg_001' },
    ];
    script.scenes.start.pages[0].effects = [
      { type: 'unlock:ending', id: 'good_end' },
    ];

    const validReport = validateProject(script);
    expect(validReport.warnings.map((issue) => issue.code)).not.toContain('ending-never-unlocked');
    expect(validReport.warnings.map((issue) => issue.code)).not.toContain('no-reachable-ending');
    expect(validReport.errors.map((issue) => issue.code)).not.toContain('unsupported-page-enter-effect');

    script.scenes.start.pages[0].effects = [
      { type: 'unlock:cg', id: 'cg_001' },
    ];
    const invalidReport = validateProject(script);
    expect(invalidReport.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unsupported-page-enter-effect',
        pathString: 'scenes.start.pages.0.effects.0.type',
      }),
    ]));
  });

  it('reports CG registry, artwork, and unlock diagnostics', () => {
    const script = createValidScript();
    script.systems.gallery.cg = {
      missing_art: { title: 'Missing Art' },
      'bad id': { title: 'Bad Id', images: ['backgrounds/cg/bad.png'], thumbnail: 'backgrounds/cg/bad.png' },
    };
    script.scenes.start.pages[1].options[0].effects = [
      { type: 'unlock:cg', id: 'unknown_cg' },
    ];

    const report = validateProject(script);

    expect(report.ok).toBe(false);
    expect(codes(report)).toEqual(expect.arrayContaining([
      'invalid-cg-id',
      'unregistered-cg-unlock',
      'missing-cg-image',
      'missing-cg-thumbnail',
      'cg-never-unlocked',
    ]));
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'missing-cg-image',
        pathString: 'systems.gallery.cg.missing_art.images',
        cgId: 'missing_art',
      }),
      expect.objectContaining({
        code: 'cg-never-unlocked',
        pathString: 'systems.gallery.cg.missing_art',
        cgId: 'missing_art',
      }),
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

  it('accepts canonical registered and direct video references', () => {
    const script = createValidScript();
    script.assets = {
      videos: {
        op_main: {
          file: 'videos/op_main.mp4',
          poster: 'videos/op_main.poster.png',
          kind: 'op',
        },
        ed_good: {
          file: 'videos/ed_good.webm',
          kind: 'ed',
        },
      },
    };
    script.ui = {
      titleScreen: {
        openingVideo: {
          videoId: ' op_main ',
          play: 'after-start',
          oncePerProfile: true,
        },
      },
    };
    script.systems.endings.good_end.endingVideo = {
      videoId: 'ed_good',
      play: 'after-unlock',
    };
    script.scenes.start.pages.unshift({
      id: 'video_prelude',
      type: 'video',
      video: {
        file: 'videos/story_intro.webm',
        poster: 'videos/story_intro.poster.png',
        fit: 'contain',
        audioMode: 'duck',
        volume: 0.8,
        skippable: true,
        controls: false,
      },
      autoAdvance: true,
      target: 'good',
    });

    const report = validateProject(script);

    expect(report.ok).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it('reports invalid video registry, references, and video page routing', () => {
    const script = createValidScript();
    script.assets = {
      videos: {
        'bad id': { file: 'videos/bad.mp4' },
        trailer: { file: 'videos/trailer.avi' },
        absolute: { file: '/videos/absolute.mp4' },
        no_file: { label: 'No File' },
      },
    };
    script.ui = {
      titleScreen: {
        openingVideo: {
          videoId: 'missing_video',
          play: 'somewhere',
        },
      },
    };
    script.systems.endings.good_end.endingVideo = {
      file: 'https://example.test/ed.mp4',
      play: 'before-unlock',
    };
    script.scenes.start.pages[0] = {
      id: 'bad_video',
      type: 'video',
      video: {
        file: 'videos/story_intro.mov',
        volume: 2,
        audioMode: 'solo',
        fit: 'stretch',
        play: 'manual',
        skippable: 'yes',
      },
      autoAdvance: true,
      loop: true,
      target: 'missing_scene',
    };

    const report = validateProject(script);

    expect(report.ok).toBe(false);
    expect(codes(report)).toEqual(expect.arrayContaining([
      'invalid-video-id',
      'missing-video-file',
      'unsupported-video-extension',
      'unknown-video-id',
      'invalid-video-play-mode',
      'unsafe-video-path',
      'invalid-video-volume',
      'invalid-video-audio-mode',
      'invalid-video-fit',
      'invalid-video-boolean',
      'missing-scene-target',
      'video-loop-auto-advance-conflict',
    ]));
  });

  it('treats missing video files as validation errors while poster gaps stay warnings', () => {
    const script = createValidScript();
    script.assets = {
      videos: {
        op_main: {
          file: 'videos/op_main.mp4',
          poster: 'videos/op_main.poster.png',
        },
      },
    };
    script.ui = {
      titleScreen: {
        openingVideo: { videoId: 'op_main' },
      },
    };

    const report = validateProject(script, {
      knownAssets: [
        'characters/sakura_normal.svg',
        'characters/sakura_smile.svg',
        'backgrounds/school.svg',
        'gallery/cg_001.png',
      ],
    });

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'missing-video-asset-reference',
        assetPath: 'videos/op_main.mp4',
      }),
    ]));
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'missing-asset-reference',
        assetKind: 'video-poster',
        assetPath: 'videos/op_main.poster.png',
      }),
    ]));
  });

  it('warns about unsupported advanced staging values while preserving runtime fallback', () => {
    const script = createValidScript();
    script.scenes.start.pages[0].camera = { effect: 'spin', durationMs: 50000, intensity: 'extreme' };
    script.scenes.start.pages[0].transition = { type: 'portal', duration: -10 };
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
      expect.objectContaining({
        code: 'invalid-transition-param',
        pathString: 'scenes.start.pages.0.camera.durationMs',
        target: 'camera',
        param: 'durationMs',
      }),
      expect.objectContaining({
        code: 'invalid-transition-param',
        pathString: 'scenes.start.pages.0.camera.intensity',
        target: 'camera',
        param: 'intensity',
      }),
      expect.objectContaining({
        code: 'invalid-transition-param',
        pathString: 'scenes.start.pages.0.transition.duration',
        target: 'background',
        param: 'duration',
      }),
    ]));
  });

  it('warns about invalid particle values without blocking export', () => {
    const script = createValidScript();
    script.scenes.start.pages[0].particles = {
      preset: 'meteor',
      density: 2,
      speed: 'fast',
      wind: -2,
      color: 'pink',
    };
    script.scenes.start.pages[1].particles = 'snow';

    const report = validateProject(script);

    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'unknown-particle-preset',
        pathString: 'scenes.start.pages.0.particles.preset',
        preset: 'meteor',
      }),
      expect.objectContaining({
        code: 'invalid-particle-density',
        pathString: 'scenes.start.pages.0.particles.density',
      }),
      expect.objectContaining({
        code: 'invalid-particle-speed',
        pathString: 'scenes.start.pages.0.particles.speed',
      }),
      expect.objectContaining({
        code: 'invalid-particle-wind',
        pathString: 'scenes.start.pages.0.particles.wind',
      }),
      expect.objectContaining({
        code: 'invalid-particle-color',
        pathString: 'scenes.start.pages.0.particles.color',
      }),
      expect.objectContaining({
        code: 'invalid-particle-config',
        pathString: 'scenes.start.pages.1.particles',
      }),
    ]));
  });

  it('warns when hidden condition pages carry particle state', () => {
    const script = createValidScript();
    script.scenes.start.pages[1] = {
      type: 'condition',
      conditionMode: 'all',
      conditions: [],
      trueTarget: null,
      falseTarget: null,
      particles: { preset: 'rain' },
    };

    const report = validateProject(script);

    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'condition-page-particles',
        pathString: 'scenes.start.pages.1.particles',
      }),
    ]));
  });

  it('accepts runtime-supported directional wipe transitions without fallback warnings', () => {
    const script = createValidScript();
    script.scenes.start.pages[0].transition = { type: 'wipe-down', duration: 700 };

    const report = validateProject(script);

    expect(codes(report)).not.toContain('unknown-transition-type');
    expect(codes(report)).not.toContain('invalid-transition-param');
  });

  it('accepts the completed M5 background transition catalog without fallback warnings', () => {
    const script = createValidScript();
    script.scenes.start.pages[0].transition = { type: 'zoom-in', duration: 700 };

    const report = validateProject(script);

    expect(codes(report)).not.toContain('unknown-transition-type');
    expect(codes(report)).not.toContain('invalid-transition-param');
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

  it('diagnoses unresolved terminal routes, closed cycles, and unreachable unlock routes', () => {
    const script = createValidScript();
    script.systems.endings.hidden_end = { title: 'Hidden End' };
    script.systems.gallery.cg.hidden_cg = {
      title: 'Hidden CG',
      images: ['backgrounds/hidden.png'],
      thumbnail: 'backgrounds/hidden.png',
    };
    script.scenes.start.pages[1].options.push(
      { text: 'Lost', target: 'dead' },
      { text: 'Loop', target: 'loop' },
    );
    script.scenes.dead = { pages: [{ type: 'normal', dialogues: [{ speaker: null, text: '...' }] }] };
    script.scenes.loop = { next: 'loop', pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'Again.' }] }] };
    script.scenes.orphan = {
      pages: [{
        type: 'choice',
        options: [{
          text: 'Hidden',
          effects: [
            { type: 'unlock:ending', id: 'hidden_end' },
            { type: 'unlock:cg', id: 'hidden_cg' },
          ],
        }],
      }],
    };

    const report = validateProject(script);

    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'dead-end-scene', pathString: 'scenes.dead' }),
      expect.objectContaining({ code: 'cycle-without-exit', pathString: 'scenes.loop' }),
      expect.objectContaining({ code: 'ending-unlock-unreachable', pathString: 'systems.endings.hidden_end' }),
      expect.objectContaining({ code: 'cg-unlock-unreachable', pathString: 'systems.gallery.cg.hidden_cg' }),
    ]));
  });
});
