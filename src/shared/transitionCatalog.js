function freezeParamSchema(schema = {}) {
  return Object.freeze(Object.fromEntries(
    Object.entries(schema).map(([key, value]) => [key, Object.freeze({
      ...value,
      ...(Array.isArray(value.values) ? { values: Object.freeze([...value.values]) } : {}),
    })]),
  ));
}

function defineTransition({
  id,
  label,
  target,
  storageField,
  category = 'basic',
  renderMode = 'css',
  description = '',
  paramsSchema = {},
  defaults = {},
  runtimeSupported,
  editorSupported,
  fallbackId,
}) {
  return Object.freeze({
    id,
    label,
    target,
    storageField,
    category,
    renderMode,
    description,
    paramsSchema: freezeParamSchema(paramsSchema),
    defaults: Object.freeze({ ...defaults }),
    runtimeSupported,
    editorSupported,
    fallbackId,
  });
}

export const BACKGROUND_TRANSITION_DURATION_SCHEMA = Object.freeze({
  type: 'number',
  minimum: 0,
  maximum: 5000,
  default: 800,
  unit: 'ms',
});

export const CAMERA_EFFECT_DURATION_SCHEMA = Object.freeze({
  type: 'number',
  minimum: 0,
  maximum: 2000,
  default: 800,
  unit: 'ms',
});

const backgroundParams = {
  duration: BACKGROUND_TRANSITION_DURATION_SCHEMA,
};

const cameraParams = {
  durationMs: CAMERA_EFFECT_DURATION_SCHEMA,
  intensity: {
    type: 'enum',
    values: ['low', 'medium', 'high'],
    default: 'medium',
  },
};

const shakeCameraParams = {
  ...cameraParams,
  direction: {
    type: 'enum',
    values: ['horizontal', 'vertical', 'both'],
    default: 'both',
  },
};

const panCameraParams = {
  ...cameraParams,
  direction: {
    type: 'enum',
    values: ['left', 'right', 'up', 'down'],
    default: 'left',
  },
};

export const TRANSITION_CATALOG = Object.freeze([
  defineTransition({ id: 'fade', label: '淡入淡出', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'slide-left', label: '左滑入', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'slide-right', label: '右滑入', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'none', label: '无', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 0 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'dissolve', label: '溶解', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'wipe', label: '擦除', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'scale', label: '缩放', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'blur', label: '模糊', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'wipe-left', label: '左向擦除', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'wipe-right', label: '右向擦除', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'wipe-up', label: '向上擦除', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'wipe-down', label: '向下擦除', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'zoom-in', label: '推近', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'scale' }),
  defineTransition({ id: 'zoom-out', label: '拉远', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'scale' }),
  defineTransition({ id: 'flash', label: '闪白', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 400 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'iris-in', label: '光圈进入', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'iris-out', label: '光圈退出', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'crossfade-pan', label: '溶解平移', target: 'background', storageField: 'transition.type', paramsSchema: backgroundParams, defaults: { duration: 1000 }, runtimeSupported: true, editorSupported: true, fallbackId: 'dissolve' }),
  defineTransition({ id: 'diagonal-wipe', label: '对角擦除', target: 'background', storageField: 'transition.type', category: 'wipe', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'wipe' }),
  defineTransition({ id: 'cross-wipe', label: '十字展开', target: 'background', storageField: 'transition.type', category: 'wipe', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'wipe' }),
  defineTransition({ id: 'diamond', label: '菱形展开', target: 'background', storageField: 'transition.type', category: 'shape', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'iris-in' }),
  defineTransition({ id: 'circle-open', label: '圆形展开', target: 'background', storageField: 'transition.type', category: 'shape', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'iris-in' }),
  defineTransition({ id: 'circle-close', label: '圆形收束', target: 'background', storageField: 'transition.type', category: 'shape', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 800 }, runtimeSupported: true, editorSupported: true, fallbackId: 'iris-out' }),
  defineTransition({ id: 'curtain-open', label: '开幕', target: 'background', storageField: 'transition.type', category: 'curtain', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 900 }, runtimeSupported: true, editorSupported: true, fallbackId: 'wipe' }),
  defineTransition({ id: 'curtain-close', label: '闭幕', target: 'background', storageField: 'transition.type', category: 'curtain', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 900 }, runtimeSupported: true, editorSupported: true, fallbackId: 'wipe' }),
  defineTransition({ id: 'blinds-h', label: '水平百叶窗', target: 'background', storageField: 'transition.type', category: 'curtain', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 900 }, runtimeSupported: true, editorSupported: true, fallbackId: 'wipe' }),
  defineTransition({ id: 'blinds-v', label: '垂直百叶窗', target: 'background', storageField: 'transition.type', category: 'curtain', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 900 }, runtimeSupported: true, editorSupported: true, fallbackId: 'wipe' }),
  defineTransition({ id: 'clock-wipe', label: '时钟擦除', target: 'background', storageField: 'transition.type', category: 'shape', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 900 }, runtimeSupported: true, editorSupported: true, fallbackId: 'iris-in' }),
  defineTransition({ id: 'radial-wipe', label: '径向擦除', target: 'background', storageField: 'transition.type', category: 'shape', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 900 }, runtimeSupported: true, editorSupported: true, fallbackId: 'iris-in' }),
  defineTransition({ id: 'fade-white', label: '经白淡入', target: 'background', storageField: 'transition.type', category: 'flash', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 700 }, runtimeSupported: true, editorSupported: true, fallbackId: 'flash' }),
  defineTransition({ id: 'fade-black', label: '经黑淡入', target: 'background', storageField: 'transition.type', category: 'flash', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 700 }, runtimeSupported: true, editorSupported: true, fallbackId: 'fade' }),
  defineTransition({ id: 'glitch-lite', label: '轻故障', target: 'background', storageField: 'transition.type', category: 'stylized', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 550 }, runtimeSupported: true, editorSupported: true, fallbackId: 'dissolve' }),
  defineTransition({ id: 'pixelate-lite', label: '轻像素化', target: 'background', storageField: 'transition.type', category: 'stylized', renderMode: 'css', paramsSchema: backgroundParams, defaults: { duration: 650 }, runtimeSupported: true, editorSupported: true, fallbackId: 'blur' }),

  defineTransition({ id: 'none', label: '无', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'none' }),
  defineTransition({ id: 'fade-in', label: '淡入', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'none' }),
  defineTransition({ id: 'slide-in-left', label: '左滑入', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'none' }),
  defineTransition({ id: 'slide-in-right', label: '右滑入', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'none' }),
  defineTransition({ id: 'shake', label: '抖动', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'none' }),
  defineTransition({ id: 'nod', label: '点头', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'none' }),
  defineTransition({ id: 'breathe', label: '呼吸', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'none' }),
  defineTransition({ id: 'bounce', label: '弹跳', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'none' }),
  defineTransition({ id: 'fade', label: '淡入', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'fade-in' }),
  defineTransition({ id: 'slide-left', label: '左滑入', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'slide-in-left' }),
  defineTransition({ id: 'slide-right', label: '右滑入', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'slide-in-right' }),
  defineTransition({ id: 'pop', label: '弹出', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'fade-in' }),
  defineTransition({ id: 'scale-in', label: '缩放进入', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'fade-in' }),
  defineTransition({ id: 'blur-in', label: '模糊进入', target: 'character', storageField: 'animation', runtimeSupported: true, editorSupported: true, fallbackId: 'fade-in' }),

  defineTransition({ id: 'shake', label: '震动', target: 'camera', storageField: 'camera.effect', paramsSchema: shakeCameraParams, defaults: { durationMs: 800, intensity: 'medium', direction: 'both' }, runtimeSupported: true, editorSupported: true, fallbackId: null }),
  defineTransition({ id: 'zoom', label: '缩放', target: 'camera', storageField: 'camera.effect', paramsSchema: cameraParams, defaults: { durationMs: 800, intensity: 'medium' }, runtimeSupported: true, editorSupported: true, fallbackId: null }),
  defineTransition({ id: 'pan', label: '平移', target: 'camera', storageField: 'camera.effect', paramsSchema: panCameraParams, defaults: { durationMs: 800, intensity: 'medium', direction: 'left' }, runtimeSupported: true, editorSupported: true, fallbackId: null }),
  defineTransition({ id: 'flash', label: '闪白', target: 'camera', storageField: 'camera.effect', paramsSchema: cameraParams, defaults: { durationMs: 800, intensity: 'medium' }, runtimeSupported: true, editorSupported: true, fallbackId: null }),
  defineTransition({ id: 'vignette', label: '暗角', target: 'camera', storageField: 'camera.effect', paramsSchema: cameraParams, defaults: { durationMs: 800, intensity: 'medium' }, runtimeSupported: true, editorSupported: true, fallbackId: null }),
  defineTransition({ id: 'letterbox', label: '宽银幕', target: 'camera', storageField: 'camera.effect', paramsSchema: cameraParams, defaults: { durationMs: 800, intensity: 'medium' }, runtimeSupported: true, editorSupported: true, fallbackId: null }),
]);

export function listTransitionCatalog({ target = null, supportedOnly = false } = {}) {
  return TRANSITION_CATALOG
    .filter((entry) => !target || entry.target === target)
    .filter((entry) => !supportedOnly || entry.runtimeSupported)
    .map((entry) => JSON.parse(JSON.stringify(entry)));
}

export function getTransitionCatalogEntry(target, id) {
  return TRANSITION_CATALOG.find((entry) => entry.target === target && entry.id === id) ?? null;
}

export function isRuntimeSupportedTransition(target, id) {
  return Boolean(getTransitionCatalogEntry(target, id)?.runtimeSupported);
}

export function clampNumericTransitionParam(value, schema) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return schema.default;
  }

  return Math.min(schema.maximum, Math.max(schema.minimum, numeric));
}

export function isValidNumericTransitionParam(value, schema) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= schema.minimum
    && value <= schema.maximum;
}
