import path from 'node:path';

/**
 * Check whether a resolved target is lexically contained by a base path.
 *
 * This does not resolve symlinks or junctions. Security-sensitive callers
 * that operate on existing filesystem entries must add a realpath-aware check.
 *
 * @param {string} targetPath
 * @param {string} basePath
 * @returns {boolean}
 */
export function isInsidePath(targetPath, basePath) {
  if (!targetPath || !basePath) return false;
  const targetResolved = path.resolve(targetPath);
  const baseResolved = path.resolve(basePath);
  const relative = path.relative(baseResolved, targetResolved);
  return relative === '' || (
    Boolean(relative)
    && !relative.startsWith('..')
    && !path.isAbsolute(relative)
  );
}
