import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAssetStore } from '../src/editor/stores/assets.js';
import { useScriptStore } from '../src/editor/stores/script.js';
import { useVoiceMatch } from '../src/editor/composables/useVoiceMatch.js';

function makeScriptData() {
  return {
    meta: {
      title: 'Asset rename flow',
      note: 'audio/old.wav',
      uiNote: 'ui/old.png',
    },
    characters: {
      hero: { expressions: { normal: 'characters/hero.png' } },
    },
    assets: {
      fonts: [{ id: 'body', name: 'Body', family: 'Body', file: 'fonts/old.ttf' }],
    },
    ui: {
      theme: {
        choiceBadge: { a: 'ui/old.png' },
      },
      titleScreen: {
        background: 'backgrounds/old.png',
        bgm: 'audio/old.wav',
        elements: [{ type: 'text', text: 'backgrounds/old.png' }],
      },
      settingsScreen: {
        header: { backgroundImage: 'backgrounds/old.png' },
      },
      saveLoadScreen: {
        background: 'backgrounds/old.png',
      },
      dialogueBox: {
        nameplateBackgroundImage: 'backgrounds/old.png',
      },
      widgetStyles: {
        panel: { backgroundImage: 'backgrounds/old.png' },
      },
    },
    scenes: {
      intro: {
        name: 'Intro',
        pages: [
          {
            type: 'normal',
            background: 'backgrounds/old.png',
            bgm: { file: 'audio/old.wav' },
            se: { file: 'audio/old.wav' },
            dialogues: [{ speaker: 'hero', text: 'audio/old.wav', voice: 'audio/old.wav' }],
          },
        ],
      },
    },
  };
}

describe('asset rename reference integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    delete globalThis.window;
    vi.restoreAllMocks();
  });

  it.each([
    ['backgrounds', 'old.png', 'old-1.png', 6],
    ['audio', 'old.wav', 'old-1.wav', 4],
    ['characters', 'hero.png', 'hero-1.png', 1],
    ['fonts', 'old.ttf', 'old-1.ttf', 1],
    ['ui', 'old.png', 'old-1.png', 1],
  ])('rewrites canonical %s references using the filename returned by IPC', async (category, oldName, savedName, expectedCount) => {
    const invoke = vi.fn(async (channel) => {
      if (channel === 'rename-asset') return { success: true, newName: savedName };
      if (channel === 'list-assets') return { success: true, files: [savedName] };
      throw new Error(`Unexpected channel: ${channel}`);
    });
    globalThis.window = { ipcRenderer: { invoke } };

    const script = useScriptStore();
    script.loadFromData(makeScriptData());
    const assets = useAssetStore();
    const beforeRevision = script.changeRevision;

    await expect(assets.renameAsset(category, oldName, 'requested-name.ext')).resolves.toMatchObject({
      success: true,
      newName: savedName,
    });

    expect(script.history).toHaveLength(2);
    expect(script.history[1].patches).toHaveLength(expectedCount);
    expect(script.changeRevision).toBe(beforeRevision + expectedCount);
    expect(JSON.stringify(script.data)).toContain(`${category}/${savedName}`);
    expect(script.data.meta.note).toBe('audio/old.wav');
    expect(script.data.meta.uiNote).toBe('ui/old.png');
    expect(script.data.ui.titleScreen.elements[0].text).toBe('backgrounds/old.png');
    if (category === 'backgrounds') {
      expect(script.data.ui.settingsScreen.header.backgroundImage).toBe('backgrounds/old-1.png');
      expect(script.data.ui.saveLoadScreen.background).toBe('backgrounds/old-1.png');
      expect(script.data.ui.dialogueBox.nameplateBackgroundImage).toBe('backgrounds/old-1.png');
      expect(script.data.ui.widgetStyles.panel.backgroundImage).toBe('backgrounds/old-1.png');
    }
    if (category === 'ui') {
      expect(script.data.ui.theme.choiceBadge.a).toBe('ui/old-1.png');
    }

    script.undo();
    expect(JSON.stringify(script.data)).toContain(`${category}/${oldName}`);
    script.redo();
    expect(JSON.stringify(script.data)).toContain(`${category}/${savedName}`);
    expect(script.changeRevision).toBe(beforeRevision + expectedCount + 2);
  });

  it('does not create history or alter references when the filesystem rename fails', async () => {
    globalThis.window = {
      ipcRenderer: { invoke: vi.fn().mockResolvedValue({ success: false, error: 'File already exists' }) },
    };
    const script = useScriptStore();
    script.loadFromData(makeScriptData());
    const assets = useAssetStore();

    await assets.renameAsset('audio', 'old.wav', 'taken.wav');

    expect(script.history).toHaveLength(1);
    expect(script.data.scenes.intro.pages[0].bgm.file).toBe('audio/old.wav');
  });

  it('matches voices only on normal dialogue pages', () => {
    const script = useScriptStore();
    const pages = ['normal', 'choice', 'input', 'condition', 'video'].map((type) => ({
      type,
      dialogues: [{ speaker: 'hero', text: type, voice: null }],
    }));
    script.loadFromData({
      meta: { title: 'Voice filter' },
      scenes: { intro: { name: 'Intro', pages } },
    });
    const assets = useAssetStore();
    assets.files.audio = pages.map((_page, index) => `hero_0_${index}_0.wav`);

    const result = useVoiceMatch().buildMatches('all');

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({ pageIdx: 0, text: 'normal' });
  });
});
