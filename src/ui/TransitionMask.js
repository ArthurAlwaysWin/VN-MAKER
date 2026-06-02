const DEFAULT_MASK_WIDTH = 1280;
const DEFAULT_MASK_HEIGHT = 720;
const MASK_FRAME_MS = 1000 / 24;
const MAX_DPR = 2;

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getLayerSize(layer) {
  const rect = layer?.parentElement?.getBoundingClientRect?.();
  const width = Math.max(1, Math.round(rect?.width || layer?.parentElement?.clientWidth || DEFAULT_MASK_WIDTH));
  const height = Math.max(1, Math.round(rect?.height || layer?.parentElement?.clientHeight || DEFAULT_MASK_HEIGHT));
  return { width, height };
}

function createMaskCanvas(layer) {
  const container = layer?.parentElement;
  if (!container) {
    throw new Error('Transition mask requires a background container.');
  }

  const { width, height } = getLayerSize(layer);
  const dpr = Math.min(MAX_DPR, Math.max(1, typeof window !== 'undefined' ? Number(window.devicePixelRatio) || 1 : 1));
  const canvas = document.createElement('canvas');
  canvas.className = 'transition-mask-canvas';
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable for transition mask.');
  }
  ctx.scale(dpr, dpr);
  container.appendChild(canvas);
  return { canvas, ctx, width, height };
}

function drawNoiseDissolve(ctx, width, height, progress) {
  ctx.clearRect(0, 0, width, height);
  const cell = 12;
  const alpha = Math.max(0, 0.38 * (1 - progress));
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const seed = Math.sin((x + 17) * 12.9898 + (y + 31) * 78.233) * 43758.5453;
      const value = seed - Math.floor(seed);
      if (value > progress) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }
}

function drawRipple(ctx, width, height, progress) {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.hypot(width, height) * 0.58;
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.36 * (1 - progress)})`;
  ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.006);
  for (let i = 0; i < 4; i += 1) {
    const offset = i * 0.16;
    const local = Math.max(0, Math.min(1, progress - offset));
    const radius = maxRadius * local;
    if (radius <= 0) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMaskFrame(ctx, width, height, type, progress) {
  if (type === 'ripple') {
    drawRipple(ctx, width, height, progress);
    return;
  }
  drawNoiseDissolve(ctx, width, height, progress);
}

export async function runCanvasMaskTransition({
  incoming,
  outgoing,
  type,
  duration,
  signal,
}) {
  if (!incoming || !outgoing) {
    throw new Error('Transition mask requires incoming and outgoing layers.');
  }

  const safeDuration = Math.max(0, Number(duration) || 0);
  if (safeDuration === 0 || prefersReducedMotion()) {
    incoming.classList.add('active');
    outgoing.classList.remove('active');
    return;
  }

  const { canvas, ctx, width, height } = createMaskCanvas(incoming);
  let timer = null;
  const startedAt = performance.now();

  incoming.classList.add('active');
  outgoing.classList.remove('active');

  return new Promise((resolve) => {
    function cleanup() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      canvas.remove();
      signal?.removeEventListener?.('abort', onAbort);
    }

    function finish() {
      cleanup();
      resolve();
    }

    function onAbort() {
      cleanup();
      resolve();
    }

    function step() {
      if (signal?.aborted) {
        onAbort();
        return;
      }
      const elapsed = performance.now() - startedAt;
      const progress = Math.max(0, Math.min(1, elapsed / safeDuration));
      drawMaskFrame(ctx, width, height, type, progress);
      if (progress >= 1) {
        finish();
        return;
      }
      timer = setTimeout(step, MASK_FRAME_MS);
    }

    signal?.addEventListener?.('abort', onAbort, { once: true });
    step();
  });
}
