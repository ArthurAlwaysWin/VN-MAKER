import { describe, expect, it } from 'vitest';

import { formatAgentDsl } from '../src/authoring/agentDsl/formatter.js';
import { createAgentDslPlan } from '../src/authoring/agentDslPlan.js';

describe('agent DSL formatter', () => {
  it('formats P0 DSL deterministically and remains idempotent', () => {
    const source = `
# opening declarations
title   "Format Demo"
character   sakura   "Sakura" expression normal "characters/sakura.png" # inline character note

preset mood rainy_school:
    particles   rain density 0.6 opacity 0.8
    transition   dissolve 900

sequence dramatic_entrance(character, expression):
    show   $character $expression at center animation fade-in
    camera   shake medium 450

route sakura:
    affection   variable sakura_affection
    good_end   sakura_good
    normal_end sakura_normal

macro entrance(character, expression):
    show   $character $expression at center animation fade-in

scene start "Start":
    preset   mood rainy_school
    sequence   dramatic_entrance("sakura", "normal")
    bg "backgrounds/classroom.png"
    choice "Answer?":
      option "Stay" -> good:
        effect var:add affection 1
      option "Leave" -> bad
`;

    const formatted = formatAgentDsl(source, { file: 'story.dsl' });

    expect(formatted).toBe(`# opening declarations

title "Format Demo"

character sakura "Sakura" expression normal "characters/sakura.png" # inline character note

preset mood rainy_school:
  particles rain density 0.6 opacity 0.8
  transition dissolve 900

sequence dramatic_entrance(character, expression):
  show $character $expression at center animation fade-in
  camera shake medium 450

route sakura:
  affection variable sakura_affection
  good_end sakura_good
  normal_end sakura_normal

macro entrance(character, expression):
  show $character $expression at center animation fade-in

scene start "Start":
  preset mood rainy_school
  sequence dramatic_entrance("sakura", "normal")
  bg "backgrounds/classroom.png"
  choice "Answer?":
    option "Stay" -> good:
      effect var:add affection 1
    option "Leave" -> bad
`);
    expect(formatAgentDsl(formatted, { file: 'story.dsl' })).toBe(formatted);
  });

  it('keeps formatted output compatible with dsl-plan emission', () => {
    const source = `
title "Format Plan"
character sakura "Sakura"
scene start "Start":
    say sakura "Welcome."
`;

    const originalPlan = createAgentDslPlan(source);
    const formattedPlan = createAgentDslPlan(formatAgentDsl(source));

    const stableOperations = (plan) => plan.operations.map(({ command, id, params }) => ({ command, id, params }));
    expect(stableOperations(formattedPlan)).toEqual(stableOperations(originalPlan));
  });
});
