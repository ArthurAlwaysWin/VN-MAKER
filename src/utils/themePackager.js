/**
 * Theme Packager — ZIP export/import for .theme files.
 *
 * Uses fflate for sync ZIP creation/extraction. Handles base64 ↔ binary
 * conversion for nine-slice images and generates swatch preview thumbnails.
 *
 * @module utils/themePackager
 */
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

// ─── Base64 / Binary Helpers ─────────────────────────────

/**
 * Convert a data-URL (e.g. "data:image/png;base64,...") to Uint8Array.
 * @param {string} dataUrl
 * @returns {Uint8Array}
 */
export function base64ToUint8Array(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert a Uint8Array to a base64 data-URL.
 * @param {Uint8Array} bytes
 * @param {string} mimeType
 * @returns {string}
 */
export function uint8ArrayToBase64DataUrl(bytes, mimeType = 'image/png') {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
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
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

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
    formatVersion: 1,
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

// ─── ZIP Parse ───────────────────────────────────────────

/**
 * Parse a .theme ZIP buffer and reconstruct theme data.
 *
 * @param {ArrayBuffer|Uint8Array} zipBuffer
 * @returns {{ success: true, theme: object, metadata: object } | { success: false, error: string }}
 */
export function parseThemeZip(zipBuffer) {
  try {
    const unzipped = unzipSync(new Uint8Array(zipBuffer));

    // Parse theme.json
    const themeJson = JSON.parse(strFromU8(unzipped['theme.json']));

    // Forward-compatibility check
    if (typeof themeJson.formatVersion === 'number' && themeJson.formatVersion > 1) {
      console.warn('[themePackager] formatVersion', themeJson.formatVersion, '> 1, attempting import');
    }

    // Validate minimum structure
    if (!themeJson.tokens || typeof themeJson.tokens !== 'object') {
      return { success: false, error: '主题文件缺少 tokens 数据' };
    }

    // Reconstruct nine-slice images from binary → base64
    if (themeJson.nineSlice) {
      for (const [key, config] of Object.entries(themeJson.nineSlice)) {
        // Main image
        if (config.src && typeof config.src === 'string' && !config.src.startsWith('data:')) {
          const bytes = unzipped[config.src];
          if (bytes) {
            config.src = uint8ArrayToBase64DataUrl(bytes);
          }
        }

        // Button states
        if (config.states) {
          for (const state of ['hover', 'active']) {
            if (config.states[state]?.src && typeof config.states[state].src === 'string' && !config.states[state].src.startsWith('data:')) {
              const bytes = unzipped[config.states[state].src];
              if (bytes) {
                config.states[state].src = uint8ArrayToBase64DataUrl(bytes);
              }
            }
          }
        }
      }
    }

    return {
      success: true,
      theme: {
        tokens: themeJson.tokens || {},
        nineSlice: themeJson.nineSlice || undefined,
      },
      metadata: {
        formatVersion: themeJson.formatVersion,
        name: themeJson.name,
        description: themeJson.description,
        author: themeJson.author,
        createdAt: themeJson.createdAt,
      },
    };
  } catch (e) {
    console.error('[themePackager] Parse failed:', e);
    return { success: false, error: e.message };
  }
}
