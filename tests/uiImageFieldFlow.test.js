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

  it('rewires DialogueBoxSettings image fields to the shared picker helpers and exposes decoration rows without a freeform file loader', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'DialogueBoxSettings.vue'),
      'utf8',
    );

    expect(source).toContain('pickUiImage');
    expect(source).toContain('clearUiImage');
    expect(source).toContain('nameplateBackgroundImage');
    expect(source).toContain('decorations');
    expect(source).toContain("'x'");
    expect(source).toContain("'y'");
    expect(source).toContain("'width'");
    expect(source).toContain("'height'");
    expect(source).not.toContain('FileReader');
    expect(source).not.toContain('readAsDataURL');
  });

  it('routes dialogue preview ownership through ProjectSettings instead of local mini preview guesses', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'views', 'ProjectSettings.vue'),
      'utf8',
    );

    expect(source).toContain("type: 'show-dialogue-preview'");
    expect(source).toContain("speakerName: '预览角色'");
    expect(source).toContain('themeEditor.flushPreview()');
    expect(source).toContain("provide('dialoguePreview'");
  });
});

describe('ButtonFamilyImageSettings editor surface', () => {
  it('exists as a Vue component and writes only the five locked family keys under ui.theme.buttonFamilies', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'theme', 'ButtonFamilyImageSettings.vue'),
      'utf8',
    );

    // Must reference all five locked families
    expect(source).toContain('gameMenuButton');
    expect(source).toContain('qab');
    expect(source).toContain('closeButton');
    expect(source).toContain('pageTabPager');
    expect(source).toContain('settingsTab');

    // Must write through theme.buttonFamilies
    expect(source).toContain('buttonFamilies');
    expect(source).toContain('getTheme');
    expect(source).toContain('commitTheme');
  });

  it('uses pickUiImage and clearUiImage from the shared helpers with no FileReader fallback', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'theme', 'ButtonFamilyImageSettings.vue'),
      'utf8',
    );

    expect(source).toContain('pickUiImage');
    expect(source).toContain('clearUiImage');
    expect(source).not.toContain('FileReader');
    expect(source).not.toContain('readAsDataURL');
  });

  it('exposes normal/hover/pressed for three-state families and normal/hover/pressed/selected for tab families', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'components', 'theme', 'ButtonFamilyImageSettings.vue'),
      'utf8',
    );

    // Must reference all state keys
    expect(source).toContain('normal');
    expect(source).toContain('hover');
    expect(source).toContain('pressed');
    expect(source).toContain('selected');
  });

  it('is mounted in ProjectSettings inside the global theme section', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src', 'editor', 'views', 'ProjectSettings.vue'),
      'utf8',
    );

    expect(source).toContain('ButtonFamilyImageSettings');
    expect(source).toContain("import ButtonFamilyImageSettings from '../components/theme/ButtonFamilyImageSettings.vue'");
  });

  it('writes through theme owner and triggers iframe update on pick and clear', async () => {
    const harness = mountThemeHarness(makeScriptData());
    const { store, editor, postMessage } = harness;

    vi.useFakeTimers();

    // Initialize buttonFamilies
    const theme = store.getTheme();
    theme.buttonFamilies = {
      gameMenuButton: { normal: null, hover: null, pressed: null },
      qab: { normal: null, hover: null, pressed: null },
      closeButton: { normal: null, hover: null, pressed: null },
      pageTabPager: { normal: null, hover: null, pressed: null, selected: null },
      settingsTab: { normal: null, hover: null, pressed: null, selected: null },
    };

    const assets = {
      selectAsset: vi.fn().mockResolvedValue('ui/buttons/menu-normal.webp'),
    };

    // Pick image for gameMenuButton.normal
    await pickUiImage({
      assets,
      setValue: (value) => {
        theme.buttonFamilies.gameMenuButton.normal = value;
      },
      preview: () => editor.sendThemeToPreview(),
      commit: () => editor.commitTheme(),
    });

    vi.runAllTimers();

    expect(theme.buttonFamilies.gameMenuButton.normal).toBe('ui/buttons/menu-normal.webp');
    expect(postMessage).toHaveBeenCalled();

    // Clear should set to null and trigger update
    postMessage.mockClear();
    clearUiImage({
      setValue: (value) => {
        theme.buttonFamilies.gameMenuButton.normal = value;
      },
      preview: () => editor.sendThemeToPreview(),
      commit: () => editor.commitTheme(),
    });

    vi.runAllTimers();

    expect(theme.buttonFamilies.gameMenuButton.normal).toBeNull();
    expect(postMessage).toHaveBeenCalled();

    harness.app.unmount();
    vi.useRealTimers();
  });
});
