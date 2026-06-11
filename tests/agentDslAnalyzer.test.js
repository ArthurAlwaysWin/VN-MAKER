import { describe, expect, it } from 'vitest';

import { analyzeAgentDsl } from '../src/authoring/agentDsl/analyzer.js';
import { bindAgentDsl } from '../src/authoring/agentDsl/binder.js';
import { AgentDslDiagnosticError } from '../src/authoring/agentDsl/diagnostics.js';
import { createAgentDslPlan } from '../src/authoring/agentDslPlan.js';
import { parseAgentDsl } from '../src/authoring/agentDsl/parser.js';

function analyzeSource(source) {
  const parsed = parseAgentDsl(source, { file: 'analyzer.dsl' });
  expect(parsed.ok).toBe(true);
  const bound = bindAgentDsl(parsed.ast);
  expect(bound.ok).toBe(true);
  return analyzeAgentDsl(parsed.ast, bound.symbols);
}

describe('agent DSL analyzer', () => {
  it('reports unknown scene targets before plan emission', () => {
    const result = analyzeSource(`
scene start "Start" next missing_next:
  choice "Go?":
    option "Go" -> missing_choice:
  if missing_var >= 1 -> missing_true else missing_false
  jump missing_jump
`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'dsl-unknown-scene-target',
      'dsl-unknown-scene-target',
      'dsl-unknown-variable',
      'dsl-unknown-scene-target',
      'dsl-unknown-scene-target',
      'dsl-unknown-scene-target',
    ]);
    expect(result.diagnostics[0]).toMatchObject({
      message: 'Scene target "missing_next" is not declared.',
      source: { file: 'analyzer.dsl', line: 2 },
    });
  });

  it('reports unknown characters, variables, endings, and CG entries', () => {
    const result = analyzeSource(`
character sakura "Sakura"
variable affection number initial 0
ending good "Good End"
cg known_cg "Known CG" image "backgrounds/cg.png"
scene start "Start":
  show unknown_actor normal
  say unknown_speaker "Hello."
  choice "Unlock?":
    option "Yes" -> start:
      effect var:add missing_variable 1
      unlock ending missing_ending
      effect unlock:cg missing_cg
`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'dsl-unknown-character', message: 'Character "unknown_actor" is not declared.' }),
      expect.objectContaining({ code: 'dsl-unknown-character', message: 'Character "unknown_speaker" is not declared.' }),
      expect.objectContaining({ code: 'dsl-unknown-variable', message: 'Variable "missing_variable" is not declared.' }),
      expect.objectContaining({ code: 'dsl-unknown-ending', message: 'Ending "missing_ending" is not declared.' }),
      expect.objectContaining({ code: 'dsl-unknown-cg', message: 'CG "missing_cg" is not declared.' }),
    ]);
  });

  it('reports invalid effect types with dsl-invalid-effect', () => {
    const result = analyzeSource(`
variable affection number initial 0
scene start "Start":
  choice "Try?":
    option "Try" -> start:
      effect score:add affection 1
`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'dsl-invalid-effect',
        message: 'Unsupported effect type "score:add".',
        source: { file: 'analyzer.dsl', line: 6, column: 14 },
      }),
    ]);
  });

  it('reports absolute and traversal asset paths', () => {
    const result = analyzeSource(`
character sakura "Sakura" expression normal "../characters/sakura.png"
cg first_smile "First Smile" image "/backgrounds/cg.png"
scene start "Start":
  bg "C:/game/backgrounds/room.png"
  bgm "../audio/theme.ogg"
  se "\\\\server\\share\\bell.ogg"
  say "Narration." voice "../voices/line.ogg"
`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'dsl-invalid-asset-path',
      'dsl-invalid-asset-path',
      'dsl-invalid-asset-path',
      'dsl-invalid-asset-path',
      'dsl-invalid-asset-path',
      'dsl-invalid-asset-path',
    ]);
  });

  it('runs semantic diagnostics before createAgentDslPlan emits operations', () => {
    expect(() => createAgentDslPlan(`
scene start "Start":
  say missing "Nope."
`, { file: 'compile.dsl' })).toThrow(AgentDslDiagnosticError);

    try {
      createAgentDslPlan(`
scene start "Start":
  say missing "Nope."
`, { file: 'compile.dsl' });
    } catch (error) {
      expect(error.diagnostics).toEqual([
        expect.objectContaining({
          code: 'dsl-unknown-character',
          message: 'Character "missing" is not declared.',
        }),
      ]);
    }
  });

  it('checks macro-expanded references without treating macro parameters as symbols', () => {
    expect(() => createAgentDslPlan(`
character sakura "Sakura"
macro entrance(character):
  show $character normal
scene start "Start":
  call entrance("sakura")
`, { file: 'macro-ok.dsl' })).not.toThrow();

    expect(() => createAgentDslPlan(`
macro entrance(character):
  show $character normal
scene start "Start":
  call entrance("missing")
`, { file: 'macro-bad.dsl' })).toThrow(AgentDslDiagnosticError);
  });
});
