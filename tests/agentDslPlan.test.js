import { describe, expect, it } from 'vitest';

import { createAgentDslPlan } from '../src/authoring/agentDslPlan.js';

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
});
