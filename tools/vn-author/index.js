#!/usr/bin/env node

import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { importNovelDraft } from '../../src/authoring/novelDraftImport.js';
import { createNovelDraftPlan } from '../../src/authoring/novelDraftPlan.js';
import { createAgentHandoff } from '../../src/authoring/agentHandoff.js';
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
    'sceneId',
    'newSceneId',
    'deletedSceneId',
    'pageIndex',
    'dialogueIndex',
    'optionIndex',
    'fromIndex',
    'toIndex',
    'effectIndex',
  ]) {
    if (result[key] !== undefined) {
      target[key] = result[key];
    }
  }
  return target;
}

function getChangedPaths(result = {}) {
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

function createAuthorCheckFocus({ args, script, transaction }) {
  const changedPaths = getTransactionChangedPaths(transaction?.data);
  const transactionSceneIds = sceneIdsFromChangedPaths(changedPaths)
    .filter((sceneId) => script.scenes?.[sceneId]);
  const transactionPageTargets = pageTargetsFromChangedPaths(changedPaths, script);
  const explicitSceneId = getArgValue(args, '--scene', null);
  const explicitPageIndex = getIntArg(args, '--page', null);
  const defaultSceneId = explicitSceneId ?? transactionPageTargets[0]?.sceneId ?? transactionSceneIds[0] ?? 'start';
  const defaultPageIndex = explicitPageIndex ?? transactionPageTargets[0]?.pageIndex ?? 0;
  const checkedSceneIds = uniqueValues([
    ...(explicitSceneId ? [explicitSceneId] : []),
    ...transactionSceneIds,
    ...(transaction?.data ? [] : [defaultSceneId]),
  ]).filter((sceneId) => script.scenes?.[sceneId]);

  return {
    mode: transaction?.data ? 'transaction' : 'manual',
    transactionPath: transaction?.path ?? null,
    changedPaths,
    checkedSceneIds,
    pageTargets: transaction?.data ? transactionPageTargets : [],
    previewTarget: {
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
  'clear-scene-references',
  'add-character',
  'add-variable',
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
  'set-page-transition',
  'set-character-animation',
  'add-choice-effect',
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

  if (command === 'clear-scene-references') {
    return session.clearSceneReferences({
      sceneId: requireParam(params, command, 'sceneId', 'scene', 'id'),
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
    return session.setPageCamera({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      camera: getParam(params, 'clearCamera', 'clear-camera') ? null : getParam(params, 'camera'),
    });
  }

  if (command === 'set-page-transition') {
    return session.setPageTransition({
      sceneId: requireParam(params, command, 'sceneId', 'scene'),
      pageIndex: requireParam(params, command, 'pageIndex', 'page'),
      transition: getParam(params, 'clearTransition', 'clear-transition') ? null : getParam(params, 'transition'),
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
    code: issue.code,
    message: issue.message,
    pathString: issue.pathString ?? '',
    location: issue.location ?? (
      issue.sceneId ? { sceneId: issue.sceneId, pageIndex: issue.pageIndex ?? null } : undefined
    ),
    suggestedAction: issue.suggestedAction,
  }));
}

function collectAuthorCheckSuggestions({ validation, layout, readiness, preview, referenceDiagnostics }) {
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

async function inspect(args) {
  const { scriptPath, script } = await readScript(args);
  const summary = {
    scriptPath,
    title: script.meta?.title ?? null,
    projectId: script.projectId ?? null,
    characterCount: Object.keys(script.characters ?? {}).length,
    sceneCount: Object.keys(script.scenes ?? {}).length,
    variableCount: Object.keys(script.systems?.variables ?? {}).length,
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

async function applyPlan(args) {
  const planPathArg = args.find((arg) => !arg.startsWith('--'));
  if (!planPathArg) {
    throw new Error('apply-plan requires a plan JSON path');
  }

  const planPath = path.resolve(repoRoot, planPathArg);
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
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
  const sceneId = focus.previewTarget.sceneId;
  const referenceDiagnostics = collectSceneReferenceDiagnostics(script, {
    sceneIds: focus.checkedSceneIds,
    changedPaths: focus.changedPaths,
  });

  let preview = null;
  if (!hasFlag(args, '--skip-preview')) {
    const pageIndex = focus.previewTarget.pageIndex;
    const width = getIntArg(args, '--width', script.meta?.resolution?.width ?? 1280);
    const height = getIntArg(args, '--height', script.meta?.resolution?.height ?? 720);
    const outPath = path.resolve(repoRoot, getArgValue(args, '--preview-out', path.join('.tmp', 'author-check-preview.png')));
    preview = await renderPreviewScreenshot({
      repoRoot,
      script,
      sceneId,
      pageIndex,
      outPath,
      width,
      height,
      dryRun: true,
    });

    if (hasFlag(args, '--write-preview-plan')) {
      const planPath = outPath.endsWith('.json') ? outPath : `${outPath}.json`;
      await writePreviewRenderPlan(planPath, preview);
      preview.planPath = planPath;
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
      previewPlanned: Boolean(preview),
    },
    sceneReferences: {
      checkedSceneIds: focus.checkedSceneIds,
      diagnostics: referenceDiagnostics,
    },
    referenceDiagnostics,
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

async function clearSceneReferencesCommand(args) {
  const sceneId = getArgValue(args, '--scene', getArgValue(args, '--id', null));
  if (!sceneId) {
    throw new Error('clear-scene-references requires --scene');
  }

  const output = await mutateScript(args, (session) => session.clearSceneReferences({
    sceneId,
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
  }));

  if (hasFlag(args, '--json')) {
    writeJson(output);
  } else {
    printMutationResult('Added variable', output);
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
      durationMs: parseScalarValue(getArgValue(args, '--duration-ms', '450')),
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
    animation: getArgValue(args, '--animation', 'none'),
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

function printHelp() {
  process.stdout.write(`vn-author commands:
  inspect [--script path] [--json]
  validate [--script path] [--check-assets] [--asset-root path] [--json]
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
  clear-scene-references --scene scene_id [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  rename-scene --scene scene_id --new-id scene_id [--name name] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  delete-scene --scene scene_id [--force-references] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-scene-next --scene scene_id [--next scene_id] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-character --id character_id [--name name] [--color hex] [--expression name=path] [--expressions json] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-variable --id variable_id [--type number|bool] [--initial value] [--label label] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
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
  set-page-transition --scene scene_id --page index [--type fade|dissolve|wipe|scale|blur|slide-left|slide-right|none] [--duration number] [--transition json] [--clear-transition] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-character-animation --scene scene_id --page index --character character_id [--animation none|fade-in|slide-in-left|slide-in-right|shake|nod|breathe|bounce] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  add-choice-effect --scene scene_id --page index --option index [--effect json] [--effect-type type] [--effect-id id] [--value value] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
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

    if (command === 'set-page-transition') {
      process.exitCode = await setPageTransition(args);
      return;
    }

    if (command === 'set-character-animation') {
      process.exitCode = await setCharacterAnimation(args);
      return;
    }

    if (command === 'add-choice-effect') {
      process.exitCode = await addChoiceEffect(args);
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
