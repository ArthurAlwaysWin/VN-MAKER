import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useScriptStore } from '../src/editor/stores/script.js';
import { DEFAULT_PAGE_CAMERA, getTransitionUiOption } from '../src/shared/cinematicContract.js';

function makeScriptData() {
  return {
    meta: { title: 'Compatibility Test' },
    characters: {
      hero: {
        name: 'Hero',
        expressions: { normal: 'hero_normal.png' },
      },
    },
    scenes: {
      start: {
        name: 'Start',
        pages: [
          {
            id: 'p-1',
            name: 'Opening',
            type: 'normal',
            background: 'backgrounds/bg.png',
            characters: [
              { id: 'hero', expression: 'normal', animation: 'legacy-bounce', position: 'center' },
            ],
            camera: { effect: 'legacy-zoom', duration: 450 },
            bgm: null,
            se: null,
            dialogues: [{ speaker: 'hero', text: 'Hello', expression: null, voice: null }],
            transition: { type: 'legacy-wipe', duration: 1200 },
          },
        ],
      },
    },
  };
}

describe('cinematic contract compatibility', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('preserves unknown animation, camera, and transition enums through store round-trips', () => {
    const store = useScriptStore();
    const scriptData = makeScriptData();

    store.loadFromData(scriptData);

    expect(store.data.scenes.start.pages[0].characters[0].animation).toBe('legacy-bounce');
    expect(store.history[0].scenes.start.pages[0].camera.effect).toBe('legacy-zoom');
    expect(store.history[0].scenes.start.pages[0].transition.type).toBe('legacy-wipe');

    const result = store.addPage('start', 0);

    expect(result.page.characters[0].animation).toBe('legacy-bounce');
    expect(result.page.camera).toEqual({ effect: 'legacy-zoom', duration: 450 });
    expect(result.page.transition).toEqual({ type: 'legacy-wipe', duration: 1200 });
  });

  it('creates new pages with camera defaulted to null', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData());

    store.addScene('fresh-scene', 'Fresh Scene');

    expect(store.data.scenes['fresh-scene'].pages[0].camera).toBe(DEFAULT_PAGE_CAMERA);
  });

  it('surfaces unsupported transition values as explicit unknown UI options', () => {
    expect(getTransitionUiOption('fade')).toEqual({
      value: 'fade',
      label: '淡入淡出',
      known: true,
    });

    expect(getTransitionUiOption('legacy-wipe')).toEqual({
      value: 'legacy-wipe',
      label: '未知转场：legacy-wipe',
      known: false,
    });
  });
});
