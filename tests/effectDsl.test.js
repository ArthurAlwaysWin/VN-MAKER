import { describe, it } from 'node:test';
import { deepStrictEqual, rejects, strictEqual, throws } from 'node:assert/strict';

import {
  applyEffects,
  normalizeEffectContainer,
  normalizeEffects,
} from '../src/shared/effectDsl.js';

describe('effect DSL', () => {
  it('accepts only the minimal Phase 83 effect operations', () => {
    deepStrictEqual(
      normalizeEffects([
        { type: 'var:set', id: 'routeLocked', value: true },
        { type: 'var:add', id: 'mood', value: 2 },
        { type: 'var:sub', id: 'trust', value: 1 },
        { type: 'unlock:ending', id: 'good_end' },
        { type: 'unlock:cg', id: 'cg_confession' },
      ]),
      [
        { type: 'var:set', id: 'routeLocked', value: true },
        { type: 'var:add', id: 'mood', value: 2 },
        { type: 'var:sub', id: 'trust', value: 1 },
        { type: 'unlock:ending', id: 'good_end' },
        { type: 'unlock:cg', id: 'cg_confession' },
      ],
    );

    throws(
      () => normalizeEffects([{ type: 'var:mul', id: 'mood', value: 2 }]),
      /Unsupported effect type: var:mul/,
    );
  });

  it('normalizes legacy setVariable payloads into canonical effects arrays', () => {
    deepStrictEqual(
      normalizeEffects({
        setVariable: {
          mood: 2,
          stress: -3,
        },
      }),
      [
        { type: 'var:add', id: 'mood', value: 2 },
        { type: 'var:sub', id: 'stress', value: 3 },
      ],
    );

    deepStrictEqual(
      normalizeEffectContainer({
        text: 'Option A',
        target: 'sceneA',
        setVariable: {
          mood: 1,
        },
      }),
      {
        text: 'Option A',
        target: 'sceneA',
        effects: [
          { type: 'var:add', id: 'mood', value: 1 },
        ],
      },
    );
  });

  it('applies variable math and explicit unlock writes deterministically, including repeats', async () => {
    const variables = new Map([
      ['mood', 1],
    ]);
    const unlockCalls = [];

    await applyEffects([
      { type: 'var:set', id: 'routeLocked', value: true },
      { type: 'var:add', id: 'mood', value: 4 },
      { type: 'var:sub', id: 'mood', value: 2 },
      { type: 'unlock:ending', id: 'good_end' },
      { type: 'unlock:ending', id: 'good_end' },
      { type: 'unlock:cg', id: 'cg_confession' },
    ], {
      variables,
      playerDataRepository: {
        async unlockEnding(id) {
          unlockCalls.push(`ending:${id}`);
        },
        async unlockCg(id) {
          unlockCalls.push(`cg:${id}`);
        },
      },
    });

    strictEqual(variables.get('routeLocked'), true);
    strictEqual(variables.get('mood'), 3);
    deepStrictEqual(unlockCalls, [
      'ending:good_end',
      'ending:good_end',
      'cg:cg_confession',
    ]);
  });
});
