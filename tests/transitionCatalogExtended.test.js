import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getRuntimeTransitionType,
  getTransitionUiOptions,
  isKnownTransitionType,
} from '../src/shared/cinematicContract.js';
import {
  getTransitionCatalogEntry,
  listTransitionCatalog,
} from '../src/shared/transitionCatalog.js';

const M7_BACKGROUND_TRANSITIONS = [
  ['diagonal-wipe', 'wipe', 'css'],
  ['cross-wipe', 'wipe', 'css'],
  ['diamond', 'shape', 'css'],
  ['circle-open', 'shape', 'css'],
  ['circle-close', 'shape', 'css'],
  ['curtain-open', 'curtain', 'css'],
  ['curtain-close', 'curtain', 'css'],
  ['blinds-h', 'curtain', 'css'],
  ['blinds-v', 'curtain', 'css'],
  ['clock-wipe', 'shape', 'css'],
  ['radial-wipe', 'shape', 'css'],
  ['fade-white', 'flash', 'css'],
  ['fade-black', 'flash', 'css'],
  ['glitch-lite', 'stylized', 'css'],
  ['pixelate-lite', 'stylized', 'css'],
];

describe('extended transition catalog', () => {
  it('lists every Milestone 7 CSS transition with metadata', () => {
    const ids = listTransitionCatalog({ target: 'background', supportedOnly: true }).map(entry => entry.id);
    for (const [id, category, renderMode] of M7_BACKGROUND_TRANSITIONS) {
      expect(ids).toContain(id);
      expect(getTransitionCatalogEntry('background', id)).toMatchObject({
        id,
        category,
        renderMode,
        runtimeSupported: true,
        editorSupported: true,
      });
      expect(isKnownTransitionType(id)).toBe(true);
      expect(getRuntimeTransitionType(id)).toBe(id);
    }
  });

  it('exposes the new ids to editor transition options', () => {
    const optionIds = getTransitionUiOptions().map(option => option.value);
    for (const [id] of M7_BACKGROUND_TRANSITIONS) {
      expect(optionIds).toContain(id);
    }
  });

  it('defines incoming and outgoing CSS classes and keyframes for every new id', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8');
    for (const [id] of M7_BACKGROUND_TRANSITIONS) {
      expect(css).toContain(`.bg-image-layer.bg-transition-${id}`);
      expect(css).toContain(`.bg-image-layer.bg-transition-${id}-out`);
      expect(css).toContain(`@keyframes bg-transition-${id}-in`);
      expect(css).toContain(`@keyframes bg-transition-${id}-out`);
    }
  });
});
