import { normalizeConditionPage } from '../shared/branchingContract.js';
import {
  getCharacterAnimationValue,
  getPageCameraContract,
  getRuntimeTransitionType,
} from '../shared/cinematicContract.js';
import { normalizeEffectContainer, normalizeEffects } from '../shared/effectDsl.js';
import { ensureGalgameContract } from '../shared/galgameContract.js';
import { validateProject } from '../shared/projectValidator.js';
import { collectSceneReferences } from '../shared/sceneGraph.js';
import { normalizeVariableRegistry } from '../shared/variableRegistry.js';

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

function createDefaultNormalPage(overrides = {}) {
  return {
    id: overrides.id,
    type: 'normal',
    background: overrides.background ?? '',
    characters: Array.isArray(overrides.characters) ? cloneJsonValue(overrides.characters) : [],
    bgm: overrides.bgm ?? null,
    se: overrides.se ?? null,
    dialogues: Array.isArray(overrides.dialogues) ? cloneJsonValue(overrides.dialogues) : [],
    transition: cloneJsonValue(overrides.transition ?? { type: 'fade', duration: 800 }),
    ...cloneJsonValue(overrides),
    type: 'normal',
  };
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
    transition: cloneJsonValue(overrides.transition ?? { type: 'fade', duration: 800 }),
    ...cloneJsonValue(overrides),
    options,
    type: 'choice',
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

function getScene(script, sceneId) {
  const id = assertNonEmptyString(sceneId, 'sceneId');
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
    }
  }

  return clearedReferenceCount;
}

function normalizePageTransitionInput(transition) {
  if (transition == null) {
    return null;
  }

  const type = typeof transition.type === 'string' && transition.type.trim()
    ? transition.type.trim()
    : getRuntimeTransitionType(transition.type);
  const duration = Number(transition.duration ?? 800);

  return {
    ...cloneJsonValue(transition),
    type,
    duration: Number.isFinite(duration) && duration >= 0 ? duration : 800,
  };
}

function normalizeScriptForAuthoring(script) {
  const normalized = ensureGalgameContract(script ?? {});
  normalized.systems.variables = normalizeVariableRegistry(normalized.systems.variables);

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
      const id = assertNonEmptyString(character?.id, 'character.id');
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
      const id = assertNonEmptyString(variable?.id, 'variable.id');
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

    addScene(scene) {
      const id = assertNonEmptyString(scene?.id, 'scene.id');
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
      const fromId = assertNonEmptyString(sceneId, 'sceneId');
      const toId = assertNonEmptyString(newSceneId, 'newSceneId');
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
      const id = assertNonEmptyString(sceneId, 'sceneId');
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
      const id = assertNonEmptyString(sceneId, 'sceneId');
      getScene(script, id);
      return {
        sceneId: id,
        references: collectSceneReferences(script, id),
      };
    },

    retargetSceneReferences({ fromSceneId, toSceneId }) {
      const fromId = assertNonEmptyString(fromSceneId, 'fromSceneId');
      const toId = assertNonEmptyString(toSceneId, 'toSceneId');
      getScene(script, fromId);
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

    clearSceneReferences({ sceneId }) {
      const id = assertNonEmptyString(sceneId, 'sceneId');
      getScene(script, id);
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

    addConditionPage({ sceneId, page = {}, ...pageFields }) {
      const scene = getScene(script, sceneId);
      const nextPage = createDefaultConditionPage({ ...page, ...pageFields }, script.systems.variables);
      scene.pages.push(nextPage);
      return { sceneId, pageIndex: scene.pages.length - 1 };
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
      };
    },

    setPageTransition({ sceneId, pageIndex, transition }) {
      const page = getPage(script, sceneId, pageIndex);
      page.transition = normalizePageTransitionInput(transition);
      return {
        sceneId,
        pageIndex,
        transition: cloneJsonValue(page.transition),
      };
    },

    setCharacterAnimation({ sceneId, pageIndex, characterId, animation }) {
      const id = assertNonEmptyString(characterId, 'characterId');
      const page = getPage(script, sceneId, pageIndex);
      if (!Array.isArray(page.characters)) {
        page.characters = [];
      }

      const character = page.characters.find(entry => entry?.id === id);
      if (!character) {
        throw new Error(`Character "${id}" is not staged on scene "${sceneId}" page ${pageIndex}`);
      }

      character.animation = getCharacterAnimationValue(animation);
      return {
        sceneId,
        pageIndex,
        characterId: id,
        animation: character.animation,
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
