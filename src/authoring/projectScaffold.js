import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createDefaultGalgameScript, ensureGalgameContract } from '../shared/galgameContract.js';

export function sanitizeProjectName(name) {
  return String(name ?? '')
    .replace(/[<>:"|?*\\/]/g, '_')
    .replace(/\.{2,}/g, '_')
    .trim() || 'untitled';
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
