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

// Title screen is appended to the game container itself (z-index 100)
const titleScreen = new TitleScreen(gameContainer, '');

// Quick controls (Auto, Skip, Log, Menu)
const quickControls = document.createElement('div');
quickControls.id = 'quick-controls';
quickControls.innerHTML = `
  <button class="quick-btn" data-action="auto">AUTO</button>
  <button class="quick-btn" data-action="skip">SKIP</button>
  <button class="quick-btn" data-action="backlog">LOG</button>
  <button class="quick-btn" data-action="menu">MENU</button>
`;
dialogueLayer.appendChild(quickControls);

// ─── State ──────────────────────────────────────────────
let autoMode = false;
let skipMode = false;
let autoTimer = null;
let currentVoicePromise = null;
const VOICE_END_DELAY = 300;
let isPlaying = false; // whether the game is actively playing (not on title)

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
saveLoadScreen.onSave = (slot) => {
  const state = engine.getState();
  const lastDialogue = engine.history.length > 0
    ? engine.history[engine.history.length - 1].text
    : '';
  saveManager.save(slot, state, lastDialogue.substring(0, 60));
};

saveLoadScreen.onLoad = (slot) => {
  const data = saveManager.load(slot);
  if (!data) return;

  // Hide title screen if it's still showing (loading from "继续游戏")
  titleScreen.hide();

  engine.restoreState(data.state);
  isPlaying = true;

  // Re-render the current page's visual state
  replayCurrentPage();
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
gameMenu.onSave = () => saveLoadScreen.show('save');
gameMenu.onLoad = () => saveLoadScreen.show('load');
gameMenu.onBacklog = () => {
  const chars = engine.script?.characters || {};
  backlogScreen.show(engine.history, chars);
};
gameMenu.onSettings = () => settingsScreen.show();
gameMenu.onTitle = () => {
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
  showTitle();
};

// ─── Quick controls ─────────────────────────────────────
quickControls.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  switch (btn.dataset.action) {
    case 'auto':
      toggleAuto();
      break;
    case 'skip':
      toggleSkip();
      break;
    case 'backlog':
      gameMenu.onBacklog();
      break;
    case 'menu':
      if (!engine._previewMode) gameMenu.toggle();
      break;
  }
});

// ─── Keyboard shortcuts ─────────────────────────────────
document.addEventListener('keydown', (e) => {
  // D-09: Settings overlay ESC works regardless of play state
  if (e.key === 'Escape' && settingsScreen.isVisible) {
    settingsScreen.hide();
    return;
  }

  if (!isPlaying) return;

  switch (e.key) {
    case 'Escape':
      if (engine._previewMode) break;
      gameMenu.toggle();
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
      gameMenu.onBacklog();
      break;
  }
});

// ─── Click anywhere to advance (standard galgame behavior) ──────
gameContainer.addEventListener('click', (e) => {
  if (!isPlaying) return;
  if (engine.ended) return;

  // Don't interfere with UI element clicks
  const target = e.target;
  if (target.closest('#quick-controls')) return;
  if (target.closest('#choice-menu:not(.hidden)')) return;
  if (target.closest('#game-menu:not(.hidden)')) return;
  if (target.closest('#save-load-screen:not(.hidden)')) return;
  if (target.closest('#settings-screen:not(.hidden)')) return;
  if (target.closest('#backlog-screen:not(.hidden)')) return;
  if (target.closest('#title-screen:not(.hidden)')) return;

  // Advance dialogue
  if (engine.waiting) {
    dialogueBox._handleClick();
  }
});

// Right-click opens game menu
gameContainer.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (isPlaying && !engine._previewMode) {
    gameMenu.toggle();
  }
});

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

function toggleSkip() {
  skipMode = !skipMode;
  autoMode = false;
  updateQuickBtnStates();
  if (skipMode && engine.waiting) {
    engine.next();
  }
}

function stopSkip() {
  skipMode = false;
  updateQuickBtnStates();
}

function updateQuickBtnStates() {
  const autoBtn = quickControls.querySelector('[data-action="auto"]');
  const skipBtn = quickControls.querySelector('[data-action="skip"]');
  autoBtn.classList.toggle('active', autoMode);
  skipBtn.classList.toggle('active', skipMode);
}

// ─── Title screen ───────────────────────────────────────
function showTitle() {
  const titleLayout = engine.script?.ui?.titleScreen;
  if (titleLayout?.bgm) {
    audio.playBgm({ file: titleLayout.bgm, volume: 1, loop: true });
  }
  titleScreen.show(saveManager.hasAnySave());
}

titleScreen.onStart = () => {
  titleScreen.hide();
  audio.stopBgm();
  isPlaying = true;
  engine.startGame('start');
};

titleScreen.onContinue = () => {
  saveLoadScreen.show('load');
};

titleScreen.onSettings = () => {
  settingsScreen.show();
};

// ─── Initialize ─────────────────────────────────────────
async function init() {
  console.log('[GalgameMaker] Initializing...');

  try {
    await engine.load('/game/script.json');

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

    showTitle();
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
