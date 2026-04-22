import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useScriptStore } from '../src/editor/stores/script.js';

function makeScriptData(dialogueBox = undefined) {
  return {
    meta: { title: 'Dialogue schema flow' },
    ui: dialogueBox === undefined ? {} : { dialogueBox },
    scenes: {},
  };
}

describe('dialogueBox schema flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('defaults legacy dialogueBox data with phase 72 image fields without dropping typography fields', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData({
      fontSize: 24,
      fontFamily: 'serif',
      textColor: '#ffffff',
      nameplateFontSize: 28,
      nameplateFontFamily: 'fantasy',
      nameplateColor: '#ffcc00',
    }));

    expect(store.getDialogueBox()).toEqual({
      fontSize: 24,
      fontFamily: 'serif',
      textColor: '#ffffff',
      nameplateFontSize: 28,
      nameplateFontFamily: 'fantasy',
      nameplateColor: '#ffcc00',
      nameplateStyle: 'inline',
      nameplateBackgroundImage: null,
      decorations: [],
    });
  });

  it('adds phase 72 defaults for new projects without inventing a second frame owner', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData());

    const dialogueBox = store.getDialogueBox();

    expect(dialogueBox.nameplateStyle).toBe('inline');
    expect(dialogueBox.nameplateBackgroundImage).toBeNull();
    expect(dialogueBox.decorations).toEqual([]);
    expect(dialogueBox.frameImage).toBeUndefined();
    expect(dialogueBox.backgroundImage).toBeUndefined();
  });

  it('keeps decoration rows shaped as src/x/y/width/height through updateDialogueBox round-trips', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData({
      fontSize: 18,
      fontFamily: null,
      textColor: null,
      nameplateFontSize: 20,
      nameplateFontFamily: null,
      nameplateColor: null,
      nameplateStyle: 'floating',
      nameplateBackgroundImage: 'legacy/nameplate.png',
      decorations: [],
    }));

    store.updateDialogueBox({
      ...store.getDialogueBox(),
      nameplateBackgroundImage: 'ui/dialogue/nameplate.webp',
      decorations: [
        { src: 'ui/dialogue/decor-flower.webp', x: 12, y: -8, width: 144, height: 96 },
      ],
    });

    expect(store.getDialogueBox()).toEqual({
      fontSize: 18,
      fontFamily: null,
      textColor: null,
      nameplateFontSize: 20,
      nameplateFontFamily: null,
      nameplateColor: null,
      nameplateStyle: 'floating',
      nameplateBackgroundImage: 'ui/dialogue/nameplate.webp',
      decorations: [
        { src: 'ui/dialogue/decor-flower.webp', x: 12, y: -8, width: 144, height: 96 },
      ],
    });
  });
});
