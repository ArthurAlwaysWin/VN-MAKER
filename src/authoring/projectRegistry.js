import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export const PROJECT_REGISTRY_FILENAME = 'recent-projects.json';
export const PROJECT_OPEN_REQUEST_FILENAME = 'pending-open-project.json';

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeSlashes(value) {
  return String(value ?? '').replace(/\\/g, '/');
}

function normalizeSearchText(value) {
  return normalizeSlashes(value).trim().toLowerCase();
}

function getEnvValue(env, name) {
  const value = env?.[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getProjectRegistryUserDataCandidates({
  env = process.env,
  platform = process.platform,
  homeDir = os.homedir(),
} = {}) {
  const explicit = getEnvValue(env, 'GALGAME_MAKER_USER_DATA')
    || getEnvValue(env, 'GALGAME_MAKER_PROJECT_REGISTRY_DIR');
  const candidates = explicit ? [explicit] : [];

  if (platform === 'win32') {
    const appData = getEnvValue(env, 'APPDATA');
    if (appData) {
      candidates.push(
        path.join(appData, 'Galgame Maker'),
        path.join(appData, 'galgame-maker'),
        path.join(appData, 'galgame-maker-editor'),
      );
    }
  } else if (platform === 'darwin') {
    candidates.push(
      path.join(homeDir, 'Library', 'Application Support', 'Galgame Maker'),
      path.join(homeDir, 'Library', 'Application Support', 'galgame-maker'),
      path.join(homeDir, 'Library', 'Application Support', 'galgame-maker-editor'),
    );
  } else {
    const configHome = getEnvValue(env, 'XDG_CONFIG_HOME') || path.join(homeDir, '.config');
    candidates.push(
      path.join(configHome, 'Galgame Maker'),
      path.join(configHome, 'galgame-maker'),
      path.join(configHome, 'galgame-maker-editor'),
    );
  }

  return uniqueValues(candidates.map((candidate) => path.resolve(candidate)));
}

export function getProjectRegistryPath(userDataDir) {
  return path.join(path.resolve(userDataDir), PROJECT_REGISTRY_FILENAME);
}

export function getProjectOpenRequestPath(userDataDir) {
  return path.join(path.resolve(userDataDir), PROJECT_OPEN_REQUEST_FILENAME);
}

export function createEmptyProjectRegistry() {
  return { hasCreatedProject: false, projects: [] };
}

export async function readProjectRegistry(registryPath) {
  try {
    const raw = await readFile(registryPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      hasCreatedProject: Boolean(parsed?.hasCreatedProject),
      projects: Array.isArray(parsed?.projects) ? parsed.projects : [],
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return createEmptyProjectRegistry();
    }
    throw error;
  }
}

export async function writeProjectRegistry(registryPath, registry) {
  await mkdir(path.dirname(registryPath), { recursive: true });
  await writeFile(registryPath, `${JSON.stringify({
    hasCreatedProject: Boolean(registry?.hasCreatedProject),
    projects: Array.isArray(registry?.projects) ? registry.projects : [],
  }, null, 2)}\n`, 'utf8');
}

async function fileExists(filePath) {
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

async function readProjectName(projectPath, fallback = null) {
  try {
    const projectJson = JSON.parse(await readFile(path.join(projectPath, 'project.json'), 'utf8'));
    if (typeof projectJson?.name === 'string' && projectJson.name.trim()) {
      return projectJson.name.trim();
    }
  } catch {
    // Project metadata is optional for legacy projects.
  }

  return fallback || path.basename(projectPath);
}

export async function describeProjectPath(projectPath, name = null) {
  const resolvedPath = path.resolve(projectPath);
  const projectJsonPath = path.join(resolvedPath, 'project.json');
  const scriptPath = path.join(resolvedPath, 'script.json');
  const hasProject = await fileExists(projectJsonPath);
  const hasScript = await fileExists(scriptPath);

  return {
    name: name || await readProjectName(resolvedPath),
    path: resolvedPath,
    scriptPath,
    projectJsonPath,
    exists: await fileExists(resolvedPath),
    hasProject,
    hasScript,
    valid: hasProject || hasScript,
  };
}

export async function listRegisteredProjects(registryPath) {
  const registry = await readProjectRegistry(registryPath);
  const projects = [];

  for (const entry of registry.projects) {
    if (!entry?.path) {
      continue;
    }

    projects.push({
      ...(await describeProjectPath(entry.path, entry.name)),
      openedAt: entry.openedAt || null,
    });
  }

  return {
    registryPath: path.resolve(registryPath),
    hasCreatedProject: registry.hasCreatedProject,
    projects,
  };
}

export async function registerProject(registryPath, projectPath, name = null) {
  const described = await describeProjectPath(projectPath, name);
  const registry = await readProjectRegistry(registryPath);
  const openedAt = new Date().toISOString();
  const resolvedPath = path.resolve(projectPath);

  registry.projects = registry.projects
    .filter((entry) => path.resolve(entry.path) !== resolvedPath);
  registry.projects.unshift({
    path: resolvedPath,
    name: described.name,
    openedAt,
  });
  registry.projects = registry.projects.slice(0, 20);
  registry.hasCreatedProject = true;
  await writeProjectRegistry(registryPath, registry);

  return {
    ...described,
    openedAt,
  };
}

function scoreProjectMatch(project, query) {
  const needle = normalizeSearchText(query);
  if (!needle) {
    return 0;
  }

  const name = normalizeSearchText(project.name);
  const projectPath = normalizeSearchText(project.path);
  const basename = normalizeSearchText(path.basename(project.path));

  if (name === needle || basename === needle || projectPath === needle) {
    return 100;
  }
  if (name.startsWith(needle) || basename.startsWith(needle)) {
    return 80;
  }
  if (name.includes(needle) || basename.includes(needle)) {
    return 60;
  }
  if (projectPath.includes(needle)) {
    return 40;
  }

  return 0;
}

export async function resolveRegisteredProject(registryPath, query) {
  const registry = await listRegisteredProjects(registryPath);
  const matches = registry.projects
    .map((project) => ({ ...project, score: scoreProjectMatch(project, query) }))
    .filter((project) => project.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return String(right.openedAt || '').localeCompare(String(left.openedAt || ''));
    });

  const bestScore = matches[0]?.score ?? 0;
  const bestMatches = matches.filter((project) => project.score === bestScore);
  const project = bestMatches.length === 1 ? cloneJsonValue(bestMatches[0]) : null;

  return {
    ok: Boolean(project),
    query,
    registryPath: registry.registryPath,
    project,
    matches,
    ambiguous: bestMatches.length > 1,
  };
}

export async function writeProjectOpenRequest(userDataDir, projectPath) {
  const project = await describeProjectPath(projectPath);
  if (!project.valid) {
    throw new Error(`Not a valid Galgame Maker project: ${project.path}`);
  }

  const requestPath = getProjectOpenRequestPath(userDataDir);
  const request = {
    requestId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    projectPath: project.path,
  };

  await mkdir(path.dirname(requestPath), { recursive: true });
  await writeFile(requestPath, `${JSON.stringify(request, null, 2)}\n`, 'utf8');
  return { requestPath, request, project };
}

export async function readProjectOpenRequest(userDataDir) {
  const requestPath = getProjectOpenRequestPath(userDataDir);
  try {
    const request = JSON.parse(await readFile(requestPath, 'utf8'));
    return {
      requestPath,
      request,
      projectPath: typeof request?.projectPath === 'string'
        ? path.resolve(request.projectPath)
        : null,
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function clearProjectOpenRequest(userDataDir) {
  await rm(getProjectOpenRequestPath(userDataDir), { force: true });
}
