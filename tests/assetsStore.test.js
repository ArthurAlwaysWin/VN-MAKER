import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAssetStore } from '../src/editor/stores/assets.js';

describe('asset store loading state', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    globalThis.window = {
      ipcRenderer: {
        invoke: vi.fn().mockRejectedValue(new Error('IPC unavailable')),
      },
    };
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it('clears the loading flag when category loading rejects', async () => {
    const assets = useAssetStore();
    await expect(assets.loadAll()).rejects.toThrow('IPC unavailable');
    expect(assets.isLoading).toBe(false);
  });
});
