import { describe, expect, it } from 'vitest';

import { createAgentDslSkeleton } from '../src/authoring/agentDsl/skeleton.js';
import { createAgentDslPlan } from '../src/authoring/agentDslPlan.js';

describe('agent DSL skeleton generator', () => {
  it('creates P7.1 starter source from project declarations and normal dialogue pages', () => {
    const { source, report } = createAgentDslSkeleton({
      title: 'Skeleton Demo',
      characters: {
        sakura: {
          name: 'Sakura',
          color: '#ff99cc',
          expressions: {
            normal: 'characters/sakura_normal.png',
            smile: 'characters/sakura_smile.png',
          },
        },
      },
      systems: {
        variables: {
          affection: { type: 'number', initial: 2, label: 'Affection' },
        },
        endings: {
          good_end: { title: 'Good End', category: 'main', thumbnail: 'ui/endings/good.png' },
        },
        gallery: {
          cg: {
            first_smile: {
              title: 'First Smile',
              images: ['gallery/first_smile.png'],
              thumbnail: 'gallery/first_smile_thumb.png',
            },
          },
        },
      },
      scenes: {
        start: {
          name: 'Start',
          pages: [
            {
              id: 'opening',
              type: 'normal',
              dialogues: [
                { speaker: null, text: 'The morning bell rang.' },
                { speaker: 'sakura', text: 'You came.', expression: 'smile', voice: 'voices/sakura_001.ogg' },
              ],
            },
          ],
        },
      },
    });

    expect(source).toContain('# Generated Agent DSL starter source.');
    expect(source).toContain('title "Skeleton Demo"');
    expect(source).toContain('character sakura "Sakura" color "#ff99cc" expression normal "characters/sakura_normal.png" expression smile "characters/sakura_smile.png"');
    expect(source).toContain('variable affection number initial 2 label "Affection"');
    expect(source).toContain('ending good_end "Good End" category "main" thumbnail "ui/endings/good.png"');
    expect(source).toContain('cg first_smile "First Smile" image "gallery/first_smile.png" thumbnail "gallery/first_smile_thumb.png" category "main"');
    expect(source).toContain('scene start "Start":');
    expect(source).toContain('  page opening:');
    expect(source).toContain('  narrate "The morning bell rang."');
    expect(source).toContain('  say sakura "You came." expression smile voice "voices/sakura_001.ogg"');
    expect(report).toMatchObject({
      declarations: {
        characters: 1,
        variables: 1,
        endings: 1,
        cgs: 1,
        scenes: 1,
        normalPages: 1,
        dialogues: 2,
      },
      warningCount: 0,
      sourceMapCreated: false,
    });

    const plan = createAgentDslPlan(source);
    expect(plan.operations.map((operation) => operation.command)).toEqual([
      'add-character',
      'add-variable',
      'add-ending',
      'add-cg',
      'add-scene',
      'add-page',
    ]);
  });

  it('creates P7.2 choice pages, option effects, and scene next routes', () => {
    const { source, report } = createAgentDslSkeleton({
      title: 'Branching Data',
      characters: {
        sakura: { name: 'Sakura' },
      },
      systems: {
        variables: {
          affection: { type: 'number', initial: 0 },
          route_locked: { type: 'bool', initial: false },
        },
        endings: {
          good: { title: 'Good End' },
        },
        gallery: {
          cg: {
            smile: { title: 'Smile', images: ['gallery/smile.png'] },
          },
        },
      },
      scenes: {
        start: {
          name: 'Start',
          next: 'ending',
          pages: [
            {
              type: 'normal',
              background: 'backgrounds/room.png',
              dialogues: [{ speaker: null, text: 'Look around.' }],
              effects: [{ type: 'unlock:ending', id: 'good' }],
            },
            {
              type: 'choice',
              prompt: 'Go?',
              options: [
                {
                  text: 'Yes',
                  target: 'ending',
                  effects: [
                    { type: 'var:add', id: 'affection', value: 1 },
                    { type: 'var:set', id: 'route_locked', value: true },
                    { type: 'unlock:ending', id: 'good' },
                    { type: 'unlock:cg', id: 'smile' },
                  ],
                },
                {
                  text: 'Wait',
                  target: null,
                  setVariable: { affection: -1 },
                },
              ],
            },
          ],
        },
        ending: {
          name: 'Ending',
          pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'Done.' }] }],
        },
      },
    });

    expect(source).toContain('scene start "Start" next ending:');
    expect(source).toContain('# P7.1 skeleton omitted supported-later normal page fields at scenes.start.pages.0: background, effects.');
    expect(source).toContain('  choice "Go?":');
    expect(source).toContain('    option "Yes" -> ending:');
    expect(source).toContain('      effect var:add affection 1');
    expect(source).toContain('      effect var:set route_locked true');
    expect(source).toContain('      unlock ending good');
    expect(source).toContain('      unlock cg smile');
    expect(source).toContain('    option "Wait":');
    expect(source).toContain('      effect var:sub affection 1');
    expect(report).toMatchObject({
      declarations: {
        choicePages: 1,
        choiceOptions: 2,
        effects: 5,
        sceneNext: 1,
      },
      warningCount: 1,
      unsupportedCount: 0,
      lossyCount: 1,
      sourceMapCreated: false,
    });
    const plan = createAgentDslPlan(source);
    expect(plan.operations.map((operation) => operation.command)).toEqual([
      'add-character',
      'add-variable',
      'add-variable',
      'add-ending',
      'add-cg',
      'add-scene',
      'add-page',
      'add-page',
      'set-scene-next',
      'add-scene',
      'add-page',
    ]);
    expect(plan.operations.find((operation) => operation.id === 'dsl-add-choice-start-2')).toMatchObject({
      params: {
        prompt: 'Go?',
        options: [
          {
            text: 'Yes',
            target: 'ending',
            effects: [
              { type: 'var:add', id: 'affection', value: 1 },
              { type: 'var:set', id: 'route_locked', value: true },
              { type: 'unlock:ending', id: 'good' },
              { type: 'unlock:cg', id: 'smile' },
            ],
          },
          {
            text: 'Wait',
            target: null,
            effects: [{ type: 'var:sub', id: 'affection', value: 1 }],
          },
        ],
      },
    });
  });

  it('reports unsupported and lossy project data as comments', () => {
    const { source, report } = createAgentDslSkeleton({
      title: 'Deferred Data',
      characters: {},
      scenes: {
        start: {
          name: 'Start',
          pages: [
            {
              type: 'normal',
              background: 'backgrounds/room.png',
              dialogues: [{ speaker: null, text: 'Look around.' }],
              effects: [{ type: 'unlock:ending', id: 'good' }],
            },
            {
              type: 'condition',
              conditionMode: 'all',
              conditions: [],
              trueTarget: null,
              falseTarget: null,
            },
            {
              type: 'choice',
              prompt: 'Empty?',
              options: [],
            },
          ],
        },
      },
    });

    expect(source).toContain('# P7.1 skeleton omitted supported-later normal page fields at scenes.start.pages.0: background, effects.');
    expect(source).toContain('# P7.2 skeleton did not convert condition page at scenes.start.pages.1.');
    expect(source).toContain('# P7.2 skeleton did not convert empty choice page at scenes.start.pages.2.');
    expect(report).toMatchObject({
      warningCount: 3,
      unsupportedCount: 2,
      lossyCount: 1,
      sourceMapCreated: false,
    });
    expect(report.warnings.map((warning) => warning.path)).toEqual([
      'scenes.start.pages.0',
      'scenes.start.pages.1',
      'scenes.start.pages.2',
    ]);
    expect(() => createAgentDslPlan(source)).not.toThrow();
  });
});
