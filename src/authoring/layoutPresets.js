const DEFAULT_EXPRESSION = 'normal';

export const LAYOUT_PRESETS = Object.freeze([
  'solo-center',
  'duo-left-right',
  'trio-left-center-right',
  'speaker-emphasis',
  'narration-no-character',
  'choice-focus',
]);

function characterEntry(characterId, overrides = {}) {
  return {
    id: characterId,
    expression: overrides.expression ?? DEFAULT_EXPRESSION,
    position: overrides.position ?? 'center',
    x: overrides.x ?? null,
    y: overrides.y ?? null,
    scale: overrides.scale ?? 1,
  };
}

function normalizeCharacterIds(characterIds = []) {
  return Array.isArray(characterIds)
    ? characterIds.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim())
    : [];
}

function normalizePresetName(preset) {
  return LAYOUT_PRESETS.includes(preset) ? preset : null;
}

function expressionFor(characterId, expressionHints = {}) {
  return expressionHints[characterId];
}

export function createLayoutPreset(preset, characterIds = [], expressionHints = {}, options = {}) {
  const ids = Array.isArray(characterIds)
    ? normalizeCharacterIds(characterIds)
    : [];
  const presetName = normalizePresetName(preset);

  if (!presetName || presetName === 'narration-no-character' || ids.length === 0) {
    return [];
  }

  if (presetName === 'solo-center') {
    return [
      characterEntry(ids[0], {
        position: 'center',
        expression: expressionFor(ids[0], expressionHints),
      }),
    ];
  }

  if (presetName === 'duo-left-right') {
    return [
      characterEntry(ids[0], {
        position: 'left',
        expression: expressionFor(ids[0], expressionHints),
      }),
      characterEntry(ids[1], {
        position: 'right',
        expression: expressionFor(ids[1], expressionHints),
      }),
    ].filter((entry) => entry.id);
  }

  if (presetName === 'trio-left-center-right') {
    return [
      characterEntry(ids[0], {
        position: 'left',
        expression: expressionFor(ids[0], expressionHints),
      }),
      characterEntry(ids[1], {
        position: 'center',
        expression: expressionFor(ids[1], expressionHints),
      }),
      characterEntry(ids[2], {
        position: 'right',
        expression: expressionFor(ids[2], expressionHints),
      }),
    ].filter((entry) => entry.id);
  }

  if (presetName === 'speaker-emphasis') {
    const speakerId = typeof options.speakerId === 'string' && options.speakerId.trim()
      ? options.speakerId.trim()
      : ids[0];
    const sideIds = ids.filter((id) => id !== speakerId).slice(0, 2);
    return [
      sideIds[0] ? characterEntry(sideIds[0], {
        position: 'left',
        expression: expressionFor(sideIds[0], expressionHints),
        scale: 0.92,
      }) : null,
      characterEntry(speakerId, {
        position: 'center',
        expression: expressionFor(speakerId, expressionHints),
        scale: 1.08,
      }),
      sideIds[1] ? characterEntry(sideIds[1], {
        position: 'right',
        expression: expressionFor(sideIds[1], expressionHints),
        scale: 0.92,
      }) : null,
    ].filter(Boolean);
  }

  return createCharacterBlocking(ids, expressionHints);
}

export function createCharacterBlocking(characterIds = [], expressionHints = {}, options = {}) {
  const ids = normalizeCharacterIds(characterIds);

  if (ids.length === 0) {
    return [];
  }

  if (options.preset) {
    return createLayoutPreset(options.preset, ids, expressionHints, options);
  }

  if (ids.length === 1) {
    return createLayoutPreset('solo-center', ids, expressionHints);
  }

  if (ids.length === 2) {
    return createLayoutPreset('duo-left-right', ids, expressionHints);
  }

  return createLayoutPreset('trio-left-center-right', ids, expressionHints);
}
