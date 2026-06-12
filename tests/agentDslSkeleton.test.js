import { describe, expect, it } from 'vitest';

import { createAgentDslSkeleton } from '../src/authoring/agentDsl/skeleton.js';
import { createAgentDslPlan } from '../src/authoring/agentDslPlan.js';

describe('agent DSL skeleton generator', () => {
  it('creates P7.1 starter source from project declarations and normal dialogue pages', () => {
    const { source, report } = createAgentDslSkeleton({
      title: 'Skeleton Demo',
      characters: {
        sakura: {
          name: 'Sakura',
          color: '#ff99cc',
          expressions: {
            normal: 'characters/sakura_normal.png',
            smile: 'characters/sakura_smile.png',
          },
        },
      },
      systems: {
        variables: {
          affection: { type: 'number', initial: 2, label: 'Affection' },
        },
        endings: {
          good_end: { title: 'Good End', category: 'main', thumbnail: 'ui/endings/good.png' },
        },
        gallery: {
          cg: {
            first_smile: {
              title: 'First Smile',
              images: ['gallery/first_smile.png'],
              thumbnail: 'gallery/first_smile_thumb.png',
            },
          },
        },
      },
      scenes: {
        start: {
          name: 'Start',
          pages: [
            {
              id: 'opening',
              type: 'normal',
              dialogues: [
                { speaker: null, text: 'The morning bell rang.' },
                { speaker: 'sakura', text: 'You came.', expression: 'smile', voice: 'voices/sakura_001.ogg' },
              ],
            },
          ],
        },
      },
    });

    expect(source).toContain('# Generated Agent DSL starter source.');
    expect(source).toContain('title "Skeleton Demo"');
    expect(source).toContain('character sakura "Sakura" color "#ff99cc" expression normal "characters/sakura_normal.png" expression smile "characters/sakura_smile.png"');
    expect(source).toContain('variable affection number initial 2 label "Affection"');
    expect(source).toContain('ending good_end "Good End" category "main" thumbnail "ui/endings/good.png"');
    expect(source).toContain('cg first_smile "First Smile" image "gallery/first_smile.png" thumbnail "gallery/first_smile_thumb.png" category "main"');
    expect(source).toContain('scene start "Start":');
    expect(source).toContain('  page opening:');
    expect(source).toContain('  narrate "The morning bell rang."');
    expect(source).toContain('  say sakura "You came." expression smile voice "voices/sakura_001.ogg"');
    expect(report).toMatchObject({
      declarations: {
        characters: 1,
        variables: 1,
        endings: 1,
        cgs: 1,
        scenes: 1,
        normalPages: 1,
        dialogues: 2,
      },
      warningCount: 0,
      sourceMapCreated: false,
    });

    const plan = createAgentDslPlan(source);
    expect(plan.operations.map((operation) => operation.command)).toEqual([
      'add-character',
      'add-variable',
      'add-ending',
      'add-cg',
      'add-scene',
      'add-page',
    ]);
  });

  it('reports P7.1 unsupported and lossy project data as comments', () => {
    const { source, report } = createAgentDslSkeleton({
      title: 'Deferred Data',
      characters: {},
      scenes: {
        start: {
          name: 'Start',
          next: 'ending',
          pages: [
            {
              type: 'normal',
              background: 'backgrounds/room.png',
              dialogues: [{ speaker: null, text: 'Look around.' }],
              effects: [{ type: 'unlock:ending', id: 'good' }],
            },
            {
              type: 'choice',
              prompt: 'Go?',
              options: [{ text: 'Yes', target: 'ending' }],
            },
          ],
        },
      },
    });

    expect(source).toContain('# P7.1 skeleton omitted scene next target at scenes.start.next.');
    expect(source).toContain('# P7.1 skeleton omitted supported-later normal page fields at scenes.start.pages.0: background, effects.');
    expect(source).toContain('# P7.1 skeleton did not convert choice page at scenes.start.pages.1.');
    expect(report).toMatchObject({
      warningCount: 3,
      unsupportedCount: 1,
      lossyCount: 2,
      sourceMapCreated: false,
    });
    expect(report.warnings.map((warning) => warning.path)).toEqual([
      'scenes.start.next',
      'scenes.start.pages.0',
      'scenes.start.pages.1',
    ]);
    expect(() => createAgentDslPlan(source)).not.toThrow();
  });
});
