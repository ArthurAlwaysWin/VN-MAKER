export const ENDING_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

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

function normalizeOrder(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

export function normalizeEndingId(endingId) {
  if (typeof endingId !== 'string') {
    return null;
  }

  const normalized = endingId.trim();
  return normalized || null;
}

export function isValidEndingId(endingId) {
  const normalized = normalizeEndingId(endingId);
  return Boolean(normalized && ENDING_ID_PATTERN.test(normalized));
}

export function normalizeEndingEntry(entry = {}, fallbackId = null) {
  const source = isPlainObject(entry) ? cloneJsonValue(entry) : {};
  const title = normalizeOptionalString(source.title ?? source.name ?? fallbackId) ?? 'Untitled Ending';
  const category = normalizeOptionalString(source.category) ?? 'main';
  const description = normalizeOptionalString(source.description) ?? '';
  const thumbnail = normalizeOptionalString(source.thumbnail);

  const normalized = {
    ...source,
    title,
    category,
    order: normalizeOrder(source.order),
    description,
    hiddenUntilUnlocked: Boolean(source.hiddenUntilUnlocked),
  };

  if (thumbnail) {
    normalized.thumbnail = thumbnail;
  } else {
    delete normalized.thumbnail;
  }
  delete normalized.name;
  delete normalized.id;
  return normalized;
}

export function normalizeEndingRegistry(registry = {}) {
  if (!isPlainObject(registry)) {
    return {};
  }

  const normalized = {};
  for (const [rawId, entry] of Object.entries(registry)) {
    const id = normalizeEndingId(rawId);
    if (!id) {
      continue;
    }
    normalized[id] = normalizeEndingEntry(entry, id);
  }
  return normalized;
}

function normalizeEffectsForReferences(option) {
  try {
    if (Array.isArray(option?.effects)) {
      return option.effects;
    }
    if (isPlainObject(option?.setVariable)) {
      return [];
    }
    return Array.isArray(option) ? option : [];
  } catch {
    return [];
  }
}

export function collectEndingUnlockReferences(scriptData = {}) {
  const references = [];

  for (const [sceneId, scene] of Object.entries(scriptData?.scenes ?? {})) {
    for (const [pageIndex, page] of (scene?.pages ?? []).entries()) {
      if (page?.type !== 'choice') {
        continue;
      }

      for (const [optionIndex, option] of (page.options ?? []).entries()) {
        normalizeEffectsForReferences(option).forEach((effect, effectIndex) => {
          if (effect?.type !== 'unlock:ending') {
            return;
          }

          references.push({
            kind: 'ending-unlock',
            endingId: effect.id,
            sceneId,
            sceneName: scene.name || sceneId,
            pageIndex,
            optionIndex,
            effectIndex,
            path: ['scenes', sceneId, 'pages', pageIndex, 'options', optionIndex, 'effects', effectIndex],
            pathString: `scenes.${sceneId}.pages.${pageIndex}.options.${optionIndex}.effects.${effectIndex}`,
          });
        });
      }
    }
  }

  return references;
}
