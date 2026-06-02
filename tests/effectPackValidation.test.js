import { describe, expect, it } from 'vitest';

import { validateProject } from '../src/shared/projectValidator.js';

function baseScript(overrides = {}) {
  return {
    projectId: 'gm_effect_pack_validation',
    characters: {},
    assets: {
      effectPacks: {
        'old-film': {
          id: 'old-film',
          kind: 'postprocess',
          label: 'Old Film',
          version: 1,
          adapter: 'canvas2d:film-flicker',
          paramsSchema: {
            intensity: { type: 'number', minimum: 0, maximum: 1, default: 0.5 },
          },
          files: [
            { path: 'effects/old-film/effect.json', role: 'manifest' },
            { path: 'effects/old-film/preview.png', role: 'preview' },
          ],
          performance: { usesCanvas: true, supportsSkip: true },
        },
      },
    },
    scenes: {
      start: {
        pages: [
          { type: 'normal', effectPacks: [{ id: 'old-film', params: { intensity: 0.4 } }], dialogues: [] },
        ],
      },
    },
    ...overrides,
  };
}

describe('effect pack validation', () => {
  it('accepts manifest-only effect packs and page references', () => {
    const report = validateProject(baseScript(), {
      knownAssets: [
        'effects/old-film/effect.json',
        'effects/old-film/preview.png',
      ],
      checkReachability: false,
    });

    expect(report.ok).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.warnings.map(issue => issue.code)).not.toContain('effect-pack-reference-missing');
  });

  it('blocks project-local runtime entry points and unsafe file paths', () => {
    const script = baseScript({
      assets: {
        effectPacks: {
          unsafe: {
            id: 'unsafe',
            kind: 'postprocess',
            version: 1,
            adapter: 'canvas2d:film-flicker',
            entry: 'runtime.js',
            capabilities: { network: true, eval: true },
            files: [
              { path: 'effects/unsafe/preview.png', role: 'preview' },
              { path: '../runtime.js', role: 'texture' },
            ],
          },
        },
      },
      scenes: {
        start: {
          pages: [
            { type: 'normal', effectPacks: [{ id: 'unsafe' }], dialogues: [] },
          ],
        },
      },
    });

    const report = validateProject(script, { checkReachability: false });
    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid-effect-pack-manifest', message: 'manifest key "entry" is not allowed' }),
      expect.objectContaining({ code: 'invalid-effect-pack-manifest', message: 'capability "network" is forbidden' }),
      expect.objectContaining({ code: 'invalid-effect-pack-manifest', message: 'capability "eval" is forbidden' }),
      expect.objectContaining({ code: 'invalid-effect-pack-file-path' }),
    ]));
  });

  it('warns for missing declarations, unsupported adapters, and condition-page usage', () => {
    const script = baseScript({
      assets: {
        effectPacks: {
          future: {
            id: 'future',
            kind: 'postprocess',
            version: 1,
            adapter: 'project:future-runtime',
          },
        },
      },
      scenes: {
        start: {
          pages: [
            { type: 'normal', effectPacks: [{ id: 'missing-pack' }], dialogues: [] },
            { type: 'normal', effectPacks: [{ id: 'future' }], dialogues: [] },
            { type: 'condition', effectPacks: [{ id: 'future' }], trueTarget: null, falseTarget: null },
          ],
        },
      },
    });

    const report = validateProject(script, { checkReachability: false });
    expect(report.ok).toBe(true);
    expect(report.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unsupported-effect-pack-adapter', pathString: 'assets.effectPacks.future' }),
      expect.objectContaining({ code: 'effect-pack-reference-missing', pathString: 'scenes.start.pages.0.effectPacks.0.id' }),
      expect.objectContaining({ code: 'unsupported-effect-pack-adapter', pathString: 'scenes.start.pages.1.effectPacks.0.id' }),
      expect.objectContaining({ code: 'condition-page-effect-packs', pathString: 'scenes.start.pages.2.effectPacks' }),
    ]));
  });
});
