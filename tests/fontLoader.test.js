/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadAllFonts, loadSingleFont } from '../src/engine/fontLoader.js';

describe('fontLoader', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('escapes font URLs before passing them to FontFace', async () => {
    const created = [];
    class MockFontFace {
      constructor(family, source) {
        this.family = family;
        this.source = source;
        created.push({ family, source });
      }

      async load() {
        return this;
      }
    }
    vi.stubGlobal('FontFace', MockFontFace);
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { add: vi.fn() },
    });

    await expect(loadSingleFont({
      family: 'Display',
      file: 'fonts/bad"); src:url(file:///secret)',
    }, 'asset://')).resolves.toBe(true);

    expect(created).toEqual([{
      family: 'Display',
      source: 'url("asset://fonts/bad\\"); src:url(file:///secret)")',
    }]);
    expect(document.fonts.add).toHaveBeenCalledTimes(1);
  });

  it('loads all fonts concurrently and preserves result shape', async () => {
    const resolvers = new Map();
    class MockFontFace {
      constructor(family, source) {
        this.family = family;
        this.source = source;
      }

      load() {
        return new Promise((resolve, reject) => {
          resolvers.set(this.family, { resolve: () => resolve(this), reject });
        });
      }
    }
    vi.stubGlobal('FontFace', MockFontFace);
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { add: vi.fn() },
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const resultPromise = loadAllFonts([
      { family: 'One', file: 'fonts/one.woff2' },
      { family: 'Two', file: 'fonts/two.woff2' },
    ], 'asset://');

    expect(resolvers.has('One')).toBe(true);
    expect(resolvers.has('Two')).toBe(true);
    resolvers.get('Two').resolve();
    resolvers.get('One').resolve();

    await expect(resultPromise).resolves.toEqual({
      loaded: ['One', 'Two'],
      failed: [],
    });
    expect(document.fonts.add).toHaveBeenCalledTimes(2);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
