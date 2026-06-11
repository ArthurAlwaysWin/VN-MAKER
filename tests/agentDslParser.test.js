import { describe, expect, it } from 'vitest';

import { parseAgentDsl } from '../src/authoring/agentDsl/parser.js';

describe('agent DSL parser', () => {
  it('parses P0 declarations, macros, scenes, and choices into spanned AST nodes', () => {
    const result = parseAgentDsl(`
title "Parser Demo"
character sakura "Sakura" expression normal "characters/sakura.png"
variable affection number initial 0
macro entrance(character, expression):
  show $character $expression at center animation fade-in
scene start "Start":
  page opening:
  call entrance("sakura", "normal")
  say sakura "Welcome."
  choice "Answer?":
    option "Stay" -> good:
      effect var:add affection 1
`, { file: 'story.dsl' });

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.ast).toMatchObject({
      kind: 'File',
      body: [
        { kind: 'TitleDeclaration', value: 'Parser Demo' },
        { kind: 'CharacterDeclaration', id: 'sakura' },
        { kind: 'VariableDeclaration', id: 'affection' },
        { kind: 'MacroDeclaration', id: 'entrance', params: ['character', 'expression'] },
        { kind: 'SceneDeclaration', id: 'start' },
      ],
    });
    const scene = result.ast.body.find((node) => node.kind === 'SceneDeclaration');
    expect(scene.span).toMatchObject({
      file: 'story.dsl',
      start: { line: 7, column: 1 },
      end: { line: 13 },
    });
    expect(scene.body.map((node) => node.kind)).toEqual([
      'PageStatement',
      'MacroCall',
      'SayStatement',
      'ChoiceStatement',
    ]);
  });

  it('reports a missing scene colon with dsl-syntax-error', () => {
    const result = parseAgentDsl('scene start "Start"\n  say "Hello."\n', { file: 'story.dsl' });

    expect(result.ok).toBe(false);
    expect(result.ast).toBeNull();
    expect(result.diagnostics[0]).toMatchObject({
      code: 'dsl-syntax-error',
      message: 'Expected ":" after scene declaration.',
      source: { file: 'story.dsl', line: 1, column: 1 },
    });
  });

  it('reports macro arity mismatches with a stable code', () => {
    const result = parseAgentDsl(`
macro entrance(character, expression):
  show $character $expression
scene start "Start":
  call entrance("sakura")
`, { file: 'story.dsl' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'dsl-macro-arity-mismatch',
      message: 'Macro "entrance" expects 2 argument(s), got 1.',
      source: { line: 5, column: 3 },
    });
  });

  it('reports unknown top-level statements', () => {
    const result = parseAgentDsl('paint scene\n', { file: 'story.dsl' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'dsl-syntax-error',
      message: 'Unknown top-level statement "paint".',
    });
  });

  it('reports unknown macros before plan emission', () => {
    const result = parseAgentDsl('scene start "Start":\n  call missing_macro()\n', { file: 'story.dsl' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'dsl-macro-not-found',
      message: 'Unknown macro "missing_macro".',
      source: { line: 2, column: 3 },
    });
  });

  it('reports empty choices and unknown scene statements', () => {
    const emptyChoice = parseAgentDsl('scene start "Start":\n  choice "Answer?":\n', { file: 'story.dsl' });
    expect(emptyChoice.ok).toBe(false);
    expect(emptyChoice.diagnostics[0]).toMatchObject({
      code: 'dsl-syntax-error',
      message: 'Choice requires at least one option.',
    });

    const unknownStatement = parseAgentDsl('scene start "Start":\n  paint "sky"\n', { file: 'story.dsl' });
    expect(unknownStatement.ok).toBe(false);
    expect(unknownStatement.diagnostics[0]).toMatchObject({
      code: 'dsl-syntax-error',
      message: 'Unknown scene statement "paint".',
    });
  });
});
