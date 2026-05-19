import { describe, expect, it } from 'vitest';

import { createAgentHandoff } from '../src/authoring/agentHandoff.js';

describe('agent handoff report', () => {
  it('summarizes gates, checkpoints, and editor review items', () => {
    const handoff = createAgentHandoff({
      projectId: 'gm_handoff',
      characters: {},
      scenes: {
        start: {
          pages: [
            { type: 'normal', dialogues: [] },
          ],
        },
      },
    }, {
      scriptPath: 'public/game/script.json',
      createdAt: '2026-05-19T10:00:00.000Z',
      readiness: { knownAssets: [], requireAssetCheck: false },
      checkpoints: [
        {
          path: 'public/game/.checkpoints/script.2026.json',
          name: 'script.2026.json',
          createdAt: '2026-05-19T09:59:00.000Z',
          size: 120,
        },
      ],
      notes: ['Review the newly authored branch in the editor.'],
    });

    expect(handoff).toMatchObject({
      kind: 'agent-authoring-handoff',
      version: 1,
      createdAt: '2026-05-19T10:00:00.000Z',
      scriptPath: 'public/game/script.json',
      projectId: 'gm_handoff',
      gates: {
        validation: true,
        layout: false,
        readiness: false,
      },
      ok: false,
      latestCheckpointPath: 'public/game/.checkpoints/script.2026.json',
      checkpoints: [
        {
          path: 'public/game/.checkpoints/script.2026.json',
          size: 120,
        },
      ],
      notes: ['Review the newly authored branch in the editor.'],
    });
    expect(handoff.reviewItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'layout',
        code: 'layout-blank-page',
      }),
      expect.objectContaining({
        source: 'readiness',
        code: 'layout-blank-page',
      }),
    ]));
  });
});
