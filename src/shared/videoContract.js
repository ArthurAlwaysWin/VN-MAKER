export const VIDEO_ASSET_ROOT = 'videos';
export const VIDEO_EXTENSIONS = Object.freeze(['.mp4', '.webm']);
export const VIDEO_AUDIO_MODES = Object.freeze(['replace', 'duck', 'mix']);
export const VIDEO_FIT_MODES = Object.freeze(['contain', 'cover', 'native']);
export const OPENING_VIDEO_PLAY_MODES = Object.freeze(['after-start', 'before-title', 'manual']);
export const ENDING_VIDEO_PLAY_MODES = Object.freeze(['after-unlock', 'manual']);
export const VIDEO_KIND_OPTIONS = Object.freeze(['op', 'ed', 'story', 'other']);

const VIDEO_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const UNSAFE_OBJECT_MAP_KEYS = new Set(Object.getOwnPropertyNames(Object.prototype));

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

export function normalizeVideoId(videoId) {
  return normalizeOptionalString(videoId);
}

export function isValidVideoId(videoId) {
  const normalized = normalizeVideoId(videoId);
  return Boolean(
    normalized
    && VIDEO_ID_PATTERN.test(normalized)
    && !UNSAFE_OBJECT_MAP_KEYS.has(normalized),
  );
}

export function normalizeVideoEntry(entry = {}, fallbackId = null) {
  const source = isPlainObject(entry) ? cloneJsonValue(entry) : {};
  const file = normalizeOptionalString(source.file);
  const poster = normalizeOptionalString(source.poster);
  const label = normalizeOptionalString(source.label ?? source.name ?? fallbackId) ?? fallbackId ?? 'Untitled Video';
  const kind = normalizeOptionalString(source.kind) ?? 'other';
  const tags = Array.isArray(source.tags)
    ? source.tags.map(tag => normalizeOptionalString(tag)).filter(Boolean)
    : [];
  const durationMs = Number(source.durationMs);

  const normalized = {
    ...source,
    label,
    kind,
    tags,
  };

  if (file) {
    normalized.file = file;
  } else {
    delete normalized.file;
  }

  if (poster) {
    normalized.poster = poster;
  } else {
    delete normalized.poster;
  }

  if (Number.isFinite(durationMs) && durationMs >= 0) {
    normalized.durationMs = durationMs;
  } else {
    delete normalized.durationMs;
  }

  delete normalized.name;
  delete normalized.id;
  return normalized;
}

export function normalizeVideoRegistry(registry = {}) {
  if (!isPlainObject(registry)) {
    return {};
  }

  const normalized = {};
  for (const [rawId, entry] of Object.entries(registry)) {
    const id = normalizeVideoId(rawId);
    if (!id || UNSAFE_OBJECT_MAP_KEYS.has(id)) {
      continue;
    }
    normalized[id] = normalizeVideoEntry(entry, id);
  }
  return normalized;
}

export function isPlainVideoReference(value) {
  return isPlainObject(value);
}

export function normalizeProjectVideoPath(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, code: 'empty-video-path', path: null };
  }

  let raw = value.trim().replace(/\\/g, '/');
  if (/^(?:https?:|data:|asset:|file:|blob:)/i.test(raw)) {
    return { ok: false, code: 'unsafe-video-path', path: raw };
  }
  if (raw.startsWith('/')) {
    return { ok: false, code: 'unsafe-video-path', path: raw };
  }
  if (/^[A-Za-z]:\//.test(raw)) {
    return { ok: false, code: 'unsafe-video-path', path: raw };
  }

  raw = raw.replace(/^\.\//, '');

  const parts = raw.split('/');
  if (parts.includes('..') || parts.some(part => part === '')) {
    return { ok: false, code: 'unsafe-video-path', path: raw };
  }
  if (parts[0] !== VIDEO_ASSET_ROOT) {
    return { ok: false, code: 'invalid-video-root', path: raw };
  }

  return { ok: true, code: null, path: raw };
}

export function isSupportedVideoFilePath(value) {
  const result = normalizeProjectVideoPath(value);
  if (!result.ok) return false;
  const lower = result.path.toLowerCase();
  return VIDEO_EXTENSIONS.some(extension => lower.endsWith(extension));
}

export function resolveVideoReference(reference = {}, registry = {}) {
  if (!isPlainObject(reference)) {
    return null;
  }

  const videoId = normalizeVideoId(reference.videoId);
  const registryEntry = videoId && registry[videoId] ? registry[videoId] : null;

  return {
    videoId,
    file: normalizeOptionalString(reference.file) ?? registryEntry?.file ?? null,
    poster: normalizeOptionalString(reference.poster) ?? registryEntry?.poster ?? null,
    registryEntry,
  };
}
