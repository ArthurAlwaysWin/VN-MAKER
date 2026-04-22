import { useAssetStore } from '../stores/assets.js';
import {
  classifyUiImageValue,
  normalizeUiImageSelection,
} from '../../shared/uiImageContract.js';

async function runCallback(callback, value) {
  if (typeof callback !== 'function') {
    return;
  }

  await callback(value);
}

export function getUiImageDisplayValue(value) {
  return classifyUiImageValue(value) === 'empty'
    ? ''
    : String(value).trim();
}

export async function pickUiImage(options) {
  const {
    assets = useAssetStore(),
    setValue,
    preview,
    commit,
  } = options ?? {};

  if (typeof setValue !== 'function') {
    throw new TypeError('pickUiImage requires a setValue callback');
  }

  const selection = await assets.selectAsset(['ui']);
  if (!selection) {
    return false;
  }

  const canonicalPath = normalizeUiImageSelection(selection);
  if (!canonicalPath) {
    throw new Error('Expected UI asset selection to return a canonical ui/... path');
  }

  setValue(canonicalPath);
  await runCallback(preview, canonicalPath);
  await runCallback(commit, canonicalPath);
  return true;
}

export function clearUiImage(options) {
  const {
    setValue,
    preview,
    commit,
  } = options ?? {};

  if (typeof setValue !== 'function') {
    throw new TypeError('clearUiImage requires a setValue callback');
  }

  setValue(null);
  void runCallback(preview, null);
  void runCallback(commit, null);
}
