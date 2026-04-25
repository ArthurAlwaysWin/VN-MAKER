import { describe, expect, it } from 'vitest';
import { ScriptEngine } from '../src/engine/ScriptEngine.js';
import {
  DEFAULT_PAGE_CAMERA,
  DEFAULT_CAMERA_TRIGGER,
  KNOWN_CAMERA_EFFECTS,
  CAMERA_EFFECT_DIRECTION_OPTIONS,
  getPageCameraContract,
} from '../src/shared/cinematicContract.js';

function makeEngine(pageOverrides = {}) {
  const engine = new ScriptEngine();
  engine.script = {
    characters: {
      hero: {
        name: 'Hero',
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
            camera: {
              effect: 'shake',
              durationMs: 450,
              intensity: 'high',
              direction: 'horizontal',
              trigger: 'manual',
            },
            characters: [{ id: 'hero', expression: 'normal', position: 'center' }],
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

describe('camera contract', () => {
  it('exports the exact locked effect set, null default, and onEnter runtime trigger', () => {
    expect(KNOWN_CAMERA_EFFECTS).toEqual(['shake', 'zoom', 'pan', 'flash']);
    expect(DEFAULT_PAGE_CAMERA).toBeNull();
    expect(DEFAULT_CAMERA_TRIGGER).toBe('onEnter');
    expect(getPageCameraContract(undefined)).toBeNull();
  });

  it('locks the per-effect direction contract in shared metadata', () => {
    expect(CAMERA_EFFECT_DIRECTION_OPTIONS).toEqual({
      shake: ['horizontal', 'vertical', 'both'],
      pan: ['left', 'right', 'up', 'down'],
      zoom: null,
      flash: null,
    });
  });

  it('emits camera data only on page_enter and keeps other runtime events camera-free', () => {
    const engine = makeEngine();
    const pageEnterEvents = [];
    const showEvents = [];
    const setExpressionEvents = [];

    engine.on('page_enter', (data) => pageEnterEvents.push(data));
    engine.on('show_character', (data) => showEvents.push(data));
    engine.on('set_expression', (data) => setExpressionEvents.push(data));

    engine.startGame('start');
    engine.next();

    expect(pageEnterEvents).toHaveLength(1);
    expect(pageEnterEvents[0].camera).toEqual({
      effect: 'shake',
      durationMs: 450,
      intensity: 'high',
      direction: 'horizontal',
      trigger: 'onEnter',
    });
    expect(pageEnterEvents[0].page.camera.trigger).toBe('manual');
    expect(showEvents[0]).not.toHaveProperty('camera');
    expect(setExpressionEvents[0]).not.toHaveProperty('camera');
  });

  it('preserves unknown effect strings byte-for-byte in emitted runtime camera contracts', () => {
    const engine = makeEngine({
      camera: {
        effect: 'legacy-rumble',
        durationMs: 320,
        intensity: 'medium',
        direction: 'diagonal',
        trigger: 'custom',
      },
    });
    const pageEnterEvents = [];
    engine.on('page_enter', (data) => pageEnterEvents.push(data));

    engine.startGame('start');

    expect(pageEnterEvents).toHaveLength(1);
    expect(pageEnterEvents[0].camera).toEqual({
      effect: 'legacy-rumble',
      durationMs: 320,
      intensity: 'medium',
      direction: 'diagonal',
      trigger: 'onEnter',
    });
    expect(pageEnterEvents[0].page.camera).toEqual({
      effect: 'legacy-rumble',
      durationMs: 320,
      intensity: 'medium',
      direction: 'diagonal',
      trigger: 'custom',
    });
  });

  it('does not require direction for zoom or flash contracts', () => {
    expect(getPageCameraContract({
      effect: 'zoom',
      durationMs: 500,
      intensity: 'low',
      direction: 'left',
      trigger: 'custom',
    })).toEqual({
      effect: 'zoom',
      durationMs: 500,
      intensity: 'low',
      trigger: 'onEnter',
    });

    expect(getPageCameraContract({
      effect: 'flash',
      durationMs: 200,
      intensity: 'high',
    })).toEqual({
      effect: 'flash',
      durationMs: 200,
      intensity: 'high',
      trigger: 'onEnter',
    });
  });
});
