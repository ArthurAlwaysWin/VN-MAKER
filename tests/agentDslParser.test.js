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

  it('parses condition expressions into AST nodes', () => {
    const result = parseAgentDsl(`
variable affection number initial 0
variable saw_letter bool initial false
scene start "Start":
  if affection >= 5 and saw_letter == true -> good else normal
scene good "Good":
  end
scene normal "Normal":
  end
`, { file: 'story.dsl' });

    expect(result.ok).toBe(true);
    const scene = result.ast.body.find((node) => node.kind === 'SceneDeclaration' && node.id === 'start');
    const condition = scene.body.find((node) => node.kind === 'ConditionStatement');
    expect(condition).toMatchObject({
      trueTarget: 'good',
      falseTarget: 'normal',
      expression: {
        kind: 'LogicalExpression',
        operator: 'and',
        children: [
          { kind: 'ComparisonExpression', variableId: 'affection', operator: '>=', value: 5, valueType: 'number' },
          { kind: 'ComparisonExpression', variableId: 'saw_letter', operator: '==', value: true, valueType: 'bool' },
        ],
      },
    });
  });

  it('parses cinematic mood presets and scene uses', () => {
    const result = parseAgentDsl(`
preset mood rainy_school:
  particles rain density 0.6 opacity 0.8
  transition dissolve 900
  camera shake low 450
scene start "Start":
  preset mood rainy_school
  say "Rain tapped against the glass."
`, { file: 'story.dsl' });

    expect(result.ok).toBe(true);
    expect(result.ast.body).toMatchObject([
      {
        kind: 'PresetDeclaration',
        category: 'mood',
        id: 'rainy_school',
        body: [
          { kind: 'ParticlesStatement' },
          { kind: 'TransitionStatement' },
          { kind: 'CameraStatement' },
        ],
      },
      { kind: 'SceneDeclaration', id: 'start' },
    ]);
    const scene = result.ast.body.find((node) => node.kind === 'SceneDeclaration');
    expect(scene.body[0]).toMatchObject({
      kind: 'PresetUseStatement',
      category: 'mood',
      id: 'rainy_school',
    });
  });

  it('parses reusable sequence declarations and uses', () => {
    const result = parseAgentDsl(`
sequence dramatic_entrance(character, expression):
  show $character $expression at center animation fade-in
  camera shake medium 450
scene start "Start":
  sequence dramatic_entrance("sakura", "smile")
`, { file: 'story.dsl' });

    expect(result.ok).toBe(true);
    expect(result.ast.body).toMatchObject([
      {
        kind: 'SequenceDeclaration',
        id: 'dramatic_entrance',
        params: ['character', 'expression'],
        body: [
          { kind: 'ShowStatement' },
          { kind: 'CameraStatement' },
        ],
      },
      { kind: 'SceneDeclaration', id: 'start' },
    ]);
    const scene = result.ast.body.find((node) => node.kind === 'SceneDeclaration');
    expect(scene.body[0]).toMatchObject({
      kind: 'SequenceUseStatement',
      id: 'dramatic_entrance',
      args: ['sakura', 'smile'],
    });
  });

  it('reports malformed sequence declarations and uses', () => {
    const declaration = parseAgentDsl('sequence broken\n  say "Nope."\n', { file: 'story.dsl' });
    expect(declaration.ok).toBe(false);
    expect(declaration.diagnostics[0]).toMatchObject({
      code: 'dsl-syntax-error',
      message: 'Expected ":" after sequence declaration.',
    });

    const use = parseAgentDsl(`
sequence intro():
  say "Hi."
scene start "Start":
  sequence intro:
`, { file: 'story.dsl' });
    expect(use.ok).toBe(false);
    expect(use.diagnostics[0]).toMatchObject({
      code: 'dsl-invalid-sequence',
      message: 'Expected sequence arguments in parentheses.',
    });
  });

  it('reports malformed preset declarations', () => {
    const result = parseAgentDsl('preset mood rainy_school\n  particles rain\n', { file: 'story.dsl' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'dsl-syntax-error',
      message: 'Expected ":" after preset declaration.',
    });
  });

  it('reports scene preset uses with declaration-style colons', () => {
    const result = parseAgentDsl(`
preset mood rainy_school:
  particles rain
scene start "Start":
  preset mood rainy_school:
`, { file: 'story.dsl' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'dsl-invalid-preset',
      message: 'Preset uses inside scenes must not end with ":".',
    });
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

  it('reports invalid condition expressions with a stable code', () => {
    const result = parseAgentDsl(`
scene start "Start":
  if not affection >= 5 -> good
scene good "Good":
  end
`, { file: 'story.dsl' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'dsl-invalid-condition-expression',
      message: '"not" is not supported in condition expressions yet.',
      source: { line: 3, column: 6 },
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
