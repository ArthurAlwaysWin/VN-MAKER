/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterLayer } from '../src/ui/CharacterLayer.js';

function makeLayer() {
  document.body.innerHTML = '<div id="character-layer"></div>';
  globalThis.requestAnimationFrame = vi.fn((cb) => cb());
  return new CharacterLayer(document.getElementById('character-layer'), '/game/');
}

function showCharacter(layer, animation) {
  layer.show({
    id: 'hero',
    image: 'characters/hero.png',
    expression: 'normal',
    position: 'center',
    transition: 'none',
    duration: 0,
    animation,
  });
}

describe('character motion playback', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('applies completed M5 preset classes only on .character-motion and treats none/unknown as no-op', () => {
    const presets = [
      ['fade-in', 'motion-fade-in'],
      ['slide-in-left', 'motion-slide-in-left'],
      ['slide-in-right', 'motion-slide-in-right'],
      ['shake', 'motion-shake'],
      ['nod', 'motion-nod'],
      ['breathe', 'motion-breathe'],
      ['bounce', 'motion-bounce'],
      ['fade', 'motion-fade-in'],
      ['slide-left', 'motion-slide-in-left'],
      ['slide-right', 'motion-slide-in-right'],
      ['pop', 'motion-pop'],
      ['scale-in', 'motion-scale-in'],
      ['blur-in', 'motion-blur-in'],
    ];

    for (const [preset, className] of presets) {
      const layer = makeLayer();
      showCharacter(layer, preset);

      const sprite = document.querySelector('.character-sprite');
      const motion = document.querySelector('.character-motion');

      expect(motion?.classList.contains(className)).toBe(true);
      expect(sprite?.classList.contains(className)).toBe(false);
    }

    const noneLayer = makeLayer();
    showCharacter(noneLayer, 'none');
    expect(document.querySelector('.character-motion')?.className).toBe('character-motion');

    const unknownLayer = makeLayer();
    showCharacter(unknownLayer, 'legacy-spin');
    expect(document.querySelector('.character-motion')?.className).toBe('character-motion');
  });

  it('cleans one-shot presets after animation end and replays them cleanly on later page entry', () => {
    const layer = makeLayer();

    showCharacter(layer, 'shake');

    const motion = document.querySelector('.character-motion');
    expect(motion?.classList.contains('motion-shake')).toBe(true);

    motion?.dispatchEvent(new Event('animationend'));
    expect(motion?.classList.contains('motion-shake')).toBe(false);

    showCharacter(layer, 'shake');
    expect(motion?.classList.contains('motion-shake')).toBe(true);
  });

  it('keeps breathe as the only loop until replace or clear, and setExpression does not disturb it', () => {
    vi.useFakeTimers();
    const layer = makeLayer();

    showCharacter(layer, 'breathe');

    const motion = document.querySelector('.character-motion');
    expect(motion?.classList.contains('motion-breathe')).toBe(true);

    layer.setExpression({
      id: 'hero',
      image: 'characters/hero-happy.png',
      expression: 'happy',
      skip: true,
    });
    expect(motion?.classList.contains('motion-breathe')).toBe(true);

    showCharacter(layer, 'bounce');
    expect(motion?.classList.contains('motion-breathe')).toBe(false);
    expect(motion?.classList.contains('motion-bounce')).toBe(true);

    motion?.dispatchEvent(new Event('animationend'));
    expect(motion?.classList.contains('motion-bounce')).toBe(false);

    showCharacter(layer, 'breathe');
    expect(motion?.classList.contains('motion-breathe')).toBe(true);

    layer.clear();
    expect(document.querySelector('.character-motion')).toBeNull();
  });
});
