import { describe, expect, it } from 'vitest';

import { lexAgentDsl } from '../src/authoring/agentDsl/lexer.js';

describe('agent DSL lexer', () => {
  it('tokenizes P0 declarations with source spans', () => {
    const result = lexAgentDsl('character sakura "Sakura" color "#ff99cc"\nvariable affection number initial 1\n', {
      file: 'story.dsl',
    });

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.tokens.map((token) => token.type)).toEqual(expect.arrayContaining([
      'identifier',
      'string',
      'number',
      'newline',
      'eof',
    ]));
    expect(result.lines[0].tokens.map((token) => token.value)).toEqual([
      'character',
      'sakura',
      'Sakura',
      'color',
      '#ff99cc',
    ]);
    expect(result.lines[0].tokens[1].span).toMatchObject({
      file: 'story.dsl',
      start: { line: 1, column: 11 },
      end: { line: 1, column: 17 },
    });
  });

  it('emits indent and dedent tokens for blocks', () => {
    const result = lexAgentDsl('scene start "Start":\n  say "Hello."\n', { file: 'story.dsl' });

    expect(result.ok).toBe(true);
    expect(result.tokens.map((token) => token.type)).toContain('indent');
    expect(result.tokens.map((token) => token.type)).toContain('dedent');
    expect(result.lines[1]).toMatchObject({
      number: 2,
      indent: 2,
    });
  });

  it('rejects tabs with a structured diagnostic', () => {
    const result = lexAgentDsl('scene start "Start":\n\tsay "Nope."\n', { file: 'story.dsl' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      severity: 'error',
      code: 'dsl-invalid-indent',
      source: { file: 'story.dsl', line: 2, column: 1 },
    });
  });

  it('reports unterminated strings with source location', () => {
    const result = lexAgentDsl('title "Broken\n', { file: 'story.dsl' });

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'dsl-syntax-error',
      message: 'Unterminated string literal.',
      source: { line: 1, column: 7 },
    });
  });
});
