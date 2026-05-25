export const CG_ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

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

function normalizeImages(images) {
  const source = Array.isArray(images) ? images : [];
  return [...new Set(source.map(normalizeOptionalString).filter(Boolean))];
}

export function normalizeCgId(cgId) {
  if (typeof cgId !== 'string') {
    return null;
  }

  const normalized = cgId.trim();
  return normalized || null;
}

export function isValidCgId(cgId) {
  const normalized = normalizeCgId(cgId);
  return Boolean(normalized && CG_ID_PATTERN.test(normalized));
}

export function normalizeCgEntry(entry = {}, fallbackId = null) {
  const source = isPlainObject(entry) ? cloneJsonValue(entry) : {};
  const title = normalizeOptionalString(source.title ?? source.name ?? fallbackId) ?? 'Untitled CG';
  const images = normalizeImages(source.images ?? (source.image ? [source.image] : []));
  const thumbnail = normalizeOptionalString(source.thumbnail ?? images[0]);
  const lockedThumbnail = normalizeOptionalString(source.lockedThumbnail);

  const normalized = {
    ...source,
    title,
    images,
    category: normalizeOptionalString(source.category) ?? 'main',
    order: normalizeOrder(source.order),
    description: normalizeOptionalString(source.description) ?? '',
  };

  if (thumbnail) {
    normalized.thumbnail = thumbnail;
  } else {
    delete normalized.thumbnail;
  }
  if (lockedThumbnail) {
    normalized.lockedThumbnail = lockedThumbnail;
  } else {
    delete normalized.lockedThumbnail;
  }
  delete normalized.name;
  delete normalized.image;
  delete normalized.id;
  return normalized;
}

export function normalizeCgRegistry(registry = {}) {
  if (!isPlainObject(registry)) {
    return {};
  }

  const normalized = {};
  for (const [rawId, entry] of Object.entries(registry)) {
    const id = normalizeCgId(rawId);
    if (!id) {
      continue;
    }
    normalized[id] = normalizeCgEntry(entry, id);
  }
  return normalized;
}

export function collectCgUnlockReferences(scriptData = {}) {
  const references = [];

  for (const [sceneId, scene] of Object.entries(scriptData?.scenes ?? {})) {
    for (const [pageIndex, page] of (scene?.pages ?? []).entries()) {
      if (page?.type !== 'choice') {
        continue;
      }

      for (const [optionIndex, option] of (page.options ?? []).entries()) {
        for (const [effectIndex, effect] of (option?.effects ?? []).entries()) {
          if (effect?.type !== 'unlock:cg') {
            continue;
          }

          references.push({
            kind: 'cg-unlock',
            cgId: effect.id,
            sceneId,
            sceneName: scene.name || sceneId,
            pageIndex,
            optionIndex,
            effectIndex,
            path: ['scenes', sceneId, 'pages', pageIndex, 'options', optionIndex, 'effects', effectIndex],
            pathString: `scenes.${sceneId}.pages.${pageIndex}.options.${optionIndex}.effects.${effectIndex}`,
          });
        }
      }
    }
  }

  return references;
}
