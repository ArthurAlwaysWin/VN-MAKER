import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useScriptStore } from '../src/editor/stores/script.js';

function makeScriptData() {
  return {
    projectId: 'gm_history',
    meta: { title: 'History test' },
    characters: {},
    scenes: {},
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
});
