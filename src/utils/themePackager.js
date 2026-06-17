/**
 * Theme Packager — ZIP export/import for .theme files.
 *
 * Uses fflate for sync ZIP creation/extraction. Handles base64 ↔ binary
 * conversion for nine-slice images and generates swatch preview thumbnails.
 *
 * @module utils/themePackager
 */
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import {
  LEGACY_THEME_FORMAT_VERSION,
  FULL_THEME_FORMAT_VERSION,
  classifyLegacyThemeCoverage,
  getThemePackageAssetRoot,
  validateThemePackageDefinition,
} from '../shared/themePackageContract.js';

const BLANK_PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5m8pUAAAAASUVORK5CYII=';
export const THEME_ZIP_MAX_COMPRESSED_BYTES = 50 * 1024 * 1024;
export const THEME_ZIP_MAX_UNCOMPRESSED_BYTES = 250 * 1024 * 1024;
export const THEME_ZIP_MAX_FILES = 2048;

function toUint8Array(value) {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  return new Uint8Array(value);
}

function decodeBase64(base64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64(bytes) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function sha256(bytes) {
  let hashA = 0x811c9dc5;
  let hashB = 0x01000193;
  for (const byte of toUint8Array(bytes)) {
    hashA ^= byte;
    hashA = Math.imul(hashA, 0x01000193) >>> 0;
    hashB = (Math.imul(hashB ^ byte, 0x45d9f3b) + 0x9e3779b9) >>> 0;
  }
  return `${hashA.toString(16).padStart(8, '0')}${hashB.toString(16).padStart(8, '0')}`.repeat(2);
}

function readZipText(unzipped, filename) {
  const content = unzipped[filename];
  if (!content) {
    return null;
  }

  return strFromU8(content);
}

function parseZipJson(unzipped, filename) {
  const raw = readZipText(unzipped, filename);
  if (raw == null) {
    return { exists: false, value: null };
  }

  return {
    exists: true,
    value: JSON.parse(raw),
  };
}

export function unzipThemeZipBounded(zipBuffer, {
  maxCompressedBytes = THEME_ZIP_MAX_COMPRESSED_BYTES,
  maxUncompressedBytes = THEME_ZIP_MAX_UNCOMPRESSED_BYTES,
  maxFiles = THEME_ZIP_MAX_FILES,
} = {}) {
  const bytes = toUint8Array(zipBuffer);
  if (bytes.byteLength > maxCompressedBytes) {
    throw new Error(`Theme package is too large (${bytes.byteLength} bytes, max ${maxCompressedBytes})`);
  }

  let fileCount = 0;
  let totalUncompressedBytes = 0;
  return unzipSync(bytes, {
    filter(file) {
      fileCount += 1;
      totalUncompressedBytes += file.originalSize;
      if (fileCount > maxFiles) {
        throw new Error(`Theme package contains too many files (max ${maxFiles})`);
      }
      if (totalUncompressedBytes > maxUncompressedBytes) {
        throw new Error(`Theme package expands to too many bytes (max ${maxUncompressedBytes})`);
      }
      return true;
    },
  });
}

function reconstructLegacyNineSlice(themeJson, unzipped) {
  if (!themeJson.nineSlice) {
    return undefined;
  }

  const nineSlice = JSON.parse(JSON.stringify(themeJson.nineSlice));
  for (const config of Object.values(nineSlice)) {
    if (!config || typeof config !== 'object') {
      continue;
    }

    if (config.src && typeof config.src === 'string' && !config.src.startsWith('data:')) {
      const bytes = unzipped[config.src];
      if (bytes) {
        config.src = uint8ArrayToBase64DataUrl(bytes);
      }
    }

    if (!config.states || typeof config.states !== 'object') {
      continue;
    }

    for (const state of ['hover', 'active']) {
      const stateConfig = config.states[state];
      if (!stateConfig?.src || typeof stateConfig.src !== 'string' || stateConfig.src.startsWith('data:')) {
        continue;
      }

      const bytes = unzipped[stateConfig.src];
      if (bytes) {
        stateConfig.src = uint8ArrayToBase64DataUrl(bytes);
      }
    }
  }

  return nineSlice;
}

// ─── Base64 / Binary Helpers ─────────────────────────────

/**
 * Convert a data-URL (e.g. "data:image/png;base64,...") to Uint8Array.
 * @param {string} dataUrl
 * @returns {Uint8Array}
 */
export function base64ToUint8Array(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  return decodeBase64(base64);
}

/**
 * Convert a Uint8Array to a base64 data-URL.
 * @param {Uint8Array} bytes
 * @param {string} mimeType
 * @returns {string}
 */
export function uint8ArrayToBase64DataUrl(bytes, mimeType = 'image/png') {
  return `data:${mimeType};base64,${encodeBase64(bytes)}`;
}

// ─── Swatch Preview Generator ────────────────────────────

/**
 * Generate a small canvas-based swatch preview of a token palette.
 * Returns a PNG data-URL suitable for embedding in theme.json.
 *
 * @param {Record<string, string>} tokens
 * @param {number} width
 * @param {number} height
 * @returns {string} data:image/png base64
 */
export function generateSwatchPreview(tokens, width = 320, height = 180) {
  if (typeof document === 'undefined') {
    return BLANK_PNG_DATA_URL;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return BLANK_PNG_DATA_URL;
  }

  // Background
  ctx.fillStyle = tokens['panel-bg'] || '#0a0a14';
  ctx.fillRect(0, 0, width, height);

  // Primary color bar at top
  ctx.fillStyle = tokens['primary'] || '#b4a0ff';
  ctx.fillRect(0, 0, width, 40);

  // Accent swatch
  ctx.fillStyle = tokens['accent'] || '#ff6b9d';
  ctx.fillRect(16, 56, 60, 40);

  // Button sample
  ctx.fillStyle = tokens['btn-bg'] || '#3c3c64';
  ctx.fillRect(92, 56, 100, 40);

  // Card background
  ctx.fillStyle = tokens['card-bg'] || '#1e1e32';
  ctx.fillRect(208, 56, 96, 40);

  // Border-hover line
  ctx.strokeStyle = tokens['border-hover'] || '#b4a0ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 108, width - 32, 1);

  // Text samples
  ctx.fillStyle = tokens['text'] || '#fff';
  ctx.font = '14px sans-serif';
  ctx.fillText('预览文字', 16, 130);

  // Secondary text
  ctx.fillStyle = tokens['text-secondary'] || '#bbb';
  ctx.fillText('次要文字', 16, 150);

  return canvas.toDataURL('image/png');
}

// ─── ZIP Build ───────────────────────────────────────────

/**
 * Build a .theme ZIP from theme data + optional metadata.
 *
 * @param {{ tokens: Record<string, string>, nineSlice?: Record<string, object> }} themeData
 * @param {{ name?: string, description?: string, author?: string, createdAt?: string }} metadata
 * @returns {Uint8Array} ZIP buffer
 */
export function buildThemeZip(themeData, metadata = {}) {
  const files = {};
  const nineSliceRefs = {};
  let hasNineSliceRefs = false;

  // Process nine-slice images → binary files in ZIP
  if (themeData.nineSlice) {
    for (const [key, config] of Object.entries(themeData.nineSlice)) {
      const ref = { ...config };

      // Main image
      if (ref.src && ref.src.startsWith('data:')) {
        files['images/' + key + '.png'] = base64ToUint8Array(ref.src);
        ref.src = 'images/' + key + '.png';
      }

      // Button states (hover / active)
      if (ref.states) {
        ref.states = { ...ref.states };
        for (const state of ['hover', 'active']) {
          if (ref.states[state]) {
            ref.states[state] = { ...ref.states[state] };
            if (ref.states[state].src && ref.states[state].src.startsWith('data:')) {
              const filename = 'images/' + key + '_' + state + '.png';
              files[filename] = base64ToUint8Array(ref.states[state].src);
              ref.states[state].src = filename;
            }
          }
        }
      }

      nineSliceRefs[key] = ref;
      hasNineSliceRefs = true;
    }
  }

  // Generate swatch preview
  const previewBase64 = generateSwatchPreview(themeData.tokens || {});
  files['images/preview.png'] = base64ToUint8Array(previewBase64);

  // Build theme.json
  const themeJson = {
    formatVersion: LEGACY_THEME_FORMAT_VERSION,
    name: metadata.name || '自定义主题',
    description: metadata.description || '',
    author: metadata.author || '',
    createdAt: metadata.createdAt || new Date().toISOString(),
    previewImage: 'images/preview.png',
    tokens: themeData.tokens || {},
    nineSlice: hasNineSliceRefs ? nineSliceRefs : undefined,
  };

  files['theme.json'] = strToU8(JSON.stringify(themeJson, null, 2));

  return zipSync(files);
}

export function buildFullThemeZip({
  themeId,
  theme,
  assets = [],
  metadata = {},
} = {}) {
  const normalizedTheme = JSON.parse(JSON.stringify(theme ?? {}));
  const normalizedAssets = assets.map(asset => ({
    path: asset.path,
    bytes: toUint8Array(asset.bytes),
  })).sort((a, b) => a.path.localeCompare(b.path));

  const validation = validateThemePackageDefinition({
    mode: 'full',
    themeId,
    theme: normalizedTheme,
    files: normalizedAssets.map(asset => ({
      path: asset.path,
      sha256: sha256(asset.bytes),
      bytes: asset.bytes.length,
    })),
  });

  if (validation.blockingErrors.length > 0) {
    throw new Error(validation.blockingErrors.join('; '));
  }

  const manifest = {
    formatVersion: FULL_THEME_FORMAT_VERSION,
    packageVersion: metadata.packageVersion || '1.0.0',
    id: validation.themeId,
    name: metadata.name || validation.themeId || 'theme-package',
    description: metadata.description || '',
    author: metadata.author || '',
    createdAt: metadata.createdAt || new Date().toISOString(),
    assetRoot: validation.assetRoot,
    files: normalizedAssets.map(asset => ({
      path: asset.path,
      sha256: sha256(asset.bytes),
      bytes: asset.bytes.length,
    })),
  };

  const archive = {
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'theme.json': strToU8(JSON.stringify(normalizedTheme, null, 2)),
  };

  for (const asset of normalizedAssets) {
    archive[`assets/${asset.path}`] = asset.bytes;
  }

  return zipSync(archive);
}

// ─── ZIP Parse ───────────────────────────────────────────

/**
 * Parse a .theme ZIP buffer and reconstruct theme data.
 *
 * @param {ArrayBuffer|Uint8Array} zipBuffer
 * @returns {{ success: true, theme: object, metadata: object } | { success: false, error: string }}
 */
export function parseThemeZip(zipBuffer) {
  try {
    const unzipped = unzipThemeZipBounded(zipBuffer);
    const manifestJson = parseZipJson(unzipped, 'manifest.json');
    const themeJson = parseZipJson(unzipped, 'theme.json');
    const formatVersion = manifestJson.value?.formatVersion ?? themeJson.value?.formatVersion ?? LEGACY_THEME_FORMAT_VERSION;

    if (manifestJson.exists || formatVersion >= FULL_THEME_FORMAT_VERSION) {
      const manifest = manifestJson.value ?? {};
      const theme = themeJson.value ?? {};
      const themeId = manifest.id || theme.id || '';
      const validation = validateThemePackageDefinition({
        mode: 'full',
        themeId,
        theme,
        files: manifest.files ?? [],
      });
      const blockingErrors = [...validation.blockingErrors];

      if (!manifestJson.exists) {
        blockingErrors.push('主题包缺少 manifest.json');
      }
      if (!themeJson.exists) {
        blockingErrors.push('主题包缺少 theme.json');
      }

      for (const file of manifest.files ?? []) {
        if (!unzipped[`assets/${file.path}`]) {
          blockingErrors.push(`主题包缺少资产文件：assets/${file.path}`);
        }
      }

      return {
        success: true,
        mode: 'full',
        formatVersion: FULL_THEME_FORMAT_VERSION,
        manifest,
        theme,
        themeId,
        assetRoot: manifest.assetRoot || validation.assetRoot || getThemePackageAssetRoot(themeId),
        coverage: validation.coverage,
        missingCoverage: validation.missingCoverage,
        files: (manifest.files ?? []).map(file => ({ ...file })),
        blockingErrors: [...new Set(blockingErrors)],
        warnings: validation.warnings,
      };
    }

    if (!themeJson.exists) {
      return { success: false, error: '主题文件缺少 theme.json' };
    }

    if (!themeJson.value?.tokens || typeof themeJson.value.tokens !== 'object') {
      return { success: false, error: '主题文件缺少 tokens 数据' };
    }

    const nineSlice = reconstructLegacyNineSlice(themeJson.value, unzipped);
    const compatibility = classifyLegacyThemeCoverage({
      tokens: themeJson.value.tokens || {},
      nineSlice,
    });

    return {
      success: true,
      mode: compatibility.mode,
      isFullTheme: compatibility.isFullTheme,
      theme: {
        tokens: themeJson.value.tokens || {},
        nineSlice,
      },
      metadata: {
        formatVersion: themeJson.value.formatVersion ?? LEGACY_THEME_FORMAT_VERSION,
        name: themeJson.value.name,
        description: themeJson.value.description,
        author: themeJson.value.author,
        createdAt: themeJson.value.createdAt,
      },
      coverage: compatibility.coverage,
      missingCoverage: compatibility.missingCoverage,
      blockingErrors: compatibility.blockingErrors,
      warnings: compatibility.warnings,
    };
  } catch (e) {
    console.error('[themePackager] Parse failed:', e);
    return { success: false, error: e.message };
  }
}
