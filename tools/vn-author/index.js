#!/usr/bin/env node

import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { importNovelDraft } from '../../src/authoring/novelDraftImport.js';
import { createNovelDraftPlan } from '../../src/authoring/novelDraftPlan.js';
import { createAgentHandoff } from '../../src/authoring/agentHandoff.js';
import { createGraphAnalysis, findAssetIssues, findDeadEnds } from '../../src/authoring/branchAnalysis.js';
import { createExportReadiness } from '../../src/authoring/exportReadiness.js';
import { lintProjectLayout } from '../../src/authoring/layoutLint.js';
import { createCharacterBlocking, LAYOUT_PRESETS } from '../../src/authoring/layoutPresets.js';
import { createProjectSession } from '../../src/authoring/projectSession.js';
import { createProjectReport } from '../../src/authoring/projectReport.js';
import {
  collectSceneReferenceDiagnostics,
  sceneIdsFromChangedPaths,
} from '../../src/authoring/sceneReferenceDiagnostics.js';
import { validateProject } from '../../src/shared/projectValidator.js';
import { collectSceneReferences } from '../../src/shared/sceneGraph.js';
import { listTransitionCatalog } from '../../src/shared/transitionCatalog.js';
import {
  PREVIEW_BROWSER_UNAVAILABLE,
  PREVIEW_QUALITY_FAILED,
  PREVIEW_RENDERER_UNAVAILABLE,
  renderPreviewScreenshot,
  writePreviewRenderPlan,
} from './preview-renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultScriptPath = path.join(repoRoot, 'public', 'game', 'script.json');

function hasFlag(args, flag) {
  return args.includes(flag);
}

function getArgValue(args, name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }

  return args[index + 1];
}

function getOptionalArgValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1 || index === args.length - 1) {
    return undefined;
  }

  return args[index + 1];
}

function getArgValues(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && index < args.length - 1) {
      values.push(args[index + 1]);
      index += 1;
    }
  }
  return values;
}

function parseJsonArg(args, name, fallback = null) {
  const value = getArgValue(args, name, null);
  if (value == null) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${name} must be valid JSON: ${error.message}`);
  }
}

async function parseJsonFileArg(args, name, fallback = null) {
  const value = getArgValue(args, name, null);
  if (value == null) {
    return fallback;
  }

  const filePath = path.resolve(repoRoot, value);
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${name} must point to a valid JSON file: ${error.message}`);
  }
}

function parseScalarValue(value, fallback = null) {
  if (value == null) {
    return fallback;
  }

  const trimmed = String(value).trim();
  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && trimmed !== '' ? numeric : value;
}

function parseOptionalScalarValue(value) {
  return value == null ? undefined : parseScalarValue(value);
}

function getFlagOrOptionalValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  const nextValue = args[index + 1];
  if (nextValue != null && !String(nextValue).startsWith('--')) {
    return nextValue;
  }

  return true;
}

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function dropUndefinedFields(value) {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) {
      delete value[key];
    }
  }
  return value;
}

function getIntArg(args, name, fallback = null) {
  const value = getArgValue(args, name, null);
  if (value == null) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer`);
  }

  return parsed;
}

function parseExpressions(args) {
  const expressions = parseJsonArg(args, '--expressions', {});
  for (const entry of getArgValues(args, '--expression')) {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex <= 0) {
      throw new Error('--expression entries must use name=assetPath');
    }

    expressions[entry.slice(0, separatorIndex).trim()] = entry.slice(separatorIndex + 1).trim();
  }

  return expressions;
}

function parseCharacterShortcut(entry) {
  const [id, expression] = String(entry).split(':');
  return {
    id: id?.trim(),
    expression: expression?.trim() || undefined,
  };
}

function parsePresetCharacters(args) {
  const entries = getArgValues(args, '--character').map(parseCharacterShortcut);
  const ids = entries.map((entry) => entry.id).filter(Boolean);
  const expressionHints = {};
  for (const entry of entries) {
    if (entry.id && entry.expression) {
      expressionHints[entry.id] = entry.expression;
    }
  }

  return { ids, expressionHints };
}

function parsePageAudioArgs(args) {
  const bgm = hasFlag(args, '--clear-bgm')
    ? null
    : getArgValue(args, '--bgm', null) == null
      ? undefined
      : {
        file: getArgValue(args, '--bgm'),
        volume: parseScalarValue(getArgValue(args, '--bgm-volume', '0.6')),
      };
  const se = hasFlag(args, '--clear-se')
    ? null
    : getArgValue(args, '--se', null) == null
      ? undefined
      : { file: getArgValue(args, '--se') };

  return { bgm, se };
}

async function parseTitleScreenArgs(args) {
  const config = await parseJsonFileArg(args, '--config', parseJsonArg(args, '--config-json', {}));
  return dropUndefinedFields({
    config,
    background: hasFlag(args, '--clear-background') ? null : getOptionalArgValue(args, '--background'),
    bgm: hasFlag(args, '--clear-bgm') ? null : getOptionalArgValue(args, '--bgm'),
    elements: parseJsonArg(args, '--elements', undefined),
    merge: hasFlag(args, '--replace') ? false : true,
  });
}

async function parseScreenLayoutArgs(args) {
  const config = await parseJsonFileArg(args, '--config', parseJsonArg(args, '--config-json', null));
  if (config == null) {
    throw new Error('set-screen-layout requires --config or --config-json');
  }

  return {
    screenId: getArgValue(args, '--screen', getArgValue(args, '--screen-id', null)),
    config,
    merge: hasFlag(args, '--replace') ? false : true,
  };
}

async function parseSharedUiConfigArgs(args, command) {
  const config = await parseJsonFileArg(args, '--config', parseJsonArg(args, '--config-json', null));
  if (config == null) {
    throw new Error(`${command} requires --config or --config-json`);
  }

  return {
    config,
    merge: hasFlag(args, '--replace') ? false : true,
  };
}

function parseTitleElementArgs(args, { requireType = true } = {}) {
  const jsonElement = parseJsonArg(args, '--element', null);
  if (jsonElement) {
    return jsonElement;
  }

  const type = requireType
    ? getArgValue(args, '--type', null)
    : getOptionalArgValue(args, '--type');
  if (requireType && !type) {
    throw new Error('title element requires --type');
  }

  return dropUndefinedFields({
    id: getOptionalArgValue(args, '--id'),
    type,
    content: getOptionalArgValue(args, '--content'),
    text: getOptionalArgValue(args, '--text') ?? getOptionalArgValue(args, '--label'),
    action: getOptionalArgValue(args, '--action'),
    src: getOptionalArgValue(args, '--src'),
    x: parseOptionalScalarValue(getOptionalArgValue(args, '--x')),
    y: parseOptionalScalarValue(getOptionalArgValue(args, '--y')),
    anchor: getOptionalArgValue(args, '--anchor'),
    width: parseOptionalScalarValue(getOptionalArgValue(args, '--width')),
    height: parseOptionalScalarValue(getOptionalArgValue(args, '--height')),
    fontSize: parseOptionalScalarValue(getOptionalArgValue(args, '--font-size')),
    fontFamily: getOptionalArgValue(args, '--font-family'),
    color: getOptionalArgValue(args, '--color'),
    backgroundColor: getOptionalArgValue(args, '--background-color'),
    border: getOptionalArgValue(args, '--border'),
    borderRadius: parseOptionalScalarValue(getOptionalArgValue(args, '--border-radius')),
    hoverColor: getOptionalArgValue(args, '--hover-color'),
    letterSpacing: parseOptionalScalarValue(getOptionalArgValue(args, '--letter-spacing')),
    textShadow: getOptionalArgValue(args, '--text-shadow'),
  });
}

async function readScript(args) {
  const scriptPath = path.resolve(repoRoot, getArgValue(args, '--script', defaultScriptPath));
  const raw = await readFile(scriptPath, 'utf8');
  return {
    scriptPath,
    script: JSON.parse(raw),
  };
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function collectKnownAssets(rootDir) {
  const assets = [];

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (entry.isFile()) {
        assets.push(path.relative(rootDir, entryPath).replace(/\\/g, '/'));
      }
    }
  }

  await walk(rootDir);
  return assets;
}

const ASSET_LIBRARY_CATEGORIES = [
  'backgrounds',
  'characters',
  'audio',
  'voices',
  'ui',
  'fonts',
];

function tokenizeAssetName(name) {
  return String(name ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function createEmptyAssetLibrary() {
  return Object.fromEntries(ASSET_LIBRARY_CATEGORIES.map((category) => [category, []]));
}

async function collectAssetCategory({ assetRoot, category }) {
  const categoryRoot = path.join(assetRoot, category);
  let categoryStat = null;
  try {
    categoryStat = await stat(categoryRoot);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  if (!categoryStat.isDirectory()) {
    return [];
  }

  const assets = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const entryStat = await stat(entryPath);
      const parsed = path.parse(entry.name);
      assets.push({
        path: path.relative(assetRoot, entryPath).replace(/\\/g, '/'),
        name: parsed.name,
        tokens: tokenizeAssetName(parsed.name),
        extension: parsed.ext,
        size: entryStat.size,
      });
    }
  }

  await walk(categoryRoot);
  return assets.sort((left, right) => left.path.localeCompare(right.path));
}

function resolveAssetProjectPath(args) {
  const projectPathArg = getArgValue(args, '--project', null);
  if (projectPathArg) {
    return path.resolve(repoRoot, projectPathArg);
  }

  const scriptPathArg = getArgValue(args, '--script', null);
  if (scriptPathArg) {
    return path.dirname(path.resolve(repoRoot, scriptPathArg));
  }

  return path.dirname(defaultScriptPath);
}

async function collectCheckpointEntries(checkpointDir, limit = 5) {
  if (!await pathExists(checkpointDir)) {
    return [];
  }

  const entries = await readdir(checkpointDir, { withFileTypes: true });
  const checkpoints = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    const checkpointPath = path.join(checkpointDir, entry.name);
    const checkpointStat = await stat(checkpointPath);
    checkpoints.push({
      path: checkpointPath,
      name: entry.name,
      createdAt: checkpointStat.mtime.toISOString(),
      size: checkpointStat.size,
    });
  }

  return checkpoints
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, limit);
}

async function getValidationOptions(args, scriptPath) {
  if (!hasFlag(args, '--check-assets')) {
    return {};
  }

  const assetRoot = path.resolve(repoRoot, getArgValue(args, '--asset-root', path.dirname(scriptPath)));
  return {
    knownAssets: await collectKnownAssets(assetRoot),
  };
}

async function getKnownAssetsForReadiness(args, scriptPath) {
  if (hasFlag(args, '--skip-asset-check')) {
    return null;
  }

  const assetRoot = path.resolve(repoRoot, getArgValue(args, '--asset-root', path.dirname(scriptPath)));
  return collectKnownAssets(assetRoot);
}

function createCheckpointPath(filePath, timestamp = new Date()) {
  const safeTimestamp = timestamp.toISOString().replace(/[:.]/g, '-');
  const parsed = path.parse(filePath);
  return path.join(parsed.dir, '.checkpoints', `${parsed.name}.${safeTimestamp}${parsed.ext || '.json'}`);
}

function summarizeScriptShape(script) {
  const scenes = script?.scenes ?? {};
  const pages = Object.values(scenes).reduce((count, scene) => (
    count + (Array.isArray(scene?.pages) ? scene.pages.length : 0)
  ), 0);

  return {
    characters: Object.keys(script?.characters ?? {}).length,
    scenes: Object.keys(scenes).length,
    pages,
    variables: Object.keys(script?.systems?.variables ?? {}).length,
    endings: Object.keys(script?.systems?.endings ?? {}).length,
    cgs: Object.keys(script?.systems?.gallery?.cg ?? {}).length,
  };
}

function subtractCounts(after, before) {
  return Object.fromEntries(
    Object.keys(after).map((key) => [key, after[key] - (before[key] ?? 0)]),
  );
}

function getMutationTarget(result = {}) {
  const target = {};
  for (const key of [
    'characterId',
    'variableId',
    'newVariableId',
    'deletedVariableId',
    'endingId',
    'deletedEndingId',
    'cgId',
    'deletedCgId',
    'sceneId',
    'newSceneId',
    'deletedSceneId',
    'pageIndex',
    'dialogueIndex',
    'optionIndex',
    'fromIndex',
    'toIndex',
    'effectIndex',
    'screenId',
    'elementId',
    'elementIndex',
  ]) {
    if (result[key] !== undefined) {
      target[key] = result[key];
    }
  }
  return target;
}

function getChangedPaths(result = {}) {
  if (Array.isArray(result.changedPaths)) {
    return result.changedPaths;
  }

  if (result.uiPath) {
    return [result.uiPath];
  }

  if (Array.isArray(result.references) && result.references.length > 0) {
    return result.references
      .map((reference) => reference.pathString)
      .filter(Boolean);
  }

  if (result.characterId) {
    return [`characters.${result.characterId}`];
  }
  if (result.variableId) {
    return [`systems.variables.${result.variableId}`];
  }
  if (result.endingId) {
    return [`systems.endings.${result.endingId}`];
  }
  if (result.cgId) {
    return [`systems.gallery.cg.${result.cgId}`];
  }
  if (!result.sceneId) {
    return [];
  }

  const scenePath = `scenes.${result.sceneId}`;
  if (result.newSceneId) {
    return [scenePath, `scenes.${result.newSceneId}`];
  }
  if (result.pageIndex === undefined) {
    return [scenePath];
  }

  const pagePath = `${scenePath}.pages.${result.pageIndex}`;
  if (result.dialogueIndex !== undefined) {
    return [`${pagePath}.dialogues.${result.dialogueIndex}`];
  }
  if (result.optionIndex !== undefined) {
    if (result.effectIndex !== undefined) {
      return [`${pagePath}.options.${result.optionIndex}.effects.${result.effectIndex}`];
    }
    return [`${pagePath}.options.${result.optionIndex}`];
  }

  return [pagePath];
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function getTransactionChangedPaths(transaction = null) {
  const changedPaths = transaction?.changeSummary?.changedPaths
    ?? transaction?.transactionSummary?.changedPaths
    ?? [];
  return Array.isArray(changedPaths) ? changedPaths.filter(Boolean) : [];
}

async function readTransactionArg(args) {
  const transactionPath = getArgValue(args, '--transaction', null);
  if (!transactionPath) {
    return null;
  }

  const resolvedPath = path.resolve(repoRoot, transactionPath);
  return {
    path: resolvedPath,
    data: JSON.parse(await readFile(resolvedPath, 'utf8')),
  };
}

function pageTargetsFromChangedPaths(changedPaths = [], script = {}) {
  const targets = [];
  for (const changedPath of changedPaths) {
    const pageMatch = /^scenes\.([^.]+)\.pages\.(\d+)/.exec(String(changedPath));
    if (pageMatch) {
      const sceneId = pageMatch[1];
      const pageIndex = Number(pageMatch[2]);
      if (script.scenes?.[sceneId]?.pages?.[pageIndex]) {
        targets.push({ sceneId, pageIndex });
      }
      continue;
    }

    const sceneMatch = /^scenes\.([^.]+)/.exec(String(changedPath));
    if (sceneMatch) {
      const sceneId = sceneMatch[1];
      if (script.scenes?.[sceneId]?.pages?.[0]) {
        targets.push({ sceneId, pageIndex: 0 });
      }
    }
  }

  const seen = new Set();
  return targets.filter((target) => {
    const key = `${target.sceneId}:${target.pageIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const PREVIEW_SCREEN_PATHS = new Map([
  ['ui.titleScreen', 'titleScreen'],
  ['ui.settingsScreen', 'settingsScreen'],
  ['ui.gameMenu', 'gameMenu'],
  ['ui.saveLoadScreen', 'saveLoadScreen'],
  ['ui.backlogScreen', 'backlogScreen'],
]);

function screenTargetsFromChangedPaths(changedPaths = []) {
  const targets = [];
  for (const changedPath of changedPaths) {
    for (const [pathPrefix, screenId] of PREVIEW_SCREEN_PATHS.entries()) {
      if (changedPath === pathPrefix || changedPath.startsWith(`${pathPrefix}.`)) {
        targets.push({ type: 'screen', screenId });
      }
    }
  }

  const seen = new Set();
  return targets.filter((target) => {
    if (seen.has(target.screenId)) return false;
    seen.add(target.screenId);
    return true;
  });
}

function endingTargetsFromChangedPaths(changedPaths = []) {
  const hasEndingChange = changedPaths.some((changedPath) => (
    changedPath === 'systems.endings'
    || String(changedPath).startsWith('systems.endings.')
  ));

  return hasEndingChange
    ? [{
      type: 'ending-list',
      kind: 'ending-list',
      pathString: 'systems.endings',
      reason: 'changed-ending-registry',
    }]
    : [];
}

function galleryTargetsFromChangedPaths(changedPaths = []) {
  const hasCgChange = changedPaths.some((changedPath) => (
    changedPath === 'systems.gallery.cg'
    || String(changedPath).startsWith('systems.gallery.cg.')
  ));

  return hasCgChange
    ? [{
      type: 'gallery',
      kind: 'gallery',
      pathString: 'systems.gallery.cg',
      reason: 'changed-cg-registry',
    }]
    : [];
}

function branchGraphTargetsFromChangedPaths(changedPaths = []) {
  const hasSceneChange = changedPaths.some((changedPath) => String(changedPath).startsWith('scenes.'));
  return hasSceneChange
    ? [{
      type: 'branch-graph',
      kind: 'branch-graph',
      pathString: 'analysis.sceneGraph',
      reason: 'changed-scene-flow',
    }]
    : [];
}

function createPreviewTargets({ explicitSceneId, explicitPageIndex, transaction, transactionPageTargets, transactionScreenTargets, transactionEndingTargets, transactionGalleryTargets, transactionBranchGraphTargets, checkedSceneIds, defaultSceneId, defaultPageIndex, script }) {
  if (explicitSceneId || explicitPageIndex != null) {
    return [{ type: 'scene', sceneId: defaultSceneId, pageIndex: defaultPageIndex }];
  }

  if (transaction?.data) {
    const sceneTargets = transactionPageTargets.length
      ? transactionPageTargets.map((target) => ({ type: 'scene', ...target }))
      : checkedSceneIds
        .filter((sceneId) => script.scenes?.[sceneId]?.pages?.[0])
        .map((sceneId) => ({ type: 'scene', sceneId, pageIndex: 0 }));
    const targets = [...sceneTargets, ...transactionScreenTargets, ...transactionEndingTargets, ...transactionGalleryTargets, ...transactionBranchGraphTargets];
    return targets.length ? targets : [{ type: 'scene', sceneId: defaultSceneId, pageIndex: defaultPageIndex }];
  }

  return [{ type: 'scene', sceneId: defaultSceneId, pageIndex: defaultPageIndex }];
}

function createAuthorCheckFocus({ args, script, transaction }) {
  const changedPaths = getTransactionChangedPaths(transaction?.data);
  const transactionSceneIds = sceneIdsFromChangedPaths(changedPaths)
    .filter((sceneId) => script.scenes?.[sceneId]);
  const transactionPageTargets = pageTargetsFromChangedPaths(changedPaths, script);
  const transactionScreenTargets = screenTargetsFromChangedPaths(changedPaths);
  const transactionEndingTargets = endingTargetsFromChangedPaths(changedPaths);
  const transactionGalleryTargets = galleryTargetsFromChangedPaths(changedPaths);
  const transactionBranchGraphTargets = branchGraphTargetsFromChangedPaths(changedPaths);
  const explicitSceneId = getArgValue(args, '--scene', null);
  const explicitPageIndex = getIntArg(args, '--page', null);
  const defaultSceneId = explicitSceneId ?? transactionPageTargets[0]?.sceneId ?? transactionSceneIds[0] ?? 'start';
  const defaultPageIndex = explicitPageIndex ?? transactionPageTargets[0]?.pageIndex ?? 0;
  const checkedSceneIds = uniqueValues([
    ...(explicitSceneId ? [explicitSceneId] : []),
    ...transactionSceneIds,
    ...(transaction?.data ? [] : [defaultSceneId]),
  ]).filter((sceneId) => script.scenes?.[sceneId]);
  const previewTargets = createPreviewTargets({
    explicitSceneId,
    explicitPageIndex,
    transaction,
    transactionPageTargets,
    transactionScreenTargets,
    transactionEndingTargets,
    transactionGalleryTargets,
    transactionBranchGraphTargets,
    checkedSceneIds,
    defaultSceneId,
    defaultPageIndex,
    script,
  });

  return {
    mode: transaction?.data ? 'transaction' : 'manual',
    transactionPath: transaction?.path ?? null,
    changedPaths,
    checkedSceneIds,
    pageTargets: transaction?.data ? transactionPageTargets : [],
    screenTargets: transaction?.data ? transactionScreenTargets : [],
    endingTargets: transaction?.data ? transactionEndingTargets : [],
    galleryTargets: transaction?.data ? transactionGalleryTargets : [],
    branchGraphTargets: transaction?.data ? transactionBranchGraphTargets : [],
    previewTargets,
    previewTarget: previewTargets[0] ?? {
      sceneId: defaultSceneId,
      pageIndex: defaultPageIndex,
    },
  };
}

function issueMatchesAuthorCheckFocus(issue = {}, focus = {}) {
  if (focus.mode !== 'transaction') {
    return true;
  }

  if (!focus.changedPaths?.length) {
    return true;
  }

  const pathString = issue.pathString ?? '';
  if (pathString && focus.changedPaths.some((changedPath) => (
    pathString === changedPath
    || pathString.startsWith(`${changedPath}.`)
    || changedPath.startsWith(`${pathString}.`)
  ))) {
    return true;
  }

  const sceneId = issue.sceneId ?? issue.location?.sceneId ?? null;
  const pageIndex = issue.pageIndex ?? issue.location?.pageIndex ?? null;
  if (!sceneId || !focus.checkedSceneIds.includes(sceneId)) {
    return false;
  }

  if (!Number.isInteger(pageIndex)) {
    return true;
  }

  return focus.changedPaths.some((changedPath) => (
    changedPath === `scenes.${sceneId}`
    || changedPath.startsWith(`scenes.${sceneId}.pages.${pageIndex}`)
  ));
}

function filterAuthorCheckReport(report, focus) {
  if (focus.mode !== 'transaction') {
    return report;
  }

  const warnings = (report.warnings ?? []).filter((issue) => issueMatchesAuthorCheckFocus(issue, focus));
  return {
    ...report,
    ok: warnings.length === 0,
    warnings,
    suggestions: (report.suggestions ?? []).filter((issue) => issueMatchesAuthorCheckFocus(issue, focus)),
    aggregate: {
      ok: report.ok,
      warningCount: report.warnings?.length ?? 0,
    },
  };
}

function filterAuthorCheckReadiness(readiness, focus) {
  if (focus.mode !== 'transaction') {
    return readiness;
  }

  const blockers = (readiness.blockers ?? []).filter((issue) => issueMatchesAuthorCheckFocus(issue, focus));
  const warnings = (readiness.warnings ?? []).filter((issue) => issueMatchesAuthorCheckFocus(issue, focus));
  return {
    ...readiness,
    ready: blockers.length === 0,
    blockers,
    warnings,
    aggregate: {
      ready: readiness.ready,
      blockerCount: readiness.blockers?.length ?? 0,
      warningCount: readiness.warnings?.length ?? 0,
    },
  };
}

function createMutationChangeSummary({
  command,
  scriptPath,
  outPath,
  dryRun,
  beforeScript,
  afterScript,
  result,
  validation,
  writeResult = null,
}) {
  const beforeCounts = summarizeScriptShape(beforeScript);
  const afterCounts = summarizeScriptShape(afterScript);

  return {
    command,
    dryRun,
    writeStatus: dryRun ? 'planned' : 'written',
    scriptPath,
    outPath,
    target: getMutationTarget(result),
    changedPaths: getChangedPaths(result),
    counts: {
      before: beforeCounts,
      after: afterCounts,
      delta: subtractCounts(afterCounts, beforeCounts),
    },
    validation: {
      ok: validation.ok,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    },
    checkpointPath: writeResult?.checkpointPath ?? null,
    backupPath: writeResult?.backupPath ?? null,
  };
}

function normalizePlanCommand(command) {
  return String(command ?? '').trim();
}

const SUPPORTED_APPLY_PLAN_COMMANDS = [
  'add-scene',
  'rename-scene',
  'delete-scene',
  'set-scene-next',
  'retarget-scene',
  'repair-scene-target',
  'clear-scene-references',
  'add-character',
  'add-variable',
  'update-variable',
  'rename-variable',
  'delete-variable',
  'add-affection-variable',
  'add-ending',
  'update-ending',
  'remove-ending',
  'add-ending-unlock',
  'add-cg',
  'update-cg',
  'remove-cg',
  'add-cg-unlock',
  'add-page',
  'remove-page',
  'move-page',
  'add-dialogue',
  'set-dialogue',
  'remove-dialogue',
  'move-dialogue',
  'add-choice-option',
  'set-choice-page',
  'set-choice-option',
  'remove-choice-option',
  'move-choice-option',
  'set-condition-page',
  'set-page-background',
  'set-page-characters',
  'set-page-audio',
  'set-page-media',
  'set-page-camera',
  'set-camera-effect',
  'set-page-transition',
  'set-page-transitions',
  'set-character-animation',
  'set-character-transition',
  'set-title-screen',
  'add-title-element',
  'update-title-element',
  'remove-title-element',
  'set-screen-layout',
  'set-dialogue-box',
  'set-theme',
  'set-widget-styles',
  'add-choice-effect',
  'set-choice-effect',
  'remove-choice-effect',
];

function createPlanOperationError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function getOperationParams(operation = {}) {
  return operation.params ?? operation.args ?? {};
}

function getParam(params, ...names) {
  for (const name of names) {
    if (params[name] !== undefined) {
      return params[name];
    }
  }
  return undefined;
}

function requireParam(params, command, ...names) {
  const value = getParam(params, ...names);
  if (value === undefined || value === null || value === '') {
    throw createPlanOperationError(
      'missing-apply-plan-param',
      `${command} requires ${names[0]}`,
      {
        missingParam: names[0],
        acceptedParams: names,
      },
    );
  }
  return value;
}

function createApplyPlanFailureSuggestedAction(failure) {
  if (failure.code === 'missing-apply-plan-command') {
    return {
      summary: 'Add a supported apply-plan command to this operation.',
      commands: [],
      repairHint: {
        action: 'add-command',
        path: `operations[${failure.index}].command`,
        supportedCommands: failure.supportedCommands ?? [],
      },
    };
  }

  if (failure.code === 'missing-apply-plan-param') {
    return {
      summary: `Add required param "${failure.missingParam}" to this operation.`,
      commands: [],
      repairHint: {
        action: 'add-param',
        path: `operations[${failure.index}].params.${failure.missingParam}`,
        missingParam: failure.missingParam,
        acceptedParams: failure.acceptedParams ?? [failure.missingParam],
      },
    };
  }

  if (failure.code === 'unsupported-apply-plan-command') {
    return {
      summary: 'Replace this operation with one or more supported apply-plan commands.',
      commands: [],
      repairHint: {
        action: 'replace-command',
        path: `operations[${failure.index}].command`,
        unsupportedCommand: failure.command,
        supportedCommands: failure.supportedCommands ?? [],
      },
    };
  }

  return {
    summary: 'Inspect this operation and repair the plan before retrying apply-plan.',
    commands: [],
    repairHint: {
      action: 'inspect-operation',
      path: `operations[${failure.index}]`,
    },
  };
}

function buildPlanPage(command, params) {
  const type = getParam(params, 'type') ?? 'normal';
  const page = {
    id: getParam(params, 'id'),
    background: getParam(params, 'background'),
    characters: getParam(params, 'characters'),
    bgm: getParam(params, 'bgm'),
    se: getParam(params, 'se'),
    transition: getParam(params, 'transition'),
    ...cloneJsonValue(getParam(params, 'page') ?? {}),
  };
  dropUndefinedFields(page);

  if (type === 'choice') {
    page.prompt = getParam(params, 'prompt') ?? page.prompt ?? '';
    page.options = getParam(params, 'options') ?? page.options ?? [];
    return { type, page };
  }

  if (type === 'condition') {
    page.conditionMode = getParam(params, 'conditionMode', 'condition-mode') ?? page.conditionMode ?? 'all';
    page.conditions = getParam(params, 'conditions') ?? page.conditions ?? [];
    page.trueTarget = getParam(params, 'trueTarget', 'true-target') ?? page.trueTarget ?? null;
    page.falseTarget = getParam(params, 'falseTarget', 'false-target') ?? page.falseTarget ?? null;
    return { type, page };
  }

  page.dialogues = getParam(params, 'dialogues') ?? page.dialogues ?? [];
  return { type: 'normal', page };
}

function buildTitleScreenPatch(params) {
  return dropUndefinedFields({
    background: getParam(params, 'clearBackground', 'clear-background') ? null : getParam(params, 'background'),
    bgm: getParam(params, 'clearBgm', 'clear-bgm') ? null : getParam(params, 'bgm'),
    elements: getParam(params, 'elements'),
    config: getParam(params, 'config'),
    merge: getParam(params, 'merge') ?? true,
  });
}

function buildTitleElement(command, params, { requireType = true } = {}) {
  return getParam(params, 'element') ?? dropUndefinedFields({
    id: getParam(params, 'id', 'elementId', 'element-id'),
    type: requireType ? requireParam(params, command, 'type') : getParam(params, 'type'),
    content: getParam(params, 'content'),
    text: getParam(params, 'text', 'label'),
    action: getParam(params, 'action'),
    src: getParam(params, 'src'),
    x: getParam(params, 'x'),
    y: getParam(params, 'y'),
    anchor: getParam(params, 'anchor'),
    width: getParam(params, 'width'),
    height: getParam(params, 'height'),
    fontSize: getParam(params, 'fontSize', 'font-size'),
    fontFamily: getParam(params, 'fontFamily', 'font-family'),
    color: getParam(params, 'color'),
    backgroundColor: getParam(params, 'backgroundColor', 'background-color'),
    border: getParam(params, 'border'),
    borderRadius: getParam(params, 'borderRadius', 'border-radius'),
    hoverColor: getParam(params, 'hoverColor', 'hover-color'),
    letterSpacing: getParam(params, 'letterSpacing', 'letter-spacing'),
    textShadow: getParam(params, 'textShadow', 'text-shadow'),
  });
}

function buildScreenLayoutPatch(command, params) {
  return {
    screenId: requireParam(params, command, 'screenId', 'screen'),
    config: requireParam(params, command, 'config'),
    merge: getParam(params, 'merge') ?? true,
  };
}

function buildSharedUiConfigPatch(command, params) {
  return {
    config: requireParam(params, command, 'config'),
    merge: getParam(params, 'merge') ?? true,
  };
}

function applyPlanOperation(session, operation = {}, index = 0) {
  const command = normalizePlanCommand(operation.command ?? operation.op);
  const params = getOperationParams(operation);
  if (!command) {
    throw createPlanOperationError(
      'missing-apply-plan-command',
      `Operation ${index} is missing command`,
      { supportedCommands: SUPPORTED_APPLY_PLAN_COMMANDS },
    );
  }

  if (command === 'add-scene') {
    const id = requireParam(params, command, 'id', 'sceneId', 'scene');
    return session.addScene({
      id,
      name: getParam(params, 'name') ?? id,
      next: getParam(params, 'next') ?? null,
    });
  }

  if (command === 'rename-scene') {
    return session.renameScene({
      sceneId: requireParam(params, command, 'sceneId', 'scene', 'id'),
      newSceneId: requireParam(params, command, 'newSceneId', 'newId', 'new-id', 'to'),
      name: getParam(params, 'name'),
    });
  }

  if (command === 'delete-scene') {
    return session.deleteScene({
      sceneId: requireParam(params, command, 'sceneId', 'scene', 'id'),
      forceReferences: Boolean(getParam(params, 'forceReferences', 'force-references')),
    });
  }

  if (command === 'set-scene-next') {
    return session.setSceneNext({
      sceneId: requireParam(params, command, 'sceneId', 'scene', 'id'),
      next: getParam(params, 'next') ?? null,
    });
  }

  if (command === 'retarget-scene') {
    return session.retargetSceneReferences({
      fromSceneId: requireParam(params, command, 'fromSceneId', 'from', 'scene'),
      toSceneId: requireParam(params, command, 'toSceneId', 'to', 'target'),
    });
  }

  if (command === 'repair-scene-target') {
    return session.retargetSceneReferences({
      fromSceneId: requireParam(params, command, 'fromSceneId', 'from', 'scene'),
      toSceneId: requireParam(params, command, 'toSceneId', 'to', 'target'),
      allowMissingSource: true,
    });
  }

  if (command === 'clear-scene-references') {
    return session.clearSceneReferences({
      sceneId: requireParam(params, command, 'sceneId', 'scene', 'id'),
      allowMissingTarget: true,
    });
  }

  if (command === 'add-character') {
    const id = requireParam(params, command, 'id', 'characterId', 'character');
    return session.addCharacter({
      id,
      name: getParam(params, 'name') ?? id,
      color: getParam(params, 'color') ?? '#ffffff',
      expressions: getParam(params, 'expressions') ?? {},
    });
  }

  if (command === 'add-variable') {
    const id = requireParam(params, command, 'id', 'variableId', 'variable');
    const type = getParam(params, 'type') ?? 'number';
    return session.addVariable({
      id,
      type,
      initial: getParam(params, 'initial') ?? (type === 'bool' ? false : 0),
      label: getParam(params, 'label', 'name') ?? id,
      group: getParam(params, 'group'),
      notes: getParam(params, 'notes'),
      kind: getParam(params, 'kind'),
      characterId: getParam(params, 'characterId', 'character'),
      min: getParam(params, 'min'),
      max: getParam(params, 'max'),
      step: getParam(params, 'step'),
    });
  }

  if (command === 'update-variable') {
    return session.updateVariable({
      variableId: requireParam(params, command, 'variableId', 'id', 'variable'),
      patch: getParam(params, 'patch') ?? dropUndefinedFields({
        type: getParam(params, 'type'),
        initial: getParam(params, 'initial'),
        label: getParam(params, 'label', 'name'),
        group: getParam(params, 'group'),
        notes: getParam(params, 'notes'),
        kind: getParam(params, 'kind'),
        characterId: getParam(params, 'characterId', 'character'),
        min: getParam(params, 'min'),
        max: getParam(params, 'max'),
        step: getParam(params, 'step'),
      }),
    });
  }

  if (command === 'rename-variable') {
    return session.renameVariable({
      variableId: requireParam(params, command, 'variableId', 'id', 'variable'),
      newVariableId: requireParam(params, command, 'newVariableId', 'newId', 'new-id', 'to'),
    });
  }

  if (command === 'delete-variable') {
    return session.deleteVariable({
      variableId: requireParam(params, command, 'variableId', 'id', 'variable'),
      forceReferences: Boolean(getParam(params, 'forceReferences', 'force-references')),
    });
  }

  if (command === 'add-affection-variable') {
    return session.addAffectionVariable({
      characterId: requireParam(params, command, 'characterId', 'character'),
      id: getParam(params, 'id', 'variableId', 'variable'),
      initial: getParam(params, 'initial'),
      label: getParam(params, 'label', 'name'),
      group: getParam(params, 'group'),
      notes: getParam(params, 'notes'),
      min: getParam(params, 'min'),
      max: getParam(params, 'max'),
      step: getParam(params, 'step'),
    });
  }

  if (command === 'add-ending') {
    const id = requireParam(params, command, 'id', 'endingId', 'ending');
    return session.addEnding({
      id,
      title: getParam(params, 'title', 'name') ?? id,
      category: getParam(params, 'category'),
      order: getParam(params, 'order'),
      description: getParam(params, 'description'),
      thumbnail: getParam(params, 'thumbnail'),
      hiddenUntilUnlocked: getParam(params, 'hiddenUntilUnlocked', 'hidden-until-unlocked'),
    });
  }

  if (command === 'update-ending') {
    return session.updateEnding({
      endingId: requireParam(params, command, 'endingId', 'id', 'ending'),
      patch: getParam(params, 'patch') ?? dropUndefinedFields({
        title: getParam(params, 'title', 'name'),
        category: getParam(params, 'category'),
        order: getParam(params, 'order'),
        description: getParam(params, 'description'),
        thumbnail: getParam(params, 'thumbnail'),
        hiddenUntilUnlocked: getParam(params, 'hiddenUntilUnlocked', 'hidden-until-unlocked'),
      }),
    });
  }

  if (command === 'remove-ending') {
    return session.removeEnding({
      endingId: requireParam(params, command, 'endingId', 'id', 'ending'),
      forceReferences: Boolean(getParam(params, 'forceReferences', 'force-references')),
    });
  }

  if (command === 'add-ending-unlock') {
    return session.addEndingUnlock({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      optionIndex: getParam(params, 'optionIndex', 'option'),
      endingId: requireParam(params, command, 'endingId', 'id', 'ending'),
    });
  }

  if (command === 'add-cg') {
    const id = requireParam(params, command, 'id', 'cgId', 'cg');
    return session.addCg({
      id,
      title: getParam(params, 'title', 'name') ?? id,
      images: getParam(params, 'images'),
      thumbnail: getParam(params, 'thumbnail'),
      lockedThumbnail: getParam(params, 'lockedThumbnail', 'locked-thumbnail'),
      category: getParam(params, 'category'),
      order: getParam(params, 'order'),
      description: getParam(params, 'description'),
    });
  }

  if (command === 'update-cg') {
    return session.updateCg({
      cgId: requireParam(params, command, 'cgId', 'id', 'cg'),
      patch: getParam(params, 'patch') ?? dropUndefinedFields({
        title: getParam(params, 'title', 'name'),
        images: getParam(params, 'images'),
        thumbnail: getParam(params, 'thumbnail'),
        lockedThumbnail: getParam(params, 'lockedThumbnail', 'locked-thumbnail'),
        category: getParam(params, 'category'),
        order: getParam(params, 'order'),
        description: getParam(params, 'description'),
      }),
    });
  }

  if (command === 'remove-cg') {
    return session.removeCg({
      cgId: requireParam(params, command, 'cgId', 'id', 'cg'),
      forceReferences: Boolean(getParam(params, 'forceReferences', 'force-references')),
    });
  }

  if (command === 'add-cg-unlock') {
    return session.addCgUnlock({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: Number(requireParam(params, command, 'pageIndex', 'page')),
      optionIndex: Number(requireParam(params, command, 'optionIndex', 'option')),
      cgId: requireParam(params, command, 'cgId', 'id', 'cg'),
    });
  }

  if (command === 'add-page') {
    const sceneId = requireParam(params, command, 'sceneId', 'scene');
    const { type, page } = buildPlanPage(command, params);
    if (type === 'choice') {
      return session.addChoicePage({ sceneId, page });
    }
    if (type === 'condition') {
      return session.addConditionPage({ sceneId, page });
    }
    return session.addNormalPage({ sceneId, page });
  }

  if (command === 'remove-page') {
    return session.removePage({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
    });
  }

  if (command === 'move-page') {
    return session.movePage({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      fromIndex: requireParam(params, command, 'fromIndex', 'from'),
      toIndex: requireParam(params, command, 'toIndex', 'to'),
    });
  }

  if (command === 'add-dialogue') {
    return session.addDialogue({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      dialogue: getParam(params, 'dialogue') ?? {
        speaker: getParam(params, 'speaker') ?? null,
        text: getParam(params, 'text') ?? '',
        expression: getParam(params, 'expression') ?? null,
        voice: getParam(params, 'voice') ?? null,
      },
    });
  }

  if (command === 'set-dialogue') {
    return session.setDialogue({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      dialogueIndex: requireParam(params, command, 'dialogueIndex', 'dialogue'),
      dialogue: dropUndefinedFields(getParam(params, 'dialogue') ?? {
        speaker: getParam(params, 'speaker'),
        text: getParam(params, 'text'),
        expression: getParam(params, 'expression'),
        voice: getParam(params, 'voice'),
      }),
    });
  }

  if (command === 'remove-dialogue') {
    return session.removeDialogue({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      dialogueIndex: requireParam(params, command, 'dialogueIndex', 'dialogue'),
    });
  }

  if (command === 'move-dialogue') {
    return session.moveDialogue({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      fromIndex: requireParam(params, command, 'fromIndex', 'from'),
      toIndex: requireParam(params, command, 'toIndex', 'to'),
    });
  }

  if (command === 'add-choice-option') {
    return session.addChoiceOption({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      option: getParam(params, 'option') ?? {
        text: getParam(params, 'text') ?? '',
        target: getParam(params, 'target') ?? null,
        effects: getParam(params, 'effects') ?? [],
      },
    });
  }

  if (command === 'set-choice-page') {
    return session.setChoicePage({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      prompt: getParam(params, 'prompt'),
      options: getParam(params, 'options'),
    });
  }

  if (command === 'set-choice-option') {
    return session.setChoiceOption({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      optionIndex: requireParam(params, command, 'optionIndex', 'option'),
      option: getParam(params, 'option') ?? dropUndefinedFields({
        text: getParam(params, 'text'),
        target: getParam(params, 'clearTarget', 'clear-target') ? null : getParam(params, 'target'),
        effects: getParam(params, 'effects'),
      }),
    });
  }

  if (command === 'remove-choice-option') {
    return session.removeChoiceOption({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      optionIndex: requireParam(params, command, 'optionIndex', 'option'),
    });
  }

  if (command === 'move-choice-option') {
    return session.moveChoiceOption({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      fromIndex: requireParam(params, command, 'fromIndex', 'from'),
      toIndex: requireParam(params, command, 'toIndex', 'to'),
    });
  }

  if (command === 'set-condition-page') {
    return session.setConditionPage({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      condition: getParam(params, 'condition') ?? dropUndefinedFields({
        conditionMode: getParam(params, 'conditionMode', 'condition-mode'),
        conditions: getParam(params, 'conditions'),
        trueTarget: getParam(params, 'clearTrueTarget', 'clear-true-target') ? null : getParam(params, 'trueTarget', 'true-target'),
        falseTarget: getParam(params, 'clearFalseTarget', 'clear-false-target') ? null : getParam(params, 'falseTarget', 'false-target'),
      }),
    });
  }

  if (command === 'set-page-background') {
    return session.setPageBackground({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      background: getParam(params, 'background') ?? '',
    });
  }

  if (command === 'set-page-characters') {
    return session.setPageCharacters({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      characters: getParam(params, 'characters') ?? [],
    });
  }

  if (command === 'set-page-audio') {
    return session.setPageAudio({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      bgm: getParam(params, 'bgm'),
      se: getParam(params, 'se'),
    });
  }

  if (command === 'set-page-media') {
    return session.setPageMedia({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      background: getParam(params, 'clearBackground', 'clear-background') ? '' : getParam(params, 'background'),
      bgm: getParam(params, 'bgm'),
      se: getParam(params, 'se'),
    });
  }

  if (command === 'set-page-camera') {
    const effect = getParam(params, 'effect');
    return session.setPageCamera({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      camera: getParam(params, 'clearCamera', 'clear-camera')
        ? null
        : getParam(params, 'camera') ?? (effect !== undefined ? {
          effect,
          direction: getParam(params, 'direction'),
          intensity: getParam(params, 'intensity') ?? 'medium',
          durationMs: getParam(params, 'durationMs', 'duration-ms') ?? 800,
        } : null),
    });
  }

  if (command === 'set-camera-effect') {
    return session.setPageCamera({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      camera: getParam(params, 'clearCamera', 'clear-camera')
        ? null
        : getParam(params, 'camera') ?? {
          effect: requireParam(params, command, 'effect', 'id'),
          direction: getParam(params, 'direction'),
          intensity: getParam(params, 'intensity') ?? 'medium',
          durationMs: getParam(params, 'durationMs', 'duration-ms') ?? 800,
        },
    });
  }

  if (command === 'set-page-transition') {
    const type = getParam(params, 'type');
    const duration = getParam(params, 'duration');
    return session.setPageTransition({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      transition: getParam(params, 'clearTransition', 'clear-transition')
        ? null
        : getParam(params, 'transition') ?? (type !== undefined || duration !== undefined ? {
          type: type ?? 'fade',
          duration: duration ?? 800,
        } : null),
    });
  }

  if (command === 'set-page-transitions') {
    const type = getParam(params, 'type');
    const duration = getParam(params, 'duration');
    const predicate = getParam(params, 'predicate') ?? {};
    return session.setPageTransitions({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      fromPageIndex: getParam(params, 'fromPageIndex', 'fromPage', 'from-page'),
      toPageIndex: getParam(params, 'toPageIndex', 'toPage', 'to-page'),
      pageType: getParam(params, 'pageType', 'page-type') ?? predicate.pageType,
      hasBackground: getParam(params, 'hasBackground', 'has-background') ?? predicate.hasBackground,
      transition: getParam(params, 'clearTransition', 'clear-transition')
        ? null
        : getParam(params, 'transition') ?? (type !== undefined || duration !== undefined ? {
          type: type ?? 'fade',
          duration: duration ?? 800,
        } : null),
    });
  }

  if (command === 'set-character-animation') {
    return session.setCharacterAnimation({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      characterId: requireParam(params, command, 'characterId', 'character'),
      animation: getParam(params, 'animation') ?? 'none',
    });
  }

  if (command === 'set-character-transition') {
    return session.setCharacterAnimation({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      characterId: requireParam(params, command, 'characterId', 'character'),
      animation: getParam(params, 'transition', 'animation', 'id') ?? 'none',
    });
  }

  if (command === 'set-title-screen') {
    return session.setTitleScreen(buildTitleScreenPatch(params));
  }

  if (command === 'add-title-element') {
    return session.addTitleElement({
      element: buildTitleElement(command, params),
    });
  }

  if (command === 'update-title-element') {
    return session.updateTitleElement({
      elementId: getParam(params, 'elementId', 'element-id', 'id'),
      index: getParam(params, 'index', 'elementIndex', 'element-index'),
      patch: getParam(params, 'patch') ?? buildTitleElement(command, params, { requireType: false }),
    });
  }

  if (command === 'remove-title-element') {
    return session.removeTitleElement({
      elementId: getParam(params, 'elementId', 'element-id', 'id'),
      index: getParam(params, 'index', 'elementIndex', 'element-index'),
    });
  }

  if (command === 'set-screen-layout') {
    return session.setScreenLayout(buildScreenLayoutPatch(command, params));
  }

  if (command === 'set-dialogue-box') {
    return session.setDialogueBox(buildSharedUiConfigPatch(command, params));
  }

  if (command === 'set-theme') {
    return session.setTheme(buildSharedUiConfigPatch(command, params));
  }

  if (command === 'set-widget-styles') {
    return session.setWidgetStyles(buildSharedUiConfigPatch(command, params));
  }

  if (command === 'add-choice-effect') {
    return session.addChoiceEffect({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      optionIndex: requireParam(params, command, 'optionIndex', 'option'),
      effect: getParam(params, 'effect') ?? {
        type: getParam(params, 'effectType', 'effect-type') ?? 'var:add',
        id: getParam(params, 'effectId', 'effect-id', 'variable'),
        value: getParam(params, 'value') ?? 1,
      },
    });
  }

  if (command === 'set-choice-effect') {
    return session.setChoiceEffect({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      optionIndex: requireParam(params, command, 'optionIndex', 'option'),
      effectIndex: requireParam(params, command, 'effectIndex', 'effect-index', 'effect'),
      effect: getParam(params, 'effect') ?? {
        type: getParam(params, 'effectType', 'effect-type') ?? 'var:add',
        id: getParam(params, 'effectId', 'effect-id', 'variable'),
        value: getParam(params, 'value') ?? 1,
      },
    });
  }

  if (command === 'remove-choice-effect') {
    return session.removeChoiceEffect({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      optionIndex: requireParam(params, command, 'optionIndex', 'option'),
      effectIndex: requireParam(params, command, 'effectIndex', 'effect-index', 'effect'),
    });
  }

  throw createPlanOperationError(
    'unsupported-apply-plan-command',
    `Unsupported apply-plan command: ${command}`,
    { supportedCommands: SUPPORTED_APPLY_PLAN_COMMANDS },
  );
}

async function writeScriptFile(filePath, script, { force = false, backup = false, checkpoint = false } = {}) {
  const exists = await pathExists(filePath);
  if (exists && !force) {
    throw new Error(`Refusing to overwrite existing file without --force: ${filePath}`);
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  let checkpointPath = null;
  if (exists && checkpoint) {
    checkpointPath = createCheckpointPath(filePath);
    await mkdir(path.dirname(checkpointPath), { recursive: true });
    await copyFile(filePath, checkpointPath);
  }

  let backupPath = null;
  if (exists && backup) {
    backupPath = `${filePath}.bak`;
    await copyFile(filePath, backupPath);
  }

  await writeFile(filePath, `${JSON.stringify(script, null, 2)}\n`, 'utf8');
  return { backupPath, checkpointPath };
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printIssue(issue) {
  process.stdout.write(`[${issue.severity}] ${issue.code} ${issue.pathString ? `(${issue.pathString}) ` : ''}${issue.message}\n`);
}

function summarizeIssues(source, issues = []) {
  return issues.map((issue) => ({
    source,
    severity: issue.severity ?? 'warning',
    category: issue.category,
    code: issue.code,
    message: issue.message,
    pathString: issue.pathString ?? '',
    screenId: issue.screenId,
    reference: issue.reference,
    matched: issue.matched,
    gaps: issue.gaps,
    location: issue.location ?? (
      issue.sceneId ? { sceneId: issue.sceneId, pageIndex: issue.pageIndex ?? null } : undefined
    ),
    suggestedAction: issue.suggestedAction,
  }));
}

function normalizeReferenceScreenshotNotesForCheck(transactionData = null) {
  const notes = transactionData?.handoff?.referenceScreenshotNotes
    ?? transactionData?.changeSummary?.referenceScreenshotNotes
    ?? [];
  if (!Array.isArray(notes)) {
    return [];
  }

  const screenIds = new Set(PREVIEW_SCREEN_PATHS.values());
  return notes
    .filter((note) => note && typeof note === 'object')
    .map((note) => {
      const screenId = typeof note.screenId === 'string' && screenIds.has(note.screenId)
        ? note.screenId
        : null;
      const summary = typeof note.summary === 'string' && note.summary.trim()
        ? note.summary.trim()
        : null;
      const reference = typeof note.reference === 'string' && note.reference.trim()
        ? note.reference.trim()
        : null;
      const matched = Array.isArray(note.matched)
        ? note.matched.filter((entry) => typeof entry === 'string' && entry.trim()).map((entry) => entry.trim())
        : [];
      const gaps = Array.isArray(note.gaps)
        ? note.gaps.filter((entry) => typeof entry === 'string' && entry.trim()).map((entry) => entry.trim())
        : [];
      if (!screenId && !summary && !reference && matched.length === 0 && gaps.length === 0) {
        return null;
      }
      return { screenId, summary, reference, matched, gaps };
    })
    .filter(Boolean);
}

function collectReferenceScreenshotIssues(transactionData = null) {
  return normalizeReferenceScreenshotNotesForCheck(transactionData).map((note) => {
    const pathString = note.screenId ? `ui.${note.screenId}` : 'ui';
    const message = [
      note.summary,
      note.matched.length ? `Matched: ${note.matched.join('; ')}` : null,
      note.gaps.length ? `Needs review: ${note.gaps.join('; ')}` : null,
    ].filter(Boolean).join(' ') || 'Review screen UI fidelity against the provided reference screenshot.';

    return {
      source: 'preview',
      severity: 'warning',
      category: 'reference-screenshot-fidelity',
      code: 'reference-screenshot-fidelity-note',
      pathString,
      message,
      screenId: note.screenId,
      reference: note.reference,
      matched: note.matched,
      gaps: note.gaps,
      suggestedAction: {
        summary: 'Compare the preview target against the reference screenshot and adjust only through structured screen UI fields.',
        commands: [
          {
            command: 'author-check',
            args: ['--script', '<script.json>', '--transaction', '<apply-result.json>', '--write-preview-plan', '--json'],
          },
        ],
      },
    };
  });
}

function collectScreenPreviewIssues(screenTargets = []) {
  return screenTargets
    .filter((target) => target?.type === 'screen' || target?.screenId)
    .map((target) => {
      const screenId = target.screenId ?? null;
      return {
        source: 'preview',
        severity: 'warning',
        category: 'screen-ui-preview',
        code: 'screen-ui-preview-required',
        pathString: screenId ? `ui.${screenId}` : 'ui',
        message: screenId
          ? `Screen "${screenId}" changed and needs visual review in the editor preview.`
          : 'A screen UI section changed and needs visual review in the editor preview.',
        screenId,
        suggestedAction: {
          summary: 'Open the generated preview target or Project Settings preview, then mark the handoff item resolved after review.',
          commands: [
            {
              command: 'author-check',
              args: ['--script', '<script.json>', '--transaction', '<apply-result.json>', '--write-preview-plan', '--json'],
            },
          ],
        },
      };
    });
}

function collectEndingPreviewIssues(endingTargets = []) {
  return endingTargets.map((target) => ({
    source: 'preview',
    severity: 'warning',
    category: 'ending-list-preview',
    code: 'ending-list-preview-required',
    pathString: target.pathString ?? 'systems.endings',
    message: 'Ending registry changed and needs review in the Story Systems ending list.',
    suggestedAction: {
      summary: 'Open Story Systems, review the ending list and unlock routing, then mark the handoff item resolved.',
      commands: [
        {
          command: 'list-endings',
          args: ['--script', '<script.json>', '--json'],
        },
      ],
    },
  }));
}

function collectGalleryPreviewIssues(galleryTargets = []) {
  return galleryTargets.map((target) => ({
    source: 'preview',
    severity: 'warning',
    category: 'gallery-preview',
    code: 'gallery-preview-required',
    pathString: target.pathString ?? 'systems.gallery.cg',
    message: 'CG registry changed and needs review in Story Systems and the runtime gallery.',
    suggestedAction: {
      summary: 'Open Story Systems, review CG artwork and unlock routing, then preview the gallery.',
      commands: [
        {
          command: 'list-cg',
          args: ['--script', '<script.json>', '--json'],
        },
      ],
    },
  }));
}

function collectBranchGraphPreviewIssues(branchGraphTargets = []) {
  return branchGraphTargets.map((target) => ({
    source: 'preview',
    severity: 'warning',
    category: 'branch-graph-preview',
    code: 'branch-graph-preview-required',
    pathString: target.pathString ?? 'analysis.sceneGraph',
    message: 'Scene flow changed and needs review in the Story Systems branch graph.',
    suggestedAction: {
      summary: 'Open Story Systems, review branch reachability and terminal routes, then resolve any graph diagnostics.',
      commands: [
        {
          command: 'graph-report',
          args: ['--script', '<script.json>', '--json'],
        },
      ],
    },
  }));
}

function collectAuthorCheckSuggestions({
  validation,
  layout,
  readiness,
  preview,
  referenceDiagnostics,
  referenceScreenshotIssues,
  screenPreviewIssues,
  endingPreviewIssues,
  galleryPreviewIssues,
  branchGraphPreviewIssues,
}) {
  const suggestions = [];
  for (const warning of layout.warnings ?? []) {
    if (warning.suggestedAction) {
      suggestions.push({
        source: 'layout',
        code: warning.code,
        pathString: warning.pathString,
        location: warning.location,
        suggestedAction: warning.suggestedAction,
      });
    }
  }

  for (const issue of [...(readiness.blockers ?? []), ...(readiness.warnings ?? [])]) {
    suggestions.push({
      source: issue.source ?? 'readiness',
      code: issue.code,
      pathString: issue.pathString ?? '',
      suggestedAction: issue.suggestedAction ?? {
        summary: issue.severity === 'error'
          ? 'Resolve this blocker before export.'
          : 'Review this warning before handoff.',
        commands: [],
      },
    });
  }

  for (const suggestion of preview?.suggestions ?? preview?.quality?.suggestions ?? []) {
    suggestions.push({
      source: 'preview',
      code: suggestion.code,
      suggestedAction: suggestion.suggestedAction,
    });
  }

  for (const diagnostic of referenceDiagnostics ?? []) {
    suggestions.push({
      source: diagnostic.source,
      code: diagnostic.code,
      pathString: diagnostic.pathString,
      suggestedAction: diagnostic.suggestedAction,
    });
  }

  for (const issue of referenceScreenshotIssues ?? []) {
    suggestions.push({
      source: issue.source,
      code: issue.code,
      pathString: issue.pathString,
      suggestedAction: issue.suggestedAction,
    });
  }

  for (const issue of screenPreviewIssues ?? []) {
    suggestions.push({
      source: issue.source,
      code: issue.code,
      pathString: issue.pathString,
      suggestedAction: issue.suggestedAction,
    });
  }

  for (const issue of endingPreviewIssues ?? []) {
    suggestions.push({
      source: issue.source,
      code: issue.code,
      pathString: issue.pathString,
      suggestedAction: issue.suggestedAction,
    });
  }

  for (const issue of galleryPreviewIssues ?? []) {
    suggestions.push({
      source: issue.source,
      code: issue.code,
      pathString: issue.pathString,
      suggestedAction: issue.suggestedAction,
    });
  }

  for (const issue of branchGraphPreviewIssues ?? []) {
    suggestions.push({
      source: issue.source,
      code: issue.code,
      pathString: issue.pathString,
      suggestedAction: issue.suggestedAction,
    });
  }

  if (!validation.ok) {
    for (const error of validation.errors) {
      suggestions.push({
        source: 'validation',
        code: error.code,
        pathString: error.pathString,
        suggestedAction: {
          summary: 'Fix this validation error before making additional content edits.',
          commands: [],
        },
      });
    }
  }

  return suggestions;
}

function isRenderablePreviewTarget(target = {}) {
  return target.type === 'scene' || target.type === 'screen' || target.sceneId || target.screenId;
}

function previewOutPathForTarget(baseOutPath, target, index) {
  if (index === 0) {
    return baseOutPath;
  }

  const parsed = path.parse(baseOutPath);
  if (target.type === 'screen' || target.screenId) {
    const safeScreenId = String(target.screenId ?? 'screen').replace(/[^a-z0-9_-]+/gi, '_');
    return path.join(parsed.dir, `${parsed.name}-${safeScreenId}${parsed.ext || '.png'}`);
  }

  const safeSceneId = String(target.sceneId ?? 'scene').replace(/[^a-z0-9_-]+/gi, '_');
  const suffix = `${safeSceneId}-p${target.pageIndex ?? 0}`;
  return path.join(parsed.dir, `${parsed.name}-${suffix}${parsed.ext || '.png'}`);
}

async function inspect(args) {
  const { scriptPath, script } = await readScript(args);
  const summary = {
    scriptPath,
    title: script.meta?.title ?? null,
    projectId: script.projectId ?? null,
    characterCount: Object.keys(script.characters ?? {}).length,
    sceneCount: Object.keys(script.scenes ?? {}).length,
    variableCount: Object.keys(script.systems?.variables ?? {}).length,
    endingCount: Object.keys(script.systems?.endings ?? {}).length,
  };

  if (hasFlag(args, '--json')) {
    writeJson(summary);
    return 0;
  }

  process.stdout.write(`Script: ${summary.scriptPath}\n`);
  process.stdout.write(`Title: ${summary.title ?? '(untitled)'}\n`);
  process.stdout.write(`Project ID: ${summary.projectId ?? '(missing)'}\n`);
  process.stdout.write(`Characters: ${summary.characterCount}\n`);
  process.stdout.write(`Scenes: ${summary.sceneCount}\n`);
  process.stdout.write(`Variables: ${summary.variableCount}\n`);
  process.stdout.write(`Endings: ${summary.endingCount}\n`);
  return 0;
}

async function listAssets(args) {
  const projectPath = resolveAssetProjectPath(args);
  const assetRoot = path.join(projectPath, 'assets');
  const assets = createEmptyAssetLibrary();

  for (const category of ASSET_LIBRARY_CATEGORIES) {
    assets[category] = await collectAssetCategory({ assetRoot, category });
  }

  const output = {
    projectPath,
    assetRoot,
    categories: ASSET_LIBRARY_CATEGORIES,
    assets,
  };

  if (hasFlag(args, '--json')) {
    writeJson(output);
    return 0;
  }

  process.stdout.write(`Project: ${projectPath}\n`);
  process.stdout.write(`Assets: ${assetRoot}\n`);
  for (const category of ASSET_LIBRARY_CATEGORIES) {
    process.stdout.write(`${category}: ${assets[category].length}\n`);
    for (const asset of assets[category]) {
      process.stdout.write(`  - ${asset.path}\n`);
    }
  }

  return 0;
}

function listTransitions(args) {
  const target = getArgValue(args, '--target', null);
  const supportedOnly = hasFlag(args, '--supported-only');
  const transitions = listTransitionCatalog({ target, supportedOnly });
  const output = {
    target,
    supportedOnly,
    count: transitions.length,
    transitions,
  };

  if (hasFlag(args, '--json')) {
    writeJson(output);
    return 0;
  }

  process.stdout.write(`Transitions: ${output.count}\n`);
  for (const transition of transitions) {
    const support = transition.runtimeSupported ? 'supported' : `fallback: ${transition.fallbackId ?? 'none'}`;
    process.stdout.write(`- ${transition.target}:${transition.id} (${support})\n`);
  }
  return 0;
}

async function mutateScript(args, mutator) {
  const { scriptPath, script } = await readScript(args);
  const session = createProjectSession({ script });
  const result = mutator(session);
  const nextScript = session.toJSON();
  const report = session.validate();

  const outputPath = path.resolve(repoRoot, getArgValue(args, '--out', scriptPath));
  const dryRun = hasFlag(args, '--dry-run');
  let writeResult = null;
  if (!dryRun) {
    writeResult = await writeScriptFile(outputPath, nextScript, {
      force: hasFlag(args, '--force') || outputPath === scriptPath,
      backup: hasFlag(args, '--backup'),
      checkpoint: hasFlag(args, '--checkpoint'),
    });
  }

  const outPath = dryRun ? null : outputPath;
  const command = process.argv[2] ?? 'mutate';
  const changeSummary = createMutationChangeSummary({
    command,
    scriptPath,
    outPath,
    dryRun,
    beforeScript: script,
    afterScript: nextScript,
    result,
    validation: report,
    writeResult,
  });

  return {
    scriptPath,
    outPath,
    dryRun,
    result,
    transaction: {
      command,
      status: dryRun ? 'planned' : 'written',
      wrote: !dryRun,
      checkpointPath: writeResult?.checkpointPath ?? null,
      backupPath: writeResult?.backupPath ?? null,
    },
    changeSummary,
    validation: report,
  };
}

async function writeApplyPlanResultOut(args, output) {
  const resultOutPathArg = getArgValue(args, '--result-out', null);
  if (!resultOutPathArg) {
    return null;
  }

  const resultOutPath = path.resolve(repoRoot, resultOutPathArg);
  await mkdir(path.dirname(resultOutPath), { recursive: true });
  output.resultOutPath = resultOutPath;
  await writeFile(resultOutPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  return resultOutPath;
}

const HANDOFF_SCREEN_IDS = new Set([
  'titleScreen',
  'settingsScreen',
  'gameMenu',
  'saveLoadScreen',
  'backlogScreen',
]);

function normalizePlanHandoff(plan = {}) {
  const notes = plan?.handoff?.referenceScreenshotNotes;
  if (!Array.isArray(notes)) {
    return null;
  }

  const referenceScreenshotNotes = notes
    .filter((note) => note && typeof note === 'object')
    .map((note) => {
      const normalized = {};
      if (typeof note.screenId === 'string' && HANDOFF_SCREEN_IDS.has(note.screenId)) {
        normalized.screenId = note.screenId;
      }
      if (typeof note.reference === 'string' && note.reference.trim()) {
        normalized.reference = note.reference.trim();
      }
      if (typeof note.summary === 'string' && note.summary.trim()) {
        normalized.summary = note.summary.trim();
      }
      if (Array.isArray(note.matched)) {
        normalized.matched = note.matched
          .filter((entry) => typeof entry === 'string' && entry.trim())
          .map((entry) => entry.trim());
      }
      if (Array.isArray(note.gaps)) {
        normalized.gaps = note.gaps
          .filter((entry) => typeof entry === 'string' && entry.trim())
          .map((entry) => entry.trim());
      }
      return Object.keys(normalized).length ? normalized : null;
    })
    .filter(Boolean);

  return referenceScreenshotNotes.length ? { referenceScreenshotNotes } : null;
}

async function applyPlan(args) {
  const planPathArg = args.find((arg) => !arg.startsWith('--'));
  if (!planPathArg) {
    throw new Error('apply-plan requires a plan JSON path');
  }

  const planPath = path.resolve(repoRoot, planPathArg);
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  const handoff = normalizePlanHandoff(plan);
  const operations = Array.isArray(plan) ? plan : plan.operations;
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error('apply-plan requires operations[]');
  }

  const { scriptPath, script } = await readScript(args);
  const session = createProjectSession({ script });
  const operationResults = [];
  const dryRun = hasFlag(args, '--dry-run');
  const validateOnly = hasFlag(args, '--validate-only');
  for (const [index, operation] of operations.entries()) {
    const command = normalizePlanCommand(operation.command ?? operation.op);
    try {
      const result = applyPlanOperation(session, operation, index);
      operationResults.push({
        index,
        id: operation.id ?? null,
        command,
        status: 'applied',
        result,
        changedPaths: getChangedPaths(result),
      });
    } catch (error) {
      const changedPaths = uniqueValues(operationResults.flatMap((entry) => entry.changedPaths));
      const failure = {
        index,
        id: operation.id ?? null,
        command: command || null,
        status: 'failed',
        code: error.code ?? 'apply-plan-operation-failed',
        message: error.message,
        missingParam: error.missingParam ?? undefined,
        acceptedParams: error.acceptedParams ?? undefined,
        supportedCommands: error.supportedCommands ?? undefined,
      };
      failure.suggestedAction = createApplyPlanFailureSuggestedAction(failure);
      const output = {
        ok: false,
        scriptPath,
        outPath: null,
        dryRun,
        validateOnly,
        planPath,
        transaction: {
          command: 'apply-plan',
          status: validateOnly ? 'invalid' : 'failed',
          wrote: false,
          blockedByValidation: false,
          checkpointPath: null,
          backupPath: null,
          rollback: null,
        },
        operations: [
          ...operationResults,
          failure,
        ],
        operationFailure: failure,
        changeSummary: {
          command: 'apply-plan',
          dryRun,
          validateOnly,
          writeStatus: validateOnly ? 'invalid' : 'failed',
          scriptPath,
          outPath: null,
          planPath,
          operationCount: operations.length,
          completedOperationCount: operationResults.length,
          failedOperationIndex: index,
          changedPaths,
          validation: null,
          checkpointPath: null,
          backupPath: null,
        },
        validation: null,
        ...(handoff ? { handoff } : {}),
      };
      await writeApplyPlanResultOut(args, output);

      if (hasFlag(args, '--json')) {
        writeJson(output);
      } else {
        process.stderr.write(`Apply plan failed at operation ${index}: ${error.message}\n`);
        if (failure.supportedCommands) {
          process.stderr.write(`Supported commands: ${failure.supportedCommands.join(', ')}\n`);
        }
      }
      return 1;
    }
  }
  const nextScript = session.toJSON();
  const validation = session.validate();
  const outputPath = path.resolve(repoRoot, getArgValue(args, '--out', scriptPath));
  const allowInvalid = hasFlag(args, '--allow-invalid');
  const blockedByValidation = !validation.ok && !allowInvalid;

  let writeResult = null;
  if (!dryRun && !validateOnly && !blockedByValidation) {
    writeResult = await writeScriptFile(outputPath, nextScript, {
      force: hasFlag(args, '--force') || outputPath === scriptPath,
      backup: hasFlag(args, '--backup'),
      checkpoint: hasFlag(args, '--checkpoint'),
    });
  }

  const beforeCounts = summarizeScriptShape(script);
  const afterCounts = summarizeScriptShape(nextScript);
  const status = validateOnly
    ? (validation.ok ? 'validated' : 'invalid')
    : dryRun
      ? 'planned'
    : blockedByValidation
      ? 'blocked'
      : 'written';
  const changedPaths = uniqueValues(operationResults.flatMap((operation) => operation.changedPaths));
  const changeSummary = {
    command: 'apply-plan',
    dryRun,
    validateOnly,
    writeStatus: status,
    scriptPath,
    outPath: dryRun || validateOnly || blockedByValidation ? null : outputPath,
    planPath,
    operationCount: operationResults.length,
    changedPaths,
    counts: {
      before: beforeCounts,
      after: afterCounts,
      delta: subtractCounts(afterCounts, beforeCounts),
    },
    validation: {
      ok: validation.ok,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    },
    checkpointPath: writeResult?.checkpointPath ?? null,
    backupPath: writeResult?.backupPath ?? null,
    ...(handoff ? { referenceScreenshotNotes: handoff.referenceScreenshotNotes } : {}),
  };

  const output = {
    scriptPath,
    outPath: changeSummary.outPath,
    dryRun,
    validateOnly,
    planPath,
    transaction: {
      command: 'apply-plan',
      status,
      wrote: status === 'written',
      blockedByValidation: validateOnly ? false : blockedByValidation,
      checkpointPath: writeResult?.checkpointPath ?? null,
      backupPath: writeResult?.backupPath ?? null,
      rollback: writeResult?.checkpointPath
        ? {
          command: 'restore-checkpoint',
          checkpointPath: writeResult.checkpointPath,
          scriptPath: outputPath,
        }
        : null,
    },
    operations: operationResults,
    changeSummary,
    validation,
    ...(handoff ? { handoff } : {}),
  };
  await writeApplyPlanResultOut(args, output);

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`${validateOnly ? 'Validated' : dryRun ? 'Prepared' : status === 'written' ? 'Applied' : 'Blocked'} plan: ${planPath}\n`);
    process.stdout.write(`Operations: ${operationResults.length}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    if (output.transaction.checkpointPath) {
      process.stdout.write(`Checkpoint: ${output.transaction.checkpointPath}\n`);
    }
    if (output.resultOutPath) {
      process.stdout.write(`Result: ${output.resultOutPath}\n`);
    }
    if (changedPaths.length) {
      process.stdout.write(`Changed: ${changedPaths.join(', ')}\n`);
    }
    process.stdout.write(`Validation: ${validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of validation.errors) {
      printIssue(issue);
    }
    for (const issue of validation.warnings) {
      printIssue(issue);
    }
  }

  return validation.ok || (!validateOnly && allowInvalid) ? 0 : 1;
}

function printMutationResult(label, output) {
  process.stdout.write(`${label}: ${Object.values(output.result)[0]}\n`);
  if (output.outPath) {
    process.stdout.write(`Wrote script: ${output.outPath}\n`);
  }
  if (output.transaction?.checkpointPath) {
    process.stdout.write(`Checkpoint: ${output.transaction.checkpointPath}\n`);
  }
  if (output.transaction?.backupPath) {
    process.stdout.write(`Backup: ${output.transaction.backupPath}\n`);
  }
  if (output.changeSummary?.changedPaths?.length) {
    process.stdout.write(`Changed: ${output.changeSummary.changedPaths.join(', ')}\n`);
  }
  process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
  for (const issue of output.validation.errors) {
    printIssue(issue);
  }
  for (const issue of output.validation.warnings) {
    printIssue(issue);
  }
}

async function validate(args) {
  const { scriptPath, script } = await readScript(args);
  const validationOptions = await getValidationOptions(args, scriptPath);
  const report = validateProject(script, validationOptions);
  const output = {
    scriptPath,
    ...report,
  };

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Validation: ${report.ok ? 'OK' : 'FAILED'}\n`);
    process.stdout.write(`Script: ${scriptPath}\n`);
    for (const issue of report.errors) {
      printIssue(issue);
    }
    for (const issue of report.warnings) {
      printIssue(issue);
    }
  }

  return report.ok ? 0 : 1;
}

async function importDraft(args) {
  const draftPathArg = args.find((arg) => !arg.startsWith('--'));
  if (!draftPathArg) {
    throw new Error('import-draft requires a draft JSON path');
  }

  const draftPath = path.resolve(repoRoot, draftPathArg);
  const rawDraft = await readFile(draftPath, 'utf8');
  const draft = JSON.parse(rawDraft);
  const baseScript = hasFlag(args, '--fresh')
    ? null
    : (await readScript(args)).script;
  const result = importNovelDraft(draft, { baseScript });
  const outPath = getArgValue(args, '--out', null);

  if (outPath) {
    const resolvedOut = path.resolve(repoRoot, outPath);
    const writeResult = await writeScriptFile(resolvedOut, result.script, {
      force: hasFlag(args, '--force'),
      backup: hasFlag(args, '--backup'),
      checkpoint: hasFlag(args, '--checkpoint'),
    });
    result.write = {
      outPath: resolvedOut,
      backupPath: writeResult.backupPath,
      checkpointPath: writeResult.checkpointPath,
    };
  }

  const dryRun = !outPath;
  const changeSummary = createMutationChangeSummary({
    command: 'import-draft',
    scriptPath: hasFlag(args, '--fresh') ? null : path.resolve(repoRoot, getArgValue(args, '--script', defaultScriptPath)),
    outPath: result.write?.outPath ?? null,
    dryRun,
    beforeScript: baseScript,
    afterScript: result.script,
    result: {},
    validation: result.validation,
    writeResult: result.write ?? null,
  });

  const output = {
    outPath: result.write?.outPath ?? null,
    backupPath: result.write?.backupPath ?? null,
    checkpointPath: result.write?.checkpointPath ?? null,
    transaction: {
      command: 'import-draft',
      status: outPath ? 'written' : 'planned',
      wrote: Boolean(outPath),
      checkpointPath: result.write?.checkpointPath ?? null,
      backupPath: result.write?.backupPath ?? null,
    },
    changeSummary,
    summary: result.summary,
    warnings: result.warnings,
    validation: result.validation,
  };

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Imported draft: ${draftPath}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    if (output.backupPath) {
      process.stdout.write(`Backup: ${output.backupPath}\n`);
    }
    if (output.checkpointPath) {
      process.stdout.write(`Checkpoint: ${output.checkpointPath}\n`);
    }
    process.stdout.write(`Scenes: ${output.summary.scenes.length}\n`);
    process.stdout.write(`Pages: ${output.summary.pages.length}\n`);
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const warning of output.warnings) {
      process.stdout.write(`[warning] ${warning.code} ${warning.message}\n`);
    }
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return result.validation.ok ? 0 : 1;
}

async function restoreCheckpoint(args) {
  const checkpointPathArg = getArgValue(args, '--checkpoint', args.find((arg) => !arg.startsWith('--')));
  if (!checkpointPathArg) {
    throw new Error('restore-checkpoint requires a checkpoint path or --checkpoint');
  }

  const checkpointPath = path.resolve(repoRoot, checkpointPathArg);
  const scriptPath = path.resolve(repoRoot, getArgValue(args, '--script', defaultScriptPath));
  const restoredScript = JSON.parse(await readFile(checkpointPath, 'utf8'));
  const validation = validateProject(restoredScript);
  const beforeScript = JSON.parse(await readFile(scriptPath, 'utf8'));
  const writeResult = await writeScriptFile(scriptPath, restoredScript, {
    force: hasFlag(args, '--force'),
    backup: hasFlag(args, '--backup'),
    checkpoint: hasFlag(args, '--checkpoint-current'),
  });
  const changeSummary = createMutationChangeSummary({
    command: 'restore-checkpoint',
    scriptPath,
    outPath: scriptPath,
    dryRun: false,
    beforeScript,
    afterScript: restoredScript,
    result: {},
    validation,
    writeResult,
  });
  changeSummary.checkpointSourcePath = checkpointPath;

  const output = {
    scriptPath,
    checkpointSourcePath: checkpointPath,
    transaction: {
      command: 'restore-checkpoint',
      status: 'written',
      wrote: true,
      checkpointPath: writeResult.checkpointPath,
      backupPath: writeResult.backupPath,
    },
    changeSummary,
    validation,
  };

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Restored checkpoint: ${checkpointPath}\n`);
    process.stdout.write(`Wrote script: ${scriptPath}\n`);
    if (writeResult.checkpointPath) {
      process.stdout.write(`Checkpoint before restore: ${writeResult.checkpointPath}\n`);
    }
    if (writeResult.backupPath) {
      process.stdout.write(`Backup before restore: ${writeResult.backupPath}\n`);
    }
    process.stdout.write(`Validation: ${validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of validation.errors) {
      printIssue(issue);
    }
    for (const issue of validation.warnings) {
      printIssue(issue);
    }
  }

  return validation.ok ? 0 : 1;
}

async function draftPlan(args) {
  const draftPathArg = args.find((arg) => !arg.startsWith('--'));
  if (!draftPathArg) {
    throw new Error('draft-plan requires a draft JSON path');
  }

  const draftPath = path.resolve(repoRoot, draftPathArg);
  const draft = JSON.parse(await readFile(draftPath, 'utf8'));
  const plan = createNovelDraftPlan(draft, {
    title: getArgValue(args, '--title', undefined),
  });
  const outPathArg = getArgValue(args, '--out', null);
  const outPath = outPathArg ? path.resolve(repoRoot, outPathArg) : null;
  if (outPath) {
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  }

  const output = {
    draftPath,
    outPath,
    operationCount: plan.operations.length,
    warningCount: plan.warnings.length,
    plan,
  };

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Draft plan: ${draftPath}\n`);
    process.stdout.write(`Operations: ${output.operationCount}\n`);
    process.stdout.write(`Warnings: ${output.warningCount}\n`);
    if (outPath) {
      process.stdout.write(`Wrote plan: ${outPath}\n`);
    }
  }

  return 0;
}

async function exportReport(args) {
  const { scriptPath, script } = await readScript(args);
  const validationOptions = await getValidationOptions(args, scriptPath);
  const readinessAssets = hasFlag(args, '--readiness')
    ? await getKnownAssetsForReadiness(args, scriptPath)
    : null;
  const report = {
    scriptPath,
    ...createProjectReport(script, {
      validation: validationOptions,
      readiness: hasFlag(args, '--readiness')
        ? {
          knownAssets: readinessAssets,
          requireAssetCheck: !hasFlag(args, '--skip-asset-check'),
        }
        : null,
    }),
  };

  if (hasFlag(args, '--json')) {
    writeJson(report);
    return report.validation.ok ? 0 : 1;
  }

  process.stdout.write(`Project: ${report.title ?? '(untitled)'}\n`);
  process.stdout.write(`Script: ${scriptPath}\n`);
  process.stdout.write(`Project ID: ${report.projectId ?? '(missing)'}\n`);
  process.stdout.write(`Characters: ${report.counts.characters}\n`);
  process.stdout.write(`Scenes: ${report.counts.scenes}\n`);
  process.stdout.write(`Pages: ${report.counts.pages}\n`);
  process.stdout.write(`Variables: ${report.counts.variables}\n`);
  process.stdout.write(`Validation: ${report.validation.ok ? 'OK' : 'FAILED'}\n`);
  for (const issue of report.validation.errors) {
    printIssue(issue);
  }
  for (const issue of report.validation.warnings) {
    printIssue(issue);
  }
  return report.validation.ok ? 0 : 1;
}

async function graphReport(args) {
  const { scriptPath, script } = await readScript(args);
  const graph = createGraphAnalysis(script, {
    entrySceneId: getArgValue(args, '--entry', undefined),
  });
  const output = { scriptPath, ...graph };

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else if (hasFlag(args, '--mermaid')) {
    process.stdout.write(graph.mermaid);
  } else {
    process.stdout.write(`Branch graph: ${graph.nodeCount} scenes, ${graph.edgeCount} links\n`);
    process.stdout.write(`Entry: ${graph.entrySceneId ?? '(none)'}\n`);
    process.stdout.write(`Unreachable: ${graph.unreachableSceneIds.join(', ') || '(none)'}\n`);
    process.stdout.write(`Dead ends: ${graph.deadEndSceneIds.join(', ') || '(none)'}\n`);
    process.stdout.write(`Closed cycles: ${graph.cyclesWithoutExit.length}\n`);
  }

  return 0;
}

async function findDeadEndsCommand(args) {
  const { scriptPath, script } = await readScript(args);
  const analysis = findDeadEnds(script, {
    entrySceneId: getArgValue(args, '--entry', undefined),
  });
  const output = { scriptPath, ...analysis };

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Dead ends: ${analysis.deadEndSceneIds.join(', ') || '(none)'}\n`);
    process.stdout.write(`Closed cycles: ${analysis.cyclesWithoutExit.length}\n`);
  }
  return 0;
}

async function findMissingAssets(args) {
  const { scriptPath, script } = await readScript(args);
  const knownAssets = await getKnownAssetsForReadiness(args, scriptPath);
  const analysis = findAssetIssues(script, { knownAssets, requireAssetCheck: true });
  const output = {
    scriptPath,
    checked: analysis.checked,
    missing: analysis.missing,
    issues: analysis.missingIssues,
    count: analysis.missing.length,
  };

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Missing assets: ${output.count}\n`);
    for (const missing of output.missing) {
      process.stdout.write(`- ${missing.assetPath} (${missing.pathString})\n`);
    }
  }
  return 0;
}

async function findUnusedAssets(args) {
  const { scriptPath, script } = await readScript(args);
  const knownAssets = await getKnownAssetsForReadiness(args, scriptPath);
  const analysis = findAssetIssues(script, { knownAssets, requireAssetCheck: true });
  const output = {
    scriptPath,
    checked: analysis.checked,
    unused: analysis.unused,
    issues: analysis.unusedIssues,
    count: analysis.unused.length,
  };

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Unused assets: ${output.count}\n`);
    for (const assetPath of output.unused) {
      process.stdout.write(`- ${assetPath}\n`);
    }
  }
  return 0;
}

async function handoffReport(args) {
  const { scriptPath, script } = await readScript(args);
  const validationOptions = await getValidationOptions(args, scriptPath);
  const knownAssets = hasFlag(args, '--skip-asset-check')
    ? null
    : await getKnownAssetsForReadiness(args, scriptPath);
  const checkpointDir = path.resolve(
    repoRoot,
    getArgValue(args, '--checkpoint-dir', path.join(path.dirname(scriptPath), '.checkpoints')),
  );
  const checkpointLimit = getIntArg(args, '--checkpoint-limit', 5);
  const transactionPath = getArgValue(args, '--transaction', null);
  const transaction = transactionPath
    ? JSON.parse(await readFile(path.resolve(repoRoot, transactionPath), 'utf8'))
    : null;
  const handoff = createAgentHandoff(script, {
    scriptPath,
    validation: validationOptions,
    readiness: {
      knownAssets,
      requireAssetCheck: !hasFlag(args, '--skip-asset-check'),
    },
    checkpoints: await collectCheckpointEntries(checkpointDir, checkpointLimit),
    transaction,
    notes: getArgValues(args, '--note'),
  });
  const outPathArg = getArgValue(
    args,
    '--out',
    hasFlag(args, '--write-editor-handoff')
      ? path.join(path.dirname(scriptPath), 'agent-handoff.json')
      : null,
  );
  if (outPathArg) {
    const outPath = path.resolve(repoRoot, outPathArg);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
    handoff.outPath = outPath;
  }

  if (hasFlag(args, '--json')) {
    writeJson(handoff);
  } else {
    process.stdout.write(`Agent handoff: ${handoff.ok ? 'OK' : 'NEEDS REVIEW'}\n`);
    process.stdout.write(`Script: ${scriptPath}\n`);
    if (handoff.outPath) {
      process.stdout.write(`Wrote handoff: ${handoff.outPath}\n`);
    }
    process.stdout.write(`Checkpoints: ${handoff.checkpoints.length}\n`);
    process.stdout.write(`Review items: ${handoff.reviewItemCount}\n`);
  }

  return handoff.ok ? 0 : 1;
}

async function exportReadiness(args) {
  const { scriptPath, script } = await readScript(args);
  const knownAssets = await getKnownAssetsForReadiness(args, scriptPath);
  const report = {
    scriptPath,
    ...createExportReadiness(script, {
      knownAssets,
      requireAssetCheck: !hasFlag(args, '--skip-asset-check'),
    }),
  };

  if (hasFlag(args, '--json')) {
    writeJson(report);
  } else {
    process.stdout.write(`Export readiness: ${report.ready ? 'READY' : 'BLOCKED'}\n`);
    process.stdout.write(`Script: ${scriptPath}\n`);
    for (const issue of report.blockers) {
      printIssue(issue);
    }
    for (const issue of report.warnings) {
      printIssue(issue);
    }
  }

  return report.ready ? 0 : 1;
}

async function lintLayout(args) {
  const { scriptPath, script } = await readScript(args);
  const report = {
    scriptPath,
    ...lintProjectLayout(script),
  };

  if (hasFlag(args, '--json')) {
    writeJson(report);
  } else {
    process.stdout.write(`Layout lint: ${report.ok ? 'OK' : 'WARNINGS'}\n`);
    process.stdout.write(`Script: ${scriptPath}\n`);
    for (const issue of report.warnings) {
      printIssue(issue);
    }
  }

  return 0;
}

async function renderPreview(args) {
  const { scriptPath, script } = await readScript(args);
  const outPath = path.resolve(repoRoot, getArgValue(args, '--out', path.join('.tmp', 'preview.png')));
  const sceneId = getArgValue(args, '--scene', 'start');
  const pageIndex = getIntArg(args, '--page', 0);
  const width = getIntArg(args, '--width', script.meta?.resolution?.width ?? 1280);
  const height = getIntArg(args, '--height', script.meta?.resolution?.height ?? 720);
  const dryRun = hasFlag(args, '--dry-run');

  try {
    const result = await renderPreviewScreenshot({
      repoRoot,
      script,
      sceneId,
      pageIndex,
      outPath,
      width,
      height,
      dryRun,
    });

    if (dryRun && hasFlag(args, '--write-plan')) {
      const planPath = outPath.endsWith('.json') ? outPath : `${outPath}.json`;
      await writePreviewRenderPlan(planPath, result);
      result.planPath = planPath;
    }

    const output = {
      scriptPath,
      ...result,
    };

    if (hasFlag(args, '--json')) {
      writeJson(output);
    } else {
      process.stdout.write(`${dryRun ? 'Prepared' : 'Rendered'} preview: ${output.outPath}\n`);
      process.stdout.write(`Scene: ${output.sceneId}, page: ${output.pageIndex}\n`);
      if (output.planPath) {
        process.stdout.write(`Plan: ${output.planPath}\n`);
      }
    }

    return 0;
  } catch (error) {
    if (error.code === PREVIEW_RENDERER_UNAVAILABLE) {
      const output = {
        scriptPath,
        ok: false,
        code: PREVIEW_RENDERER_UNAVAILABLE,
        message: error.message,
        installHint: 'Install Playwright in this workspace to enable screenshot rendering.',
      };

      if (hasFlag(args, '--json')) {
        writeJson(output);
      } else {
        process.stderr.write(`${output.code}: ${output.message}\n`);
        process.stderr.write(`${output.installHint}\n`);
      }
      return 1;
    }

    if (error.code === PREVIEW_BROWSER_UNAVAILABLE) {
      const output = {
        scriptPath,
        ok: false,
        code: PREVIEW_BROWSER_UNAVAILABLE,
        message: error.message,
        installHint: 'Run "npx playwright install chromium" to download the preview browser.',
      };

      if (hasFlag(args, '--json')) {
        writeJson(output);
      } else {
        process.stderr.write(`${output.code}: ${output.message}\n`);
        process.stderr.write(`${output.installHint}\n`);
      }
      return 1;
    }

    if (error.code === PREVIEW_QUALITY_FAILED) {
      const output = {
        scriptPath,
        ok: false,
        code: PREVIEW_QUALITY_FAILED,
        message: error.message,
        quality: error.quality,
      };

      if (hasFlag(args, '--json')) {
        writeJson(output);
      } else {
        process.stderr.write(`${output.code}: ${output.message}\n`);
        for (const issue of output.quality?.warnings ?? []) {
          process.stderr.write(`[warning] ${issue.code} ${issue.message}\n`);
        }
      }
      return 1;
    }

    throw error;
  }
}

async function authorCheck(args) {
  const { scriptPath, script } = await readScript(args);
  const transaction = await readTransactionArg(args);
  const focus = createAuthorCheckFocus({ args, script, transaction });
  const validationOptions = await getValidationOptions(args, scriptPath);
  const knownAssets = hasFlag(args, '--skip-asset-check')
    ? null
    : await getKnownAssetsForReadiness(args, scriptPath);
  const validation = validateProject(script, validationOptions);
  const layout = filterAuthorCheckReport(lintProjectLayout(script), focus);
  const readiness = filterAuthorCheckReadiness(createExportReadiness(script, {
    knownAssets,
    requireAssetCheck: !hasFlag(args, '--skip-asset-check'),
  }), focus);
  const referenceDiagnostics = collectSceneReferenceDiagnostics(script, {
    sceneIds: focus.checkedSceneIds,
    changedPaths: focus.changedPaths,
  });
  const screenPreviewIssues = collectScreenPreviewIssues(focus.screenTargets);
  const endingPreviewIssues = collectEndingPreviewIssues(focus.endingTargets);
  const galleryPreviewIssues = collectGalleryPreviewIssues(focus.galleryTargets);
  const branchGraphPreviewIssues = collectBranchGraphPreviewIssues(focus.branchGraphTargets);
  const referenceScreenshotIssues = collectReferenceScreenshotIssues(transaction?.data);

  let preview = null;
  if (!hasFlag(args, '--skip-preview')) {
    const width = getIntArg(args, '--width', script.meta?.resolution?.width ?? 1280);
    const height = getIntArg(args, '--height', script.meta?.resolution?.height ?? 720);
    const outPath = path.resolve(repoRoot, getArgValue(args, '--preview-out', path.join('.tmp', 'author-check-preview.png')));
    const previewTargets = (focus.previewTargets.length ? focus.previewTargets : [focus.previewTarget])
      .filter(isRenderablePreviewTarget);
    const previews = [];
    for (const [index, target] of previewTargets.entries()) {
      previews.push(await renderPreviewScreenshot({
        repoRoot,
        script,
        sceneId: target.sceneId,
        pageIndex: target.pageIndex,
        screenId: target.screenId,
        outPath: previewOutPathForTarget(outPath, target, index),
        width,
        height,
        dryRun: true,
      }));
    }

    if (previews.length > 0) {
      preview = {
        ...previews[0],
        targetCount: previews.length,
        targets: previews,
      };

      if (hasFlag(args, '--write-preview-plan')) {
        const planPath = outPath.endsWith('.json') ? outPath : `${outPath}.json`;
        await writePreviewRenderPlan(planPath, preview);
        preview.planPath = planPath;
      }
    }
  }

  const gates = {
    validation: validation.ok,
    layout: layout.ok,
    readiness: readiness.ready,
    preview: preview ? preview.dryRun === true : true,
  };
  const ok = Object.values(gates).every(Boolean);
  const output = {
    ok,
    scriptPath,
    transactionSummary: transaction?.data
      ? {
        path: transaction.path,
        command: transaction.data.transaction?.command ?? transaction.data.changeSummary?.command ?? null,
        status: transaction.data.transaction?.status ?? transaction.data.changeSummary?.writeStatus ?? null,
        wrote: transaction.data.transaction?.wrote ?? null,
        dryRun: transaction.data.dryRun ?? transaction.data.changeSummary?.dryRun ?? null,
        operationCount: transaction.data.changeSummary?.operationCount ?? transaction.data.operations?.length ?? null,
        changedPaths: focus.changedPaths.slice(0, 20),
        changedPathCount: focus.changedPaths.length,
      }
      : null,
    focus,
    gates,
    summary: {
      validationErrors: validation.errors.length,
      validationWarnings: validation.warnings.length,
      layoutWarnings: layout.warnings.length,
      readinessBlockers: readiness.blockers.length,
      readinessWarnings: readiness.warnings.length,
      sceneReferenceDiagnostics: referenceDiagnostics.length,
      screenPreviewReviewItems: screenPreviewIssues.length,
      endingPreviewReviewItems: endingPreviewIssues.length,
      galleryPreviewReviewItems: galleryPreviewIssues.length,
      branchGraphPreviewReviewItems: branchGraphPreviewIssues.length,
      referenceScreenshotFidelityNotes: referenceScreenshotIssues.length,
      previewPlanned: Boolean(preview),
    },
    sceneReferences: {
      checkedSceneIds: focus.checkedSceneIds,
      diagnostics: referenceDiagnostics,
    },
    referenceDiagnostics,
    screenPreview: {
      issues: screenPreviewIssues,
    },
    screenPreviewIssues,
    endingPreview: {
      issues: endingPreviewIssues,
    },
    endingPreviewIssues,
    galleryPreview: {
      issues: galleryPreviewIssues,
    },
    galleryPreviewIssues,
    branchGraphPreview: {
      issues: branchGraphPreviewIssues,
    },
    branchGraphPreviewIssues,
    referenceScreenshotIssues,
    referenceScreenshotFidelity: {
      issues: referenceScreenshotIssues,
    },
    validation,
    layout,
    readiness,
    preview,
    issues: [
      ...summarizeIssues('validation', validation.errors),
      ...summarizeIssues('validation', validation.warnings),
      ...summarizeIssues('layout', layout.warnings),
      ...summarizeIssues('readiness', readiness.blockers),
      ...summarizeIssues('readiness', readiness.warnings),
      ...summarizeIssues('preview', screenPreviewIssues),
      ...summarizeIssues('preview', endingPreviewIssues),
      ...summarizeIssues('preview', galleryPreviewIssues),
      ...summarizeIssues('preview', branchGraphPreviewIssues),
      ...summarizeIssues('preview', referenceScreenshotIssues),
      ...referenceDiagnostics,
    ],
  };
  output.suggestions = collectAuthorCheckSuggestions(output);

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Author check: ${output.ok ? 'OK' : 'NEEDS ATTENTION'}\n`);
    process.stdout.write(`Script: ${scriptPath}\n`);
    process.stdout.write(`Validation: ${gates.validation ? 'OK' : 'FAILED'}\n`);
    process.stdout.write(`Layout: ${gates.layout ? 'OK' : 'WARNINGS'}\n`);
    process.stdout.write(`Readiness: ${gates.readiness ? 'READY' : 'BLOCKED'}\n`);
    if (preview) {
      process.stdout.write(`Preview plan: ${preview.sceneId}#${preview.pageIndex} -> ${preview.outPath}\n`);
      if (preview.planPath) {
        process.stdout.write(`Preview plan file: ${preview.planPath}\n`);
      }
    }
    for (const issue of output.issues) {
      printIssue(issue);
    }
  }

  return ok ? 0 : 1;
}

async function addScene(args) {
  const sceneId = getArgValue(args, '--id', null);
  if (!sceneId) {
    throw new Error('add-scene requires --id');
  }

  const output = await mutateScript(args, (session) => session.addScene({
    id: sceneId,
    name: getArgValue(args, '--name', sceneId),
    next: getArgValue(args, '--next', null),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Added scene', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function setSceneNext(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', getArgValue(args, '--id', null)));
  if (!sceneId) {
    throw new Error('set-scene-next requires --scene');
  }

  const output = await mutateScript(args, (session) => session.setSceneNext({
    sceneId,
    next: getArgValue(args, '--next', null),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Set scene next', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function sceneReferences(args) {
  const { scriptPath, script } = await readScript(args);
  if (hasFlag(args, '--all')) {
    const scenes = Object.keys(script.scenes ?? {}).map((sceneId) => {
      const references = collectSceneReferences(script, sceneId);
      return {
        sceneId,
        referenceCount: references.length,
        references,
      };
    });
    const output = {
      scriptPath,
      scenes,
      referenceCount: scenes.reduce((count, scene) => count + scene.referenceCount, 0),
    };

    if (hasFlag(args, '--json')) {
      writeJson(output);
    } else {
      process.stdout.write('Scene references:\n');
      for (const scene of scenes) {
        process.stdout.write(`- ${scene.sceneId}: ${scene.referenceCount}\n`);
      }
    }
    return 0;
  }

  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--id', null));
  if (!sceneId) {
    throw new Error('scene-references requires --scene or --all');
  }

  if (!script.scenes?.[sceneId]) {
    throw new Error(`Scene "${sceneId}" does not exist`);
  }

  const references = collectSceneReferences(script, sceneId);
  const output = {
    scriptPath,
    sceneId,
    referenceCount: references.length,
    references,
    suggestions: references.length > 0
      ? [
        {
          summary: 'Retarget references before renaming or deleting this scene.',
          commands: [
            {
              command: 'retarget-scene',
              args: { from: sceneId, to: '<target-scene-id>' },
            },
            {
              command: 'clear-scene-references',
              args: { scene: sceneId },
            },
          ],
        },
      ]
      : [],
  };

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Scene references: ${sceneId}\n`);
    process.stdout.write(`References: ${references.length}\n`);
    for (const reference of references) {
      process.stdout.write(`- ${reference.kind} ${reference.pathString}\n`);
    }
  }

  return 0;
}

async function retargetScene(args) {
  const fromSceneId = getArgValue(args, '--from', getArgValue(args, '--scene', null));
  const toSceneId = getArgValue(args, '--to', getArgValue(args, '--target', null));
  if (!fromSceneId || !toSceneId) {
    throw new Error('retarget-scene requires --from and --to');
  }

  const output = await mutateScript(args, (session) => session.retargetSceneReferences({
    fromSceneId,
    toSceneId,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Retargeted scene references: ${fromSceneId}->${toSceneId}\n`);
    printMutationResult('Updated references', {
      ...output,
      result: { updatedReferenceCount: output.result.updatedReferenceCount },
    });
  }

  return output.validation.ok ? 0 : 1;
}

async function repairSceneTarget(args) {
  const fromSceneId = getArgValue(args, '--from', getArgValue(args, '--scene', null));
  const toSceneId = getArgValue(args, '--to', getArgValue(args, '--target', null));
  if (!fromSceneId || !toSceneId) {
    throw new Error('repair-scene-target requires --from and --to');
  }

  const output = await mutateScript(args, (session) => session.retargetSceneReferences({
    fromSceneId,
    toSceneId,
    allowMissingSource: true,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Repaired scene targets: ${fromSceneId}->${toSceneId}\n`);
    printMutationResult('Updated references', {
      ...output,
      result: { updatedReferenceCount: output.result.updatedReferenceCount },
    });
  }

  return output.validation.ok ? 0 : 1;
}

async function clearSceneReferencesCommand(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--id', null));
  if (!sceneId) {
    throw new Error('clear-scene-references requires --scene');
  }

  const output = await mutateScript(args, (session) => session.clearSceneReferences({
    sceneId,
    allowMissingTarget: true,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Cleared scene references: ${sceneId}\n`);
    printMutationResult('Cleared references', {
      ...output,
      result: { clearedReferenceCount: output.result.clearedReferenceCount },
    });
  }

  return output.validation.ok ? 0 : 1;
}

async function renameScene(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--id', null));
  const newSceneId = getArgValue(args, '--new-id', getArgValue(args, '--to', null));
  if (!sceneId || !newSceneId) {
    throw new Error('rename-scene requires --scene and --new-id');
  }

  const output = await mutateScript(args, (session) => session.renameScene({
    sceneId,
    newSceneId,
    name: getOptionalArgValue(args, '--name'),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Renamed scene: ${output.result.sceneId}->${output.result.newSceneId}\n`);
    printMutationResult('Updated references', {
      ...output,
      result: { updatedReferenceCount: output.result.updatedReferenceCount },
    });
  }

  return output.validation.ok ? 0 : 1;
}

async function deleteScene(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--id', null));
  if (!sceneId) {
    throw new Error('delete-scene requires --scene');
  }

  const output = await mutateScript(args, (session) => session.deleteScene({
    sceneId,
    forceReferences: hasFlag(args, '--force-references'),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Deleted scene', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function addCharacter(args) {
  const characterId = getArgValue(args, '--id', null);
  if (!characterId) {
    throw new Error('add-character requires --id');
  }

  const output = await mutateScript(args, (session) => session.addCharacter({
    id: characterId,
    name: getArgValue(args, '--name', characterId),
    color: getArgValue(args, '--color', '#ffffff'),
    expressions: parseExpressions(args),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Added character', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function addVariable(args) {
  const variableId = getArgValue(args, '--id', null);
  if (!variableId) {
    throw new Error('add-variable requires --id');
  }

  const type = getArgValue(args, '--type', 'number');
  const output = await mutateScript(args, (session) => session.addVariable({
    id: variableId,
    type,
    initial: parseScalarValue(getArgValue(args, '--initial', type === 'bool' ? 'false' : '0')),
    label: getArgValue(args, '--label', getArgValue(args, '--name', variableId)),
    group: getArgValue(args, '--group', undefined),
    notes: getArgValue(args, '--notes', undefined),
    kind: getArgValue(args, '--kind', undefined),
    characterId: getArgValue(args, '--character', getArgValue(args, '--character-id', undefined)),
    min: parseOptionalScalarValue(getArgValue(args, '--min', undefined)),
    max: parseOptionalScalarValue(getArgValue(args, '--max', undefined)),
    step: parseOptionalScalarValue(getArgValue(args, '--step', undefined)),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Added variable', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function updateVariable(args) {
  const variableId = getArgValue(args, '--id', getArgValue(args, '--variable', null));
  if (!variableId) {
    throw new Error('update-variable requires --id');
  }

  const patch = parseJsonArg(args, '--patch', null) ?? dropUndefinedFields({
    type: getOptionalArgValue(args, '--type'),
    initial: parseOptionalScalarValue(getOptionalArgValue(args, '--initial')),
    label: getOptionalArgValue(args, '--label') ?? getOptionalArgValue(args, '--name'),
    group: getOptionalArgValue(args, '--group'),
    notes: getOptionalArgValue(args, '--notes'),
    kind: getOptionalArgValue(args, '--kind'),
    characterId: getOptionalArgValue(args, '--character') ?? getOptionalArgValue(args, '--character-id'),
    min: parseOptionalScalarValue(getOptionalArgValue(args, '--min')),
    max: parseOptionalScalarValue(getOptionalArgValue(args, '--max')),
    step: parseOptionalScalarValue(getOptionalArgValue(args, '--step')),
  });

  const output = await mutateScript(args, (session) => session.updateVariable({
    variableId,
    patch,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Updated variable', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function renameVariable(args) {
  const variableId = getArgValue(args, '--id', getArgValue(args, '--variable', null));
  const newVariableId = getArgValue(args, '--new-id', getArgValue(args, '--to', null));
  if (!variableId || !newVariableId) {
    throw new Error('rename-variable requires --id and --new-id');
  }

  const output = await mutateScript(args, (session) => session.renameVariable({
    variableId,
    newVariableId,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Renamed variable', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function deleteVariable(args) {
  const variableId = getArgValue(args, '--id', getArgValue(args, '--variable', null));
  if (!variableId) {
    throw new Error('delete-variable requires --id');
  }

  const output = await mutateScript(args, (session) => session.deleteVariable({
    variableId,
    forceReferences: hasFlag(args, '--force-references'),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Deleted variable', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function addAffectionVariable(args) {
  const characterId = getArgValue(args, '--character', getArgValue(args, '--character-id', null));
  if (!characterId) {
    throw new Error('add-affection-variable requires --character');
  }

  const output = await mutateScript(args, (session) => session.addAffectionVariable({
    characterId,
    id: getArgValue(args, '--id', getArgValue(args, '--variable', undefined)),
    initial: parseOptionalScalarValue(getArgValue(args, '--initial', undefined)),
    label: getArgValue(args, '--label', getArgValue(args, '--name', undefined)),
    group: getArgValue(args, '--group', undefined),
    notes: getArgValue(args, '--notes', undefined),
    min: parseOptionalScalarValue(getArgValue(args, '--min', undefined)),
    max: parseOptionalScalarValue(getArgValue(args, '--max', undefined)),
    step: parseOptionalScalarValue(getArgValue(args, '--step', undefined)),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Added affection variable', output);
  }

  return output.validation.ok ? 0 : 1;
}

function getEndingPatchFromArgs(args) {
  const hiddenUntilUnlocked = getFlagOrOptionalValue(args, '--hidden-until-unlocked');
  return dropUndefinedFields({
    title: getOptionalArgValue(args, '--title') ?? getOptionalArgValue(args, '--name'),
    category: getOptionalArgValue(args, '--category'),
    order: parseOptionalScalarValue(getOptionalArgValue(args, '--order')),
    description: getOptionalArgValue(args, '--description'),
    thumbnail: getOptionalArgValue(args, '--thumbnail'),
    hiddenUntilUnlocked: hiddenUntilUnlocked === undefined
      ? undefined
      : parseScalarValue(hiddenUntilUnlocked),
  });
}

async function listEndings(args) {
  const { scriptPath, script } = await readScript(args);
  const session = createProjectSession({ script });
  const endings = session.listEndings();
  const output = {
    scriptPath,
    count: endings.length,
    endings,
  };

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Endings: ${endings.length}\n`);
    for (const ending of endings) {
      process.stdout.write(`- ${ending.endingId}: ${ending.title}\n`);
    }
  }

  return 0;
}

async function addEnding(args) {
  const endingId = getArgValue(args, '--id', getArgValue(args, '--ending', null));
  if (!endingId) {
    throw new Error('add-ending requires --id');
  }
  const hiddenUntilUnlocked = getFlagOrOptionalValue(args, '--hidden-until-unlocked');

  const output = await mutateScript(args, (session) => session.addEnding({
    id: endingId,
    title: getArgValue(args, '--title', getArgValue(args, '--name', endingId)),
    category: getArgValue(args, '--category', undefined),
    order: parseOptionalScalarValue(getArgValue(args, '--order', undefined)),
    description: getArgValue(args, '--description', undefined),
    thumbnail: getArgValue(args, '--thumbnail', undefined),
    hiddenUntilUnlocked: hiddenUntilUnlocked === undefined
      ? undefined
      : parseScalarValue(hiddenUntilUnlocked),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Added ending', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function updateEnding(args) {
  const endingId = getArgValue(args, '--id', getArgValue(args, '--ending', null));
  if (!endingId) {
    throw new Error('update-ending requires --id');
  }

  const patch = parseJsonArg(args, '--patch', null) ?? getEndingPatchFromArgs(args);
  const output = await mutateScript(args, (session) => session.updateEnding({
    endingId,
    patch,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Updated ending', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function removeEnding(args) {
  const endingId = getArgValue(args, '--id', getArgValue(args, '--ending', null));
  if (!endingId) {
    throw new Error('remove-ending requires --id');
  }

  const output = await mutateScript(args, (session) => session.removeEnding({
    endingId,
    forceReferences: hasFlag(args, '--force-references'),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Removed ending', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function addEndingUnlock(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('add-ending-unlock requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('add-ending-unlock requires --page');
  }

  const optionIndex = getIntArg(args, '--option', undefined);

  const endingId = getArgValue(args, '--id', getArgValue(args, '--ending', null));
  if (!endingId) {
    throw new Error('add-ending-unlock requires --id');
  }

  const output = await mutateScript(args, (session) => session.addEndingUnlock({
    sceneId,
    pageIndex,
    optionIndex,
    endingId,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Added ending unlock', output);
  }

  return output.validation.ok ? 0 : 1;
}

function getCgPatchFromArgs(args) {
  return dropUndefinedFields({
    title: getOptionalArgValue(args, '--title') ?? getOptionalArgValue(args, '--name'),
    images: parseJsonArg(args, '--images', undefined),
    thumbnail: getOptionalArgValue(args, '--thumbnail'),
    lockedThumbnail: getOptionalArgValue(args, '--locked-thumbnail'),
    category: getOptionalArgValue(args, '--category'),
    order: parseOptionalScalarValue(getOptionalArgValue(args, '--order')),
    description: getOptionalArgValue(args, '--description'),
  });
}

async function listCgs(args) {
  const { scriptPath, script } = await readScript(args);
  const session = createProjectSession({ script });
  const cgs = session.listCgs();
  const output = {
    scriptPath,
    count: cgs.length,
    cgs,
  };

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`CGs: ${cgs.length}\n`);
    for (const cg of cgs) {
      process.stdout.write(`- ${cg.cgId}: ${cg.title}\n`);
    }
  }

  return 0;
}

async function addCg(args) {
  const cgId = getArgValue(args, '--id', getArgValue(args, '--cg', null));
  if (!cgId) {
    throw new Error('add-cg requires --id');
  }

  const output = await mutateScript(args, (session) => session.addCg({
    id: cgId,
    title: getArgValue(args, '--title', getArgValue(args, '--name', cgId)),
    ...getCgPatchFromArgs(args),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Added CG', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function updateCg(args) {
  const cgId = getArgValue(args, '--id', getArgValue(args, '--cg', null));
  if (!cgId) {
    throw new Error('update-cg requires --id');
  }

  const patch = parseJsonArg(args, '--patch', null) ?? getCgPatchFromArgs(args);
  const output = await mutateScript(args, (session) => session.updateCg({
    cgId,
    patch,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Updated CG', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function removeCg(args) {
  const cgId = getArgValue(args, '--id', getArgValue(args, '--cg', null));
  if (!cgId) {
    throw new Error('remove-cg requires --id');
  }

  const output = await mutateScript(args, (session) => session.removeCg({
    cgId,
    forceReferences: hasFlag(args, '--force-references'),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Removed CG', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function addCgUnlock(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('add-cg-unlock requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('add-cg-unlock requires --page');
  }

  const optionIndex = getIntArg(args, '--option', null);
  if (optionIndex == null) {
    throw new Error('add-cg-unlock requires --option');
  }

  const cgId = getArgValue(args, '--id', getArgValue(args, '--cg', null));
  if (!cgId) {
    throw new Error('add-cg-unlock requires --id');
  }

  const output = await mutateScript(args, (session) => session.addCgUnlock({
    sceneId,
    pageIndex,
    optionIndex,
    cgId,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Added CG unlock', output);
  }

  return output.validation.ok ? 0 : 1;
}

function buildPageArgs(args) {
  const type = getArgValue(args, '--type', 'normal');
  const explicitCharacters = parseJsonArg(args, '--characters', undefined);
  const preset = getArgValue(args, '--preset', null);
  const { ids: presetCharacterIds, expressionHints } = parsePresetCharacters(args);
  const characters = explicitCharacters ?? (
    preset || presetCharacterIds.length > 0
      ? createCharacterBlocking(presetCharacterIds, expressionHints, {
        preset: preset ?? undefined,
        speakerId: getArgValue(args, '--speaker', null),
      })
      : undefined
  );

  if (preset && !LAYOUT_PRESETS.includes(preset)) {
    throw new Error(`Unknown layout preset "${preset}". Expected one of: ${LAYOUT_PRESETS.join(', ')}`);
  }

  const page = {
    id: getArgValue(args, '--id', undefined),
    background: getArgValue(args, '--background', undefined),
    characters,
    bgm: parseJsonArg(args, '--bgm', undefined),
    se: parseJsonArg(args, '--se', undefined),
    transition: parseJsonArg(args, '--transition', undefined),
  };

  for (const key of Object.keys(page)) {
    if (page[key] === undefined) {
      delete page[key];
    }
  }

  if (type === 'choice') {
    page.prompt = getArgValue(args, '--prompt', '');
    page.options = parseJsonArg(args, '--options', []);
    return { type, page };
  }

  if (type === 'condition') {
    page.conditionMode = getArgValue(args, '--condition-mode', 'all');
    page.conditions = parseJsonArg(args, '--conditions', []);
    page.trueTarget = getArgValue(args, '--true-target', null);
    page.falseTarget = getArgValue(args, '--false-target', null);
    return { type, page };
  }

  page.dialogues = parseJsonArg(args, '--dialogues', []);
  return { type: 'normal', page };
}

async function addPage(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('add-page requires --scene');
  }

  const { type, page } = buildPageArgs(args);
  const output = await mutateScript(args, (session) => {
    if (type === 'choice') {
      return session.addChoicePage({ sceneId, page });
    }
    if (type === 'condition') {
      return session.addConditionPage({ sceneId, page });
    }
    return session.addNormalPage({ sceneId, page });
  });

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Added ${type} page: ${output.result.sceneId}#${output.result.pageIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function removePage(args) {
  const { sceneId, pageIndex } = getPageAddress(args, 'remove-page');
  const output = await mutateScript(args, (session) => session.removePage({
    sceneId,
    pageIndex,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Removed page: ${output.result.sceneId}#${output.result.pageIndex}\n`);
    printMutationResult('Removed page type', {
      ...output,
      result: { removedPageType: output.result.removedPageType },
    });
  }

  return output.validation.ok ? 0 : 1;
}

async function movePage(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('move-page requires --scene');
  }

  const fromIndex = getIntArg(args, '--from', null);
  const toIndex = getIntArg(args, '--to', null);
  if (fromIndex == null || toIndex == null) {
    throw new Error('move-page requires --from and --to');
  }

  const output = await mutateScript(args, (session) => session.movePage({
    sceneId,
    fromIndex,
    toIndex,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Moved page: ${output.result.sceneId}#${output.result.fromIndex}->${output.result.toIndex}\n`);
    printMutationResult('Moved page', {
      ...output,
      result: { sceneId: output.result.sceneId },
    });
  }

  return output.validation.ok ? 0 : 1;
}

async function addDialogue(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('add-dialogue requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('add-dialogue requires --page');
  }

  const output = await mutateScript(args, (session) => session.addDialogue({
    sceneId,
    pageIndex,
    dialogue: parseJsonArg(args, '--dialogue', {
      speaker: getArgValue(args, '--speaker', null),
      text: getArgValue(args, '--text', ''),
      expression: getArgValue(args, '--expression', null),
      voice: getArgValue(args, '--voice', null),
    }),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Added dialogue: ${output.result.sceneId}#${output.result.pageIndex}.${output.result.dialogueIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setDialogue(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('set-dialogue requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('set-dialogue requires --page');
  }

  const dialogueIndex = getIntArg(args, '--dialogue-index', getIntArg(args, '--dialogue', null));
  if (dialogueIndex == null) {
    throw new Error('set-dialogue requires --dialogue-index');
  }

  const dialogue = parseJsonArg(args, '--dialogue-json', {
    speaker: getOptionalArgValue(args, '--speaker'),
    text: getOptionalArgValue(args, '--text'),
    expression: getOptionalArgValue(args, '--expression'),
    voice: getOptionalArgValue(args, '--voice'),
  });

  for (const key of Object.keys(dialogue)) {
    if (dialogue[key] === undefined) {
      delete dialogue[key];
    }
  }

  const output = await mutateScript(args, (session) => session.setDialogue({
    sceneId,
    pageIndex,
    dialogueIndex,
    dialogue,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set dialogue: ${output.result.sceneId}#${output.result.pageIndex}.${output.result.dialogueIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

function getPageAddress(args, commandName) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error(`${commandName} requires --scene`);
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error(`${commandName} requires --page`);
  }

  return { sceneId, pageIndex };
}

async function removeDialogue(args) {
  const { sceneId, pageIndex } = getPageAddress(args, 'remove-dialogue');
  const dialogueIndex = getIntArg(args, '--dialogue-index', getIntArg(args, '--dialogue', null));
  if (dialogueIndex == null) {
    throw new Error('remove-dialogue requires --dialogue-index');
  }

  const output = await mutateScript(args, (session) => session.removeDialogue({
    sceneId,
    pageIndex,
    dialogueIndex,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Removed dialogue: ${output.result.sceneId}#${output.result.pageIndex}.${output.result.dialogueIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function moveDialogue(args) {
  const { sceneId, pageIndex } = getPageAddress(args, 'move-dialogue');
  const fromIndex = getIntArg(args, '--from', null);
  const toIndex = getIntArg(args, '--to', null);
  if (fromIndex == null || toIndex == null) {
    throw new Error('move-dialogue requires --from and --to');
  }

  const output = await mutateScript(args, (session) => session.moveDialogue({
    sceneId,
    pageIndex,
    fromIndex,
    toIndex,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Moved dialogue: ${output.result.sceneId}#${output.result.pageIndex}.${output.result.fromIndex}->${output.result.toIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function addChoiceOption(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('add-choice-option requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('add-choice-option requires --page');
  }

  const option = parseJsonArg(args, '--option-json', {
    text: getArgValue(args, '--text', ''),
    target: getArgValue(args, '--target', null),
    effects: parseJsonArg(args, '--effects', []),
  });

  const output = await mutateScript(args, (session) => session.addChoiceOption({
    sceneId,
    pageIndex,
    option,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Added choice option: ${output.result.sceneId}#${output.result.pageIndex}.${output.result.optionIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setChoiceOption(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('set-choice-option requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('set-choice-option requires --page');
  }

  const optionIndex = getIntArg(args, '--option', null);
  if (optionIndex == null) {
    throw new Error('set-choice-option requires --option');
  }

  const option = parseJsonArg(args, '--option-json', dropUndefinedFields({
    text: getOptionalArgValue(args, '--text'),
    target: hasFlag(args, '--clear-target') ? null : getOptionalArgValue(args, '--target'),
    effects: parseJsonArg(args, '--effects', undefined),
  }));

  const output = await mutateScript(args, (session) => session.setChoiceOption({
    sceneId,
    pageIndex,
    optionIndex,
    option,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set choice option: ${output.result.sceneId}#${output.result.pageIndex}.${output.result.optionIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setChoicePage(args) {
  const { sceneId, pageIndex } = getPageAddress(args, 'set-choice-page');
  const options = parseJsonArg(args, '--options', undefined);
  const output = await mutateScript(args, (session) => session.setChoicePage({
    sceneId,
    pageIndex,
    prompt: getOptionalArgValue(args, '--prompt'),
    options,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set choice page: ${output.result.sceneId}#${output.result.pageIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setConditionPage(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('set-condition-page requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('set-condition-page requires --page');
  }

  const condition = parseJsonArg(args, '--condition-json', dropUndefinedFields({
    conditionMode: getOptionalArgValue(args, '--condition-mode'),
    conditions: parseJsonArg(args, '--conditions', undefined),
    trueTarget: hasFlag(args, '--clear-true-target') ? null : getOptionalArgValue(args, '--true-target'),
    falseTarget: hasFlag(args, '--clear-false-target') ? null : getOptionalArgValue(args, '--false-target'),
  }));

  const output = await mutateScript(args, (session) => session.setConditionPage({
    sceneId,
    pageIndex,
    condition,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set condition page: ${output.result.sceneId}#${output.result.pageIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function removeChoiceOption(args) {
  const { sceneId, pageIndex } = getPageAddress(args, 'remove-choice-option');
  const optionIndex = getIntArg(args, '--option', null);
  if (optionIndex == null) {
    throw new Error('remove-choice-option requires --option');
  }

  const output = await mutateScript(args, (session) => session.removeChoiceOption({
    sceneId,
    pageIndex,
    optionIndex,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Removed choice option: ${output.result.sceneId}#${output.result.pageIndex}.${output.result.optionIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function moveChoiceOption(args) {
  const { sceneId, pageIndex } = getPageAddress(args, 'move-choice-option');
  const fromIndex = getIntArg(args, '--from', null);
  const toIndex = getIntArg(args, '--to', null);
  if (fromIndex == null || toIndex == null) {
    throw new Error('move-choice-option requires --from and --to');
  }

  const output = await mutateScript(args, (session) => session.moveChoiceOption({
    sceneId,
    pageIndex,
    fromIndex,
    toIndex,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Moved choice option: ${output.result.sceneId}#${output.result.pageIndex}.${output.result.fromIndex}->${output.result.toIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setPageBackground(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('set-page-background requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('set-page-background requires --page');
  }

  const output = await mutateScript(args, (session) => session.setPageBackground({
    sceneId,
    pageIndex,
    background: getArgValue(args, '--background', ''),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Set page background', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function setPageCharacters(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('set-page-characters requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('set-page-characters requires --page');
  }

  const explicitCharacters = parseJsonArg(args, '--characters', undefined);
  const preset = getArgValue(args, '--preset', null);
  if (preset && !LAYOUT_PRESETS.includes(preset)) {
    throw new Error(`Unknown layout preset "${preset}". Expected one of: ${LAYOUT_PRESETS.join(', ')}`);
  }

  const { ids, expressionHints } = parsePresetCharacters(args);
  const characters = explicitCharacters ?? createCharacterBlocking(ids, expressionHints, {
    preset: preset ?? undefined,
    speakerId: getArgValue(args, '--speaker', null),
  });

  const output = await mutateScript(args, (session) => session.setPageCharacters({
    sceneId,
    pageIndex,
    characters,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Set page characters', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function setPageAudio(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('set-page-audio requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('set-page-audio requires --page');
  }

  const { bgm, se } = parsePageAudioArgs(args);

  const output = await mutateScript(args, (session) => session.setPageAudio({
    sceneId,
    pageIndex,
    bgm,
    se,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set page audio: ${output.result.sceneId}#${output.result.pageIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setPageMedia(args) {
  const { sceneId, pageIndex } = getPageAddress(args, 'set-page-media');
  const { bgm, se } = parsePageAudioArgs(args);
  const output = await mutateScript(args, (session) => session.setPageMedia({
    sceneId,
    pageIndex,
    background: hasFlag(args, '--clear-background') ? '' : getOptionalArgValue(args, '--background'),
    bgm,
    se,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set page media: ${output.result.sceneId}#${output.result.pageIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setPageCamera(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('set-page-camera requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('set-page-camera requires --page');
  }

  const camera = hasFlag(args, '--clear-camera')
    ? null
    : parseJsonArg(args, '--camera', {
      effect: getArgValue(args, '--effect', null),
      direction: getArgValue(args, '--direction', undefined),
      intensity: getArgValue(args, '--intensity', 'medium'),
      durationMs: parseScalarValue(getArgValue(args, '--duration-ms', '800')),
    });

  const output = await mutateScript(args, (session) => session.setPageCamera({
    sceneId,
    pageIndex,
    camera,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set page camera: ${output.result.sceneId}#${output.result.pageIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setCameraEffect(args) {
  if (
    !hasFlag(args, '--clear-camera')
    && getArgValue(args, '--effect', null) == null
    && getArgValue(args, '--camera', null) == null
  ) {
    throw new Error('set-camera-effect requires --effect, --camera, or --clear-camera');
  }

  return setPageCamera(args);
}

async function setPageTransition(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('set-page-transition requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('set-page-transition requires --page');
  }

  const transition = hasFlag(args, '--clear-transition')
    ? null
    : parseJsonArg(args, '--transition', {
      type: getArgValue(args, '--type', 'fade'),
      duration: parseScalarValue(getArgValue(args, '--duration', '800')),
    });

  const output = await mutateScript(args, (session) => session.setPageTransition({
    sceneId,
    pageIndex,
    transition,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set page transition: ${output.result.sceneId}#${output.result.pageIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setPageTransitions(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('set-page-transitions requires --scene');
  }
  if (hasFlag(args, '--has-background') && hasFlag(args, '--without-background')) {
    throw new Error('set-page-transitions accepts only one of --has-background or --without-background');
  }

  const predicate = parseJsonArg(args, '--predicate', {}) ?? {};
  const transition = hasFlag(args, '--clear-transition')
    ? null
    : parseJsonArg(args, '--transition', {
      type: getArgValue(args, '--type', 'fade'),
      duration: parseScalarValue(getArgValue(args, '--duration', '800')),
    });
  const hasBackground = hasFlag(args, '--has-background')
    ? true
    : hasFlag(args, '--without-background')
      ? false
      : predicate.hasBackground;

  const output = await mutateScript(args, (session) => session.setPageTransitions({
    sceneId,
    fromPageIndex: getIntArg(args, '--from-page', undefined),
    toPageIndex: getIntArg(args, '--to-page', undefined),
    pageType: getOptionalArgValue(args, '--page-type') ?? predicate.pageType,
    hasBackground,
    transition,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set page transitions: ${output.result.sceneId} (${output.result.matchedPageIndexes.length} pages)\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setCharacterAnimation(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('set-character-animation requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('set-character-animation requires --page');
  }

  const characterId = getArgValue(args, '--character', getArgValue(args, '--character-id', null));
  if (!characterId) {
    throw new Error('set-character-animation requires --character');
  }

  const output = await mutateScript(args, (session) => session.setCharacterAnimation({
    sceneId,
    pageIndex,
    characterId,
    animation: getArgValue(args, '--animation', getArgValue(args, '--transition', 'none')),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set character animation: ${output.result.sceneId}#${output.result.pageIndex}.${output.result.characterId}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setTitleScreen(args) {
  const titleScreenPatch = await parseTitleScreenArgs(args);
  const output = await mutateScript(args, (session) => session.setTitleScreen(titleScreenPatch));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set title screen: ${output.result.elementCount} elements\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function addTitleElement(args) {
  const output = await mutateScript(args, (session) => session.addTitleElement({
    element: parseTitleElementArgs(args),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Added title element: ${output.result.elementId ?? output.result.elementIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function updateTitleElement(args) {
  const patch = parseJsonArg(args, '--patch', null) ?? parseTitleElementArgs(args, { requireType: false });
  const output = await mutateScript(args, (session) => session.updateTitleElement({
    elementId: getArgValue(args, '--id', getArgValue(args, '--element-id', null)),
    index: getIntArg(args, '--index', getIntArg(args, '--element-index', null)),
    patch,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Updated title element: ${output.result.elementId ?? output.result.elementIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function removeTitleElement(args) {
  const output = await mutateScript(args, (session) => session.removeTitleElement({
    elementId: getArgValue(args, '--id', getArgValue(args, '--element-id', null)),
    index: getIntArg(args, '--index', getIntArg(args, '--element-index', null)),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Removed title element: ${output.result.elementId ?? output.result.elementIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setScreenLayout(args) {
  const screenLayoutPatch = await parseScreenLayoutArgs(args);
  const output = await mutateScript(args, (session) => session.setScreenLayout(screenLayoutPatch));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set screen layout: ${output.result.screenId}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setSharedUiConfig(args, command, label, mutator) {
  const patch = await parseSharedUiConfigArgs(args, command);
  const output = await mutateScript(args, (session) => mutator(session, patch));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Set ${label}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function addChoiceEffect(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('add-choice-effect requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('add-choice-effect requires --page');
  }

  const optionIndex = getIntArg(args, '--option', null);
  if (optionIndex == null) {
    throw new Error('add-choice-effect requires --option');
  }

  const output = await mutateScript(args, (session) => session.addChoiceEffect({
    sceneId,
    pageIndex,
    optionIndex,
    effect: parseJsonArg(args, '--effect', {
      type: getArgValue(args, '--effect-type', 'var:add'),
      id: getArgValue(args, '--effect-id', getArgValue(args, '--variable', null)),
      value: parseScalarValue(getArgValue(args, '--value', '1')),
    }),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    process.stdout.write(`Added choice effect: ${output.result.sceneId}#${output.result.pageIndex}.${output.result.optionIndex}.${output.result.effectIndex}\n`);
    if (output.outPath) {
      process.stdout.write(`Wrote script: ${output.outPath}\n`);
    }
    process.stdout.write(`Validation: ${output.validation.ok ? 'OK' : 'FAILED'}\n`);
    for (const issue of output.validation.errors) {
      printIssue(issue);
    }
    for (const issue of output.validation.warnings) {
      printIssue(issue);
    }
  }

  return output.validation.ok ? 0 : 1;
}

async function setChoiceEffect(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('set-choice-effect requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('set-choice-effect requires --page');
  }

  const optionIndex = getIntArg(args, '--option', null);
  if (optionIndex == null) {
    throw new Error('set-choice-effect requires --option');
  }

  const effectIndex = getIntArg(args, '--effect-index', null);
  if (effectIndex == null) {
    throw new Error('set-choice-effect requires --effect-index');
  }

  const output = await mutateScript(args, (session) => session.setChoiceEffect({
    sceneId,
    pageIndex,
    optionIndex,
    effectIndex,
    effect: parseJsonArg(args, '--effect-json', parseJsonArg(args, '--effect', {
      type: getArgValue(args, '--effect-type', 'var:add'),
      id: getArgValue(args, '--effect-id', getArgValue(args, '--variable', null)),
      value: parseScalarValue(getArgValue(args, '--value', '1')),
    })),
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Set choice effect', output);
  }

  return output.validation.ok ? 0 : 1;
}

async function removeChoiceEffect(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--scene-id', null));
  if (!sceneId) {
    throw new Error('remove-choice-effect requires --scene');
  }

  const pageIndex = getIntArg(args, '--page', null);
  if (pageIndex == null) {
    throw new Error('remove-choice-effect requires --page');
  }

  const optionIndex = getIntArg(args, '--option', null);
  if (optionIndex == null) {
    throw new Error('remove-choice-effect requires --option');
  }

  const effectIndex = getIntArg(args, '--effect-index', null);
  if (effectIndex == null) {
    throw new Error('remove-choice-effect requires --effect-index');
  }

  const output = await mutateScript(args, (session) => session.removeChoiceEffect({
    sceneId,
    pageIndex,
    optionIndex,
    effectIndex,
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Removed choice effect', output);
  }

  return output.validation.ok ? 0 : 1;
}

function printHelp() {
  process.stdout.write(`vn-author commands:
  inspect [--script path] [--json]
  validate [--script path] [--check-assets] [--asset-root path] [--json]
  list-assets [--project path|--script path] [--json]
  list-transitions [--target background|character|camera] [--supported-only] [--json]
  graph-report [--script path] [--entry scene_id] [--mermaid] [--json]
  find-dead-ends [--script path] [--entry scene_id] [--json]
  find-missing-assets [--script path] [--asset-root path] [--json]
  find-unused-assets [--script path] [--asset-root path] [--json]
  author-check [--script path] [--asset-root path] [--skip-asset-check] [--skip-preview] [--scene scene_id] [--page index] [--transaction result.json] [--preview-out path] [--write-preview-plan] [--json]
  lint-layout [--script path] [--json]
  export-readiness [--script path] [--asset-root path] [--skip-asset-check] [--json]
  handoff-report [--script path] [--out path] [--write-editor-handoff] [--transaction result.json] [--checkpoint-dir path] [--checkpoint-limit count] [--skip-asset-check] [--note text] [--json]
  render-preview [--script path] [--scene scene_id] [--page index] [--out path] [--width px] [--height px] [--dry-run] [--write-plan] [--json]
  import-draft draft.json [--script base-script.json] [--out script.json] [--fresh] [--force] [--backup] [--checkpoint] [--json]
  draft-plan draft.json [--out plan.json] [--title title] [--json]
  apply-plan plan.json [--script path] [--out path] [--result-out path] [--dry-run] [--validate-only] [--force] [--backup] [--checkpoint] [--allow-invalid] [--json]
  restore-checkpoint checkpoint.json [--script path] [--force] [--backup] [--checkpoint-current] [--json]
  add-scene --id scene_id [--name name] [--next scene_id] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  scene-references --scene scene_id|--all [--script path] [--json]
  retarget-scene --from scene_id --to scene_id [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  repair-scene-target --from scene_id --to scene_id [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  clear-scene-references --scene scene_id [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  rename-scene --scene scene_id --new-id scene_id [--name name] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  delete-scene --scene scene_id [--force-references] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-scene-next --scene scene_id [--next scene_id] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-character --id character_id [--name name] [--color hex] [--expression name=path] [--expressions json] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-variable --id variable_id [--type number|bool] [--initial value] [--label label] [--group group] [--notes text] [--kind generic|affection] [--character character_id] [--min number] [--max number] [--step number] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  update-variable --id variable_id [--patch json] [--type number|bool] [--initial value] [--label label] [--group group] [--notes text] [--kind generic|affection] [--character character_id] [--min number] [--max number] [--step number] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  rename-variable --id variable_id --new-id variable_id [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  delete-variable --id variable_id [--force-references] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-affection-variable --character character_id [--id variable_id] [--initial value] [--label label] [--group group] [--notes text] [--min number] [--max number] [--step number] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  list-endings [--script path] [--json]
  add-ending --id ending_id [--title title] [--category category] [--order number] [--description text] [--thumbnail path] [--hidden-until-unlocked] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  update-ending --id ending_id [--patch json] [--title title] [--category category] [--order number] [--description text] [--thumbnail path] [--hidden-until-unlocked] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  remove-ending --id ending_id [--force-references] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-ending-unlock --scene scene_id --page index [--option index] --id ending_id [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  list-cg [--script path] [--json]
  add-cg --id cg_id [--title title] [--images json] [--thumbnail path] [--locked-thumbnail path] [--category category] [--order number] [--description text] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  update-cg --id cg_id [--patch json] [--title title] [--images json] [--thumbnail path] [--locked-thumbnail path] [--category category] [--order number] [--description text] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  remove-cg --id cg_id [--force-references] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-cg-unlock --scene scene_id --page index --option index --id cg_id [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-page --scene scene_id [--type normal|choice|condition] [--id page_id] [--background path] [--preset preset] [--character id[:expression]] [--characters json] [--dialogues json] [--options json] [--conditions json] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  remove-page --scene scene_id --page index [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  move-page --scene scene_id --from index --to index [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-dialogue --scene scene_id --page index [--speaker character_id] [--text text] [--expression expression] [--dialogue json] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-dialogue --scene scene_id --page index --dialogue-index index [--speaker character_id] [--text text] [--expression expression] [--voice path] [--dialogue-json json] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  remove-dialogue --scene scene_id --page index --dialogue-index index [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  move-dialogue --scene scene_id --page index --from index --to index [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-choice-option --scene scene_id --page index [--text text] [--target scene_id] [--effects json] [--option-json json] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-choice-page --scene scene_id --page index [--prompt text] [--options json] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-choice-option --scene scene_id --page index --option index [--text text] [--target scene_id] [--clear-target] [--effects json] [--option-json json] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  remove-choice-option --scene scene_id --page index --option index [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  move-choice-option --scene scene_id --page index --from index --to index [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-condition-page --scene scene_id --page index [--condition-mode all|any] [--conditions json] [--true-target scene_id] [--false-target scene_id] [--clear-true-target] [--clear-false-target] [--condition-json json] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-page-background --scene scene_id --page index --background path [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-page-media --scene scene_id --page index [--background path] [--clear-background] [--bgm path] [--bgm-volume number] [--se path] [--clear-bgm] [--clear-se] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-page-characters --scene scene_id --page index [--preset preset] [--character id[:expression]] [--characters json] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-page-audio --scene scene_id --page index [--bgm path] [--bgm-volume number] [--se path] [--clear-bgm] [--clear-se] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-page-camera --scene scene_id --page index [--effect shake|zoom|pan|flash] [--direction direction] [--intensity low|medium|high] [--duration-ms number] [--camera json] [--clear-camera] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-camera-effect --scene scene_id --page index [--effect shake|zoom|pan|flash|vignette|letterbox | --camera json | --clear-camera] [--direction direction] [--intensity low|medium|high] [--duration-ms number] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-page-transition --scene scene_id --page index [--type fade|dissolve|wipe|wipe-left|wipe-right|wipe-up|wipe-down|scale|blur|slide-left|slide-right|zoom-in|zoom-out|flash|iris-in|iris-out|crossfade-pan|none] [--duration number] [--transition json] [--clear-transition] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-page-transitions --scene scene_id [--from-page index] [--to-page index] [--page-type normal|choice|condition] [--has-background|--without-background] [--predicate json] [--type fade|dissolve|wipe|wipe-left|wipe-right|wipe-up|wipe-down|scale|blur|slide-left|slide-right|zoom-in|zoom-out|flash|iris-in|iris-out|crossfade-pan|none] [--duration number] [--transition json] [--clear-transition] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-character-animation --scene scene_id --page index --character character_id [--animation none|fade-in|slide-in-left|slide-in-right|shake|nod|breathe|bounce|fade|slide-left|slide-right|pop|scale-in|blur-in] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-character-transition --scene scene_id --page index --character character_id [--transition none|fade-in|slide-in-left|slide-in-right|shake|nod|breathe|bounce|fade|slide-left|slide-right|pop|scale-in|blur-in] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-title-screen [--background path] [--bgm path] [--elements json] [--config file] [--config-json json] [--clear-background] [--clear-bgm] [--replace] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-title-element --type text|button|image [--id id] [--content text] [--text text] [--label text] [--action start|continue|settings|quit] [--src path] [--x number] [--y number] [--anchor center|top-left] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  update-title-element --id id|--index index [--patch json] [--content text] [--text text] [--x number] [--y number] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  remove-title-element --id id|--index index [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-screen-layout --screen settingsScreen|gameMenu|saveLoadScreen|backlogScreen --config file|--config-json json [--replace] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-dialogue-box --config file|--config-json json [--replace] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-theme --config file|--config-json json [--replace] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-widget-styles --config file|--config-json json [--replace] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-choice-effect --scene scene_id --page index --option index [--effect json] [--effect-type type] [--effect-id id] [--value value] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-choice-effect --scene scene_id --page index --option index --effect-index index [--effect-json json] [--effect-type type] [--effect-id id] [--value value] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  remove-choice-effect --scene scene_id --page index --option index --effect-index index [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  export-report [--script path] [--check-assets] [--readiness] [--asset-root path] [--json]
`);
}

async function main() {
  const [, , command, ...args] = process.argv;

  try {
    if (command === 'inspect') {
      process.exitCode = await inspect(args);
      return;
    }

    if (command === 'validate') {
      process.exitCode = await validate(args);
      return;
    }

    if (command === 'list-assets') {
      process.exitCode = await listAssets(args);
      return;
    }

    if (command === 'list-transitions') {
      process.exitCode = listTransitions(args);
      return;
    }

    if (command === 'graph-report') {
      process.exitCode = await graphReport(args);
      return;
    }

    if (command === 'find-dead-ends') {
      process.exitCode = await findDeadEndsCommand(args);
      return;
    }

    if (command === 'find-missing-assets') {
      process.exitCode = await findMissingAssets(args);
      return;
    }

    if (command === 'find-unused-assets') {
      process.exitCode = await findUnusedAssets(args);
      return;
    }

    if (command === 'author-check') {
      process.exitCode = await authorCheck(args);
      return;
    }

    if (command === 'import-draft') {
      process.exitCode = await importDraft(args);
      return;
    }

    if (command === 'draft-plan') {
      process.exitCode = await draftPlan(args);
      return;
    }

    if (command === 'apply-plan') {
      process.exitCode = await applyPlan(args);
      return;
    }

    if (command === 'restore-checkpoint') {
      process.exitCode = await restoreCheckpoint(args);
      return;
    }

    if (command === 'export-report') {
      process.exitCode = await exportReport(args);
      return;
    }

    if (command === 'export-readiness') {
      process.exitCode = await exportReadiness(args);
      return;
    }

    if (command === 'handoff-report') {
      process.exitCode = await handoffReport(args);
      return;
    }

    if (command === 'lint-layout') {
      process.exitCode = await lintLayout(args);
      return;
    }

    if (command === 'render-preview') {
      process.exitCode = await renderPreview(args);
      return;
    }

    if (command === 'add-scene') {
      process.exitCode = await addScene(args);
      return;
    }

    if (command === 'set-scene-next') {
      process.exitCode = await setSceneNext(args);
      return;
    }

    if (command === 'scene-references') {
      process.exitCode = await sceneReferences(args);
      return;
    }

    if (command === 'retarget-scene') {
      process.exitCode = await retargetScene(args);
      return;
    }

    if (command === 'repair-scene-target') {
      process.exitCode = await repairSceneTarget(args);
      return;
    }

    if (command === 'clear-scene-references') {
      process.exitCode = await clearSceneReferencesCommand(args);
      return;
    }

    if (command === 'rename-scene') {
      process.exitCode = await renameScene(args);
      return;
    }

    if (command === 'delete-scene') {
      process.exitCode = await deleteScene(args);
      return;
    }

    if (command === 'add-character') {
      process.exitCode = await addCharacter(args);
      return;
    }

    if (command === 'add-variable') {
      process.exitCode = await addVariable(args);
      return;
    }

    if (command === 'update-variable') {
      process.exitCode = await updateVariable(args);
      return;
    }

    if (command === 'rename-variable') {
      process.exitCode = await renameVariable(args);
      return;
    }

    if (command === 'delete-variable') {
      process.exitCode = await deleteVariable(args);
      return;
    }

    if (command === 'add-affection-variable') {
      process.exitCode = await addAffectionVariable(args);
      return;
    }

    if (command === 'list-endings') {
      process.exitCode = await listEndings(args);
      return;
    }

    if (command === 'add-ending') {
      process.exitCode = await addEnding(args);
      return;
    }

    if (command === 'update-ending') {
      process.exitCode = await updateEnding(args);
      return;
    }

    if (command === 'remove-ending') {
      process.exitCode = await removeEnding(args);
      return;
    }

    if (command === 'add-ending-unlock') {
      process.exitCode = await addEndingUnlock(args);
      return;
    }

    if (command === 'list-cg') {
      process.exitCode = await listCgs(args);
      return;
    }

    if (command === 'add-cg') {
      process.exitCode = await addCg(args);
      return;
    }

    if (command === 'update-cg') {
      process.exitCode = await updateCg(args);
      return;
    }

    if (command === 'remove-cg') {
      process.exitCode = await removeCg(args);
      return;
    }

    if (command === 'add-cg-unlock') {
      process.exitCode = await addCgUnlock(args);
      return;
    }

    if (command === 'add-page') {
      process.exitCode = await addPage(args);
      return;
    }

    if (command === 'remove-page') {
      process.exitCode = await removePage(args);
      return;
    }

    if (command === 'move-page') {
      process.exitCode = await movePage(args);
      return;
    }

    if (command === 'add-dialogue') {
      process.exitCode = await addDialogue(args);
      return;
    }

    if (command === 'set-dialogue') {
      process.exitCode = await setDialogue(args);
      return;
    }

    if (command === 'remove-dialogue') {
      process.exitCode = await removeDialogue(args);
      return;
    }

    if (command === 'move-dialogue') {
      process.exitCode = await moveDialogue(args);
      return;
    }

    if (command === 'add-choice-option') {
      process.exitCode = await addChoiceOption(args);
      return;
    }

    if (command === 'set-choice-option') {
      process.exitCode = await setChoiceOption(args);
      return;
    }

    if (command === 'set-choice-page') {
      process.exitCode = await setChoicePage(args);
      return;
    }

    if (command === 'remove-choice-option') {
      process.exitCode = await removeChoiceOption(args);
      return;
    }

    if (command === 'move-choice-option') {
      process.exitCode = await moveChoiceOption(args);
      return;
    }

    if (command === 'set-condition-page') {
      process.exitCode = await setConditionPage(args);
      return;
    }

    if (command === 'set-page-background') {
      process.exitCode = await setPageBackground(args);
      return;
    }

    if (command === 'set-page-media') {
      process.exitCode = await setPageMedia(args);
      return;
    }

    if (command === 'set-page-characters') {
      process.exitCode = await setPageCharacters(args);
      return;
    }

    if (command === 'set-page-audio') {
      process.exitCode = await setPageAudio(args);
      return;
    }

    if (command === 'set-page-camera') {
      process.exitCode = await setPageCamera(args);
      return;
    }

    if (command === 'set-camera-effect') {
      process.exitCode = await setCameraEffect(args);
      return;
    }

    if (command === 'set-page-transition') {
      process.exitCode = await setPageTransition(args);
      return;
    }

    if (command === 'set-page-transitions') {
      process.exitCode = await setPageTransitions(args);
      return;
    }

    if (command === 'set-character-animation' || command === 'set-character-transition') {
      process.exitCode = await setCharacterAnimation(args);
      return;
    }

    if (command === 'set-title-screen') {
      process.exitCode = await setTitleScreen(args);
      return;
    }

    if (command === 'add-title-element') {
      process.exitCode = await addTitleElement(args);
      return;
    }

    if (command === 'update-title-element') {
      process.exitCode = await updateTitleElement(args);
      return;
    }

    if (command === 'remove-title-element') {
      process.exitCode = await removeTitleElement(args);
      return;
    }

    if (command === 'set-screen-layout') {
      process.exitCode = await setScreenLayout(args);
      return;
    }

    if (command === 'set-dialogue-box') {
      process.exitCode = await setSharedUiConfig(
        args,
        command,
        'dialogue box',
        (session, patch) => session.setDialogueBox(patch),
      );
      return;
    }

    if (command === 'set-theme') {
      process.exitCode = await setSharedUiConfig(
        args,
        command,
        'theme',
        (session, patch) => session.setTheme(patch),
      );
      return;
    }

    if (command === 'set-widget-styles') {
      process.exitCode = await setSharedUiConfig(
        args,
        command,
        'widget styles',
        (session, patch) => session.setWidgetStyles(patch),
      );
      return;
    }

    if (command === 'add-choice-effect') {
      process.exitCode = await addChoiceEffect(args);
      return;
    }

    if (command === 'set-choice-effect') {
      process.exitCode = await setChoiceEffect(args);
      return;
    }

    if (command === 'remove-choice-effect') {
      process.exitCode = await removeChoiceEffect(args);
      return;
    }

    printHelp();
    process.exitCode = command ? 1 : 0;
  } catch (error) {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  }
}

main();
