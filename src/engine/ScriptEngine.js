/**
 * ScriptEngine — Core game script interpreter
 *
 * Loads JSON game scripts and executes commands sequentially.
 * Emits events for each command type so UI modules can react.
 *
 * Events emitted:
 *   'dialogue'        — { speaker, speakerName, speakerColor, text }
 *   'show_character'  — { id, expression, position, transition, duration, image }
 *   'hide_character'  — { id, transition, duration }
 *   'set_expression'  — { id, expression, image }
 *   'set_background'  — { image, transition, duration }
 *   'play_bgm'        — { file, volume, fadeIn }
 *   'stop_bgm'        — { fadeOut }
 *   'play_se'         — { file }
 *   'choice'          — { prompt, options }
 *   'end'             — {}
 *   'scene_enter'     — { sceneId, sceneName }
 */

import { EventEmitter } from './EventEmitter.js';

export class ScriptEngine extends EventEmitter {
  constructor() {
    super();

    /** @type {Object|null} Full script data */
    this.script = null;

    /** @type {string|null} Current scene ID */
    this.currentScene = null;

    /** @type {number} Current command index within the scene */
    this.commandIndex = 0;

    /** @type {Map<string, *>} Game variables (flags, affection, etc.) */
    this.variables = new Map();

    /** @type {boolean} Whether the engine is waiting for player input (choice, dialogue click) */
    this.waiting = false;

    /** @type {boolean} Whether the game has ended */
    this.ended = false;

    /** @type {Array<{speaker: string|null, speakerName: string|null, text: string}>} */
    this.history = [];
  }

  // ─── Loading ──────────────────────────────────────────────

  /**
   * Load a game script from a URL
   * @param {string} url
   */
  async load(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load script: ${res.status}`);
    this.script = await res.json();
    console.log(`[ScriptEngine] Loaded: "${this.script.meta.title}" v${this.script.meta.version}`);
  }

  // ─── Playback control ────────────────────────────────────

  /**
   * Start the game from a given scene (default: 'start')
   * @param {string} [sceneId='start']
   */
  startGame(sceneId = 'start') {
    this.variables.clear();
    this.history = [];
    this.ended = false;
    this._enterScene(sceneId);
  }

  /**
   * Advance to the next command. Call this when player clicks / taps.
   * No-op if the engine is not waiting for a click.
   */
  next() {
    if (this.ended) return;
    if (!this.waiting) return;
    this.waiting = false;
    this.commandIndex++;
    this._executeCurrentCommand();
  }

  /**
   * Handle a choice selection
   * @param {number} optionIndex
   */
  selectChoice(optionIndex) {
    if (this.ended) return;
    const cmd = this._currentCommand();
    if (!cmd || cmd.type !== 'choice') return;

    const option = cmd.options[optionIndex];
    if (!option) return;

    // Set variables from choice
    if (option.setVariable) {
      for (const [key, value] of Object.entries(option.setVariable)) {
        const current = this.variables.get(key) || 0;
        this.variables.set(key, current + value);
      }
    }

    this.waiting = false;

    // Jump to target scene
    if (option.jump) {
      this._enterScene(option.jump);
    } else {
      this.commandIndex++;
      this._executeCurrentCommand();
    }
  }

  // ─── Save / Restore state ────────────────────────────────

  /**
   * Get a serializable snapshot of the current game state
   */
  getState() {
    return {
      currentScene: this.currentScene,
      commandIndex: this.commandIndex,
      variables: Object.fromEntries(this.variables),
      history: [...this.history],
    };
  }

  /**
   * Restore from a saved state snapshot
   * @param {Object} state
   */
  restoreState(state) {
    this.currentScene = state.currentScene;
    this.commandIndex = state.commandIndex;
    this.variables = new Map(Object.entries(state.variables || {}));
    this.history = state.history || [];
    this.ended = false;
    this.waiting = false;
  }

  // ─── Internal ─────────────────────────────────────────────

  /**
   * Enter a scene and start executing from command 0
   * @param {string} sceneId
   * @private
   */
  _enterScene(sceneId) {
    const scene = this.script.scenes[sceneId];
    if (!scene) {
      console.error(`[ScriptEngine] Scene not found: ${sceneId}`);
      return;
    }
    this.currentScene = sceneId;
    this.commandIndex = 0;
    this.emit('scene_enter', { sceneId, sceneName: scene.name });
    this._executeCurrentCommand();
  }

  /**
   * @returns {Object|null} Current command object
   * @private
   */
  _currentCommand() {
    const scene = this.script.scenes[this.currentScene];
    if (!scene) return null;
    return scene.commands[this.commandIndex] || null;
  }

  /**
   * Execute the command at the current index. Auto-advances for non-blocking commands.
   * @private
   */
  _executeCurrentCommand() {
    const cmd = this._currentCommand();
    if (!cmd) {
      // Ran out of commands in this scene — treat as end
      console.log('[ScriptEngine] Scene ended (no more commands)');
      return;
    }

    switch (cmd.type) {
      case 'dialogue':
        this._execDialogue(cmd);
        break;
      case 'show_character':
        this._execShowCharacter(cmd);
        break;
      case 'hide_character':
        this._execHideCharacter(cmd);
        break;
      case 'set_expression':
        this._execSetExpression(cmd);
        break;
      case 'set_background':
        this._execSetBackground(cmd);
        break;
      case 'play_bgm':
        this._execPlayBgm(cmd);
        break;
      case 'stop_bgm':
        this._execStopBgm(cmd);
        break;
      case 'play_se':
        this._execPlaySe(cmd);
        break;
      case 'choice':
        this._execChoice(cmd);
        break;
      case 'jump':
        this._execJump(cmd);
        break;
      case 'set_variable':
        this._execSetVariable(cmd);
        break;
      case 'condition':
        this._execCondition(cmd);
        break;
      case 'end':
        this._execEnd();
        break;
      default:
        console.warn(`[ScriptEngine] Unknown command type: ${cmd.type}`);
        this.commandIndex++;
        this._executeCurrentCommand();
    }
  }

  // ─── Command executors ────────────────────────────────────

  _execDialogue(cmd) {
    const char = cmd.speaker ? this.script.characters[cmd.speaker] : null;
    const data = {
      speaker: cmd.speaker,
      speakerName: char?.name || null,
      speakerColor: char?.color || null,
      text: cmd.text,
      style: cmd.style || null,
    };
    this.history.push({
      speaker: cmd.speaker,
      speakerName: data.speakerName,
      text: cmd.text,
    });
    this.waiting = true;
    this.emit('dialogue', data);
  }

  _execShowCharacter(cmd) {
    const char = this.script.characters[cmd.id];
    this.emit('show_character', {
      id: cmd.id,
      expression: cmd.expression,
      position: cmd.position || 'center',
      x: cmd.x,
      y: cmd.y,
      scale: cmd.scale,
      transition: cmd.transition || 'fade',
      duration: cmd.duration || 500,
      image: char?.expressions?.[cmd.expression] || '',
    });
    // Auto-advance after brief delay
    this.commandIndex++;
    setTimeout(() => this._executeCurrentCommand(), 50);
  }

  _execHideCharacter(cmd) {
    this.emit('hide_character', {
      id: cmd.id,
      transition: cmd.transition || 'fade',
      duration: cmd.duration || 400,
    });
    this.commandIndex++;
    setTimeout(() => this._executeCurrentCommand(), 50);
  }

  _execSetExpression(cmd) {
    const char = this.script.characters[cmd.id];
    this.emit('set_expression', {
      id: cmd.id,
      expression: cmd.expression,
      image: char?.expressions?.[cmd.expression] || '',
    });
    this.commandIndex++;
    this._executeCurrentCommand();
  }

  _execSetBackground(cmd) {
    this.emit('set_background', {
      image: cmd.image,
      transition: cmd.transition || 'fade',
      duration: cmd.duration || 800,
    });
    // Wait for transition before advancing
    this.commandIndex++;
    setTimeout(() => this._executeCurrentCommand(), cmd.duration || 800);
  }

  _execPlayBgm(cmd) {
    this.emit('play_bgm', {
      file: cmd.file,
      volume: cmd.volume ?? 0.5,
      fadeIn: cmd.fadeIn || 0,
    });
    this.commandIndex++;
    this._executeCurrentCommand();
  }

  _execStopBgm(cmd) {
    this.emit('stop_bgm', {
      fadeOut: cmd.fadeOut || 0,
    });
    this.commandIndex++;
    this._executeCurrentCommand();
  }

  _execPlaySe(cmd) {
    this.emit('play_se', { file: cmd.file });
    this.commandIndex++;
    this._executeCurrentCommand();
  }

  _execChoice(cmd) {
    this.waiting = true;
    this.emit('choice', {
      prompt: cmd.prompt,
      options: cmd.options,
      layout: cmd.layout || 'default',
      style: cmd.style || null,
    });
  }

  _execJump(cmd) {
    this._enterScene(cmd.target);
  }

  _execSetVariable(cmd) {
    this.variables.set(cmd.name, cmd.value);
    this.commandIndex++;
    this._executeCurrentCommand();
  }

  _execCondition(cmd) {
    const val = this.variables.get(cmd.variable) ?? 0;
    let result = false;

    switch (cmd.operator) {
      case '==':  result = val === cmd.value; break;
      case '!=':  result = val !== cmd.value; break;
      case '>':   result = val > cmd.value;   break;
      case '>=':  result = val >= cmd.value;  break;
      case '<':   result = val < cmd.value;   break;
      case '<=':  result = val <= cmd.value;  break;
      default:
        console.warn(`[ScriptEngine] Unknown operator: ${cmd.operator}`);
    }

    const target = result ? cmd.trueJump : cmd.falseJump;
    if (target) {
      this._enterScene(target);
    } else {
      this.commandIndex++;
      this._executeCurrentCommand();
    }
  }

  _execEnd() {
    this.ended = true;
    this.emit('end', {});
  }
}
