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
const backlogScreen = new BacklogScreen(gameContainer);
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
let isPlaying = false; // whether the game is actively playing (not on title)

// ─── Apply config ───────────────────────────────────────
function applyConfig() {
  audio.setBgmVolume(config.get('bgmVolume'));
  audio.setSeVolume(config.get('seVolume'));
  dialogueBox.typeSpeed = config.get('textSpeed');
}
applyConfig();

// ─── Engine event handlers ──────────────────────────────
engine.on('dialogue', (data) => {
  choiceMenu.hide();
  dialogueBox.show(data);

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
  isPlaying = false;
  stopAuto();
  stopSkip();
  dialogueBox.hide();
  audio.stopBgm({ fadeOut: 2000 });

  // Show ending for a moment, then return to title
  setTimeout(() => {
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

  // Re-render the current scene's commands up to the current point
  // For simplicity, we replay from the beginning of the scene
  replayCurrentScene();
};

function replayCurrentScene() {
  // Clear visual state
  characters.clear();
  background.clear();

  // The engine state is already restored; we need to re-execute the current
  // scene's commands up to the saved commandIndex to restore visuals
  const scene = engine.script.scenes[engine.currentScene];
  if (!scene) return;

  const targetIndex = engine.commandIndex;

  // Temporarily mute dialogue events to not show all past dialogues
  const originalWaiting = engine.waiting;

  // Re-execute all commands up to the target index instantly
  for (let i = 0; i < targetIndex; i++) {
    const cmd = scene.commands[i];
    if (!cmd) break;

    // Only re-execute visual/audio setup commands
    switch (cmd.type) {
      case 'set_background':
        background.setBackground({ ...cmd, transition: 'none', duration: 0 });
        break;
      case 'show_character': {
        const char = engine.script.characters[cmd.id];
        characters.show({
          id: cmd.id,
          expression: cmd.expression,
          position: cmd.position || 'center',
          transition: 'none',
          duration: 0,
          image: char?.expressions?.[cmd.expression] || '',
        });
        break;
      }
      case 'hide_character':
        characters.hide({ ...cmd, transition: 'none', duration: 0 });
        break;
      case 'set_expression': {
        const char = engine.script.characters[cmd.id];
        characters.setExpression({
          id: cmd.id,
          expression: cmd.expression,
          image: char?.expressions?.[cmd.expression] || '',
        });
        break;
      }
      case 'play_bgm':
        audio.playBgm({ ...cmd, fadeIn: 0 });
        break;
      case 'stop_bgm':
        audio.stopBgm({ fadeOut: 0 });
        break;
    }
  }

  // Now execute the actual current command
  engine.waiting = false;
  engine._executeCurrentCommand();
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
      gameMenu.toggle();
      break;
  }
});

// ─── Keyboard shortcuts ─────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (!isPlaying) return;

  switch (e.key) {
    case 'Escape':
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
  if (isPlaying) {
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
  // Wait for typewriter to finish, then wait autoSpeed before advancing
  const checkInterval = setInterval(() => {
    if (dialogueBox.isComplete()) {
      clearInterval(checkInterval);
      autoTimer = setTimeout(() => {
        if (autoMode && engine.waiting) {
          engine.next();
        }
      }, config.get('autoSpeed'));
    }
  }, 100);
  autoTimer = checkInterval;
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
  titleScreen.show(saveManager.hasAnySave());
}

titleScreen.onStart = () => {
  titleScreen.hide();
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

    // Set title screen name from script
    titleScreen.gameTitle = engine.script.meta.title;

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

init();
