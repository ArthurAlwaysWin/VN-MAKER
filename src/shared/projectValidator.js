import { normalizeConditionPage } from './branchingContract.js';
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
import { createBranchGraphReport } from './sceneGraph.js';
import {
  BACKGROUND_TRANSITION_DURATION_SCHEMA,
  CAMERA_EFFECT_DURATION_SCHEMA,
  isValidNumericTransitionParam,
} from './transitionCatalog.js';
import { isValidVariableId, normalizeVariableId, normalizeVariableRegistry } from './variableRegistry.js';

export const PROJECT_VALIDATION_SEVERITIES = Object.freeze({
  ERROR: 'error',
  WARNING: 'warning',
});

const KNOWN_PAGE_TYPES = new Set(['normal', 'choice', 'condition']);
const VARIABLE_EFFECT_TYPES = new Set(['var:set', 'var:add', 'var:sub']);
const UNLOCK_EFFECT_TYPES = new Set(['unlock:ending', 'unlock:cg']);
const BOOL_CONDITION_OPERATORS = new Set(['==', '!=']);
const DEFAULT_LONG_DIALOGUE_LIMIT = 120;

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
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

function isBooleanLike(value) {
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return value === 0 || value === 1;
  if (typeof value === 'string') {
    return ['false', 'true', '0', '1', 'yes', 'no', 'on', 'off'].includes(value.trim().toLowerCase());
  }
  return false;
}

function isNumberLike(value) {
  if (typeof value === 'boolean') return false;
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
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

function validateEndingRegistry(script, endings, report, assetSet) {
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

      const variableEntry = registry[effect.id];
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
      } else if (variableEntry.type === 'bool' && !isBooleanLike(effect.value)) {
        addWarning(report, 'variable-type-mismatch', `Boolean variable "${effect.id}" should be set to a boolean-compatible value.`, [...effectPath, 'value'], {
          variableId: effect.id,
          expectedType: 'bool',
          actualValue: effect.value,
        });
      } else if (variableEntry.type === 'number' && effect.type === 'var:set' && !isNumberLike(effect.value)) {
        addWarning(report, 'variable-type-mismatch', `Number variable "${effect.id}" should be set to a numeric value.`, [...effectPath, 'value'], {
          variableId: effect.id,
          expectedType: 'number',
          actualValue: effect.value,
        });
      }
    }

    if (effect.type === 'unlock:ending' && !endings[effect.id]) {
      addWarning(report, 'unregistered-ending-unlock', `Ending unlock references unregistered ending "${effect.id}".`, [...effectPath, 'id'], {
        endingId: effect.id,
      });
    }

    if (effect.type === 'unlock:cg' && !cgs[effect.id]) {
      addWarning(report, 'unregistered-cg-unlock', `CG unlock references unregistered CG "${effect.id}".`, [...effectPath, 'id'], {
        cgId: effect.id,
      });
    }

    if (!VARIABLE_EFFECT_TYPES.has(effect.type) && !UNLOCK_EFFECT_TYPES.has(effect.type)) {
      addError(report, 'unsupported-effect', `Unsupported effect type "${effect.type}".`, [...effectPath, 'type']);
    }
  });
}

function getRawConditionRows(page = {}) {
  if (Array.isArray(page.conditions) && page.conditions.length > 0) {
    return page.conditions;
  }

  if ('variable' in page || 'operator' in page || 'value' in page) {
    return [{
      variableId: page.variable,
      operator: page.operator,
      value: page.value,
    }];
  }

  return [];
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

function validateConditionPage(page, context, report, options) {
  const { registry, sceneIds, sceneId, pageIndex } = context;
  const pagePath = ['scenes', sceneId, 'pages', pageIndex];
  const rawRows = getRawConditionRows(page);
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

    if (!registry[condition.variableId]) {
      addWarning(report, 'unregistered-condition-variable', `Condition references unregistered variable "${condition.variableId}".`, [...conditionPath, 'variableId'], {
        variableId: condition.variableId,
      });
      return;
    }

    const entry = registry[condition.variableId];
    if (entry.type === 'bool' && !BOOL_CONDITION_OPERATORS.has(rawOperator)) {
      addWarning(report, 'variable-type-mismatch', `Boolean condition "${condition.variableId}" only supports == or !=.`, [...conditionPath, 'operator'], {
        variableId: condition.variableId,
        expectedType: 'bool',
        operator: rawOperator,
      });
    } else if (entry.type === 'bool' && !isBooleanLike(rawValue)) {
      addWarning(report, 'variable-type-mismatch', `Boolean condition "${condition.variableId}" should compare against a boolean-compatible value.`, [...conditionPath, 'value'], {
        variableId: condition.variableId,
        expectedType: 'bool',
        actualValue: rawValue,
      });
    } else if (entry.type === 'number' && !isNumberLike(rawValue)) {
      addWarning(report, 'variable-type-mismatch', `Number condition "${condition.variableId}" should compare against a numeric value.`, [...conditionPath, 'value'], {
        variableId: condition.variableId,
        expectedType: 'number',
        actualValue: rawValue,
      });
    }
  });

  validateConditionComparisonAnalysis(page, registry, pagePath, report);
  validateSceneTarget(report, sceneIds, normalized.trueTarget, [...pagePath, 'trueTarget']);
  validateSceneTarget(report, sceneIds, normalized.falseTarget, [...pagePath, 'falseTarget']);
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

function validateBranchFlow(script, endings, cgs, report, options) {
  if (options.checkReachability === false) {
    return;
  }

  const graphReport = createBranchGraphReport(script, { entrySceneId: options.entrySceneId });
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

function validateEndingProgression(script, endings, report, options) {
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

  const graphReport = createBranchGraphReport(script, { entrySceneId: options.entrySceneId });
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

  if (page.type === 'normal') {
    validateNormalPage(page, context, report, options);
  } else if (page.type === 'choice') {
    validateChoicePage(page, context, report, options);
  } else if (page.type === 'condition') {
    validateConditionPage(page, context, report, options);
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

  const registry = normalizeVariableRegistry(script?.systems?.variables);
  const endings = normalizeEndingRegistry(script?.systems?.endings);
  const cgs = normalizeCgRegistry(script?.systems?.gallery?.cg);
  validateVariableRegistry(script, registry, report);
  validateEndingRegistry(script, endings, report, config.assetSet);
  validateCgRegistry(script, cgs, report, config.assetSet);
  const context = {
    script,
    sceneIds: getSceneIds(script),
    registry,
    endings,
    cgs,
  };

  validateScenes(script, context, report, config);
  validateBranchFlow(script, endings, cgs, report, {
    checkReachability: options.checkReachability,
    entrySceneId: options.entrySceneId,
  });
  validateEndingProgression(script, endings, report, {
    checkReachability: options.checkReachability,
    entrySceneId: options.entrySceneId,
  });
  validateCgProgression(script, cgs, report);

  report.ok = report.errors.length === 0;
  return report;
}
