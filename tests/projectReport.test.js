import { describe, expect, it } from 'vitest';

import { createProjectReport } from '../src/authoring/projectReport.js';

describe('project report', () => {
  it('summarizes project scale and validation status', () => {
    const report = createProjectReport({
      projectId: 'gm_report',
      contractVersion: 1,
      meta: { title: 'Report Test' },
      characters: {
        sakura: { name: 'Sakura' },
      },
      systems: {
        variables: {
          affection: { type: 'number', initial: 0 },
        },
        endings: {
          good: {},
        },
        gallery: {
          cg: {
            cg_001: {},
          },
        },
      },
      scenes: {
        start: {
          name: 'Start',
          pages: [
            {
              type: 'normal',
              background: 'backgrounds/school.svg',
              characters: [{ id: 'sakura', expression: 'normal', position: 'center' }],
              dialogues: [{ speaker: null, text: 'Hi.' }],
            },
            { type: 'choice', prompt: 'Go?', options: [{ text: 'Go', target: 'start' }] },
          ],
        },
      },
    });

    expect(report).toMatchObject({
      title: 'Report Test',
      projectId: 'gm_report',
      counts: {
        characters: 1,
        scenes: 1,
        pages: 2,
        pagesByType: {
          normal: 1,
          choice: 1,
        },
        variables: 1,
        endings: 1,
        cgs: 1,
      },
      scenes: [
        {
          id: 'start',
          name: 'Start',
          pageCount: 2,
          next: null,
          pages: [
            {
              index: 0,
              id: null,
              type: 'normal',
              background: 'backgrounds/school.svg',
              characterIds: ['sakura'],
              dialogueCount: 1,
              optionCount: 0,
              conditionCount: 0,
              targets: [],
            },
            {
              index: 1,
              id: null,
              type: 'choice',
              background: '',
              characterIds: [],
              dialogueCount: 0,
              optionCount: 1,
              conditionCount: 0,
              targets: ['start'],
            },
          ],
        },
      ],
      sceneGraph: {
        entrySceneId: 'start',
        graph: {
          start: ['start'],
        },
        reachableSceneIds: ['start'],
        unreachableSceneIds: [],
      },
      characters: [
        {
          id: 'sakura',
          name: 'Sakura',
          expressionIds: [],
        },
      ],
      variables: [
        {
          id: 'affection',
          label: 'affection',
          type: 'number',
          initial: 0,
        },
      ],
    });
    expect(report.validation.ok).toBe(true);
    expect(report.layout).toEqual({
      ok: true,
      warnings: [],
      suggestions: [],
    });
  });
});
