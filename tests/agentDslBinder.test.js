import { describe, expect, it } from 'vitest';

import { bindAgentDsl } from '../src/authoring/agentDsl/binder.js';
import { parseAgentDsl } from '../src/authoring/agentDsl/parser.js';

function bindSource(source) {
  const parsed = parseAgentDsl(source, { file: 'binder.dsl' });
  expect(parsed.ok).toBe(true);
  return bindAgentDsl(parsed.ast);
}

describe('agent DSL binder', () => {
  it('builds symbol tables for P2 semantic analysis', () => {
    const result = bindSource(`
character sakura "Sakura"
variable affection number initial 0
affection sakura sakura_affection
ending good "Good End"
cg first_smile "First Smile" image "backgrounds/cg.png"
macro entrance(character):
  show $character
preset mood rainy_school:
  particles rain
sequence dramatic_entrance(character):
  show $character
route sakura:
  affection variable route_affection
  good_end route_good
  normal_end route_normal
scene start "Start":
  say "Hello."
`);

    expect(result.ok).toBe(true);
    expect([...result.symbols.characters.keys()]).toEqual(['sakura']);
    expect([...result.symbols.variables.keys()]).toEqual(['affection', 'sakura_affection', 'route_affection']);
    expect([...result.symbols.endings.keys()]).toEqual(['good', 'route_good', 'route_normal']);
    expect([...result.symbols.cgs.keys()]).toEqual(['first_smile']);
    expect([...result.symbols.macros.keys()]).toEqual(['entrance']);
    expect([...result.symbols.presets.keys()]).toEqual(['mood:rainy_school']);
    expect([...result.symbols.sequences.keys()]).toEqual(['dramatic_entrance']);
    expect([...result.symbols.routes.keys()]).toEqual(['sakura']);
    expect([...result.symbols.scenes.keys()]).toEqual(['route_good', 'route_normal', 'start']);
  });

  it('reports duplicate symbols inside the same symbol table', () => {
    const result = bindSource(`
character sakura "Sakura"
character sakura "Sakura Again"
variable affection number
variable affection number
scene start "Start":
  say "One."
scene start "Start Again":
  say "Two."
`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'dsl-duplicate-symbol',
        message: 'Duplicate character symbol "sakura" previously declared on line 2.',
        source: { file: 'binder.dsl', line: 3, column: 11 },
      }),
      expect.objectContaining({
        code: 'dsl-duplicate-symbol',
        message: 'Duplicate variable symbol "affection" previously declared on line 4.',
        source: { file: 'binder.dsl', line: 5, column: 10 },
      }),
      expect.objectContaining({
        code: 'dsl-duplicate-symbol',
        message: 'Duplicate scene symbol "start" previously declared on line 6.',
        source: { file: 'binder.dsl', line: 8, column: 7 },
      }),
    ]);
  });

  it('keeps scene and macro namespaces separate', () => {
    const result = bindSource(`
macro start():
  say "Template."
scene start "Start":
  say "Scene."
`);

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.macros.has('start')).toBe(true);
    expect(result.symbols.scenes.has('start')).toBe(true);
  });
});
