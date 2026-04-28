import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GALGAME_RESET_SCOPES } from '../src/shared/galgameContract.js';
import {
  PLAYER_PROFILE_VERSION,
  PlayerDataRepository,
  createIpcPlayerDataStorage,
  createPlayerDataRepositoryFromScript,
} from '../src/engine/PlayerDataRepository.js';
import { ReadHistory } from '../src/engine/ReadHistory.js';
import { SaveManager } from '../src/engine/SaveManager.js';
import { ScriptEngine } from '../src/engine/ScriptEngine.js';
import { WebSaveManager } from '../src/engine/WebSaveManager.js';

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createMemoryStorage(initialState = {}) {
  const state = {
    profiles: new Map(
      Object.entries(initialState.profiles ?? {}).map(([projectId, profile]) => [
        projectId,
        cloneJson(profile),
      ]),
    ),
    saves: new Map(
      Object.entries(initialState.saves ?? {}).map(([slotId, payload]) => [
        slotId,
        cloneJson(payload),
      ]),
    ),
  };
  const calls = {
    loadProfile: [],
    saveProfile: [],
    reset: [],
    rebuild: [],
  };

  return {
    state,
    calls,
    async loadProfile(projectId) {
      calls.loadProfile.push(projectId);
      return state.profiles.has(projectId) ? cloneJson(state.profiles.get(projectId)) : null;
    },
    async saveProfile(projectId, profile) {
      calls.saveProfile.push({ projectId, profile: cloneJson(profile) });
      state.profiles.set(projectId, cloneJson(profile));
      return { success: true };
    },
    async reset(scope, projectId) {
      calls.reset.push({ scope, projectId });
      if (scope === GALGAME_RESET_SCOPES.PROFILE || scope === GALGAME_RESET_SCOPES.ALL) {
        state.profiles.delete(projectId);
      }
      if (scope === GALGAME_RESET_SCOPES.SAVES || scope === GALGAME_RESET_SCOPES.ALL) {
        state.saves.clear();
      }
      return { success: true };
    },
    async rebuild(projectId) {
      calls.rebuild.push(projectId);
      return { success: true };
    },
  };
}

describe('player data repository', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('save profile separation keeps projectId-keyed read history and unlock truth outside slot payloads', async () => {
    const storage = createMemoryStorage({
      profiles: {
        gm_story: {
          version: PLAYER_PROFILE_VERSION,
          projectId: 'gm_story',
          readHistory: {
            pages: [],
          },
          unlocks: {
            endings: {
              sakura_good: {
                firstUnlockedAt: 10,
                lastUnlockedAt: 10,
                count: 1,
              },
            },
            cg: {},
          },
        },
      },
      saves: {
        slot_001: {
          version: 99,
          state: {
            currentScene: 'bad-ending',
          },
          readHistory: {
            pages: ['slot-only:0'],
          },
          unlocks: {
            endings: {
              slot_only: {
                count: 999,
              },
            },
          },
        },
      },
    });
    const repository = new PlayerDataRepository('gm_story', storage);
    await repository.load();
    const readHistory = new ReadHistory(repository);

    expect(storage.calls.loadProfile).toEqual(['gm_story']);
    expect(readHistory.isRead('start', 0)).toBe(false);

    readHistory.markRead('start', 0);
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(storage.state.profiles.get('gm_story')).toEqual({
      version: PLAYER_PROFILE_VERSION,
      projectId: 'gm_story',
      readHistory: {
        pages: ['start:0'],
      },
      unlocks: {
        endings: {
          sakura_good: {
            firstUnlockedAt: 10,
            lastUnlockedAt: 10,
            count: 1,
          },
        },
        cg: {},
      },
    });
    expect(storage.state.saves.get('slot_001')).toMatchObject({
      version: 99,
      readHistory: {
        pages: ['slot-only:0'],
      },
      unlocks: {
        endings: {
          slot_only: {
            count: 999,
          },
        },
      },
    });
  });

  it('reset scopes touch only the requested surface and reuse the contract rebuild scope from plan 01', async () => {
    const storage = createMemoryStorage({
      profiles: {
        gm_story: {
          version: PLAYER_PROFILE_VERSION,
          projectId: 'gm_story',
          readHistory: {
            pages: ['start:0'],
          },
          unlocks: {
            endings: {},
            cg: {},
          },
        },
      },
      saves: {
        slot_001: {
          version: 2,
        },
      },
    });
    const repository = new PlayerDataRepository('gm_story', storage);
    await repository.load();

    await repository.reset(GALGAME_RESET_SCOPES.PROFILE);
    expect(storage.state.profiles.get('gm_story')).toEqual({
      version: PLAYER_PROFILE_VERSION,
      projectId: 'gm_story',
      readHistory: {
        pages: [],
      },
      unlocks: {
        endings: {},
        cg: {},
      },
    });
    expect([...storage.state.saves.keys()]).toEqual(['slot_001']);

    storage.state.saves.set('slot_002', { version: 2 });
    await repository.markRead('chapter1', 2);
    await repository.reset(GALGAME_RESET_SCOPES.SAVES);
    expect(storage.state.profiles.get('gm_story').readHistory.pages).toEqual(['chapter1:2']);
    expect(storage.state.saves.size).toBe(0);

    storage.state.saves.set('slot_003', { version: 2 });
    await repository.reset(GALGAME_RESET_SCOPES.CONTRACT);
    expect(storage.calls.rebuild).toEqual(['gm_story']);
    expect(storage.state.profiles.get('gm_story').readHistory.pages).toEqual(['chapter1:2']);
    expect([...storage.state.saves.keys()]).toEqual(['slot_003']);

    await repository.reset(GALGAME_RESET_SCOPES.ALL);
    expect(storage.state.profiles.get('gm_story')).toEqual({
      version: PLAYER_PROFILE_VERSION,
      projectId: 'gm_story',
      readHistory: {
        pages: [],
      },
      unlocks: {
        endings: {},
        cg: {},
      },
    });
    expect(storage.state.saves.size).toBe(0);
  });

  it('tolerant restore backfills missing profile sections instead of crashing on absent read-history or unlock fields', async () => {
    const storage = createMemoryStorage({
      profiles: {
        gm_story: {
          version: PLAYER_PROFILE_VERSION,
          readHistory: null,
          unlocks: {
            endings: null,
          },
        },
      },
    });
    const repository = new PlayerDataRepository('gm_story', storage);

    await repository.load();

    expect(repository.getProfile()).toEqual({
      version: PLAYER_PROFILE_VERSION,
      projectId: 'gm_story',
      readHistory: {
        pages: [],
      },
      unlocks: {
        endings: {},
        cg: {},
      },
    });
    expect(storage.state.profiles.get('gm_story')).toEqual({
      version: PLAYER_PROFILE_VERSION,
      projectId: 'gm_story',
      readHistory: {
        pages: [],
      },
      unlocks: {
        endings: {},
        cg: {},
      },
    });
  });
});

describe('player data runtime wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.window;
  });

  it('runtime bootstrap repository uses script.projectId instead of title-derived keys', async () => {
    const storage = createMemoryStorage();
    const repository = createPlayerDataRepositoryFromScript({
      projectId: 'gm_runtime_story',
      meta: {
        title: 'Mutable Title',
      },
    }, storage);
    await repository.load();
    const readHistory = new ReadHistory(repository);

    readHistory.markRead('start', 1);
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(storage.calls.loadProfile).toEqual(['gm_runtime_story']);
    expect(storage.state.profiles.has('Mutable Title')).toBe(false);
    expect(storage.state.profiles.get('gm_runtime_story').readHistory.pages).toEqual(['start:1']);
  });

  it('unlock persistence flows through ScriptEngine choice effects into repository-backed profile truth', async () => {
    vi.setSystemTime(1000);
    const storage = createMemoryStorage();
    const repository = new PlayerDataRepository('gm_unlocks', storage);
    await repository.load();

    const engine = new ScriptEngine();
    engine.script = {
      characters: {},
      scenes: {
        start: {
          name: 'Unlock Choice',
          pages: [
            {
              type: 'choice',
              prompt: 'Unlock it?',
              options: [
                {
                  text: 'Yes',
                  target: 'after',
                  effects: [
                    { type: 'unlock:ending', id: 'good_end' },
                    { type: 'unlock:cg', id: 'cg_confession' },
                  ],
                },
              ],
            },
          ],
        },
        after: {
          name: 'After',
          pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'Done', voice: null }] }],
        },
      },
    };
    engine.setPlayerDataRepository(repository);
    engine.startGame('start');
    engine.selectChoice(0);
    await Promise.resolve();

    expect(storage.state.profiles.get('gm_unlocks').unlocks).toEqual({
      endings: {
        good_end: {
          firstUnlockedAt: 1000,
          lastUnlockedAt: 1000,
          count: 1,
        },
      },
      cg: {
        cg_confession: {
          firstUnlockedAt: 1000,
          lastUnlockedAt: 1000,
          count: 1,
        },
      },
    });
  });

  it('save-slot, load-slot, delete-slot, and quicksave stay slot-only while reset and rebuild use the dedicated player-data IPC surface', async () => {
    const ipcCalls = [];
    const profileState = new Map();
    globalThis.window = {
      ipcRenderer: {
        invoke: vi.fn(async (channel, payload) => {
          ipcCalls.push({ channel, payload: cloneJson(payload) });
          switch (channel) {
            case 'load-player-profile':
              return {
                success: true,
                data: profileState.get(payload.projectId) ?? null,
              };
            case 'save-player-profile':
              profileState.set(payload.projectId, cloneJson(payload.profile));
              return { success: true };
            case 'reset-player-data':
            case 'rebuild-player-data':
              return { success: true };
            case 'save-slot':
            case 'delete-slot':
            case 'save-quickslot':
              return { success: true };
            case 'load-slot':
            case 'load-quickslot':
              return { success: true, data: null };
            default:
              throw new Error(`Unexpected IPC channel: ${channel}`);
          }
        }),
      },
    };

    const repository = createPlayerDataRepositoryFromScript(
      { projectId: 'gm_slots_only' },
      createIpcPlayerDataStorage(window.ipcRenderer),
    );
    await repository.load();

    const profileCallsAfterLoad = ipcCalls.filter((call) => call.channel.includes('player-profile')).length;

    const saveManager = new SaveManager();
    saveManager.setPlayerDataRepository(repository);

    await saveManager.save(1, { currentScene: 'start', history: [] }, 'slot preview');
    await saveManager.load(1);
    await saveManager.delete(1);
    await saveManager.quickSave({ currentScene: 'start', history: [] }, 'quick preview');

    const profileCallsAfterSlots = ipcCalls.filter((call) => call.channel.includes('player-profile')).length;
    expect(profileCallsAfterSlots).toBe(profileCallsAfterLoad);

    await saveManager.resetPlayerData(GALGAME_RESET_SCOPES.PROFILE);
    await saveManager.rebuildPlayerData();

    expect(ipcCalls.map((call) => call.channel)).toEqual([
      'load-player-profile',
      'save-player-profile',
      'save-slot',
      'load-slot',
      'delete-slot',
      'save-quickslot',
      'reset-player-data',
      'save-player-profile',
      'rebuild-player-data',
      'load-player-profile',
      'save-player-profile',
    ]);
  });

  it('web save manager exposes named reset and rebuild entrypoints through the repository boundary', async () => {
    const repository = {
      reset: vi.fn(async () => ({ success: true })),
      rebuild: vi.fn(async () => ({ success: true })),
    };
    const saveManager = new WebSaveManager();
    saveManager.setPlayerDataRepository(repository);

    await saveManager.resetPlayerData(GALGAME_RESET_SCOPES.ALL);
    await saveManager.rebuildPlayerData();

    expect(repository.reset).toHaveBeenCalledWith(GALGAME_RESET_SCOPES.ALL);
    expect(repository.rebuild).toHaveBeenCalledTimes(1);
  });
});
