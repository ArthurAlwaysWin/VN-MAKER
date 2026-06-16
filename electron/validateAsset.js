/**
 * Asset format validation — magic bytes + extension whitelist.
 * Validates asset files by checking both file extension and binary signature (magic bytes).
 * Supports asset formats across editor asset categories.
 * @module validateAsset
 */

// ─── Magic Byte Signatures ────────────────────────────────────────────

const SIGNATURES = {
  png: { bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0 },
  jpeg: { bytes: [0xFF, 0xD8, 0xFF], offset: 0 },
  webp: {
    bytes: [0x52, 0x49, 0x46, 0x46], offset: 0,
    sub: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  },
  mp3_id3: { bytes: [0x49, 0x44, 0x33], offset: 0 },
  mp3_sync: {
    bytes: [0xFF], offset: 0,
    // MPEG audio frame sync: 0xFF followed by byte with upper 3 bits set (0xE0+)
    checkSecondByte: true,
  },
  mp4_audio: {
    bytes: [0x66, 0x74, 0x79, 0x70], offset: 4,
  },
  webm: {
    bytes: [0x1A, 0x45, 0xDF, 0xA3], offset: 0,
  },
  ogg: { bytes: [0x4F, 0x67, 0x67, 0x53], offset: 0 },
  wav: {
    bytes: [0x52, 0x49, 0x46, 0x46], offset: 0,
    sub: { bytes: [0x57, 0x41, 0x56, 0x45], offset: 8 },
  },
  ttf: { bytes: [0x00, 0x01, 0x00, 0x00], offset: 0 },
  otf: { bytes: [0x4F, 0x54, 0x54, 0x4F], offset: 0 },
  woff: { bytes: [0x77, 0x4F, 0x46, 0x46], offset: 0 },
  woff2: { bytes: [0x77, 0x4F, 0x46, 0x32], offset: 0 },
};

// ─── Category → Allowed Formats ───────────────────────────────────────

const CATEGORY_FORMATS = {
  backgrounds: {
    extensions: ['.png', '.jpg', '.jpeg', '.webp'],
    signatures: ['png', 'jpeg', 'webp'],
  },
  characters: {
    extensions: ['.png', '.jpg', '.jpeg', '.webp'],
    signatures: ['png', 'jpeg', 'webp'],
  },
  audio: {
    extensions: ['.mp3', '.ogg', '.wav', '.m4a', '.mp4', '.aac'],
    signatures: ['mp3_id3', 'mp3_sync', 'mp4_audio', 'ogg', 'wav'],
  },
  fonts: {
    extensions: ['.ttf', '.otf', '.woff', '.woff2'],
    signatures: ['ttf', 'otf', 'woff', 'woff2'],
  },
  ui: {
    extensions: ['.png', '.jpg', '.jpeg', '.webp'],
    signatures: ['png', 'jpeg', 'webp'],
  },
  videos: {
    extensions: ['.mp4', '.webm', '.png', '.jpg', '.jpeg', '.webp'],
    signatures: ['mp4_audio', 'webm', 'png', 'jpeg', 'webp'],
  },
};

// ─── Private Helpers ──────────────────────────────────────────────────

/**
 * Check whether a buffer matches a single signature definition.
 * @param {Buffer} buffer - File header bytes (at least 12 bytes)
 * @param {object} sig - Signature definition from SIGNATURES
 * @returns {boolean}
 * @private
 */
function matchesSignature(buffer, sig) {
  // Check main bytes at sig.offset
  for (let i = 0; i < sig.bytes.length; i++) {
    if (buffer[sig.offset + i] !== sig.bytes[i]) {
      // Main bytes don't match — try alt arrays if present (e.g. MP3 sync variants)
      if (sig.alt) {
        return sig.alt.some(altBytes => {
          for (let j = 0; j < altBytes.length; j++) {
            if (buffer[j] !== altBytes[j]) return false;
          }
          return true;
        });
      }
      return false;
    }
  }

  // MP3 frame sync: second byte must have upper 3 bits set (0xE0+)
  if (sig.checkSecondByte) {
    if ((buffer[1] & 0xE0) !== 0xE0) return false;
  }

  // If RIFF sub-check is required (WebP vs WAV), verify sub bytes
  if (sig.sub) {
    for (let i = 0; i < sig.sub.bytes.length; i++) {
      if (buffer[sig.sub.offset + i] !== sig.sub.bytes[i]) return false;
    }
  }

  return true;
}

// ─── Exported Functions ───────────────────────────────────────────────

/**
 * Validate a file's format by checking extension whitelist and magic bytes.
 * @param {Buffer} buffer - First 12+ bytes of the file
 * @param {string} extension - File extension including dot (e.g. '.png')
 * @param {string} category - Asset category ('backgrounds' | 'characters' | 'audio' | 'fonts' | 'ui' | 'videos')
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateAssetFormat(buffer, extension, category) {
  const rules = CATEGORY_FORMATS[category];
  if (!rules) {
    return { valid: false, reason: `Unknown category: ${category}` };
  }

  const ext = extension.toLowerCase();
  if (!rules.extensions.includes(ext)) {
    return { valid: false, reason: `不支持的文件格式 ${ext}` };
  }

  const matched = rules.signatures.some(sigName => {
    const sig = SIGNATURES[sigName];
    return sig && matchesSignature(buffer, sig);
  });

  if (!matched) {
    return { valid: false, reason: `文件内容与 ${ext} 格式不匹配` };
  }

  return { valid: true };
}

/**
 * Check whether an image file has an alpha (transparency) channel.
 * Requires at least 26 bytes for PNG, 21 bytes for WebP.
 * @param {Buffer} buffer - File header bytes (at least 26 bytes recommended)
 * @param {string} extension - File extension including dot
 * @returns {{ hasAlpha: boolean }}
 */
export function checkImageAlpha(buffer, extension) {
  const ext = extension.toLowerCase();

  if (ext === '.jpg' || ext === '.jpeg') {
    return { hasAlpha: false };
  }

  if (ext === '.png' && buffer.length >= 26) {
    // PNG IHDR color type at offset 25: 4=grayscale+alpha, 6=RGBA
    const colorType = buffer[25];
    return { hasAlpha: colorType === 4 || colorType === 6 };
  }

  if (ext === '.webp' && buffer.length >= 21) {
    const chunk = String.fromCharCode(buffer[12], buffer[13], buffer[14], buffer[15]);
    if (chunk === 'VP8X') return { hasAlpha: (buffer[20] & 0x10) !== 0 };
    if (chunk === 'VP8L') return { hasAlpha: true }; // lossless WebP typically has alpha
    if (chunk === 'VP8 ') return { hasAlpha: false };
  }

  return { hasAlpha: true }; // unknown → assume OK, don't warn
}

/**
 * Get the list of supported file extensions for a category.
 * @param {string} category - Asset category
 * @returns {string[]} Array of extensions including dots (e.g. ['.png', '.jpg'])
 */
export function getSupportedFormats(category) {
  return CATEGORY_FORMATS[category]?.extensions || [];
}
