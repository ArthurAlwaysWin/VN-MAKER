/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VideoPlayer, resolveRuntimeVideoRequest } from '../src/ui/VideoPlayer.js';
import { OVERLAY_FIXTURES } from './fixtures/unifiedScreenDesignerLegacyFixtures.js';

describe('resolveRuntimeVideoRequest', () => {
  it('resolves registered videos through the runtime asset resolver', () => {
    const request = resolveRuntimeVideoRequest({
      videoId: 'op_main',
      audioMode: 'duck',
      fit: 'cover',
      volume: 0.75,
    }, {
      assets: {
        videos: {
          op_main: {
            file: 'videos/op_main.mp4',
            poster: 'videos/op_main.poster.png',
          },
        },
      },
    });

    expect(request).toMatchObject({
      ok: true,
      file: 'videos/op_main.mp4',
      src: './assets/videos/op_main.mp4',
      posterSrc: './assets/videos/op_main.poster.png',
      audioMode: 'duck',
      fit: 'cover',
      volume: 0.75,
    });
  });

  it('rejects non-canonical video paths at runtime', () => {
    expect(resolveRuntimeVideoRequest({ file: '../op.mp4' }).ok).toBe(false);
    expect(resolveRuntimeVideoRequest({ file: 'audio/op.mp4' }).code).toBe('invalid-video-root');
    expect(resolveRuntimeVideoRequest({ file: 'videos/op.mov' }).code).toBe('unsupported-video-extension');
  });
});

describe('VideoPlayer', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('resolves ended outcomes and restores ducked BGM', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const restore = vi.fn();
    const player = new VideoPlayer(container, {
      audioManager: {
        beginExternalAudioMode: vi.fn(() => restore),
      },
    });

    const promise = player.play({
      file: 'videos/story.webm',
      audioMode: 'duck',
      controls: true,
      fit: 'native',
    });

    expect(container.querySelector('video').src).toContain('/assets/videos/story.webm');
    expect(container.querySelector('video').controls).toBe(true);
    container.querySelector('video').onended();

    await expect(promise).resolves.toMatchObject({ type: 'ended' });
    expect(restore).toHaveBeenCalledTimes(1);
    expect(player.isPlaying).toBe(false);
  });

  it('returns an error outcome instead of throwing for missing videos', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const player = new VideoPlayer(container);

    await expect(player.play({ file: '/videos/op.mp4' })).resolves.toMatchObject({
      type: 'error',
      code: 'unsafe-video-path',
    });
  });

  it('shows policy-allowed controls and lets Escape skip a skippable video', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const player = new VideoPlayer(container);
    const promise = player.play(OVERLAY_FIXTURES.videoControls);

    expect(player.video.controls).toBe(true);
    expect(player.skipButton.classList.contains('hidden')).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    await expect(promise).resolves.toMatchObject({ type: 'skipped' });
    expect(player.isPlaying).toBe(false);
    expect(player.el.getAttribute('aria-hidden')).toBe('true');
  });
});
