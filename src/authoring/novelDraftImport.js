import { createProjectSession } from './projectSession.js';
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

  if (beat.backgroundHint) {
    return beat.backgroundHint;
  }

  return '';
}

function getBeatCharacters(beat = {}) {
  if (Array.isArray(beat.characters)) {
    return beat.characters
      .map((entry) => (typeof entry === 'string' ? entry : entry?.id))
      .filter((id) => typeof id === 'string' && id.trim())
      .map((id) => id.trim());
  }

  return [];
}

function getBeatExpressionHints(beat = {}) {
  const hints = {};
  if (!Array.isArray(beat.characters)) {
    return hints;
  }

  for (const entry of beat.characters) {
    if (isPlainObject(entry) && typeof entry.id === 'string' && entry.expression) {
      hints[entry.id] = entry.expression;
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

export function importNovelDraft(draft = {}, options = {}) {
  if (!isPlainObject(draft)) {
    throw new Error('Novel draft must be a plain object');
  }

  const session = createProjectSession({
    script: options.baseScript ?? {
      projectId: draft.projectId,
      meta: {
        title: draft.title ?? 'Untitled Visual Novel',
        version: draft.version ?? '0.1.0',
        author: draft.author ?? 'AI Draft',
        resolution: { width: 1280, height: 720 },
      },
      characters: {},
      scenes: {},
    },
  });
  const locations = getLocationMap(draft);
  const created = {
    characters: [],
    scenes: [],
    pages: [],
  };
  const warnings = [];

  const variables = Array.isArray(draft.variables)
    ? draft.variables
    : Object.entries(draft.systems?.variables ?? {}).map(([id, variable]) => ({ id, ...variable }));
  for (const rawVariable of variables) {
    if (!isPlainObject(rawVariable)) {
      continue;
    }
    const id = slugifyId(rawVariable.id ?? rawVariable.name, `variable_${Object.keys(session.toJSON().systems.variables).length + 1}`);
    session.addVariable({
      ...rawVariable,
      id,
    });
  }

  for (const rawCharacter of draft.characters ?? []) {
    if (!isPlainObject(rawCharacter)) {
      continue;
    }

    const id = slugifyId(rawCharacter.id ?? rawCharacter.name, `character_${created.characters.length + 1}`);
    session.addCharacter({
      ...rawCharacter,
      id,
      name: rawCharacter.name ?? id,
      expressions: normalizeExpressionHints({ ...rawCharacter, id }),
    });
    created.characters.push(id);
  }

  const scenes = Array.isArray(draft.scenes) ? draft.scenes : [];
  for (const rawScene of scenes) {
    if (!isPlainObject(rawScene)) {
      continue;
    }

    const sceneId = slugifyId(rawScene.id ?? rawScene.name, `scene_${created.scenes.length + 1}`);
    session.addScene({
      id: sceneId,
      name: rawScene.name ?? sceneId,
      next: rawScene.next ?? null,
    });
    created.scenes.push(sceneId);

    const beats = Array.isArray(rawScene.beats) ? rawScene.beats : [];
    beats.forEach((beat, beatIndex) => {
      if (!isPlainObject(beat)) {
        return;
      }

      const beatCharacters = getBeatCharacters(beat);
      const result = session.addNormalPage({
        sceneId,
        id: beat.id ?? `p${beatIndex + 1}`,
        background: resolveBeatBackground(beat, locations),
        characters: createCharacterBlocking(beatCharacters, getBeatExpressionHints(beat)),
        bgm: beat.bgm ? { file: beat.bgm, volume: beat.bgmVolume ?? 0.6 } : null,
        se: beat.se ? { file: beat.se } : null,
        dialogues: normalizeDialogues(beat),
        transition: beat.transition ?? { type: 'fade', duration: 800 },
      });
      created.pages.push({ sceneId, pageIndex: result.pageIndex, type: 'normal' });

      const choice = beat.choice ?? beat.choices;
      if (isPlainObject(choice) && Array.isArray(choice.options)) {
        const choiceResult = session.addChoicePage({
          sceneId,
          id: `${beat.id ?? `p${beatIndex + 1}`}_choice`,
          background: resolveBeatBackground(beat, locations),
          characters: createCharacterBlocking(beatCharacters, getBeatExpressionHints(beat)),
          prompt: choice.prompt ?? beat.prompt ?? '',
          options: normalizeChoiceOptions(choice.options),
          transition: beat.transition ?? { type: 'fade', duration: 800 },
        });
        created.pages.push({ sceneId, pageIndex: choiceResult.pageIndex, type: 'choice' });
      }

      if (beatCharacters.length > 3) {
        warnings.push({
          code: 'too-many-characters-for-preset',
          message: `Beat ${sceneId}:${beatIndex} has more than 3 characters; only the first 3 were staged.`,
          sceneId,
          beatIndex,
        });
      }
    });
  }

  const script = session.toJSON();
  const validation = session.validate();

  return {
    script,
    summary: created,
    warnings,
    validation,
  };
}
