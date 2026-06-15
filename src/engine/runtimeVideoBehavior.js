import { isValidEndingId } from '../shared/endingRegistry.js';

export const OPENING_VIDEO_PROFILE_KEY = 'ui.titleScreen.openingVideo';

export function getEndingVideoProfileKey(endingId) {
  return isValidEndingId(endingId) ? `systems.endings.${endingId}.endingVideo` : null;
}

export function shouldRecordPlayedMediaOutcome(outcome) {
  const type = typeof outcome === 'string' ? outcome : outcome?.type;
  return type === 'ended' || type === 'skipped';
}

export function hasPlayedMedia(profile, mediaKey) {
  if (typeof mediaKey !== 'string' || !mediaKey) return false;
  const record = profile?.playedMedia?.[mediaKey];
  return Number(record?.count) > 0;
}

export function shouldPlayOncePerProfileVideo(reference, profile, mediaKey, { replay = false } = {}) {
  if (!reference || typeof reference !== 'object') return false;
  if (replay || reference.oncePerProfile !== true) return true;
  return !hasPlayedMedia(profile, mediaKey);
}

export function isManualEndingVideoReplayAllowed({ endingVideo, unlockRecord = null, preview = false } = {}) {
  if (!endingVideo || typeof endingVideo !== 'object') return false;
  if ((endingVideo.play ?? 'after-unlock') !== 'manual') return false;
  return preview || Boolean(unlockRecord);
}
