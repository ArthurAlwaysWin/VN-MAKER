const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

export function normalizeJpegThumbnailBytes(thumbnail) {
  if (!thumbnail) return null;

  const bytes = Buffer.isBuffer(thumbnail)
    ? thumbnail
    : thumbnail instanceof Uint8Array
      ? Buffer.from(thumbnail)
      : null;
  if (!bytes) {
    throw new Error('Invalid thumbnail image');
  }

  if (bytes.length > MAX_THUMBNAIL_BYTES) {
    throw new Error('Thumbnail image is too large');
  }

  const hasJpegMarkers = bytes.length >= 4
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[bytes.length - 2] === 0xff
    && bytes[bytes.length - 1] === 0xd9;
  if (!hasJpegMarkers) {
    throw new Error('Thumbnail image must be JPEG data');
  }

  return bytes;
}
