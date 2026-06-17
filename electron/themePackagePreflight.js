import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { planThemeAssetReimport } from '../src/shared/themePackageContract.js';
import { parseThemeZip } from '../src/utils/themePackager.js';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function walkThemeNamespace(dir, baseDir, themeId, files) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkThemeNamespace(fullPath, baseDir, themeId, files);
      continue;
    }

    const bytes = await fs.readFile(fullPath);
    const relativePath = path.relative(baseDir, fullPath).split(path.sep).join('/');
    files.push({
      path: `ui/themes/${themeId}/${relativePath}`,
      sha256: sha256(bytes),
      bytes: bytes.length,
    });
  }
}

export async function readProjectThemeNamespace(projectPath, themeId) {
  const namespaceDir = path.join(projectPath, 'assets', 'ui', 'themes', themeId);
  try {
    const stat = await fs.stat(namespaceDir);
    if (!stat.isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  const files = [];
  await walkThemeNamespace(namespaceDir, namespaceDir, themeId, files);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

function countActions(actions) {
  return actions.reduce((counts, action) => {
    counts[action.type] = (counts[action.type] ?? 0) + 1;
    return counts;
  }, {
    copy: 0,
    skip: 0,
    overwrite: 0,
  });
}

export async function preflightThemePackage({
  filePath,
  projectPath,
} = {}) {
  try {
    const buffer = await fs.readFile(filePath);
    const parsed = parseThemeZip(buffer);

    if (!parsed.success) {
      return {
        success: true,
        status: 'blocked',
        filePath,
        fileName: path.basename(filePath),
        mode: 'unknown',
        themeId: '',
        assetRoot: '',
        coverage: [],
        missingCoverage: [],
        blockingErrors: [`主题包无法解析：${parsed.error}`],
        warnings: [],
        actions: [],
        counts: { copy: 0, skip: 0, overwrite: 0 },
        canAutoApply: false,
      };
    }

    const existingFiles = parsed.mode === 'full'
      ? await readProjectThemeNamespace(projectPath, parsed.themeId)
      : [];
    const reimportPlan = parsed.mode === 'full'
      ? planThemeAssetReimport({
        themeId: parsed.themeId,
        files: parsed.files,
        existingFiles,
      })
      : { actions: [], blockingErrors: [] };
    const blockingErrors = [...new Set([...(parsed.blockingErrors ?? []), ...(reimportPlan.blockingErrors ?? [])])];
    const status = blockingErrors.length > 0
      ? 'blocked'
      : parsed.mode === 'legacy-partial'
        ? 'legacy-partial'
        : 'ready';

    return {
      success: true,
      status,
      filePath,
      fileName: path.basename(filePath),
      mode: parsed.mode,
      themeId: parsed.themeId ?? '',
      assetRoot: parsed.assetRoot ?? '',
      coverage: parsed.coverage ?? [],
      missingCoverage: parsed.missingCoverage ?? [],
      blockingErrors,
      warnings: parsed.warnings ?? [],
      actions: reimportPlan.actions ?? [],
      counts: countActions(reimportPlan.actions ?? []),
      canAutoApply: false,
    };
  } catch (error) {
    console.error('[theme-package-preflight] Failed:', error);
    return {
      success: false,
      error: 'Operation failed',
    };
  }
}
