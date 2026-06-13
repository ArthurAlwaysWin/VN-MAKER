import { describe, expect, it } from 'vitest';

import { createAgentDslPlan } from '../src/authoring/agentDslPlan.js';

const DSL_ALLOWED_APPLY_PLAN_COMMANDS = new Set([
  'add-character',
  'add-variable',
  'add-affection-variable',
  'add-ending',
  'add-cg',
  'add-scene',
  'set-scene-next',
  'add-page',
]);

describe('agent DSL plan compiler', () => {
  it('compiles macro-based agent authoring text into an apply-plan manifest', () => {
    const plan = createAgentDslPlan(`
title "Agent Script Demo"

character sakura "Sakura" color "#ff99cc" expression normal "characters/sakura_normal.png" expression smile "characters/sakura_smile.png"
variable affection number initial 0 label "Affection"
ending good "Good End"
cg first_smile "First Smile" image "backgrounds/cg_smile.png"

macro entrance(character, expression):
  show $character $expression at center animation fade-in
  camera shake medium 450

scene start "Start":
  page opening:
  bg "backgrounds/classroom.png"
  bgm "audio/theme.ogg" volume 0.7
  call entrance("sakura", "smile")
  say "The classroom grew quiet."
  say sakura "You came." expression smile voice "voices/sakura_001.ogg"
  choice "How do you answer?":
    option "Smile back" -> good:
      effect var:add affection 1
      unlock cg first_smile
    option "Look away" -> neutral:
      effect var:sub affection 1
  if affection >= 1 -> good else neutral

scene good "Good":
  end

scene neutral "Neutral":
  end
`);

    expect(plan).toMatchObject({
      version: 1,
      title: 'Agent Script Demo',
      source: {
        kind: 'agent-dsl',
        macroCount: 1,
      },
    });
    expect(plan.operations.map((operation) => operation.command)).toEqual([
      'add-character',
      'add-variable',
      'add-ending',
      'add-cg',
      'add-scene',
      'add-page',
      'add-page',
      'add-page',
      'add-scene',
      'add-scene',
    ]);

    const normalPage = plan.operations.find((operation) => operation.id === 'dsl-add-page-start-1');
    expect(normalPage.params.page).toMatchObject({
      id: 'opening',
      background: 'backgrounds/classroom.png',
      bgm: { file: 'audio/theme.ogg', volume: 0.7 },
      camera: { effect: 'shake', intensity: 'medium', durationMs: 450 },
      characters: [
        { id: 'sakura', expression: 'smile', position: 'center', animation: 'fade-in' },
      ],
      dialogues: [
        { speaker: null, text: 'The classroom grew quiet.' },
        {
          speaker: 'sakura',
          text: 'You came.',
          expression: 'smile',
          voice: 'voices/sakura_001.ogg',
        },
      ],
    });

    const choicePage = plan.operations.find((operation) => operation.id === 'dsl-add-choice-start-2');
    expect(choicePage.params.options).toEqual([
      {
        text: 'Smile back',
        target: 'good',
        effects: [
          { type: 'var:add', id: 'affection', value: 1 },
          { type: 'unlock:cg', id: 'first_smile' },
        ],
      },
      {
        text: 'Look away',
        target: 'neutral',
        effects: [
          { type: 'var:sub', id: 'affection', value: 1 },
        ],
      },
    ]);

    const conditionPage = plan.operations.find((operation) => operation.id === 'dsl-add-condition-start-3');
    expect(conditionPage.params).toMatchObject({
      scene: 'start',
      type: 'condition',
      conditionMode: 'all',
      trueTarget: 'good',
      falseTarget: 'neutral',
      conditions: [{ variableId: 'affection', operator: '>=', value: 1 }],
    });
  });

  it('emits mood presets as ordinary add-page data', () => {
    const plan = createAgentDslPlan(`
title "Preset Demo"
preset mood rainy_school:
  particles rain density 0.6 opacity 0.8
  transition dissolve 900
  camera shake low 450
scene start "Start":
  page opening:
  preset mood rainy_school
  say "Rain tapped against the glass."
`);

    expect(plan.operations.map((operation) => operation.command)).toEqual([
      'add-scene',
      'add-page',
    ]);
    expect(plan.operations[1]).toMatchObject({
      id: 'dsl-add-page-start-1',
      command: 'add-page',
      params: {
        scene: 'start',
        type: 'normal',
        page: {
          id: 'opening',
          transition: { type: 'dissolve', duration: 900 },
          particles: { preset: 'rain', density: 0.6, opacity: 0.8 },
          camera: { effect: 'shake', intensity: 'low', durationMs: 450 },
        },
      },
    });
  });

  it('emits reusable sequences as ordinary add-page data', () => {
    const plan = createAgentDslPlan(`
character sakura "Sakura"
sequence dramatic_entrance(character, expression):
  show $character $expression at center animation fade-in
  camera shake medium 450
scene start "Start":
  sequence dramatic_entrance("sakura", "smile")
`);

    expect(plan.operations.map((operation) => operation.command)).toEqual([
      'add-character',
      'add-scene',
      'add-page',
    ]);
    expect(plan.operations[2]).toMatchObject({
      id: 'dsl-add-page-start-1',
      command: 'add-page',
      params: {
        scene: 'start',
        type: 'normal',
        page: {
          characters: [
            { id: 'sakura', expression: 'smile', position: 'center', animation: 'fade-in' },
          ],
          camera: { effect: 'shake', intensity: 'medium', durationMs: 450 },
        },
      },
    });
  });

  it('emits route templates as existing apply-plan operations', () => {
    const plan = createAgentDslPlan(`
character sakura "Sakura"
route sakura:
  affection variable sakura_affection
  good_end sakura_good
  normal_end sakura_normal
`);

    expect(plan.operations.map((operation) => operation.command)).toEqual([
      'add-character',
      'add-affection-variable',
      'add-ending',
      'add-ending',
      'add-scene',
      'add-page',
      'add-scene',
      'add-page',
    ]);
    expect(plan.operations.find((operation) => operation.id === 'dsl-add-route-page-sakura_good')).toMatchObject({
      command: 'add-page',
      params: {
        scene: 'sakura_good',
        type: 'normal',
        page: {
          effects: [{ type: 'unlock:ending', id: 'sakura_good' }],
        },
      },
    });
  });

  it('emits only apply-plan operation fields and whitelisted commands', () => {
    const plan = createAgentDslPlan(`
title "Whitelist Demo"
character sakura "Sakura" expression normal "characters/sakura_normal.png"
variable affection number initial 0
ending good "Good End"
cg smile "Smile" image "backgrounds/smile.png"
scene start "Start":
  say sakura "Welcome."
  if affection >= 1 -> good else start
scene good "Good":
  end
`);

    for (const operation of plan.operations) {
      expect(Object.keys(operation).sort()).toEqual(['command', 'id', 'params', 'provenance']);
      expect(DSL_ALLOWED_APPLY_PLAN_COMMANDS.has(operation.command)).toBe(true);
      expect(operation.provenance.sourceMapId).toMatch(/^map-\d{5}$/);
      expect(operation).not.toHaveProperty('script');
      expect(operation).not.toHaveProperty('sourceMap');
      expect(operation).not.toHaveProperty('runtime');
      expect(operation).not.toHaveProperty('js');
      expect(operation).not.toHaveProperty('css');
      expect(operation).not.toHaveProperty('html');
      expect(operation).not.toHaveProperty('shader');
      expect(operation).not.toHaveProperty('plugin');
    }
  });
});
