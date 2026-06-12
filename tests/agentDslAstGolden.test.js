import { describe, expect, it } from 'vitest';

import { parseAgentDsl } from '../src/authoring/agentDsl/parser.js';

function summarize(node) {
  if (!node || typeof node !== 'object') return node;
  const summary = {
    kind: node.kind,
    line: node.span?.start?.line,
  };
  if (node.id) summary.id = node.id;
  if (node.value) summary.value = node.value;
  if (node.params) summary.params = node.params;
  if (node.body) summary.body = node.body.map(summarize);
  if (node.options) summary.options = node.options.map(summarize);
  return summary;
}

describe('agent DSL AST golden fixtures', () => {
  it('covers the P0 grammar surface with stable node kinds and spans', () => {
    const result = parseAgentDsl(`
title "Golden"
character sakura "Sakura" color "#ff99cc" expression normal "characters/sakura.png"
variable affection number initial 0 label "Affection"
affection sakura sakura_affection
ending good "Good End"
cg first_smile "First Smile" image "backgrounds/cg.png"
preset mood rainy_school:
  particles rain density 0.6 opacity 0.8
  transition dissolve 900
macro entrance(character, expression):
  show $character $expression at center animation fade-in
  camera shake medium 450
scene start "Start" next fallback:
  page opening:
  preset mood rainy_school
  background "backgrounds/classroom.png"
  transition fade 500
  bgm "audio/theme.ogg" volume 0.7
  se "audio/bell.ogg"
  call entrance("sakura", "normal")
  narrate "The bell rings."
  say sakura "Welcome." expression normal voice "voices/sakura.ogg"
  particles dust density 0.4
  choice "Answer?":
    option "Stay" -> good:
      unlock ending good
    option "Leave" -> fallback
  if affection >= 1 -> good else fallback
  jump fallback
scene fallback "Fallback":
  end
`, { file: 'golden.dsl' });

    expect(result.ok).toBe(true);
    expect(result.ast.body.map(summarize)).toEqual([
      { kind: 'TitleDeclaration', line: 2, value: 'Golden' },
      { kind: 'CharacterDeclaration', line: 3, id: 'sakura' },
      { kind: 'VariableDeclaration', line: 4, id: 'affection' },
      { kind: 'AffectionDeclaration', line: 5, id: 'sakura' },
      { kind: 'EndingDeclaration', line: 6, id: 'good' },
      { kind: 'CgDeclaration', line: 7, id: 'first_smile' },
      {
        kind: 'PresetDeclaration',
        line: 8,
        id: 'rainy_school',
        body: [
          { kind: 'ParticlesStatement', line: 9 },
          { kind: 'TransitionStatement', line: 10 },
        ],
      },
      {
        kind: 'MacroDeclaration',
        line: 11,
        id: 'entrance',
        params: ['character', 'expression'],
        body: [
          { kind: 'ShowStatement', line: 12 },
          { kind: 'CameraStatement', line: 13 },
        ],
      },
      {
        kind: 'SceneDeclaration',
        line: 14,
        id: 'start',
        body: [
          { kind: 'PageStatement', line: 15, id: 'opening' },
          { kind: 'PresetUseStatement', line: 16, id: 'rainy_school' },
          { kind: 'BackgroundStatement', line: 17 },
          { kind: 'TransitionStatement', line: 18 },
          { kind: 'BgmStatement', line: 19 },
          { kind: 'SeStatement', line: 20 },
          { kind: 'MacroCall', line: 21, id: 'entrance' },
          { kind: 'NarrateStatement', line: 22 },
          { kind: 'SayStatement', line: 23 },
          { kind: 'ParticlesStatement', line: 24 },
          {
            kind: 'ChoiceStatement',
            line: 25,
            options: [
              {
                kind: 'OptionStatement',
                line: 26,
                body: [
                  { kind: 'EffectStatement', line: 27 },
                ],
              },
              { kind: 'OptionStatement', line: 28, body: [] },
            ],
          },
          { kind: 'ConditionStatement', line: 29 },
          { kind: 'JumpStatement', line: 30 },
        ],
      },
      {
        kind: 'SceneDeclaration',
        line: 31,
        id: 'fallback',
        body: [
          { kind: 'EndStatement', line: 32 },
        ],
      },
    ]);
  });
});
