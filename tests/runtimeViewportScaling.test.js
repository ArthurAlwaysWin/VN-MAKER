/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { attachResponsiveGameContainer } from '../src/ui/runtimeViewport.js';

function setViewportSize(width, height) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  });
}

describe('runtime viewport scaling', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="game-container"></div>';
    container = document.getElementById('game-container');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('scales the fixed 1280x720 game container up to fit a fullscreen viewport', () => {
    setViewportSize(1920, 1080);

    const detach = attachResponsiveGameContainer(container);

    expect(container.style.transform).toBe('scale(1.5)');
    expect(container.style.transformOrigin).toBe('center center');

    detach();
  });

  it('updates the scale again when the viewport changes', () => {
    setViewportSize(1920, 1080);
    const detach = attachResponsiveGameContainer(container);

    setViewportSize(1600, 900);
    window.dispatchEvent(new Event('resize'));

    expect(container.style.transform).toBe('scale(1.25)');

    detach();
  });

  it('main runtime wires responsive scaling into the game bootstrap', () => {
    const src = readFileSync(resolve(__dirname, '../src/main.js'), 'utf-8');
    expect(src).toContain("from './ui/runtimeViewport.js'");
    expect(src).toContain('attachResponsiveGameContainer(gameContainer)');
  });
});
