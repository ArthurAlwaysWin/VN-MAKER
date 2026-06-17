import { describe, expect, it } from 'vitest';

import { normalizeJpegThumbnailBytes } from '../electron/thumbnailSecurity.js';

describe('thumbnailSecurity', () => {
  it('accepts bounded JPEG bytes', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0x00, 0x01, 0xff, 0xd9]);

    expect(normalizeJpegThumbnailBytes(jpeg)).toEqual(jpeg);
  });

  it('rejects non-JPEG thumbnail bytes', () => {
    expect(() => normalizeJpegThumbnailBytes(Buffer.from('not jpeg'))).toThrow(/JPEG/);
  });
});
