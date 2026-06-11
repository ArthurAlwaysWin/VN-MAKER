import { describe, expect, it } from 'vitest';

import { createAgentDslIr, createAgentDslPlan } from '../src/authoring/agentDslPlan.js';

describe('agent DSL authoring IR', () => {
  it('lowers declarations to deterministic JSON IR', () => {
    const ir = createAgentDslIr(`
character sakura "Sakura" color "#ff99cc" expression smile "characters/sakura_smile.png"
variable affection number initial 0 label "Affection"
ending good "Good End"
cg first_smile "First Smile" image "backgrounds/cg_smile.png"
`);

    expect(JSON.parse(JSON.stringify(ir))).toEqual(ir);
    expect(ir.operations.map((operation) => operation.kind)).toEqual([
      'DeclareCharacter',
      'DeclareVariable',
      'DeclareEnding',
      'DeclareCg',
    ]);
    expect(ir.operations).toMatchObject([
      {
        stableId: 'dsl-add-character-sakura',
        payload: {
          id: 'sakura',
          name: 'Sakura',
          color: '#ff99cc',
          expressions: { smile: 'characters/sakura_smile.png' },
        },
      },
      {
        stableId: 'dsl-add-variable-affection',
        payload: {
          id: 'affection',
          type: 'number',
          initial: 0,
          label: 'Affection',
        },
      },
      {
        stableId: 'dsl-add-ending-good',
        payload: { id: 'good', title: 'Good End' },
      },
      {
        stableId: 'dsl-add-cg-first_smile',
        payload: {
          id: 'first_smile',
          title: 'First Smile',
          images: ['backgrounds/cg_smile.png'],
        },
      },
    ]);
  });

  it('lowers normal pages without retaining raw source text', () => {
    const ir = createAgentDslIr(`
character sakura "Sakura"
scene start "Start":
  page opening:
  bg "backgrounds/classroom.png"
  show sakura normal at center animation fade-in
  say sakura "Welcome." expression normal voice "voices/sakura_001.ogg"
`);

    const page = ir.operations.find((operation) => operation.kind === 'CreateNormalPage');
    expect(page).toMatchObject({
      stableId: 'dsl-add-page-start-1',
      payload: {
        scene: 'start',
        page: {
          id: 'opening',
          background: 'backgrounds/classroom.png',
          characters: [
            { id: 'sakura', expression: 'normal', position: 'center', animation: 'fade-in' },
          ],
          dialogues: [
            {
              speaker: 'sakura',
              text: 'Welcome.',
              expression: 'normal',
              voice: 'voices/sakura_001.ogg',
            },
          ],
        },
      },
    });
    expect(JSON.stringify(ir)).not.toContain('"raw"');
    expect(JSON.stringify(ir)).not.toContain('"trimmed"');
  });

  it('lowers choices and conditions to dedicated IR operations', () => {
    const ir = createAgentDslIr(`
character sakura "Sakura"
variable affection number initial 0
variable courage number initial 0
cg first_smile "First Smile" image "backgrounds/cg.png"
scene start "Start":
  choice "Answer?":
    option "Smile" -> good:
      effect var:add affection 1
      unlock cg first_smile
    option "Stay" -> neutral
  if affection >= 1 or courage >= 3 -> good else neutral
scene good "Good":
  end
scene neutral "Neutral":
  end
`);

    expect(ir.operations.map((operation) => operation.kind)).toEqual([
      'DeclareCharacter',
      'DeclareVariable',
      'DeclareVariable',
      'DeclareCg',
      'CreateScene',
      'CreateChoicePage',
      'CreateConditionPage',
      'CreateScene',
      'CreateScene',
    ]);
    expect(ir.operations.find((operation) => operation.kind === 'CreateChoicePage')).toMatchObject({
      payload: {
        scene: 'start',
        prompt: 'Answer?',
        options: [
          {
            text: 'Smile',
            target: 'good',
            effects: [
              { type: 'var:add', id: 'affection', value: 1 },
              { type: 'unlock:cg', id: 'first_smile' },
            ],
          },
          { text: 'Stay', target: 'neutral', effects: [] },
        ],
      },
    });
    expect(ir.operations.find((operation) => operation.kind === 'CreateConditionPage')).toMatchObject({
      payload: {
        scene: 'start',
        conditionMode: 'any',
        conditions: [
          { variableId: 'affection', operator: '>=', value: 1 },
          { variableId: 'courage', operator: '>=', value: 3 },
        ],
        trueTarget: 'good',
        falseTarget: 'neutral',
      },
    });
  });

  it('lowers scene next and jump while terminal end emits no extra plan operation', () => {
    const ir = createAgentDslIr(`
scene start "Start" next middle:
  say "Opening."
scene middle "Middle":
  jump ending
scene ending "Ending":
  end
`);

    expect(ir.operations.map((operation) => operation.kind)).toEqual([
      'CreateScene',
      'CreateNormalPage',
      'SetSceneNext',
      'CreateScene',
      'SetSceneNext',
      'CreateScene',
    ]);
    expect(ir.operations.filter((operation) => operation.kind === 'SetSceneNext')).toMatchObject([
      { stableId: 'dsl-set-scene-next-start', payload: { scene: 'start', next: 'middle' } },
      { stableId: 'dsl-set-scene-next-middle', payload: { scene: 'middle', next: 'ending' } },
    ]);

    const plan = createAgentDslPlan(`
scene start "Start" next middle:
  say "Opening."
scene middle "Middle":
  jump ending
scene ending "Ending":
  end
`);
    expect(plan.operations.map((operation) => operation.command)).toEqual([
      'add-scene',
      'add-page',
      'set-scene-next',
      'add-scene',
      'set-scene-next',
      'add-scene',
    ]);
  });
});
