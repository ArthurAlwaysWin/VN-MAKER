import { describe, expect, it } from 'vitest';

import { lintProjectLayout } from '../src/authoring/layoutLint.js';

describe('agent layout lint', () => {
  it('accepts simple staged pages', () => {
    const report = lintProjectLayout({
      scenes: {
        start: {
          pages: [
            {
              type: 'normal',
              background: 'backgrounds/school.svg',
              characters: [
                { id: 'sakura', position: 'center' },
              ],
              dialogues: [{ speaker: 'sakura', text: 'Hello.' }],
            },
            {
              type: 'choice',
              prompt: 'Go?',
              options: [{ text: 'Yes' }, { text: 'No' }],
            },
          ],
        },
      },
    });

    expect(report).toEqual({
      ok: true,
      warnings: [],
      suggestions: [],
    });
  });

  it('warns on blank pages, repeated positions, and too many staged characters', () => {
    const report = lintProjectLayout({
      scenes: {
        start: {
          pages: [
            {
              type: 'normal',
              characters: [
                { id: 'a', position: 'left' },
                { id: 'b', position: 'left' },
                { id: 'c', position: 'center' },
                { id: 'd', position: 'right' },
              ],
              dialogues: [],
            },
          ],
        },
      },
    });

    expect(report.ok).toBe(false);
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'layout-too-many-characters',
        pathString: 'scenes.start.pages.0.characters',
        location: { sceneId: 'start', pageIndex: 0 },
        suggestedAction: expect.objectContaining({
          summary: expect.stringContaining('Restage'),
        }),
      }),
      expect.objectContaining({
        code: 'layout-overlapping-character-position',
        pathString: 'scenes.start.pages.0.characters.1.position',
        suggestedAction: expect.objectContaining({
          commands: [
            expect.objectContaining({ command: 'set-page-characters' }),
          ],
        }),
      }),
    ]));
    expect(report.suggestions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'layout-overlapping-character-position',
        location: { sceneId: 'start', pageIndex: 0 },
      }),
    ]));
  });

  it('warns on text overflow risks in dialogue and choice pages', () => {
    const report = lintProjectLayout({
      scenes: {
        start: {
          pages: [
            {
              type: 'normal',
              dialogues: [{ speaker: null, text: 'x'.repeat(121) }],
            },
            {
              type: 'choice',
              options: [
                { text: 'x'.repeat(49) },
                { text: 'A' },
                { text: 'B' },
                { text: 'C' },
                { text: 'D' },
              ],
            },
          ],
        },
      },
    });

    expect(report.ok).toBe(false);
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'layout-dialogue-on-blank-stage' }),
      expect.objectContaining({
        code: 'layout-dialogue-text-overflow-risk',
        dialogueIndex: 0,
        suggestedAction: expect.objectContaining({
          commands: expect.arrayContaining([
            expect.objectContaining({ command: 'set-dialogue' }),
          ]),
        }),
      }),
      expect.objectContaining({
        code: 'layout-choice-missing-prompt',
        suggestedAction: expect.objectContaining({
          commands: [
            expect.objectContaining({ command: 'set-choice-page' }),
          ],
        }),
      }),
      expect.objectContaining({ code: 'layout-too-many-choice-options' }),
      expect.objectContaining({
        code: 'layout-choice-text-overflow-risk',
        optionIndex: 0,
        suggestedAction: expect.objectContaining({
          commands: [
            expect.objectContaining({ command: 'set-choice-option' }),
          ],
        }),
      }),
    ]));
  });
});
