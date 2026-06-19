import { normalizeConditionPage } from '../shared/branchingContract.js';
import {
  getCharacterAnimationValue,
  getPageCameraContract,
  getPageTransitionContract,
} from '../shared/cinematicContract.js';
import { normalizePageParticles } from '../shared/particleContract.js';
import { normalizeUiMotion } from '../shared/uiMotionContract.js';
import {
  listEffectPackManifests,
  normalizeEffectPackReference,
  validateEffectPackManifest,
} from '../shared/effectPackContract.js';
import {
  applyUiStylePresetToScript,
  listUiStylePresets,
} from '../shared/uiStylePresetContract.js';
import { normalizeEffectContainer, normalizeEffects } from '../shared/effectDsl.js';
import {
  collectCgUnlockReferences,
  normalizeCgRegistry,
} from '../shared/cgRegistry.js';
import {
  collectEndingUnlockReferences,
  normalizeEndingRegistry,
} from '../shared/endingRegistry.js';
import { ensureGalgameContract } from '../shared/galgameContract.js';
import { validateProject } from '../shared/projectValidator.js';
import { collectSceneReferences } from '../shared/sceneGraph.js';
import {
  collectVariableReferences,
  createAffectionVariableEntry,
  createAffectionVariableId,
  normalizeVariableRegistry,
} from '../shared/variableRegistry.js';
import { normalizeVideoEntry, normalizeVideoRegistry } from '../shared/videoContract.js';
import { replaceTextTemplateVariableId } from '../shared/textTemplate.js';
import { assertStableId } from '../shared/stableId.js';
import {
  isKnownSettingsCustomButtonAction,
  isKnownSettingsFooterButtonAction,
} from '../shared/settingsScreenContract.js';

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value.trim();
}

function assertEntityId(value, label) {
  return assertStableId(value, label);
}

function createDefaultNormalPage(overrides = {}) {
  return normalizeEffectContainer({
    id: overrides.id,
    type: 'normal',
    background: overrides.background ?? '',
    characters: Array.isArray(overrides.characters) ? cloneJsonValue(overrides.characters) : [],
    bgm: overrides.bgm ?? null,
    se: overrides.se ?? null,
    dialogues: Array.isArray(overrides.dialogues) ? cloneJsonValue(overrides.dialogues) : [],
    ...cloneJsonValue(overrides),
    type: 'normal',
    transition: getPageTransitionContract(overrides.transition ?? { type: 'fade', duration: 800 }),
  });
}

function createDefaultChoicePage(overrides = {}) {
  const options = Array.isArray(overrides.options)
    ? overrides.options.map((option) => normalizeEffectContainer(option))
    : [];

  return {
    id: overrides.id,
    type: 'choice',
    background: overrides.background ?? '',
    characters: Array.isArray(overrides.characters) ? cloneJsonValue(overrides.characters) : [],
    bgm: overrides.bgm ?? null,
    se: overrides.se ?? null,
    prompt: overrides.prompt ?? '',
    options,
    ...cloneJsonValue(overrides),
    options,
    type: 'choice',
    transition: getPageTransitionContract(overrides.transition ?? { type: 'fade', duration: 800 }),
  };
}

function createDefaultInputPage(overrides = {}) {
  return {
    id: overrides.id,
    type: 'input',
    background: overrides.background ?? '',
    characters: Array.isArray(overrides.characters) ? cloneJsonValue(overrides.characters) : [],
    bgm: overrides.bgm ?? null,
    se: overrides.se ?? null,
    prompt: overrides.prompt ?? '请输入主角名字',
    variableId: overrides.variableId ?? '',
    placeholder: overrides.placeholder ?? '名字',
    defaultValue: overrides.defaultValue ?? '',
    submitText: overrides.submitText ?? '确定',
    maxLength: overrides.maxLength ?? 24,
    required: overrides.required ?? true,
    target: overrides.target ?? null,
    ...cloneJsonValue(overrides),
    type: 'input',
    transition: getPageTransitionContract(overrides.transition ?? { type: 'fade', duration: 800 }),
  };
}

function createDefaultConditionPage(overrides = {}, registry = {}) {
  return normalizeConditionPage({
    id: overrides.id,
    type: 'condition',
    conditionMode: overrides.conditionMode ?? 'all',
    conditions: Array.isArray(overrides.conditions) ? cloneJsonValue(overrides.conditions) : [],
    trueTarget: overrides.trueTarget ?? null,
    falseTarget: overrides.falseTarget ?? null,
    ...cloneJsonValue(overrides),
    type: 'condition',
  }, { registry });
}

function createDefaultVideoPage(overrides = {}) {
  return {
    id: overrides.id,
    type: 'video',
    background: overrides.background ?? '',
    characters: Array.isArray(overrides.characters) ? cloneJsonValue(overrides.characters) : [],
    bgm: overrides.bgm ?? null,
    se: overrides.se ?? null,
    video: isPlainObject(overrides.video) ? cloneJsonValue(overrides.video) : {},
    autoAdvance: overrides.autoAdvance ?? true,
    target: overrides.target ?? null,
    loop: overrides.loop ?? false,
    ...cloneJsonValue(overrides),
    type: 'video',
    transition: getPageTransitionContract(overrides.transition ?? { type: 'fade', duration: 800 }),
  };
}

function getScene(script, sceneId) {
  const id = assertEntityId(sceneId, 'sceneId');
  const scene = script.scenes?.[id];
  if (!scene) {
    throw new Error(`Scene "${id}" does not exist`);
  }

  if (!Array.isArray(scene.pages)) {
    scene.pages = [];
  }

  return scene;
}

function getPage(script, sceneId, pageIndex) {
  const scene = getScene(script, sceneId);
  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= scene.pages.length) {
    throw new Error(`Page index ${pageIndex} is out of range for scene "${sceneId}"`);
  }

  return scene.pages[pageIndex];
}

function assertPageIndexInRange(scene, sceneId, pageIndex) {
  if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= scene.pages.length) {
    throw new Error(`Page index ${pageIndex} is out of range for scene "${sceneId}"`);
  }
}

function replaceSceneReferences(script, fromSceneId, toSceneId) {
  let updatedReferenceCount = 0;
  for (const scene of Object.values(script.scenes ?? {})) {
    if (scene?.next === fromSceneId) {
      scene.next = toSceneId;
      updatedReferenceCount += 1;
    }

    for (const page of scene?.pages ?? []) {
      if (page?.type === 'choice') {
        for (const option of page.options ?? []) {
          if (option?.target === fromSceneId) {
            option.target = toSceneId;
            updatedReferenceCount += 1;
          }
        }
      }

      if (page?.type === 'condition') {
        if (page.trueTarget === fromSceneId) {
          page.trueTarget = toSceneId;
          updatedReferenceCount += 1;
        }
        if (page.falseTarget === fromSceneId) {
          page.falseTarget = toSceneId;
          updatedReferenceCount += 1;
        }
      }

      if (page?.type === 'input' && page.target === fromSceneId) {
        page.target = toSceneId;
        updatedReferenceCount += 1;
      }

      if (page?.type === 'video' && page.target === fromSceneId) {
        page.target = toSceneId;
        updatedReferenceCount += 1;
      }
    }
  }

  return updatedReferenceCount;
}

function clearSceneReferenceTargets(script, targetSceneId) {
  let clearedReferenceCount = 0;
  for (const scene of Object.values(script.scenes ?? {})) {
    if (scene?.next === targetSceneId) {
      scene.next = null;
      clearedReferenceCount += 1;
    }

    for (const page of scene?.pages ?? []) {
      if (page?.type === 'choice') {
        for (const option of page.options ?? []) {
          if (option?.target === targetSceneId) {
            option.target = null;
            clearedReferenceCount += 1;
          }
        }
      }

      if (page?.type === 'condition') {
        if (page.trueTarget === targetSceneId) {
          page.trueTarget = null;
          clearedReferenceCount += 1;
        }
        if (page.falseTarget === targetSceneId) {
          page.falseTarget = null;
          clearedReferenceCount += 1;
        }
      }

      if (page?.type === 'input' && page.target === targetSceneId) {
        page.target = null;
        clearedReferenceCount += 1;
      }

      if (page?.type === 'video' && page.target === targetSceneId) {
        page.target = null;
        clearedReferenceCount += 1;
      }
    }
  }

  return clearedReferenceCount;
}

function isVariableEffect(effect) {
  return effect?.type === 'var:set'
    || effect?.type === 'var:add'
    || effect?.type === 'var:sub';
}

function isEndingUnlockEffect(effect) {
  return effect?.type === 'unlock:ending';
}

function isCgUnlockEffect(effect) {
  return effect?.type === 'unlock:cg';
}

function rewriteTextTemplateFields(page, fromVariableId, toVariableId) {
  let rewriteCount = 0;
  const rewriteField = (target, field) => {
    if (typeof target?.[field] !== 'string') {
      return;
    }

    const next = replaceTextTemplateVariableId(target[field], fromVariableId, toVariableId);
    if (next !== target[field]) {
      target[field] = next;
      rewriteCount += 1;
    }
  };

  if (page?.type === 'normal') {
    for (const dialogue of page.dialogues ?? []) {
      rewriteField(dialogue, 'speaker');
      rewriteField(dialogue, 'text');
    }
  } else if (page?.type === 'choice') {
    rewriteField(page, 'prompt');
    for (const option of page.options ?? []) {
      rewriteField(option, 'text');
    }
  } else if (page?.type === 'input') {
    for (const field of ['prompt', 'placeholder', 'defaultValue', 'submitText']) {
      rewriteField(page, field);
    }
  }

  return rewriteCount;
}

function findVariableReferences(script, variableId) {
  return collectVariableReferences(script).filter((reference) => reference.variableId === variableId);
}

function findEndingUnlockReferences(script, endingId) {
  return collectEndingUnlockReferences(script).filter((reference) => reference.endingId === endingId);
}

function findCgUnlockReferences(script, cgId) {
  return collectCgUnlockReferences(script).filter((reference) => reference.cgId === cgId);
}

function replaceVariableReferences(script, fromVariableId, toVariableId) {
  let updatedReferenceCount = 0;
  const registry = normalizeVariableRegistry(script.systems?.variables);

  for (const scene of Object.values(script.scenes ?? {})) {
    for (const page of scene?.pages ?? []) {
      if (page?.type === 'choice') {
        page.options = (page.options ?? []).map((option) => {
          const normalizedOption = normalizeEffectContainer(option);
          if (!Array.isArray(normalizedOption.effects)) {
            return normalizedOption;
          }

          normalizedOption.effects = normalizedOption.effects.map((effect) => {
            if (!isVariableEffect(effect) || effect.id !== fromVariableId) {
              return effect;
            }

            updatedReferenceCount += 1;
            return {
              ...effect,
              id: toVariableId,
            };
          });
          return normalizedOption;
        });
      }

      if (page?.type === 'condition') {
        const normalizedPage = normalizeConditionPage(page, { registry });
        normalizedPage.conditions = normalizedPage.conditions.map((condition) => {
          if (condition.variableId !== fromVariableId) {
            return condition;
          }

          updatedReferenceCount += 1;
          return {
            ...condition,
            variableId: toVariableId,
          };
        });
        Object.assign(page, normalizedPage);
      }

      if (page?.type === 'input' && page.variableId === fromVariableId) {
        page.variableId = toVariableId;
        updatedReferenceCount += 1;
      }

      updatedReferenceCount += rewriteTextTemplateFields(page, fromVariableId, toVariableId);
    }
  }

  return updatedReferenceCount;
}

function removeVariableReferences(script, variableId) {
  let deletedReferenceCount = 0;
  const registry = normalizeVariableRegistry(script.systems?.variables);

  for (const scene of Object.values(script.scenes ?? {})) {
    for (const page of scene?.pages ?? []) {
      if (page?.type === 'choice') {
        page.options = (page.options ?? []).map((option) => {
          const normalizedOption = normalizeEffectContainer(option);
          const effects = (normalizedOption.effects ?? []).filter((effect) => {
            const shouldKeep = !isVariableEffect(effect) || effect.id !== variableId;
            if (!shouldKeep) {
              deletedReferenceCount += 1;
            }
            return shouldKeep;
          });

          if (effects.length > 0) {
            normalizedOption.effects = effects;
          } else {
            delete normalizedOption.effects;
          }
          return normalizedOption;
        });
      }

      if (page?.type === 'condition') {
        const normalizedPage = normalizeConditionPage(page, { registry });
        normalizedPage.conditions = normalizedPage.conditions.filter((condition) => {
          const shouldKeep = condition.variableId !== variableId;
          if (!shouldKeep) {
            deletedReferenceCount += 1;
          }
          return shouldKeep;
        });
        Object.assign(page, normalizedPage);
      }

      if (page?.type === 'input' && page.variableId === variableId) {
        page.variableId = '';
        deletedReferenceCount += 1;
      }
    }
  }

  return deletedReferenceCount;
}

function removeEndingUnlockReferences(script, endingId) {
  let deletedReferenceCount = 0;

  for (const scene of Object.values(script.scenes ?? {})) {
    for (const page of scene?.pages ?? []) {
      if (page?.type === 'normal') {
        const normalizedPage = normalizeEffectContainer(page);
        const effects = (normalizedPage.effects ?? []).filter((effect) => {
          const shouldKeep = !isEndingUnlockEffect(effect) || effect.id !== endingId;
          if (!shouldKeep) {
            deletedReferenceCount += 1;
          }
          return shouldKeep;
        });

        if (effects.length > 0) {
          normalizedPage.effects = effects;
        } else {
          delete normalizedPage.effects;
        }
        delete page.effects;
        Object.assign(page, normalizedPage);
      }

      if (page?.type !== 'choice') {
        continue;
      }

      page.options = (page.options ?? []).map((option) => {
        const normalizedOption = normalizeEffectContainer(option);
        const effects = (normalizedOption.effects ?? []).filter((effect) => {
          const shouldKeep = !isEndingUnlockEffect(effect) || effect.id !== endingId;
          if (!shouldKeep) {
            deletedReferenceCount += 1;
          }
          return shouldKeep;
        });

        if (effects.length > 0) {
          normalizedOption.effects = effects;
        } else {
          delete normalizedOption.effects;
        }
        return normalizedOption;
      });
    }
  }

  return deletedReferenceCount;
}

function removeCgUnlockReferences(script, cgId) {
  let deletedReferenceCount = 0;

  for (const scene of Object.values(script.scenes ?? {})) {
    for (const page of scene?.pages ?? []) {
      if (page?.type === 'normal') {
        const normalizedPage = normalizeEffectContainer(page);
        const effects = (normalizedPage.effects ?? []).filter((effect) => {
          const shouldKeep = !isCgUnlockEffect(effect) || effect.id !== cgId;
          if (!shouldKeep) {
            deletedReferenceCount += 1;
          }
          return shouldKeep;
        });

        if (effects.length > 0) {
          normalizedPage.effects = effects;
        } else {
          delete normalizedPage.effects;
        }
        delete page.effects;
        Object.assign(page, normalizedPage);
      }

      if (page?.type !== 'choice') {
        continue;
      }

      page.options = (page.options ?? []).map((option) => {
        const normalizedOption = normalizeEffectContainer(option);
        const effects = (normalizedOption.effects ?? []).filter((effect) => {
          const shouldKeep = !isCgUnlockEffect(effect) || effect.id !== cgId;
          if (!shouldKeep) {
            deletedReferenceCount += 1;
          }
          return shouldKeep;
        });

        if (effects.length > 0) {
          normalizedOption.effects = effects;
        } else {
          delete normalizedOption.effects;
        }
        return normalizedOption;
      });
    }
  }

  return deletedReferenceCount;
}

function findVideoReferences(script, videoId) {
  const references = [];

  if (script?.ui?.titleScreen?.openingVideo?.videoId === videoId) {
    references.push({
      kind: 'opening-video',
      pathString: 'ui.titleScreen.openingVideo.videoId',
      videoId,
    });
  }

  for (const [endingId, ending] of Object.entries(script?.systems?.endings ?? {})) {
    if (ending?.endingVideo?.videoId === videoId) {
      references.push({
        kind: 'ending-video',
        endingId,
        pathString: `systems.endings.${endingId}.endingVideo.videoId`,
        videoId,
      });
    }
  }

  for (const [sceneId, scene] of Object.entries(script?.scenes ?? {})) {
    for (const [pageIndex, page] of (scene.pages ?? []).entries()) {
      if (page?.type === 'video' && page.video?.videoId === videoId) {
        references.push({
          kind: 'video-page',
          sceneId,
          pageIndex,
          pathString: `scenes.${sceneId}.pages.${pageIndex}.video.videoId`,
          videoId,
        });
      }
    }
  }

  return references;
}

function removeVideoReferences(script, videoId) {
  let removed = 0;
  const hasDirectFile = (reference) => isPlainObject(reference)
    && typeof reference.file === 'string'
    && reference.file.trim();

  if (script?.ui?.titleScreen?.openingVideo?.videoId === videoId) {
    delete script.ui.titleScreen.openingVideo.videoId;
    removed += 1;
    if (!hasDirectFile(script.ui.titleScreen.openingVideo)) {
      delete script.ui.titleScreen.openingVideo;
    }
  }

  for (const ending of Object.values(script?.systems?.endings ?? {})) {
    if (ending?.endingVideo?.videoId === videoId) {
      delete ending.endingVideo.videoId;
      removed += 1;
      if (!hasDirectFile(ending.endingVideo)) {
        delete ending.endingVideo;
      }
    }
  }

  for (const scene of Object.values(script?.scenes ?? {})) {
    if (!Array.isArray(scene.pages)) continue;
    for (let pageIndex = scene.pages.length - 1; pageIndex >= 0; pageIndex -= 1) {
      const page = scene.pages[pageIndex];
      if (page?.type === 'video' && page.video?.videoId === videoId) {
        delete page.video.videoId;
        removed += 1;
        if (!hasDirectFile(page.video)) {
          scene.pages.splice(pageIndex, 1);
        }
      }
    }
  }

  return removed;
}

function uniqueChangedPaths(paths = []) {
  return [...new Set(paths.filter(Boolean))];
}

function normalizePageTransitionInput(transition) {
  return getPageTransitionContract(transition);
}

function pageParticlesPath(sceneId, pageIndex) {
  return `scenes.${sceneId}.pages.${pageIndex}.particles`;
}

function pageEffectPacksPath(sceneId, pageIndex) {
  return `scenes.${sceneId}.pages.${pageIndex}.effectPacks`;
}

function uiMotionPath() {
  return 'ui.motion';
}

function normalizeTitleElement(element, index = 0) {
  if (!isPlainObject(element)) {
    throw new Error('Title screen element must be an object');
  }

  const type = assertNonEmptyString(element.type, 'title element type');
  if (!['text', 'button', 'image'].includes(type)) {
    throw new Error(`Unsupported title element type: ${type}`);
  }

  const normalized = {
    ...cloneJsonValue(element),
    type,
    id: element.id ?? `title-${type}-${index + 1}`,
  };

  if (type === 'button') {
    if (normalized.text === undefined && normalized.label !== undefined) {
      normalized.text = normalized.label;
    }
    if (normalized.action === 'load') {
      normalized.action = 'continue';
    }
    if (normalized.action !== undefined && !['start', 'continue', 'gallery', 'settings', 'quit'].includes(normalized.action)) {
      throw new Error(`Unsupported title button action: ${normalized.action}`);
    }
  }

  if (isPlainObject(normalized.size)) {
    normalized.width ??= normalized.size.width;
    normalized.height ??= normalized.size.height;
    delete normalized.size;
  }

  delete normalized.label;
  return normalized;
}

function normalizeTitleScreenConfig(config = {}) {
  if (!isPlainObject(config)) {
    throw new Error('Title screen config must be an object');
  }
  const normalized = cloneJsonValue(config);
  delete normalized.particles;

  const elements = Array.isArray(config.elements)
    ? config.elements.map((element, index) => normalizeTitleElement(element, index))
    : [];

  return {
    ...normalized,
    background: config.background ?? null,
    bgm: config.bgm ?? null,
    elements,
  };
}

function ensureTitleScreen(script) {
  script.ui ??= {};
  script.ui.titleScreen = normalizeTitleScreenConfig(script.ui.titleScreen ?? {});
  return script.ui.titleScreen;
}

const SUPPORTED_SCREEN_LAYOUT_IDS = [
  'settingsScreen',
  'gameMenu',
  'saveLoadScreen',
  'backlogScreen',
];

function assertSupportedScreenLayoutId(screenId) {
  const id = assertNonEmptyString(screenId, 'screenId');
  if (!SUPPORTED_SCREEN_LAYOUT_IDS.includes(id)) {
    throw new Error(`Unsupported screen layout id: ${id}`);
  }
  return id;
}

function mergePlainObjects(base, patch) {
  const result = cloneJsonValue(base ?? {});
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergePlainObjects(result[key], value);
    } else {
      result[key] = cloneJsonValue(value);
    }
  }
  return result;
}

function normalizeScreenLayoutConfig(config, screenId) {
  if (!isPlainObject(config)) {
    throw new Error('Screen layout config must be an object');
  }
  const normalized = cloneJsonValue(config);
  if (screenId !== 'settingsScreen') return normalized;

  if (normalized.tabBar?.enabled !== undefined && typeof normalized.tabBar.enabled !== 'boolean') {
    throw new Error('Settings tabBar.enabled must be a boolean');
  }
  for (const element of (Array.isArray(normalized.elements) ? normalized.elements : [])) {
    if (element?.type === 'button' && element.action !== undefined && !isKnownSettingsCustomButtonAction(element.action)) {
      throw new Error(`Unsupported custom settings button action: ${element.action}`);
    }
  }
  for (const button of (Array.isArray(normalized.footer?.buttons) ? normalized.footer.buttons : [])) {
    if (button?.action !== undefined && !isKnownSettingsFooterButtonAction(button.action)) {
      throw new Error(`Unsupported settings footer button action: ${button.action}`);
    }
  }
  return normalized;
}

function normalizeSharedUiConfig(config, label) {
  if (!isPlainObject(config)) {
    throw new Error(`${label} config must be an object`);
  }
  return cloneJsonValue(config);
}

function normalizeScriptForAuthoring(script) {
  const normalized = ensureGalgameContract(script ?? {});
  normalized.systems.variables = normalizeVariableRegistry(normalized.systems.variables);
  normalized.systems.endings = normalizeEndingRegistry(normalized.systems.endings);
  normalized.systems.gallery.cg = normalizeCgRegistry(normalized.systems.gallery.cg);
  normalized.assets ??= {};
  normalized.assets.videos = normalizeVideoRegistry(normalized.assets.videos);

  for (const scene of Object.values(normalized.scenes ?? {})) {
    if (!Array.isArray(scene.pages)) {
      scene.pages = [];
      continue;
    }

    scene.pages = scene.pages.map((page) => {
      if (page?.type === 'choice') {
        return {
          ...page,
          options: (page.options ?? []).map((option) => normalizeEffectContainer(option)),
        };
      }

      if (page?.type === 'condition') {
        return normalizeConditionPage(page, { registry: normalized.systems.variables });
      }

      return page;
    });
  }

  return normalized;
}

export function createProjectSession(input = {}) {
  const sourceScript = isPlainObject(input) && 'script' in input
    ? input.script
    : input;
  let script = normalizeScriptForAuthoring(cloneJsonValue(sourceScript ?? {}));

  const session = {
    addCharacter(character) {
      const id = assertEntityId(character?.id, 'character.id');
      script.characters[id] = {
        name: character.name ?? id,
        color: character.color ?? '#ffffff',
        expressions: isPlainObject(character.expressions) ? cloneJsonValue(character.expressions) : {},
        ...cloneJsonValue(character),
        id: undefined,
      };
      delete script.characters[id].id;
      return { characterId: id };
    },

    addVariable(variable) {
      const id = assertEntityId(variable?.id, 'variable.id');
      if (script.systems.variables[id]) {
        throw new Error(`Variable "${id}" already exists`);
      }
      script.systems.variables[id] = normalizeVariableRegistry({
        [id]: {
          type: variable.type ?? 'number',
          initial: variable.initial,
          label: variable.label ?? variable.name ?? id,
          ...cloneJsonValue(variable),
          id: undefined,
        },
      })[id];
      delete script.systems.variables[id].id;
      return { variableId: id };
    },

    updateVariable({ variableId, patch = {}, ...fields } = {}) {
      const id = assertEntityId(variableId ?? fields.id, 'variableId');
      if (!script.systems.variables[id]) {
        throw new Error(`Variable "${id}" does not exist`);
      }

      script.systems.variables[id] = normalizeVariableRegistry({
        [id]: {
          ...script.systems.variables[id],
          ...cloneJsonValue(patch),
          ...cloneJsonValue(fields),
          id: undefined,
        },
      })[id];
      delete script.systems.variables[id].id;
      return { variableId: id };
    },

    addAffectionVariable({ characterId, id, variableId, ...fields } = {}) {
      const targetCharacterId = assertEntityId(characterId, 'characterId');
      const character = script.characters?.[targetCharacterId];
      if (!character) {
        throw new Error(`Character "${targetCharacterId}" does not exist`);
      }

      const targetVariableId = assertEntityId(
        id ?? variableId ?? createAffectionVariableId(targetCharacterId),
        'variable.id',
      );
      if (script.systems.variables[targetVariableId]) {
        throw new Error(`Variable "${targetVariableId}" already exists`);
      }

      script.systems.variables[targetVariableId] = createAffectionVariableEntry({
        characterId: targetCharacterId,
        characterName: character.name ?? targetCharacterId,
        ...cloneJsonValue(fields),
      });
      return {
        variableId: targetVariableId,
        characterId: targetCharacterId,
        changedPaths: [`systems.variables.${targetVariableId}`],
      };
    },

    addEnding(ending) {
      const id = assertEntityId(ending?.id ?? ending?.endingId, 'ending.id');
      if (script.systems.endings[id]) {
        throw new Error(`Ending "${id}" already exists`);
      }

      script.systems.endings[id] = normalizeEndingRegistry({
        [id]: {
          title: ending.title ?? ending.name ?? id,
          category: ending.category,
          order: ending.order,
          description: ending.description,
          thumbnail: ending.thumbnail,
          hiddenUntilUnlocked: ending.hiddenUntilUnlocked,
          ...cloneJsonValue(ending),
          id: undefined,
        },
      })[id];
      delete script.systems.endings[id].id;
      return {
        endingId: id,
        changedPaths: [`systems.endings.${id}`],
      };
    },

    updateEnding({ endingId, patch = {}, ...fields } = {}) {
      const id = assertEntityId(endingId ?? fields.id, 'endingId');
      if (!script.systems.endings[id]) {
        throw new Error(`Ending "${id}" does not exist`);
      }

      script.systems.endings[id] = normalizeEndingRegistry({
        [id]: {
          ...script.systems.endings[id],
          ...cloneJsonValue(patch),
          ...cloneJsonValue(fields),
          id: undefined,
        },
      })[id];
      delete script.systems.endings[id].id;
      return {
        endingId: id,
        changedPaths: [`systems.endings.${id}`],
      };
    },

    setEndingVideo({ endingId, endingVideo, video, clear = false } = {}) {
      const id = assertEntityId(endingId, 'endingId');
      if (!script.systems.endings[id]) {
        throw new Error(`Ending "${id}" does not exist`);
      }

      if (clear || endingVideo === null || video === null) {
        delete script.systems.endings[id].endingVideo;
      } else {
        const nextVideo = endingVideo ?? video;
        if (!isPlainObject(nextVideo)) {
          throw new Error('endingVideo must be an object or null');
        }
        script.systems.endings[id] = normalizeEndingRegistry({
          [id]: {
            ...script.systems.endings[id],
            endingVideo: cloneJsonValue(nextVideo),
          },
        })[id];
      }

      return {
        endingId: id,
        changedPaths: [`systems.endings.${id}.endingVideo`],
      };
    },

    removeEnding({ endingId, id, forceReferences = false } = {}) {
      const targetId = assertEntityId(endingId ?? id, 'endingId');
      if (!script.systems.endings[targetId]) {
        throw new Error(`Ending "${targetId}" does not exist`);
      }

      const references = findEndingUnlockReferences(script, targetId);
      if (references.length > 0 && !forceReferences) {
        const paths = references.map((reference) => reference.pathString).join(', ');
        throw new Error(`Ending "${targetId}" is still referenced by: ${paths}`);
      }

      const deletedReferenceCount = removeEndingUnlockReferences(script, targetId);
      delete script.systems.endings[targetId];
      return {
        endingId: targetId,
        deletedEndingId: targetId,
        deletedReferenceCount,
        references,
        changedPaths: uniqueChangedPaths([
          `systems.endings.${targetId}`,
          ...references.map((reference) => reference.pathString),
        ]),
      };
    },

    addEndingUnlock({ sceneId, pageIndex, optionIndex, endingId, id } = {}) {
      const targetEndingId = assertEntityId(endingId ?? id, 'endingId');
      if (!script.systems.endings[targetEndingId]) {
        throw new Error(`Ending "${targetEndingId}" does not exist`);
      }

      const page = getPage(script, sceneId, pageIndex);
      if (optionIndex == null) {
        if (page.type !== 'normal') {
          throw new Error('Page-enter ending unlocks can only be added to normal pages');
        }

        const normalizedPage = normalizeEffectContainer(page);
        normalizedPage.effects = [
          ...(normalizedPage.effects ?? []),
          { type: 'unlock:ending', id: targetEndingId },
        ];
        Object.assign(page, normalizedPage);
        const effectIndex = normalizedPage.effects.length - 1;
        return {
          sceneId,
          pageIndex,
          optionIndex: null,
          effectIndex,
          endingId: targetEndingId,
          changedPaths: [`scenes.${sceneId}.pages.${pageIndex}.effects.${effectIndex}`],
        };
      }

      if (page.type !== 'choice') {
        throw new Error('Ending unlocks can only be added to choice pages');
      }
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= (page.options?.length ?? 0)) {
        throw new Error(`Choice option index ${optionIndex} is out of range`);
      }

      const option = normalizeEffectContainer(page.options[optionIndex]);
      option.effects = [
        ...(option.effects ?? []),
        { type: 'unlock:ending', id: targetEndingId },
      ];
      page.options[optionIndex] = option;
      const effectIndex = option.effects.length - 1;
      return {
        sceneId,
        pageIndex,
        optionIndex,
        effectIndex,
        endingId: targetEndingId,
        changedPaths: [`scenes.${sceneId}.pages.${pageIndex}.options.${optionIndex}.effects.${effectIndex}`],
      };
    },

    listEndings() {
      return Object.entries(script.systems.endings ?? {})
        .map(([endingId, ending]) => ({
          endingId,
          ...cloneJsonValue(ending),
        }))
        .sort((left, right) => {
          const orderDelta = Number(left.order ?? 0) - Number(right.order ?? 0);
          if (orderDelta !== 0) return orderDelta;
          return String(left.title ?? left.endingId).localeCompare(String(right.title ?? right.endingId));
        });
    },

    addCg(cg) {
      const id = assertEntityId(cg?.id ?? cg?.cgId, 'cg.id');
      if (script.systems.gallery.cg[id]) {
        throw new Error(`CG "${id}" already exists`);
      }

      script.systems.gallery.cg[id] = normalizeCgRegistry({
        [id]: {
          title: cg.title ?? cg.name ?? id,
          images: cg.images,
          thumbnail: cg.thumbnail,
          lockedThumbnail: cg.lockedThumbnail,
          category: cg.category,
          order: cg.order,
          description: cg.description,
          ...cloneJsonValue(cg),
          id: undefined,
        },
      })[id];
      delete script.systems.gallery.cg[id].id;
      return {
        cgId: id,
        changedPaths: [`systems.gallery.cg.${id}`],
      };
    },

    updateCg({ cgId, patch = {}, ...fields } = {}) {
      const id = assertEntityId(cgId ?? fields.id, 'cgId');
      if (!script.systems.gallery.cg[id]) {
        throw new Error(`CG "${id}" does not exist`);
      }

      script.systems.gallery.cg[id] = normalizeCgRegistry({
        [id]: {
          ...script.systems.gallery.cg[id],
          ...cloneJsonValue(patch),
          ...cloneJsonValue(fields),
          id: undefined,
        },
      })[id];
      delete script.systems.gallery.cg[id].id;
      return {
        cgId: id,
        changedPaths: [`systems.gallery.cg.${id}`],
      };
    },

    removeCg({ cgId, id, forceReferences = false } = {}) {
      const targetId = assertEntityId(cgId ?? id, 'cgId');
      if (!script.systems.gallery.cg[targetId]) {
        throw new Error(`CG "${targetId}" does not exist`);
      }

      const references = findCgUnlockReferences(script, targetId);
      if (references.length > 0 && !forceReferences) {
        const paths = references.map((reference) => reference.pathString).join(', ');
        throw new Error(`CG "${targetId}" is still referenced by: ${paths}`);
      }

      const deletedReferenceCount = removeCgUnlockReferences(script, targetId);
      delete script.systems.gallery.cg[targetId];
      return {
        cgId: targetId,
        deletedCgId: targetId,
        deletedReferenceCount,
        references,
        changedPaths: uniqueChangedPaths([
          `systems.gallery.cg.${targetId}`,
          ...references.map((reference) => reference.pathString),
        ]),
      };
    },

    addCgUnlock({ sceneId, pageIndex, optionIndex, cgId, id } = {}) {
      const targetCgId = assertEntityId(cgId ?? id, 'cgId');
      if (!script.systems.gallery.cg[targetCgId]) {
        throw new Error(`CG "${targetCgId}" does not exist`);
      }

      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'choice') {
        throw new Error('CG unlocks can only be added to choice pages');
      }
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= (page.options?.length ?? 0)) {
        throw new Error(`Choice option index ${optionIndex} is out of range`);
      }

      const option = normalizeEffectContainer(page.options[optionIndex]);
      option.effects = [
        ...(option.effects ?? []),
        { type: 'unlock:cg', id: targetCgId },
      ];
      page.options[optionIndex] = option;
      const effectIndex = option.effects.length - 1;
      return {
        sceneId,
        pageIndex,
        optionIndex,
        effectIndex,
        cgId: targetCgId,
        changedPaths: [`scenes.${sceneId}.pages.${pageIndex}.options.${optionIndex}.effects.${effectIndex}`],
      };
    },

    listCgs() {
      return Object.entries(script.systems.gallery.cg ?? {})
        .map(([cgId, cg]) => ({
          cgId,
          ...cloneJsonValue(cg),
        }))
        .sort((left, right) => {
          const orderDelta = Number(left.order ?? 0) - Number(right.order ?? 0);
          if (orderDelta !== 0) return orderDelta;
          return String(left.title ?? left.cgId).localeCompare(String(right.title ?? right.cgId));
        });
    },

    addVideo(video) {
      const id = assertEntityId(video?.id ?? video?.videoId, 'video.id');
      if (script.assets.videos[id]) {
        throw new Error(`Video "${id}" already exists`);
      }

      script.assets.videos[id] = normalizeVideoEntry({
        file: video.file,
        poster: video.poster,
        label: video.label ?? video.name ?? id,
        kind: video.kind,
        tags: video.tags,
        durationMs: video.durationMs,
        ...cloneJsonValue(video),
        id: undefined,
        videoId: undefined,
      }, id);
      delete script.assets.videos[id].id;
      delete script.assets.videos[id].videoId;
      return {
        videoId: id,
        changedPaths: [`assets.videos.${id}`],
      };
    },

    updateVideo({ videoId, patch = {}, ...fields } = {}) {
      const id = assertEntityId(videoId ?? fields.id, 'videoId');
      if (!script.assets.videos[id]) {
        throw new Error(`Video "${id}" does not exist`);
      }

      script.assets.videos[id] = normalizeVideoEntry({
        ...script.assets.videos[id],
        ...cloneJsonValue(patch),
        ...cloneJsonValue(fields),
        id: undefined,
        videoId: undefined,
      }, id);
      delete script.assets.videos[id].id;
      delete script.assets.videos[id].videoId;
      return {
        videoId: id,
        changedPaths: [`assets.videos.${id}`],
      };
    },

    removeVideo({ videoId, id, forceReferences = false } = {}) {
      const targetId = assertEntityId(videoId ?? id, 'videoId');
      if (!script.assets.videos[targetId]) {
        throw new Error(`Video "${targetId}" does not exist`);
      }

      const references = findVideoReferences(script, targetId);
      if (references.length > 0 && !forceReferences) {
        const paths = references.map((reference) => reference.pathString).join(', ');
        throw new Error(`Video "${targetId}" is still referenced by: ${paths}`);
      }

      const deletedReferenceCount = removeVideoReferences(script, targetId);
      delete script.assets.videos[targetId];
      return {
        videoId: targetId,
        deletedVideoId: targetId,
        deletedReferenceCount,
        references,
        changedPaths: uniqueChangedPaths([
          `assets.videos.${targetId}`,
          ...references.map((reference) => reference.pathString),
        ]),
      };
    },

    listVideos() {
      return Object.entries(script.assets.videos ?? {})
        .map(([videoId, video]) => ({
          videoId,
          ...cloneJsonValue(video),
        }))
        .sort((left, right) => {
          const kindDelta = String(left.kind ?? '').localeCompare(String(right.kind ?? ''));
          if (kindDelta !== 0) return kindDelta;
          return String(left.label ?? left.videoId).localeCompare(String(right.label ?? right.videoId));
        });
    },

    renameVariable({ variableId, newVariableId, id, newId } = {}) {
      const fromId = assertEntityId(variableId ?? id, 'variableId');
      const toId = assertEntityId(newVariableId ?? newId, 'newVariableId');
      if (!script.systems.variables[fromId]) {
        throw new Error(`Variable "${fromId}" does not exist`);
      }

      if (fromId === toId) {
        return {
          variableId: fromId,
          newVariableId: toId,
          updatedReferenceCount: 0,
          references: [],
          changedPaths: [`systems.variables.${fromId}`],
        };
      }

      if (script.systems.variables[toId]) {
        throw new Error(`Variable "${toId}" already exists`);
      }

      const references = findVariableReferences(script, fromId);
      script.systems.variables[toId] = script.systems.variables[fromId];
      delete script.systems.variables[fromId];
      const updatedReferenceCount = replaceVariableReferences(script, fromId, toId);
      return {
        variableId: fromId,
        newVariableId: toId,
        updatedReferenceCount,
        references,
        changedPaths: uniqueChangedPaths([
          `systems.variables.${fromId}`,
          `systems.variables.${toId}`,
          ...references.map((reference) => reference.pathString),
        ]),
      };
    },

    deleteVariable({ variableId, id, forceReferences = false } = {}) {
      const targetId = assertEntityId(variableId ?? id, 'variableId');
      if (!script.systems.variables[targetId]) {
        throw new Error(`Variable "${targetId}" does not exist`);
      }

      const references = findVariableReferences(script, targetId);
      if (references.length > 0 && !forceReferences) {
        const paths = references.map((reference) => reference.pathString).join(', ');
        throw new Error(`Variable "${targetId}" is still referenced by: ${paths}`);
      }

      const deletedReferenceCount = removeVariableReferences(script, targetId);
      delete script.systems.variables[targetId];
      return {
        variableId: targetId,
        deletedVariableId: targetId,
        deletedReferenceCount,
        references,
        changedPaths: uniqueChangedPaths([
          `systems.variables.${targetId}`,
          ...references.map((reference) => reference.pathString),
        ]),
      };
    },

    addScene(scene) {
      const id = assertEntityId(scene?.id, 'scene.id');
      if (script.scenes[id]) {
        throw new Error(`Scene "${id}" already exists`);
      }
      script.scenes[id] = {
        name: scene.name ?? id,
        pages: Array.isArray(scene.pages) ? cloneJsonValue(scene.pages) : [],
        ...cloneJsonValue(scene),
        id: undefined,
      };
      delete script.scenes[id].id;
      if (!Array.isArray(script.scenes[id].pages)) {
        script.scenes[id].pages = [];
      }
      script = normalizeScriptForAuthoring(script);
      return { sceneId: id };
    },

    renameScene({ sceneId, newSceneId, name }) {
      const fromId = assertEntityId(sceneId, 'sceneId');
      const toId = assertEntityId(newSceneId, 'newSceneId');
      if (fromId === toId) {
        const scene = getScene(script, fromId);
        if (name !== undefined) {
          scene.name = name || toId;
        }
        return { sceneId: fromId, newSceneId: toId, updatedReferenceCount: 0 };
      }
      const scene = getScene(script, fromId);
      if (script.scenes[toId]) {
        throw new Error(`Scene "${toId}" already exists`);
      }

      script.scenes[toId] = {
        ...scene,
        name: name ?? scene.name ?? toId,
      };
      delete script.scenes[fromId];
      const updatedReferenceCount = replaceSceneReferences(script, fromId, toId);
      return { sceneId: fromId, newSceneId: toId, updatedReferenceCount };
    },

    deleteScene({ sceneId, forceReferences = false } = {}) {
      const id = assertEntityId(sceneId, 'sceneId');
      getScene(script, id);
      const references = collectSceneReferences(script, id).filter((reference) => reference.sceneId !== id);
      if (references.length > 0 && !forceReferences) {
        const paths = references.map((reference) => reference.pathString).join(', ');
        throw new Error(`Scene "${id}" is still referenced by: ${paths}`);
      }

      delete script.scenes[id];
      return { sceneId: id, deletedSceneId: id, removedReferenceCount: references.length };
    },

    setSceneNext({ sceneId, next }) {
      const scene = getScene(script, sceneId);
      scene.next = next || null;
      return { sceneId, next: scene.next };
    },

    inspectSceneReferences({ sceneId }) {
      const id = assertEntityId(sceneId, 'sceneId');
      getScene(script, id);
      return {
        sceneId: id,
        references: collectSceneReferences(script, id),
      };
    },

    retargetSceneReferences({ fromSceneId, toSceneId, allowMissingSource = false }) {
      const fromId = assertEntityId(fromSceneId, 'fromSceneId');
      const toId = assertEntityId(toSceneId, 'toSceneId');
      if (!allowMissingSource) {
        getScene(script, fromId);
      }
      getScene(script, toId);
      const references = collectSceneReferences(script, fromId);
      const updatedReferenceCount = replaceSceneReferences(script, fromId, toId);
      return {
        sceneId: fromId,
        fromSceneId: fromId,
        toSceneId: toId,
        updatedReferenceCount,
        references,
      };
    },

    clearSceneReferences({ sceneId, allowMissingTarget = false }) {
      const id = assertEntityId(sceneId, 'sceneId');
      if (!allowMissingTarget) {
        getScene(script, id);
      }
      const references = collectSceneReferences(script, id);
      const clearedReferenceCount = clearSceneReferenceTargets(script, id);
      return {
        sceneId: id,
        clearedReferenceCount,
        references,
      };
    },

    addNormalPage({ sceneId, page = {}, ...pageFields }) {
      const scene = getScene(script, sceneId);
      const nextPage = createDefaultNormalPage({ ...page, ...pageFields });
      scene.pages.push(nextPage);
      return { sceneId, pageIndex: scene.pages.length - 1 };
    },

    addChoicePage({ sceneId, page = {}, ...pageFields }) {
      const scene = getScene(script, sceneId);
      const nextPage = createDefaultChoicePage({ ...page, ...pageFields });
      scene.pages.push(nextPage);
      return { sceneId, pageIndex: scene.pages.length - 1 };
    },

    addInputPage({ sceneId, page = {}, ...pageFields }) {
      const scene = getScene(script, sceneId);
      const nextPage = createDefaultInputPage({ ...page, ...pageFields });
      scene.pages.push(nextPage);
      return { sceneId, pageIndex: scene.pages.length - 1 };
    },

    addConditionPage({ sceneId, page = {}, ...pageFields }) {
      const scene = getScene(script, sceneId);
      const nextPage = createDefaultConditionPage({ ...page, ...pageFields }, script.systems.variables);
      scene.pages.push(nextPage);
      return { sceneId, pageIndex: scene.pages.length - 1 };
    },

    addVideoPage({ sceneId, page = {}, ...pageFields }) {
      const scene = getScene(script, sceneId);
      const nextPage = createDefaultVideoPage({ ...page, ...pageFields });
      scene.pages.push(nextPage);
      return { sceneId, pageIndex: scene.pages.length - 1, pageType: 'video' };
    },

    removePage({ sceneId, pageIndex }) {
      const scene = getScene(script, sceneId);
      assertPageIndexInRange(scene, sceneId, pageIndex);
      const [removedPage] = scene.pages.splice(pageIndex, 1);
      return {
        sceneId,
        pageIndex,
        removedPageType: removedPage?.type ?? null,
      };
    },

    movePage({ sceneId, fromIndex, toIndex }) {
      const scene = getScene(script, sceneId);
      assertPageIndexInRange(scene, sceneId, fromIndex);
      assertPageIndexInRange(scene, sceneId, toIndex);
      const [page] = scene.pages.splice(fromIndex, 1);
      scene.pages.splice(toIndex, 0, page);
      return { sceneId, fromIndex, toIndex };
    },

    addDialogue({ sceneId, pageIndex, dialogue }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'normal') {
        throw new Error('Dialogues can only be added to normal pages');
      }
      page.dialogues ??= [];
      page.dialogues.push(cloneJsonValue(dialogue ?? {}));
      return { sceneId, pageIndex, dialogueIndex: page.dialogues.length - 1 };
    },

    setDialogue({ sceneId, pageIndex, dialogueIndex, dialogue }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'normal') {
        throw new Error('Dialogues can only be edited on normal pages');
      }
      if (!Number.isInteger(dialogueIndex) || dialogueIndex < 0 || dialogueIndex >= (page.dialogues?.length ?? 0)) {
        throw new Error(`Dialogue index ${dialogueIndex} is out of range`);
      }

      page.dialogues[dialogueIndex] = {
        ...cloneJsonValue(page.dialogues[dialogueIndex]),
        ...cloneJsonValue(dialogue ?? {}),
      };
      return { sceneId, pageIndex, dialogueIndex };
    },

    removeDialogue({ sceneId, pageIndex, dialogueIndex }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'normal') {
        throw new Error('Dialogues can only be removed from normal pages');
      }
      if (!Number.isInteger(dialogueIndex) || dialogueIndex < 0 || dialogueIndex >= (page.dialogues?.length ?? 0)) {
        throw new Error(`Dialogue index ${dialogueIndex} is out of range`);
      }

      page.dialogues.splice(dialogueIndex, 1);
      return { sceneId, pageIndex, dialogueIndex };
    },

    moveDialogue({ sceneId, pageIndex, fromIndex, toIndex }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'normal') {
        throw new Error('Dialogues can only be reordered on normal pages');
      }
      if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= (page.dialogues?.length ?? 0)) {
        throw new Error(`Dialogue from index ${fromIndex} is out of range`);
      }
      if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= (page.dialogues?.length ?? 0)) {
        throw new Error(`Dialogue to index ${toIndex} is out of range`);
      }

      const [dialogue] = page.dialogues.splice(fromIndex, 1);
      page.dialogues.splice(toIndex, 0, dialogue);
      return { sceneId, pageIndex, fromIndex, toIndex };
    },

    setPageCharacters({ sceneId, pageIndex, characters }) {
      const page = getPage(script, sceneId, pageIndex);
      page.characters = Array.isArray(characters) ? cloneJsonValue(characters) : [];
      return { sceneId, pageIndex, characterCount: page.characters.length };
    },

    setPageBackground({ sceneId, pageIndex, background }) {
      const page = getPage(script, sceneId, pageIndex);
      page.background = background ?? '';
      return { sceneId, pageIndex, background: page.background };
    },

    setPageAudio({ sceneId, pageIndex, bgm, se }) {
      const page = getPage(script, sceneId, pageIndex);
      if (bgm !== undefined) {
        page.bgm = cloneJsonValue(bgm);
      }
      if (se !== undefined) {
        page.se = cloneJsonValue(se);
      }
      return {
        sceneId,
        pageIndex,
        bgm: cloneJsonValue(page.bgm ?? null),
        se: cloneJsonValue(page.se ?? null),
      };
    },

    setPageMedia({ sceneId, pageIndex, background, bgm, se }) {
      const page = getPage(script, sceneId, pageIndex);
      if (background !== undefined) {
        page.background = background ?? '';
      }
      if (bgm !== undefined) {
        page.bgm = cloneJsonValue(bgm);
      }
      if (se !== undefined) {
        page.se = cloneJsonValue(se);
      }
      return {
        sceneId,
        pageIndex,
        background: page.background ?? '',
        bgm: cloneJsonValue(page.bgm ?? null),
        se: cloneJsonValue(page.se ?? null),
      };
    },

    setPageCamera({ sceneId, pageIndex, camera }) {
      const page = getPage(script, sceneId, pageIndex);
      page.camera = camera == null ? null : getPageCameraContract(camera);
      return {
        sceneId,
        pageIndex,
        camera: cloneJsonValue(page.camera),
        changedPaths: [`scenes.${sceneId}.pages.${pageIndex}.camera`],
      };
    },

    setPageTransition({ sceneId, pageIndex, transition }) {
      const page = getPage(script, sceneId, pageIndex);
      page.transition = normalizePageTransitionInput(transition);
      return {
        sceneId,
        pageIndex,
        transition: cloneJsonValue(page.transition),
        changedPaths: [`scenes.${sceneId}.pages.${pageIndex}.transition`],
      };
    },

    registerEffectPack({ manifest } = {}) {
      const result = validateEffectPackManifest(manifest);
      if (!result.ok) {
        throw new Error(`Invalid effect pack manifest: ${result.errors.join('; ')}`);
      }
      script.assets ??= {};
      script.assets.effectPacks ??= {};
      script.assets.effectPacks[result.manifest.id] = result.manifest;
      return {
        ok: true,
        effectPackId: result.manifest.id,
        pathString: `assets.effectPacks.${result.manifest.id}`,
        manifest: cloneJsonValue(result.manifest),
        changedPaths: [`assets.effectPacks.${result.manifest.id}`],
      };
    },

    listEffectPacks() {
      return listEffectPackManifests(script);
    },

    setPageEffectPack({ sceneId, pageIndex, effectPackId, id, params = {}, enabled = true } = {}) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type === 'condition') {
        throw new Error('Effect packs can only be edited on normal or choice pages');
      }
      const targetId = assertNonEmptyString(effectPackId ?? id, 'effectPackId');
      const manifests = script.assets?.effectPacks ?? {};
      const reference = normalizeEffectPackReference({
        id: targetId,
        enabled,
        params,
      }, manifests);
      if (!reference) {
        throw new Error('effect pack reference must include a valid id');
      }
      page.effectPacks = [reference];
      return {
        ok: true,
        sceneId,
        pageIndex,
        effectPackId: targetId,
        pathString: pageEffectPacksPath(sceneId, pageIndex),
        effectPacks: cloneJsonValue(page.effectPacks),
        changedPaths: [pageEffectPacksPath(sceneId, pageIndex)],
      };
    },

    clearPageEffectPacks({ sceneId, pageIndex } = {}) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type === 'condition') {
        throw new Error('Effect packs can only be edited on normal or choice pages');
      }
      delete page.effectPacks;
      return {
        ok: true,
        sceneId,
        pageIndex,
        pathString: pageEffectPacksPath(sceneId, pageIndex),
        effectPacks: undefined,
        changedPaths: [pageEffectPacksPath(sceneId, pageIndex)],
      };
    },

    setPageParticles({ sceneId, pageIndex, particles }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type === 'condition') {
        throw new Error('Page particles can only be edited on normal or choice pages');
      }
      if (particles === undefined) {
        throw new Error('particles must be provided');
      }
      const normalized = normalizePageParticles(particles, { preserveUnknownPreset: true });
      if (normalized === null && particles !== null && particles !== false) {
        throw new Error('particles must be a particle config object, null, or false');
      }
      page.particles = normalized;
      return {
        ok: true,
        sceneId,
        pageIndex,
        pathString: pageParticlesPath(sceneId, pageIndex),
        particles: cloneJsonValue(page.particles),
        changedPaths: [pageParticlesPath(sceneId, pageIndex)],
      };
    },

    clearPageParticles({ sceneId, pageIndex }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type === 'condition') {
        throw new Error('Page particles can only be edited on normal or choice pages');
      }
      page.particles = null;
      return {
        ok: true,
        sceneId,
        pageIndex,
        pathString: pageParticlesPath(sceneId, pageIndex),
        particles: null,
        changedPaths: [pageParticlesPath(sceneId, pageIndex)],
      };
    },

    inheritPageParticles({ sceneId, pageIndex }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type === 'condition') {
        throw new Error('Page particles can only be edited on normal or choice pages');
      }
      delete page.particles;
      return {
        ok: true,
        sceneId,
        pageIndex,
        pathString: pageParticlesPath(sceneId, pageIndex),
        particles: undefined,
        changedPaths: [pageParticlesPath(sceneId, pageIndex)],
      };
    },

    setPageTransitions({
      sceneId,
      fromPageIndex,
      toPageIndex,
      pageType,
      hasBackground,
      transition,
    }) {
      const scene = getScene(script, sceneId);
      const pageCount = scene.pages.length;
      const fromIndex = fromPageIndex ?? 0;
      const toIndex = toPageIndex ?? pageCount - 1;

      if (pageType !== undefined && !['normal', 'choice', 'input', 'condition', 'video'].includes(pageType)) {
        throw new Error(`Unsupported page type filter: ${pageType}`);
      }
      if (hasBackground !== undefined && typeof hasBackground !== 'boolean') {
        throw new Error('hasBackground must be a boolean');
      }
      if (pageCount === 0 && fromPageIndex == null && toPageIndex == null) {
        return {
          sceneId,
          matchedPageIndexes: [],
          transition: cloneJsonValue(normalizePageTransitionInput(transition)),
          changedPaths: [],
        };
      }

      assertPageIndexInRange(scene, sceneId, fromIndex);
      assertPageIndexInRange(scene, sceneId, toIndex);
      if (fromIndex > toIndex) {
        throw new Error('fromPageIndex must be less than or equal to toPageIndex');
      }

      const normalizedTransition = normalizePageTransitionInput(transition);
      const matchedPageIndexes = [];
      const changedPaths = [];

      for (let pageIndex = fromIndex; pageIndex <= toIndex; pageIndex += 1) {
        const page = scene.pages[pageIndex];
        if (pageType !== undefined && page?.type !== pageType) {
          continue;
        }

        const pageHasBackground = typeof page?.background === 'string' && page.background.trim() !== '';
        if (hasBackground !== undefined && pageHasBackground !== hasBackground) {
          continue;
        }

        page.transition = cloneJsonValue(normalizedTransition);
        matchedPageIndexes.push(pageIndex);
        changedPaths.push(`scenes.${sceneId}.pages.${pageIndex}.transition`);
      }

      return {
        sceneId,
        matchedPageIndexes,
        transition: cloneJsonValue(normalizedTransition),
        changedPaths,
      };
    },

    setCharacterAnimation({ sceneId, pageIndex, characterId, animation }) {
      const id = assertEntityId(characterId, 'characterId');
      const page = getPage(script, sceneId, pageIndex);
      if (!Array.isArray(page.characters)) {
        page.characters = [];
      }

      const characterIndex = page.characters.findIndex(entry => entry?.id === id);
      const character = page.characters[characterIndex];
      if (!character) {
        throw new Error(`Character "${id}" is not staged on scene "${sceneId}" page ${pageIndex}`);
      }

      character.animation = getCharacterAnimationValue(animation);
      return {
        sceneId,
        pageIndex,
        characterId: id,
        animation: character.animation,
        changedPaths: [`scenes.${sceneId}.pages.${pageIndex}.characters.${characterIndex}.animation`],
      };
    },

    setTitleScreen({ background, bgm, openingVideo, elements, config, merge = true } = {}) {
      const current = ensureTitleScreen(script);
      const base = merge ? current : {};
      const next = normalizeTitleScreenConfig({
        ...cloneJsonValue(base),
        ...cloneJsonValue(config ?? {}),
        ...(background !== undefined ? { background } : {}),
        ...(bgm !== undefined ? { bgm } : {}),
        ...(openingVideo !== undefined ? { openingVideo } : {}),
        ...(elements !== undefined ? { elements } : {}),
      });
      script.ui.titleScreen = next;
      return {
        uiPath: 'ui.titleScreen',
        screenId: 'titleScreen',
        elementCount: next.elements.length,
      };
    },

    setOpeningVideo({ openingVideo, video, clear = false } = {}) {
      const current = ensureTitleScreen(script);
      if (clear || openingVideo === null || video === null) {
        delete current.openingVideo;
      } else {
        const nextVideo = openingVideo ?? video;
        if (!isPlainObject(nextVideo)) {
          throw new Error('openingVideo must be an object or null');
        }
        script.ui.titleScreen = normalizeTitleScreenConfig({
          ...current,
          openingVideo: cloneJsonValue(nextVideo),
        });
      }

      return {
        uiPath: 'ui.titleScreen.openingVideo',
        screenId: 'titleScreen',
        changedPaths: ['ui.titleScreen.openingVideo'],
      };
    },

    addTitleElement({ element }) {
      const titleScreen = ensureTitleScreen(script);
      const nextElement = normalizeTitleElement(element, titleScreen.elements.length);
      titleScreen.elements.push(nextElement);
      return {
        uiPath: 'ui.titleScreen',
        screenId: 'titleScreen',
        elementId: nextElement.id,
        elementIndex: titleScreen.elements.length - 1,
      };
    },

    updateTitleElement({ elementId, index, patch }) {
      const titleScreen = ensureTitleScreen(script);
      const elementIndex = elementId
        ? titleScreen.elements.findIndex((element) => element?.id === elementId)
        : index;
      if (!Number.isInteger(elementIndex) || elementIndex < 0 || elementIndex >= titleScreen.elements.length) {
        throw new Error('Title element index is out of range');
      }

      const nextElement = normalizeTitleElement({
        ...cloneJsonValue(titleScreen.elements[elementIndex]),
        ...cloneJsonValue(patch ?? {}),
      }, elementIndex);
      titleScreen.elements[elementIndex] = nextElement;
      return {
        uiPath: 'ui.titleScreen',
        screenId: 'titleScreen',
        elementId: nextElement.id,
        elementIndex,
      };
    },

    removeTitleElement({ elementId, index }) {
      const titleScreen = ensureTitleScreen(script);
      const elementIndex = elementId
        ? titleScreen.elements.findIndex((element) => element?.id === elementId)
        : index;
      if (!Number.isInteger(elementIndex) || elementIndex < 0 || elementIndex >= titleScreen.elements.length) {
        throw new Error('Title element index is out of range');
      }

      const [removed] = titleScreen.elements.splice(elementIndex, 1);
      return {
        uiPath: 'ui.titleScreen',
        screenId: 'titleScreen',
        elementId: removed?.id ?? null,
        elementIndex,
      };
    },

    setScreenLayout({ screenId, config, merge = true }) {
      const id = assertSupportedScreenLayoutId(screenId);
      const nextConfig = normalizeScreenLayoutConfig(config ?? {}, id);
      script.ui ??= {};
      script.ui[id] = merge
        ? mergePlainObjects(script.ui[id] ?? {}, nextConfig)
        : nextConfig;
      return {
        uiPath: `ui.${id}`,
        screenId: id,
      };
    },

    setDialogueBox({ config, merge = true }) {
      const nextConfig = normalizeSharedUiConfig(config ?? {}, 'Dialogue box');
      script.ui ??= {};
      script.ui.dialogueBox = merge
        ? mergePlainObjects(script.ui.dialogueBox ?? {}, nextConfig)
        : nextConfig;
      return {
        uiPath: 'ui.dialogueBox',
      };
    },

    setTheme({ config, merge = true }) {
      const nextConfig = normalizeSharedUiConfig(config ?? {}, 'Theme');
      script.ui ??= {};
      script.ui.theme = merge
        ? mergePlainObjects(script.ui.theme ?? {}, nextConfig)
        : nextConfig;
      return {
        uiPath: 'ui.theme',
      };
    },

    setWidgetStyles({ config, merge = true }) {
      const nextConfig = normalizeSharedUiConfig(config ?? {}, 'Widget styles');
      script.ui ??= {};
      script.ui.widgetStyles = merge
        ? mergePlainObjects(script.ui.widgetStyles ?? {}, nextConfig)
        : nextConfig;
      return {
        uiPath: 'ui.widgetStyles',
      };
    },

    setUiMotion({ motion, config, merge = true, ...fields } = {}) {
      const patch = normalizeSharedUiConfig(motion ?? config ?? fields, 'UI motion');
      script.ui ??= {};
      const base = merge ? script.ui.motion ?? {} : {};
      script.ui.motion = normalizeUiMotion({
        ...cloneJsonValue(base),
        ...cloneJsonValue(patch),
      });
      return {
        uiPath: uiMotionPath(),
        motion: cloneJsonValue(script.ui.motion),
        changedPaths: [uiMotionPath()],
      };
    },

    listUiStylePresets() {
      return listUiStylePresets();
    },

    applyUiStylePreset({ presetId, id, scope = 'all', merge = true } = {}) {
      const result = applyUiStylePresetToScript(script, {
        presetId: presetId ?? id,
        scope,
        merge,
      });
      script = result.script;
      return {
        ok: true,
        presetId: result.presetId,
        label: result.label,
        scope: result.scope,
        changedPaths: result.changedPaths,
        patch: cloneJsonValue(result.patch),
        impactSummary: cloneJsonValue(result.impactSummary),
      };
    },

    addChoiceEffect({ sceneId, pageIndex, optionIndex, effect }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'choice') {
        throw new Error('Choice effects can only be added to choice pages');
      }
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= (page.options?.length ?? 0)) {
        throw new Error(`Choice option index ${optionIndex} is out of range`);
      }

      const option = normalizeEffectContainer(page.options[optionIndex]);
      option.effects = [
        ...(option.effects ?? []),
        ...normalizeEffects([effect]),
      ];
      page.options[optionIndex] = option;
      return { sceneId, pageIndex, optionIndex, effectIndex: option.effects.length - 1 };
    },

    setChoiceEffect({ sceneId, pageIndex, optionIndex, effectIndex, effect }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'choice') {
        throw new Error('Choice effects can only be edited on choice pages');
      }
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= (page.options?.length ?? 0)) {
        throw new Error(`Choice option index ${optionIndex} is out of range`);
      }

      const option = normalizeEffectContainer(page.options[optionIndex]);
      if (!Number.isInteger(effectIndex) || effectIndex < 0 || effectIndex >= (option.effects?.length ?? 0)) {
        throw new Error(`Choice effect index ${effectIndex} is out of range`);
      }

      option.effects[effectIndex] = normalizeEffects([effect])[0];
      page.options[optionIndex] = option;
      return {
        sceneId,
        pageIndex,
        optionIndex,
        effectIndex,
        effect: cloneJsonValue(option.effects[effectIndex]),
      };
    },

    removeChoiceEffect({ sceneId, pageIndex, optionIndex, effectIndex }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'choice') {
        throw new Error('Choice effects can only be removed from choice pages');
      }
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= (page.options?.length ?? 0)) {
        throw new Error(`Choice option index ${optionIndex} is out of range`);
      }

      const option = normalizeEffectContainer(page.options[optionIndex]);
      if (!Number.isInteger(effectIndex) || effectIndex < 0 || effectIndex >= (option.effects?.length ?? 0)) {
        throw new Error(`Choice effect index ${effectIndex} is out of range`);
      }

      const [removedEffect] = option.effects.splice(effectIndex, 1);
      if (option.effects.length === 0) {
        delete option.effects;
      }
      page.options[optionIndex] = option;
      return {
        sceneId,
        pageIndex,
        optionIndex,
        effectIndex,
        removedEffect: cloneJsonValue(removedEffect),
      };
    },

    setChoiceOption({ sceneId, pageIndex, optionIndex, option }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'choice') {
        throw new Error('Choice options can only be edited on choice pages');
      }
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= (page.options?.length ?? 0)) {
        throw new Error(`Choice option index ${optionIndex} is out of range`);
      }

      page.options[optionIndex] = normalizeEffectContainer({
        ...cloneJsonValue(page.options[optionIndex]),
        ...cloneJsonValue(option ?? {}),
      });
      return { sceneId, pageIndex, optionIndex };
    },

    setChoicePage({ sceneId, pageIndex, prompt, options }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'choice') {
        throw new Error('Choice page data can only be edited on choice pages');
      }
      if (prompt !== undefined) {
        page.prompt = prompt ?? '';
      }
      if (options !== undefined) {
        if (!Array.isArray(options)) {
          throw new Error('Choice page options must be an array');
        }
        page.options = options.map((option) => normalizeEffectContainer(option));
      }
      return {
        sceneId,
        pageIndex,
        prompt: page.prompt ?? '',
        optionCount: Array.isArray(page.options) ? page.options.length : 0,
      };
    },

    addChoiceOption({ sceneId, pageIndex, option }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'choice') {
        throw new Error('Choice options can only be added to choice pages');
      }

      page.options ??= [];
      page.options.push(normalizeEffectContainer(cloneJsonValue(option ?? {})));
      return { sceneId, pageIndex, optionIndex: page.options.length - 1 };
    },

    removeChoiceOption({ sceneId, pageIndex, optionIndex }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'choice') {
        throw new Error('Choice options can only be removed from choice pages');
      }
      if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= (page.options?.length ?? 0)) {
        throw new Error(`Choice option index ${optionIndex} is out of range`);
      }

      page.options.splice(optionIndex, 1);
      return { sceneId, pageIndex, optionIndex };
    },

    moveChoiceOption({ sceneId, pageIndex, fromIndex, toIndex }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'choice') {
        throw new Error('Choice options can only be reordered on choice pages');
      }
      if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= (page.options?.length ?? 0)) {
        throw new Error(`Choice option from index ${fromIndex} is out of range`);
      }
      if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= (page.options?.length ?? 0)) {
        throw new Error(`Choice option to index ${toIndex} is out of range`);
      }

      const [option] = page.options.splice(fromIndex, 1);
      page.options.splice(toIndex, 0, option);
      return { sceneId, pageIndex, fromIndex, toIndex };
    },

    setConditionPage({ sceneId, pageIndex, condition }) {
      const page = getPage(script, sceneId, pageIndex);
      if (page.type !== 'condition') {
        throw new Error('Condition data can only be edited on condition pages');
      }

      const normalized = createDefaultConditionPage({
        ...cloneJsonValue(page),
        ...cloneJsonValue(condition ?? {}),
      }, script.systems.variables);
      Object.assign(page, normalized);
      return { sceneId, pageIndex };
    },

    validate(options) {
      return validateProject(script, options);
    },

    toJSON() {
      return cloneJsonValue(script);
    },
  };

  return session;
}
