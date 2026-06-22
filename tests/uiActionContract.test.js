import { describe, expect, it } from 'vitest';
import { mapLegacyUiAction, validateUiAction } from '../src/shared/uiActionContract.js';

describe('canonical UI action contract', () => {
  it('maps legacy actions with screen-aware semantics', () => {
    expect(mapLegacyUiAction('title', 'load').action).toEqual({ type: 'open-screen', params: { screenId: 'saveLoad', mode: 'load', source: 'title' } });
    expect(mapLegacyUiAction('saveLoad', 'load').action).toEqual({ type: 'load-slot' });
    expect(mapLegacyUiAction('gameMenu', 'load').action).toEqual({ type: 'open-screen', params: { screenId: 'saveLoad', mode: 'load', source: 'gameMenu' } });
  });

  it.each([
    ['title', ['start', 'continue', 'load', 'settings', 'gallery', 'play-opening-video', 'quit']],
    ['gameMenu', ['save', 'load', 'backlog', 'settings', 'title', 'close']],
    ['settings', ['close', 'title', 'reset']],
    ['saveLoad', ['save', 'load', 'delete', 'close']],
    ['gameplay', ['advance', 'auto', 'skip', 'backlog', 'save', 'load', 'quicksave', 'quickload', 'settings']],
  ])('covers the %s legacy vocabulary', (screenId, actions) => {
    for (const action of actions) expect(mapLegacyUiAction(screenId, action).diagnostics).toEqual([]);
  });

  it('returns stable diagnostics for unknown ids and parameters', () => {
    expect(validateUiAction({ type: 'javascript', params: {} })[0].code).toBe('ui-action-unknown');
    expect(validateUiAction({ type: 'start-game', params: { url: 'x' } })[0]).toMatchObject({ code: 'ui-action-param-unknown', severity: 'error' });
    expect(mapLegacyUiAction('title', 'save').diagnostics[0]).toMatchObject({ code: 'ui-legacy-action-unknown', severity: 'error' });
  });
});
