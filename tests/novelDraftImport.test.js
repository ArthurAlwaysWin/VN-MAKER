import { describe, expect, it } from 'vitest';

import { importNovelDraft } from '../src/authoring/novelDraftImport.js';
import { createNovelDraftPlan } from '../src/authoring/novelDraftPlan.js';

describe('novel draft import', () => {
  it('turns a structured story draft into a valid editable VN script', () => {
    const result = importNovelDraft({
      projectId: 'gm_story_draft',
      title: 'Spring Draft',
      characters: [
        {
          id: 'sakura',
          name: 'Sakura',
          expressionHints: ['normal', 'smile'],
        },
        {
          id: 'haruki',
          name: 'Haruki',
          expressionHints: ['normal'],
        },
      ],
      variables: [
        {
          id: 'affection',
          type: 'number',
          initial: 0,
          label: 'Affection',
        },
      ],
      locations: [
        {
          id: 'school_gate',
          name: 'School Gate',
          backgroundHint: 'backgrounds/school_gate.svg',
        },
      ],
      scenes: [
        {
          id: 'start',
          name: 'Start',
          beats: [
            {
              id: 'p1',
              location: 'school_gate',
              characters: [
                { id: 'sakura', expression: 'smile' },
                { id: 'haruki', expression: 'normal' },
              ],
              dialogues: [
                { speaker: null, text: 'Spring wind moves through the gate.' },
                { speaker: 'sakura', text: 'You came.', expression: 'smile' },
              ],
              choice: {
                prompt: 'What do you say?',
                options: [
                  {
                    text: 'I promised.',
                    target: 'start',
                    effects: [{ type: 'var:add', id: 'affection', value: 1 }],
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(result.script.meta.title).toBe('Spring Draft');
    expect(result.script.systems.variables.affection).toMatchObject({
      type: 'number',
      initial: 0,
      label: 'Affection',
    });
    expect(result.script.characters.sakura.expressions).toEqual({
      normal: 'characters/sakura_normal.svg',
      smile: 'characters/sakura_smile.svg',
    });
    expect(result.script.scenes.start.pages).toHaveLength(2);
    expect(result.script.scenes.start.pages[0]).toMatchObject({
      type: 'normal',
      background: 'backgrounds/school_gate.svg',
      characters: [
        { id: 'sakura', expression: 'smile', position: 'left' },
        { id: 'haruki', expression: 'normal', position: 'right' },
      ],
    });
    expect(result.script.scenes.start.pages[1]).toMatchObject({
      type: 'choice',
      prompt: 'What do you say?',
    });
    expect(result.validation.ok).toBe(true);
    expect(result.validation.errors).toEqual([]);
  });

  it('reports a staging warning when a beat exceeds the first preset capacity', () => {
    const result = importNovelDraft({
      projectId: 'gm_many_chars',
      characters: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
        { id: 'd', name: 'D' },
      ],
      systems: {
        variables: {
          courage: {
            type: 'number',
            initial: 1,
            label: 'Courage',
          },
        },
      },
      scenes: [
        {
          id: 'start',
          beats: [
            {
              characters: ['a', 'b', 'c', 'd'],
              dialogues: [{ speaker: 'a', text: 'Hi.' }],
            },
          ],
        },
      ],
    });

    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'too-many-characters-for-preset' }),
    ]);
    expect(result.script.systems.variables.courage.initial).toBe(1);
    expect(result.script.scenes.start.pages[0].characters).toHaveLength(3);
  });

  it('turns a structured story draft into an apply-plan manifest', () => {
    const plan = createNovelDraftPlan({
      projectId: 'gm_story_plan',
      title: 'Plan Draft',
      characters: [{ id: 'sakura', name: 'Sakura', expressionHints: ['normal', 'smile'] }],
      variables: [{ id: 'affection', type: 'number', initial: 0, label: 'Affection' }],
      locations: [{ id: 'gate', backgroundHint: 'backgrounds/gate.svg' }],
      scenes: [
        {
          id: 'start',
          name: 'Start',
          beats: [
            {
              id: 'p1',
              sourceBeatId: 'outline-beat-1',
              proseSpan: { start: 12, end: 85 },
              location: 'gate',
              characters: [{ id: 'sakura', expression: 'smile' }],
              dialogues: [{ speaker: 'sakura', text: 'You came.', expression: 'smile' }],
              choice: {
                prompt: 'Answer?',
                options: [{ text: 'Smile', target: 'start', effects: [{ type: 'var:add', id: 'affection', value: 1 }] }],
              },
            },
          ],
        },
      ],
    });

    expect(plan).toMatchObject({
      version: 1,
      title: 'Plan Draft',
      source: {
        kind: 'novel-draft',
        projectId: 'gm_story_plan',
      },
      operations: [
        expect.objectContaining({ command: 'add-variable', id: 'add-variable-affection' }),
        expect.objectContaining({ command: 'add-character', id: 'add-character-sakura' }),
        expect.objectContaining({ command: 'add-scene', id: 'add-scene-start' }),
        expect.objectContaining({
          command: 'add-page',
          id: 'add-page-start-p1',
          provenance: {
            kind: 'beat',
            sceneId: 'start',
            sceneIndex: 0,
            beatId: 'p1',
            beatIndex: 0,
            sourceBeatId: 'outline-beat-1',
            proseSpan: { start: 12, end: 85 },
          },
          params: expect.objectContaining({
            scene: 'start',
            type: 'normal',
            background: 'backgrounds/gate.svg',
          }),
        }),
        expect.objectContaining({
          command: 'add-page',
          id: 'add-choice-start-p1',
          provenance: {
            kind: 'choice',
            sceneId: 'start',
            sceneIndex: 0,
            beatId: 'p1',
            beatIndex: 0,
          },
          params: expect.objectContaining({
            scene: 'start',
            type: 'choice',
            prompt: 'Answer?',
          }),
        }),
      ],
    });
  });
});
