/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AudioManager } from '../src/engine/AudioManager.js';

class StubAudio {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
    this.loop = false;
    this.pause = vi.fn();
    this.play = vi.fn().mockResolvedValue();
  }
}

describe('AudioManager BGM transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Audio', StubAudio);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stops a fading track before replacing it with a new BGM', () => {
    const audio = new AudioManager('/audio/');
    audio.playBgm({ file: 'first.ogg', volume: 1 });
    const first = audio._bgm;

    audio.stopBgm({ fadeOut: 1000 });
    audio.playBgm({ file: 'second.ogg', volume: 1 });

    expect(first.pause).toHaveBeenCalledTimes(1);
    expect(first.currentTime).toBe(0);
    expect(audio._bgm.src).toBe('/audio/second.ogg');
  });
});
