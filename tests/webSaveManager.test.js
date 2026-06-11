import { afterEach, describe, expect, it, vi } from 'vitest';

import { WebSaveManager } from '../src/engine/WebSaveManager.js';

function installIndexedDbOpenMock() {
  const open = vi.fn(() => {
    const request = {};
    queueMicrotask(() => {
      request.onsuccess?.({
        target: {
          result: {
            objectStoreNames: { contains: () => true },
          },
        },
      });
    });
    return request;
  });
  vi.stubGlobal('indexedDB', { open });
  return open;
}

describe('WebSaveManager project storage isolation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses to open an unscoped shared save database', async () => {
    const saveManager = new WebSaveManager();

    await expect(saveManager._getDb()).rejects.toThrow('projectId has not been configured');
  });

  it('uses distinct IndexedDB namespaces for distinct projects', async () => {
    const open = installIndexedDbOpenMock();

    await new WebSaveManager('gm_story_a')._getDb();
    await new WebSaveManager('gm_story_b')._getDb();

    expect(open).toHaveBeenNthCalledWith(1, 'galgame-saves:gm_story_a', 1);
    expect(open).toHaveBeenNthCalledWith(2, 'galgame-saves:gm_story_b', 1);
  });

  it('persists data URL thumbnails for exported web save slots', async () => {
    const records = new Map();
    const saveManager = new WebSaveManager('gm_story');
    saveManager._getDb = vi.fn().mockResolvedValue({});
    saveManager._put = vi.fn(async (_db, _storeName, record) => {
      records.set(record.slot, record);
    });
    saveManager._getAll = vi.fn(async () => [...records.values()]);
    const thumbnail = 'data:image/jpeg;base64,aGVsbG8=';

    await expect(saveManager.save(1, { currentScene: 'start' }, 'Preview', thumbnail))
      .resolves.toEqual({ success: true });

    expect(records.get(1)).toMatchObject({
      thumbnail,
      hasThumbnail: true,
    });
    await expect(saveManager.getAllSlots()).resolves.toEqual([
      expect.objectContaining({
        slot: 1,
        thumbnail,
        hasThumbnail: true,
      }),
    ]);
  });
});
