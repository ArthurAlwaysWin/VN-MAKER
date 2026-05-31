import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ScriptEngine } from '../src/engine/ScriptEngine.js';

function makeEngine() {
  const engine = new ScriptEngine();
  engine.script = {
    characters: {},
    scenes: {
      start: {
        pages: [
          {
            type: 'normal',
            particles: { preset: 'sakura', density: 0.4 },
            dialogues: [{ speaker: null, text: 'A' }],
          },
          {
            type: 'normal',
            dialogues: [{ speaker: null, text: 'B' }],
          },
          {
            type: 'normal',
            particles: null,
            dialogues: [{ speaker: null, text: 'C' }],
          },
          {
            type: 'normal',
            particles: { preset: 'snow', speed: 0.8 },
            dialogues: [{ speaker: null, text: 'D' }],
          },
          {
            type: 'condition',
            trueTarget: 'start',
          },
        ],
      },
    },
  };
  return engine;
}

describe('particle runtime wiring', () => {
  it('ScriptEngine emits set_particles for explicit and inherited page configs', () => {
    const engine = makeEngine();
    const setEvents = [];
    const stopEvents = [];
    engine.on('set_particles', data => setEvents.push(data));
    engine.on('stop_particles', data => stopEvents.push(data));

    engine.startGame('start');
    engine.next();

    expect(setEvents).toHaveLength(2);
    expect(setEvents[0]).toMatchObject({
      sceneId: 'start',
      pageIndex: 0,
      config: { preset: 'sakura', density: 0.4 },
    });
    expect(setEvents[1]).toMatchObject({
      sceneId: 'start',
      pageIndex: 1,
      config: { preset: 'sakura' },
    });
    expect(stopEvents).toHaveLength(0);
  });

  it('ScriptEngine emits stop_particles for explicit stops and does not render condition pages', () => {
    const engine = makeEngine();
    const setEvents = [];
    const stopEvents = [];
    engine.on('set_particles', data => setEvents.push(data));
    engine.on('stop_particles', data => stopEvents.push(data));

    engine.currentScene = 'start';
    engine.pageIndex = 2;
    engine.renderCurrentPage();
    engine.pageIndex = 4;
    engine.renderCurrentPage();

    expect(stopEvents).toEqual([{ sceneId: 'start', pageIndex: 2 }]);
    expect(setEvents).toHaveLength(0);
  });

  it('restore/direct render produces effective particle event for inherited page', () => {
    const engine = makeEngine();
    engine.restoreState({
      currentScene: 'start',
      pageIndex: 1,
      dialogueIndex: 0,
      variables: {},
      history: [],
      expressionState: {},
    });

    const setEvents = [];
    engine.on('set_particles', data => setEvents.push(data));
    engine.renderCurrentPage();

    expect(setEvents[0]).toMatchObject({
      sceneId: 'start',
      pageIndex: 1,
      config: { preset: 'sakura' },
    });
  });

  it('main.js wires ParticleLayer into skip, reset, title, and engine events', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/main.js'), 'utf8');

    expect(src).toContain("import { ParticleLayer } from './ui/ParticleLayer.js';");
    expect(src).toContain('const particles = new ParticleLayer(stageLayer);');
    expect(src).toMatch(/engine\.on\('set_particles', \(\{ config \}\) => \{[\s\S]*particles\.play\(config\)/);
    expect(src).toMatch(/engine\.on\('stop_particles', \(\) => \{[\s\S]*particles\.stop\(\)/);
    expect(src).toMatch(/function startSkip\(\) \{[\s\S]*particles\.clear\(\)/);
    expect(src).toMatch(/function stopSkip\(\) \{[\s\S]*applyCurrentParticles\(\)/);
    expect(src).toMatch(/function replayCurrentPage\(\) \{[\s\S]*particles\.clear\(\)/);
    expect(src).not.toContain('ui?.titleScreen?.particles');
  });
});
