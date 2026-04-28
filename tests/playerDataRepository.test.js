import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GALGAME_RESET_SCOPES } from '../src/shared/galgameContract.js';
import {
  PLAYER_PROFILE_VERSION,
  PlayerDataRepository,
} from '../src/engine/PlayerDataRepository.js';
import { ReadHistory } from '../src/engine/ReadHistory.js';

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
