import { describe, expect, it } from 'vitest';

import { createProjectSession } from '../src/authoring/projectSession.js';

describe('project authoring session', () => {
  it('builds a valid small VN script through the authoring API', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_authoring_test',
        characters: {},
        scenes: {},
      },
    });

    session.addCharacter({
      id: 'sakura',
      name: 'Sakura',
      expressions: {
        normal: 'characters/sakura_normal.svg',
        smile: 'characters/sakura_smile.svg',
      },
    });
    session.addVariable({
      id: 'affection',
      type: 'number',
      initial: 0,
      label: 'Affection',
    });
    session.addScene({ id: 'start', name: 'Start' });
    session.addScene({ id: 'good_end', name: 'Good End' });
    session.setSceneNext({ sceneId: 'start', next: 'good_end' });

    const normal = session.addNormalPage({
      sceneId: 'start',
      background: 'backgrounds/school.svg',
      characters: [
        { id: 'sakura', expression: 'normal', position: 'center', scale: 1 },
      ],
    });
    session.addDialogue({
      sceneId: 'start',
      pageIndex: normal.pageIndex,
      dialogue: { speaker: 'sakura', text: 'Hello.', expression: 'smile' },
    });
    session.setDialogue({
      sceneId: 'start',
      pageIndex: normal.pageIndex,
      dialogueIndex: 0,
      dialogue: { text: 'Hello again.' },
    });
    session.addDialogue({
      sceneId: 'start',
      pageIndex: normal.pageIndex,
      dialogue: { speaker: null, text: 'A second line.' },
    });
    session.moveDialogue({
      sceneId: 'start',
      pageIndex: normal.pageIndex,
      fromIndex: 1,
      toIndex: 0,
    });
    session.removeDialogue({
      sceneId: 'start',
      pageIndex: normal.pageIndex,
      dialogueIndex: 1,
    });
    session.setPageAudio({
      sceneId: 'start',
      pageIndex: normal.pageIndex,
      bgm: { file: 'audio/theme.mp3', volume: 0.5 },
      se: null,
    });

    const choice = session.addChoicePage({
      sceneId: 'start',
      prompt: 'Answer?',
      options: [
        {
          text: 'Be kind',
          target: 'good_end',
        },
      ],
    });
    session.addChoiceOption({
      sceneId: 'start',
      pageIndex: choice.pageIndex,
      option: {
        text: 'Stay',
        target: null,
      },
    });
    session.setChoiceOption({
      sceneId: 'start',
      pageIndex: choice.pageIndex,
      optionIndex: 1,
      option: {
        text: 'Stay here',
      },
    });
    session.moveChoiceOption({
      sceneId: 'start',
      pageIndex: choice.pageIndex,
      fromIndex: 1,
      toIndex: 0,
    });
    session.removeChoiceOption({
      sceneId: 'start',
      pageIndex: choice.pageIndex,
      optionIndex: 1,
    });
    session.addChoiceEffect({
      sceneId: 'start',
      pageIndex: choice.pageIndex,
      optionIndex: 0,
      effect: { type: 'var:add', id: 'affection', value: 1 },
    });

    session.addConditionPage({
      sceneId: 'good_end',
      conditions: [
        { variableId: 'affection', operator: '>=', value: 1 },
      ],
      trueTarget: null,
      falseTarget: null,
    });
    session.setConditionPage({
      sceneId: 'good_end',
      pageIndex: 0,
      condition: {
        conditionMode: 'any',
        falseTarget: 'start',
      },
    });

    const script = session.toJSON();
    expect(script.contractVersion).toBe(1);
    expect(script.scenes.start.next).toBe('good_end');
    expect(script.systems.variables.affection.initial).toBe(0);
    expect(script.scenes.start.pages[0].bgm).toEqual({ file: 'audio/theme.mp3', volume: 0.5 });
    expect(script.scenes.start.pages[0].se).toBeNull();
    expect(script.scenes.start.pages[0].dialogues[0]).toMatchObject({
      speaker: null,
      text: 'A second line.',
    });
    expect(script.scenes.start.pages[1].options[0]).toEqual({
      text: 'Stay here',
      target: null,
      effects: [
        { type: 'var:add', id: 'affection', value: 1 },
      ],
    });
    expect(script.scenes.good_end.pages[0]).toMatchObject({
      type: 'condition',
      conditionMode: 'any',
      falseTarget: 'start',
      conditions: [
        { variableId: 'affection', operator: '>=', value: 1 },
      ],
    });
    expect(session.validate()).toEqual({
      ok: true,
      errors: [],
      warnings: [],
    });
  });

  it('normalizes legacy choice and condition input while preserving unrelated data', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_authoring_test',
        characters: {},
        systems: {
          variables: {
            route_locked: { type: 'bool', initial: 'false' },
          },
        },
        scenes: {
          start: {
            name: 'Start',
            pages: [
              {
                type: 'choice',
                options: [
                  {
                    text: 'Legacy',
                    setVariable: { mood: 1 },
                  },
                ],
              },
              {
                type: 'condition',
                variable: 'route_locked',
                operator: '==',
                value: 'false',
              },
            ],
          },
        },
      },
    });

    const script = session.toJSON();
    expect(script.systems.variables.route_locked.initial).toBe(false);
    expect(script.scenes.start.pages[0].options[0]).toEqual({
      text: 'Legacy',
      effects: [
        { type: 'var:add', id: 'mood', value: 1 },
      ],
    });
    expect(script.scenes.start.pages[1]).toEqual({
      type: 'condition',
      conditionMode: 'all',
      conditions: [
        { variableId: 'route_locked', operator: '==', value: false },
      ],
      trueTarget: null,
      falseTarget: null,
    });
  });

  it('authors advanced staging fields through shared runtime contracts', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_advanced_authoring',
        characters: {
          sakura: {
            name: 'Sakura',
            expressions: { normal: 'characters/sakura_normal.svg' },
          },
        },
        scenes: {
          start: {
            pages: [
              {
                type: 'normal',
                characters: [{ id: 'sakura', expression: 'normal', position: 'center' }],
                dialogues: [{ speaker: 'sakura', text: 'Look.' }],
              },
            ],
          },
        },
      },
    });

    expect(session.setPageCamera({
      sceneId: 'start',
      pageIndex: 0,
      camera: { effect: 'shake', direction: 'both', intensity: 'high', durationMs: 450 },
    }).camera).toEqual({
      effect: 'shake',
      direction: 'both',
      intensity: 'high',
      durationMs: 450,
      trigger: 'onEnter',
    });
    expect(session.setPageTransition({
      sceneId: 'start',
      pageIndex: 0,
      transition: { type: 'dissolve', duration: 500 },
    }).transition).toEqual({ type: 'dissolve', duration: 500 });
    expect(session.setCharacterAnimation({
      sceneId: 'start',
      pageIndex: 0,
      characterId: 'sakura',
      animation: 'breathe',
    })).toEqual({
      sceneId: 'start',
      pageIndex: 0,
      characterId: 'sakura',
      animation: 'breathe',
    });

    expect(session.toJSON().scenes.start.pages[0]).toMatchObject({
      camera: { effect: 'shake', trigger: 'onEnter' },
      transition: { type: 'dissolve', duration: 500 },
      characters: [
        expect.objectContaining({ id: 'sakura', animation: 'breathe' }),
      ],
    });
  });
});
