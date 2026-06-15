import { resolvePath } from '../engine/assetPath.js';
import {
  VIDEO_AUDIO_MODES,
  VIDEO_FIT_MODES,
  isSupportedVideoFilePath,
  normalizeProjectVideoPath,
  normalizeVideoRegistry,
  resolveVideoReference,
} from '../shared/videoContract.js';

const DEFAULT_VIDEO_VOLUME = 1;
const DEFAULT_DUCK_FACTOR = 0.28;

function clamp01(value, fallback = DEFAULT_VIDEO_VOLUME) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function asBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeFit(value) {
  return VIDEO_FIT_MODES.includes(value) ? value : 'contain';
}

function normalizeAudioMode(value) {
  return VIDEO_AUDIO_MODES.includes(value) ? value : 'replace';
}

function resolveOptionalVideoAssetPath(path) {
  if (!path) return '';
  const normalized = normalizeProjectVideoPath(path);
  return normalized.ok ? normalized.path : '';
}

export function resolveRuntimeVideoRequest(reference = {}, script = {}) {
  const registry = normalizeVideoRegistry(script?.assets?.videos);
  const resolved = resolveVideoReference(reference, registry);
  if (!resolved?.file) {
    return { ok: false, code: 'missing-video-source' };
  }

  if (!isSupportedVideoFilePath(resolved.file)) {
    const normalized = normalizeProjectVideoPath(resolved.file);
    return {
      ok: false,
      code: normalized.ok ? 'unsupported-video-extension' : normalized.code,
      file: normalized.path ?? resolved.file,
    };
  }

  const normalizedFile = normalizeProjectVideoPath(resolved.file).path;
  const registryEntry = resolved.registryEntry ?? {};
  const playback = {
    ...registryEntry,
    ...(reference && typeof reference === 'object' ? reference : {}),
  };
  const posterPath = resolveOptionalVideoAssetPath(resolved.poster);

  return {
    ok: true,
    videoId: resolved.videoId,
    file: normalizedFile,
    src: resolvePath(normalizedFile),
    poster: posterPath,
    posterSrc: posterPath ? resolvePath(posterPath) : '',
    label: playback.label || playback.title || resolved.videoId || normalizedFile,
    skippable: asBoolean(playback.skippable, true),
    controls: asBoolean(playback.controls, false),
    volume: clamp01(playback.volume, DEFAULT_VIDEO_VOLUME),
    audioMode: normalizeAudioMode(playback.audioMode),
    fit: normalizeFit(playback.fit),
    loop: asBoolean(playback.loop, false),
  };
}

export class VideoPlayer {
  constructor(container, { audioManager = null } = {}) {
    this.container = container;
    this.audioManager = audioManager;
    this.el = document.createElement('div');
    this.el.id = 'runtime-video-player';
    this.el.className = 'hidden';
    this.el.setAttribute('aria-hidden', 'true');

    this.video = document.createElement('video');
    this.video.className = 'runtime-video-element';
    this.video.playsInline = true;
    this.video.preload = 'auto';

    this.gateButton = document.createElement('button');
    this.gateButton.type = 'button';
    this.gateButton.className = 'runtime-video-gate hidden';
    this.gateButton.textContent = '播放';

    this.skipButton = document.createElement('button');
    this.skipButton.type = 'button';
    this.skipButton.className = 'runtime-video-skip hidden';
    this.skipButton.textContent = '跳过';

    this.el.append(this.video, this.gateButton, this.skipButton);
    this.container.appendChild(this.el);

    this._active = null;
    this._onKeyDown = (event) => {
      if (!this._active?.request.skippable) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.stop('skipped');
      }
    };
  }

  get isPlaying() {
    return Boolean(this._active);
  }

  play(reference, {
    script = {},
    audioManager = this.audioManager,
    skipImmediately = false,
  } = {}) {
    const request = resolveRuntimeVideoRequest(reference, script);
    if (!request.ok) {
      return Promise.resolve({ type: 'error', code: request.code, request });
    }

    if (skipImmediately && request.skippable) {
      return Promise.resolve({ type: 'skipped', request });
    }

    this.stop('skipped');

    return new Promise((resolve) => {
      const restoreAudio = audioManager?.beginExternalAudioMode?.(request.audioMode, {
        duckFactor: DEFAULT_DUCK_FACTOR,
      }) ?? (() => {});
      let settled = false;

      const finish = (type, detail = {}) => {
        if (settled) return;
        settled = true;
        restoreAudio();
        this._teardownActive();
        resolve({ type, request, ...detail });
      };

      this._active = { request, finish };
      this._renderRequest(request);

      this.video.onended = () => finish('ended');
      this.video.onerror = () => finish('error', { code: 'media-error' });
      this.skipButton.onclick = () => finish('skipped');
      this.gateButton.onclick = () => this._attemptPlay(finish, true);
      document.addEventListener('keydown', this._onKeyDown);

      this._attemptPlay(finish, false);
    });
  }

  stop(outcome = 'skipped') {
    if (!this._active) return;
    this._active.finish(outcome);
  }

  _renderRequest(request) {
    this.el.className = `runtime-video-visible fit-${request.fit}`;
    this.el.setAttribute('aria-hidden', 'false');
    this.video.className = `runtime-video-element fit-${request.fit}`;
    this.video.src = request.src;
    this.video.poster = request.posterSrc;
    this.video.controls = request.controls;
    this.video.loop = request.loop;
    this.video.volume = request.volume;
    this.video.muted = request.volume <= 0;
    this.gateButton.classList.add('hidden');
    this.skipButton.classList.toggle('hidden', !request.skippable);
  }

  _attemptPlay(finish, fromGate) {
    this.gateButton.classList.add('hidden');
    const playPromise = this.video.play();
    if (!playPromise?.catch) return;

    playPromise.catch((error) => {
      if (!this._active) return;
      if (!fromGate) {
        this.gateButton.classList.remove('hidden');
        return;
      }
      finish('error', { code: 'playback-rejected', error });
    });
  }

  _teardownActive() {
    document.removeEventListener('keydown', this._onKeyDown);
    this.video.onended = null;
    this.video.onerror = null;
    this.skipButton.onclick = null;
    this.gateButton.onclick = null;
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.removeAttribute('poster');
    this.video.load?.();
    this.el.className = 'hidden';
    this.el.setAttribute('aria-hidden', 'true');
    this.gateButton.classList.add('hidden');
    this.skipButton.classList.add('hidden');
    this._active = null;
  }
}
