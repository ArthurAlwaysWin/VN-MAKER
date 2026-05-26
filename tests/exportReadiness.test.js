import { describe, expect, it } from 'vitest';

import { createExportReadiness } from '../src/authoring/exportReadiness.js';

function createReadyScript(overrides = {}) {
  return {
    projectId: 'gm_ready',
    contractVersion: 1,
    meta: { title: 'Ready' },
    characters: {
      sakura: {
        name: 'Sakura',
        expressions: {
          normal: 'characters/sakura_normal.svg',
        },
      },
    },
    systems: {
      variables: {},
      endings: {},
      gallery: { cg: {} },
    },
    scenes: {
      start: {
        pages: [
          {
            type: 'normal',
            background: 'backgrounds/school.svg',
            characters: [{ id: 'sakura', expression: 'normal', position: 'center' }],
            dialogues: [{ speaker: 'sakura', text: 'Hello.' }],
          },
        ],
      },
    },
    ...overrides,
  };
}

describe('export readiness', () => {
  it('passes a valid project with checked assets and clean layout', () => {
    const report = createExportReadiness(createReadyScript(), {
      knownAssets: [
        'characters/sakura_normal.svg',
        'backgrounds/school.svg',
      ],
    });

    expect(report.ready).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.assets).toMatchObject({
      checked: true,
      counts: {
        total: 2,
        byKind: {
          backgrounds: 1,
          characters: 1,
        },
      },
      missing: [],
      unused: [],
    });
    expect(report.theme).toMatchObject({
      coverage: [],
      missingCoverage: [
        'theme',
        'widgetStyles',
        'dialogueBox',
        'saveLoadScreen',
        'backlogScreen',
        'gameMenu',
        'settingsScreen',
        'titleScreen',
      ],
      warningCount: 0,
    });
  });

  it('blocks export when asset checking was not run', () => {
    const report = createExportReadiness(createReadyScript());

    expect(report.ready).toBe(false);
    expect(report.blockers).toEqual([
      expect.objectContaining({
        source: 'assets',
        severity: 'error',
        code: 'asset-check-not-run',
      }),
    ]);
  });

  it('blocks export on missing assets, layout warnings, and unreachable scenes', () => {
    const script = createReadyScript({
      scenes: {
        start: {
          pages: [
            {
              type: 'normal',
              characters: [],
              dialogues: [],
            },
          ],
        },
        orphan: {
          pages: [
            {
              type: 'normal',
              background: 'backgrounds/missing.svg',
              dialogues: [{ speaker: null, text: 'Lost.' }],
            },
          ],
        },
      },
    });

    const report = createExportReadiness(script, {
      knownAssets: ['characters/sakura_normal.svg'],
    });

    expect(report.ready).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'assets', code: 'missing-asset-reference' }),
      expect.objectContaining({ source: 'layout', code: 'layout-blank-page' }),
      expect.objectContaining({ source: 'scene-graph', code: 'unreachable-scene' }),
    ]));
    expect(report.assets.missing).toEqual([
      expect.objectContaining({
        assetPath: 'backgrounds/missing.svg',
      }),
    ]);
  });

  it('reports unused known assets as warnings without blocking export', () => {
    const report = createExportReadiness(createReadyScript(), {
      knownAssets: [
        'characters/sakura_normal.svg',
        'backgrounds/school.svg',
        'audio/unused-theme.ogg',
        'script.json',
      ],
    });

    expect(report.ready).toBe(true);
    expect(report.assets.unused).toEqual(['audio/unused-theme.ogg']);
    expect(report.warnings).toEqual([
      expect.objectContaining({
        source: 'assets',
        code: 'unused-asset',
        assetPath: 'audio/unused-theme.ogg',
      }),
    ]);
  });

  it('blocks explicit ending projects with unresolved dead ends and closed cycles', () => {
    const report = createExportReadiness(createReadyScript({
      systems: {
        variables: {},
        endings: { good: { title: 'Good End' } },
        gallery: { cg: {} },
      },
      scenes: {
        start: {
          pages: [{
            type: 'choice',
            options: [{ text: 'Lost', target: 'dead' }, { text: 'Again', target: 'loop' }],
          }],
        },
        dead: { pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'Lost.' }] }] },
        loop: { next: 'loop', pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'Again.' }] }] },
      },
    }), {
      knownAssets: [],
    });

    expect(report.ready).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'scene-graph', code: 'dead-end-scene', pathString: 'scenes.dead' }),
      expect.objectContaining({ source: 'scene-graph', code: 'cycle-without-exit', pathString: 'scenes.loop' }),
    ]));
  });

  it('preserves repair-ready graph and unlock reachability details for export review', () => {
    const report = createExportReadiness(createReadyScript({
      systems: {
        variables: {},
        endings: { secret: { title: 'Secret End' } },
        gallery: { cg: { hidden: { title: 'Hidden CG' } } },
      },
      scenes: {
        start: {
          pages: [{
            type: 'choice',
            options: [{ text: 'Broken', target: 'missing_route' }],
          }],
        },
        orphan: {
          pages: [{
            type: 'choice',
            options: [{
              text: 'Hidden',
              effects: [
                { type: 'unlock:ending', id: 'secret' },
                { type: 'unlock:cg', id: 'hidden' },
              ],
            }],
          }],
        },
      },
    }), {
      knownAssets: [],
    });

    expect(report.sceneGraph.missingTargetEdges).toEqual([
      expect.objectContaining({
        toSceneId: 'missing_route',
        pathString: 'scenes.start.pages.0.options.0.target',
      }),
    ]);
    expect(report.sceneGraph.endings.unreachableUnlockIds).toEqual(['secret']);
    expect(report.sceneGraph.cgs.unreachableUnlockIds).toEqual(['hidden']);
  });

  it('reports partial theme slot coverage without blocking export', () => {
    const report = createExportReadiness(createReadyScript({
      ui: {
        theme: {
          cursor: {
            default: 'ui/cursors/default.png',
          },
          icons: {
            close: 'ui/icons/close.png',
          },
          choiceBadge: {
            a: 'ui/badges/a.webp',
            b: 'ui/badges/b.webp',
          },
          buttonFamilies: {
            pageTabPager: {
              normal: 'ui/buttons/page-normal.webp',
              hover: 'ui/buttons/page-hover.webp',
            },
          },
        },
      },
    }), {
      knownAssets: [
        'characters/sakura_normal.svg',
        'backgrounds/school.svg',
        'ui/cursors/default.png',
        'ui/icons/close.png',
        'ui/badges/a.webp',
        'ui/badges/b.webp',
        'ui/buttons/page-normal.webp',
        'ui/buttons/page-hover.webp',
      ],
    });

    expect(report.ready).toBe(true);
    expect(report.theme.coverage).toEqual(['theme']);
    expect(report.theme.missingCoverage).toContain('widgetStyles');
    expect(report.theme.slotCoverage.cursor).toMatchObject({
      configured: true,
      missingSlots: ['pointer'],
    });
    expect(report.theme.slotCoverage.icons.missingSlots).toEqual(['gameMenu', 'qab', 'voiceReplay']);
    expect(report.theme.slotCoverage.choiceBadge.missingSlots).toEqual(['c']);
    expect(report.theme.slotCoverage.buttonFamilies.pageTabPager.missingStates).toEqual(['pressed', 'selected']);
    expect(report.theme.warningCount).toBe(4);
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'theme',
        code: 'theme-cursor-partial-coverage',
        missingSlots: ['pointer'],
      }),
      expect.objectContaining({
        source: 'theme',
        code: 'theme-button-family-partial-coverage',
        familyKey: 'pageTabPager',
        missingStates: ['pressed', 'selected'],
      }),
    ]));
  });
});
