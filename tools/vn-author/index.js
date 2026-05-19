#!/usr/bin/env node

import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { importNovelDraft } from '../../src/authoring/novelDraftImport.js';
import { createExportReadiness } from '../../src/authoring/exportReadiness.js';
import { lintProjectLayout } from '../../src/authoring/layoutLint.js';
import { createCharacterBlocking, LAYOUT_PRESETS } from '../../src/authoring/layoutPresets.js';
import { createProjectSession } from '../../src/authoring/projectSession.js';
import { createProjectReport } from '../../src/authoring/projectReport.js';
import { validateProject } from '../../src/shared/projectValidator.js';
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
  lint-layout [--script path] [--json]
  export-readiness [--script path] [--asset-root path] [--skip-asset-check] [--json]
  render-preview [--script path] [--scene scene_id] [--page index] [--out path] [--width px] [--height px] [--dry-run] [--write-plan] [--json]
  import-draft draft.json [--script base-script.json] [--out script.json] [--fresh] [--force] [--backup] [--checkpoint] [--json]
  add-scene --id scene_id [--name name] [--next scene_id] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
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
  set-choice-option --scene scene_id --page index --option index [--text text] [--target scene_id] [--clear-target] [--effects json] [--option-json json] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  remove-choice-option --scene scene_id --page index --option index [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  move-choice-option --scene scene_id --page index --from index --to index [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-condition-page --scene scene_id --page index [--condition-mode all|any] [--conditions json] [--true-target scene_id] [--false-target scene_id] [--clear-true-target] [--clear-false-target] [--condition-json json] [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
  set-page-background --scene scene_id --page index --background path [--script path] [--out path] [--dry-run] [--force] [--backup] [--checkpoint] [--json]
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

    if (command === 'import-draft') {
      process.exitCode = await importDraft(args);
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
