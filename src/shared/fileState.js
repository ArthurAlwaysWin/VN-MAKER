export function isSameFileState(left, right) {
  if (!left || !right) {
    return false;
  }

  if (typeof left.sha256 === 'string' && typeof right.sha256 === 'string') {
    return left.sha256 === right.sha256;
  }

  return left.mtimeMs === right.mtimeMs && left.size === right.size;
}
