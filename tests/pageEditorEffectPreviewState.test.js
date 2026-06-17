/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useScriptStore } from '../src/editor/stores/script.js';
import { createPageEditor } from '../src/editor/composables/usePageEditor.js';

function makeScriptData() {
  return {
    meta: { title: 'Preview Test' },
    ui: {
      theme: { tokens: { accent: '#ff00aa' } },
      titleScreen: { background: null, bgm: null, elements: [] },
      settingsScreen: { background: null, elements: [] },
      dialogueBox: { fontSize: 18, nameplateStyle: 'default' },
    },
    characters: {
      hero: {
        name: 'Hero',
        expressions: { normal: 'hero_normal.png' },
      },
      rival: {
        name: 'Rival',
        expressions: { normal: 'rival_normal.png' },
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
              { id: 'hero', expression: 'normal', animation: 'shake', position: 'left' },
              { id: 'rival', expression: 'normal', animation: 'fade-in', position: 'right' },
            ],
            camera: { effect: 'zoom', durationMs: 450, intensity: 'medium', trigger: 'onEnter' },
            bgm: null,
            se: null,
            dialogues: [{ speaker: 'hero', text: 'Hello', expression: null, voice: null }],
            transition: { type: 'scale', duration: 800 },
          },
          {
            id: 'p-2',
            name: 'Second',
            type: 'normal',
            background: 'backgrounds/bg2.png',
            characters: [
              { id: 'hero', expression: 'normal', animation: 'nod', position: 'center' },
            ],
            camera: { effect: 'pan', durationMs: 500, intensity: 'low', direction: 'left', trigger: 'onEnter' },
            bgm: null,
            se: null,
            dialogues: [{ speaker: 'hero', text: 'Again', expression: null, voice: null }],
            transition: { type: 'fade', duration: 700 },
          },
        ],
      },
    },
  };
}

function mountEditor(scriptData = makeScriptData()) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const store = useScriptStore();
  store.loadFromData(scriptData);

  const container = document.createElement('div');
  document.body.appendChild(container);

  let editor;
  const app = createApp({
    setup() {
      editor = createPageEditor();
      return () => null;
    },
  });
  app.use(pinia);
  app.mount(container);
  editor.initSelection();

  const postMessage = vi.fn();
  const contentWindow = { postMessage };
  const iframe = document.createElement('iframe');
  Object.defineProperty(iframe, 'contentWindow', {
    value: contentWindow,
    configurable: true,
  });
  editor.previewIframeRef.value = iframe;
  editor.selectCharacter(0);

  return { app, container, editor, store, postMessage, contentWindow };
}

describe('page editor effect preview state', () => {
  let harness;

  afterEach(() => {
    harness?.app.unmount();
    harness = null;
    document.body.innerHTML = '';
  });

  beforeEach(() => {
    harness = mountEditor();
  });

  it('rejects explicit preflight reasons before sending any iframe message', () => {
    const { editor, postMessage } = harness;

    const noEngine = editor.previewCharacterEffect({ characterId: 'hero', animation: 'shake' });
    expect(noEngine).toEqual({ ok: false, reason: 'engine-not-ready' });
    expect(editor.previewDisabledReason.value).toBe('engine-not-ready');
    expect(postMessage).not.toHaveBeenCalled();

    editor.isEngineReady.value = true;

    editor.selectPage(null, 0);
    const noPage = editor.previewCharacterEffect({ characterId: 'hero', animation: 'shake' });
    expect(noPage).toEqual({ ok: false, reason: 'no-page-selected' });
    expect(editor.previewDisabledReason.value).toBe('no-page-selected');
    expect(postMessage).not.toHaveBeenCalled();

    editor.selectPage('start', 0);
    editor.selectCharacter(0);

    const noAnimation = editor.previewCharacterEffect({ characterId: 'hero' });
    expect(noAnimation).toEqual({ ok: false, reason: 'missing-character-animation' });

    const noCamera = editor.previewCameraEffect({});
    expect(noCamera).toEqual({ ok: false, reason: 'missing-camera-config' });

    const noTransition = editor.previewTransitionEffect({});
    expect(noTransition).toEqual({ ok: false, reason: 'missing-transition-config' });

    const noParticle = editor.previewParticleEffect({});
    expect(noParticle).toEqual({ ok: false, reason: 'missing-particle-config' });

    expect(postMessage).not.toHaveBeenCalled();
  });

  it('sends a shared preview-effect envelope and only enters effect session after posting it', () => {
    const { editor, postMessage } = harness;
    editor.isEngineReady.value = true;

    postMessage.mockImplementation(() => {
      expect(editor.previewSessionType.value).toBe(null);
      expect(editor.isPreviewMode.value).toBe(false);
      expect(editor.isEffectPreviewBusy.value).toBe(false);
    });

    const result = editor.previewCharacterEffect({
      characterId: 'hero',
      animation: 'shake',
      durationMs: 300,
    });

    expect(result.ok).toBe(true);
    expect(result.requestId).toMatch(/^preview-effect-/);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'preview-effect',
      requestId: result.requestId,
      effectKind: 'character',
      sceneId: 'start',
      pageIndex: 0,
      script: JSON.parse(JSON.stringify(harness.store.data)),
      payload: {
        characterId: 'hero',
        animation: 'shake',
        durationMs: 300,
      },
    }, window.location.origin);

    expect(editor.previewSessionType.value).toBe('effect');
    expect(editor.isPreviewMode.value).toBe(true);
    expect(editor.isEffectPreviewBusy.value).toBe(true);
    expect(editor.activeEffectPreviewRequestId.value).toBe(result.requestId);
    expect(editor.previewDisabledReason.value).toBe(null);
  });

  it('sends particle previews through the shared preview-effect envelope', () => {
    const { editor, postMessage } = harness;
    editor.isEngineReady.value = true;

    const result = editor.previewParticleEffect({
      config: { preset: 'snow', density: 0.5, speed: 1, wind: 0, opacity: 0.8, color: '#ffffff', direction: 'down' },
      durationMs: 1200,
    });

    expect(result.ok).toBe(true);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'preview-effect',
      requestId: result.requestId,
      effectKind: 'particle',
      sceneId: 'start',
      pageIndex: 0,
      script: JSON.parse(JSON.stringify(harness.store.data)),
      payload: {
        config: { preset: 'snow', density: 0.5, speed: 1, wind: 0, opacity: 0.8, color: '#ffffff', direction: 'down' },
        durationMs: 1200,
      },
    }, window.location.origin);
    expect(editor.isEffectPreviewBusy.value).toBe(true);
  });

  it('tracks accepted and terminal preview-effect-result messages in effect preview state', () => {
    const { editor, contentWindow } = harness;
    editor.isEngineReady.value = true;

    const request = editor.previewTransitionEffect({
      type: 'scale',
      duration: 800,
    });

    editor.onEngineMessage({
      source: contentWindow,
      data: {
        type: 'preview-effect-result',
        requestId: request.requestId,
        effectKind: 'transition',
        status: 'accepted',
        reason: null,
      },
    });

    expect(editor.isEffectPreviewBusy.value).toBe(true);
    expect(editor.activeEffectPreviewRequestId.value).toBe(request.requestId);
    expect(editor.lastEffectPreviewResult.value).toEqual({
      type: 'preview-effect-result',
      requestId: request.requestId,
      effectKind: 'transition',
      status: 'accepted',
      reason: null,
    });

    for (const status of ['completed', 'cancelled', 'rejected', 'failed']) {
      const nextRequest = editor.previewCameraEffect({
        effect: 'zoom',
        durationMs: 450,
        intensity: 'medium',
      });

      editor.onEngineMessage({
        source: contentWindow,
        data: {
          type: 'preview-effect-result',
          requestId: nextRequest.requestId,
          effectKind: 'camera',
          status,
          reason: status === 'failed' ? 'runtime-error' : null,
        },
      });

      expect(editor.isEffectPreviewBusy.value).toBe(false);
      expect(editor.activeEffectPreviewRequestId.value).toBe(null);
      expect(editor.lastEffectPreviewResult.value).toEqual({
        type: 'preview-effect-result',
        requestId: nextRequest.requestId,
        effectKind: 'camera',
        status,
        reason: status === 'failed' ? 'runtime-error' : null,
        provenance: {
          sceneId: 'start',
          pageIndex: 0,
        },
      });
      expect(editor.previewSessionType.value).toBe(null);
      expect(editor.isPreviewMode.value).toBe(false);
    }
  });

  it('keeps full-play stop semantics while effect sessions auto-exit on terminal results', () => {
    const { editor, postMessage, contentWindow } = harness;
    editor.isEngineReady.value = true;

    editor.startPreview();
    expect(editor.previewSessionType.value).toBe('play');
    expect(editor.isPreviewMode.value).toBe(true);
    expect(postMessage).toHaveBeenLastCalledWith({
      type: 'start',
      script: JSON.parse(JSON.stringify(harness.store.data)),
      sceneId: 'start',
      pageIndex: 0,
      previewMode: true,
    }, window.location.origin);

    editor.stopPreview();
    expect(postMessage).toHaveBeenLastCalledWith({ type: 'stop' }, window.location.origin);
    expect(editor.previewSessionType.value).toBe(null);
    expect(editor.isPreviewMode.value).toBe(false);

    const request = editor.previewCharacterEffect({
      characterId: 'hero',
      animation: 'shake',
    });

    expect(editor.previewSessionType.value).toBe('effect');
    const callsBeforeTerminal = postMessage.mock.calls.length;

    editor.onEngineMessage({
      source: contentWindow,
      data: {
        type: 'preview-effect-result',
        requestId: request.requestId,
        effectKind: 'character',
        status: 'completed',
        reason: null,
      },
    });

    expect(postMessage).toHaveBeenCalledTimes(callsBeforeTerminal);
    expect(editor.previewSessionType.value).toBe(null);
    expect(editor.isPreviewMode.value).toBe(false);
  });

  it('exposes scoped busy and terminal result state only for the matching effect kind and provenance', () => {
    const { editor, contentWindow } = harness;
    editor.isEngineReady.value = true;

    const cameraRequest = editor.previewCameraEffect({
      effect: 'zoom',
      durationMs: 450,
      intensity: 'medium',
    });

    expect(editor.getEffectPreviewUiState('camera')).toMatchObject({
      isBusy: true,
      isDisabled: false,
      disabledReason: null,
      result: null,
    });
    expect(editor.getEffectPreviewUiState('character')).toMatchObject({
      isBusy: false,
      result: null,
    });

    editor.onEngineMessage({
      source: contentWindow,
      data: {
        type: 'preview-effect-result',
        requestId: cameraRequest.requestId,
        effectKind: 'camera',
        status: 'rejected',
        reason: 'unsupported-effect',
      },
    });

    expect(editor.getEffectPreviewUiState('camera')).toMatchObject({
      isBusy: false,
      isDisabled: false,
      disabledReason: null,
      result: {
        type: 'preview-effect-result',
        requestId: cameraRequest.requestId,
        effectKind: 'camera',
        status: 'rejected',
        reason: 'unsupported-effect',
        provenance: {
          sceneId: 'start',
          pageIndex: 0,
        },
      },
    });
    expect(editor.getEffectPreviewUiState('character')).toMatchObject({
      isBusy: false,
      result: null,
    });

    editor.selectPage('start', 1);
    expect(editor.getEffectPreviewUiState('camera')).toMatchObject({
      isBusy: false,
      result: null,
    });
  });

  it('only surfaces disabled reasons for the last attempted effect kind and matching current context', () => {
    const { editor } = harness;
    editor.isEngineReady.value = true;

    editor.previewCharacterEffect({ characterId: 'hero' });
    expect(editor.getEffectPreviewUiState('character')).toMatchObject({
      isDisabled: true,
      disabledReason: 'missing-character-animation',
    });
    expect(editor.getEffectPreviewUiState('camera')).toMatchObject({
      isDisabled: false,
      disabledReason: null,
    });

    editor.selectCharacter(1);
    expect(editor.getEffectPreviewUiState('character')).toMatchObject({
      isDisabled: false,
      disabledReason: null,
    });

    editor.previewTransitionEffect({});
    expect(editor.getEffectPreviewUiState('transition')).toMatchObject({
      isDisabled: true,
      disabledReason: 'missing-transition-config',
    });
    expect(editor.getEffectPreviewUiState('character')).toMatchObject({
      isDisabled: false,
      disabledReason: null,
    });
  });

  it('drops stale same-kind character results after switching the selected row', () => {
    const { editor, contentWindow } = harness;
    editor.isEngineReady.value = true;

    editor.selectCharacter(0);
    const request = editor.previewCharacterEffect({
      characterId: 'hero',
      animation: 'shake',
    });

    editor.onEngineMessage({
      source: contentWindow,
      data: {
        type: 'preview-effect-result',
        requestId: request.requestId,
        effectKind: 'character',
        status: 'completed',
        reason: null,
      },
    });

    expect(editor.getEffectPreviewUiState('character')).toMatchObject({
      result: {
        type: 'preview-effect-result',
        requestId: request.requestId,
        effectKind: 'character',
        status: 'completed',
        reason: null,
      },
    });

    editor.selectCharacter(1);
    expect(editor.getEffectPreviewUiState('character')).toMatchObject({
      isBusy: false,
      isDisabled: false,
      disabledReason: null,
      result: null,
    });
  });

  it('keeps effect-session stop on preview-effect-stop while full-play stop still posts stop', () => {
    const { editor, postMessage } = harness;
    editor.isEngineReady.value = true;

    const request = editor.previewCameraEffect({
      effect: 'zoom',
      durationMs: 450,
      intensity: 'medium',
    });
    postMessage.mockClear();

    editor.stopPreview();
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: 'preview-effect-stop',
      requestId: request.requestId,
    }, window.location.origin);
    expect(editor.previewSessionType.value).toBe('effect');

    editor.previewSessionType.value = 'play';
    postMessage.mockClear();

    editor.stopPreview();
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: 'stop' }, window.location.origin);
    expect(editor.previewSessionType.value).toBe(null);
  });
});
