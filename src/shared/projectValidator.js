import { normalizeConditionPage } from './branchingContract.js';
import {
  isKnownCameraEffect,
  isKnownCharacterAnimation,
  isKnownTransitionType,
} from './cinematicContract.js';
import { normalizeEffects } from './effectDsl.js';
import { traceReachableScenes } from './sceneGraph.js';
import { normalizeVariableRegistry } from './variableRegistry.js';

export const PROJECT_VALIDATION_SEVERITIES = Object.freeze({
  ERROR: 'error',
  WARNING: 'warning',
});

const KNOWN_PAGE_TYPES = new Set(['normal', 'choice', 'condition']);
const VARIABLE_EFFECT_TYPES = new Set(['var:set', 'var:add', 'var:sub']);
const UNLOCK_EFFECT_TYPES = new Set(['unlock:ending', 'unlock:cg']);
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

    if (VARIABLE_EFFECT_TYPES.has(effect.type) && !registry[effect.id]) {
      addWarning(report, 'unregistered-variable-effect', `Variable effect references unregistered variable "${effect.id}".`, [...effectPath, 'id'], {
        variableId: effect.id,
      });
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

function validateNormalPage(page, context, report, options) {
  validatePageMedia(page, context, report, options);

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
  const normalized = normalizeConditionPage(page, { registry });
  validatePageMedia(page, context, report, options);

  if (!normalized.conditions.length) {
    addWarning(report, 'empty-condition-page', 'Condition page has no condition rows.', [...pagePath, 'conditions']);
  }

  normalized.conditions.forEach((condition, conditionIndex) => {
    const conditionPath = [...pagePath, 'conditions', conditionIndex];
    if (!condition.variableId) {
      addError(report, 'missing-condition-variable', 'Condition row requires a variable id.', [...conditionPath, 'variableId']);
      return;
    }

    if (!registry[condition.variableId]) {
      addWarning(report, 'unregistered-condition-variable', `Condition references unregistered variable "${condition.variableId}".`, [...conditionPath, 'variableId'], {
        variableId: condition.variableId,
      });
    }
  });

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

  if (page.transition?.type && !isKnownTransitionType(page.transition.type)) {
    addWarning(report, 'unknown-transition-type', `Transition "${page.transition.type}" is not runtime-supported and will fall back to fade.`, [...pagePath, 'transition', 'type'], {
      transitionType: page.transition.type,
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

function validateSceneReachability(script, report, options) {
  if (options.checkReachability === false) {
    return;
  }

  const scenes = isPlainObject(script?.scenes) ? script.scenes : {};
  const sceneIds = Object.keys(scenes);
  if (sceneIds.length <= 1) {
    return;
  }

  const graphReport = traceReachableScenes(script, { entrySceneId: options.entrySceneId });
  for (const sceneId of graphReport.unreachableSceneIds) {
    addWarning(report, 'unreachable-scene', `Scene "${sceneId}" is not reachable from entry scene "${graphReport.entrySceneId}".`, ['scenes', sceneId], {
      sceneId,
      entrySceneId: graphReport.entrySceneId,
    });
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
  const context = {
    script,
    sceneIds: getSceneIds(script),
    registry,
    endings: isPlainObject(script?.systems?.endings) ? script.systems.endings : {},
    cgs: isPlainObject(script?.systems?.gallery?.cg) ? script.systems.gallery.cg : {},
  };

  validateScenes(script, context, report, config);
  validateSceneReachability(script, report, {
    checkReachability: options.checkReachability,
    entrySceneId: options.entrySceneId,
  });

  report.ok = report.errors.length === 0;
  return report;
}
