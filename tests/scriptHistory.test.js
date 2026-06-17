import { beforeEach, describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, watch } from 'vue';

import { useScriptStore } from '../src/editor/stores/script.js';

function makeScriptData() {
  return {
    projectId: 'gm_history',
    meta: { title: 'History test' },
    characters: {},
    scenes: {},
  };
}

function makePagedScript(pageCount) {
  return {
    ...makeScriptData(),
    scenes: {
      start: {
        name: 'Start',
        pages: Array.from({ length: pageCount }, (_, index) => ({
          type: 'normal',
          name: `Page ${index}`,
          characters: [],
          dialogues: [{ speaker: null, text: `Line ${index}`, expression: null, voice: null }],
        })),
      },
    },
  };
}

describe('script undo history', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('skips duplicate snapshots while retaining changed states for undo', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData());

    store.pushState();
    expect(store.history).toHaveLength(1);
    expect(store.historyIndex).toBe(0);

    store.data.meta.title = 'Updated history test';
    store.pushState();
    store.pushState();

    expect(store.history).toHaveLength(2);
    expect(store.historyIndex).toBe(1);

    store.undo();
    expect(store.data.meta.title).toBe('History test');
  });

  it('notifies direct nested edits without traversing the script and keeps nested Vue reactivity', async () => {
    const store = useScriptStore();
    store.loadFromData(makePagedScript(2));
    const revisions = [];
    const previewValues = [];
    const stopRevision = watch(() => store.changeRevision, value => revisions.push(value));
    const stopPreview = watch(
      () => store.data.scenes.start.pages[1].dialogues[0].text,
      value => previewValues.push(value),
    );

    store.data.scenes.start.pages[1].dialogues[0].text = 'Direct edit';
    await nextTick();

    expect(revisions).toHaveLength(1);
    expect(previewValues).toEqual(['Direct edit']);
    stopRevision();
    stopPreview();
  });

  it('undoes and redoes direct object, array, and delete mutations as one patch transaction', () => {
    const store = useScriptStore();
    store.loadFromData(makePagedScript(2));

    const page = store.data.scenes.start.pages[0];
    page.name = 'Changed';
    page.dialogues.push({ speaker: null, text: 'Added', expression: null, voice: null });
    delete page.dialogues[0].voice;
    store.pushState();

    expect(store.history[1].patches.length).toBeGreaterThan(0);
    expect(store.history[1]).not.toHaveProperty('scenes');
    store.undo();
    expect(store.data.scenes.start.pages[0].name).toBe('Page 0');
    expect(store.data.scenes.start.pages[0].dialogues).toHaveLength(1);
    expect(store.data.scenes.start.pages[0].dialogues[0]).toHaveProperty('voice', null);

    store.redo();
    expect(store.data.scenes.start.pages[0].name).toBe('Changed');
    expect(store.data.scenes.start.pages[0].dialogues).toHaveLength(2);
    expect(store.data.scenes.start.pages[0].dialogues[0]).not.toHaveProperty('voice');
  });

  it('tracks the current path when an object is reordered and then edited', () => {
    const store = useScriptStore();
    store.loadFromData(makePagedScript(3));

    const pages = store.data.scenes.start.pages;
    const [movedPage] = pages.splice(0, 1);
    pages.splice(1, 0, movedPage);
    movedPage.name = 'Moved and edited';
    store.pushState();

    expect(pages.map(page => page.name)).toEqual(['Page 1', 'Moved and edited', 'Page 2']);
    store.undo();
    expect(pages.map(page => page.name)).toEqual(['Page 0', 'Page 1', 'Page 2']);
    store.redo();
    expect(pages.map(page => page.name)).toEqual(['Page 1', 'Moved and edited', 'Page 2']);
  });

  it('commits pending direct edits before undo and truncates the redo branch after a new edit', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData());

    store.data.meta.title = 'First';
    store.pushState();
    store.data.meta.title = 'Second';
    store.undo();
    expect(store.data.meta.title).toBe('First');
    expect(store.history).toHaveLength(3);

    store.data.meta.title = 'Branched';
    store.pushState();
    expect(store.history).toHaveLength(3);
    expect(store.historyIndex).toBe(2);
    store.redo();
    expect(store.data.meta.title).toBe('Branched');
  });

  it('retains the 50-entry history limit with patch entries', () => {
    const store = useScriptStore();
    store.loadFromData(makeScriptData());

    for (let index = 0; index < 60; index++) {
      store.data.meta.title = `Edit ${index}`;
      store.pushState();
    }

    expect(store.history).toHaveLength(50);
    expect(store.historyIndex).toBe(49);
    for (let index = 0; index < 49; index++) store.undo();
    expect(store.historyIndex).toBe(0);
    expect(store.data.meta.title).toBe('Edit 10');
  });

  it('stores a page-sized patch instead of another full large-project snapshot', () => {
    const store = useScriptStore();
    store.loadFromData(makePagedScript(10_000));

    store.data.scenes.start.pages[9_999].dialogues[0].text = 'Tail edit';
    store.pushState();

    const patchBytes = Buffer.byteLength(JSON.stringify(store.history[1]));
    const projectBytes = Buffer.byteLength(JSON.stringify(store.data));
    expect(patchBytes).toBeLessThan(1_000);
    expect(projectBytes).toBeGreaterThan(patchBytes * 1_000);

    const started = performance.now();
    for (let index = 0; index < 20; index++) {
      store.data.scenes.start.pages[9_999].dialogues[0].text = `Tail edit ${index}`;
      store.pushState();
    }
    const elapsed = performance.now() - started;
    const retainedPatchBytes = Buffer.byteLength(JSON.stringify(store.history.slice(2)));
    expect(elapsed).toBeLessThan(250);
    expect(retainedPatchBytes).toBeLessThan(20_000);
  });
});
