import { describe, expect, it } from 'vitest';

import {
  backgroundColorDistance,
  removeSolidBackground,
  sampleBackgroundColor,
  thresholdFromTolerance,
} from '../src/editor/utils/bgRemoval.js';

function makeImageData(width, height, pixelAt) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const [r, g, b, a = 255] = pixelAt(x, y);
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = a;
    }
  }
  return { data, width, height };
}

function alphaAt(imageData, x, y) {
  return imageData.data[(y * imageData.width + x) * 4 + 3];
}

describe('background removal helpers', () => {
  it('samples a local background color instead of trusting one noisy clicked pixel', () => {
    const imageData = makeImageData(5, 5, (x, y) => {
      if (x === 2 && y === 2) return [246, 249, 252, 255];
      return [238, 241, 244, 255];
    });

    const sample = sampleBackgroundColor(imageData, 2, 2, { radius: 2, localThreshold: 28 });

    expect(sample).toMatchObject({
      rgb: [238, 241, 244],
      hex: '#eef1f4',
    });
    expect(sample.sampleCount).toBeGreaterThan(1);
  });

  it('uses a tighter perceptual tolerance so nearby subject colors are not removed by default', () => {
    const background = [236, 240, 244];
    const nearSubject = [198, 205, 212];
    const imageData = makeImageData(3, 1, (x) => {
      if (x === 0) return [...background, 255];
      if (x === 1) return [232, 236, 240, 255];
      return [...nearSubject, 255];
    });

    const output = removeSolidBackground(imageData, background, { tolerance: 22, feather: 0 });

    expect(alphaAt(output, 0, 0)).toBe(0);
    expect(alphaAt(output, 1, 0)).toBe(0);
    expect(alphaAt(output, 2, 0)).toBe(255);
    expect(backgroundColorDistance(nearSubject, background)).toBeGreaterThan(thresholdFromTolerance(22));
  });

  it('softens only the narrow band just outside the removal threshold', () => {
    const background = [20, 180, 90];
    const imageData = makeImageData(2, 1, (x) => (
      x === 0 ? [20, 180, 90, 255] : [45, 165, 100, 255]
    ));

    const output = removeSolidBackground(imageData, background, { tolerance: 10, feather: 2 });

    expect(alphaAt(output, 0, 0)).toBe(0);
    expect(alphaAt(output, 1, 0)).toBeGreaterThan(0);
    expect(alphaAt(output, 1, 0)).toBeLessThan(255);
  });

  it('uses multiple sampled colors to remove uneven solid backgrounds', () => {
    const leftBackground = [240, 242, 246];
    const rightBackground = [220, 225, 232];
    const imageData = makeImageData(5, 1, (x) => {
      if (x <= 1) return [...leftBackground, 255];
      if (x >= 3) return [...rightBackground, 255];
      return [80, 70, 90, 255];
    });

    const output = removeSolidBackground(imageData, [leftBackground, rightBackground], {
      tolerance: 18,
      feather: 0,
    });

    expect(alphaAt(output, 0, 0)).toBe(0);
    expect(alphaAt(output, 1, 0)).toBe(0);
    expect(alphaAt(output, 2, 0)).toBe(255);
    expect(alphaAt(output, 3, 0)).toBe(0);
    expect(alphaAt(output, 4, 0)).toBe(0);
  });

  it('keeps matching colors inside the subject when they are not connected to the image edge', () => {
    const background = [245, 245, 245];
    const subject = [80, 72, 95];
    const imageData = makeImageData(5, 5, (x, y) => {
      if (x === 0 || y === 0 || x === 4 || y === 4) return [...background, 255];
      if (x === 2 && y === 2) return [...background, 255];
      return [...subject, 255];
    });

    const output = removeSolidBackground(imageData, background, {
      tolerance: 22,
      feather: 0,
    });

    expect(alphaAt(output, 0, 0)).toBe(0);
    expect(alphaAt(output, 4, 2)).toBe(0);
    expect(alphaAt(output, 2, 2)).toBe(255);
    expect(alphaAt(output, 1, 1)).toBe(255);
  });

  it('can still remove matching internal regions when edge-connected mode is disabled', () => {
    const background = [245, 245, 245];
    const subject = [80, 72, 95];
    const imageData = makeImageData(5, 5, (x, y) => {
      if (x === 0 || y === 0 || x === 4 || y === 4) return [...background, 255];
      if (x === 2 && y === 2) return [...background, 255];
      return [...subject, 255];
    });

    const output = removeSolidBackground(imageData, background, {
      tolerance: 22,
      feather: 0,
      edgeConnectedOnly: false,
    });

    expect(alphaAt(output, 2, 2)).toBe(0);
  });
});
