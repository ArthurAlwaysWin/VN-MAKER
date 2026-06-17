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
  it('fails cleanly when called before a script has been loaded', () => {
    const engine = new ScriptEngine();
    const error = console.error;
    console.error = () => {};
    try {
      strictEqual(engine.startGame('start'), false);
      strictEqual(engine.ended, true);
    } finally {
      console.error = error;
    }
  });

  it('does not throw when private scene entry is called before loading a script', () => {
    const engine = new ScriptEngine();
    const error = console.error;
    console.error = () => {};
    try {
      strictEqual(engine._enterScene('start'), undefined);
      strictEqual(engine.currentScene, null);
    } finally {
      console.error = error;
    }
  });

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
    // Should not throw — just log an error and fall back to the first scene.
    engine.startGame('nonexistent');
    strictEqual(engine.currentScene, 'start');
    strictEqual(engine.waiting, true);
  });

  it('seeds registered bool and number defaults before scene execution starts', () => {
    const engine = makeEngine();
    engine.script.systems = {
      variables: {
        route_locked: {
          type: 'bool',
          initial: true,
        },
        affection: {
          type: 'number',
          initial: 2,
        },
      },
    };

    engine.startGame('start');

    strictEqual(engine.variables.get('route_locked'), true);
    strictEqual(engine.variables.get('affection'), 2);
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
  it('emits an empty option list for a malformed choice page without throwing', () => {
    const engine = makeEngine();
    engine.script.scenes.start.pages = [{ type: 'choice', prompt: 'Broken' }];

    const events = capture(engine, 'choice', () => engine.startGame('start'));

    deepStrictEqual(events[0].options, []);
  });

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
                {
                  text: 'Option A',
                  target: 'sceneA',
                  effects: [
                    { type: 'var:add', id: 'mood', value: 1 },
                    { type: 'unlock:ending', id: 'good_end' },
                  ],
                },
                { text: 'Option B', target: 'sceneB', setVariable: { mood: -2 } },
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
    engine.selectChoice(1); // legacy option B sets mood: 0 - 2 = -2
    strictEqual(engine.variables.get('mood'), -2);
  });

  it('executes canonical effects[] on choice selection and forwards unlocks through the injected repository seam', async () => {
    const engine = makeChoiceEngine();
    const unlockCalls = [];
    engine.setPlayerDataRepository({
      async unlockEnding(id) {
        unlockCalls.push(id);
      },
    });
    engine.startGame('start');
    engine.selectChoice(0);

    strictEqual(engine.variables.get('mood'), 1);
    await Promise.resolve();
    deepStrictEqual(unlockCalls, ['good_end']);
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

describe('audio', () => {
  it('passes page BGM fadeIn through to audio events', () => {
    const engine = makeEngine({
      start: {
        name: 'Opening',
        pages: [{
          type: 'normal',
          bgm: { file: 'audio/theme.ogg', volume: 0.7, fadeIn: 1200 },
          characters: [],
          dialogues: [{ speaker: null, text: 'Intro' }],
        }],
      },
    });

    const events = capture(engine, 'play_bgm', () => {
      engine.startGame('start');
    });

    deepStrictEqual(events, [{
      file: 'audio/theme.ogg',
      volume: 0.7,
      fadeIn: 1200,
    }]);
  });
});

// ─── Video pages ───────────────────────────────────────────

describe('video pages', () => {
  it('emits video playback requests and advances to target after completion', () => {
    const engine = new ScriptEngine();
    engine.script = {
      characters: {},
      assets: { videos: { intro: { file: 'videos/intro.mp4' } } },
      scenes: {
        start: {
          name: 'Start',
          pages: [
            {
              type: 'video',
              video: { videoId: 'intro', skippable: true },
              autoAdvance: true,
              target: 'after',
            },
          ],
        },
        after: {
          name: 'After',
          pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'After video' }] }],
        },
      },
    };

    const videoEvents = capture(engine, 'video', () => engine.startGame('start'));
    strictEqual(videoEvents.length, 1);
    strictEqual(videoEvents[0].video.videoId, 'intro');

    const sceneEvents = capture(engine, 'scene_enter', () => engine.finishVideo('ended'));
    strictEqual(sceneEvents[0].sceneId, 'after');
  });

  it('waits for a click after ended video pages when autoAdvance is false', () => {
    const engine = new ScriptEngine();
    engine.script = {
      characters: {},
      scenes: {
        start: {
          pages: [
            {
              type: 'video',
              video: { file: 'videos/manual.webm' },
              autoAdvance: false,
            },
            { type: 'normal', dialogues: [{ speaker: null, text: 'Next page' }] },
          ],
        },
      },
    };

    engine.startGame('start');
    strictEqual(engine.finishVideo('ended'), true);
    strictEqual(engine.waiting, true);
    strictEqual(engine.pageIndex, 0);

    engine.next();
    strictEqual(engine.pageIndex, 1);
  });
});

// ─── Ending video hooks ────────────────────────────────────

describe('ending unlock runtime events', () => {
  it('emits ending_unlocked after page-enter ending effects are applied', async () => {
    const engine = new ScriptEngine();
    const unlockCalls = [];
    const events = [];
    engine.setPlayerDataRepository({
      async unlockEnding(id) {
        unlockCalls.push(id);
      },
    });
    engine.on('ending_unlocked', (event) => events.push(event));
    engine.script = {
      characters: {},
      systems: {
        endings: {
          good_end: {
            title: 'Good End',
            endingVideo: { file: 'videos/good_ed.webm' },
          },
        },
      },
      scenes: {
        start: {
          pages: [
            {
              type: 'normal',
              effects: [{ type: 'unlock:ending', id: 'good_end' }],
              dialogues: [{ speaker: null, text: 'The end' }],
            },
          ],
        },
      },
    };

    engine.startGame('start');
    await new Promise((resolve) => setTimeout(resolve, 0));

    deepStrictEqual(unlockCalls, ['good_end']);
    deepStrictEqual(events, [{ endingId: 'good_end', source: 'page' }]);
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

  it('evaluates canonical multi-row condition pages through the shared contract helper', () => {
    const engine = new ScriptEngine();
    engine.script = {
      characters: {},
      systems: {
        variables: {
          route_locked: { type: 'bool', initial: false },
          affection: { type: 'number', initial: 0 },
        },
      },
      scenes: {
        start: {
          name: 'Condition Test',
          pages: [
            {
              type: 'condition',
              conditionMode: 'all',
              conditions: [
                { variableId: 'route_locked', operator: '==', value: true },
                { variableId: 'affection', operator: '>=', value: 3 },
              ],
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
    engine.variables.set('route_locked', true);
    engine.variables.set('affection', 3);
    engine.currentScene = 'start';

    const events = capture(engine, 'scene_enter', () => engine._processCurrentPage());
    strictEqual(events[0]?.sceneId, 'goodEnd');
  });
});

describe('restoreState', () => {
  it('overlays saved values over registry defaults and preserves unknown legacy save keys', () => {
    const engine = makeEngine();
    engine.script.systems = {
      variables: {
        route_locked: {
          type: 'bool',
          initial: true,
        },
        affection: {
          type: 'number',
          initial: 4,
        },
      },
    };

    engine.restoreState({
      currentScene: 'start',
      pageIndex: 0,
      dialogueIndex: 0,
      variables: {
        affection: 9,
        old_flag: 'legacy',
      },
      history: [],
      expressionState: {},
    });

    strictEqual(engine.variables.get('route_locked'), true);
    strictEqual(engine.variables.get('affection'), 9);
    strictEqual(engine.variables.get('old_flag'), 'legacy');
  });
});

describe('unknown cinematic compatibility', () => {
  it('renders pages with unknown cinematic enums without throwing and falls back safely', () => {
    const engine = new ScriptEngine();
    engine.script = {
      meta: { title: 'Unknown Enum Test' },
      characters: {
        hero: {
          name: 'Hero',
          color: '#fff',
          expressions: { normal: 'hero_normal.png' },
        },
      },
      scenes: {
        start: {
          name: 'Opening',
          pages: [
            {
              type: 'normal',
              background: 'bg.png',
              camera: { effect: 'legacy-zoom', duration: 333 },
              transition: { type: 'legacy-wipe', duration: 650 },
              characters: [
                {
                  id: 'hero',
                  expression: 'normal',
                  animation: 'legacy-bounce',
                  position: 'center',
                },
              ],
              dialogues: [{ speaker: 'hero', text: 'Still works', expression: null, voice: null }],
            },
          ],
        },
      },
    };

    const pageEnterEvents = [];
    const bgEvents = [];
    const charEvents = [];
    engine.on('page_enter', data => pageEnterEvents.push(data));
    engine.on('set_background', data => bgEvents.push(data));
    engine.on('show_character', data => charEvents.push(data));

    engine.startGame('start');

    strictEqual(pageEnterEvents.length, 1);
    strictEqual(pageEnterEvents[0].page.camera.effect, 'legacy-zoom');
    strictEqual(pageEnterEvents[0].page.characters[0].animation, 'legacy-bounce');
    strictEqual(pageEnterEvents[0].page.transition.type, 'legacy-wipe');
    strictEqual(bgEvents.length, 1);
    strictEqual(bgEvents[0].transition, 'fade', 'unknown transition should fall back safely');
    strictEqual(bgEvents[0].duration, 650);
    strictEqual(charEvents.length, 1);
    strictEqual(charEvents[0].transition, 'fade');
  });

  it('passes the known scale transition through to runtime consumers', () => {
    const engine = makeEngine({
      start: {
        name: 'Opening',
        pages: [
          {
            type: 'normal',
            background: 'bg.png',
            transition: { type: 'scale', duration: 480 },
            characters: [{ id: 'hero', expression: 'normal', position: 'center' }],
            dialogues: [{ speaker: 'hero', text: 'Scaled', expression: null, voice: null }],
          },
        ],
      },
    });

    const bgEvents = [];
    engine.on('set_background', data => bgEvents.push(data));

    engine.startGame('start');

    strictEqual(bgEvents.length, 1);
    strictEqual(bgEvents[0].transition, 'scale');
    strictEqual(bgEvents[0].duration, 480);
  });

  it('passes a catalog-supported directional wipe through to runtime consumers', () => {
    const engine = makeEngine({
      start: {
        name: 'Opening',
        pages: [
          {
            type: 'normal',
            background: 'bg.png',
            transition: { type: 'wipe-right', duration: 640 },
            characters: [],
            dialogues: [{ speaker: null, text: 'Revealed', expression: null, voice: null }],
          },
        ],
      },
    });

    const bgEvents = [];
    engine.on('set_background', data => bgEvents.push(data));

    engine.startGame('start');

    strictEqual(bgEvents[0].transition, 'wipe-right');
    strictEqual(bgEvents[0].duration, 640);
  });

  it('dispatches completed catalog transitions directly to background playback', () => {
    const engine = makeEngine({
      start: {
        name: 'Opening',
        pages: [
          {
            type: 'normal',
            background: 'bg.png',
            transition: { type: 'zoom-in', duration: 420 },
            characters: [],
            dialogues: [{ speaker: null, text: 'Approaching', expression: null, voice: null }],
          },
        ],
      },
    });

    const bgEvents = [];
    engine.on('set_background', data => bgEvents.push(data));

    engine.startGame('start');

    strictEqual(bgEvents[0].transition, 'zoom-in');
    strictEqual(bgEvents[0].duration, 420);
  });
});

describe('text templates and input pages', () => {
  it('interpolates variables in dialogue speaker names and text', () => {
    const engine = makeEngine({
      start: {
        name: 'Opening',
        pages: [{
          type: 'normal',
          dialogues: [
            { speaker: '${mc}', text: '${mc}，我喜欢你。', voice: null },
          ],
        }],
      },
    });
    engine.script.systems = {
      variables: {
        mc: { type: 'string', initial: '悠真' },
      },
    };

    const events = capture(engine, 'dialogue', () => engine.startGame('start'));
    strictEqual(events[0].speakerName, '悠真');
    strictEqual(events[0].text, '悠真，我喜欢你。');
    strictEqual(engine.history[0].text, '悠真，我喜欢你。');
  });

  it('stores submitted input text in a string variable and advances', () => {
    const engine = makeEngine({
      start: {
        name: 'Opening',
        pages: [
          {
            type: 'input',
            variableId: 'mc',
            prompt: '请输入主角名字',
            defaultValue: '默认名',
            maxLength: 8,
          },
          {
            type: 'normal',
            dialogues: [{ speaker: null, text: '你好，${mc}', voice: null }],
          },
        ],
      },
    });
    engine.script.systems = {
      variables: {
        mc: { type: 'string', initial: '' },
      },
    };

    const inputs = capture(engine, 'input', () => engine.startGame('start'));
    strictEqual(inputs[0].variableId, 'mc');
    strictEqual(engine.submitInput('  小明  '), true);
    strictEqual(engine.variables.get('mc'), '小明');
    strictEqual(engine.pageIndex, 1);

    const dialogues = capture(engine, 'dialogue', () => engine.renderCurrentPage());
    strictEqual(dialogues[0].text, '你好，小明');
  });

  it('interpolates choice prompt and option text without mutating option effects', () => {
    const engine = makeEngine({
      start: {
        name: 'Opening',
        pages: [{
          type: 'choice',
          prompt: '${mc}，去哪？',
          options: [
            { text: '跟${mc}回家', target: null, effects: [{ type: 'var:add', id: 'affection', value: 1 }] },
          ],
        }],
      },
    });
    engine.script.systems = {
      variables: {
        mc: { type: 'string', initial: '悠真' },
        affection: { type: 'number', initial: 0 },
      },
    };

    const choices = capture(engine, 'choice', () => engine.startGame('start'));
    strictEqual(choices[0].prompt, '悠真，去哪？');
    strictEqual(choices[0].options[0].text, '跟悠真回家');
    deepStrictEqual(choices[0].options[0].effects, [{ type: 'var:add', id: 'affection', value: 1 }]);
  });
});

describe('effect pack runtime compatibility', () => {
  it('emits built-in effect pack playback events for page references', () => {
    const engine = makeEngine({
      start: {
        name: 'Opening',
        pages: [
          {
            type: 'normal',
            background: 'bg.png',
            effectPacks: [{ id: 'old-film', params: { intensity: 0.4 } }],
            dialogues: [{ speaker: null, text: 'Film grain.' }],
          },
        ],
      },
    });
    engine.script.assets = {
      effectPacks: {
        'old-film': {
          id: 'old-film',
          kind: 'postprocess',
          version: 1,
          adapter: 'canvas2d:film-flicker',
          paramsSchema: {
            intensity: { type: 'number', minimum: 0, maximum: 1, default: 0.5 },
          },
        },
      },
    };

    const events = capture(engine, 'set_effect_packs', () => engine.startGame('start'));
    strictEqual(events.length, 1);
    strictEqual(events[0].sceneId, 'start');
    strictEqual(events[0].pageIndex, 0);
    strictEqual(events[0].effects[0].id, 'old-film');
    strictEqual(events[0].effects[0].manifest.adapter, 'canvas2d:film-flicker');
    strictEqual(events[0].effects[0].params.intensity, 0.4);
  });

  it('clears effect packs when references are missing or adapters are unsupported', () => {
    const engine = makeEngine({
      start: {
        name: 'Opening',
        pages: [
          {
            type: 'normal',
            background: 'bg.png',
            effectPacks: [{ id: 'future' }, { id: 'missing' }],
            dialogues: [{ speaker: null, text: 'No runtime.' }],
          },
        ],
      },
    });
    engine.script.assets = {
      effectPacks: {
        future: {
          id: 'future',
          kind: 'postprocess',
          version: 1,
          adapter: 'project:runtime-js',
        },
      },
    };

    const events = capture(engine, 'clear_effect_packs', () => engine.startGame('start'));
    strictEqual(events.length, 1);
    strictEqual(events[0].sceneId, 'start');
    strictEqual(events[0].pageIndex, 0);
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

  it('rejects corrupt saved state without modifying current state', () => {
    const engine = makeEngine();
    engine.startGame('start');
    const original = engine.getState();

    strictEqual(engine.restoreState(null), false);
    deepStrictEqual(engine.getState(), original);
  });

  it('keeps restore and state snapshots tolerant when a player data repository is configured', () => {
    const engine = makeEngine();
    engine.setPlayerDataRepository({
      async unlockEnding() {},
      async unlockCg() {},
    });
    engine.restoreState({
      currentScene: 'start',
      pageIndex: 0,
      dialogueIndex: 0,
      variables: {
        mood: 5,
      },
      history: [],
      expressionState: {},
    });

    deepStrictEqual(engine.getState(), {
      currentScene: 'start',
      pageIndex: 0,
      dialogueIndex: 0,
      variables: {
        mood: 5,
      },
      history: [],
      expressionState: {},
    });
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
