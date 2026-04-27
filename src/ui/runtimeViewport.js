const BASE_GAME_WIDTH = 1280;
const BASE_GAME_HEIGHT = 720;

function computeViewportScale(viewportWidth, viewportHeight) {
  const safeWidth = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : BASE_GAME_WIDTH;
  const safeHeight = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : BASE_GAME_HEIGHT;
  return Math.min(safeWidth / BASE_GAME_WIDTH, safeHeight / BASE_GAME_HEIGHT);
}

export function attachResponsiveGameContainer(container, viewport = window) {
  if (!container || !viewport) {
    return () => {};
  }

  const updateScale = () => {
    const scale = computeViewportScale(viewport.innerWidth, viewport.innerHeight);
    container.style.transform = `scale(${scale})`;
    container.style.transformOrigin = 'center center';
  };

  updateScale();
  viewport.addEventListener('resize', updateScale);

  return () => {
    viewport.removeEventListener('resize', updateScale);
  };
}

