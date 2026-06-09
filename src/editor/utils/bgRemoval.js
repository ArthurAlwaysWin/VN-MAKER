const MAX_RGB_DISTANCE = Math.sqrt(255 * 255 * 3);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbToYcbcr([r, g, b]) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return [
    y,
    (b - y) * 0.565,
    (r - y) * 0.713,
  ];
}

export function rgbToHex([r, g, b]) {
  return `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function backgroundColorDistance(a, b) {
  const [ay, acb, acr] = rgbToYcbcr(a);
  const [by, bcb, bcr] = rgbToYcbcr(b);
  const dy = (ay - by) * 0.7;
  const dcb = (acb - bcb) * 1.15;
  const dcr = (acr - bcr) * 1.15;
  return Math.sqrt(dy * dy + dcb * dcb + dcr * dcr);
}

export function thresholdFromTolerance(tolerance) {
  return 5 + clamp(Number(tolerance) || 0, 0, 100) * 0.8;
}

export function featherDistanceFromPixels(feather) {
  return clamp(Number(feather) || 0, 0, 5) * 10;
}

function pixelIndex(width, x, y) {
  return (y * width + x) * 4;
}

function readRgb(imageData, x, y) {
  const index = pixelIndex(imageData.width, x, y);
  return [
    imageData.data[index],
    imageData.data[index + 1],
    imageData.data[index + 2],
  ];
}

function makeImageData(data, width, height) {
  if (typeof ImageData !== 'undefined') {
    return new ImageData(data, width, height);
  }
  return { data, width, height };
}

function normalizeTargetColors(targetRgb) {
  if (!Array.isArray(targetRgb)) {
    return [];
  }

  const targets = Array.isArray(targetRgb[0]) ? targetRgb : [targetRgb];
  return targets
    .filter((rgb) => Array.isArray(rgb) && rgb.length >= 3)
    .map((rgb) => [
      clamp(Number(rgb[0]) || 0, 0, 255),
      clamp(Number(rgb[1]) || 0, 0, 255),
      clamp(Number(rgb[2]) || 0, 0, 255),
    ]);
}

function closestTargetDistance(rgb, targetColors) {
  let best = Number.POSITIVE_INFINITY;
  for (const target of targetColors) {
    best = Math.min(best, backgroundColorDistance(rgb, target));
  }
  return best;
}

function createCandidateMask(src, width, height, targetColors, maxDistance) {
  const mask = new Uint8Array(width * height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const index = pixel * 4;
    const rgb = [src[index], src[index + 1], src[index + 2]];
    if (closestTargetDistance(rgb, targetColors) <= maxDistance) {
      mask[pixel] = 1;
    }
  }
  return mask;
}

function createEdgeConnectedMask(candidate, width, height) {
  const connected = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let read = 0;
  let write = 0;

  function enqueue(pixel) {
    if (!candidate[pixel] || connected[pixel]) {
      return;
    }
    connected[pixel] = 1;
    queue[write] = pixel;
    write += 1;
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (read < write) {
    const pixel = queue[read];
    read += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(pixel - 1);
    if (x < width - 1) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - width);
    if (y < height - 1) enqueue(pixel + width);
  }

  return connected;
}

function createEdgeAndEnclosedMask(candidate, width, height, options = {}) {
  const editable = createEdgeConnectedMask(candidate, width, height);
  const visited = new Uint8Array(editable);
  const queue = new Int32Array(width * height);
  const component = new Int32Array(width * height);
  const maxEnclosedPixels = Math.max(
    1,
    Math.floor(width * height * clamp(Number(options.maxEnclosedRegionRatio ?? 0.08), 0, 1)),
  );

  function enqueue(next, writeState) {
    if (next < 0 || !candidate[next] || visited[next]) {
      return writeState;
    }
    visited[next] = 1;
    queue[writeState] = next;
    return writeState + 1;
  }

  for (let start = 0; start < candidate.length; start += 1) {
    if (!candidate[start] || visited[start]) {
      continue;
    }

    let read = 0;
    let write = 0;
    let componentSize = 0;
    visited[start] = 1;
    queue[write] = start;
    write += 1;

    while (read < write) {
      const pixel = queue[read];
      read += 1;
      component[componentSize] = pixel;
      componentSize += 1;

      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x > 0) write = enqueue(pixel - 1, write);
      if (x < width - 1) write = enqueue(pixel + 1, write);
      if (y > 0) write = enqueue(pixel - width, write);
      if (y < height - 1) write = enqueue(pixel + width, write);
    }

    if (componentSize <= maxEnclosedPixels) {
      for (let index = 0; index < componentSize; index += 1) {
        editable[component[index]] = 1;
      }
    }
  }

  return editable;
}

export function sampleBackgroundColor(imageData, x, y, options = {}) {
  if (!imageData?.data || !imageData.width || !imageData.height) {
    return null;
  }

  const centerX = clamp(Math.round(x), 0, imageData.width - 1);
  const centerY = clamp(Math.round(y), 0, imageData.height - 1);
  const radius = clamp(Number(options.radius ?? 2) || 0, 0, 8);
  const centerRgb = readRgb(imageData, centerX, centerY);
  const localThreshold = options.localThreshold ?? 28;
  const samples = [];

  for (let yy = centerY - radius; yy <= centerY + radius; yy += 1) {
    if (yy < 0 || yy >= imageData.height) continue;
    for (let xx = centerX - radius; xx <= centerX + radius; xx += 1) {
      if (xx < 0 || xx >= imageData.width) continue;
      const rgb = readRgb(imageData, xx, yy);
      const rawDistance = Math.sqrt(
        (rgb[0] - centerRgb[0]) ** 2
        + (rgb[1] - centerRgb[1]) ** 2
        + (rgb[2] - centerRgb[2]) ** 2,
      );
      if (rawDistance <= localThreshold) {
        samples.push(rgb);
      }
    }
  }

  const source = samples.length ? samples : [centerRgb];
  const rgb = [0, 1, 2].map((channel) => Math.round(
    source.reduce((sum, sample) => sum + sample[channel], 0) / source.length,
  ));

  return {
    rgb,
    hex: rgbToHex(rgb),
    sampleCount: source.length,
  };
}

export function removeSolidBackground(imageData, targetRgb, options = {}) {
  const targetColors = normalizeTargetColors(targetRgb);
  if (!imageData?.data || targetColors.length === 0) {
    return null;
  }

  const width = imageData.width;
  const height = imageData.height;
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src);
  const threshold = thresholdFromTolerance(options.tolerance ?? 22);
  const featherDistance = featherDistanceFromPixels(options.feather ?? 1);
  const edgeConnectedOnly = options.edgeConnectedOnly !== false;
  const candidateMask = edgeConnectedOnly
    ? createCandidateMask(src, width, height, targetColors, threshold + featherDistance)
    : null;
  const editableMask = edgeConnectedOnly
    ? (
      options.removeEnclosedRegions === true
        ? createEdgeAndEnclosedMask(candidateMask, width, height, {
          maxEnclosedRegionRatio: options.maxEnclosedRegionRatio,
        })
        : createEdgeConnectedMask(candidateMask, width, height)
    )
    : null;

  for (let i = 0; i < dst.length; i += 4) {
    const pixel = i / 4;
    if (editableMask && !editableMask[pixel]) {
      continue;
    }

    const rgb = [dst[i], dst[i + 1], dst[i + 2]];
    const distance = closestTargetDistance(rgb, targetColors);

    if (distance <= threshold) {
      dst[i + 3] = 0;
    } else if (featherDistance > 0 && distance <= threshold + featherDistance) {
      const ratio = (distance - threshold) / featherDistance;
      const smooth = ratio * ratio * (3 - 2 * ratio);
      dst[i + 3] = Math.round(smooth * dst[i + 3]);
    }
  }

  return makeImageData(dst, width, height);
}

export { MAX_RGB_DISTANCE };
