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
import { ReadHistory } from './engine/ReadHistory.js';

// UI
import { DialogueBox } from './ui/DialogueBox.js';
import { CharacterLayer } from './ui/CharacterLayer.js';
import { BackgroundLayer } from './ui/BackgroundLayer.js';
import { ChoiceMenu } from './ui/ChoiceMenu.js';
import { SaveLoadScreen } from './ui/SaveLoadScreen.js';
import { BacklogScreen } from './ui/BacklogScreen.js';
import { SettingsScreen } from './ui/SettingsScreen.js';
import { TitleScreen } from './ui/TitleScreen.js';
import { GameMenu } from './ui/GameMenu.js';
import { QuickActionBar } from './ui/QuickActionBar.js';
import { loadAllFonts } from './engine/fontLoader.js';

// ─── DOM references ─────────────────────────────────────
const gameContainer = document.getElementById('game-container');
const bgLayer = document.getElementById('background-layer');
const charLayer = document.getElementById('character-layer');
const dialogueLayer = document.getElementById('dialogue-layer');
const uiOverlay = document.getElementById('ui-overlay');

// ─── Engine instances ───────────────────────────────────
const engine = new ScriptEngine();
const audio = new AudioManager('/game/');
const saveManager = new SaveManager();
const config = new ConfigManager();

// ─── UI instances ───────────────────────────────────────
const background = new BackgroundLayer(bgLayer, '/game/');
const characters = new CharacterLayer(charLayer, '/game/');
const dialogueBox = new DialogueBox(dialogueLayer);
const choiceMenu = new ChoiceMenu(uiOverlay);
// Settings, save/load, and backlog use gameContainer directly (not uiOverlay)
// so their z-index 200 is in the same stacking context as TitleScreen (z-index 100)
const saveLoadScreen = new SaveLoadScreen(gameContainer, saveManager);
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

// ─── State ──────────────────────────────────────────────
let autoMode = false;
let skipMode = false;
let autoTimer = null;
let skipTimer = null;
let pendingBgm = undefined; // undefined=no change, null=stopped, {file,volume,...}=new BGM
let readHistory = null;
let currentVoicePromise = null;
const VOICE_END_DELAY = 300;
let isPlaying = false; // whether the game is actively playing (not on title)

// ─── Toast notifications (D-11, D-12) ──────────────────
function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'game-toast';
  toast.textContent = message;
  toast.style.cssText = 'position:absolute;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:10px 24px;border-radius:6px;font-size:14px;z-index:9999;pointer-events:none;opacity:0;transition:opacity 0.3s;';
  gameContainer.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Preview text builder ───────────────────────────────
function buildPreviewText() {
  const page = engine._currentPage();
  if (page && page.type === 'choice') {
    const prompt = page.prompt || '';
    const opts = (page.options || []).map((o, i) => `${i + 1}.${o.text}`).join(' ');
    return `${prompt} ${opts}`.substring(0, 80);
  }
  const lastDialogue = engine.history.length > 0
    ? engine.history[engine.history.length - 1].text
    : '';
  return lastDialogue.substring(0, 60);
}

// ─── Screenshot capture (D-01, D-02, D-03) ─────────────
let cachedScreenshot = null;

async function captureGameScreenshot() {
  if (!window.ipcRenderer) return null; // iframe preview guard (D-13)

  // Hide dialogue box for cleaner screenshot (bar follows as DOM child)
  const dlgWasVisible = !dialogueBox.el?.classList.contains('hidden');
  dialogueBox.hide();

  // Wait one frame for DOM update
  await new Promise(r => requestAnimationFrame(r));

  const result = await window.ipcRenderer.invoke('capture-screenshot');

  // Restore UI immediately after capture
  if (dlgWasVisible) dialogueBox.el.classList.add('visible');

  if (!result.success) {
    console.error('[GalgameMaker] Screenshot failed:', result.error);
    return null;
  }

  return result.data;
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

// ─── Engine event handlers ──────────────────────────────
engine.on('dialogue', (data) => {
  choiceMenu.hide();

  // Inject per-page font override into dialogue data
  const currentPage = engine.script.scenes[engine.currentScene]?.pages[engine.pageIndex];
  data.fontOverride = currentPage?.fontOverride || null;

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
  // Skip mode
  if (skipMode) {
    setTimeout(() => engine.next(), 50);
  }
});

engine.on('show_character', (data) => characters.show(data));
engine.on('hide_character', (data) => characters.hide(data));
engine.on('set_expression', (data) => characters.setExpression(data));
engine.on('set_background', (data) => background.setBackground(data));
engine.on('play_bgm', (data) => audio.playBgm(data));
engine.on('stop_bgm', (data) => audio.stopBgm(data));
engine.on('play_se', (data) => audio.playSe(data));

engine.on('choice', (data) => {
  dialogueBox.hide();
  stopAuto();
  stopSkip();
  choiceMenu.show(data);
});

engine.on('end', () => {
  // In preview mode, notify editor instead of returning to title
  if (engine._previewMode) {
    isPlaying = false;
    stopAuto();
    stopSkip();
    dialogueBox.hide();
    audio.stopVoice();
    window.parent.postMessage({ type: 'ended' }, '*');
    return;
  }

  isPlaying = false;
  stopAuto();
  stopSkip();
  dialogueBox.hide();
  audio.stopBgm({ fadeOut: 2000 });
  audio.stopVoice();

  // Show ending for a moment, then return to title
  setTimeout(() => {
    engine.resetRenderState();
    characters.clear();
    background.clear();
    showTitle();
  }, 2000);
});

engine.on('scene_enter', (data) => {
  console.log(`[Scene] ${data.sceneId}: ${data.sceneName}`);
});

engine.on('page_enter', (data) => {
  if (!readHistory) return; // Guard for preview mode
  // Check read status BEFORE marking — critical ordering for SKIP-03
  const wasRead = readHistory.isRead(data.sceneId, data.pageIndex);

  // Always mark as read on page_enter (D-04)
  readHistory.markRead(data.sceneId, data.pageIndex);

  // Stop skip at unread pages in read-only mode (SKIP-03)
  if (skipMode && !wasRead && config.get('skipMode') === 'readOnly') {
    stopSkip();
  }
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

  // Hide title screen if it's still showing (loading from "继续游戏")
  titleScreen.hide();

  audio.stopVoice(); // Stop lingering voice from previous state
  engine.restoreState(data.state);
  isPlaying = true;

  // Re-render the current page's visual state
  replayCurrentPage();
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

function replayCurrentPage() {
  characters.clear();
  background.clear();
  engine.resetRenderState();
  engine.renderCurrentPage();
}

// ─── Settings ───────────────────────────────────────────
settingsScreen.onChange = () => {
  applyConfig();
};

// ─── Game menu wiring ───────────────────────────────────
gameMenu.onSave = async () => {
  cachedScreenshot = await captureGameScreenshot(); // D-03: capture before showing UI
  saveLoadScreen.show('save', 'menu');
};
gameMenu.onLoad = () => saveLoadScreen.show('load', 'menu');
gameMenu.onBacklog = () => {
  const chars = engine.script?.characters || {};
  backlogScreen.show(engine.history, chars);
};
gameMenu.onSettings = () => settingsScreen.show();
gameMenu.onTitle = async () => {
  isPlaying = false;
  stopAuto();
  stopSkip();
  dialogueBox.hide();
  choiceMenu.hide();
  audio.stopBgm({ fadeOut: 500 });
  audio.stopVoice();
  engine.resetRenderState();
  characters.clear();
  background.clear();
  await showTitle();
};

// ─── Quick action bar wiring ────────────────────────────
quickBar.onAuto = () => toggleAuto();
quickBar.onSkip = () => toggleSkip();
quickBar.onBacklog = () => {
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
  stopAuto();
  stopSkip();
  titleScreen.hide();
  audio.stopVoice();
  engine.restoreState(data.state);
  isPlaying = true;
  replayCurrentPage();
  showToast('快速读档完成');
};
quickBar.onSettings = () => {
  stopAuto();
  stopSkip();
  settingsScreen.show();
};

// ─── Keyboard shortcuts ─────────────────────────────────
document.addEventListener('keydown', (e) => {
  // ESC priority chain — overlays first, regardless of play state or preview mode
  if (e.key === 'Escape') {
    if (!saveLoadScreen.el.classList.contains('hidden')) { saveLoadScreen.hide(); return; }
    if (settingsScreen.isVisible) { settingsScreen.hide(); return; }
    if (!backlogScreen.el.classList.contains('hidden')) { backlogScreen.hide(); return; }
    if (!gameMenu.el.classList.contains('hidden')) { gameMenu.hide(); return; }
  }

  if (!isPlaying) return;

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

  // Don't interfere with UI element clicks
  const target = e.target;
  if (target.closest('#quick-action-bar')) return;
  if (target.closest('#choice-menu')) return;
  if (target.closest('#game-menu')) return;
  if (target.closest('#save-load-screen')) return;
  if (target.closest('#settings-screen')) return;
  if (target.closest('#backlog-screen')) return;
  if (target.closest('#title-screen')) return;

  // Advance dialogue
  if (engine.waiting) {
    dialogueBox._handleClick();
  }
});

// Right-click: close overlays, or toggle dialogue box visibility
gameContainer.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!isPlaying) return;

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
  autoMode = !autoMode;
  skipMode = false;
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

  // Text completion wait: poll isComplete(), then wait autoSpeed (existing behavior)
  const textWait = new Promise((resolve) => {
    const check = setInterval(() => {
      if (dialogueBox.isComplete()) {
        clearInterval(check);
        const t = setTimeout(resolve, config.get('autoSpeed'));
        autoTimer = t;
      }
    }, 100);
    autoTimer = check;
  });

  // Voice wait: if voice is playing, wait for it + micro-delay (D-04, D-05)
  const voiceWait = currentVoicePromise
    ? currentVoicePromise.then(() => new Promise(r => setTimeout(r, VOICE_END_DELAY)))
    : null;

  // D-04: max(voiceDuration, textComplete + autoSpeed) — Promise.all = whoever is longer
  const waits = voiceWait ? [textWait, voiceWait] : [textWait];
  Promise.all(waits).then(() => {
    if (autoMode && engine.waiting) {
      engine.next();
    }
  });
}

function clearAutoTimer() {
  if (autoTimer) {
    clearInterval(autoTimer);
    clearTimeout(autoTimer);
    autoTimer = null;
  }
}

function startSkip() {
  if (skipMode) return;
  skipMode = true;
  autoMode = false;
  clearAutoTimer();
  audio.stopVoice(); // Stop any playing voice immediately
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
  const titleLayout = engine.script?.ui?.titleScreen;
  if (titleLayout?.bgm) {
    audio.playBgm({ file: titleLayout.bgm, volume: 1, loop: true });
  }
  const hasSaves = await saveManager.hasAnySave();
  titleScreen.show(hasSaves);
}

titleScreen.onStart = () => {
  titleScreen.hide();
  audio.stopBgm();
  isPlaying = true;
  engine.startGame('start');
};

titleScreen.onContinue = () => {
  saveLoadScreen.show('load', 'title');
};

titleScreen.onSettings = () => {
  settingsScreen.show();
};

// ─── Initialize ─────────────────────────────────────────
async function init() {
  console.log('[GalgameMaker] Initializing...');

  try {
    await engine.load('/game/script.json');

    // ReadHistory — cross-save shared read tracking (D-03, D-12)
    readHistory = new ReadHistory(engine.script.meta.title || 'untitled');

    // Load custom fonts before any rendering (INFRA-02)
    if (engine.script.assets?.fonts?.length) {
      const fontResult = await loadAllFonts(engine.script.assets.fonts, 'asset://');
      if (fontResult.failed.length) {
        console.warn('[GalgameMaker] Some fonts failed to load:', fontResult.failed);
      }
    }

    // Set title screen name from script
    titleScreen.gameTitle = engine.script.meta.title;

    // Apply custom title screen layout if defined in script
    if (engine.script.ui?.titleScreen) {
      titleScreen.setLayout(engine.script.ui.titleScreen);
    }

    // Apply custom settings screen layout if defined in script
    if (engine.script.ui?.settingsScreen) {
      settingsScreen.setLayout(engine.script.ui.settingsScreen);
    }

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
    gameContainer.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ff6b6b;font-size:18px;padding:40px;text-align:center;">
        加载游戏失败<br /><small style="color:#888;margin-top:8px;">${err.message}</small>
      </div>
    `;
  }
}

// ─── Preview mode (iframe) ─────────────────────────────
function initPreview() {
  console.log('[GalgameMaker] Preview mode — waiting for start command');

  // Editor projects use asset:// protocol for resource files
  background.basePath = 'asset://';
  characters.basePath = 'asset://';
  audio.basePath = 'asset://';

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'start': {
        engine.script = msg.script;
        engine._previewMode = msg.previewMode ?? true;

        // Apply custom fonts if present
        if (engine.script.assets?.fonts?.length) {
          loadAllFonts(engine.script.assets.fonts, 'asset://').catch(() => {});
        }

        // Apply global dialogue box font settings for preview
        if (engine.script.ui?.dialogueBox) {
          dialogueBox.applyGlobalStyle(engine.script.ui.dialogueBox);
        }

        // Start from specified position (per D-05, D-06)
        engine.restoreState({
          currentScene: msg.sceneId || 'start',
          pageIndex: msg.pageIndex || 0,
          dialogueIndex: 0,
          variables: {},
          history: [],
        });

        titleScreen.hide();
        isPlaying = true;

        characters.clear();
        background.clear();
        engine.resetRenderState();
        engine.renderCurrentPage();
        break;
      }
      case 'stop': {
        isPlaying = false;
        engine.ended = true;
        engine._previewMode = false;
        stopAuto();
        stopSkip();
        dialogueBox.hide();
        choiceMenu.hide();
        audio.stopBgm({ fadeOut: 0 });
        audio.stopVoice();
        engine.resetRenderState();
        characters.clear();
        background.clear();
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
    }
  });

  // READY handshake (per D-03) — tell editor we're ready to receive commands
  window.parent.postMessage({ type: 'ready' }, '*');
}

// Detect iframe context and choose init path
if (window.parent !== window) {
  initPreview();
} else {
  init();
}
