import { describe, expect, it } from 'vitest';

import {
  OPENING_VIDEO_PROFILE_KEY,
  getEndingVideoProfileKey,
  isManualEndingVideoReplayAllowed,
  shouldPlayOncePerProfileVideo,
  shouldRecordPlayedMediaOutcome,
} from '../src/engine/runtimeVideoBehavior.js';

describe('runtime video profile behavior', () => {
  it('uses stable canonical profile keys for OP and ED playback records', () => {
    expect(OPENING_VIDEO_PROFILE_KEY).toBe('ui.titleScreen.openingVideo');
    expect(getEndingVideoProfileKey('good_end')).toBe('systems.endings.good_end.endingVideo');
    expect(getEndingVideoProfileKey('__proto__')).toBeNull();
  });

  it('skips once-per-profile media after it has a playedMedia record unless replay is explicit', () => {
    const profile = {
      playedMedia: {
        'ui.titleScreen.openingVideo': { playedAt: 1000, count: 1 },
      },
    };

    expect(shouldPlayOncePerProfileVideo(
      { oncePerProfile: true },
      profile,
      'ui.titleScreen.openingVideo',
    )).toBe(false);
    expect(shouldPlayOncePerProfileVideo(
      { oncePerProfile: true },
      profile,
      'ui.titleScreen.openingVideo',
      { replay: true },
    )).toBe(true);
    expect(shouldPlayOncePerProfileVideo(
      { oncePerProfile: false },
      profile,
      'ui.titleScreen.openingVideo',
    )).toBe(true);
  });

  it('records completed or accepted skipped playback but not failed playback', () => {
    expect(shouldRecordPlayedMediaOutcome({ type: 'ended' })).toBe(true);
    expect(shouldRecordPlayedMediaOutcome({ type: 'skipped' })).toBe(true);
    expect(shouldRecordPlayedMediaOutcome({ type: 'error' })).toBe(false);
    expect(shouldRecordPlayedMediaOutcome({ type: 'skipped-profile' })).toBe(false);
  });

  it('allows manual ED replay only for unlocked endings or editor preview', () => {
    const endingVideo = { videoId: 'ed_good', play: 'manual' };

    expect(isManualEndingVideoReplayAllowed({ endingVideo, unlockRecord: { count: 1 } })).toBe(true);
    expect(isManualEndingVideoReplayAllowed({ endingVideo, preview: true })).toBe(true);
    expect(isManualEndingVideoReplayAllowed({ endingVideo })).toBe(false);
    expect(isManualEndingVideoReplayAllowed({
      endingVideo: { videoId: 'ed_good', play: 'after-unlock' },
      unlockRecord: { count: 1 },
      preview: true,
    })).toBe(false);
  });
});
