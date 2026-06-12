import { describe, expect, it } from 'vitest';

import { AgentDslDiagnosticError } from '../src/authoring/agentDsl/diagnostics.js';
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

  it('expands mood presets into ordinary normal page IR', () => {
    const ir = createAgentDslIr(`
preset mood rainy_school:
  particles rain density 0.6 opacity 0.8
  transition dissolve 900
  camera shake low 450
scene start "Start":
  page opening:
  preset mood rainy_school
  say "Rain tapped against the glass."
`);

    expect(ir.source).toMatchObject({
      kind: 'agent-dsl',
      languageVersion: 1,
      macroCount: 0,
    });
    expect(ir.operations.map((operation) => operation.kind)).toEqual([
      'CreateScene',
      'CreateNormalPage',
    ]);
    expect(ir.operations.find((operation) => operation.kind === 'CreateNormalPage')).toMatchObject({
      stableId: 'dsl-add-page-start-1',
      payload: {
        scene: 'start',
        page: {
          id: 'opening',
          transition: { type: 'dissolve', duration: 900 },
          particles: { preset: 'rain', density: 0.6, opacity: 0.8 },
          camera: { effect: 'shake', intensity: 'low', durationMs: 450 },
          dialogues: [
            { speaker: null, text: 'Rain tapped against the glass.' },
          ],
        },
      },
    });
  });

  it('rejects unknown mood presets before IR emission', () => {
    expect(() => createAgentDslIr(`
scene start "Start":
  preset mood missing
`)).toThrow(AgentDslDiagnosticError);
    try {
      createAgentDslIr(`
scene start "Start":
  preset mood missing
`);
    } catch (error) {
      expect(error.diagnostics).toEqual([
        expect.objectContaining({
          code: 'dsl-unknown-preset',
          message: 'Preset "mood missing" is not declared.',
        }),
      ]);
    }
  });

  it('expands parameterized sequences into ordinary page IR', () => {
    const ir = createAgentDslIr(`
character sakura "Sakura"
sequence dramatic_entrance(character, expression):
  show $character $expression at center animation fade-in
  camera shake medium 450
  say $character "You came." expression $expression
scene start "Start":
  page opening:
  sequence dramatic_entrance("sakura", "smile")
`);

    expect(ir.operations.map((operation) => operation.kind)).toEqual([
      'DeclareCharacter',
      'CreateScene',
      'CreateNormalPage',
    ]);
    expect(ir.operations.find((operation) => operation.kind === 'CreateNormalPage')).toMatchObject({
      payload: {
        scene: 'start',
        page: {
          id: 'opening',
          camera: { effect: 'shake', intensity: 'medium', durationMs: 450 },
          characters: [
            { id: 'sakura', expression: 'smile', position: 'center', animation: 'fade-in' },
          ],
          dialogues: [
            { speaker: 'sakura', text: 'You came.', expression: 'smile' },
          ],
        },
      },
    });
  });

  it('expands option effect sequences into ordinary choice effects', () => {
    const ir = createAgentDslIr(`
variable affection number initial 0
sequence reward(variable, amount):
  effect var:add $variable $amount
scene start "Start":
  choice "Answer?":
    option "Smile" -> start:
      sequence reward("affection", 2)
`);

    expect(ir.operations.find((operation) => operation.kind === 'CreateChoicePage')).toMatchObject({
      payload: {
        options: [
          {
            text: 'Smile',
            target: 'start',
            effects: [
              { type: 'var:add', id: 'affection', value: 2 },
            ],
          },
        ],
      },
    });
  });

  it('rejects unknown sequences before IR emission', () => {
    expect(() => createAgentDslIr(`
scene start "Start":
  sequence missing()
`)).toThrow(AgentDslDiagnosticError);
    try {
      createAgentDslIr(`
scene start "Start":
  sequence missing()
`);
    } catch (error) {
      expect(error.diagnostics).toEqual([
        expect.objectContaining({
          code: 'dsl-unknown-sequence',
          message: 'Sequence "missing" is not declared.',
        }),
      ]);
    }
  });

  it('lowers route templates to variables, endings, and ending scenes', () => {
    const ir = createAgentDslIr(`
character sakura "Sakura"
route sakura:
  affection variable sakura_affection
  good_end sakura_good
  normal_end sakura_normal
scene start "Start":
  jump sakura_good
`);

    expect(ir.operations.map((operation) => operation.kind)).toEqual([
      'DeclareCharacter',
      'DeclareVariable',
      'DeclareEnding',
      'DeclareEnding',
      'CreateScene',
      'CreateNormalPage',
      'CreateScene',
      'CreateNormalPage',
      'CreateScene',
      'SetSceneNext',
    ]);
    expect(ir.operations.find((operation) => operation.stableId === 'dsl-add-route-affection-sakura')).toMatchObject({
      payload: { affection: true, characterId: 'sakura', id: 'sakura_affection' },
    });
    expect(ir.operations.find((operation) => operation.stableId === 'dsl-add-route-ending-sakura_good')).toMatchObject({
      payload: { id: 'sakura_good', title: 'Sakura Good End', category: 'route', hiddenUntilUnlocked: true },
    });
    expect(ir.operations.find((operation) => operation.stableId === 'dsl-add-route-page-sakura_good')).toMatchObject({
      payload: {
        scene: 'sakura_good',
        page: {
          dialogues: [{ speaker: null, text: 'Sakura Good End', expression: null, voice: null }],
          effects: [{ type: 'unlock:ending', id: 'sakura_good' }],
        },
      },
    });
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
