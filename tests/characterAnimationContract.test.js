import { describe, expect, it } from 'vitest';
import { ScriptEngine } from '../src/engine/ScriptEngine.js';
import {
  DEFAULT_CHARACTER_ANIMATION,
  KNOWN_CHARACTER_ANIMATIONS,
  getCharacterAnimationValue,
} from '../src/shared/cinematicContract.js';

function makeEngine(pageOverrides = {}) {
  const engine = new ScriptEngine();
  engine.script = {
    characters: {
      hero: {
        name: 'Hero',
        expressions: { normal: 'hero_normal.png', happy: 'hero_happy.png' },
      },
      friend: {
        name: 'Friend',
        expressions: { smile: 'friend_smile.png' },
      },
    },
    scenes: {
      start: {
        name: 'Opening',
        pages: [
          {
            type: 'normal',
            background: 'bg.png',
            characters: [
              { id: 'hero', expression: 'normal', position: 'center', animation: 'breathe' },
              { id: 'friend', expression: 'smile', position: 'left', animation: 'slide-in-left' },
            ],
            dialogues: [
              { speaker: 'hero', text: 'Hello', expression: null, voice: null },
              { speaker: 'hero', text: 'Mood shift', expression: 'happy', voice: null },
            ],
            ...pageOverrides,
          },
        ],
      },
    },
  };
  return engine;
}

describe('character animation contract', () => {
  it('exports the completed M5 preset list and keeps none as the default no-op value', () => {
    expect(KNOWN_CHARACTER_ANIMATIONS).toEqual([
      'fade-in',
      'slide-in-left',
      'slide-in-right',
      'shake',
      'nod',
      'breathe',
      'bounce',
      'fade',
      'slide-left',
      'slide-right',
      'pop',
      'scale-in',
      'blur-in',
    ]);
    expect(DEFAULT_CHARACTER_ANIMATION).toBe('none');
    expect(getCharacterAnimationValue(undefined)).toBe('none');
    expect(getCharacterAnimationValue('')).toBe('none');
    expect(getCharacterAnimationValue('none')).toBe('none');
  });

  it('emits page-entry animation values on show_character for each page character', () => {
    const engine = makeEngine();
    const showEvents = [];
    engine.on('show_character', (data) => showEvents.push(data));

    engine.startGame('start');

    expect(showEvents).toHaveLength(2);
    expect(showEvents[0]).toMatchObject({
      id: 'hero',
      animation: 'breathe',
    });
    expect(showEvents[1]).toMatchObject({
      id: 'friend',
      animation: 'slide-in-left',
    });
  });

  it('preserves unknown non-empty animation strings in emitted runtime contracts', () => {
    const engine = makeEngine({
      characters: [
        { id: 'hero', expression: 'normal', position: 'center', animation: 'legacy-spin' },
      ],
    });
    const showEvents = [];
    engine.on('show_character', (data) => showEvents.push(data));

    engine.startGame('start');

    expect(showEvents).toHaveLength(1);
    expect(showEvents[0].animation).toBe('legacy-spin');
  });

  it('keeps set_expression expression-only during dialogue playback', () => {
    const engine = makeEngine();
    const setExpressionEvents = [];
    engine.on('set_expression', (data) => setExpressionEvents.push(data));

    engine.startGame('start');
    engine.next();

    expect(setExpressionEvents).toHaveLength(1);
    expect(setExpressionEvents[0]).toMatchObject({
      id: 'hero',
      expression: 'happy',
      image: 'hero_happy.png',
    });
    expect(setExpressionEvents[0]).not.toHaveProperty('animation');
  });
});
