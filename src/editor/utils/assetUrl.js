export function toAssetUrl(assetPath) {
  const normalized = String(assetPath || '').replace(/\\/g, '/');
  return `asset://${normalized.split('/').map(encodeURIComponent).join('/')}`;
}

export function assetFilename(assetPath) {
  return String(assetPath || '').replace(/\\/g, '/').split('/').pop();
}
