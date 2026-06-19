import { defineStore } from 'pinia';
import { normalizeUiMotion } from '../../shared/uiMotionContract.js';
import { applyUiStylePresetToScript } from '../../shared/uiStylePresetContract.js';
import { computed, reactive, ref, shallowRef, toRaw } from 'vue';
import { normalizeConditionPage, normalizeConditionPages } from '../../shared/branchingContract.js';
import { DEFAULT_PAGE_CAMERA, copyPageCinematicFields } from '../../shared/cinematicContract.js';
import { normalizeEffectContainer } from '../../shared/effectDsl.js';
import { collectCgUnlockReferences, normalizeCgRegistry } from '../../shared/cgRegistry.js';
import {
  collectEndingUnlockReferences,
  normalizeEndingRegistry,
} from '../../shared/endingRegistry.js';
import { ensureGalgameContract } from '../../shared/galgameContract.js';
import { migrateLegacyAppliedThemeData } from '../../shared/themeLegacyMigrations.js';
import {
  collectVariableReferences,
  createAffectionVariableEntry,
  createAffectionVariableId,
  normalizeVariableRegistry,
} from '../../shared/variableRegistry.js';
import { normalizeVideoRegistry } from '../../shared/videoContract.js';
import { replaceTextTemplateVariableId } from '../../shared/textTemplate.js';
import { replaceUiImagePathReferences } from '../../shared/uiImageContract.js';

const DRAFT_VARIABLE_PREFIX = '__draft_variable__';
const DRAFT_ENDING_PREFIX = '__draft_ending__';
const DRAFT_CG_PREFIX = '__draft_cg__';
const DRAFT_VIDEO_PREFIX = '__draft_video__';

function slugifyVariableId(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
}

function slugifyEndingId(value) {
  return slugifyVariableId(value);
}

function slugifyVideoId(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!normalized) return '';
  return /^[a-z_]/.test(normalized) ? normalized : `video_${normalized}`;
}

function formatVariableReferenceLocation(reference = {}) {
  const sceneName = reference.sceneName || reference.sceneId || '未命名场景';
  const pageLabel = `第 ${Number(reference.pageIndex ?? 0) + 1} 页`;
  if (reference.source === 'input-target') {
    return `${sceneName} > ${pageLabel} > 文本输入变量`;
  }
  if (reference.source?.endsWith('-template')) {
    return `${sceneName} > ${pageLabel} > 文本变量`;
  }
  if (reference.source === 'choice-effect') {
    return `${sceneName} > ${pageLabel} > 选项 ${reference.optionIndex + 1} > 效果 ${reference.effectIndex + 1}`;
  }

  return `${sceneName} > ${pageLabel} > 条件 ${reference.conditionIndex + 1}`;
}

function normalizeStoryEffects(scriptData) {
  if (!scriptData?.scenes) {
    return scriptData;
  }

  for (const scene of Object.values(scriptData.scenes)) {
    if (!Array.isArray(scene?.pages)) {
      continue;
    }

    for (const page of scene.pages) {
      if (!page) {
        continue;
      }

      if (page.type === 'normal') {
        const normalizedPage = normalizeEffectContainer(page);
        delete page.effects;
        delete page.setVariable;
        Object.assign(page, normalizedPage);
      }

      if (page.type === 'choice') {
        page.options = Array.isArray(page.options)
          ? page.options.map((option) => normalizeEffectContainer(option))
          : [];
      }
    }
  }

  return scriptData;
}

function normalizeStoryContracts(scriptData) {
  if (!scriptData) {
    return scriptData;
  }

  scriptData.systems ??= {};
  scriptData.systems.variables = normalizeVariableRegistry(scriptData.systems.variables);
  scriptData.systems.endings = normalizeEndingRegistry(scriptData.systems.endings);
  scriptData.systems.gallery ??= {};
  scriptData.systems.gallery.cg = normalizeCgRegistry(scriptData.systems.gallery.cg);
  scriptData.assets ??= {};
  scriptData.assets.videos = normalizeVideoRegistry(scriptData.assets.videos);
  normalizeStoryEffects(scriptData);
  normalizeConditionPages(scriptData, {
    registry: scriptData.systems.variables,
  });
  return scriptData;
}

function isVariableEffect(effect) {
  return effect?.type === 'var:set'
    || effect?.type === 'var:add'
    || effect?.type === 'var:sub';
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
      rewriteCount++;
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

export const useScriptStore = defineStore('script', () => {
  const data = ref(null);
  const isLoading = ref(false);
  const _skipWatch = ref(false);
  const changeRevision = ref(0);
  const selectedVariableId = ref(null);
  const selectedEndingId = ref(null);
  const selectedCgId = ref(null);
  const storySystemsPanel = ref('variables');
  const storySystemsRepairRequest = ref(null);

  // Undo/Redo history
  const history = shallowRef([]);
  const historyIndex = ref(-1);
  let pendingPatches = [];
  let pendingInversePatches = [];
  let trackingSuspended = false;
  let rawByTrackedProxy = new WeakMap();

  function clonePatchValue(value) {
    const rawValue = unwrapTrackedValue(toRaw(value));
    if (rawValue === undefined || rawValue === null || typeof rawValue !== 'object') {
      return rawValue;
    }
    return JSON.parse(JSON.stringify(rawValue));
  }

  function unwrapTrackedValue(value) {
    let current = value;
    while (current && typeof current === 'object' && rawByTrackedProxy.has(current)) {
      current = rawByTrackedProxy.get(current);
    }
    return current;
  }

  function recordMutation(patch, inversePatch) {
    if (trackingSuspended) return;
    pendingPatches.push(patch);
    pendingInversePatches.unshift(inversePatch);
    changeRevision.value++;
  }

  function createTrackedScriptData(scriptData) {
    const proxyByRaw = new WeakMap();
    const pathByRaw = new WeakMap();
    rawByTrackedProxy = new WeakMap();

    const wrap = (value, path = []) => {
      const rawValue = unwrapTrackedValue(toRaw(value));
      if (!rawValue || typeof rawValue !== 'object') return rawValue;
      pathByRaw.set(rawValue, path);
      if (proxyByRaw.has(rawValue)) return proxyByRaw.get(rawValue);

      const proxy = new Proxy(rawValue, {
        get(target, key, receiver) {
          const result = Reflect.get(target, key, receiver);
          if (!result || typeof result !== 'object') return result;
          const currentPath = pathByRaw.get(target) ?? path;
          return wrap(result, [...currentPath, key]);
        },
        set(target, key, nextValue, receiver) {
          const hadValue = Object.prototype.hasOwnProperty.call(target, key);
          const previousValue = target[key];
          const previousArrayLength = Array.isArray(target) ? target.length : null;
          const unwrappedNext = unwrapTrackedValue(toRaw(nextValue));
          if (hadValue && Object.is(previousValue, unwrappedNext)) return true;

          const currentPath = pathByRaw.get(target) ?? path;
          const patchPath = [...currentPath, key];
          const patch = {
            op: hadValue ? 'replace' : 'add',
            path: patchPath,
            value: clonePatchValue(unwrappedNext),
          };
          const isNewArrayIndex = !hadValue
            && Array.isArray(target)
            && Number.isInteger(Number(key))
            && Number(key) >= previousArrayLength;
          const inversePatch = hadValue
            ? { op: 'replace', path: patchPath, value: clonePatchValue(previousValue) }
            : isNewArrayIndex
              ? { op: 'set-array-length', path: currentPath, value: previousArrayLength }
              : { op: 'remove', path: patchPath };
          const changed = Reflect.set(target, key, unwrappedNext);
          if (changed) {
            if (unwrappedNext && typeof unwrappedNext === 'object') {
              pathByRaw.set(unwrappedNext, patchPath);
            }
            recordMutation(patch, inversePatch);
          }
          return changed;
        },
        deleteProperty(target, key) {
          if (!Object.prototype.hasOwnProperty.call(target, key)) return true;
          const currentPath = pathByRaw.get(target) ?? path;
          const patchPath = [...currentPath, key];
          const previousValue = target[key];
          const changed = Reflect.deleteProperty(target, key);
          if (changed) {
            recordMutation(
              { op: 'remove', path: patchPath },
              { op: 'add', path: patchPath, value: clonePatchValue(previousValue) },
            );
          }
          return changed;
        },
      });
      proxyByRaw.set(rawValue, proxy);
      rawByTrackedProxy.set(proxy, rawValue);
      return proxy;
    };

    return reactive(wrap(scriptData));
  }

  function applyPatch(patch) {
    if (!data.value || !patch?.path) return;
    let target = data.value;
    const targetDepth = patch.op === 'set-array-length' ? patch.path.length : patch.path.length - 1;
    for (let index = 0; index < targetDepth; index++) {
      target = target[patch.path[index]];
    }
    if (patch.op === 'set-array-length') {
      target.length = patch.value;
      return;
    }
    if (patch.path.length === 0) return;
    const key = patch.path[patch.path.length - 1];
    if (patch.op === 'remove') {
      delete target[key];
    } else {
      target[key] = clonePatchValue(patch.value);
    }
  }

  function applyPatches(patches) {
    trackingSuspended = true;
    try {
      for (const patch of patches) applyPatch(patch);
    } finally {
      trackingSuspended = false;
    }
  }
  const conditionPageIssues = computed(() => {
    const issues = [];
    if (!data.value?.scenes) {
      return issues;
    }

    for (const [sceneId, scene] of Object.entries(data.value.scenes)) {
      (scene.pages || []).forEach((page, pageIndex) => {
        if (page?.type !== 'condition' || !page?.unresolvedCondition) {
          return;
        }

        issues.push({
          sceneId,
          sceneName: scene.name || sceneId,
          pageIndex,
          variableId: page.unresolvedCondition.variableId ?? null,
          message: `条件页“${scene.name || sceneId} / 第 ${pageIndex + 1} 页”仍需修复后才能保存。`,
        });
      });
    }

    return issues;
  });
  const canSaveConditionPages = computed(() => conditionPageIssues.value.length === 0);

  function pushState() {
    if (!data.value) return;
    if (pendingPatches.length === 0) return;
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }
    history.value = [...history.value, {
      patches: pendingPatches,
      inversePatches: pendingInversePatches,
    }];
    pendingPatches = [];
    pendingInversePatches = [];
    historyIndex.value++;
    if (history.value.length > 50) {
      history.value = history.value.slice(1);
      historyIndex.value--;
    }
  }

  function undo() {
    pushState();
    if (historyIndex.value > 0) {
      const entry = history.value[historyIndex.value];
      applyPatches(entry.inversePatches ?? []);
      historyIndex.value--;
      changeRevision.value++;
    }
  }

  function redo() {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++;
      const entry = history.value[historyIndex.value];
      applyPatches(entry.patches ?? []);
      changeRevision.value++;
    }
  }

  function loadFromData(scriptData) {
    const normalized = normalizeStoryContracts(
      ensureGalgameContract(migrateLegacyAppliedThemeData(scriptData).script),
    );
    trackingSuspended = true;
    data.value = createTrackedScriptData(normalized);
    trackingSuspended = false;
    pendingPatches = [];
    pendingInversePatches = [];
    history.value = [{ patches: [], inversePatches: [] }];
    historyIndex.value = 0;
  }

  function reset() {
    data.value = null;
    history.value = [];
    historyIndex.value = -1;
    pendingPatches = [];
    pendingInversePatches = [];
    selectedVariableId.value = null;
    selectedEndingId.value = null;
    selectedCgId.value = null;
    storySystemsPanel.value = 'variables';
    storySystemsRepairRequest.value = null;
  }

  function selectVariable(variableId) {
    selectedVariableId.value = typeof variableId === 'string' && variableId.trim()
      ? variableId.trim()
      : null;
    if (selectedVariableId.value) {
      storySystemsPanel.value = 'variables';
    }
  }

  function selectEnding(endingId) {
    selectedEndingId.value = typeof endingId === 'string' && endingId.trim()
      ? endingId.trim()
      : null;
    if (selectedEndingId.value) {
      storySystemsPanel.value = 'endings';
    }
  }

  function selectCg(cgId) {
    selectedCgId.value = typeof cgId === 'string' && cgId.trim()
      ? cgId.trim()
      : null;
    if (selectedCgId.value) {
      storySystemsPanel.value = 'cgs';
    }
  }

  function selectStorySystemsPanel(panel) {
    storySystemsPanel.value = ['endings', 'cgs', 'graph'].includes(panel) ? panel : 'variables';
  }

  function ensureVariableRegistryState() {
    if (!data.value) {
      return null;
    }

    data.value.systems ??= {};
    data.value.systems.variables = normalizeVariableRegistry(data.value.systems.variables);
    return data.value.systems.variables;
  }

  function ensureEndingRegistryState() {
    if (!data.value) {
      return null;
    }

    data.value.systems ??= {};
    data.value.systems.endings = normalizeEndingRegistry(data.value.systems.endings);
    return data.value.systems.endings;
  }

  function ensureCgRegistryState() {
    if (!data.value) {
      return null;
    }

    data.value.systems ??= {};
    data.value.systems.gallery ??= {};
    data.value.systems.gallery.cg = normalizeCgRegistry(data.value.systems.gallery.cg);
    return data.value.systems.gallery.cg;
  }

  function ensureVideoRegistryState() {
    if (!data.value) {
      return null;
    }

    data.value.assets ??= {};
    data.value.assets.videos = normalizeVideoRegistry(data.value.assets.videos);
    return data.value.assets.videos;
  }

  function createVariableDraft() {
    const registry = ensureVariableRegistryState();
    if (!registry) {
      return null;
    }

    let index = 1;
    let draftId = `${DRAFT_VARIABLE_PREFIX}${index}`;
    while (registry[draftId]) {
      index++;
      draftId = `${DRAFT_VARIABLE_PREFIX}${index}`;
    }

    registry[draftId] = {
      label: '',
      type: 'bool',
      initial: false,
      group: '',
      notes: '',
    };
    selectVariable(draftId);
    pushState();
    return draftId;
  }

  function updateVariableFields(variableId, changes = {}) {
    const registry = ensureVariableRegistryState();
    if (!registry || !registry[variableId]) {
      return false;
    }

    const normalizedChanges = { ...changes };
    if (normalizedChanges.name !== undefined && normalizedChanges.label === undefined) {
      normalizedChanges.label = normalizedChanges.name;
      delete normalizedChanges.name;
    }

    registry[variableId] = normalizeVariableRegistry({
      [variableId]: {
        ...registry[variableId],
        ...normalizedChanges,
      },
    })[variableId];
    pushState();
    return true;
  }

  function createAffectionVariable(characterId) {
    const registry = ensureVariableRegistryState();
    const character = data.value?.characters?.[characterId];
    if (!registry || !character) {
      return { success: false, error: 'missing-character' };
    }

    const variableId = createAffectionVariableId(characterId);
    if (!variableId) {
      return { success: false, error: 'invalid-character-id' };
    }

    if (registry[variableId]) {
      selectVariable(variableId);
      return { success: true, variableId, alreadyExists: true };
    }

    registry[variableId] = createAffectionVariableEntry({
      characterId,
      characterName: character.name || characterId,
      group: '好感度',
    });
    selectVariable(variableId);
    pushState();
    return { success: true, variableId, alreadyExists: false };
  }

  function createEndingDraft() {
    const endings = ensureEndingRegistryState();
    if (!endings) {
      return null;
    }

    let index = 1;
    let draftId = `${DRAFT_ENDING_PREFIX}${index}`;
    while (endings[draftId]) {
      index++;
      draftId = `${DRAFT_ENDING_PREFIX}${index}`;
    }

    endings[draftId] = {
      title: '',
      category: 'main',
      order: Object.keys(endings).length,
      description: '',
      hiddenUntilUnlocked: false,
    };
    selectEnding(draftId);
    pushState();
    return draftId;
  }

  function updateEndingFields(endingId, changes = {}) {
    const endings = ensureEndingRegistryState();
    if (!endings || !endings[endingId]) {
      return false;
    }

    endings[endingId] = normalizeEndingRegistry({
      [endingId]: {
        ...endings[endingId],
        ...changes,
      },
    })[endingId];
    pushState();
    return true;
  }

  function findEndingReferences(endingId) {
    if (!endingId) {
      return [];
    }

    return collectEndingUnlockReferences(data.value ?? {})
      .filter((reference) => reference.endingId === endingId)
      .map((reference) => ({
        ...reference,
        locationText: reference.optionIndex == null
          ? `${reference.sceneName || reference.sceneId || '未命名场景'} > 第 ${reference.pageIndex + 1} 页 > 进入页效果 ${reference.effectIndex + 1}`
          : `${reference.sceneName || reference.sceneId || '未命名场景'} > 第 ${reference.pageIndex + 1} 页 > 选项 ${reference.optionIndex + 1} > 效果 ${reference.effectIndex + 1}`,
      }));
  }

  function renameEnding(endingId, nextEndingId, options = {}) {
    const endings = ensureEndingRegistryState();
    if (!endings || !endings[endingId]) {
      return { success: false, error: 'missing-ending' };
    }

    const normalizedId = slugifyEndingId(nextEndingId);
    if (!normalizedId) {
      return { success: false, error: 'empty-id' };
    }

    if (normalizedId === endingId) {
      return { success: true, endingId };
    }

    if (endings[normalizedId]) {
      return { success: false, error: 'duplicate-id' };
    }

    const references = findEndingReferences(endingId);
    if (options.previewOnly) {
      return {
        success: true,
        endingId: normalizedId,
        references,
        rewriteCount: references.length,
      };
    }

    let rewriteCount = 0;
    for (const scene of Object.values(data.value?.scenes ?? {})) {
      for (const page of scene.pages || []) {
        if (page?.type === 'normal') {
          const normalizedPage = normalizeEffectContainer(page);
          normalizedPage.effects = (normalizedPage.effects || []).map((effect) => {
            if (effect?.type !== 'unlock:ending' || effect.id !== endingId) {
              return effect;
            }

            rewriteCount++;
            return { ...effect, id: normalizedId };
          });
          if (normalizedPage.effects.length === 0) {
            delete normalizedPage.effects;
          }
          delete page.effects;
          Object.assign(page, normalizedPage);
        }

        if (page?.type !== 'choice') {
          continue;
        }

        page.options = (page.options || []).map((option) => {
          const normalizedOption = normalizeEffectContainer(option);
          normalizedOption.effects = (normalizedOption.effects || []).map((effect) => {
            if (effect?.type !== 'unlock:ending' || effect.id !== endingId) {
              return effect;
            }

            rewriteCount++;
            return { ...effect, id: normalizedId };
          });
          if (normalizedOption.effects.length === 0) {
            delete normalizedOption.effects;
          }
          return normalizedOption;
        });
      }
    }

    endings[normalizedId] = endings[endingId];
    delete endings[endingId];
    selectEnding(normalizedId);
    pushState();
    return {
      success: true,
      endingId: normalizedId,
      references,
      rewriteCount,
    };
  }

  function deleteEnding(endingId, options = {}) {
    const endings = ensureEndingRegistryState();
    if (!endings || !endings[endingId]) {
      return { success: false, error: 'missing-ending' };
    }

    const references = findEndingReferences(endingId);
    if (options.previewOnly) {
      return {
        success: true,
        references,
        cleanupCount: references.length,
      };
    }

    let deletedReferenceCount = 0;
    for (const scene of Object.values(data.value?.scenes ?? {})) {
      for (const page of scene.pages || []) {
        if (page?.type === 'normal') {
          const normalizedPage = normalizeEffectContainer(page);
          const nextEffects = (normalizedPage.effects || []).filter((effect) => {
            const keep = effect?.type !== 'unlock:ending' || effect.id !== endingId;
            if (!keep) {
              deletedReferenceCount++;
            }
            return keep;
          });
          if (nextEffects.length > 0) {
            normalizedPage.effects = nextEffects;
          } else {
            delete normalizedPage.effects;
          }
          delete page.effects;
          Object.assign(page, normalizedPage);
        }

        if (page?.type !== 'choice') {
          continue;
        }

        page.options = (page.options || []).map((option) => {
          const normalizedOption = normalizeEffectContainer(option);
          const nextEffects = (normalizedOption.effects || []).filter((effect) => {
            const keep = effect?.type !== 'unlock:ending' || effect.id !== endingId;
            if (!keep) {
              deletedReferenceCount++;
            }
            return keep;
          });
          if (nextEffects.length > 0) {
            normalizedOption.effects = nextEffects;
          } else {
            delete normalizedOption.effects;
          }
          return normalizedOption;
        });
      }
    }

    delete endings[endingId];
    if (selectedEndingId.value === endingId) {
      const remainingIds = Object.keys(endings);
      selectEnding(remainingIds[0] ?? null);
    }

    pushState();
    return {
      success: true,
      references,
      deletedReferenceCount,
    };
  }

  function createCgDraft() {
    const cgs = ensureCgRegistryState();
    if (!cgs) {
      return null;
    }

    let index = 1;
    let draftId = `${DRAFT_CG_PREFIX}${index}`;
    while (cgs[draftId]) {
      index++;
      draftId = `${DRAFT_CG_PREFIX}${index}`;
    }

    cgs[draftId] = {
      title: '',
      images: [],
      category: 'main',
      order: Object.keys(cgs).length,
      description: '',
    };
    selectCg(draftId);
    pushState();
    return draftId;
  }

  function createVideoDraft() {
    const videos = ensureVideoRegistryState();
    if (!videos) {
      return null;
    }

    let index = 1;
    let draftId = `${DRAFT_VIDEO_PREFIX}${index}`;
    while (videos[draftId]) {
      index++;
      draftId = `${DRAFT_VIDEO_PREFIX}${index}`;
    }

    videos[draftId] = {
      label: '',
      kind: 'other',
      tags: [],
    };
    pushState();
    return draftId;
  }

  function updateVideoFields(videoId, changes = {}) {
    const videos = ensureVideoRegistryState();
    if (!videos || !videos[videoId]) {
      return false;
    }

    videos[videoId] = normalizeVideoRegistry({
      [videoId]: {
        ...videos[videoId],
        ...changes,
      },
    })[videoId];
    pushState();
    return true;
  }

  function renameVideo(videoId, nextVideoId) {
    const videos = ensureVideoRegistryState();
    if (!videos || !videos[videoId]) {
      return { success: false, error: 'missing-video' };
    }

    const normalizedId = slugifyVideoId(nextVideoId);
    if (!normalizedId) {
      return { success: false, error: 'empty-id' };
    }
    if (normalizedId === videoId) {
      return { success: true, videoId };
    }
    if (videos[normalizedId]) {
      return { success: false, error: 'duplicate-id' };
    }

    videos[normalizedId] = videos[videoId];
    delete videos[videoId];
    rewriteVideoReferences(videoId, normalizedId);
    pushState();
    return { success: true, videoId: normalizedId };
  }

  function deleteVideo(videoId) {
    const videos = ensureVideoRegistryState();
    if (!videos || !videos[videoId]) {
      return { success: false, error: 'missing-video' };
    }

    delete videos[videoId];
    clearVideoReferences(videoId);
    pushState();
    return { success: true, videoId };
  }

  function rewriteVideoReferences(fromVideoId, toVideoId) {
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (node.videoId === fromVideoId) {
        node.videoId = toVideoId;
      }
      Object.values(node).forEach(visit);
    }
    visit(data.value?.ui?.titleScreen?.openingVideo);
    visit(data.value?.systems?.endings);
    visit(data.value?.scenes);
  }

  function clearVideoReferences(videoId) {
    const hasDirectFile = (reference) => reference
      && typeof reference === 'object'
      && typeof reference.file === 'string'
      && reference.file.trim();

    function maybeClear(reference) {
      if (!reference || typeof reference !== 'object' || reference.videoId !== videoId) return false;
      delete reference.videoId;
      return !hasDirectFile(reference);
    }

    if (maybeClear(data.value?.ui?.titleScreen?.openingVideo)) {
      delete data.value.ui.titleScreen.openingVideo;
    }
    for (const ending of Object.values(data.value?.systems?.endings ?? {})) {
      if (maybeClear(ending?.endingVideo)) {
        delete ending.endingVideo;
      }
    }
    for (const scene of Object.values(data.value?.scenes ?? {})) {
      if (!Array.isArray(scene?.pages)) continue;
      for (let pageIndex = scene.pages.length - 1; pageIndex >= 0; pageIndex -= 1) {
        const page = scene.pages[pageIndex];
        if (page?.type === 'video' && maybeClear(page.video)) {
          scene.pages.splice(pageIndex, 1);
        }
      }
    }
  }

  function updateCgFields(cgId, changes = {}) {
    const cgs = ensureCgRegistryState();
    if (!cgs || !cgs[cgId]) {
      return false;
    }

    cgs[cgId] = normalizeCgRegistry({
      [cgId]: {
        ...cgs[cgId],
        ...changes,
      },
    })[cgId];
    pushState();
    return true;
  }

  function findCgReferences(cgId) {
    if (!cgId) {
      return [];
    }

    return collectCgUnlockReferences(data.value ?? {})
      .filter((reference) => reference.cgId === cgId)
      .map((reference) => ({
        ...reference,
        locationText: reference.optionIndex == null
          ? `${reference.sceneName || reference.sceneId || '未命名场景'} > 第 ${reference.pageIndex + 1} 页 > 进入页效果 ${reference.effectIndex + 1}`
          : `${reference.sceneName || reference.sceneId || '未命名场景'} > 第 ${reference.pageIndex + 1} 页 > 选项 ${reference.optionIndex + 1} > 效果 ${reference.effectIndex + 1}`,
      }));
  }

  function renameCg(cgId, nextCgId, options = {}) {
    const cgs = ensureCgRegistryState();
    if (!cgs || !cgs[cgId]) {
      return { success: false, error: 'missing-cg' };
    }

    const normalizedId = slugifyVariableId(nextCgId);
    if (!normalizedId) {
      return { success: false, error: 'empty-id' };
    }
    if (normalizedId === cgId) {
      return { success: true, cgId };
    }
    if (cgs[normalizedId]) {
      return { success: false, error: 'duplicate-id' };
    }

    const references = findCgReferences(cgId);
    if (options.previewOnly) {
      return { success: true, cgId: normalizedId, references, rewriteCount: references.length };
    }

    let rewriteCount = 0;
    for (const scene of Object.values(data.value?.scenes ?? {})) {
      for (const page of scene.pages || []) {
        if (page?.type === 'normal') {
          const normalizedPage = normalizeEffectContainer(page);
          normalizedPage.effects = (normalizedPage.effects || []).map((effect) => {
            if (effect?.type !== 'unlock:cg' || effect.id !== cgId) return effect;
            rewriteCount++;
            return { ...effect, id: normalizedId };
          });
          if (normalizedPage.effects.length === 0) delete normalizedPage.effects;
          delete page.effects;
          Object.assign(page, normalizedPage);
        }

        if (page?.type !== 'choice') continue;
        page.options = (page.options || []).map((option) => {
          const normalizedOption = normalizeEffectContainer(option);
          normalizedOption.effects = (normalizedOption.effects || []).map((effect) => {
            if (effect?.type !== 'unlock:cg' || effect.id !== cgId) return effect;
            rewriteCount++;
            return { ...effect, id: normalizedId };
          });
          if (normalizedOption.effects.length === 0) delete normalizedOption.effects;
          return normalizedOption;
        });
      }
    }

    cgs[normalizedId] = cgs[cgId];
    delete cgs[cgId];
    selectCg(normalizedId);
    pushState();
    return { success: true, cgId: normalizedId, references, rewriteCount };
  }

  function deleteCg(cgId, options = {}) {
    const cgs = ensureCgRegistryState();
    if (!cgs || !cgs[cgId]) {
      return { success: false, error: 'missing-cg' };
    }

    const references = findCgReferences(cgId);
    if (options.previewOnly) {
      return { success: true, references, cleanupCount: references.length };
    }

    let deletedReferenceCount = 0;
    for (const scene of Object.values(data.value?.scenes ?? {})) {
      for (const page of scene.pages || []) {
        if (page?.type === 'normal') {
          const normalizedPage = normalizeEffectContainer(page);
          const effects = (normalizedPage.effects || []).filter((effect) => {
            const keep = effect?.type !== 'unlock:cg' || effect.id !== cgId;
            if (!keep) deletedReferenceCount++;
            return keep;
          });
          if (effects.length > 0) normalizedPage.effects = effects;
          else delete normalizedPage.effects;
          delete page.effects;
          Object.assign(page, normalizedPage);
        }

        if (page?.type !== 'choice') continue;
        page.options = (page.options || []).map((option) => {
          const normalizedOption = normalizeEffectContainer(option);
          const effects = (normalizedOption.effects || []).filter((effect) => {
            const keep = effect?.type !== 'unlock:cg' || effect.id !== cgId;
            if (!keep) deletedReferenceCount++;
            return keep;
          });
          if (effects.length > 0) normalizedOption.effects = effects;
          else delete normalizedOption.effects;
          return normalizedOption;
        });
      }
    }

    delete cgs[cgId];
    if (selectedCgId.value === cgId) {
      selectCg(Object.keys(cgs)[0] ?? null);
    }
    pushState();
    return { success: true, references, deletedReferenceCount };
  }

  function renameVariable(variableId, nextVariableId, options = {}) {
    const registry = ensureVariableRegistryState();
    if (!registry || !registry[variableId]) {
      return { success: false, error: 'missing-variable' };
    }

    const normalizedId = slugifyVariableId(nextVariableId);
    if (!normalizedId) {
      return { success: false, error: 'empty-id' };
    }

    if (normalizedId === variableId) {
      return { success: true, variableId };
    }

    if (registry[normalizedId]) {
      return { success: false, error: 'duplicate-id' };
    }

    const references = findVariableReferences(variableId);
    if (options.previewOnly) {
      return {
        success: true,
        variableId: normalizedId,
        references,
        rewriteCount: references.length,
      };
    }

    if (references.length > 0 && options.rewriteReferences === false) {
      return {
        success: false,
        error: 'references-exist',
        variableId,
        nextVariableId: normalizedId,
        references,
        rewriteCount: references.length,
      };
    }

    let rewriteCount = 0;
    if (references.length > 0) {
      for (const scene of Object.values(data.value?.scenes ?? {})) {
        for (const page of scene.pages || []) {
          if (page?.type === 'choice') {
            page.options = (page.options || []).map((option) => {
              const normalizedOption = normalizeEffectContainer(option);
              if (!Array.isArray(normalizedOption.effects)) {
                return normalizedOption;
              }

              normalizedOption.effects = normalizedOption.effects.map((effect) => {
                if (effect.id !== variableId) {
                  return effect;
                }

                rewriteCount++;
                return {
                  ...effect,
                  id: normalizedId,
                };
              });
              return normalizedOption;
            });
          }

          if (page?.type === 'condition') {
            const normalizedPage = normalizeConditionPage(page, { registry });
            page.conditionMode = normalizedPage.conditionMode;
            page.trueTarget = normalizedPage.trueTarget;
            page.falseTarget = normalizedPage.falseTarget;
            page.conditions = normalizedPage.conditions.map((condition) => {
              if (condition.variableId !== variableId) {
                return condition;
              }

              rewriteCount++;
              return {
                ...condition,
                variableId: normalizedId,
              };
            });
            delete page.variable;
            delete page.operator;
            delete page.value;
            delete page.target;
          }

          if (page?.type === 'input' && page.variableId === variableId) {
            page.variableId = normalizedId;
            rewriteCount++;
          }

          rewriteCount += rewriteTextTemplateFields(page, variableId, normalizedId);
        }
      }
    }

    registry[normalizedId] = registry[variableId];
    delete registry[variableId];
    selectVariable(normalizedId);
    pushState();
    return {
      success: true,
      variableId: normalizedId,
      references,
      rewriteCount,
    };
  }

  function findVariableReferences(variableId) {
    if (!variableId) {
      return [];
    }

    return collectVariableReferences(data.value ?? {})
      .filter((reference) => reference.variableId === variableId)
      .map((reference) => ({
        ...reference,
        locationText: formatVariableReferenceLocation(reference),
      }));
  }

  function deleteVariable(variableId, options = {}) {
    const registry = ensureVariableRegistryState();
    if (!registry || !registry[variableId]) {
      return { success: false, error: 'missing-variable' };
    }

    const references = findVariableReferences(variableId);
    if (options.previewOnly) {
      return {
        success: true,
        references,
        cleanupCount: references.length,
      };
    }

    let deletedReferenceCount = 0;
    let invalidConditionCount = 0;

    for (const scene of Object.values(data.value?.scenes ?? {})) {
      for (const page of scene.pages || []) {
        if (page?.type === 'choice') {
          page.options = (page.options || []).map((option) => {
            const normalizedOption = normalizeEffectContainer(option);
            const nextEffects = (normalizedOption.effects || []).filter((effect) => {
              const keep = !isVariableEffect(effect) || effect.id !== variableId;
              if (!keep) {
                deletedReferenceCount++;
              }
              return keep;
            });

            if (nextEffects.length > 0) {
              normalizedOption.effects = nextEffects;
            } else {
              delete normalizedOption.effects;
            }

            return normalizedOption;
          });
        }

        if (page?.type === 'condition') {
          const normalizedPage = normalizeConditionPage(page, { registry });
          const nextConditions = normalizedPage.conditions.filter((condition) => {
            const keep = condition.variableId !== variableId;
            if (!keep) {
              deletedReferenceCount++;
            }
            return keep;
          });

          page.conditionMode = normalizedPage.conditionMode;
          page.trueTarget = normalizedPage.trueTarget;
          page.falseTarget = normalizedPage.falseTarget;
          page.conditions = nextConditions;
          delete page.variable;
          delete page.operator;
          delete page.value;
          delete page.target;

          if (normalizedPage.conditions.length > 0 && nextConditions.length === 0) {
            page.unresolvedCondition = {
              type: 'deleted-variable',
              variableId,
            };
            invalidConditionCount++;
          } else {
            delete page.unresolvedCondition;
          }
        }
      }
    }

    delete registry[variableId];
    if (selectedVariableId.value === variableId) {
      const remainingIds = Object.keys(registry);
      selectVariable(remainingIds[0] ?? null);
    }

    if (invalidConditionCount > 0) {
      requestStorySystemsRepair({
        source: 'condition-save-gate',
        issueId: 'condition-save-gate',
      });
    }

    pushState();
    return {
      success: true,
      references,
      deletedReferenceCount,
      invalidConditionCount,
    };
  }

  function requestStorySystemsRepair(request = {}) {
    storySystemsRepairRequest.value = {
      nonce: Date.now() + Math.random(),
      source: request.source || null,
      variableId: request.variableId || null,
      issueId: request.issueId || null,
    };

    if (request.variableId) {
      selectVariable(request.variableId);
    }
  }

  /** Get or initialize the ui.settingsScreen section */
  function getSettingsScreen() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.settingsScreen ??= { background: null, elements: [] };
    return data.value.ui.settingsScreen;
  }

  /** Replace the entire settingsScreen and push undo state */
  function updateSettingsScreen(settingsScreen) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.settingsScreen = settingsScreen;
    pushState();
  }

  /** Get or initialize the ui.titleScreen section */
  function getTitleScreen() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.titleScreen ??= { background: null, bgm: null, elements: [] };
    return data.value.ui.titleScreen;
  }

  /** Replace the entire titleScreen and push undo state */
  function updateTitleScreen(titleScreen) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.titleScreen = titleScreen;
    pushState();
  }

  /** Get or initialize the ui.dialogueBox font settings */
  function getDialogueBox() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.dialogueBox = normalizeDialogueBox(data.value.ui.dialogueBox);
    return data.value.ui.dialogueBox;
  }

  /** Replace the entire dialogueBox settings and push undo state */
  function updateDialogueBox(dialogueBox) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.dialogueBox = dialogueBox;
    pushState();
  }

  /** Get or initialize the ui.theme section (D-13) */
  function getTheme() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.theme ??= { tokens: {} };
    return data.value.ui.theme;
  }

  /** Replace the entire theme and push undo state (D-05) */
  function updateTheme(theme) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.theme = theme;
    pushState();
  }

  function getWidgetStyles() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.widgetStyles ??= {};
    return data.value.ui.widgetStyles;
  }

  function updateWidgetStyles(widgetStyles) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.widgetStyles = widgetStyles;
    pushState();
  }

  function getUiMotion() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.motion = normalizeUiMotion(data.value.ui.motion);
    return data.value.ui.motion;
  }

  function updateUiMotion(motion) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.motion = normalizeUiMotion(motion);
    pushState();
  }

  function applyUiStylePreset({ presetId, scope = 'all', merge = true } = {}) {
    if (!data.value) return null;
    const result = applyUiStylePresetToScript(data.value, { presetId, scope, merge });
    data.value = result.script;
    pushState();
    return result;
  }

  function getSaveLoadScreen() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.saveLoadScreen ??= {};
    return data.value.ui.saveLoadScreen;
  }

  function updateSaveLoadScreen(config) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.saveLoadScreen = config;
    pushState();
  }

  function getBacklogScreen() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.backlogScreen ??= {};
    return data.value.ui.backlogScreen;
  }

  function updateBacklogScreen(config) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.backlogScreen = config;
    pushState();
  }

  function getGameMenu() {
    if (!data.value) return null;
    data.value.ui ??= {};
    data.value.ui.gameMenu ??= {};
    return data.value.ui.gameMenu;
  }

  function updateGameMenu(config) {
    if (!data.value) return;
    data.value.ui ??= {};
    data.value.ui.gameMenu = config;
    pushState();
  }

  // --- Page CRUD helpers ---

  function createDefaultPage() {
    return {
      id: 'p' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: '',
      type: 'normal',
      background: null,
      camera: DEFAULT_PAGE_CAMERA,
      characters: [],
      bgm: null,
      se: null,
      dialogues: [{ speaker: null, text: '', expression: null, voice: null }],
      transition: { type: 'fade', duration: 800 },
    };
  }

  function addScene(sceneId, sceneName) {
    if (!data.value || data.value.scenes[sceneId]) return;
    data.value.scenes[sceneId] = {
      name: sceneName,
      pages: [createDefaultPage()],
    };
    pushState();
  }

  function deleteScene(sceneId) {
    if (!data.value?.scenes?.[sceneId]) return;
    delete data.value.scenes[sceneId];
    pushState();
  }

  function renameScene(sceneId, newName) {
    if (!data.value?.scenes?.[sceneId]) return;
    data.value.scenes[sceneId].name = newName;
    pushState();
  }

  function addPage(sceneId, afterIndex = -1) {
    const scene = data.value?.scenes?.[sceneId];
    if (!scene) return null;
    const newPage = createDefaultPage();
    const insertAt = afterIndex >= 0 ? afterIndex + 1 : scene.pages.length;

    // D-03/D-04: PPT-style copy from previous page
    const prevPage = scene.pages[insertAt - 1];
    if (prevPage) {
      newPage.characters = JSON.parse(JSON.stringify(prevPage.characters || []));
      newPage.background = prevPage.background || null;
      newPage.bgm = prevPage.bgm ? JSON.parse(JSON.stringify(prevPage.bgm)) : null;
      copyPageCinematicFields(prevPage, newPage);
    }

    scene.pages.splice(insertAt, 0, newPage);
    pushState();
    return { page: newPage, index: insertAt };
  }

  function deletePage(sceneId, pageIndex) {
    const scene = data.value?.scenes?.[sceneId];
    if (!scene || pageIndex < 0 || pageIndex >= scene.pages.length) return;
    scene.pages.splice(pageIndex, 1);
    pushState();
  }

  function reorderPages(sceneId, fromIndex, toIndex) {
    const scene = data.value?.scenes?.[sceneId];
    if (!scene) return;
    if (fromIndex < 0 || fromIndex >= scene.pages.length) return;
    if (toIndex < 0 || toIndex >= scene.pages.length) return;
    const [moved] = scene.pages.splice(fromIndex, 1);
    scene.pages.splice(toIndex, 0, moved);
    pushState();
  }

  function convertPageType(sceneId, pageIndex) {
    const scene = data.value?.scenes?.[sceneId];
    if (!scene) return;
    const page = scene.pages?.[pageIndex];
    if (!page) return;

    if (page.type === 'normal' || !page.type) {
      page.type = 'choice';
      delete page.effects;
      page.prompt = '';
      page.options = [
        { text: '', target: null, effects: [] },
        { text: '', target: null, effects: [] },
      ];
    } else if (page.type === 'choice') {
      page.type = 'normal';
      delete page.prompt;
      delete page.options;
      if (!page.dialogues || page.dialogues.length === 0) {
        page.dialogues = [{ speaker: null, text: '', expression: null, voice: null }];
      }
    }
    pushState();
  }

  function setPageType(sceneId, pageIndex, type) {
    const scene = data.value?.scenes?.[sceneId];
    if (!scene) return false;
    const page = scene.pages?.[pageIndex];
    if (!page || page.type === type) return false;

    page.type = ['normal', 'choice', 'input', 'condition', 'video'].includes(type) ? type : 'normal';

    if (page.type === 'normal') {
      delete page.prompt;
      delete page.options;
      delete page.variableId;
      delete page.placeholder;
      delete page.defaultValue;
      delete page.submitText;
      delete page.maxLength;
      delete page.required;
      delete page.target;
      delete page.conditionMode;
      delete page.conditions;
      delete page.trueTarget;
      delete page.falseTarget;
      delete page.unresolvedCondition;
      delete page.video;
      delete page.autoAdvance;
      delete page.loop;
      page.dialogues = Array.isArray(page.dialogues) && page.dialogues.length > 0
        ? page.dialogues
        : [{ speaker: null, text: '', expression: null, voice: null }];
    } else if (page.type === 'choice') {
      delete page.effects;
      delete page.dialogues;
      delete page.variableId;
      delete page.placeholder;
      delete page.defaultValue;
      delete page.submitText;
      delete page.maxLength;
      delete page.required;
      delete page.target;
      delete page.conditionMode;
      delete page.conditions;
      delete page.trueTarget;
      delete page.falseTarget;
      delete page.unresolvedCondition;
      delete page.video;
      delete page.autoAdvance;
      delete page.loop;
      page.prompt ??= '';
      page.options = Array.isArray(page.options) && page.options.length > 0
        ? page.options.map((option) => normalizeEffectContainer(option))
        : [{ text: '', target: null, effects: [] }, { text: '', target: null, effects: [] }];
    } else if (page.type === 'input') {
      delete page.effects;
      delete page.dialogues;
      delete page.options;
      delete page.conditionMode;
      delete page.conditions;
      delete page.trueTarget;
      delete page.falseTarget;
      delete page.unresolvedCondition;
      delete page.video;
      delete page.loop;
      page.prompt ??= '请输入主角名字';
      page.variableId ??= '';
      page.placeholder ??= '名字';
      page.defaultValue ??= '';
      page.submitText ??= '确定';
      page.maxLength ??= 24;
      page.required ??= true;
      page.target ??= null;
    } else if (page.type === 'condition') {
      delete page.effects;
      delete page.dialogues;
      delete page.prompt;
      delete page.options;
      delete page.variableId;
      delete page.placeholder;
      delete page.defaultValue;
      delete page.submitText;
      delete page.maxLength;
      delete page.required;
      delete page.target;
      delete page.particles;
      delete page.video;
      delete page.autoAdvance;
      delete page.loop;
      const normalizedPage = normalizeConditionPage(page, {
        registry: data.value?.systems?.variables ?? {},
      });
      page.conditionMode = normalizedPage.conditionMode;
      page.conditions = normalizedPage.conditions;
      page.trueTarget = normalizedPage.trueTarget;
      page.falseTarget = normalizedPage.falseTarget;
      delete page.unresolvedCondition;
    } else if (page.type === 'video') {
      delete page.effects;
      delete page.dialogues;
      delete page.prompt;
      delete page.options;
      delete page.variableId;
      delete page.placeholder;
      delete page.defaultValue;
      delete page.submitText;
      delete page.maxLength;
      delete page.required;
      delete page.conditionMode;
      delete page.conditions;
      delete page.trueTarget;
      delete page.falseTarget;
      delete page.unresolvedCondition;
      page.video ??= {};
      page.autoAdvance ??= true;
      page.loop ??= false;
    }

    pushState();
    return true;
  }

  function setSceneNext(sceneId, nextSceneId) {
    const scene = data.value?.scenes?.[sceneId];
    if (!scene) return;
    scene.next = nextSceneId || null;
    pushState();
  }

  // D-05: Find all references to a character expression across all scenes
  function findExpressionReferences(charId, exprName) {
    const refs = [];
    if (!data.value?.scenes) return refs;
    for (const [sceneId, scene] of Object.entries(data.value.scenes)) {
      for (let pageIdx = 0; pageIdx < (scene.pages || []).length; pageIdx++) {
        const page = scene.pages[pageIdx];
        for (const char of (page.characters || [])) {
          if (char.id === charId && char.expression === exprName) {
            refs.push({ sceneId, sceneName: scene.name || sceneId, pageIdx, source: 'character' });
          }
        }
        for (const dlg of (page.dialogues || [])) {
          if (dlg.speaker === charId && dlg.expression === exprName) {
            refs.push({ sceneId, sceneName: scene.name || sceneId, pageIdx, source: 'dialogue' });
          }
        }
      }
    }
    return refs;
  }

  // D-06: Replace all references from one expression to another (no pushState)
  function replaceExpressionReferences(charId, oldExpr, newExpr) {
    if (!data.value?.scenes) return 0;
    let count = 0;
    for (const scene of Object.values(data.value.scenes)) {
      for (const page of (scene.pages || [])) {
        for (const char of (page.characters || [])) {
          if (char.id === charId && char.expression === oldExpr) {
            char.expression = newExpr;
            count++;
          }
        }
        for (const dlg of (page.dialogues || [])) {
          if (dlg.speaker === charId && dlg.expression === oldExpr) {
            dlg.expression = newExpr;
            count++;
          }
        }
      }
    }
    return count;
  }

  function replaceAssetPathReferences(oldPath, newPath) {
    if (!data.value || !oldPath || !newPath || oldPath === newPath) return 0;

    let count = 0;

    function replaceField(owner, key) {
      if (owner?.[key] !== oldPath) return;
      owner[key] = newPath;
      count++;
    }

    function replaceArrayValues(values) {
      if (!Array.isArray(values)) return;
      values.forEach((value, index) => {
        if (value === oldPath) {
          values[index] = newPath;
          count++;
        }
      });
    }

    function replaceVideoReference(reference) {
      if (!reference || typeof reference !== 'object') return;
      replaceField(reference, 'file');
      replaceField(reference, 'poster');
    }

    for (const character of Object.values(data.value.characters || {})) {
      for (const expressionId of Object.keys(character?.expressions || {})) {
        replaceField(character.expressions, expressionId);
      }
    }

    for (const scene of Object.values(data.value.scenes || {})) {
      for (const page of (scene?.pages || [])) {
        replaceField(page, 'background');
        replaceField(page?.bgm, 'file');
        replaceField(page?.se, 'file');
        replaceVideoReference(page?.video);
        for (const dialogue of (page?.dialogues || [])) {
          replaceField(dialogue, 'voice');
        }
      }
    }

    for (const font of (data.value.assets?.fonts || [])) {
      replaceField(font, 'file');
    }
    for (const video of Object.values(data.value.assets?.videos || {})) {
      replaceVideoReference(video);
    }

    for (const ending of Object.values(data.value.systems?.endings || {})) {
      replaceField(ending, 'thumbnail');
      replaceVideoReference(ending?.endingVideo);
    }
    for (const cg of Object.values(data.value.systems?.gallery?.cg || {})) {
      replaceArrayValues(cg?.images);
      replaceField(cg, 'thumbnail');
      replaceField(cg, 'lockedThumbnail');
    }

    for (const screenKey of ['titleScreen', 'settingsScreen']) {
      const screen = data.value.ui?.[screenKey];
      replaceField(screen, 'background');
      if (screenKey === 'titleScreen') {
        replaceField(screen, 'bgm');
        replaceVideoReference(screen?.openingVideo);
      }
      for (const element of (screen?.elements || [])) {
        if (element?.type === 'image') replaceField(element, 'src');
      }
    }

    count += replaceUiImagePathReferences(data.value, oldPath, newPath);
    return count;
  }

  // Temporary backward-compat shims — remove when views are rewritten in Chunk 3
  async function loadScript() {
    console.warn('loadScript() is deprecated — use loadFromData() via project store');
  }
  async function saveScript() {
    console.warn('saveScript() is deprecated — use project.saveProject()');
  }

  /**
   * Apply a built-in theme package: tokens + widgetStyles + screen layouts.
   * Each section is deep-merged so unset keys fall back to engine defaults.
   * Pushes a single undo state for the entire theme application.
   */
  function applyBuiltinTheme(theme) {
    if (!data.value) return;
    data.value.ui ??= {};

    // tokens → theme.tokens (+ colorRecipe if present)
    data.value.ui.theme = { tokens: { ...(theme.tokens ?? {}) } };
    if (theme.colorRecipe) {
      data.value.ui.theme.colorRecipe = { ...theme.colorRecipe };
    }

    // widgetStyles → flat merge per category
    const ws = {};
    for (const [cat, vals] of Object.entries(theme.widgetStyles ?? {})) {
      ws[cat] = { ...vals };
    }
    data.value.ui.widgetStyles = ws;

    // screen layouts → deep merge (1 level of nesting)
    const screenKeys = ['saveLoadScreen', 'backlogScreen', 'gameMenu', 'settingsScreen'];
    for (const key of screenKeys) {
      if (theme.screens?.[key]) {
        const src = theme.screens[key];
        const dst = {};
        for (const [k, v] of Object.entries(src)) {
          dst[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? { ...v } : v;
        }
        data.value.ui[key] = dst;
      } else {
        data.value.ui[key] = {};
      }
    }

    pushState();
  }

  function applyThemeBundle(bundleConfig, packageMeta) {
    if (!data.value) return;
    data.value.ui ??= {};

    const nextTheme = JSON.parse(JSON.stringify(bundleConfig?.theme ?? {}));
    if (packageMeta) {
      nextTheme.packageMeta = JSON.parse(JSON.stringify(packageMeta));
    }

    data.value.ui.theme = nextTheme;
    data.value.ui.widgetStyles = JSON.parse(JSON.stringify(bundleConfig?.widgetStyles ?? {}));
    data.value.ui.dialogueBox = JSON.parse(JSON.stringify(bundleConfig?.dialogueBox ?? {}));
    data.value.ui.saveLoadScreen = JSON.parse(JSON.stringify(bundleConfig?.saveLoadScreen ?? {}));
    data.value.ui.backlogScreen = JSON.parse(JSON.stringify(bundleConfig?.backlogScreen ?? {}));
    data.value.ui.gameMenu = JSON.parse(JSON.stringify(bundleConfig?.gameMenu ?? {}));
    data.value.ui.settingsScreen = JSON.parse(JSON.stringify(bundleConfig?.settingsScreen ?? {}));
    const currentTitleScreen = JSON.parse(JSON.stringify(data.value.ui.titleScreen ?? {}));
    const nextTitleScreen = JSON.parse(JSON.stringify(bundleConfig?.titleScreen ?? {}));
    data.value.ui.titleScreen = {
      background: nextTitleScreen.background ?? null,
      bgm: currentTitleScreen.bgm ?? null,
      openingVideo: currentTitleScreen.openingVideo ? JSON.parse(JSON.stringify(currentTitleScreen.openingVideo)) : undefined,
      elements: Array.isArray(nextTitleScreen.elements) ? nextTitleScreen.elements : [],
    };

    pushState();
  }

  return {
    data, isLoading, _skipWatch, changeRevision,
    selectedVariableId, selectedEndingId, selectedCgId, storySystemsPanel, storySystemsRepairRequest,
    conditionPageIssues, canSaveConditionPages,
    pushState, undo, redo,
    historyIndex, history,
    loadFromData, reset,
    selectVariable, selectEnding, selectCg, selectStorySystemsPanel, requestStorySystemsRepair,
    createVariableDraft, updateVariableFields, createAffectionVariable, renameVariable,
    findVariableReferences, deleteVariable,
    createEndingDraft, updateEndingFields, renameEnding, findEndingReferences, deleteEnding,
    createCgDraft, updateCgFields, renameCg, findCgReferences, deleteCg,
    ensureVideoRegistryState, createVideoDraft, updateVideoFields, renameVideo, deleteVideo,
    getSettingsScreen, updateSettingsScreen,
    getTitleScreen, updateTitleScreen,
    getDialogueBox, updateDialogueBox,
    getTheme, updateTheme,
    getWidgetStyles, updateWidgetStyles,
    getUiMotion, updateUiMotion,
    applyUiStylePreset,
    getSaveLoadScreen, updateSaveLoadScreen,
    getBacklogScreen, updateBacklogScreen,
    getGameMenu, updateGameMenu,
    applyBuiltinTheme, applyThemeBundle,
    addScene, deleteScene, renameScene,
    addPage, deletePage, reorderPages,
    convertPageType, setPageType, setSceneNext,
    findExpressionReferences, replaceExpressionReferences, replaceAssetPathReferences,
    loadScript, saveScript
  };
});
  function normalizeDialogueBox(dialogueBox) {
    const normalized = dialogueBox ?? {};
    normalized.fontSize ??= 18;
    normalized.fontFamily ??= null;
    normalized.textColor ??= null;
    normalized.nameplateFontSize ??= 20;
    normalized.nameplateFontFamily ??= null;
    normalized.nameplateColor ??= null;
    normalized.nameplateStyle ??= 'inline';
    normalized.nameplateBackgroundImage ??= null;
    normalized.decorations ??= [];
    return normalized;
  }
