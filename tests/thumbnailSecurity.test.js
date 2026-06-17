import { describe, expect, it } from 'vitest';

import { normalizeJpegThumbnailBytes } from '../electron/thumbnailSecurity.js';

describe('thumbnailSecurity', () => {
  it('accepts bounded JPEG bytes', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0x00, 0x01, 0xff, 0xd9]);

    expect(normalizeJpegThumbnailBytes(jpeg)).toEqual(jpeg);
  });

  it('accepts Uint8Array JPEG bytes and returns a Buffer', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0x00, 0x01, 0xff, 0xd9]);

    const normalized = normalizeJpegThumbnailBytes(jpeg);

    expect(Buffer.isBuffer(normalized)).toBe(true);
    expect(normalized).toEqual(Buffer.from(jpeg));
  });

  it('rejects JPEG thumbnails larger than the configured maximum', () => {
    const jpeg = Buffer.alloc(2 * 1024 * 1024 + 1);
    jpeg[0] = 0xff;
    jpeg[1] = 0xd8;
    jpeg[jpeg.length - 2] = 0xff;
    jpeg[jpeg.length - 1] = 0xd9;

    expect(() => normalizeJpegThumbnailBytes(jpeg)).toThrow(/too large/);
  });

  it('rejects non-JPEG thumbnail bytes', () => {
    expect(() => normalizeJpegThumbnailBytes(Buffer.from('not jpeg'))).toThrow(/JPEG/);
  });
});
