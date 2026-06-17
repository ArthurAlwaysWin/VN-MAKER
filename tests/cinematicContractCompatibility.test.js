import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useScriptStore } from '../src/editor/stores/script.js';
import {
  CAMERA_INTENSITY_UI_OPTIONS,
  DEFAULT_PAGE_CAMERA,
  KNOWN_CAMERA_EFFECTS,
  KNOWN_CHARACTER_ANIMATIONS,
  LEGACY_TRANSITION_TYPES,
  getCameraDirectionUiOptions,
  getCameraEffectUiOptions,
  getCharacterAnimationUiOptions,
  getRuntimeTransitionType,
  getTransitionUiOption,
  getTransitionUiOptions,
} from '../src/shared/cinematicContract.js';

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
            camera: { effect: 'legacy-zoom', duration: 450, direction: 'legacy-dir' },
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
    expect(store.data.scenes.start.pages[0].camera.effect).toBe('legacy-zoom');
    expect(store.data.scenes.start.pages[0].transition.type).toBe('legacy-wipe');

    const result = store.addPage('start', 0);

    expect(result.page.characters[0].animation).toBe('legacy-bounce');
    expect(result.page.camera).toEqual({
      effect: 'legacy-zoom',
      duration: 450,
      direction: 'legacy-dir',
    });
    expect(result.page.transition).toEqual({ type: 'legacy-wipe', duration: 1200 });
  });

  it('creates new pages with camera defaulted to null instead of a fake no-camera enum', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData());

    store.addScene('fresh-scene', 'Fresh Scene');

    expect(store.data.scenes['fresh-scene'].pages[0].camera).toBe(DEFAULT_PAGE_CAMERA);
  });

  it('exposes character animation UI options with none plus the locked preset list', () => {
    const options = getCharacterAnimationUiOptions();

    expect(options.map(option => option.value)).toEqual([
      'none',
      ...KNOWN_CHARACTER_ANIMATIONS,
    ]);
    expect(options[0]).toEqual({
      value: 'none',
      label: '无',
      known: true,
    });
    expect(getCharacterAnimationUiOptions('legacy-bounce').at(-1)).toEqual({
      value: 'legacy-bounce',
      label: '未知动画：legacy-bounce',
      known: false,
    });
    expect(getCharacterAnimationUiOptions('  ').map(option => option.value)).toEqual([
      'none',
      ...KNOWN_CHARACTER_ANIMATIONS,
    ]);
  });

  it('exposes camera UI options with an explicit empty choice, fixed intensity options, and unknown-safe directions', () => {
    const effectOptions = getCameraEffectUiOptions();

    expect(effectOptions.map(option => option.value)).toEqual([
      '',
      ...KNOWN_CAMERA_EFFECTS,
    ]);
    expect(effectOptions[0]).toEqual({
      value: '',
      label: '无',
      known: true,
    });
    expect(getCameraEffectUiOptions('legacy-zoom').at(-1)).toEqual({
      value: 'legacy-zoom',
      label: '未知镜头：legacy-zoom',
      known: false,
    });

    expect(CAMERA_INTENSITY_UI_OPTIONS).toEqual([
      { value: 'low', label: '低' },
      { value: 'medium', label: '中' },
      { value: 'high', label: '高' },
    ]);

    expect(getCameraDirectionUiOptions('shake').map(option => option.value)).toEqual([
      'horizontal',
      'vertical',
      'both',
    ]);
    expect(getCameraDirectionUiOptions('pan').map(option => option.value)).toEqual([
      'left',
      'right',
      'up',
      'down',
    ]);
    expect(getCameraDirectionUiOptions('pan', 'legacy-dir').at(-1)).toEqual({
      value: 'legacy-dir',
      label: '未知方向：legacy-dir',
      known: false,
    });
    expect(getCameraDirectionUiOptions('zoom')).toEqual([]);
    expect(getCameraDirectionUiOptions('flash', 'legacy-dir')).toEqual([]);
    expect(getCameraDirectionUiOptions('vignette', 'legacy-dir')).toEqual([]);
    expect(getCameraDirectionUiOptions('letterbox', 'legacy-dir')).toEqual([]);
  });

  it('keeps transition compatibility intact while animation and camera helpers follow the same unknown-safe pattern', () => {
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

    expect(getTransitionUiOptions('scale').map(option => option.value)).toEqual(LEGACY_TRANSITION_TYPES);
    expect(getCharacterAnimationUiOptions('legacy-bounce').at(-1)).toMatchObject({
      value: 'legacy-bounce',
      known: false,
    });
    expect(getCameraEffectUiOptions('legacy-zoom').at(-1)).toMatchObject({
      value: 'legacy-zoom',
      known: false,
    });
  });

  it('executes supported catalog transitions and falls back only unknown values at runtime consumption', () => {
    expect(getRuntimeTransitionType('scale')).toBe('scale');
    expect(getRuntimeTransitionType('wipe-left')).toBe('wipe-left');
    expect(getRuntimeTransitionType('zoom-in')).toBe('zoom-in');
    expect(getRuntimeTransitionType('crossfade-pan')).toBe('crossfade-pan');
    expect(getRuntimeTransitionType('legacy-wipe')).toBe('fade');
    expect(getCharacterAnimationUiOptions('legacy-bounce').some(option => option.value === 'legacy-bounce')).toBe(true);
    expect(getCameraEffectUiOptions('legacy-zoom').some(option => option.value === 'legacy-zoom')).toBe(true);
  });
});
