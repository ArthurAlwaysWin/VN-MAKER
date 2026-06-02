import { describe, expect, it } from 'vitest';

import {
  BUILTIN_EFFECT_PACK_ADAPTERS,
  collectEffectPackAssetPaths,
  isKnownEffectPackAdapter,
  normalizeEffectPackReference,
  resolvePageEffectPacks,
  validateEffectPackManifest,
} from '../src/shared/effectPackContract.js';

function manifest(overrides = {}) {
  return {
    id: 'old-film',
    kind: 'postprocess',
    label: 'Old Film',
    version: 1,
    adapter: 'canvas2d:film-flicker',
    paramsSchema: {
      intensity: { type: 'number', minimum: 0, maximum: 1, default: 0.5 },
      tone: { type: 'enum', values: ['warm', 'cool'], default: 'warm' },
    },
    defaults: { intensity: 0.5 },
    files: [
      { path: 'effects/old-film/effect.json', role: 'manifest' },
      { path: 'effects/old-film/preview.png', role: 'preview' },
    ],
    performance: { usesCanvas: true, supportsSkip: true },
    ...overrides,
  };
}

describe('effect pack contract', () => {
  it('accepts manifest-only declarations for allowlisted built-in adapters', () => {
    expect(isKnownEffectPackAdapter('canvas2d:film-flicker')).toBe(true);
    expect(BUILTIN_EFFECT_PACK_ADAPTERS['canvas2d:film-flicker'].kind).toBe('postprocess');

    const result = validateEffectPackManifest(manifest());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.manifest).toMatchObject({
      id: 'old-film',
      kind: 'postprocess',
      adapter: 'canvas2d:film-flicker',
      paramsSchema: {
        intensity: { type: 'number', minimum: 0, maximum: 1, default: 0.5 },
      },
      files: [
        { path: 'effects/old-film/effect.json', role: 'manifest' },
        { path: 'effects/old-film/preview.png', role: 'preview' },
      ],
    });
  });

  it('rejects project-local runtime code and forbidden capabilities', () => {
    const result = validateEffectPackManifest(manifest({
      entry: 'runtime.js',
      runtime: 'runtime.js',
      capabilities: {
        network: true,
        filesystem: true,
        eval: true,
        arbitraryDom: true,
      },
    }));

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'manifest key "entry" is not allowed',
      'manifest key "runtime" is not allowed',
      'capability "network" is forbidden',
      'capability "filesystem" is forbidden',
      'capability "eval" is forbidden',
      'capability "arbitraryDom" is forbidden',
    ]));
  });

  it('does not resolve invalid manifests even when they name a built-in adapter', () => {
    const script = {
      assets: {
        effectPacks: {
          unsafe: manifest({
            id: 'unsafe',
            entry: 'runtime.js',
            capabilities: { eval: true },
          }),
        },
      },
    };

    expect(resolvePageEffectPacks(script, {
      effectPacks: [{ id: 'unsafe' }],
    })).toEqual([]);
    expect(collectEffectPackAssetPaths(script)).toEqual([]);
  });

  it('keeps effect files inside the effects/id namespace', () => {
    const result = validateEffectPackManifest(manifest({
      files: [
        { path: 'effects/old-film/preview.png', role: 'preview' },
        { path: 'effects/other/escape.png', role: 'texture' },
        { path: '../secret.txt', role: 'texture' },
        { path: 'https://example.com/remote.png', role: 'texture' },
      ],
    }));

    expect(result.ok).toBe(false);
    expect(result.manifest.files).toEqual([
      { path: 'effects/old-film/preview.png', role: 'preview' },
    ]);
    expect(result.errors).toEqual(expect.arrayContaining([
      'files.1.path must stay inside effects/old-film/',
      'files.2.path must stay inside effects/old-film/',
      'files.3.path must stay inside effects/old-film/',
    ]));
  });

  it('normalizes page references using the manifest parameter schema', () => {
    const manifests = {
      'old-film': validateEffectPackManifest(manifest()).manifest,
    };
    const ref = normalizeEffectPackReference({
      id: 'old-film',
      params: { intensity: 2, tone: 'nope', ignored: 1 },
    }, manifests);

    expect(ref).toEqual({
      id: 'old-film',
      enabled: true,
      params: { intensity: 1, tone: 'warm' },
    });
  });

  it('resolves only enabled references with built-in adapters for runtime playback', () => {
    const script = {
      assets: {
        effectPacks: {
          'old-film': manifest(),
          future: manifest({ id: 'future', adapter: 'project:future-runtime' }),
        },
      },
    };
    const page = {
      effectPacks: [
        { id: 'old-film', params: { intensity: 0.3 } },
        { id: 'old-film', enabled: false },
        { id: 'future' },
      ],
    };

    expect(resolvePageEffectPacks(script, page)).toEqual([
      expect.objectContaining({
        id: 'old-film',
        params: { intensity: 0.3, tone: 'warm' },
        manifest: expect.objectContaining({ adapter: 'canvas2d:film-flicker' }),
      }),
    ]);
  });

  it('collects only runtime-resolved referenced effect assets for export scanning', () => {
    const script = {
      assets: {
        effectPacks: {
          'old-film': manifest(),
          unused: manifest({
            id: 'unused',
            files: [
              { path: 'effects/unused/effect.json', role: 'manifest' },
            ],
          }),
          disabled: manifest({
            id: 'disabled',
            files: [
              { path: 'effects/disabled/effect.json', role: 'manifest' },
            ],
          }),
          future: manifest({
            id: 'future',
            adapter: 'project:future-runtime',
            files: [
              { path: 'effects/future/effect.json', role: 'manifest' },
            ],
          }),
        },
      },
      scenes: {
        start: {
          pages: [
            {
              type: 'normal',
              effectPacks: [
                { id: 'old-film' },
                { id: 'old-film' },
                { id: 'disabled', enabled: false },
                { id: 'future' },
              ],
            },
            {
              type: 'condition',
              effectPacks: [{ id: 'unused' }],
              trueTarget: null,
              falseTarget: null,
            },
          ],
        },
      },
    };

    expect(collectEffectPackAssetPaths(script)).toEqual([
      'effects/old-film/effect.json',
      'effects/old-film/preview.png',
    ]);
  });
});
