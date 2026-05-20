import { createCharacterBlocking } from './layoutPresets.js';

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function slugifyId(value, fallback) {
  const source = typeof value === 'string' && value.trim() ? value : fallback;
  const slug = String(source)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-\u4e00-\u9fa5]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || fallback;
}

function normalizeExpressionHints(character = {}) {
  const hints = Array.isArray(character.expressionHints) && character.expressionHints.length > 0
    ? character.expressionHints
    : ['normal'];
  const expressions = {};

  for (const rawHint of hints) {
    const id = slugifyId(rawHint, 'normal');
    expressions[id] = character.expressions?.[id]
      ?? `characters/${character.id}_${id}.svg`;
  }

  return expressions;
}

function getLocationMap(draft = {}) {
  const map = new Map();
  for (const location of draft.locations ?? []) {
    if (!isPlainObject(location)) {
      continue;
    }
    const id = slugifyId(location.id ?? location.name, `location_${map.size + 1}`);
    map.set(id, {
      ...location,
      id,
      background: location.background ?? location.backgroundHint ?? '',
    });
  }
  return map;
}

function resolveBeatBackground(beat = {}, locations) {
  if (beat.background) {
    return beat.background;
  }

  const locationId = slugifyId(beat.location ?? beat.locationId, '');
  if (locationId && locations.has(locationId)) {
    return locations.get(locationId).background ?? '';
  }

  return beat.backgroundHint ?? '';
}

function getBeatCharacters(beat = {}) {
  if (!Array.isArray(beat.characters)) {
    return [];
  }

  return beat.characters
    .map((entry) => (typeof entry === 'string' ? entry : entry?.id))
    .filter((id) => typeof id === 'string' && id.trim())
    .map((id) => id.trim());
}

function getBeatExpressionHints(beat = {}) {
  const hints = {};
  if (Array.isArray(beat.characters)) {
    for (const entry of beat.characters) {
      if (isPlainObject(entry) && typeof entry.id === 'string' && entry.expression) {
        hints[entry.id] = entry.expression;
      }
    }
  }

  for (const dialogue of beat.dialogues ?? []) {
    if (dialogue?.speaker && dialogue.expression) {
      hints[dialogue.speaker] = dialogue.expression;
    }
  }

  return hints;
}

function normalizeDialogues(beat = {}) {
  return (beat.dialogues ?? [])
    .filter((dialogue) => isPlainObject(dialogue))
    .map((dialogue) => ({
      speaker: dialogue.speaker ?? null,
      text: dialogue.text ?? '',
      expression: dialogue.expression ?? null,
      voice: dialogue.voice ?? null,
    }));
}

function normalizeChoiceOptions(options = []) {
  return options
    .filter((option) => isPlainObject(option))
    .map((option) => ({
      text: option.text ?? '',
      target: option.target ?? null,
      effects: Array.isArray(option.effects) ? cloneJsonValue(option.effects) : [],
    }));
}

function createProvenance(kind, details = {}, raw = {}) {
  const provenance = {
    kind,
    ...details,
  };

  for (const key of ['sourceId', 'sourceBeatId', 'sourceRef', 'sourceSpan', 'proseSpan']) {
    if (raw[key] != null) {
      provenance[key] = cloneJsonValue(raw[key]);
    }
  }

  return provenance;
}

function stripProvenanceFields(value = {}) {
  const nextValue = cloneJsonValue(value);
  for (const key of ['sourceId', 'sourceBeatId', 'sourceRef', 'sourceSpan', 'proseSpan']) {
    delete nextValue[key];
  }
  return nextValue;
}

export function createNovelDraftPlan(draft = {}, options = {}) {
  if (!isPlainObject(draft)) {
    throw new Error('Novel draft must be a plain object');
  }

  const operations = [];
  const warnings = [];
  const locations = getLocationMap(draft);

  const variables = Array.isArray(draft.variables)
    ? draft.variables
    : Object.entries(draft.systems?.variables ?? {}).map(([id, variable]) => ({ id, ...variable }));
  for (const rawVariable of variables) {
    if (!isPlainObject(rawVariable)) {
      continue;
    }
    const id = slugifyId(rawVariable.id ?? rawVariable.name, `variable_${operations.length + 1}`);
    operations.push({
      id: `add-variable-${id}`,
      command: 'add-variable',
      provenance: createProvenance('variable', {
        variableId: id,
        variableIndex: operations.length,
      }, rawVariable),
      params: {
        ...stripProvenanceFields(rawVariable),
        id,
      },
    });
  }

  let characterCount = 0;
  for (const rawCharacter of draft.characters ?? []) {
    if (!isPlainObject(rawCharacter)) {
      continue;
    }
    characterCount += 1;
    const id = slugifyId(rawCharacter.id ?? rawCharacter.name, `character_${characterCount}`);
    operations.push({
      id: `add-character-${id}`,
      command: 'add-character',
      provenance: createProvenance('character', {
        characterId: id,
        characterIndex: characterCount - 1,
      }, rawCharacter),
      params: {
        ...stripProvenanceFields(rawCharacter),
        id,
        name: rawCharacter.name ?? id,
        expressions: normalizeExpressionHints({ ...rawCharacter, id }),
      },
    });
  }

  const scenes = Array.isArray(draft.scenes) ? draft.scenes : [];
  scenes.forEach((rawScene, sceneIndex) => {
    if (!isPlainObject(rawScene)) {
      return;
    }

    const sceneId = slugifyId(rawScene.id ?? rawScene.name, `scene_${sceneIndex + 1}`);
    operations.push({
      id: `add-scene-${sceneId}`,
      command: 'add-scene',
      provenance: createProvenance('scene', {
        sceneId,
        sceneIndex,
      }, rawScene),
      params: {
        id: sceneId,
        name: rawScene.name ?? sceneId,
        next: rawScene.next ?? null,
      },
    });

    const beats = Array.isArray(rawScene.beats) ? rawScene.beats : [];
    beats.forEach((beat, beatIndex) => {
      if (!isPlainObject(beat)) {
        return;
      }

      const pageId = beat.id ?? `p${beatIndex + 1}`;
      const beatCharacters = getBeatCharacters(beat);
      const basePageParams = {
        scene: sceneId,
        id: pageId,
        type: 'normal',
        background: resolveBeatBackground(beat, locations),
        characters: createCharacterBlocking(beatCharacters, getBeatExpressionHints(beat)),
        bgm: beat.bgm ? { file: beat.bgm, volume: beat.bgmVolume ?? 0.6 } : null,
        se: beat.se ? { file: beat.se } : null,
        dialogues: normalizeDialogues(beat),
        transition: beat.transition ?? { type: 'fade', duration: 800 },
      };

      operations.push({
        id: `add-page-${sceneId}-${pageId}`,
        command: 'add-page',
        provenance: createProvenance('beat', {
          sceneId,
          sceneIndex,
          beatId: pageId,
          beatIndex,
        }, beat),
        params: basePageParams,
      });

      const choice = beat.choice ?? beat.choices;
      if (isPlainObject(choice) && Array.isArray(choice.options)) {
        operations.push({
          id: `add-choice-${sceneId}-${pageId}`,
          command: 'add-page',
          provenance: createProvenance('choice', {
            sceneId,
            sceneIndex,
            beatId: pageId,
            beatIndex,
          }, choice),
          params: {
            ...basePageParams,
            id: `${pageId}_choice`,
            type: 'choice',
            prompt: choice.prompt ?? beat.prompt ?? '',
            options: normalizeChoiceOptions(choice.options),
          },
        });
      }

      if (beatCharacters.length > 3) {
        warnings.push({
          code: 'too-many-characters-for-preset',
          message: `Beat ${sceneId}:${beatIndex} has more than 3 characters; only the first 3 will be staged.`,
          sceneId,
          beatIndex,
        });
      }
    });
  });

  return {
    version: 1,
    title: options.title ?? draft.title ?? 'Draft import plan',
    source: {
      kind: 'novel-draft',
      projectId: draft.projectId ?? null,
    },
    operations,
    warnings,
  };
}
