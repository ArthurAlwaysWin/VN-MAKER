#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const cliPath = path.join(__dirname, 'index.js');
const planPath = path.join(repoRoot, 'docs', 'agent-authoring', 'example-plan.json');
const markerName = '.agent-example-generated.json';
const defaultProjectPath = path.join(repoRoot, '.tmp', 'agent-example-project');

function hasFlag(args, name) {
  return args.includes(name);
}

function getArgValue(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && index < args.length - 1 ? args[index + 1] : fallback;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function prepareOutputDirectory(projectPath, force) {
  if (!await exists(projectPath)) {
    await mkdir(projectPath, { recursive: true });
    return;
  }

  if (!force) {
    throw new Error(`Output already exists: ${projectPath}. Pass --force to rebuild this generated example.`);
  }

  const markerPath = path.join(projectPath, markerName);
  if (!await exists(markerPath)) {
    throw new Error(`Refusing to replace an unmarked directory: ${projectPath}. Choose a new --out path.`);
  }

  const marker = JSON.parse(await readFile(markerPath, 'utf8'));
  if (marker.kind !== 'agent-example-project') {
    throw new Error(`Refusing to replace a directory with an unknown marker: ${projectPath}.`);
  }

  await rm(projectPath, { recursive: true, force: true });
  await mkdir(projectPath, { recursive: true });
}

function escapeXml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function createVisualSvg({ title, subtitle, color, width = 1280, height = 720 }) {
  const safeTitle = escapeXml(title);
  const safeSubtitle = escapeXml(subtitle);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x2="1" y2="1">
      <stop stop-color="${color}" />
      <stop offset="1" stop-color="#171524" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <circle cx="${Math.round(width * 0.76)}" cy="${Math.round(height * 0.25)}" r="${Math.round(height * 0.18)}" fill="#fff" opacity="0.12" />
  <rect x="${Math.round(width * 0.07)}" y="${Math.round(height * 0.68)}" width="${Math.round(width * 0.86)}" height="2" fill="#fff" opacity="0.35" />
  <text x="${Math.round(width * 0.07)}" y="${Math.round(height * 0.79)}" fill="#fff" font-family="Arial, sans-serif" font-size="${Math.max(22, Math.round(height * 0.065))}" font-weight="700">${safeTitle}</text>
  <text x="${Math.round(width * 0.07)}" y="${Math.round(height * 0.87)}" fill="#fff" opacity="0.8" font-family="Arial, sans-serif" font-size="${Math.max(14, Math.round(height * 0.03))}">${safeSubtitle}</text>
</svg>
`;
}

function createCharacterSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="900" viewBox="0 0 520 900">
  <defs>
    <linearGradient id="dress" y2="1">
      <stop stop-color="#ffb2c6" />
      <stop offset="1" stop-color="#d65c86" />
    </linearGradient>
  </defs>
  <ellipse cx="260" cy="870" rx="178" ry="24" fill="#000" opacity="0.18" />
  <circle cx="260" cy="210" r="118" fill="#ffe2d2" />
  <path d="M134 205q10-164 126-164t126 164q-28-58-126-70-98 12-126 70z" fill="#6d3d52" />
  <path d="M183 188q30 38 77 0 48 38 77 0" fill="none" stroke="#6d3d52" stroke-width="12" stroke-linecap="round" />
  <path d="M226 253q34 25 68 0" fill="none" stroke="#d05f72" stroke-width="9" stroke-linecap="round" />
  <path d="M155 827l26-440q79-64 158 0l26 440z" fill="url(#dress)" />
  <path d="M182 447h156" stroke="#fff" stroke-width="18" opacity="0.8" />
  <text x="260" y="866" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="22">Sakura / smile</text>
</svg>
`;
}

const EXAMPLE_ASSETS = {
  'characters/sakura_smile.svg': createCharacterSvg(),
  'backgrounds/school_gate.svg': createVisualSvg({
    title: 'School Gate',
    subtitle: 'Spring Promise example background',
    color: '#d16e9a',
  }),
  'backgrounds/rooftop_sunset.svg': createVisualSvg({
    title: 'Rooftop Sunset',
    subtitle: 'Good ending route',
    color: '#e88062',
  }),
  'backgrounds/empty_platform.svg': createVisualSvg({
    title: 'Empty Platform',
    subtitle: 'Quiet ending route',
    color: '#405875',
  }),
  'backgrounds/cg/sakura_confession.svg': createVisualSvg({
    title: 'Rooftop Promise CG',
    subtitle: 'Unlocked by the honest response',
    color: '#ba527b',
  }),
  'backgrounds/cg/sakura_confession_thumb.svg': createVisualSvg({
    title: 'Rooftop Promise',
    subtitle: 'CG thumbnail',
    color: '#ba527b',
    width: 480,
    height: 270,
  }),
  'ui/endings/good.svg': createVisualSvg({
    title: 'Spring Promise',
    subtitle: 'Good End',
    color: '#d66c89',
    width: 480,
    height: 270,
  }),
  'ui/endings/quiet.svg': createVisualSvg({
    title: 'Passing Platform',
    subtitle: 'Normal End',
    color: '#4d617c',
    width: 480,
    height: 270,
  }),
  'ui/gallery/locked.svg': createVisualSvg({
    title: 'Locked Memory',
    subtitle: 'Reach the route to unlock',
    color: '#353442',
    width: 480,
    height: 270,
  }),
};

async function writeExampleShell(projectPath) {
  const marker = {
    kind: 'agent-example-project',
    sourcePlan: path.relative(repoRoot, planPath).replaceAll('\\', '/'),
  };
  await writeFile(path.join(projectPath, markerName), `${JSON.stringify(marker, null, 2)}\n`, 'utf8');
  await writeFile(path.join(projectPath, 'project.json'), `${JSON.stringify({
    name: 'Spring Promise Agent Example',
    author: 'Galgame Maker Agent Workflow',
    version: '1.0.0',
    description: 'Generated review project for the executable agent authoring example.',
    resolution: { width: 1280, height: 720 },
    engineVersion: '0.1.0',
  }, null, 2)}\n`, 'utf8');
  await writeFile(path.join(projectPath, 'script.json'), `${JSON.stringify({
    projectId: 'gm_spring_promise_agent_example',
    contractVersion: 1,
    characters: {},
    scenes: {},
    systems: {
      variables: {},
      endings: {},
      gallery: { cg: {} },
    },
  }, null, 2)}\n`, 'utf8');

  for (const [assetPath, content] of Object.entries(EXAMPLE_ASSETS)) {
    const outputPath = path.join(projectPath, 'assets', ...assetPath.split('/'));
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, 'utf8');
  }
}

async function runCli(args) {
  const { stdout } = await execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

async function writeJson(outputPath, value) {
  await writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function verifyExampleWorkflow(args) {
  const projectPath = path.resolve(repoRoot, getArgValue(args, '--out', defaultProjectPath));
  await prepareOutputDirectory(projectPath, hasFlag(args, '--force'));
  await writeExampleShell(projectPath);

  const scriptPath = path.join(projectPath, 'script.json');
  const assetRoot = path.join(projectPath, 'assets');
  const reviewPath = path.join(projectPath, 'review');
  const validationPath = path.join(reviewPath, 'apply-plan-validation.json');
  const transactionPath = path.join(reviewPath, 'apply-plan-result.json');
  const previewPath = path.join(reviewPath, 'author-check-preview.png');
  await mkdir(reviewPath, { recursive: true });

  const validation = await runCli([
    'apply-plan', planPath, '--script', scriptPath, '--validate-only',
    '--result-out', validationPath, '--json',
  ]);
  const dryRun = await runCli([
    'apply-plan', planPath, '--script', scriptPath, '--dry-run', '--json',
  ]);
  await writeJson(path.join(reviewPath, 'apply-plan-dry-run.json'), dryRun);
  const transaction = await runCli([
    'apply-plan', planPath, '--script', scriptPath, '--force', '--checkpoint',
    '--result-out', transactionPath, '--json',
  ]);
  const graph = await runCli(['graph-report', '--script', scriptPath, '--json']);
  await writeJson(path.join(reviewPath, 'graph-report.json'), graph);
  const continuousReview = await runCli([
    'review-handoff', '--script', scriptPath, '--asset-root', assetRoot,
    '--transaction', transactionPath, '--preview-out', previewPath,
    '--write-preview-plan', '--write-editor-handoff',
    '--review-out', path.join(reviewPath, 'review-handoff.json'),
    '--note', 'Review the generated Spring Promise multi-ending example route.',
    '--json',
  ]);
  const authorCheck = continuousReview.authorCheck;
  await writeJson(path.join(reviewPath, 'author-check.json'), authorCheck);
  const handoff = continuousReview.handoff;
  await writeJson(path.join(reviewPath, 'handoff-report.json'), handoff);
  const readiness = await runCli([
    'export-readiness', '--script', scriptPath, '--asset-root', assetRoot, '--json',
  ]);
  await writeJson(path.join(reviewPath, 'export-readiness.json'), readiness);

  const output = {
    kind: 'agent-example-workflow-verification',
    projectPath,
    sourcePlan: planPath,
    gates: {
      validation: validation.validation?.ok === true,
      dryRun: dryRun.validation?.ok === true,
      apply: transaction.transaction?.wrote === true && transaction.validation?.ok === true,
      continuousReview: continuousReview.ok === true,
      authorCheck: authorCheck.ok === true,
      handoff: handoff.ok === true,
      readiness: readiness.ready === true,
    },
    sceneGraph: {
      reachableSceneIds: graph.reachableSceneIds,
      deadEndSceneIds: graph.deadEndSceneIds,
      cyclesWithoutExit: graph.cyclesWithoutExit,
    },
    artifacts: {
      project: path.join(projectPath, 'project.json'),
      script: scriptPath,
      handoff: path.join(projectPath, 'agent-handoff.json'),
      validation: validationPath,
      transaction: transactionPath,
      authorCheck: path.join(reviewPath, 'author-check.json'),
      continuousReview: path.join(reviewPath, 'review-handoff.json'),
      previewPlan: `${previewPath}.json`,
      graph: path.join(reviewPath, 'graph-report.json'),
      readiness: path.join(reviewPath, 'export-readiness.json'),
    },
  };
  await writeJson(path.join(reviewPath, 'verification-summary.json'), output);
  return output;
}

async function main() {
  try {
    const output = await verifyExampleWorkflow(process.argv.slice(2));
    if (hasFlag(process.argv, '--json')) {
      process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    } else {
      process.stdout.write(`Verified agent example project: ${output.projectPath}\n`);
      process.stdout.write(`Readiness: ${output.gates.readiness ? 'READY' : 'BLOCKED'}\n`);
      process.stdout.write(`Editor handoff: ${output.artifacts.handoff}\n`);
    }
    process.exitCode = Object.values(output.gates).every(Boolean) ? 0 : 1;
  } catch (error) {
    process.stderr.write(`verify-example-workflow failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

await main();
