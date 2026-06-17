/**
 * Galgame Maker — Runtime Engine Entry Point
 * Wires all engine modules and UI components together.
 */
import './style.css';

// Engine
import { ScriptEngine } from './engine/ScriptEngine.js';
import { AudioManager } from './engine/AudioManager.js';
import { SaveManager } from './engine/SaveManager.js';
import { ConfigManager } from './engine/ConfigManager.js';
import {
  createBrowserPlayerDataStorage,
  createIpcPlayerDataStorage,
  createPlayerDataRepositoryFromScript,
} from './engine/PlayerDataRepository.js';
import {
  OPENING_VIDEO_PROFILE_KEY,
  getEndingVideoProfileKey,
  isManualEndingVideoReplayAllowed,
  shouldPlayOncePerProfileVideo,
  shouldRecordPlayedMediaOutcome,
} from './engine/runtimeVideoBehavior.js';
import { ReadHistory } from './engine/ReadHistory.js';
import { applyTheme, applyNineSlice, applyButtonFamilies, applyScreenBackgrounds, applyCursors } from './engine/ThemeManager.js';
import { detectEnvironment, ENV, BASE_PATH, SCRIPT_PATH, _capturedStartMsg } from './engine/assetPath.js';
import { WebSaveManager } from './engine/WebSaveManager.js';

// UI
import { DialogueBox } from './ui/DialogueBox.js';
import { CharacterLayer } from './ui/CharacterLayer.js';
import { BackgroundLayer } from './ui/BackgroundLayer.js';
import { ParticleLayer } from './ui/ParticleLayer.js';
import { EffectPackLayer } from './ui/EffectPackLayer.js';
import { CameraController } from './ui/CameraController.js';
import { ChoiceMenu } from './ui/ChoiceMenu.js';
import { TextInputScreen } from './ui/TextInputScreen.js';
import { SaveLoadScreen } from './ui/SaveLoadScreen.js';
import { BacklogScreen } from './ui/BacklogScreen.js';
import { SettingsScreen } from './ui/SettingsScreen.js';
import { TitleScreen } from './ui/TitleScreen.js';
import { GalleryScreen } from './ui/GalleryScreen.js';
import { GameMenu } from './ui/GameMenu.js';
import { QuickActionBar } from './ui/QuickActionBar.js';
import { VideoPlayer } from './ui/VideoPlayer.js';
import { attachResponsiveGameContainer } from './ui/runtimeViewport.js';
import { loadAllFonts } from './engine/fontLoader.js';
import {
  isKnownCameraEffect,
  isKnownCharacterAnimation,
  isKnownTransitionType,
} from './shared/cinematicContract.js';
import { normalizeParticleConfig, resolveEffectivePageParticles } from './shared/particleContract.js';
import { resolvePageEffectPacks } from './shared/effectPackContract.js';
import { getUiMotionClassNames } from './shared/uiMotionContract.js';

// ─── DOM references ─────────────────────────────────────
const gameContainer = document.getElementById('game-container');
const stageLayer = document.getElementById('stage-layer');
const bgLayer = document.getElementById('background-layer');
const charLayer = document.getElementById('character-layer');
const dialogueLayer = document.getElementById('dialogue-layer');
const uiOverlay = document.getElementById('ui-overlay');
attachResponsiveGameContainer(gameContainer);

// ─── Engine instances ───────────────────────────────────
const engine = new ScriptEngine();
const audio = new AudioManager('');
let saveManager = null;
const config = new ConfigManager();

// ─── UI instances ───────────────────────────────────────
const background = new BackgroundLayer(bgLayer, '');
const particles = new ParticleLayer(stageLayer);
const effectPacks = new EffectPackLayer(stageLayer);
const characters = new CharacterLayer(charLayer, '');
const camera = new CameraController(stageLayer);
const dialogueBox = new DialogueBox(dialogueLayer);
const choiceMenu = new ChoiceMenu(uiOverlay);
const textInputScreen = new TextInputScreen(uiOverlay);
// Settings, save/load, and backlog use gameContainer directly (not uiOverlay)
// so their z-index 200 is in the same stacking context as TitleScreen (z-index 100)
const saveLoadScreen = new SaveLoadScreen(gameContainer, null);
const backlogScreen = new BacklogScreen(gameContainer, audio);
const settingsScreen = new SettingsScreen(gameContainer, config);
const gameMenu = new GameMenu(uiOverlay);

// Quick action bar (embedded in dialogue box — D-01)
const quickBar = new QuickActionBar(dialogueBox.el);

// Skip indicator overlay (D-02, D-10)
const skipIndicator = document.createElement('div');
skipIndicator.id = 'skip-indicator';
skipIndicator.textContent = '▶▶ SKIP';
skipIndicator.classList.add('hidden');
gameContainer.appendChild(skipIndicator);

// Title screen is appended to the game container itself (z-index 100)
const titleScreen = new TitleScreen(gameContainer, '');
const galleryScreen = new GalleryScreen(gameContainer);
const videoPlayer = new VideoPlayer(gameContainer, { audioManager: audio });

// ─── State ──────────────────────────────────────────────
let autoMode = false;
let skipMode = false;
let autoTimerInterval = null;
let autoTimerTimeout = null;
let skipTimer = null;
let endReturnTimer = null;
let pendingBgm = undefined; // undefined=no change, null=stopped, {file,volume,...}=new BGM
let readHistory = null;
let currentVoicePromise = null;
const VOICE_END_DELAY = 300;
let isPlaying = false; // whether the game is actively playing (not on title)
let _autoCallbackId = 0; // incremented on every startAutoTimer/clearAutoTimer to cancel stale callbacks

function cancelEndReturnTimer() {
  if (endReturnTimer) {
    clearTimeout(endReturnTimer);
    endReturnTimer = null;
  }
}
let pendingPageEnter = null;
let pendingCharacterEvents = [];
let pendingUiEvent = null;
let pageTransitionGateOpen = false;
let pageTransitionToken = 0;
let backgroundTransitionPending = false;
let instantReplayMode = false;
let activeEffectPreview = null;
let previewRestorePending = false;
let playerDataRepository = null;
let activeUiMotionClasses = [];
let activeVideoToken = 0;
let titleStartPending = false;

// ─── Toast notifications (D-11, D-12) ──────────────────
let currentToast = null;
function showToast(message, duration = 3000) {
  // Remove any existing toast before showing a new one (SUG-03: dedup)
  if (currentToast) {
    currentToast.remove();
    currentToast = null;
  }
  const toast = document.createElement('div');
  toast.className = 'game-toast';
  toast.textContent = message;
  toast.style.cssText = 'position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:10px 24px;border-radius:6px;font-size:14px;z-index:9999;pointer-events:none;opacity:0;transition:opacity 0.3s;';
  gameContainer.appendChild(toast);
  currentToast = toast;
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (currentToast === toast) currentToast = null;
      toast.remove();
    }, 300);
  }, duration);
}

function renderInitializationError(container, error) {
  container.textContent = '';

  const panel = document.createElement('div');
  panel.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:#ff6b6b;font-size:18px;padding:40px;text-align:center;flex-direction:column;';

  const title = document.createElement('div');
  title.textContent = '加载游戏失败';

  const detail = document.createElement('small');
  detail.style.cssText = 'color:#888;margin-top:8px;';
  detail.textContent = error?.message || 'Unknown initialization error';

  panel.append(title, detail);
  container.appendChild(panel);
}

// ─── Preview text builder ───────────────────────────────
function buildPreviewText() {
  const page = engine._currentPage();
  if (page && page.type === 'choice') {
    const prompt = engine.interpolateText(page.prompt || '');
    const opts = (page.options || []).map((o, i) => `${i + 1}.${engine.interpolateText(o.text || '')}`).join(' ');
    return `${prompt} ${opts}`.substring(0, 80);
  }
  if (page && page.type === 'input') {
    return engine.interpolateText(page.prompt || '').substring(0, 60);
  }
  const lastDialogue = engine.history.length > 0
    ? engine.history[engine.history.length - 1].text
    : '';
  return lastDialogue.substring(0, 60);
}

function applyPreviewScriptSnapshot(request) {
  engine.script = request.script;
  engine._previewMode = request.previewMode ?? true;

  if (engine.script.assets?.fonts?.length) {
    loadAllFonts(engine.script.assets.fonts, BASE_PATH).catch(() => {});
  }

  applyTheme(gameContainer, engine.script.ui?.theme);
  applyNineSlice(engine.script.ui?.theme);
  applyButtonFamilies(engine.script.ui?.theme);
  applyScreenBackgrounds(gameContainer, engine.script.ui);
  applyCursors(engine.script.ui?.theme);
  applyUiMotion(engine.script.ui?.motion);

  if (engine.script.ui?.dialogueBox) {
    dialogueBox.applyGlobalStyle(engine.script.ui.dialogueBox);
  }

  titleScreen.setLayout(engine.script.ui?.titleScreen);
  settingsScreen.setLayout(engine.script.ui?.settingsScreen);
  settingsScreen.setWidgetStyles(engine.script.ui?.widgetStyles);
  choiceMenu.setWidgetStyles(engine.script.ui?.widgetStyles);
  saveLoadScreen.setLayout(engine.script.ui?.saveLoadScreen);
  backlogScreen.setLayout(engine.script.ui?.backlogScreen);
  gameMenu.setLayout(engine.script.ui?.gameMenu);

  // Apply theme-level icons (Phase 75 — ICO-01)
  const themeIcons = engine.script.ui?.theme?.icons;
  if (themeIcons) {
    saveLoadScreen.setThemeIcons(themeIcons);
    gameMenu.setThemeIcons(themeIcons);
    backlogScreen.setThemeIcons(themeIcons);
    settingsScreen.setThemeIcons(themeIcons);
    quickBar.setThemeIcons(themeIcons);
  }

  if (engine.script.ui?.dialogueBox?.nameplateStyle) {
    dialogueBox.setNameplateStyle(engine.script.ui.dialogueBox.nameplateStyle);
  }
}

function establishPreviewPageBaseline(request) {
  engine.restoreState({
    currentScene: request.sceneId || 'start',
    pageIndex: request.pageIndex || 0,
    dialogueIndex: 0,
    variables: {},
    history: [],
  });

  titleScreen.hide();
  isPlaying = true;

  cancelRuntimeVideo();
  cancelPageTransitionGate();
  camera.clear();
  characters.clear();
  background.clear();
  particles.clear();
  effectPacks.clear();
  engine.resetRenderState();
  engine.renderCurrentPage();
}

function postEffectPreviewResult(result) {
  window.parent.postMessage({
    type: 'preview-effect-result',
    ...result,
  }, '*');
}

function waitForPreviewDuration(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(durationMs) || 0)));
}

async function restorePreviewSnapshot(snapshot) {
  previewRestorePending = true;
  cancelRuntimeVideo();
  cancelPageTransitionGate();
  stopAuto();
  stopSkip();
  dialogueBox.hide();
  choiceMenu.hide();
  textInputScreen.hide();
  camera.clear();
  audio.stopVoice();
  characters.clear();
  background.clear();
  particles.clear();
  effectPacks.clear();
  try {
    engine.restoreState(snapshot);
    engine.resetRenderState();
    engine.renderCurrentPage();
  } finally {
    previewRestorePending = false;
  }
}

async function cancelActiveEffectPreview(status = 'cancelled', reason = null, cancelDetail = 'superseded') {
  const preview = activeEffectPreview;
  if (!preview) return;

  activeEffectPreview = null;

  try {
    await restorePreviewSnapshot(preview.snapshot);
    postEffectPreviewResult({
      requestId: preview.requestId,
      effectKind: preview.effectKind,
      status,
      reason,
      cancelDetail: cancelDetail,
    });
  } catch (error) {
    postEffectPreviewResult({
      requestId: preview.requestId,
      effectKind: preview.effectKind,
      status: 'failed',
      reason: 'restore-failed',
      cancelDetail: cancelDetail,
      error: error.message,
    });
  }
}

async function runEffectPreview(request) {
  const snapshot = engine.getState();
  activeEffectPreview = {
    requestId: request.requestId,
    effectKind: request.effectKind,
    snapshot,
  };

  postEffectPreviewResult({
    requestId: request.requestId,
    effectKind: request.effectKind,
    status: 'accepted',
    reason: null,
  });

  try {
    if (request.effectKind === 'character') {
      if (!isKnownCharacterAnimation(request.payload?.animation)) {
        activeEffectPreview = null;
        await restorePreviewSnapshot(snapshot);
        postEffectPreviewResult({
          requestId: request.requestId,
          effectKind: request.effectKind,
          status: 'rejected',
          reason: 'unsupported-effect',
        });
        return;
      }

      characters.show({
        ...request.payload,
        transition: 'none',
        duration: 0,
        skip: true,
      });
      await waitForPreviewDuration(request.payload?.durationMs ?? 450);
    }

    if (request.effectKind === 'camera') {
      if (!isKnownCameraEffect(request.payload?.effect)) {
        activeEffectPreview = null;
        postEffectPreviewResult({
          requestId: request.requestId,
          effectKind: request.effectKind,
          status: 'rejected',
          reason: 'unsupported-effect',
        });
        return;
      }

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      camera.play(request.payload);
      await waitForPreviewDuration(request.payload?.durationMs ?? 450);
    }

    if (request.effectKind === 'transition') {
      if (!isKnownTransitionType(request.payload?.type)) {
        activeEffectPreview = null;
        await restorePreviewSnapshot(snapshot);
        postEffectPreviewResult({
          requestId: request.requestId,
          effectKind: request.effectKind,
          status: 'rejected',
          reason: 'unsupported-effect',
        });
        return;
      }

      const page = engine._currentPage();
      await background.setBackground({
        image: request.payload?.image || page?.background || '',
        transition: request.payload.type,
        duration: request.payload.duration ?? 800,
        previewVariant: 'same-page',
      });
    }

    if (request.effectKind === 'particle') {
      const particleConfig = normalizeParticleConfig(request.payload?.config);
      if (!particleConfig) {
        activeEffectPreview = null;
        await restorePreviewSnapshot(snapshot);
        postEffectPreviewResult({
          requestId: request.requestId,
          effectKind: request.effectKind,
          status: 'rejected',
          reason: 'unsupported-effect',
        });
        return;
      }

    particles.play(particleConfig);
      await waitForPreviewDuration(request.payload?.durationMs ?? 1200);
    }

    if (!['character', 'camera', 'transition', 'particle'].includes(request.effectKind)) {
      activeEffectPreview = null;
      await restorePreviewSnapshot(snapshot);
      postEffectPreviewResult({
        requestId: request.requestId,
        effectKind: request.effectKind,
        status: 'rejected',
        reason: 'unsupported-effect',
      });
      return;
    }

    if (!activeEffectPreview || activeEffectPreview.requestId !== request.requestId) {
      return;
    }

    activeEffectPreview = null;
    await restorePreviewSnapshot(snapshot);
    postEffectPreviewResult({
      requestId: request.requestId,
      effectKind: request.effectKind,
      status: 'completed',
      reason: null,
    });
  } catch (error) {
    const wasActiveRequest = activeEffectPreview?.requestId === request.requestId;
    activeEffectPreview = null;

    try {
      await restorePreviewSnapshot(snapshot);
      if (wasActiveRequest) {
        postEffectPreviewResult({
          requestId: request.requestId,
          effectKind: request.effectKind,
          status: 'failed',
          reason: 'runtime-error',
          error: error.message,
        });
      } else {
        postEffectPreviewResult({
          requestId: request.requestId,
          effectKind: request.effectKind,
          status: 'failed',
          reason: 'restore-failed',
          error: error.message,
        });
      }
    } catch (restoreError) {
      postEffectPreviewResult({
        requestId: request.requestId,
        effectKind: request.effectKind,
        status: 'failed',
        reason: 'restore-failed',
        error: restoreError.message,
      });
    }
  }
}

// ─── Screenshot capture (D-01, D-02, D-03) ─────────────
let cachedScreenshot = null;

function parseCssUrl(value) {
  const match = String(value || '').match(/^url\(["']?(.*?)["']?\)$/);
  return match?.[1] || '';
}

function loadImageForCanvas(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('Missing image source'));
      return;
    }

    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function drawImageCover(ctx, img, x, y, width, height) {
  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;
  ctx.drawImage(
    img,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawImageContainBottom(ctx, img, x, y, width, height) {
  const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;
  ctx.drawImage(
    img,
    x + (width - drawWidth) / 2,
    y + height - drawHeight,
    drawWidth,
    drawHeight,
  );
}

async function captureWebStageThumbnail() {
  const stageRect = stageLayer?.getBoundingClientRect?.();
  if (!stageRect?.width || !stageRect?.height) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scaleX = canvas.width / stageRect.width;
  const scaleY = canvas.height / stageRect.height;
  const activeBackground = bgLayer?.querySelector?.('.bg-image-layer.active');
  const backgroundSrc = activeBackground
    ? parseCssUrl(getComputedStyle(activeBackground).backgroundImage)
    : '';
  if (backgroundSrc) {
    try {
      const image = await loadImageForCanvas(backgroundSrc);
      drawImageCover(ctx, image, 0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.warn('[GalgameMaker] Web thumbnail background capture skipped:', error.message);
    }
  }

  const characterImages = [...(charLayer?.querySelectorAll?.('.character-sprite.entered img.active') ?? [])];
  for (const imageEl of characterImages) {
    const src = imageEl.currentSrc || imageEl.src;
    if (!src) continue;

    try {
      const image = imageEl.complete && imageEl.naturalWidth
        ? imageEl
        : await loadImageForCanvas(src);
      const rect = imageEl.getBoundingClientRect();
      drawImageContainBottom(
        ctx,
        image,
        (rect.left - stageRect.left) * scaleX,
        (rect.top - stageRect.top) * scaleY,
        rect.width * scaleX,
        rect.height * scaleY,
      );
    } catch (error) {
      console.warn('[GalgameMaker] Web thumbnail character capture skipped:', error.message);
    }
  }

  return canvas.toDataURL('image/jpeg', 0.72);
}

async function captureGameScreenshot() {
  const dlgWasVisible = dialogueBox.el?.classList.contains('visible');
  try {
    // Hide dialogue box visually without stopping typewriter (BUG-04 fix)
    // Using visibility:hidden instead of hide() avoids killing the typewriter timer
    if (dlgWasVisible) {
      dialogueBox.el.style.visibility = 'hidden';
    }

    // Wait one frame for DOM update
    await new Promise(r => requestAnimationFrame(r));

    if (!window.ipcRenderer) {
      return await captureWebStageThumbnail();
    }

    const result = await window.ipcRenderer.invoke('capture-screenshot');

    // Restore visibility immediately after capture
    if (dlgWasVisible) {
      dialogueBox.el.style.visibility = '';
    }

    if (!result.success) {
      console.error('[GalgameMaker] Screenshot failed:', result.error);
      return null;
    }

    return result.data;
  } catch (e) {
    console.error('[GalgameMaker] Screenshot error:', e);
    return null;
  } finally {
    // Ensure visibility is restored even on error
    if (dlgWasVisible) {
      dialogueBox.el.style.visibility = '';
    }
  }
}

// ─── Apply config ───────────────────────────────────────
function applyConfig() {
  const master = config.get('masterVolume');
  audio.setBgmVolume(config.get('bgmVolume') * master);
  audio.setSeVolume(config.get('seVolume') * master);
  audio.setVoiceVolume(config.get('voiceVolume') * master);
  dialogueBox.typeSpeed = config.get('textSpeed');

  // Dialogue box opacity
  const dlgEl = document.querySelector('#dialogue-box');
  if (dlgEl) {
    dlgEl.style.setProperty('--dialogue-opacity', config.get('dialogueOpacity'));
  }

  // Window mode (Electron only)
  if (window.ipcRenderer) {
    const mode = config.get('windowMode') || (config.get('fullscreen') ? 'fullscreen' : 'windowed');
    window.ipcRenderer.invoke('set-window-mode', mode).catch(() => {});
  }
}
applyConfig();

function applyUiMotion(motionConfig) {
  if (!gameContainer) return;
  if (activeUiMotionClasses.length) {
    gameContainer.classList.remove(...activeUiMotionClasses);
  }
  activeUiMotionClasses = getUiMotionClassNames(motionConfig);
  gameContainer.classList.add(...activeUiMotionClasses);
}

function hidePreviewUiSurfaces() {
  cancelRuntimeVideo();
  choiceMenu.hide();
  textInputScreen.hide();
  dialogueBox.hide();
  gameMenu.hide();
  saveLoadScreen.hide();
  backlogScreen.hide();
  settingsScreen.hide();
  titleScreen.hide();
}

function cancelRuntimeVideo(outcome = 'skipped') {
  activeVideoToken += 1;
  videoPlayer.stop(outcome);
}

async function playRuntimeVideo(reference, { skipImmediately = false } = {}) {
  const token = ++activeVideoToken;
  const outcome = await videoPlayer.play(reference, {
    script: engine.script,
    audioManager: audio,
    skipImmediately,
  });
  return token === activeVideoToken ? outcome : null;
}

async function getPlayerProfileForPlayback() {
  try {
    return await playerDataRepository?.load();
  } catch (error) {
    console.warn('[GalgameMaker] Failed to load player media profile:', error);
    return null;
  }
}

async function recordPlayedMedia(mediaKey, outcome) {
  if (!mediaKey || !shouldRecordPlayedMediaOutcome(outcome)) return;

  try {
    await playerDataRepository?.markPlayedMedia?.(mediaKey);
  } catch (error) {
    console.warn('[GalgameMaker] Failed to save played media profile:', error);
  }
}

async function playProfileTrackedVideo(reference, mediaKey, {
  replay = false,
  skipImmediately = false,
  track = true,
} = {}) {
  const profile = await getPlayerProfileForPlayback();
  if (!shouldPlayOncePerProfileVideo(reference, profile, mediaKey, { replay })) {
    return { type: 'skipped-profile', mediaKey };
  }

  const outcome = await playRuntimeVideo(reference, { skipImmediately });
  if (track) {
    await recordPlayedMedia(mediaKey, outcome);
  }
  return outcome;
}

function getOpeningVideoConfig() {
  const openingVideo = engine.script?.ui?.titleScreen?.openingVideo;
  return openingVideo && typeof openingVideo === 'object' ? openingVideo : null;
}

async function playOpeningVideo(trigger, { replay = false } = {}) {
  const openingVideo = getOpeningVideoConfig();
  const playMode = openingVideo?.play ?? 'after-start';
  if (!openingVideo || playMode !== trigger) return null;
  return playProfileTrackedVideo(openingVideo, OPENING_VIDEO_PROFILE_KEY, { replay });
}

function getEndingVideoConfig(endingId) {
  const endingVideo = engine.script?.systems?.endings?.[endingId]?.endingVideo;
  return endingVideo && typeof endingVideo === 'object' ? endingVideo : null;
}

async function playEndingVideo(endingId, {
  manual = false,
  preview = false,
  replay = false,
} = {}) {
  if (!manual && (!isPlaying || engine.ended || engine._previewMode)) return null;
  if (manual && !preview && !playerDataRepository) return null;

  const endingVideo = getEndingVideoConfig(endingId);
  if (!endingVideo) return null;
  const playMode = endingVideo.play ?? 'after-unlock';
  const mediaKey = getEndingVideoProfileKey(endingId);
  if (!mediaKey) return null;

  if (manual) {
    const profile = preview ? null : await getPlayerProfileForPlayback();
    const unlockRecord = profile?.unlocks?.endings?.[endingId] ?? null;
    if (!isManualEndingVideoReplayAllowed({ endingVideo, unlockRecord, preview })) {
      return null;
    }
  } else if (playMode === 'manual') {
    return null;
  }

  stopAuto();
  stopSkip();
  audio.stopVoice();
  return playProfileTrackedVideo(endingVideo, mediaKey, {
    replay: manual || replay,
    track: !preview,
  });
}

// ─── Engine event handlers ──────────────────────────────
function showDialogueEvent(data) {
  choiceMenu.hide();
  textInputScreen.hide();

  // Inject per-page font override into dialogue data
  const currentPage = engine.script?.scenes?.[engine.currentScene]?.pages?.[engine.pageIndex];
  data.fontOverride = currentPage?.fontOverride || null;

  // During skip — show text instantly, suppress voice, no auto timer (D-07)
  if (skipMode) {
    dialogueBox.show(data);
    dialogueBox._finishLine(); // Instant text display
    currentVoicePromise = null; // Don't play voice
    return; // Skip interval handles advancement — no setTimeout chain
  }

  dialogueBox.show(data);

  // Voice playback — only play if voice is bound (D-01)
  if (data.voice) {
    currentVoicePromise = audio.playVoice(data.voice);
  } else {
    currentVoicePromise = null;
  }

  // Auto mode
  if (autoMode) {
    startAutoTimer();
  }
}

function showChoiceEvent(data) {
  dialogueBox.hide();
  textInputScreen.hide();
  stopAuto();
  stopSkip();
  choiceMenu.show(data);
}

function showInputEvent(data) {
  dialogueBox.hide();
  choiceMenu.hide();
  stopAuto();
  stopSkip();
  textInputScreen.show(data);
}

function playCharacterEvent(type, data, { instant = false } = {}) {
  const shouldSkipTransition = skipMode || instant;

  if (type === 'show_character') {
    if (shouldSkipTransition) {
      characters.show({ ...data, duration: 0, transition: 'none', skip: true });
      return;
    }
    characters.show(data);
    return;
  }

  if (type === 'hide_character') {
    if (shouldSkipTransition) {
      characters.hide({ ...data, duration: 0 });
      return;
    }
    characters.hide(data);
    return;
  }

  if (shouldSkipTransition) {
    characters.setExpression({ ...data, skip: true });
    return;
  }
  characters.setExpression(data);
}

function handlePageEnterEffects(data) {
  if (skipMode) {
    camera.clear();
  } else {
    camera.play(data.camera, { immediate: instantReplayMode });
  }

  if (!readHistory) return; // Guard for preview mode
  const wasRead = readHistory.isRead(data.sceneId, data.pageIndex);
  readHistory.markRead(data.sceneId, data.pageIndex);

  if (skipMode && !wasRead && config.get('skipMode') === 'readOnly') {
    stopSkip();
  }
}

function flushPageTransitionGate(token = pageTransitionToken) {
  if (!pageTransitionGateOpen) return;
  if (token !== pageTransitionToken) return;

  const pageEnterData = pendingPageEnter;
  const characterEvents = pendingCharacterEvents;
  const uiEvent = pendingUiEvent;

  pendingPageEnter = null;
  pendingCharacterEvents = [];
  pendingUiEvent = null;
  pageTransitionGateOpen = false;
  backgroundTransitionPending = false;

  for (const event of characterEvents) {
    playCharacterEvent(event.type, event.data, { instant: instantReplayMode });
  }

  if (pageEnterData) {
    handlePageEnterEffects(pageEnterData);
  }

  if (uiEvent?.type === 'dialogue') {
    showDialogueEvent(uiEvent.data);
  } else if (uiEvent?.type === 'choice') {
    showChoiceEvent(uiEvent.data);
  } else if (uiEvent?.type === 'input') {
    showInputEvent(uiEvent.data);
  }
}

function cancelPageTransitionGate() {
  pageTransitionToken += 1;
  pendingPageEnter = null;
  pendingCharacterEvents = [];
  pendingUiEvent = null;
  pageTransitionGateOpen = false;
  backgroundTransitionPending = false;
}

function applyCurrentParticles() {
  const config = resolveEffectivePageParticles(engine.script, engine.currentScene, engine.pageIndex);
  if (config) {
    particles.play(config);
  } else {
    particles.clear();
  }
}

function applyCurrentEffectPacks() {
  const page = engine._currentPage?.();
  if (page) {
    const effects = resolvePageEffectPacks(engine.script, page);
    effectPacks.play(effects);
  } else {
    effectPacks.clear();
  }
}

engine.on('dialogue', (data) => {
  if (pageTransitionGateOpen) {
    pendingUiEvent = { type: 'dialogue', data };
    return;
  }

  showDialogueEvent(data);
});

// ─── Visual events (skip-aware transitions D-08) ─────────
engine.on('show_character', (data) => {
  if (pageTransitionGateOpen) {
    pendingCharacterEvents.push({ type: 'show_character', data });
    return;
  }

  playCharacterEvent('show_character', data, { instant: instantReplayMode });
});

engine.on('hide_character', (data) => {
  if (pageTransitionGateOpen) {
    pendingCharacterEvents.push({ type: 'hide_character', data });
    return;
  }

  playCharacterEvent('hide_character', data, { instant: instantReplayMode });
});

engine.on('set_expression', (data) => {
  if (pageTransitionGateOpen) {
    pendingCharacterEvents.push({ type: 'set_expression', data });
    return;
  }

  playCharacterEvent('set_expression', data, { instant: instantReplayMode });
});

engine.on('set_background', async (data) => {
  const token = pageTransitionToken;
  backgroundTransitionPending = true;

  if (instantReplayMode) {
    await background.setBackground({ ...data, duration: 0, transition: 'cut' });
    if (token === pageTransitionToken) {
      backgroundTransitionPending = false;
    }
    return;
  }

  if (skipMode) {
    await background.setBackground({ ...data, duration: 0, transition: 'cut' });
    flushPageTransitionGate(token);
    return;
  }

  await background.setBackground(data);
  flushPageTransitionGate(token);
});

engine.on('set_particles', ({ config }) => {
  if (skipMode) {
    particles.clear();
    return;
  }
  particles.play(config);
});

engine.on('stop_particles', () => {
  if (skipMode) {
    particles.clear();
    return;
  }
  particles.stop();
});

engine.on('set_effect_packs', ({ effects }) => {
  if (skipMode) {
    effectPacks.clear();
    return;
  }
  effectPacks.play(effects);
});

engine.on('clear_effect_packs', () => {
  effectPacks.clear();
});

// ─── Audio events (skip-aware D-07) ──────────────────────
engine.on('play_bgm', (data) => {
  if (skipMode) {
    pendingBgm = { ...data }; // Track but don't play
    return;
  }
  audio.playBgm(data);
});

engine.on('stop_bgm', (data) => {
  if (skipMode) {
    pendingBgm = null; // BGM should be stopped on skip end
    return;
  }
  audio.stopBgm(data);
});

engine.on('play_se', (data) => {
  if (skipMode) return; // Suppress SE entirely (D-07)
  audio.playSe(data);
});

engine.on('choice', (data) => {
  if (pageTransitionGateOpen) {
    pendingUiEvent = { type: 'choice', data };
    return;
  }

  showChoiceEvent(data);
});

engine.on('input', (data) => {
  if (pageTransitionGateOpen) {
    pendingUiEvent = { type: 'input', data };
    return;
  }

  showInputEvent(data);
});

engine.on('video', async (data) => {
  const video = data.video ?? data.page?.video;
  const skipImmediately = skipMode && video?.skippable !== false;

  stopAuto();
  stopSkip();
  audio.stopVoice();
  dialogueBox.hide();
  choiceMenu.hide();
  textInputScreen.hide();

  const outcome = await playRuntimeVideo(video, { skipImmediately });
  if (!outcome) return;
  engine.finishVideo(outcome.type);
});

engine.on('ending_unlocked', ({ endingId }) => {
  void playEndingVideo(endingId);
});

engine.on('end', () => {
  // In preview mode, notify editor instead of returning to title
  if (engine._previewMode) {
    isPlaying = false;
    stopAuto();
    stopSkip();
    dialogueBox.hide();
    choiceMenu.hide();
    textInputScreen.hide();
    cancelRuntimeVideo();
    cancelPageTransitionGate();
    camera.clear();
    background.clear();
    particles.clear();
    effectPacks.clear();
    audio.stopVoice();
    window.parent.postMessage({ type: 'ended' }, '*');
    return;
  }

  isPlaying = false;
  stopAuto();
  stopSkip();
  dialogueBox.hide();
  choiceMenu.hide();
  textInputScreen.hide();
  cancelRuntimeVideo();
  audio.stopBgm({ fadeOut: 2000 });
  audio.stopVoice();

  // Show ending for a moment, then return to title
  cancelEndReturnTimer();
  endReturnTimer = setTimeout(() => {
    endReturnTimer = null;
    cancelPageTransitionGate();
    camera.clear();
    engine.resetRenderState();
    characters.clear();
    background.clear();
    particles.clear();
    effectPacks.clear();
    showTitle();
  }, 2000);
});

engine.on('scene_enter', (data) => {
  console.log(`[Scene] ${data.sceneId}: ${data.sceneName}`);
});

engine.on('page_enter', (data) => {
  if (instantReplayMode) {
    handlePageEnterEffects(data);
    return;
  }

  pageTransitionToken += 1;
  pendingPageEnter = data;
  pendingCharacterEvents = [];
  pendingUiEvent = null;
  pageTransitionGateOpen = true;
  backgroundTransitionPending = false;

  const token = pageTransitionToken;
  queueMicrotask(() => {
    if (!pageTransitionGateOpen) return;
    if (backgroundTransitionPending) return;
    flushPageTransitionGate(token);
  });
});

// ─── Dialogue advancement ───────────────────────────────
dialogueBox.onAdvance = () => {
  stopAuto();
  engine.next();
};

// ─── Choice handling ────────────────────────────────────
choiceMenu.onSelect = (index) => {
  engine.selectChoice(index);
};

textInputScreen.onSubmit = (value) => engine.submitInput(value);

// ─── Save / Load ────────────────────────────────────────
saveLoadScreen.onSave = async (slot) => {
  const state = engine.getState();
  const previewText = buildPreviewText();
  const result = await saveManager.save(slot, state, previewText, cachedScreenshot);
  if (result.success) {
    showToast('存档完成');
  } else {
    showToast(`存档失败：${result.error}`);
  }
};

saveLoadScreen.onLoad = async (slot) => {
  const data = await saveManager.load(slot);
  if (!data) return;
  if (!engine.restoreState(data.state)) {
    showToast('存档数据损坏，无法读取');
    return;
  }
  cancelEndReturnTimer();

  stopAuto();
  stopSkip();

  // Hide title screen if it's still showing (loading from "继续游戏")
  titleScreen.hide();

  audio.stopVoice(); // Stop lingering voice from previous state
  isPlaying = true;

  // Re-render the current page's visual state
  replayCurrentPage({ instant: true });
};

saveLoadScreen.onDelete = async (slot) => {
  const result = await saveManager.delete(slot);
  if (!result.success) {
    showToast(`删除失败：${result.error}`);
  }
};

saveLoadScreen.onClose = (source) => {
  if (source === 'menu') {
    gameMenu.show();
  }
  // 'bar' → no action (return to gameplay)
  // 'title' → no action (title screen still visible underneath)
};

function replayCurrentPage({ instant = false } = {}) {
  cancelRuntimeVideo();
  cancelPageTransitionGate();
  dialogueBox.hide();
  choiceMenu.hide();
  textInputScreen.hide();
  camera.clear();
  characters.clear();
  background.clear();
  particles.clear();
  effectPacks.clear();
  engine.resetRenderState();

  const previousInstantReplayMode = instantReplayMode;
  instantReplayMode = Boolean(instant) || previousInstantReplayMode;
  try {
    engine.renderCurrentPage();
  } finally {
    instantReplayMode = previousInstantReplayMode;
  }
}

// ─── Settings ───────────────────────────────────────────
settingsScreen.onChange = () => {
  applyConfig();
};

// ─── Game menu wiring ───────────────────────────────────
gameMenu.onSave = async () => {
  stopSkip();
  cachedScreenshot = await captureGameScreenshot(); // D-03: capture before showing UI
  saveLoadScreen.show('save', 'menu');
};
gameMenu.onLoad = () => {
  stopSkip();
  saveLoadScreen.show('load', 'menu');
};
gameMenu.onBacklog = () => {
  stopSkip();
  const chars = engine.script?.characters || {};
  backlogScreen.show(engine.history, chars);
};
gameMenu.onSettings = () => {
  stopSkip();
  settingsScreen.show();
};
gameMenu.onTitle = async () => {
  isPlaying = false;
  stopAuto();
  stopSkip();
  cancelRuntimeVideo();
  dialogueBox.hide();
  choiceMenu.hide();
  textInputScreen.hide();
  cancelPageTransitionGate();
  camera.clear();
  audio.stopBgm({ fadeOut: 500 });
  audio.stopVoice();
  engine.resetRenderState();
  characters.clear();
  background.clear();
  particles.clear();
  effectPacks.clear();
  await showTitle();
};

// ─── Quick action bar wiring ────────────────────────────
quickBar.onAuto = () => toggleAuto();
quickBar.onSkip = () => toggleSkip();
quickBar.onBacklog = () => {
  stopSkip();
  const chars = engine.script?.characters || {};
  backlogScreen.show(engine.history, chars);
};
quickBar.onSave = async () => {
  stopAuto();
  stopSkip();
  cachedScreenshot = await captureGameScreenshot();
  saveLoadScreen.show('save', 'bar');
};
quickBar.onLoad = () => {
  stopAuto();
  stopSkip();
  saveLoadScreen.show('load', 'bar');
};
quickBar.onQuickSave = async () => {
  const state = engine.getState();
  const previewText = buildPreviewText();
  const screenshot = await captureGameScreenshot();
  const result = await saveManager.quickSave(state, previewText, screenshot);
  if (result.success) {
    showToast('快速存档完成');
    quickBar.setQuickLoadEnabled(true);
  } else {
    showToast(`快速存档失败：${result.error}`);
  }
};
quickBar.onQuickLoad = async () => {
  if (!quickBar.isQuickLoadEnabled) return;
  const data = await saveManager.quickLoad();
  if (!data) return;
  if (!engine.restoreState(data.state)) {
    showToast('快速存档数据损坏，无法读取');
    return;
  }
  cancelEndReturnTimer();
  stopAuto();
  stopSkip();
  titleScreen.hide();
  audio.stopVoice();
  isPlaying = true;
  replayCurrentPage({ instant: true });
  showToast('快速读档完成');
};
quickBar.onSettings = () => {
  stopAuto();
  stopSkip();
  settingsScreen.show();
};

// ─── Keyboard shortcuts ─────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.target?.closest?.('#text-input-screen')) {
    return;
  }

  // ESC priority chain — overlays first, regardless of play state or preview mode
  if (e.key === 'Escape') {
    if (!saveLoadScreen.el.classList.contains('hidden')) { saveLoadScreen.hide(); return; }
    if (settingsScreen.isVisible) { settingsScreen.hide(); return; }
    if (!backlogScreen.el.classList.contains('hidden')) { backlogScreen.hide(); return; }
    if (!gameMenu.el.classList.contains('hidden')) { gameMenu.hide(); return; }
    // ESC when no overlay is open → toggle game menu (standard VN behavior)
    if (isPlaying) { gameMenu.show(); return; }
  }

  if (!isPlaying) return;

  // D-06: Any key stops skip (except ESC which is handled above)
  if (skipMode) {
    stopSkip();
    return;
  }

  switch (e.key) {
    case 'Escape':
      // Toggle dialogue box visibility — bar follows automatically (DOM child)
      dialogueBox.el.classList.toggle('visible');
      break;
    case ' ':
    case 'Enter':
      e.preventDefault();
      if (engine.waiting && !engine.ended) {
        dialogueBox._handleClick();
      }
      break;
    case 'a':
    case 'A':
      toggleAuto();
      break;
    case 's':
    case 'S':
      toggleSkip();
      break;
    case 'l':
    case 'L':
      if (!backlogScreen.el.classList.contains('hidden')) {
        backlogScreen.hide();
      } else {
        gameMenu.onBacklog();
      }
      break;
    case 'F5':
      e.preventDefault();
      // Quicksave — same as clicking 快存 button
      if (quickBar.onQuickSave) quickBar.onQuickSave();
      break;
    case 'F9':
      e.preventDefault();
      // Quickload — same as clicking 快読 button (guarded by isQuickLoadEnabled)
      if (quickBar.isQuickLoadEnabled && quickBar.onQuickLoad) quickBar.onQuickLoad();
      break;
  }
});

// ─── Click anywhere to advance (standard galgame behavior) ──────
gameContainer.addEventListener('click', (e) => {
  if (!isPlaying) return;
  if (engine.ended) return;
  if (videoPlayer.isPlaying) return;

  // Don't interfere with UI element clicks
  const target = e.target;
  if (target.closest('#quick-action-bar')) return;
  if (target.closest('#choice-menu')) return;
  if (target.closest('#text-input-screen')) return;
  if (target.closest('#game-menu')) return;
  if (target.closest('#save-load-screen')) return;
  if (target.closest('#settings-screen')) return;
  if (target.closest('#backlog-screen')) return;
  if (target.closest('#title-screen')) return;
  if (target.closest('#gallery-screen')) return;

  // D-06: Click stops skip — do NOT also advance dialogue (Pitfall 7)
  if (skipMode) {
    stopSkip();
    return;
  }

  // Advance dialogue
  if (engine.waiting) {
    dialogueBox._handleClick();
  }
});

// Right-click: close overlays, or toggle dialogue box visibility
gameContainer.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!isPlaying) return;

  // D-06: Right-click stops skip — don't open anything
  if (skipMode) {
    stopSkip();
    return;
  }

  // Close overlays first (priority: save/load > settings > backlog > game menu)
  if (!saveLoadScreen.el.classList.contains('hidden')) { saveLoadScreen.hide(); return; }
  if (settingsScreen.isVisible) { settingsScreen.hide(); return; }
  if (!backlogScreen.el.classList.contains('hidden')) { backlogScreen.hide(); return; }
  if (!gameMenu.el.classList.contains('hidden')) { gameMenu.hide(); return; }

  // Toggle dialogue box visibility — bar follows automatically (DOM child)
  dialogueBox.el.classList.toggle('visible');
});

// Scroll wheel: up → open backlog, down → close backlog or advance dialogue
gameContainer.addEventListener('wheel', (e) => {
  if (!isPlaying) return;

  if (e.deltaY < 0) {
    // Scroll up → open backlog (if no overlay is open)
    if (skipMode) { stopSkip(); return; }
    if (!backlogScreen.el.classList.contains('hidden')) return;
    if (!gameMenu.el.classList.contains('hidden')) return;
    if (!saveLoadScreen.el.classList.contains('hidden')) return;
    if (settingsScreen.isVisible) return;
    gameMenu.onBacklog();
  } else if (e.deltaY > 0) {
    // Scroll down → close backlog, or advance dialogue
    if (!backlogScreen.el.classList.contains('hidden')) {
      backlogScreen.hide();
    } else if (engine.waiting && !engine.ended) {
      dialogueBox._handleClick();
    }
  }
}, { passive: true });

// ─── Auto / Skip helpers ────────────────────────────────
function toggleAuto() {
  if (skipMode) stopSkip(); // Properly clean up skip mode
  autoMode = !autoMode;
  updateQuickBtnStates();
  if (autoMode && dialogueBox.isComplete() && engine.waiting) {
    startAutoTimer();
  } else {
    clearAutoTimer();
  }
}

function stopAuto() {
  autoMode = false;
  clearAutoTimer();
  updateQuickBtnStates();
}

function startAutoTimer() {
  clearAutoTimer();
  // Snapshot the current callback ID so stale callbacks (from a previous auto cycle
  // that resolved after stopAuto() was called) can detect they are outdated and bail.
  const myCallbackId = ++_autoCallbackId;

  // Text completion wait: poll isComplete(), then wait autoSpeed (existing behavior)
  const textWait = new Promise((resolve) => {
    const check = setInterval(() => {
      if (dialogueBox.isComplete()) {
        clearInterval(check);
        autoTimerInterval = null;
        const t = setTimeout(resolve, config.get('autoSpeed'));
        autoTimerTimeout = t;
      }
    }, 100);
    autoTimerInterval = check;
  });

  // Voice wait: if voice is playing, wait for it + micro-delay (D-04, D-05)
  const voiceWait = currentVoicePromise
    ? currentVoicePromise.then(() => new Promise(r => setTimeout(r, VOICE_END_DELAY)))
    : null;

  // D-04: max(voiceDuration, textComplete + autoSpeed) — Promise.all = whoever is longer
  const waits = voiceWait ? [textWait, voiceWait] : [textWait];
  Promise.all(waits).then(() => {
    // Guard: if clearAutoTimer() was called since this cycle started, bail out
    if (myCallbackId !== _autoCallbackId) return;
    if (autoMode && engine.waiting) {
      engine.next();
    }
  });
}

function clearAutoTimer() {
  // Invalidate any in-flight startAutoTimer callbacks before clearing timers
  _autoCallbackId++;
  if (autoTimerInterval) {
    clearInterval(autoTimerInterval);
    autoTimerInterval = null;
  }
  if (autoTimerTimeout) {
    clearTimeout(autoTimerTimeout);
    autoTimerTimeout = null;
  }
}

function startSkip() {
  if (skipMode) return;
  skipMode = true;
  autoMode = false;
  clearAutoTimer();
  audio.stopVoice(); // Stop any playing voice immediately
  particles.clear();
  effectPacks.clear();
  updateQuickBtnStates();
  skipIndicator.classList.remove('hidden');

  // Mute current BGM (D-07)
  if (audio._bgm) {
    audio._bgm.volume = 0;
  }
  pendingBgm = undefined; // No BGM change pending yet

  // Start 30ms skip loop (D-01)
  skipTimer = setInterval(() => {
    if (!skipMode || engine.ended) {
      stopSkip();
      return;
    }
    if (engine.waiting) {
      engine.next();
    }
  }, 30);
}

function stopSkip() {
  if (!skipMode && !skipTimer) return;
  const wasSkipping = skipMode;
  skipMode = false;
  if (skipTimer) {
    clearInterval(skipTimer);
    skipTimer = null;
  }
  skipIndicator.classList.add('hidden');
  updateQuickBtnStates();
  if (wasSkipping) {
    restoreBgmAfterSkip();
    applyCurrentParticles();
    applyCurrentEffectPacks();
  }
}

function restoreBgmAfterSkip() {
  const master = config.get('masterVolume');
  const bgmVol = config.get('bgmVolume') * master;

  if (pendingBgm === undefined) {
    // No BGM change during skip — just unmute current
    if (audio._bgm) {
      audio._bgm.volume = bgmVol;
    }
  } else if (pendingBgm === null) {
    // stop_bgm was the final event during skip
    audio.stopBgm({ fadeOut: 0 });
  } else {
    // play_bgm was the final event — play the new track
    audio.stopBgm({ fadeOut: 0 });
    audio.playBgm(pendingBgm);
  }
  pendingBgm = undefined;
}

function toggleSkip() {
  if (skipMode) {
    stopSkip();
  } else {
    startSkip();
  }
}

function updateQuickBtnStates() {
  quickBar.setAutoActive(autoMode);
  quickBar.setSkipActive(skipMode);
}

// ─── Title screen ───────────────────────────────────────
async function showTitle() {
  cancelEndReturnTimer();
  cancelRuntimeVideo();
  galleryScreen.hide();
  await playOpeningVideo('before-title');
  const titleLayout = engine.script?.ui?.titleScreen;
  if (titleLayout?.bgm) {
    audio.playBgm({ file: titleLayout.bgm, volume: 1, loop: true });
  }
  try {
    const hasSaves = await saveManager.hasAnySave();
    const hasGallery = Object.keys(engine.script?.systems?.gallery?.cg ?? {}).length > 0
      || Object.keys(engine.script?.systems?.endings ?? {}).length > 0;
    titleScreen.show(hasSaves, hasGallery);
  } catch (e) {
    console.error('[GalgameMaker] Failed to check saves:', e);
    titleScreen.show(false, (
      Object.keys(engine.script?.systems?.gallery?.cg ?? {}).length > 0
      || Object.keys(engine.script?.systems?.endings ?? {}).length > 0
    ));
  }
}

titleScreen.onStart = async () => {
  if (titleStartPending) return;
  titleStartPending = true;
  cancelEndReturnTimer();
  titleScreen.hide();
  particles.clear();
  effectPacks.clear();
  audio.stopBgm();
  try {
    await playOpeningVideo('after-start');
    isPlaying = true;
    engine.startGame('start');
  } finally {
    titleStartPending = false;
  }
};

titleScreen.onContinue = () => {
  saveLoadScreen.show('load', 'title');
};

titleScreen.onSettings = () => {
  settingsScreen.show();
};

titleScreen.onGallery = async () => {
  try {
    const profile = await playerDataRepository?.load();
    galleryScreen.show(engine.script?.systems?.gallery?.cg ?? {}, profile?.unlocks?.cg ?? {}, {
      endings: engine.script?.systems?.endings ?? {},
      endingUnlocks: profile?.unlocks?.endings ?? {},
    });
  } catch (error) {
    console.error('[GalgameMaker] Failed to open gallery:', error);
    galleryScreen.show(engine.script?.systems?.gallery?.cg ?? {}, {}, {
      endings: engine.script?.systems?.endings ?? {},
      endingUnlocks: {},
    });
  }
};

titleScreen.onPlayOpeningVideo = async () => {
  await playOpeningVideo('manual', { replay: true });
};

galleryScreen.onEndingVideoReplay = (endingId) => {
  void playEndingVideo(endingId, { manual: true, replay: true });
};

// ─── Bootstrap — environment detection and conditional init ──
async function bootstrap() {
  const env = await detectEnvironment();
  console.log(`[GalgameMaker] Environment: ${env}`);

  // Set basePath on all components from assetPath module (per D-06)
  background.basePath = BASE_PATH;
  characters.basePath = BASE_PATH;
  audio.basePath = BASE_PATH;

  // Conditional SaveManager (per WEBRT-05)
  // Desktop uses IPC-based SaveManager (same contract as editor — per v0.8)
  if (env === 'electron' || env === 'desktop') {
    saveManager = new SaveManager();
  } else if (env === 'web') {
    saveManager = new WebSaveManager();
  }
  // preview mode: saveManager stays null (saves not used in editor preview)

  // Wire saveManager into SaveLoadScreen
  saveLoadScreen.saveManager = saveManager;

  if (env === 'preview') {
    initPreview();
  } else {
    init(env);
  }
}

// ─── Initialize ─────────────────────────────────────────
async function init(env) {
  console.log('[GalgameMaker] Initializing...');

  try {
    await engine.load(SCRIPT_PATH);

    const playerDataStorage = env === 'electron' || env === 'desktop'
      ? createIpcPlayerDataStorage(window.ipcRenderer)
      : createBrowserPlayerDataStorage({ saveManager });
    playerDataRepository = createPlayerDataRepositoryFromScript(engine.script, playerDataStorage);
    await playerDataRepository.load();
    engine.setPlayerDataRepository(playerDataRepository);
    saveManager?.setProjectId?.(engine.script.projectId);
    saveManager?.setPlayerDataRepository?.(playerDataRepository);
    readHistory = new ReadHistory(playerDataRepository);

    // Load custom fonts before any rendering (INFRA-02)
    if (engine.script.assets?.fonts?.length) {
      const fontResult = await loadAllFonts(engine.script.assets.fonts, BASE_PATH);
      if (fontResult.failed.length) {
        console.warn('[GalgameMaker] Some fonts failed to load:', fontResult.failed);
      }
    }

    // Set title screen name from script
    titleScreen.gameTitle = engine.script.meta?.title || '';

    // Apply custom title screen layout if defined in script
    if (engine.script.ui?.titleScreen) {
      titleScreen.setLayout(engine.script.ui.titleScreen);
    }

    // Apply custom settings screen layout if defined in script
    if (engine.script.ui?.settingsScreen) {
      settingsScreen.setLayout(engine.script.ui.settingsScreen);
    }

    // Apply widget styles for settings controls (v1.1 Phase 42)
    if (engine.script.ui?.widgetStyles) {
      settingsScreen.setWidgetStyles(engine.script.ui.widgetStyles);
      choiceMenu.setWidgetStyles(engine.script.ui.widgetStyles);
    }

    // Apply screen layouts (v1.1 Phase 43)
    if (engine.script.ui?.saveLoadScreen) {
      saveLoadScreen.setLayout(engine.script.ui.saveLoadScreen);
    }
    if (engine.script.ui?.backlogScreen) {
      backlogScreen.setLayout(engine.script.ui.backlogScreen);
    }
    if (engine.script.ui?.gameMenu) {
      gameMenu.setLayout(engine.script.ui.gameMenu);
    }

    // Apply theme-level icons (Phase 75 — ICO-01)
    const themeIcons = engine.script.ui?.theme?.icons;
    if (themeIcons) {
      saveLoadScreen.setThemeIcons(themeIcons);
      gameMenu.setThemeIcons(themeIcons);
      backlogScreen.setThemeIcons(themeIcons);
      settingsScreen.setThemeIcons(themeIcons);
      quickBar.setThemeIcons(themeIcons);
    }

    // Apply nameplate style (v1.1 Phase 45)
    if (engine.script.ui?.dialogueBox?.nameplateStyle) {
      dialogueBox.setNameplateStyle(engine.script.ui.dialogueBox.nameplateStyle);
    }

    // Apply theme token overrides (D-08: theme first, font settings can override)
    applyTheme(gameContainer, engine.script.ui?.theme);
    applyNineSlice(engine.script.ui?.theme);
    applyButtonFamilies(engine.script.ui?.theme);
    applyScreenBackgrounds(gameContainer, engine.script.ui);
    applyCursors(engine.script.ui?.theme);
    applyUiMotion(engine.script.ui?.motion);

    // Apply global dialogue box font settings if defined in script
    if (engine.script.ui?.dialogueBox) {
      dialogueBox.applyGlobalStyle(engine.script.ui.dialogueBox);
    }

    await showTitle();

    // Initialize quickload button state (D-13)
    const hasQuick = await saveManager.hasQuickSave();
    quickBar.setQuickLoadEnabled(hasQuick);

    // D-11: Show one-time migration toast if legacy saves were migrated
    if (saveManager._lastMigrationCount > 0) {
      showToast('检测到旧存档，已自动迁移');
    }

    console.log('[GalgameMaker] Ready!');
  } catch (err) {
    console.error('[GalgameMaker] Failed to initialize:', err);
    renderInitializationError(gameContainer, err);
  }
}

// ─── Preview mode (iframe) ─────────────────────────────
function initPreview() {
  console.log('[GalgameMaker] Preview mode — waiting for start command');

  async function handlePreviewMessage(e) {
    // Only accept messages from same origin (preview iframe)
    if (e.origin !== 'null' && e.origin !== window.location.origin) return;
    const msg = e.data;
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'start': {
        applyPreviewScriptSnapshot(msg);
        establishPreviewPageBaseline(msg);
        break;
      }
      case 'stop': {
        isPlaying = false;
        engine.ended = true;
        engine._previewMode = false;
        stopAuto();
        stopSkip();
        cancelRuntimeVideo();
        dialogueBox.hide();
        choiceMenu.hide();
        textInputScreen.hide();
        cancelPageTransitionGate();
        camera.clear();
        audio.stopBgm({ fadeOut: 0 });
        audio.stopVoice();
        engine.resetRenderState();
        characters.clear();
        background.clear();
        particles.clear();
        effectPacks.clear();
        break;
      }
      case 'mute': {
        if (msg.muted) {
          audio.setBgmVolume(0);
          audio.setSeVolume(0);
          audio.setVoiceVolume(0);
        } else {
          const master = config.get('masterVolume');
          audio.setBgmVolume(config.get('bgmVolume') * master);
          audio.setSeVolume(config.get('seVolume') * master);
          audio.setVoiceVolume(config.get('voiceVolume') * master);
        }
        break;
      }
      case 'update-theme': {
        applyTheme(gameContainer, msg.theme);
        applyNineSlice(msg.theme);
        applyButtonFamilies(msg.theme);
        applyScreenBackgrounds(gameContainer, engine.script.ui);
        applyCursors(msg.theme);
        // Theme icons may have changed
        const themeIcons = msg.theme?.icons;
        saveLoadScreen.setThemeIcons(themeIcons || null);
        gameMenu.setThemeIcons(themeIcons || null);
        backlogScreen.setThemeIcons(themeIcons || null);
        settingsScreen.setThemeIcons(themeIcons || null);
        quickBar.setThemeIcons(themeIcons || null);
        break;
      }
      case 'update-ui-motion': {
        applyUiMotion(msg.motion);
        break;
      }
      case 'update-widget-styles': {
        settingsScreen.setWidgetStyles(msg.widgetStyles);
        choiceMenu.setWidgetStyles(msg.widgetStyles);
        break;
      }
      case 'update-screen-layout': {
        const cfg = msg.config;
        switch (msg.screen) {
          case 'saveLoadScreen': saveLoadScreen.setLayout(cfg); break;
          case 'backlogScreen': backlogScreen.setLayout(cfg); break;
          case 'gameMenu': gameMenu.setLayout(cfg); break;
          case 'settingsScreen': settingsScreen.setLayout(cfg); break;
          case 'titleScreen': titleScreen.setLayout(cfg); break;
        }
        break;
      }
      case 'show-screen': {
        hidePreviewUiSurfaces();
        switch (msg.screenId) {
          case 'settingsScreen': settingsScreen.show(); break;
          case 'gameMenu': gameMenu.show(); break;
          case 'saveLoadScreen': saveLoadScreen.show('save', 'preview'); break;
          case 'backlogScreen': backlogScreen.show([], {}); break;
          case 'titleScreen': titleScreen.show(false); break;
        }
        break;
      }
      case 'show-dialogue-preview': {
        stopAuto();
        stopSkip();
        cancelPageTransitionGate();
        choiceMenu.hide();
        textInputScreen.hide();
        gameMenu.hide();
        saveLoadScreen.hide();
        backlogScreen.hide();
        settingsScreen.hide();
        titleScreen.hide();
        dialogueBox.hide();

        if (engine.script.ui?.dialogueBox) {
          dialogueBox.applyGlobalStyle(engine.script.ui?.dialogueBox);
          if (engine.script.ui.dialogueBox.nameplateStyle) {
            dialogueBox.setNameplateStyle(engine.script.ui.dialogueBox.nameplateStyle);
          }
        }

        dialogueBox.renderPreviewLine({
          speakerName: msg.speakerName,
          text: msg.text,
          speakerColor: msg.speakerColor,
        });
        break;
      }
      case 'show-choice-preview': {
        stopAuto();
        stopSkip();
        cancelPageTransitionGate();
        gameMenu.hide();
        saveLoadScreen.hide();
        backlogScreen.hide();
        settingsScreen.hide();
        titleScreen.hide();
        dialogueBox.hide();
        textInputScreen.hide();

        choiceMenu.show({
          prompt: msg.prompt,
          options: Array.isArray(msg.options) ? msg.options : [],
          previewOnly: true,
        });
        break;
      }
      case 'preview-effect': {
        if (previewRestorePending) {
          postEffectPreviewResult({
            requestId: msg.requestId,
            effectKind: msg.effectKind,
            status: 'rejected',
            reason: 'preview-busy',
          });
          break;
        }

        if (activeEffectPreview) {
          await cancelActiveEffectPreview('cancelled', null, 'superseded');
        }

        applyPreviewScriptSnapshot(msg);
        establishPreviewPageBaseline(msg);
        await runEffectPreview(msg);
        break;
      }
      case 'preview-effect-stop': {
        if (!activeEffectPreview) break;
        if (msg.requestId && msg.requestId !== activeEffectPreview.requestId) break;
        await cancelActiveEffectPreview('cancelled', null, 'stop');
        break;
      }
      case 'preview-ending-video': {
        if (msg.script) {
          applyPreviewScriptSnapshot(msg);
        }
        const outcome = await playEndingVideo(msg.endingId, {
          manual: true,
          preview: true,
          replay: true,
        });
        window.parent.postMessage({
          type: 'preview-ending-video-result',
          requestId: msg.requestId ?? null,
          endingId: msg.endingId ?? null,
          outcome: outcome?.type ?? null,
        }, '*');
        break;
      }
    }
  }

  window.addEventListener('message', handlePreviewMessage);

  // Ready handshake already sent by assetPath.js detectEnvironment().
  // If editor already responded with 'start' during detection, process immediately.
  if (_capturedStartMsg) {
    handlePreviewMessage({ data: _capturedStartMsg, origin: window.location.origin });
  }
}

// Bootstrap — detect environment and initialize
bootstrap();
