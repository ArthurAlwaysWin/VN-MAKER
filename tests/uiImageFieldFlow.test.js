/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from 'vue';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPinia, setActivePinia } from 'pinia';
import { useScriptStore } from '../src/editor/stores/script.js';
import { createThemeEditor } from '../src/editor/composables/useThemeEditor.js';
import {
  clearUiImage,
  getUiImageDisplayValue,
  pickUiImage,
} from '../src/editor/utils/uiImageField.js';

function makeScriptData(src = 'legacy/dialogue-box.png') {
  return {
    meta: { title: 'UI image helper test' },
    ui: {
      theme: {
        tokens: {},
        nineSlice: {
          dialogueBox: {
            src,
            slice: [20, 20, 20, 20],
            states: null,
          },
        },
      },
    },
    scenes: {},
  };
}

function mountThemeHarness(scriptData = makeScriptData()) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const store = useScriptStore();
  store.loadFromData(scriptData);

  const container = document.createElement('div');
  document.body.appendChild(container);

  let editor;
  const app = createApp({
    setup() {
      editor = createThemeEditor();
      return () => null;
    },
  });
  app.use(pinia);
  app.mount(container);

  const postMessage = vi.fn();
  const contentWindow = { postMessage };
  const iframe = document.createElement('iframe');
  Object.defineProperty(iframe, 'contentWindow', {
    value: contentWindow,
    configurable: true,
  });
  editor.iframeRef.value = iframe;
  editor.isEngineReady.value = true;

  return { app, container, store, editor, postMessage };
}

describe('uiImageField helper flow', () => {
  let harness;

  beforeEach(() => {
    vi.useFakeTimers();
    harness = mountThemeHarness();
  });

  afterEach(() => {
    harness?.app.unmount();
    harness = null;
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('writes canonical ui paths through the theme owner and keeps them stable after a save-reload round-trip', async () => {
    const { store, editor, postMessage } = harness;
    const assets = {
      selectAsset: vi.fn().mockResolvedValue('ui/dialogue/frame.webp'),
    };

    const setThemeSrc = (value) => {
      store.getTheme().nineSlice.dialogueBox.src = value;
    };

    await expect(pickUiImage({
      assets,
      setValue: setThemeSrc,
      preview: () => editor.sendThemeToPreview(),
      commit: () => editor.commitTheme(),
    })).resolves.toBe(true);

    vi.runAllTimers();

    expect(assets.selectAsset).toHaveBeenCalledWith(['ui']);
    expect(store.getTheme().nineSlice.dialogueBox.src).toBe('ui/dialogue/frame.webp');
    expect(postMessage).toHaveBeenCalled();

    const persisted = JSON.parse(JSON.stringify(store.data));
    store.loadFromData(persisted);

    expect(store.getTheme().nineSlice.dialogueBox.src).toBe('ui/dialogue/frame.webp');
  });

  it('keeps legacy values untouched when the user cancels instead of explicitly reselecting', async () => {
    const { store, editor, postMessage } = harness;
    const assets = {
      selectAsset: vi.fn().mockResolvedValue(null),
    };
    const preview = vi.spyOn(editor, 'sendThemeToPreview');
    const commit = vi.spyOn(editor, 'commitTheme');

    await expect(pickUiImage({
      assets,
      setValue: (value) => {
        store.getTheme().nineSlice.dialogueBox.src = value;
      },
      preview: () => editor.sendThemeToPreview(),
      commit: () => editor.commitTheme(),
    })).resolves.toBe(false);

    expect(store.getTheme().nineSlice.dialogueBox.src).toBe('legacy/dialogue-box.png');
    expect(getUiImageDisplayValue(store.getTheme().nineSlice.dialogueBox.src)).toBe('legacy/dialogue-box.png');
    expect(preview).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('rejects non-canonical picker results instead of silently falling back to text paths or FileReader', async () => {
    const { store } = harness;
    const assets = {
      selectAsset: vi.fn().mockResolvedValue('assets/ui/dialogue/frame.webp'),
    };

    await expect(pickUiImage({
      assets,
      setValue: (value) => {
        store.getTheme().nineSlice.dialogueBox.src = value;
      },
    })).rejects.toThrow('canonical ui/... path');

    expect(store.getTheme().nineSlice.dialogueBox.src).toBe('legacy/dialogue-box.png');
  });

  it('clears the field through the owner callbacks and exposes empty display values safely', async () => {
    const { store, editor } = harness;

    clearUiImage({
      setValue: (value) => {
        store.getTheme().nineSlice.dialogueBox.src = value;
      },
      preview: () => editor.sendThemeToPreview(),
      commit: () => editor.commitTheme(),
    });

    vi.runAllTimers();

    expect(store.getTheme().nineSlice.dialogueBox.src).toBeNull();
    expect(getUiImageDisplayValue(store.getTheme().nineSlice.dialogueBox.src)).toBe('');
  });

  it('rewires NineSliceModal to the shared picker helpers and removes FileReader persistence', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'theme', 'NineSliceModal.vue'),
      'utf8',
    );

    expect(source).toContain('pickUiImage');
    expect(source).toContain('clearUiImage');
    expect(source).not.toContain('FileReader');
    expect(source).not.toContain('readAsDataURL');
  });
});
