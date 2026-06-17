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

  it('reuses a pending IndexedDB open request for concurrent callers', async () => {
    const open = installIndexedDbOpenMock();
    const saveManager = new WebSaveManager('gm_story');

    const [firstDb, secondDb] = await Promise.all([
      saveManager._getDb(),
      saveManager._getDb(),
    ]);

    expect(firstDb).toBe(secondDb);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('returns a save failure instead of throwing when state is not JSON-serializable', async () => {
    const saveManager = new WebSaveManager('gm_story');
    saveManager._getDb = vi.fn();
    const state = { currentScene: 'start' };
    state.self = state;

    await expect(saveManager.save(1, state, 'Preview')).resolves.toMatchObject({
      success: false,
    });
    expect(saveManager._getDb).not.toHaveBeenCalled();
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

  it('rejects invalid regular slots before opening IndexedDB', async () => {
    const saveManager = new WebSaveManager('gm_story');
    const getDb = vi.spyOn(saveManager, '_getDb');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(saveManager.save(0, { currentScene: 'start' }, 'Preview'))
      .resolves.toEqual({ success: false, error: 'Invalid slot number' });
    await expect(saveManager.load(109)).resolves.toBeNull();
    await expect(saveManager.delete(1.5)).resolves.toEqual({ success: false, error: 'Invalid slot number' });

    expect(getDb).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('[WebSaveManager] Invalid slot number:', 109);
  });
});
