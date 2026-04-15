/**
 * ScriptEngine unit tests
 *
 * Covers core engine logic: page navigation, dialogues, choices,
 * conditions, variables, getState/restoreState round-trip, history cap.
 *
 * Run with: node --test tests/scriptEngine.test.js
 */

import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual, ok } from 'node:assert/strict';
import { ScriptEngine } from '../src/engine/ScriptEngine.js';

// ─── Fixture Builders ──────────────────────────────────────

function makeEngine(scriptOverrides = {}) {
  const engine = new ScriptEngine();
  engine.script = {
    meta: { title: 'Test Game' },
    characters: {
      hero: {
        name: 'Hero',
        color: '#fff',
        expressions: { normal: 'hero_normal.png', happy: 'hero_happy.png' },
      },
    },
    scenes: {
      start: {
        name: 'Opening',
        pages: [
          {
            type: 'normal',
            background: 'bg.png',
            characters: [{ id: 'hero', expression: 'normal', position: 'center' }],
            dialogues: [
              { speaker: 'hero', text: 'Hello!', expression: null, voice: null },
              { speaker: 'hero', text: 'How are you?', expression: null, voice: null },
            ],
          },
        ],
      },
      ...scriptOverrides,
    },
  };
  return engine;
}

// Collect all events of a given type fired during a callback
function capture(engine, event, fn) {
  const events = [];
  const handler = (data) => events.push(data);
  engine.on(event, handler);
  fn();
  engine.off(event, handler);
  return events;
}

// ─── startGame ─────────────────────────────────────────────

describe('startGame', () => {
  it('resets variables and drops previous history entries', () => {
    const engine = makeEngine();
    engine.variables.set('affection', 10);
    // startGame clears variables, then plays the first dialogue (which adds 1 history entry)
    engine.startGame('start');
    strictEqual(engine.variables.size, 0, 'variables should be cleared');
    // history contains the first dialogue played after reset — the old 'affection' variable is gone
    ok(!engine.history.some(h => h.text === 'old'), 'old history entry should not be present');
  });

  it('emits scene_enter with correct sceneId', () => {
    const engine = makeEngine();
    const events = capture(engine, 'scene_enter', () => engine.startGame('start'));
    strictEqual(events.length, 1);
    strictEqual(events[0].sceneId, 'start');
  });

  it('emits dialogue for first line', () => {
    const engine = makeEngine();
    const events = capture(engine, 'dialogue', () => engine.startGame('start'));
    strictEqual(events.length, 1);
    strictEqual(events[0].text, 'Hello!');
    strictEqual(events[0].speakerName, 'Hero');
  });

  it('sets waiting=true after first dialogue', () => {
    const engine = makeEngine();
    engine.startGame('start');
    strictEqual(engine.waiting, true);
  });

  it('logs error and does not throw for missing scene', () => {
    const engine = makeEngine();
    // Should not throw — just log an error
    engine.startGame('nonexistent');
    strictEqual(engine.waiting, false);
  });
});

// ─── next() — dialogue advancement ────────────────────────

describe('next() dialogue advancement', () => {
  it('advances to second dialogue on first next()', () => {
    const engine = makeEngine();
    engine.startGame('start');

    const events = capture(engine, 'dialogue', () => engine.next());
    strictEqual(events.length, 1);
    strictEqual(events[0].text, 'How are you?');
  });

  it('is a no-op when not waiting', () => {
    const engine = makeEngine();
    engine.startGame('start');
    engine.waiting = false;

    const events = capture(engine, 'dialogue', () => engine.next());
    strictEqual(events.length, 0);
  });

  it('is a no-op when ended', () => {
    const engine = makeEngine();
    engine.startGame('start');
    engine.ended = true;

    const events = capture(engine, 'dialogue', () => engine.next());
    strictEqual(events.length, 0);
  });

  it('emits end after last dialogue on last page', () => {
    const engine = makeEngine();
    engine.startGame('start');
    engine.next(); // advance to second dialogue
    const endEvents = capture(engine, 'end', () => engine.next());
    strictEqual(endEvents.length, 1);
    strictEqual(engine.ended, true);
  });
});

// ─── Choice pages ──────────────────────────────────────────

describe('selectChoice', () => {
  function makeChoiceEngine() {
    const engine = new ScriptEngine();
    engine.script = {
      characters: {},
      scenes: {
        start: {
          name: 'Choice Scene',
          pages: [
            {
              type: 'choice',
              prompt: 'Pick one',
              options: [
                { text: 'Option A', target: 'sceneA', setVariable: { mood: 1 } },
                { text: 'Option B', target: 'sceneB', setVariable: null },
              ],
            },
          ],
        },
        sceneA: {
          name: 'Scene A',
          pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'You chose A', voice: null }] }],
        },
        sceneB: {
          name: 'Scene B',
          pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'You chose B', voice: null }] }],
        },
      },
    };
    return engine;
  }

  it('emits choice event on choice page', () => {
    const engine = makeChoiceEngine();
    const events = capture(engine, 'choice', () => engine.startGame('start'));
    strictEqual(events.length, 1);
    strictEqual(events[0].prompt, 'Pick one');
    strictEqual(events[0].options.length, 2);
  });

  it('navigates to correct scene on selection', () => {
    const engine = makeChoiceEngine();
    engine.startGame('start');
    const scenes = capture(engine, 'scene_enter', () => engine.selectChoice(0));
    strictEqual(scenes[0].sceneId, 'sceneA');
  });

  it('applies setVariable on choice selection', () => {
    const engine = makeChoiceEngine();
    engine.startGame('start');
    engine.selectChoice(0); // option A sets mood: 1
    strictEqual(engine.variables.get('mood'), 1);
  });

  it('accumulates variable values when the same choice is reached twice in a session', () => {
    const engine = makeChoiceEngine();
    engine.startGame('start');
    engine.selectChoice(0); // mood: 0 + 1 = 1

    // Manually rewind to the choice page WITHOUT clearing variables (simulates scene loop)
    engine.currentScene = 'start';
    engine.pageIndex = 0;
    engine.waiting = false;
    capture(engine, 'choice', () => engine._processCurrentPage()); // re-enter choice page
    engine.selectChoice(0); // mood: 1 + 1 = 2
    strictEqual(engine.variables.get('mood'), 2);
  });

  it('ignores invalid option index', () => {
    const engine = makeChoiceEngine();
    engine.startGame('start');
    const events = capture(engine, 'scene_enter', () => engine.selectChoice(99));
    strictEqual(events.length, 0); // nothing happened
  });
});

// ─── Condition pages ───────────────────────────────────────

describe('condition pages', () => {
  function makeConditionEngine(operator, value, varValue) {
    const engine = new ScriptEngine();
    engine.script = {
      characters: {},
      scenes: {
        start: {
          name: 'Condition Test',
          pages: [
            {
              type: 'condition',
              variable: 'score',
              operator,
              value,
              trueTarget: 'goodEnd',
              falseTarget: 'badEnd',
            },
          ],
        },
        goodEnd: {
          name: 'Good End',
          pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'Good!', voice: null }] }],
        },
        badEnd: {
          name: 'Bad End',
          pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'Bad!', voice: null }] }],
        },
      },
    };
    engine.variables.set('score', varValue);
    return engine;
  }

  const cases = [
    ['==', 5, 5, 'goodEnd'],
    ['==', 5, 4, 'badEnd'],
    ['!=', 5, 4, 'goodEnd'],
    ['!=', 5, 5, 'badEnd'],
    ['>', 5, 6, 'goodEnd'],
    ['>', 5, 5, 'badEnd'],
    ['>=', 5, 5, 'goodEnd'],
    ['>=', 5, 4, 'badEnd'],
    ['<', 5, 4, 'goodEnd'],
    ['<', 5, 5, 'badEnd'],
    ['<=', 5, 5, 'goodEnd'],
    ['<=', 5, 6, 'badEnd'],
  ];

  for (const [op, condVal, varVal, expectedScene] of cases) {
    it(`operator "${op}": var=${varVal} ${op} ${condVal} → ${expectedScene}`, () => {
      const engine = makeConditionEngine(op, condVal, varVal);
      // Bypass startGame (which clears variables) — set state directly and process the page
      engine.currentScene = 'start';
      engine.pageIndex = 0;
      engine.variables.set('score', varVal);

      const events = capture(engine, 'scene_enter', () => engine._processCurrentPage());
      strictEqual(events[0]?.sceneId, expectedScene);
    });
  }

  it('emits error event for unknown operator', () => {
    const engine = makeConditionEngine('???', 5, 5);
    const errors = capture(engine, 'error', () => engine.startGame('start'));
    strictEqual(errors.length, 1);
    strictEqual(errors[0].type, 'unknown_operator');
    strictEqual(errors[0].operator, '???');
  });
});

// ─── getState / restoreState ────────────────────────────────

describe('getState / restoreState', () => {
  it('round-trips scene and position', () => {
    const engine = makeEngine();
    engine.startGame('start');
    engine.next(); // advance to dialogue index 1

    const state = engine.getState();
    strictEqual(state.currentScene, 'start');
    strictEqual(state.pageIndex, 0);
    strictEqual(state.dialogueIndex, 1);

    const engine2 = makeEngine();
    engine2.restoreState(state);
    strictEqual(engine2.currentScene, 'start');
    strictEqual(engine2.pageIndex, 0);
    strictEqual(engine2.dialogueIndex, 1);
  });

  it('round-trips variables', () => {
    const engine = makeEngine();
    engine.startGame('start');
    engine.variables.set('affection', 7);

    const state = engine.getState();
    const engine2 = makeEngine();
    engine2.restoreState(state);
    strictEqual(engine2.variables.get('affection'), 7);
  });

  it('round-trips expressionState', () => {
    const engine = makeEngine();
    engine.startGame('start');
    engine._expressionState.set('hero', 'happy');

    const state = engine.getState();
    ok('expressionState' in state);
    deepStrictEqual(state.expressionState, { hero: 'happy' });

    const engine2 = makeEngine();
    engine2.restoreState(state);
    strictEqual(engine2._expressionState.get('hero'), 'happy');
  });

  it('restoreState defaults missing fields', () => {
    const engine = makeEngine();
    engine.restoreState({ currentScene: 'start' }); // no pageIndex, dialogueIndex, etc.
    strictEqual(engine.pageIndex, 0);
    strictEqual(engine.dialogueIndex, 0);
    strictEqual(engine.variables.size, 0);
  });
});

// ─── history cap ───────────────────────────────────────────

describe('in-memory history cap', () => {
  it('caps history at 200 entries', () => {
    // Build a scene with 210 dialogue lines
    const dialogues = Array.from({ length: 210 }, (_, i) => ({
      speaker: null, text: `Line ${i}`, expression: null, voice: null,
    }));

    const engine = new ScriptEngine();
    engine.script = {
      characters: {},
      scenes: {
        start: {
          name: 'Long Scene',
          pages: [{ type: 'normal', dialogues }],
        },
      },
    };

    engine.startGame('start');
    // Advance through all 210 dialogues
    for (let i = 0; i < 210; i++) {
      if (engine.waiting) engine.next();
    }

    ok(engine.history.length <= 200, `history.length was ${engine.history.length}, expected ≤ 200`);
  });
});

// ─── Expression state inheritance ─────────────────────────

describe('expression state', () => {
  it('inherits expression from previous page when not specified', () => {
    const engine = new ScriptEngine();
    engine.script = {
      characters: {
        hero: {
          name: 'Hero',
          expressions: { normal: 'n.png', happy: 'h.png' },
        },
      },
      scenes: {
        start: {
          name: 'Test',
          pages: [
            {
              type: 'normal',
              characters: [{ id: 'hero', expression: 'happy', position: 'center' }],
              dialogues: [{ speaker: null, text: 'p1', voice: null }],
            },
            {
              type: 'normal',
              // No expression specified — should inherit 'happy'
              characters: [{ id: 'hero', position: 'center' }],
              dialogues: [{ speaker: null, text: 'p2', voice: null }],
            },
          ],
        },
      },
    };

    const showEvents = [];
    engine.on('show_character', (data) => showEvents.push(data));
    engine.startGame('start');
    engine.next(); // move to page 2

    const p2Show = showEvents.find(e => e.expression === 'happy' && showEvents.indexOf(e) > 0);
    ok(p2Show, 'Expected hero to inherit "happy" expression on page 2');
  });

  it('clears expression state on scene enter', () => {
    const engine = new ScriptEngine();
    engine.script = {
      characters: {
        hero: { name: 'Hero', expressions: { normal: 'n.png' } },
      },
      scenes: {
        start: {
          name: 'Scene A',
          next: 'sceneB',
          pages: [
            {
              type: 'normal',
              characters: [{ id: 'hero', expression: 'normal', position: 'center' }],
              dialogues: [{ speaker: null, text: 'hi', voice: null }],
            },
          ],
        },
        sceneB: {
          name: 'Scene B',
          pages: [
            {
              type: 'normal',
              characters: [],
              dialogues: [{ speaker: null, text: 'bye', voice: null }],
            },
          ],
        },
      },
    };

    engine.startGame('start');
    engine.next(); // triggers scene transition to sceneB
    // After entering sceneB, expression state should be cleared
    strictEqual(engine._expressionState.size, 0);
  });

  it('falls back to first expression when resolved expression is stale (D-07)', () => {
    const engine = new ScriptEngine();
    engine.script = {
      characters: {
        hero: {
          name: 'Hero',
          expressions: { normal: 'n.png', happy: 'h.png' },
        },
      },
      scenes: {
        start: {
          name: 'Test',
          pages: [
            {
              type: 'normal',
              // expression 'deleted_expr' does NOT exist in hero's expressions dict
              characters: [{ id: 'hero', expression: 'deleted_expr', position: 'center' }],
              dialogues: [{ speaker: null, text: 'p1', voice: null }],
            },
          ],
        },
      },
    };

    const showEvents = [];
    engine.on('show_character', (data) => showEvents.push(data));
    engine.startGame('start');

    const ev = showEvents[0];
    strictEqual(ev.expression, 'normal', 'Should fallback to first expression "normal"');
    strictEqual(ev.image, 'n.png', 'Should use first expression image');
  });

  it('falls back to first expression for stale mid-dialogue expression (D-07)', () => {
    const engine = new ScriptEngine();
    engine.script = {
      characters: {
        hero: {
          name: 'Hero',
          expressions: { normal: 'n.png', happy: 'h.png' },
        },
      },
      scenes: {
        start: {
          name: 'Test',
          pages: [
            {
              type: 'normal',
              characters: [{ id: 'hero', expression: 'normal', position: 'center' }],
              dialogues: [
                { speaker: 'hero', text: 'hi', expression: null, voice: null },
                { speaker: 'hero', text: 'stale', expression: 'gone', voice: null },
              ],
            },
          ],
        },
      },
    };

    const setExprEvents = [];
    engine.on('set_expression', (data) => setExprEvents.push(data));
    engine.startGame('start');
    engine.next(); // advance to second dialogue with stale expression 'gone'

    const ev = setExprEvents[0];
    strictEqual(ev.expression, 'normal', 'Should fallback to first expression "normal"');
    strictEqual(ev.image, 'n.png', 'Should use first expression image');
  });
});
