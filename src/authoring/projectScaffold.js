import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { createDefaultGalgameScript, ensureGalgameContract } from '../shared/galgameContract.js';

const WINDOWS_RESERVED_PROJECT_NAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

export function sanitizeProjectName(name) {
  const safeName = String(name ?? '')
    .replace(/[<>:"|?*\\/]/g, '_')
    .replace(/\.{2,}/g, '_')
    .trim()
    .replace(/[. ]+$/g, '');
  if (!safeName || safeName === '.' || WINDOWS_RESERVED_PROJECT_NAMES.has(safeName.toLowerCase())) {
    return 'untitled';
  }
  return safeName;
}

function getEnvValue(env, name) {
  const value = env?.[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function getDocumentsDir({ env = process.env, platform = process.platform, homeDir = os.homedir() } = {}) {
  if (platform === 'win32') {
    return path.join(getEnvValue(env, 'USERPROFILE') || homeDir, 'Documents');
  }
  return path.join(homeDir, 'Documents');
}

function isPathInside(parentPath, childPath) {
  const parent = path.resolve(parentPath);
  const child = path.resolve(childPath);
  const relative = path.relative(parent, child);
  return relative === '' || (relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

export function getRecommendedProjectRootCandidates({
  env = process.env,
  platform = process.platform,
  homeDir = os.homedir(),
  projectLibraryDir = null,
} = {}) {
  const explicit = getEnvValue(env, 'GALGAME_MAKER_PROJECTS_DIR');
  const documentsDir = getDocumentsDir({ env, platform, homeDir });
  const candidates = explicit ? [explicit] : [];
  candidates.push(
    projectLibraryDir,
    path.join(documentsDir, 'Galgame Maker', 'Projects'),
    path.join(homeDir, 'Galgame Maker', 'Projects'),
  );

  return uniqueValues(candidates.filter(Boolean).map((candidate) => path.resolve(candidate)));
}

export function describeUnsafeProjectPath(projectPath, {
  appRoot = process.cwd(),
  tmpDir = os.tmpdir(),
  includeTmp = false,
} = {}) {
  const resolved = path.resolve(projectPath);
  const app = path.resolve(appRoot);
  const unsafeRoots = [
    app,
    path.join(app, 'release'),
    path.join(app, 'dist'),
    path.join(app, 'dist-web'),
    path.join(app, 'dist-electron'),
    path.join(app, 'node_modules'),
    path.join(app, '.git'),
  ];
  if (includeTmp) {
    unsafeRoots.push(tmpDir);
  }

  const matched = unsafeRoots.find((root) => isPathInside(root, resolved));
  if (matched) {
    return {
      unsafe: true,
      reason: `Project path is inside a protected directory: ${matched}`,
      matchedRoot: matched,
    };
  }

  return { unsafe: false, reason: null, matchedRoot: null };
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function makeUniqueProjectPath(basePath) {
  if (!await pathExists(basePath)) {
    return basePath;
  }

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${basePath}-${index}`;
    if (!await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Could not find an unused project directory near: ${basePath}`);
}

export async function resolveProjectPathForCreate({
  projectPath = null,
  title = null,
  appRoot = process.cwd(),
  env = process.env,
  platform = process.platform,
  homeDir = os.homedir(),
  tmpDir = os.tmpdir(),
  projectLibraryDir = null,
  createRoot = true,
} = {}) {
  if (projectPath) {
    const resolvedProjectPath = path.resolve(projectPath);
    const unsafe = describeUnsafeProjectPath(resolvedProjectPath, { appRoot, tmpDir });
    if (unsafe.unsafe) {
      throw new Error(unsafe.reason);
    }
    return {
      projectPath: resolvedProjectPath,
      projectRoot: path.dirname(resolvedProjectPath),
      generated: false,
      safety: unsafe,
    };
  }

  const safeName = sanitizeProjectName(title || 'Untitled');
  const candidates = getRecommendedProjectRootCandidates({
    env,
    platform,
    homeDir,
    projectLibraryDir,
  });
  for (const candidateRoot of candidates) {
    const unsafeRoot = describeUnsafeProjectPath(candidateRoot, { appRoot, tmpDir, includeTmp: true });
    if (unsafeRoot.unsafe) {
      if (getEnvValue(env, 'GALGAME_MAKER_PROJECTS_DIR')) {
        throw new Error(`${unsafeRoot.reason}. Set GALGAME_MAKER_PROJECTS_DIR to a normal projects folder outside the source checkout, release output, node_modules, dist, and temporary directories.`);
      }
      continue;
    }

    try {
      if (createRoot) {
        await mkdir(candidateRoot, { recursive: true });
      }
      const resolvedProjectPath = await makeUniqueProjectPath(path.join(candidateRoot, safeName));
      return {
        projectPath: resolvedProjectPath,
        projectRoot: candidateRoot,
        generated: true,
        safety: { unsafe: false, reason: null, matchedRoot: null },
      };
    } catch {
      // Try the next recommended location.
    }
  }

  throw new Error('Could not create a default Galgame Maker projects directory. Pass --out or set GALGAME_MAKER_PROJECTS_DIR.');
}

export function createProjectMetadata({
  name,
  author = '',
  resolution = { width: 1280, height: 720 },
} = {}) {
  const now = new Date().toISOString();
  return {
    name: name || 'Untitled',
    author: author || '',
    version: '1.0.0',
    description: '',
    resolution,
    engineVersion: '0.1.0',
    createdAt: now,
    lastModified: now,
  };
}

export async function createGalgameProject({
  projectPath,
  name,
  author = '',
  resolution = { width: 1280, height: 720 },
  template = 'blank',
  script = null,
} = {}) {
  if (!projectPath) {
    throw new Error('createGalgameProject requires projectPath');
  }
  if (template !== 'blank') {
    throw new Error(`Unsupported project template for CLI scaffold: ${template}`);
  }

  const resolvedProjectPath = path.resolve(projectPath);
  if (await pathExists(resolvedProjectPath)) {
    throw new Error(`Project directory already exists: ${resolvedProjectPath}`);
  }

  await mkdir(resolvedProjectPath, { recursive: true });
  for (const category of ['backgrounds', 'characters', 'audio', 'ui', 'fonts']) {
    await mkdir(path.join(resolvedProjectPath, 'assets', category), { recursive: true });
  }

  const project = createProjectMetadata({
    name: name || path.basename(resolvedProjectPath),
    author,
    resolution,
  });
  const scriptData = ensureGalgameContract(script || createDefaultGalgameScript());

  await writeFile(
    path.join(resolvedProjectPath, 'project.json'),
    `${JSON.stringify(project, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    path.join(resolvedProjectPath, 'script.json'),
    `${JSON.stringify(scriptData, null, 2)}\n`,
    'utf8',
  );

  return {
    projectPath: resolvedProjectPath,
    project,
    script: scriptData,
    scriptPath: path.join(resolvedProjectPath, 'script.json'),
  };
}
