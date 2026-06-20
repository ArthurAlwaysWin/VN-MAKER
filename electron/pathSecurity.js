import fs from 'node:fs/promises';
import path from 'node:path';

import { isInsidePath } from '../src/shared/pathContainment.js';

export { isInsidePath } from '../src/shared/pathContainment.js';

async function realpathIfExists(targetPath) {
  try {
    return await fs.realpath(targetPath);
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
      return null;
    }
    throw error;
  }
}

async function nearestExistingRealpath(targetPath) {
  let current = path.resolve(targetPath);
  const missingParts = [];

  while (true) {
    const real = await realpathIfExists(current);
    if (real) {
      return {
        real,
        missingParts,
      };
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    missingParts.unshift(path.basename(current));
    current = parent;
  }
}

/**
 * Realpath-aware containment check.
 *
 * When allowMissing is true, the nearest existing parent is resolved and any
 * missing path segments are checked lexically beneath that resolved parent.
 *
 * @param {string} targetPath
 * @param {string} basePath
 * @param {{ allowMissing?: boolean }} [options]
 * @returns {Promise<boolean>}
 */
export async function isPathInsideRealBase(targetPath, basePath, { allowMissing = false } = {}) {
  if (!isInsidePath(targetPath, basePath)) {
    return false;
  }

  const baseReal = await realpathIfExists(basePath);
  if (!baseReal) {
    return false;
  }

  const targetReal = await realpathIfExists(targetPath);
  if (targetReal) {
    return isInsidePath(targetReal, baseReal);
  }

  if (!allowMissing) {
    return false;
  }

  const nearest = await nearestExistingRealpath(targetPath);
  if (!nearest || !isInsidePath(nearest.real, baseReal)) {
    return false;
  }

  return isInsidePath(path.join(nearest.real, ...nearest.missingParts), baseReal);
}

/**
 * Compare two existing paths after resolving symlinks/junctions.
 *
 * @param {string} leftPath
 * @param {string} rightPath
 * @returns {Promise<boolean>}
 */
export async function isSameRealPath(leftPath, rightPath) {
  const leftReal = await realpathIfExists(leftPath);
  const rightReal = await realpathIfExists(rightPath);
  return Boolean(leftReal && rightReal && leftReal === rightReal);
}
