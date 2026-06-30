import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { createProjectSession } from '../src/authoring/projectSession.js';
import { CUSTOMIZED_LEGACY_UI, MINIMAL_LEGACY_UI } from '../tests/fixtures/unifiedScreenDesignerLegacyFixtures.js';

const clone = value => JSON.parse(JSON.stringify(value));
const outputRoot = path.resolve(process.argv[2] || '.tmp/phase11-migration');
const execFileAsync = promisify(execFile);
const cliPath = path.resolve('tools/vn-author/index.js');

function sha256(source) {
  return createHash('sha256').update(source).digest('hex').toUpperCase();
}

function baseScript(projectId, ui) {
  return {
    projectId,
    meta: { title: projectId, resolution: { width: 1280, height: 720 } },
    characters: {},
    systems: { variables: {}, endings: {}, gallery: { cg: {} } },
    assets: { videos: {} },
    scenes: { start: { pages: [{ type: 'normal', dialogues: [{ speaker: null, text: 'Preserved story.' }] }] } },
    ui: clone(ui),
  };
}

function withoutUi(script) {
  const copy = clone(script);
  delete copy.ui;
  return copy;
}

async function writeFixture(name, script) {
  const fixtureDir = path.join(outputRoot, name);
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(path.join(fixtureDir, 'script.json'), `${JSON.stringify(script, null, 2)}\n`, 'utf8');
  return fixtureDir;
}

async function verifyMigratable(name, source) {
  const fixtureDir = await writeFixture(name, source);
  const session = createProjectSession({ script: source });
  const beforeNonUi = withoutUi(source);
  const first = session.migrateUiProject();
  const migrated = session.toJSON();
  const persisted = { ...source, ui: migrated.ui };
  const validation = session.validate();
  const second = session.migrateUiProject();
  const nonUiPreserved = JSON.stringify(withoutUi(persisted)) === JSON.stringify(beforeNonUi);
  await writeFile(path.join(fixtureDir, 'expected-migrated.json'), `${JSON.stringify(persisted, null, 2)}\n`, 'utf8');
  return {
    name,
    fixtureDir,
    ok: validation.ok && nonUiPreserved && second.idempotent,
    validation,
    nonUiPreserved,
    changedPaths: first.changedPaths,
    diagnostics: first.diagnostics,
    repeatedChangedPaths: second.changedPaths,
  };
}

async function verifyCheckpointRollback(fixtureDir) {
  const scriptPath = path.join(fixtureDir, 'script.json');
  const resultOutPath = path.join(outputRoot, 'rollback-migration-result.json');
  const beforeSource = await readFile(scriptPath);
  const writeResult = JSON.parse((await execFileAsync(process.execPath, [
    cliPath,
    'migrate-ui-project',
    '--script', scriptPath,
    '--force',
    '--checkpoint',
    '--result-out', resultOutPath,
    '--json',
  ])).stdout);
  const migratedSource = await readFile(scriptPath);
  const checkpointPath = writeResult.transaction?.checkpointPath;
  if (!checkpointPath) throw new Error('Rollback evidence requires a migration checkpoint path.');
  const restoreResult = JSON.parse((await execFileAsync(process.execPath, [
    cliPath,
    'restore-checkpoint', checkpointPath,
    '--script', scriptPath,
    '--force',
    '--json',
  ])).stdout);
  const restoredSource = await readFile(scriptPath);
  const byteEqual = beforeSource.equals(restoredSource);
  const semanticEqual = JSON.stringify(JSON.parse(beforeSource)) === JSON.stringify(JSON.parse(restoredSource));
  return {
    name: 'checkpoint-rollback',
    fixtureDir,
    ok: writeResult.transaction?.wrote === true
      && restoreResult.transaction?.wrote === true
      && byteEqual
      && semanticEqual,
    checkpointPath,
    resultOutPath,
    changedPaths: writeResult.changeSummary?.changedPaths ?? [],
    beforeSha256: sha256(beforeSource),
    migratedSha256: sha256(migratedSource),
    restoredSha256: sha256(restoredSource),
    byteEqual,
    semanticEqual,
    writeTransaction: writeResult.transaction,
    restoreTransaction: restoreResult.transaction,
  };
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const minimal = baseScript('phase11-minimal-legacy', MINIMAL_LEGACY_UI);
const customized = baseScript('phase11-customized-legacy', CUSTOMIZED_LEGACY_UI);
const canonicalSession = createProjectSession({ script: customized });
canonicalSession.migrateUiProject();
const fullyCanonical = { ...customized, ui: canonicalSession.toJSON().ui };
const mixed = clone(fullyCanonical);
delete mixed.ui.screens.settings;
mixed.ui.screenAuthorities.settings = 'legacy-only';
delete mixed.ui.overlays.confirmation;

const results = [];
for (const [name, script] of [
  ['minimal-legacy', minimal],
  ['customized-legacy', customized],
  ['mixed-authority', mixed],
  ['fully-canonical', fullyCanonical],
]) {
  results.push(await verifyMigratable(name, script));
}
results.push(await verifyCheckpointRollback(path.join(outputRoot, 'customized-legacy')));

const invalid = clone(fullyCanonical);
invalid.ui.screens.title.rootId = 'missing.root';
const invalidDir = await writeFixture('invalid-document', invalid);
let invalidRefused = false;
let invalidMessage = null;
try {
  createProjectSession({ script: invalid }).migrateUiProject();
} catch (error) {
  invalidRefused = true;
  invalidMessage = error.message;
}
results.push({ name: 'invalid-document', fixtureDir: invalidDir, ok: invalidRefused, invalidRefused, invalidMessage });

const report = {
  generatedAt: new Date().toISOString(),
  outputRoot,
  ok: results.every(item => item.ok),
  results,
};
await writeFile(path.join(outputRoot, 'matrix-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.ok) process.exitCode = 1;
