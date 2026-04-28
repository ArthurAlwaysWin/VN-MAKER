import { describe, expect, it } from 'vitest';

import {
  GALGAME_CONTRACT_VERSION,
  GALGAME_RESET_SCOPES,
  ensureGalgameContract,
  hasCurrentGalgameContractVersion,
  isGalgameResetScope,
} from '../src/shared/galgameContract.js';

describe('galgame contract', () => {
  it('seeds projectId and contractVersion once, then preserves projectId on repeat normalization', () => {
    const first = ensureGalgameContract({
      characters: {
        hero: { name: 'Hero' },
      },
      scenes: {
        start: { name: 'Start', pages: [] },
      },
    });
    const second = ensureGalgameContract(first);

    expect(first.projectId).toMatch(/^gm_[a-z0-9]+$/i);
    expect(first.contractVersion).toBe(GALGAME_CONTRACT_VERSION);
    expect(second.projectId).toBe(first.projectId);
    expect(second.contractVersion).toBe(GALGAME_CONTRACT_VERSION);
  });

  it('seeds explicit systems registries without disturbing existing author data', () => {
    const normalized = ensureGalgameContract({
      projectId: 'gm_existing',
      characters: {},
      scenes: {},
      systems: {
        variables: {
          sakura_affection: {
            type: 'number',
            initial: 2,
          },
        },
        gallery: {
          cg: {
            confession: {
              title: 'Confession',
            },
          },
          albums: {
            bonus: {
              title: 'Bonus',
            },
          },
        },
      },
    });

    expect(normalized.systems.variables).toEqual({
      sakura_affection: {
        type: 'number',
        initial: 2,
      },
    });
    expect(normalized.systems.endings).toEqual({});
    expect(normalized.systems.gallery.cg).toEqual({
      confession: {
        title: 'Confession',
      },
    });
    expect(normalized.systems.gallery.albums).toEqual({
      bonus: {
        title: 'Bonus',
      },
    });
  });

  it('exposes explicit reset scopes and contract-version helpers for later persistence work', () => {
    expect(GALGAME_RESET_SCOPES).toEqual({
      CONTRACT: 'contract',
      PROFILE: 'profile',
      SAVES: 'saves',
      ALL: 'all',
    });

    expect(isGalgameResetScope(GALGAME_RESET_SCOPES.CONTRACT)).toBe(true);
    expect(isGalgameResetScope(GALGAME_RESET_SCOPES.PROFILE)).toBe(true);
    expect(isGalgameResetScope(GALGAME_RESET_SCOPES.SAVES)).toBe(true);
    expect(isGalgameResetScope(GALGAME_RESET_SCOPES.ALL)).toBe(true);
    expect(isGalgameResetScope('legacy')).toBe(false);

    expect(hasCurrentGalgameContractVersion({
      contractVersion: GALGAME_CONTRACT_VERSION,
    })).toBe(true);
    expect(hasCurrentGalgameContractVersion({
      contractVersion: GALGAME_CONTRACT_VERSION - 1,
    })).toBe(false);
    expect(hasCurrentGalgameContractVersion({})).toBe(false);
  });
});
