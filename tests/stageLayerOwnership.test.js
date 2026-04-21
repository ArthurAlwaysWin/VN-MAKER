/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CharacterLayer } from '../src/ui/CharacterLayer.js';

function readProjectFile(relativePath) {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  return readFileSync(path.resolve(testDir, '..', relativePath), 'utf-8');
}

describe('stage ownership contract', () => {
  it('runtime shell scopes only background and character layers inside #stage-layer', () => {
    document.body.innerHTML = readProjectFile('index.html');

    const gameContainer = document.getElementById('game-container');
    const stageLayer = document.getElementById('stage-layer');
    const backgroundLayer = document.getElementById('background-layer');
    const characterLayer = document.getElementById('character-layer');
    const dialogueLayer = document.getElementById('dialogue-layer');
    const uiOverlay = document.getElementById('ui-overlay');

    expect(gameContainer).not.toBeNull();
    expect(stageLayer).not.toBeNull();
    expect(stageLayer?.parentElement).toBe(gameContainer);
    expect(backgroundLayer?.parentElement).toBe(stageLayer);
    expect(characterLayer?.parentElement).toBe(stageLayer);
    expect(dialogueLayer?.parentElement).toBe(gameContainer);
    expect(uiOverlay?.parentElement).toBe(gameContainer);
  });

  it('main.js looks up #stage-layer while keeping BackgroundLayer and CharacterLayer mounted separately', () => {
    const src = readProjectFile('src/main.js');

    expect(src).toContain("document.getElementById('stage-layer')");
    expect(src).toContain("const background = new BackgroundLayer(bgLayer, '')");
    expect(src).toContain("const characters = new CharacterLayer(charLayer, '')");
  });

  it('CharacterLayer.show() creates .character-sprite > .character-motion > img crossfade layers', () => {
    document.body.innerHTML = '<div id="character-layer"></div>';
    globalThis.requestAnimationFrame = vi.fn((cb) => cb());

    const layer = new CharacterLayer(document.getElementById('character-layer'), '/game/');
    layer.show({
      id: 'hero',
      image: 'characters/hero.png',
      position: 'center',
      transition: 'none',
      duration: 0,
    });

    const sprite = document.querySelector('.character-sprite');
    const motion = sprite?.querySelector('.character-motion');
    const images = motion ? Array.from(motion.querySelectorAll('img')) : [];

    expect(sprite).not.toBeNull();
    expect(motion).not.toBeNull();
    expect(motion?.parentElement).toBe(sprite);
    expect(images).toHaveLength(2);
    expect(images[0]?.classList.contains('char-img-a')).toBe(true);
    expect(images[1]?.classList.contains('char-img-b')).toBe(true);
  });
});
