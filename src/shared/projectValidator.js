import {
  BOOL_CONDITION_OPERATORS,
  getConditionInputRows,
  isBooleanConditionValue,
  isNumberConditionValue,
  normalizeConditionPage,
} from './branchingContract.js';
import { analyzeConditionPage } from './conditionAnalysis.js';
import {
  collectCgUnlockReferences,
  isValidCgId,
  normalizeCgId,
  normalizeCgRegistry,
} from './cgRegistry.js';
import {
  collectEndingUnlockReferences,
  isValidEndingId,
  normalizeEndingId,
  normalizeEndingRegistry,
} from './endingRegistry.js';
import {
  CAMERA_EFFECT_DIRECTION_OPTIONS,
  getRuntimeTransitionType,
  isKnownCameraEffect,
  isKnownCharacterAnimation,
  isKnownTransitionType,
} from './cinematicContract.js';
import { normalizeEffects } from './effectDsl.js';
import {
  isKnownEffectPackAdapter,
  isValidEffectPackId,
  validateEffectPackManifest,
} from './effectPackContract.js';
import { createBranchGraphReport } from './sceneGraph.js';
import {
  PARTICLE_FIELD_SCHEMA,
  isKnownParticlePreset,
} from './particleContract.js';
import {
  UI_MOTION_FIELD_SCHEMA,
  isKnownUiMotionIntensity,
  isKnownUiMotionPreset,
} from './uiMotionContract.js';
import { isKnownUiStylePreset } from './uiStylePresetContract.js';
import { validateUiProjectContract } from './uiDocumentContract.js';
import {
  isKnownSettingsCustomButtonAction,
  isKnownSettingsFooterButtonAction,
} from './settingsScreenContract.js';
import {
  BACKGROUND_TRANSITION_DURATION_SCHEMA,
  CAMERA_EFFECT_DURATION_SCHEMA,
  isValidNumericTransitionParam,
} from './transitionCatalog.js';
import { isValidVariableId, normalizeVariableId, normalizeVariableRegistry } from './variableRegistry.js';
import { collectTextTemplateVariableIds } from './textTemplate.js';
import {
  ENDING_VIDEO_PLAY_MODES,
  OPENING_VIDEO_PLAY_MODES,
  VIDEO_AUDIO_MODES,
  VIDEO_EXTENSIONS,
  VIDEO_FIT_MODES,
  VIDEO_KIND_OPTIONS,
  isPlainVideoReference,
  isSupportedVideoFilePath,
  isValidVideoId,
  normalizeProjectVideoPath,
  normalizeVideoId,
  normalizeVideoRegistry,
  resolveVideoReference,
} from './videoContract.js';

export const PROJECT_VALIDATION_SEVERITIES = Object.freeze({
  ERROR: 'error',
  WARNING: 'warning',
});

const KNOWN_PAGE_TYPES = new Set(['normal', 'choice', 'input', 'condition', 'video']);
const VARIABLE_EFFECT_TYPES = new Set(['var:set', 'var:add', 'var:sub']);
const UNLOCK_EFFECT_TYPES = new Set(['unlock:ending', 'unlock:cg']);
/**
 * Default warning threshold in JavaScript string code units for dialogue and
 * choice-option text. Callers can override it with
 * `validateProject(script, { longDialogueLimit })`.
 */
const DEFAULT_LONG_DIALOGUE_LIMIT = 120;

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isBooleanEffectValue(value) {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return value === 0 || value === 1;
  if (typeof value === 'string') {
    return ['false', 'true', '0', '1', 'yes', 'no', 'on', 'off'].includes(value.trim().toLowerCase());
  }
  return false;
}

function isNumberEffectValue(value) {
  return typeof value !== 'boolean'
    && value !== null
    && value !== undefined
    && value !== ''
    && Number.isFinite(Number(value));
}

function pathToString(path) {
  return path.map((part) => String(part)).join('.');
}

function createIssue(severity, code, message, path = [], details = {}) {
  return {
    severity,
    code,
    message,
    path,
    pathString: pathToString(path),
    ...details,
  };
}

function normalizeAssetPath(assetPath) {
  if (typeof assetPath !== 'string' || !assetPath.trim()) {
    return null;
  }

  const normalized = assetPath.trim().replace(/\\/g, '/').replace(/^\.?\//, '');
  if (/^(https?:|data:|asset:|file:|blob:)/i.test(normalized)) {
    return null;
  }

  return normalized;
}

function createKnownAssetSet(knownAssets) {
  if (!knownAssets) {
    return null;
  }

  const source = knownAssets instanceof Set ? [...knownAssets] : knownAssets;
  if (!Array.isArray(source)) {
    return null;
  }

  return new Set(source.map(normalizeAssetPath).filter(Boolean));
}

function validateAssetReference(report, assetSet, assetPath, path, kind) {
  const normalized = normalizeAssetPath(assetPath);
  if (!assetSet || !normalized) {
    return;
  }

  if (!assetSet.has(normalized)) {
    addWarning(report, 'missing-asset-reference', `${kind} asset "${normalized}" does not exist in known assets.`, path, {
      assetPath: normalized,
      assetKind: kind,
    });
  }
}

function addError(report, code, message, path, details) {
  report.errors.push(createIssue(PROJECT_VALIDATION_SEVERITIES.ERROR, code, message, path, details));
}

function addWarning(report, code, message, path, details) {
  report.warnings.push(createIssue(PROJECT_VALIDATION_SEVERITIES.WARNING, code, message, path, details));
}

function getSceneIds(script) {
  return new Set(Object.keys(isPlainObject(script?.scenes) ? script.scenes : {}));
}

function getCharacter(script, characterId) {
  return isPlainObject(script?.characters) ? script.characters[characterId] : undefined;
}

function validateTopLevel(script, report) {
  if (!isPlainObject(script)) {
    addError(report, 'invalid-script', 'Project script must be a plain object.', []);
    return false;
  }

  for (const key of ['characters', 'scenes', 'systems']) {
    if (script[key] != null && !isPlainObject(script[key])) {
      addError(report, `invalid-${key}`, `Top-level "${key}" must be an object.`, [key]);
    }
  }

  if (!isNonEmptyString(script.projectId)) {
    addWarning(report, 'missing-project-id', 'Project script has no stable projectId; profile data cannot be safely keyed.', ['projectId']);
  }

  return true;
}

function validateCharacterRegistry(script, report) {
  if (!isPlainObject(script?.characters)) {
    return;
  }

  for (const [characterId, character] of Object.entries(script.characters)) {
    if (!isNonEmptyString(characterId)) {
      addError(report, 'invalid-character-id', 'Character id must be a non-empty string.', ['characters', characterId]);
    }

    if (!isPlainObject(character)) {
      addError(report, 'invalid-character-entry', 'Character entry must be an object.', ['characters', characterId]);
      continue;
    }

    if (character.expressions != null && !isPlainObject(character.expressions)) {
      addError(report, 'invalid-character-expressions', 'Character expressions must be an object map.', ['characters', characterId, 'expressions']);
    }
  }
}

function validateCharacterAssets(script, report, assetSet) {
  if (!isPlainObject(script?.characters)) {
    return;
  }

  for (const [characterId, character] of Object.entries(script.characters)) {
    if (!isPlainObject(character?.expressions)) {
      continue;
    }

    for (const [expressionId, assetPath] of Object.entries(character.expressions)) {
      validateAssetReference(report, assetSet, assetPath, ['characters', characterId, 'expressions', expressionId], 'character-expression');
    }
  }
}

function validateEffectPackRegistry(script, report) {
  const registry = script?.assets?.effectPacks;
  if (registry === undefined) {
    return {};
  }

  if (!isPlainObject(registry)) {
    addError(report, 'invalid-effect-pack-registry', 'assets.effectPacks must be an object map of manifest-only effect pack declarations.', ['assets', 'effectPacks']);
    return {};
  }

  const normalized = {};
  for (const [effectPackId, manifest] of Object.entries(registry)) {
    const path = ['assets', 'effectPacks', effectPackId];
    if (!isPlainObject(manifest)) {
      addError(report, 'invalid-effect-pack-manifest', 'Effect pack manifest must be an object.', path, {
        effectPackId,
      });
      continue;
    }

    const result = validateEffectPackManifest({
      ...manifest,
      id: manifest.id ?? effectPackId,
    });

    if (result.manifest && result.manifest.id !== effectPackId) {
      addWarning(report, 'effect-pack-id-mismatch', `Effect pack key "${effectPackId}" does not match manifest id "${result.manifest.id}".`, [...path, 'id'], {
        effectPackId,
        manifestId: result.manifest.id,
      });
    }

    for (const error of result.errors) {
      const code = error.includes('files.') ? 'invalid-effect-pack-file-path' : 'invalid-effect-pack-manifest';
      addError(report, code, error, path, {
        effectPackId,
      });
    }

    for (const warning of result.warnings) {
      const code = warning.includes('adapter') ? 'unsupported-effect-pack-adapter' : 'unsupported-effect-pack-kind';
      addWarning(report, code, warning, path, {
        effectPackId,
      });
    }

    if (result.manifest) {
      normalized[result.manifest.id] = result.manifest;
    }
  }

  return normalized;
}

function validateVideoAssetPath(report, assetPath, path, kind, { requireVideoExtension = false } = {}) {
  const normalized = normalizeProjectVideoPath(assetPath);
  if (!normalized.ok) {
    addError(report, normalized.code, `${kind} path must be a project-relative videos/... asset path.`, path, {
      assetPath: normalized.path ?? assetPath ?? null,
      assetKind: kind,
    });
    return null;
  }

  if (requireVideoExtension && !isSupportedVideoFilePath(normalized.path)) {
    addError(report, 'unsupported-video-extension', `Video file "${normalized.path}" must use one of: ${VIDEO_EXTENSIONS.join(', ')}.`, path, {
      assetPath: normalized.path,
      assetKind: kind,
      supportedExtensions: VIDEO_EXTENSIONS,
    });
    return null;
  }

  return normalized.path;
}

function validateKnownVideoAsset(report, assetSet, assetPath, path, kind, options = {}) {
  const normalized = validateVideoAssetPath(report, assetPath, path, kind, options);
  if (normalized && assetSet && !assetSet.has(normalized)) {
    const severity = options.missingSeverity ?? 'error';
    const message = `${kind} asset "${normalized}" does not exist in known assets.`;
    const details = {
      assetPath: normalized,
      assetKind: kind,
    };
    if (severity === 'warning') {
      addWarning(report, 'missing-asset-reference', message, path, details);
    } else {
      addError(report, 'missing-video-asset-reference', message, path, details);
    }
  }
  return normalized;
}

function validateVideoRegistry(script, report, assetSet) {
  const rawVideos = script?.assets?.videos;
  if (rawVideos === undefined) {
    return {};
  }

  if (!isPlainObject(rawVideos)) {
    addError(report, 'invalid-video-registry', 'assets.videos must be an object map.', ['assets', 'videos']);
    return {};
  }

  const normalized = normalizeVideoRegistry(rawVideos);
  const seenNormalizedIds = new Map();
  for (const [rawId, entry] of Object.entries(rawVideos)) {
    const normalizedId = normalizeVideoId(rawId);
    const path = ['assets', 'videos', rawId];

    if (!isValidVideoId(rawId)) {
      addError(report, 'invalid-video-id', `Video id "${rawId}" must start with a letter or underscore and contain only letters, numbers, underscores, or hyphens.`, path, {
        videoId: rawId,
      });
    }

    if (normalizedId) {
      const previousRawId = seenNormalizedIds.get(normalizedId);
      if (previousRawId && previousRawId !== rawId) {
        addError(report, 'duplicate-video-id', `Video id "${rawId}" duplicates "${previousRawId}" after normalization.`, path, {
          videoId: normalizedId,
          duplicateOf: previousRawId,
        });
      }
      seenNormalizedIds.set(normalizedId, rawId);
    }

    if (!isPlainObject(entry)) {
      addError(report, 'invalid-video-entry', 'Video registry entry must be an object.', path, {
        videoId: rawId,
      });
      continue;
    }

    const normalizedEntry = normalizedId ? normalized[normalizedId] : null;
    if (!isNonEmptyString(normalizedEntry?.file)) {
      addError(report, 'missing-video-file', `Video "${rawId}" requires a file path.`, [...path, 'file'], {
        videoId: normalizedId ?? rawId,
      });
    } else {
      validateKnownVideoAsset(report, assetSet, normalizedEntry.file, [...path, 'file'], 'video', {
        requireVideoExtension: true,
      });
    }

    if (normalizedEntry?.poster) {
      validateKnownVideoAsset(report, assetSet, normalizedEntry.poster, [...path, 'poster'], 'video-poster', {
        missingSeverity: 'warning',
      });
    }

    if (normalizedEntry?.kind && !VIDEO_KIND_OPTIONS.includes(normalizedEntry.kind)) {
      addWarning(report, 'unknown-video-kind', `Video kind "${normalizedEntry.kind}" is not recognized.`, [...path, 'kind'], {
        videoId: normalizedId ?? rawId,
        kind: normalizedEntry.kind,
      });
    }
  }

  return normalized;
}

function validateVideoReference(reference, context, report, options = {}) {
  const {
    assetSet,
    path,
    playModes,
    reason,
    videoRegistry,
  } = context;

  if (!isPlainVideoReference(reference)) {
    addError(report, 'invalid-video-reference', 'Video reference must be an object.', path, {
      reason,
    });
    return null;
  }

  const hasVideoId = isNonEmptyString(reference.videoId);
  const hasFile = isNonEmptyString(reference.file);
  if (!hasVideoId && !hasFile) {
    addError(report, 'missing-video-source', 'Video reference requires either videoId or file.', path, {
      reason,
    });
  }

  if (hasVideoId) {
    const normalizedVideoId = normalizeVideoId(reference.videoId);
    if (!isValidVideoId(reference.videoId)) {
      addError(report, 'invalid-video-id', `Video reference id "${reference.videoId}" is invalid.`, [...path, 'videoId'], {
        videoId: reference.videoId,
        reason,
      });
    } else if (!videoRegistry[normalizedVideoId]) {
      addError(report, 'unknown-video-id', `Video id "${reference.videoId}" is not declared in assets.videos.`, [...path, 'videoId'], {
        videoId: normalizedVideoId,
        reason,
      });
    }
  }

  const resolved = resolveVideoReference(reference, videoRegistry);
  const effectiveLoop = reference.loop ?? resolved?.registryEntry?.loop;
  const effectiveSkippable = reference.skippable ?? resolved?.registryEntry?.skippable ?? true;
  if (hasFile) {
    validateKnownVideoAsset(report, assetSet, reference.file, [...path, 'file'], 'video', {
      requireVideoExtension: true,
    });
  } else if (resolved?.file) {
    validateKnownVideoAsset(report, assetSet, resolved.file, hasVideoId ? [...path, 'videoId'] : path, 'video', {
      requireVideoExtension: true,
    });
  }

  if (reference.poster) {
    validateKnownVideoAsset(report, assetSet, reference.poster, [...path, 'poster'], 'video-poster', {
      missingSeverity: 'warning',
    });
  }

  if (reference.volume !== undefined) {
    const volume = Number(reference.volume);
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      addError(report, 'invalid-video-volume', 'Video volume must be a number between 0 and 1.', [...path, 'volume'], {
        volume: reference.volume,
        reason,
      });
    }
  }

  if (reference.audioMode !== undefined && !VIDEO_AUDIO_MODES.includes(reference.audioMode)) {
    addError(report, 'invalid-video-audio-mode', `Video audioMode must be one of: ${VIDEO_AUDIO_MODES.join(', ')}.`, [...path, 'audioMode'], {
      audioMode: reference.audioMode,
      reason,
    });
  }

  if (reference.fit !== undefined && !VIDEO_FIT_MODES.includes(reference.fit)) {
    addError(report, 'invalid-video-fit', `Video fit must be one of: ${VIDEO_FIT_MODES.join(', ')}.`, [...path, 'fit'], {
      fit: reference.fit,
      reason,
    });
  }

  for (const field of ['skippable', 'controls', 'oncePerProfile', 'returnToTitle', 'autoAdvance', 'loop']) {
    if (reference[field] !== undefined && typeof reference[field] !== 'boolean') {
      addError(report, 'invalid-video-boolean', `Video ${field} must be a boolean.`, [...path, field], {
        field,
        value: reference[field],
        reason,
      });
    }
  }

  if (effectiveLoop === true && effectiveSkippable === false) {
    addError(report, 'video-loop-unskippable-conflict', 'Looping videos must remain skippable so playback always has an exit path.', path, {
      reason,
    });
  }

  if (reference.play !== undefined) {
    if (!Array.isArray(playModes) || !playModes.includes(reference.play)) {
      const supportedModes = Array.isArray(playModes) && playModes.length > 0
        ? playModes.join(', ')
        : 'none for this context';
      addError(report, 'invalid-video-play-mode', `Video play mode must be one of: ${supportedModes}.`, [...path, 'play'], {
        play: reference.play,
        reason,
      });
    } else if (reason === 'opening' && reference.play === 'before-title') {
      addWarning(report, 'opening-video-before-title-autoplay-risk', 'Opening video before-title mode requires a click-to-play gate for unmuted playback.', [...path, 'play'], {
        play: reference.play,
      });
    }
  }

  if (options.requirePlay && reference.play === undefined) {
    addWarning(report, 'missing-video-play-mode', 'Video play mode is omitted; runtime defaults will apply.', [...path, 'play'], {
      reason,
    });
  }

  return resolved;
}

function validateVariableRegistry(script, registry, report) {
  const variables = script?.systems?.variables;
  if (variables == null) {
    return;
  }

  if (!isPlainObject(variables)) {
    addError(report, 'invalid-variable-registry', 'systems.variables must be an object map.', ['systems', 'variables']);
    return;
  }

  const seenNormalizedIds = new Map();
  for (const [rawId, entry] of Object.entries(variables)) {
    const normalizedId = normalizeVariableId(rawId);
    const path = ['systems', 'variables', rawId];

    if (!isValidVariableId(rawId)) {
      addError(report, 'invalid-variable-id', `Variable id "${rawId}" must start with a letter or underscore and contain only letters, numbers, underscores, or hyphens.`, path, {
        variableId: rawId,
      });
    }

    if (normalizedId) {
      const previousRawId = seenNormalizedIds.get(normalizedId);
      if (previousRawId && previousRawId !== rawId) {
        addError(report, 'duplicate-variable-id', `Variable id "${rawId}" duplicates "${previousRawId}" after normalization.`, path, {
          variableId: normalizedId,
          duplicateOf: previousRawId,
        });
      }
      seenNormalizedIds.set(normalizedId, rawId);
    }

    if (!isPlainObject(entry)) {
      addError(report, 'invalid-variable-entry', 'Variable registry entry must be an object.', path, {
        variableId: rawId,
      });
      continue;
    }

    const normalizedEntry = normalizedId ? registry[normalizedId] : null;
    if (normalizedEntry?.kind === 'affection') {
      const characterId = normalizedEntry.characterId;
      if (!characterId || !getCharacter(script, characterId)) {
        addWarning(report, 'affection-character-missing', `Affection variable "${normalizedId}" must reference an existing character.`, [...path, 'characterId'], {
          variableId: normalizedId,
          characterId: characterId ?? null,
        });
      }
    }
  }
}

function validateEndingRegistry(script, endings, report, assetSet, videoRegistry) {
  const rawEndings = script?.systems?.endings;
  if (rawEndings == null) {
    return;
  }

  if (!isPlainObject(rawEndings)) {
    addError(report, 'invalid-ending-registry', 'systems.endings must be an object map.', ['systems', 'endings']);
    return;
  }

  const seenNormalizedIds = new Map();
  for (const [rawId, entry] of Object.entries(rawEndings)) {
    const normalizedId = normalizeEndingId(rawId);
    const path = ['systems', 'endings', rawId];

    if (!isValidEndingId(rawId)) {
      addError(report, 'invalid-ending-id', `Ending id "${rawId}" must start with a letter or underscore and contain only letters, numbers, underscores, or hyphens.`, path, {
        endingId: rawId,
      });
    }

    if (normalizedId) {
      const previousRawId = seenNormalizedIds.get(normalizedId);
      if (previousRawId && previousRawId !== rawId) {
        addError(report, 'duplicate-ending-id', `Ending id "${rawId}" duplicates "${previousRawId}" after normalization.`, path, {
          endingId: normalizedId,
          duplicateOf: previousRawId,
        });
      }
      seenNormalizedIds.set(normalizedId, rawId);
    }

    if (!isPlainObject(entry)) {
      addError(report, 'invalid-ending-entry', 'Ending registry entry must be an object.', path, {
        endingId: rawId,
      });
      continue;
    }

    const normalizedEntry = normalizedId ? endings[normalizedId] : null;
    if (!isNonEmptyString(normalizedEntry?.title)) {
      addWarning(report, 'missing-ending-title', `Ending "${rawId}" should have a title.`, [...path, 'title'], {
        endingId: normalizedId ?? rawId,
      });
    }

    validateAssetReference(report, assetSet, normalizedEntry?.thumbnail, [...path, 'thumbnail'], 'ending-thumbnail');
    if (normalizedEntry?.endingVideo !== undefined) {
      validateVideoReference(normalizedEntry.endingVideo, {
        assetSet,
        path: [...path, 'endingVideo'],
        playModes: ENDING_VIDEO_PLAY_MODES,
        reason: 'ending',
        videoRegistry,
      }, report, { requirePlay: false });
    }
  }
}

function validateCgRegistry(script, cgs, report, assetSet) {
  const rawCgs = script?.systems?.gallery?.cg;
  if (rawCgs == null) {
    return;
  }

  if (!isPlainObject(rawCgs)) {
    addError(report, 'invalid-cg-registry', 'systems.gallery.cg must be an object map.', ['systems', 'gallery', 'cg']);
    return;
  }

  const seenNormalizedIds = new Map();
  for (const [rawId, entry] of Object.entries(rawCgs)) {
    const normalizedId = normalizeCgId(rawId);
    const path = ['systems', 'gallery', 'cg', rawId];

    if (!isValidCgId(rawId)) {
      addError(report, 'invalid-cg-id', `CG id "${rawId}" must start with a letter or underscore and contain only letters, numbers, underscores, or hyphens.`, path, {
        cgId: rawId,
      });
    }

    if (normalizedId) {
      const previousRawId = seenNormalizedIds.get(normalizedId);
      if (previousRawId && previousRawId !== rawId) {
        addError(report, 'duplicate-cg-id', `CG id "${rawId}" duplicates "${previousRawId}" after normalization.`, path, {
          cgId: normalizedId,
          duplicateOf: previousRawId,
        });
      }
      seenNormalizedIds.set(normalizedId, rawId);
    }

    if (!isPlainObject(entry)) {
      addError(report, 'invalid-cg-entry', 'CG registry entry must be an object.', path, {
        cgId: rawId,
      });
      continue;
    }

    const normalizedEntry = normalizedId ? cgs[normalizedId] : null;
    if ((normalizedEntry?.images ?? []).length === 0) {
      addWarning(report, 'missing-cg-image', `CG "${rawId}" has no gallery images.`, [...path, 'images'], {
        cgId: normalizedId ?? rawId,
      });
    }
    if (!normalizedEntry?.thumbnail) {
      addWarning(report, 'missing-cg-thumbnail', `CG "${rawId}" has no thumbnail for gallery review.`, [...path, 'thumbnail'], {
        cgId: normalizedId ?? rawId,
      });
    }

    for (const [imageIndex, assetPath] of (normalizedEntry?.images ?? []).entries()) {
      validateAssetReference(report, assetSet, assetPath, [...path, 'images', imageIndex], 'cg-image');
    }
    validateAssetReference(report, assetSet, normalizedEntry?.thumbnail, [...path, 'thumbnail'], 'cg-thumbnail');
    validateAssetReference(report, assetSet, normalizedEntry?.lockedThumbnail, [...path, 'lockedThumbnail'], 'cg-locked-thumbnail');
  }
}

function validateSceneTarget(report, sceneIds, target, path, code = 'missing-scene-target') {
  if (target == null || target === '') {
    return;
  }

  if (!isNonEmptyString(target)) {
    addError(report, 'invalid-scene-target', 'Scene target must be a non-empty string or null.', path);
    return;
  }

  if (!sceneIds.has(target)) {
    addError(report, code, `Scene target "${target}" does not exist.`, path, { target });
  }
}

function validateDialogue(dialogue, context, report, options) {
  const { script, sceneId, pageIndex, dialogueIndex } = context;
  const path = ['scenes', sceneId, 'pages', pageIndex, 'dialogues', dialogueIndex];

  if (!isPlainObject(dialogue)) {
    addError(report, 'invalid-dialogue', 'Dialogue entry must be an object.', path);
    return;
  }

  if (dialogue.speaker != null && dialogue.speaker !== '') {
    if (!isNonEmptyString(dialogue.speaker)) {
      addError(report, 'invalid-dialogue-speaker', 'Dialogue speaker must be a character id, null, or empty.', [...path, 'speaker']);
    } else if (!getCharacter(script, dialogue.speaker)) {
      addError(report, 'missing-dialogue-speaker', `Dialogue speaker "${dialogue.speaker}" does not exist.`, [...path, 'speaker'], {
        characterId: dialogue.speaker,
      });
    }
  }

  if (!isNonEmptyString(dialogue.text)) {
    addWarning(report, 'empty-dialogue-text', 'Dialogue text is empty.', [...path, 'text']);
  } else if (dialogue.text.length > options.longDialogueLimit) {
    addWarning(report, 'long-dialogue-text', `Dialogue text is longer than ${options.longDialogueLimit} characters.`, [...path, 'text'], {
      length: dialogue.text.length,
      limit: options.longDialogueLimit,
    });
  }

  if (dialogue.expression && dialogue.speaker) {
    const character = getCharacter(script, dialogue.speaker);
    const expressions = isPlainObject(character?.expressions) ? character.expressions : {};
    if (Object.keys(expressions).length > 0 && !expressions[dialogue.expression]) {
      addWarning(report, 'missing-dialogue-expression', `Expression "${dialogue.expression}" does not exist on character "${dialogue.speaker}".`, [...path, 'expression'], {
        characterId: dialogue.speaker,
        expression: dialogue.expression,
      });
    }
  }

  validateAssetReference(report, options.assetSet, dialogue.voice, [...path, 'voice'], 'voice');
}

function validatePageCharacters(page, context, report) {
  const { script, sceneId, pageIndex } = context;
  if (page.characters == null) {
    return;
  }

  if (!Array.isArray(page.characters)) {
    addError(report, 'invalid-page-characters', 'Page characters must be an array.', ['scenes', sceneId, 'pages', pageIndex, 'characters']);
    return;
  }

  page.characters.forEach((entry, characterIndex) => {
    const path = ['scenes', sceneId, 'pages', pageIndex, 'characters', characterIndex];
    if (!isPlainObject(entry)) {
      addError(report, 'invalid-page-character-entry', 'Page character entry must be an object.', path);
      return;
    }

    if (!isNonEmptyString(entry.id)) {
      addError(report, 'invalid-page-character-id', 'Page character entry requires a character id.', [...path, 'id']);
      return;
    }

    const character = getCharacter(script, entry.id);
    if (!character) {
      addError(report, 'missing-page-character', `Page character "${entry.id}" does not exist.`, [...path, 'id'], {
        characterId: entry.id,
      });
      return;
    }

    const expressions = isPlainObject(character.expressions) ? character.expressions : {};
    if (entry.expression && Object.keys(expressions).length > 0 && !expressions[entry.expression]) {
      addWarning(report, 'missing-page-character-expression', `Expression "${entry.expression}" does not exist on character "${entry.id}".`, [...path, 'expression'], {
        characterId: entry.id,
        expression: entry.expression,
      });
    }
  });
}

function validateEffects(container, context, report) {
  const { registry, endings, cgs, path } = context;
  let effects = [];

  try {
    effects = normalizeEffects(container);
  } catch (error) {
    addError(report, 'invalid-effects', error.message, path);
    return;
  }

  effects.forEach((effect, effectIndex) => {
    const effectPath = [...path, 'effects', effectIndex];

    if (VARIABLE_EFFECT_TYPES.has(effect.type)) {
      if (!isValidVariableId(effect.id)) {
        addError(report, 'invalid-variable-id', `Variable effect references invalid variable id "${effect.id}".`, [...effectPath, 'id'], {
          variableId: effect.id,
        });
      }

      const variableEntry = Object.hasOwn(registry, effect.id) ? registry[effect.id] : null;
      if (!variableEntry) {
        addWarning(report, 'unregistered-variable-effect', `Variable effect references unregistered variable "${effect.id}".`, [...effectPath, 'id'], {
          variableId: effect.id,
        });
      } else if (variableEntry.type === 'bool' && effect.type !== 'var:set') {
        addWarning(report, 'variable-type-mismatch', `Boolean variable "${effect.id}" cannot use numeric effect "${effect.type}".`, [...effectPath, 'type'], {
          variableId: effect.id,
          expectedType: 'bool',
          actualEffectType: effect.type,
        });
      } else if (variableEntry.type === 'bool' && !isBooleanEffectValue(effect.value)) {
        addWarning(report, 'variable-type-mismatch', `Boolean variable "${effect.id}" should be set to a boolean-compatible value.`, [...effectPath, 'value'], {
          variableId: effect.id,
          expectedType: 'bool',
          actualValue: effect.value,
        });
      } else if (variableEntry.type === 'number' && effect.type === 'var:set' && !isNumberEffectValue(effect.value)) {
        addWarning(report, 'variable-type-mismatch', `Number variable "${effect.id}" should be set to a numeric value.`, [...effectPath, 'value'], {
          variableId: effect.id,
          expectedType: 'number',
          actualValue: effect.value,
        });
      } else if (variableEntry.type === 'string' && effect.type !== 'var:set') {
        addWarning(report, 'variable-type-mismatch', `Text variable "${effect.id}" cannot use numeric effect "${effect.type}".`, [...effectPath, 'type'], {
          variableId: effect.id,
          expectedType: 'string',
          actualEffectType: effect.type,
        });
      }
    }

    if (effect.type === 'unlock:ending') {
      if (!isValidEndingId(effect.id)) {
        addError(report, 'invalid-ending-id', `Ending unlock references invalid ending id "${effect.id}".`, [...effectPath, 'id'], {
          endingId: effect.id,
        });
      }
      if (!Object.hasOwn(endings, effect.id)) {
        addWarning(report, 'unregistered-ending-unlock', `Ending unlock references unregistered ending "${effect.id}".`, [...effectPath, 'id'], {
          endingId: effect.id,
        });
      }
    }

    if (effect.type === 'unlock:cg') {
      if (!isValidCgId(effect.id)) {
        addError(report, 'invalid-cg-id', `CG unlock references invalid CG id "${effect.id}".`, [...effectPath, 'id'], {
          cgId: effect.id,
        });
      }
      if (!Object.hasOwn(cgs, effect.id)) {
        addWarning(report, 'unregistered-cg-unlock', `CG unlock references unregistered CG "${effect.id}".`, [...effectPath, 'id'], {
          cgId: effect.id,
        });
      }
    }

    if (!VARIABLE_EFFECT_TYPES.has(effect.type) && !UNLOCK_EFFECT_TYPES.has(effect.type)) {
      addError(report, 'unsupported-effect', `Unsupported effect type "${effect.type}".`, [...effectPath, 'type']);
    }
  });
}

function validateConditionComparisonAnalysis(page, registry, pagePath, report) {
  for (const finding of analyzeConditionPage(page, { registry })) {
    const { conditionIndex, code, message, ...details } = finding;
    const path = conditionIndex === undefined
      ? pagePath
      : [...pagePath, 'conditions', conditionIndex];
    addWarning(report, code, message, path, details);
  }
}

function validateNormalPage(page, context, report, options) {
  validatePageMedia(page, context, report, options);
  validateEffects(page, {
    ...context,
    path: ['scenes', context.sceneId, 'pages', context.pageIndex],
  }, report);
  try {
    normalizeEffects(page).forEach((effect, effectIndex) => {
      if (effect.type !== 'unlock:ending') {
        addError(
          report,
          'unsupported-page-enter-effect',
          `Normal page entry effects only support "unlock:ending"; received "${effect.type}".`,
          ['scenes', context.sceneId, 'pages', context.pageIndex, 'effects', effectIndex, 'type'],
          { effectType: effect.type },
        );
      }
    });
  } catch {
    // validateEffects reports malformed effect entries.
  }

  if (!Array.isArray(page.dialogues)) {
    addWarning(report, 'missing-normal-dialogues', 'Normal page has no dialogues array.', ['scenes', context.sceneId, 'pages', context.pageIndex, 'dialogues']);
    return;
  }

  if (page.dialogues.length === 0 && (!Array.isArray(page.characters) || page.characters.length === 0) && !page.background) {
    addWarning(report, 'empty-normal-page', 'Normal page has no background, characters, or dialogues.', ['scenes', context.sceneId, 'pages', context.pageIndex]);
  }

  page.dialogues.forEach((dialogue, dialogueIndex) => {
    validateDialogue(dialogue, { ...context, dialogueIndex }, report, options);
  });
}

function validateChoicePage(page, context, report, options) {
  const { sceneIds, sceneId, pageIndex } = context;
  validatePageMedia(page, context, report, options);

  if (!Array.isArray(page.options)) {
    addError(report, 'invalid-choice-options', 'Choice page options must be an array.', ['scenes', sceneId, 'pages', pageIndex, 'options']);
    return;
  }

  if (page.options.length === 0) {
    addWarning(report, 'empty-choice-options', 'Choice page has no options.', ['scenes', sceneId, 'pages', pageIndex, 'options']);
  }

  page.options.forEach((option, optionIndex) => {
    const optionPath = ['scenes', sceneId, 'pages', pageIndex, 'options', optionIndex];
    if (!isPlainObject(option)) {
      addError(report, 'invalid-choice-option', 'Choice option must be an object.', optionPath);
      return;
    }

    if (!isNonEmptyString(option.text)) {
      addWarning(report, 'empty-choice-option-text', 'Choice option text is empty.', [...optionPath, 'text']);
    } else if (option.text.length > options.longDialogueLimit) {
      addWarning(report, 'long-choice-option-text', `Choice option text is longer than ${options.longDialogueLimit} characters.`, [...optionPath, 'text'], {
        length: option.text.length,
        limit: options.longDialogueLimit,
      });
    }

    validateSceneTarget(report, sceneIds, option.target, [...optionPath, 'target']);
    validateEffects(option, {
      ...context,
      path: optionPath,
    }, report);
  });
}

function validateInputPage(page, context, report, options) {
  const { registry, sceneIds, sceneId, pageIndex } = context;
  const pagePath = ['scenes', sceneId, 'pages', pageIndex];
  validatePageMedia(page, context, report, options);

  if (!isNonEmptyString(page.variableId)) {
    addError(report, 'missing-input-variable', 'Input page requires a variableId.', [...pagePath, 'variableId']);
  } else if (!isValidVariableId(page.variableId)) {
    addError(report, 'invalid-variable-id', `Input page references invalid variable id "${page.variableId}".`, [...pagePath, 'variableId'], {
      variableId: page.variableId,
    });
  } else if (!registry[page.variableId]) {
    addError(report, 'missing-variable-reference', `Input page references missing variable "${page.variableId}".`, [...pagePath, 'variableId'], {
      variableId: page.variableId,
    });
  } else if (registry[page.variableId].type !== 'string') {
    addError(report, 'input-variable-not-string', `Input page variable "${page.variableId}" must be a text variable.`, [...pagePath, 'variableId'], {
      variableId: page.variableId,
      variableType: registry[page.variableId].type,
    });
  }

  if (page.prompt !== undefined && typeof page.prompt !== 'string') {
    addError(report, 'invalid-input-prompt', 'Input page prompt must be a string.', [...pagePath, 'prompt']);
  }

  if (page.maxLength !== undefined) {
    const maxLength = Number(page.maxLength);
    if (!Number.isInteger(maxLength) || maxLength < 1 || maxLength > 80) {
      addWarning(report, 'input-max-length-range', 'Input page maxLength should be an integer from 1 to 80.', [...pagePath, 'maxLength'], {
        maxLength: page.maxLength,
      });
    }
  }

  validateSceneTarget(report, sceneIds, page.target, [...pagePath, 'target']);
}

function validateTemplateField(text, path, context, report) {
  for (const variableId of collectTextTemplateVariableIds(text)) {
    if (!Object.hasOwn(context.registry, variableId)) {
      addWarning(report, 'missing-template-variable', `Text template references missing variable "${variableId}".`, path, {
        variableId,
      });
    }
  }
}

function validateConditionPage(page, context, report, options) {
  const { registry, sceneIds, sceneId, pageIndex } = context;
  const pagePath = ['scenes', sceneId, 'pages', pageIndex];
  const rawRows = getConditionInputRows(page);
  const normalized = normalizeConditionPage(page, { registry });
  validatePageMedia(page, context, report, options);

  if (!normalized.conditions.length) {
    addWarning(report, 'empty-condition-page', 'Condition page has no condition rows.', [...pagePath, 'conditions']);
  }

  if (normalized.conditions.length > 0 && !normalized.trueTarget && !normalized.falseTarget) {
    addWarning(report, 'condition-missing-targets', 'Condition page has no true or false target; both branches will continue to the next page.', pagePath);
  }

  normalized.conditions.forEach((condition, conditionIndex) => {
    const conditionPath = [...pagePath, 'conditions', conditionIndex];
    const rawCondition = isPlainObject(rawRows[conditionIndex]) ? rawRows[conditionIndex] : {};
    const rawOperator = rawCondition.operator ?? condition.operator;
    const rawValue = rawCondition.value;
    if (!condition.variableId) {
      addError(report, 'missing-condition-variable', 'Condition row requires a variable id.', [...conditionPath, 'variableId']);
      return;
    }

    if (!isValidVariableId(condition.variableId)) {
      addError(report, 'invalid-variable-id', `Condition references invalid variable id "${condition.variableId}".`, [...conditionPath, 'variableId'], {
        variableId: condition.variableId,
      });
      return;
    }

    if (!Object.hasOwn(registry, condition.variableId)) {
      addWarning(report, 'unregistered-condition-variable', `Condition references unregistered variable "${condition.variableId}".`, [...conditionPath, 'variableId'], {
        variableId: condition.variableId,
      });
      return;
    }

    const entry = registry[condition.variableId];
    if (entry.type === 'bool' && !BOOL_CONDITION_OPERATORS.includes(rawOperator)) {
      addWarning(report, 'variable-type-mismatch', `Boolean condition "${condition.variableId}" only supports == or !=.`, [...conditionPath, 'operator'], {
        variableId: condition.variableId,
        expectedType: 'bool',
        operator: rawOperator,
      });
    } else if (entry.type === 'bool' && !isBooleanConditionValue(rawValue)) {
      addWarning(report, 'variable-type-mismatch', `Boolean condition "${condition.variableId}" should compare against a boolean-compatible value.`, [...conditionPath, 'value'], {
        variableId: condition.variableId,
        expectedType: 'bool',
        actualValue: rawValue,
      });
    } else if (entry.type === 'number' && !isNumberConditionValue(rawValue)) {
      addWarning(report, 'variable-type-mismatch', `Number condition "${condition.variableId}" should compare against a numeric value.`, [...conditionPath, 'value'], {
        variableId: condition.variableId,
        expectedType: 'number',
        actualValue: rawValue,
      });
    } else if (entry.type === 'string') {
      addWarning(report, 'variable-type-mismatch', `Text variable "${condition.variableId}" is not supported in condition pages yet.`, [...conditionPath, 'variableId'], {
        variableId: condition.variableId,
        expectedType: 'bool-or-number',
        actualType: 'string',
      });
    }
  });

  validateConditionComparisonAnalysis(page, registry, pagePath, report);
  validateSceneTarget(report, sceneIds, normalized.trueTarget, [...pagePath, 'trueTarget']);
  validateSceneTarget(report, sceneIds, normalized.falseTarget, [...pagePath, 'falseTarget']);
}

function validateVideoPage(page, context, report) {
  const { sceneIds, sceneId, pageIndex, videoRegistry, assetSet } = context;
  const pagePath = ['scenes', sceneId, 'pages', pageIndex];
  let resolvedVideoReference = null;

  if (page.video === undefined) {
    addError(report, 'missing-video-page-video', 'Video page requires a video reference.', [...pagePath, 'video']);
  } else {
    resolvedVideoReference = validateVideoReference(page.video, {
      assetSet,
      path: [...pagePath, 'video'],
      reason: 'page',
      videoRegistry,
    }, report);
  }

  validateSceneTarget(report, sceneIds, page.target, [...pagePath, 'target']);

  if (page.autoAdvance !== undefined && typeof page.autoAdvance !== 'boolean') {
    addError(report, 'invalid-video-auto-advance', 'Video page autoAdvance must be a boolean.', [...pagePath, 'autoAdvance'], {
      value: page.autoAdvance,
    });
  }

  if (page.loop !== undefined && typeof page.loop !== 'boolean') {
    addError(report, 'invalid-video-loop', 'Video page loop must be a boolean.', [...pagePath, 'loop'], {
      value: page.loop,
    });
  }

  const effectiveLoop = page.loop ?? (isPlainObject(page.video) ? page.video.loop : undefined);
  const effectiveSkippable = isPlainObject(page.video) && page.video.skippable !== undefined
    ? page.video.skippable
    : resolvedVideoReference?.registryEntry?.skippable;

  if (effectiveLoop === true && page.autoAdvance === true) {
    addError(report, 'video-loop-auto-advance-conflict', 'Video page cannot combine loop: true with autoAdvance: true.', pagePath);
  }

  if (effectiveLoop === true && effectiveSkippable === false) {
    addError(report, 'video-loop-unskippable-conflict', 'Looping video pages must remain skippable so playback can continue.', pagePath);
  }

  validateEffects(page, {
    ...context,
    path: pagePath,
  }, report);
}

function validatePageMedia(page, context, report, options) {
  const pagePath = ['scenes', context.sceneId, 'pages', context.pageIndex];
  validateAssetReference(report, options.assetSet, page.background, [...pagePath, 'background'], 'background');
  validateAssetReference(report, options.assetSet, page.bgm?.file ?? page.bgm, [...pagePath, 'bgm'], 'bgm');
  validateAssetReference(report, options.assetSet, page.se?.file ?? page.se, [...pagePath, 'se'], 'se');
}

function validatePageCinematics(page, context, report) {
  const pagePath = ['scenes', context.sceneId, 'pages', context.pageIndex];

  if (page.camera?.effect && !isKnownCameraEffect(page.camera.effect)) {
    addWarning(report, 'unknown-camera-effect', `Camera effect "${page.camera.effect}" is not runtime-supported and will be ignored.`, [...pagePath, 'camera', 'effect'], {
      effect: page.camera.effect,
    });
  }

  if (
    page.camera?.durationMs !== undefined
    && !isValidNumericTransitionParam(page.camera.durationMs, CAMERA_EFFECT_DURATION_SCHEMA)
  ) {
    addWarning(report, 'invalid-transition-param', 'Camera durationMs must be between 0 and 2000 milliseconds and will be clamped at runtime.', [...pagePath, 'camera', 'durationMs'], {
      target: 'camera',
      param: 'durationMs',
      value: page.camera.durationMs,
      minimum: CAMERA_EFFECT_DURATION_SCHEMA.minimum,
      maximum: CAMERA_EFFECT_DURATION_SCHEMA.maximum,
    });
  }

  if (
    page.camera?.intensity !== undefined
    && !['low', 'medium', 'high'].includes(page.camera.intensity)
  ) {
    addWarning(report, 'invalid-transition-param', 'Camera intensity must be low, medium, or high and will fall back to medium at runtime.', [...pagePath, 'camera', 'intensity'], {
      target: 'camera',
      param: 'intensity',
      value: page.camera.intensity,
    });
  }

  const cameraDirections = CAMERA_EFFECT_DIRECTION_OPTIONS[page.camera?.effect];
  if (
    Array.isArray(cameraDirections)
    && page.camera?.direction !== undefined
    && !cameraDirections.includes(page.camera.direction)
  ) {
    addWarning(report, 'invalid-transition-param', `Camera direction "${page.camera.direction}" is not valid for "${page.camera.effect}".`, [...pagePath, 'camera', 'direction'], {
      target: 'camera',
      param: 'direction',
      value: page.camera.direction,
      effect: page.camera.effect,
    });
  }
  if (cameraDirections === null && page.camera?.direction != null) {
    addWarning(report, 'invalid-transition-param', `Camera effect "${page.camera.effect}" does not accept a direction parameter.`, [...pagePath, 'camera', 'direction'], {
      target: 'camera',
      param: 'direction',
      value: page.camera.direction,
      effect: page.camera.effect,
    });
  }

  if (page.transition?.type && !isKnownTransitionType(page.transition.type)) {
    const fallbackId = getRuntimeTransitionType(page.transition.type);
    addWarning(report, 'unknown-transition-type', `Transition "${page.transition.type}" is not runtime-supported and will fall back to ${fallbackId}.`, [...pagePath, 'transition', 'type'], {
      transitionType: page.transition.type,
      fallbackId,
    });
  }

  if (
    page.transition?.duration !== undefined
    && !isValidNumericTransitionParam(page.transition.duration, BACKGROUND_TRANSITION_DURATION_SCHEMA)
  ) {
    addWarning(report, 'invalid-transition-param', 'Background transition duration must be between 0 and 5000 milliseconds and will be clamped at runtime.', [...pagePath, 'transition', 'duration'], {
      target: 'background',
      param: 'duration',
      value: page.transition.duration,
      minimum: BACKGROUND_TRANSITION_DURATION_SCHEMA.minimum,
      maximum: BACKGROUND_TRANSITION_DURATION_SCHEMA.maximum,
    });
  }

  for (const [characterIndex, entry] of (page.characters ?? []).entries()) {
    if (entry?.animation && !isKnownCharacterAnimation(entry.animation)) {
      addWarning(report, 'unknown-character-animation', `Character animation "${entry.animation}" is not runtime-supported and will be ignored.`, [...pagePath, 'characters', characterIndex, 'animation'], {
        characterId: entry.id,
        animation: entry.animation,
      });
    }
  }
}

function validateBranchFlow(script, endings, cgs, report, options, graphReport) {
  if (options.checkReachability === false) {
    return;
  }

  for (const sceneId of graphReport.unreachableSceneIds) {
    addWarning(report, 'unreachable-scene', `Scene "${sceneId}" is not reachable from entry scene "${graphReport.entrySceneId}".`, ['scenes', sceneId], {
      sceneId,
      entrySceneId: graphReport.entrySceneId,
    });
  }

  if (Object.keys(endings).length > 0) {
    for (const sceneId of graphReport.deadEndSceneIds) {
      addWarning(report, 'dead-end-scene', `Reachable scene "${sceneId}" has no outgoing route or ending unlock.`, ['scenes', sceneId], {
        sceneId,
        entrySceneId: graphReport.entrySceneId,
      });
    }

    for (const cycle of graphReport.cyclesWithoutExit) {
      const sceneId = cycle.sceneIds[0];
      addWarning(report, 'cycle-without-exit', `Reachable cycle "${cycle.sceneIds.join(' -> ')}" has no route exit or ending unlock.`, ['scenes', sceneId], {
        sceneId,
        sceneIds: cycle.sceneIds,
        entrySceneId: graphReport.entrySceneId,
      });
    }
  }

  for (const endingId of graphReport.endings.unreachableUnlockIds) {
    if (endings[endingId]) {
      addWarning(report, 'ending-unlock-unreachable', `Ending "${endingId}" is only unlocked from unreachable scenes.`, ['systems', 'endings', endingId], {
        endingId,
        entrySceneId: graphReport.entrySceneId,
      });
    }
  }

  for (const cgId of graphReport.cgs.unreachableUnlockIds) {
    if (cgs[cgId]) {
      addWarning(report, 'cg-unlock-unreachable', `CG "${cgId}" is only unlocked from unreachable scenes.`, ['systems', 'gallery', 'cg', cgId], {
        cgId,
        entrySceneId: graphReport.entrySceneId,
      });
    }
  }
}

function validateEndingProgression(script, endings, report, options, graphReport) {
  const endingIds = Object.keys(endings);
  if (endingIds.length === 0) {
    return;
  }

  const references = collectEndingUnlockReferences(script);
  const referencesByEnding = new Map();
  for (const reference of references) {
    if (!referencesByEnding.has(reference.endingId)) {
      referencesByEnding.set(reference.endingId, []);
    }
    referencesByEnding.get(reference.endingId).push(reference);
  }

  for (const endingId of endingIds) {
    const ending = endings[endingId] ?? {};
    if (!referencesByEnding.has(endingId)) {
      addWarning(report, 'ending-never-unlocked', `Ending "${endingId}" is registered but never unlocked by a page or choice effect.`, ['systems', 'endings', endingId], {
        endingId,
      });
    }

    if (ending.hiddenUntilUnlocked && !ending.thumbnail) {
      addWarning(report, 'missing-ending-thumbnail', `Hidden ending "${endingId}" should define a thumbnail for the ending list.`, ['systems', 'endings', endingId, 'thumbnail'], {
        endingId,
      });
    }
  }

  if (options.checkReachability === false) {
    return;
  }

  const reachableSceneIds = new Set(graphReport.reachableSceneIds);
  const hasReachableEndingUnlock = references.some((reference) => (
    endings[reference.endingId] && reachableSceneIds.has(reference.sceneId)
  ));

  if (!hasReachableEndingUnlock) {
    addWarning(report, 'no-reachable-ending', 'No registered ending unlock is reachable from the entry scene.', ['systems', 'endings'], {
      entrySceneId: graphReport.entrySceneId,
    });
  }
}

function validateCgProgression(script, cgs, report) {
  const cgIds = Object.keys(cgs);
  if (cgIds.length === 0) {
    return;
  }

  const unlockedIds = new Set(
    collectCgUnlockReferences(script).map((reference) => reference.cgId),
  );

  for (const cgId of cgIds) {
    if (!unlockedIds.has(cgId)) {
      addWarning(report, 'cg-never-unlocked', `CG "${cgId}" is registered but never unlocked by a choice effect.`, ['systems', 'gallery', 'cg', cgId], {
        cgId,
      });
    }
  }
}

function validatePageParticles(page, context, report) {
  if (!Object.hasOwn(page, 'particles') || page.particles === undefined) {
    return;
  }

  const pagePath = ['scenes', context.sceneId, 'pages', context.pageIndex];
  if (page.type === 'condition') {
    addWarning(report, 'condition-page-particles', 'Condition pages do not render or inherit particle state; remove this hidden particles field.', [...pagePath, 'particles'], {
      pageType: page.type,
    });
    return;
  }

  const value = page.particles;
  if (value === null || value === false) {
    return;
  }

  if (!isPlainObject(value)) {
    addWarning(report, 'invalid-particle-config', 'Page particles must be an object, null, false, or omitted; runtime will clear invalid values.', [...pagePath, 'particles'], {
      valueType: Array.isArray(value) ? 'array' : typeof value,
    });
    return;
  }

  if (!isKnownParticlePreset(value.preset)) {
    addWarning(report, 'unknown-particle-preset', `Particle preset "${value.preset}" is not runtime-supported and will fall back to dust.`, [...pagePath, 'particles', 'preset'], {
      preset: value.preset ?? null,
    });
  }

  for (const [field, code] of [
    ['density', 'invalid-particle-density'],
    ['speed', 'invalid-particle-speed'],
    ['wind', 'invalid-particle-wind'],
  ]) {
    const schema = PARTICLE_FIELD_SCHEMA[field];
    const raw = value[field];
    if (raw === undefined) {
      continue;
    }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < schema.minimum || numeric > schema.maximum) {
      addWarning(report, code, `Particle ${field} must be a number between ${schema.minimum} and ${schema.maximum}; runtime will clamp it.`, [...pagePath, 'particles', field], {
        value: raw,
        minimum: schema.minimum,
        maximum: schema.maximum,
      });
    }
  }

  if (value.color !== undefined && !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(value.color))) {
    addWarning(report, 'invalid-particle-color', 'Particle color must be #rgb or #rrggbb; runtime will fall back to the preset color.', [...pagePath, 'particles', 'color'], {
      value: value.color,
    });
  }
}

function validatePageEffectPacks(page, context, report) {
  if (!Object.hasOwn(page, 'effectPacks') || page.effectPacks === undefined) {
    return;
  }

  const pagePath = ['scenes', context.sceneId, 'pages', context.pageIndex];
  if (page.type === 'condition') {
    addWarning(report, 'condition-page-effect-packs', 'Condition pages do not render effect packs; remove this hidden effectPacks field.', [...pagePath, 'effectPacks'], {
      pageType: page.type,
    });
    return;
  }

  if (!Array.isArray(page.effectPacks)) {
    addWarning(report, 'invalid-page-effect-packs', 'Page effectPacks must be an array; runtime will ignore invalid values.', [...pagePath, 'effectPacks'], {
      valueType: typeof page.effectPacks,
    });
    return;
  }

  const manifests = context.effectPackManifests ?? {};
  for (const [effectIndex, entry] of page.effectPacks.entries()) {
    const entryPath = [...pagePath, 'effectPacks', effectIndex];
    if (!isPlainObject(entry)) {
      addWarning(report, 'invalid-page-effect-pack-entry', 'Effect pack references must be objects with id and params.', entryPath, {
        valueType: typeof entry,
      });
      continue;
    }

    if (!isValidEffectPackId(entry.id)) {
      addWarning(report, 'invalid-page-effect-pack-id', 'Effect pack reference id must be a stable identifier.', [...entryPath, 'id'], {
        effectPackId: entry.id ?? null,
      });
      continue;
    }

    const manifest = manifests[entry.id];
    if (!manifest) {
      addWarning(report, 'effect-pack-reference-missing', `Effect pack "${entry.id}" is not declared in assets.effectPacks.`, [...entryPath, 'id'], {
        effectPackId: entry.id,
      });
      continue;
    }

    const adapterSupported = isKnownEffectPackAdapter(manifest.adapter);
    if (!adapterSupported) {
      addWarning(report, 'unsupported-effect-pack-adapter', `Effect pack "${entry.id}" uses unsupported adapter "${manifest.adapter}" and will not run.`, [...entryPath, 'id'], {
        effectPackId: entry.id,
        adapter: manifest.adapter,
      });
    }

    if (entry.params !== undefined && !isPlainObject(entry.params)) {
      addWarning(report, 'invalid-effect-pack-params', 'Effect pack params must be an object; runtime will use defaults.', [...entryPath, 'params'], {
        effectPackId: entry.id,
      });
    }

    if (adapterSupported && !context.checkedEffectPackAssets?.has(entry.id)) {
      context.checkedEffectPackAssets?.add(entry.id);
      for (const [fileIndex, file] of (manifest.files ?? []).entries()) {
        validateAssetReference(report, context.assetSet, file.path, ['assets', 'effectPacks', entry.id, 'files', fileIndex, 'path'], 'effect-pack');
      }
    }
  }
}

function validatePage(page, context, report, options) {
  const { sceneId, pageIndex } = context;
  const pagePath = ['scenes', sceneId, 'pages', pageIndex];

  if (!isPlainObject(page)) {
    addError(report, 'invalid-page', 'Page must be an object.', pagePath);
    return;
  }

  if (!KNOWN_PAGE_TYPES.has(page.type)) {
    addError(report, 'unknown-page-type', `Unknown page type "${page.type}".`, [...pagePath, 'type'], {
      pageType: page.type,
    });
    return;
  }

  validatePageCharacters(page, context, report);
  validatePageCinematics(page, context, report);
  validatePageParticles(page, context, report);
  validatePageEffectPacks(page, context, report);
  if (page.type === 'normal') {
    (Array.isArray(page.dialogues) ? page.dialogues : []).forEach((dialogue, dialogueIndex) => {
      validateTemplateField(dialogue?.speaker, [...pagePath, 'dialogues', dialogueIndex, 'speaker'], context, report);
      validateTemplateField(dialogue?.text, [...pagePath, 'dialogues', dialogueIndex, 'text'], context, report);
    });
  } else if (page.type === 'choice') {
    validateTemplateField(page.prompt, [...pagePath, 'prompt'], context, report);
    (Array.isArray(page.options) ? page.options : []).forEach((option, optionIndex) => {
      validateTemplateField(option?.text, [...pagePath, 'options', optionIndex, 'text'], context, report);
    });
  } else if (page.type === 'input') {
    for (const field of ['prompt', 'placeholder', 'defaultValue', 'submitText']) {
      validateTemplateField(page[field], [...pagePath, field], context, report);
    }
  }

  if (page.type === 'normal') {
    validateNormalPage(page, context, report, options);
  } else if (page.type === 'choice') {
    validateChoicePage(page, context, report, options);
  } else if (page.type === 'input') {
    validateInputPage(page, context, report, options);
  } else if (page.type === 'condition') {
    validateConditionPage(page, context, report, options);
  } else if (page.type === 'video') {
    validateVideoPage(page, context, report);
  }
}

function validateScenes(script, context, report, options) {
  const scenes = isPlainObject(script?.scenes) ? script.scenes : {};
  if (Object.keys(scenes).length === 0) {
    addWarning(report, 'empty-scenes', 'Project has no scenes.', ['scenes']);
  }

  for (const [sceneId, scene] of Object.entries(scenes)) {
    const scenePath = ['scenes', sceneId];

    if (!isNonEmptyString(sceneId)) {
      addError(report, 'invalid-scene-id', 'Scene id must be a non-empty string.', scenePath);
    }

    if (!isPlainObject(scene)) {
      addError(report, 'invalid-scene', 'Scene must be an object.', scenePath);
      continue;
    }

    validateSceneTarget(report, context.sceneIds, scene.next, [...scenePath, 'next']);

    if (!Array.isArray(scene.pages)) {
      addError(report, 'invalid-scene-pages', 'Scene pages must be an array.', [...scenePath, 'pages']);
      continue;
    }

    if (scene.pages.length === 0) {
      addWarning(report, 'empty-scene-pages', 'Scene has no pages.', [...scenePath, 'pages']);
    }

    scene.pages.forEach((page, pageIndex) => {
      validatePage(page, {
        ...context,
        sceneId,
        pageIndex,
      }, report, options);
    });
  }
}

function validateUiMotion(script, report) {
  const motion = script?.ui?.motion;
  if (motion === undefined) {
    return;
  }

  if (!isPlainObject(motion)) {
    addWarning(report, 'invalid-ui-motion-config', 'ui.motion must be an object; runtime will use default motion presets.', ['ui', 'motion'], {
      valueType: Array.isArray(motion) ? 'array' : typeof motion,
    });
    return;
  }

  if (motion.intensity !== undefined && !isKnownUiMotionIntensity(motion.intensity)) {
    addWarning(report, 'invalid-ui-motion-intensity', `UI motion intensity "${motion.intensity}" is not supported and will fall back to ${UI_MOTION_FIELD_SCHEMA.intensity.default}.`, ['ui', 'motion', 'intensity'], {
      value: motion.intensity,
      allowedValues: UI_MOTION_FIELD_SCHEMA.intensity.options,
    });
  }

  for (const field of ['title', 'dialogue', 'choices', 'menus']) {
    if (motion[field] !== undefined && !isKnownUiMotionPreset(field, motion[field])) {
      addWarning(report, 'invalid-ui-motion-preset', `UI motion ${field} preset "${motion[field]}" is not supported and will fall back to ${UI_MOTION_FIELD_SCHEMA[field].default}.`, ['ui', 'motion', field], {
        field,
        value: motion[field],
        allowedValues: UI_MOTION_FIELD_SCHEMA[field].options,
      });
    }
  }
}

function validateUiStylePresetField(script, report) {
  const stylePreset = script?.ui?.stylePreset;
  if (stylePreset === undefined) {
    return;
  }

  const value = typeof stylePreset === 'string'
    ? stylePreset
    : stylePreset?.id ?? stylePreset?.presetId;
  addWarning(report, 'noncanonical-ui-style-preset-field', 'ui.stylePreset is not canonical project data; apply a preset through apply-ui-style-preset so normal editable UI sections are written instead.', ['ui', 'stylePreset'], {
    value: stylePreset,
    knownPreset: typeof value === 'string' ? isKnownUiStylePreset(value) : false,
  });
}

function validateSettingsScreen(script, report) {
  const settings = script?.ui?.settingsScreen;
  if (settings === undefined) return;
  if (!isPlainObject(settings)) {
    addWarning(report, 'invalid-settings-screen-config', 'ui.settingsScreen must be an object.', ['ui', 'settingsScreen']);
    return;
  }

  const enabled = settings.tabBar?.enabled;
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    addWarning(report, 'invalid-settings-tab-mode', 'ui.settingsScreen.tabBar.enabled must be a boolean.', ['ui', 'settingsScreen', 'tabBar', 'enabled'], {
      value: enabled,
    });
  }

  for (const [index, element] of (Array.isArray(settings.elements) ? settings.elements : []).entries()) {
    if (element?.type === 'button' && element.action !== undefined && !isKnownSettingsCustomButtonAction(element.action)) {
      addWarning(report, 'invalid-settings-button-action', `Custom settings button action "${element.action}" is not supported.`, ['ui', 'settingsScreen', 'elements', index, 'action'], {
        value: element.action,
        allowedValues: ['close', 'reset'],
      });
    }
  }

  for (const [index, button] of (Array.isArray(settings.footer?.buttons) ? settings.footer.buttons : []).entries()) {
    if (button?.action !== undefined && !isKnownSettingsFooterButtonAction(button.action)) {
      addWarning(report, 'invalid-settings-footer-action', `Settings footer action "${button.action}" is not supported.`, ['ui', 'settingsScreen', 'footer', 'buttons', index, 'action'], {
        value: button.action,
        allowedValues: ['close', 'title', 'reset'],
      });
    }
  }
}

function validateTitleScreenVideo(script, report, context) {
  const openingVideo = script?.ui?.titleScreen?.openingVideo;
  if (openingVideo === undefined) {
    return;
  }

  validateVideoReference(openingVideo, {
    assetSet: context.assetSet,
    path: ['ui', 'titleScreen', 'openingVideo'],
    playModes: OPENING_VIDEO_PLAY_MODES,
    reason: 'opening',
    videoRegistry: context.videoRegistry,
  }, report, { requirePlay: false });
}

export function validateProject(script, options = {}) {
  const report = {
    ok: true,
    errors: [],
    warnings: [],
  };

  const config = {
    longDialogueLimit: options.longDialogueLimit ?? DEFAULT_LONG_DIALOGUE_LIMIT,
    assetSet: createKnownAssetSet(options.knownAssets),
  };

  if (!validateTopLevel(script, report)) {
    report.ok = false;
    return report;
  }

  validateCharacterRegistry(script, report);
  validateCharacterAssets(script, report, config.assetSet);
  const effectPackManifests = validateEffectPackRegistry(script, report);
  const videoRegistry = validateVideoRegistry(script, report, config.assetSet);
  validateUiMotion(script, report);
  validateUiStylePresetField(script, report);
  validateSettingsScreen(script, report);
  for (const diagnostic of validateUiProjectContract(script, { capabilities: options.uiCapabilities })) {
    if (diagnostic.severity === PROJECT_VALIDATION_SEVERITIES.WARNING) {
      report.warnings.push(diagnostic);
    } else {
      report.errors.push(diagnostic);
    }
  }

  const registry = normalizeVariableRegistry(script?.systems?.variables);
  const endings = normalizeEndingRegistry(script?.systems?.endings);
  const cgs = normalizeCgRegistry(script?.systems?.gallery?.cg);
  validateVariableRegistry(script, registry, report);
  validateEndingRegistry(script, endings, report, config.assetSet, videoRegistry);
  validateCgRegistry(script, cgs, report, config.assetSet);
  const context = {
    script,
    sceneIds: getSceneIds(script),
    registry,
    endings,
    cgs,
    videoRegistry,
    effectPackManifests,
    assetSet: config.assetSet,
    checkedEffectPackAssets: new Set(),
  };

  validateTitleScreenVideo(script, report, context);
  validateScenes(script, context, report, config);
  const graphReport = options.checkReachability === false
    ? null
    : createBranchGraphReport(script, { entrySceneId: options.entrySceneId });
  validateBranchFlow(script, endings, cgs, report, {
    checkReachability: options.checkReachability,
    entrySceneId: options.entrySceneId,
  }, graphReport);
  validateEndingProgression(script, endings, report, {
    checkReachability: options.checkReachability,
    entrySceneId: options.entrySceneId,
  }, graphReport);
  validateCgProgression(script, cgs, report);

  report.ok = report.errors.length === 0;
  return report;
}
