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

  it('edits choice page data and page media through unified authoring methods', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_choice_media',
        characters: {},
        scenes: {
          start: {
            pages: [
              {
                type: 'choice',
                prompt: '',
                options: [{ text: 'Old', target: null }],
              },
            ],
          },
        },
      },
    });

    expect(session.setChoicePage({
      sceneId: 'start',
      pageIndex: 0,
      prompt: 'Choose a path',
      options: [
        { text: 'Stay', target: null },
        { text: 'Go', target: null, setVariable: { courage: 1 } },
      ],
    })).toEqual({
      sceneId: 'start',
      pageIndex: 0,
      prompt: 'Choose a path',
      optionCount: 2,
    });

    expect(session.setPageMedia({
      sceneId: 'start',
      pageIndex: 0,
      background: 'backgrounds/menu.svg',
      bgm: { file: 'audio/menu.ogg', volume: 0.7 },
      se: null,
    })).toEqual({
      sceneId: 'start',
      pageIndex: 0,
      background: 'backgrounds/menu.svg',
      bgm: { file: 'audio/menu.ogg', volume: 0.7 },
      se: null,
    });

    expect(session.toJSON().scenes.start.pages[0]).toMatchObject({
      type: 'choice',
      prompt: 'Choose a path',
      background: 'backgrounds/menu.svg',
      bgm: { file: 'audio/menu.ogg', volume: 0.7 },
      se: null,
      options: [
        { text: 'Stay', target: null },
        { text: 'Go', target: null, effects: [{ type: 'var:add', id: 'courage', value: 1 }] },
      ],
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

  it('renames and deletes scenes safely while preserving scene references', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_scene_structure',
        characters: {},
        scenes: {
          start: {
            next: 'old_end',
            pages: [
              {
                type: 'choice',
                options: [{ text: 'Go', target: 'old_end' }],
              },
              {
                type: 'condition',
                trueTarget: 'old_end',
                falseTarget: 'retry',
                conditions: [],
              },
            ],
          },
          old_end: { name: 'Old End', pages: [] },
          retry: { name: 'Retry', pages: [] },
        },
      },
    });

    expect(session.renameScene({
      sceneId: 'old_end',
      newSceneId: 'good_end',
      name: 'Good End',
    })).toEqual({
      sceneId: 'old_end',
      newSceneId: 'good_end',
      updatedReferenceCount: 3,
    });

    const renamed = session.toJSON();
    expect(renamed.scenes.old_end).toBeUndefined();
    expect(renamed.scenes.good_end.name).toBe('Good End');
    expect(renamed.scenes.start.next).toBe('good_end');
    expect(renamed.scenes.start.pages[0].options[0].target).toBe('good_end');
    expect(renamed.scenes.start.pages[1].trueTarget).toBe('good_end');

    expect(() => session.deleteScene({ sceneId: 'retry' })).toThrow(/still referenced/);
    expect(session.deleteScene({ sceneId: 'retry', forceReferences: true })).toEqual({
      sceneId: 'retry',
      deletedSceneId: 'retry',
      removedReferenceCount: 1,
    });
    expect(session.toJSON().scenes.retry).toBeUndefined();
  });

  it('inspects, retargets, and clears scene references for branch repair', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_scene_references',
        characters: {},
        scenes: {
          start: {
            next: 'old_route',
            pages: [
              {
                type: 'choice',
                options: [{ text: 'Go', target: 'old_route' }],
              },
              {
                type: 'condition',
                trueTarget: 'old_route',
                falseTarget: 'fallback',
                conditions: [],
              },
            ],
          },
          old_route: { name: 'Old Route', pages: [] },
          new_route: { name: 'New Route', pages: [] },
          fallback: { name: 'Fallback', pages: [] },
        },
      },
    });

    expect(session.inspectSceneReferences({ sceneId: 'old_route' })).toMatchObject({
      sceneId: 'old_route',
      references: [
        { kind: 'scene-next', pathString: 'scenes.start.next' },
        { kind: 'choice-option', pathString: 'scenes.start.pages.0.options.0.target' },
        { kind: 'condition-true-target', pathString: 'scenes.start.pages.1.trueTarget' },
      ],
    });

    expect(session.retargetSceneReferences({
      fromSceneId: 'old_route',
      toSceneId: 'new_route',
    })).toMatchObject({
      fromSceneId: 'old_route',
      toSceneId: 'new_route',
      updatedReferenceCount: 3,
    });

    const retargeted = session.toJSON();
    expect(retargeted.scenes.start.next).toBe('new_route');
    expect(retargeted.scenes.start.pages[0].options[0].target).toBe('new_route');
    expect(retargeted.scenes.start.pages[1].trueTarget).toBe('new_route');

    expect(session.clearSceneReferences({ sceneId: 'new_route' })).toMatchObject({
      sceneId: 'new_route',
      clearedReferenceCount: 3,
    });
    const cleared = session.toJSON();
    expect(cleared.scenes.start.next).toBeNull();
    expect(cleared.scenes.start.pages[0].options[0].target).toBeNull();
    expect(cleared.scenes.start.pages[1].trueTarget).toBeNull();
  });

  it('removes and reorders pages without editing page payloads', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_page_structure',
        characters: {},
        scenes: {
          start: {
            pages: [
              { type: 'normal', dialogues: [{ text: 'A' }] },
              { type: 'choice', prompt: 'Pick', options: [] },
              { type: 'normal', dialogues: [{ text: 'B' }] },
            ],
          },
        },
      },
    });

    expect(session.movePage({ sceneId: 'start', fromIndex: 2, toIndex: 0 })).toEqual({
      sceneId: 'start',
      fromIndex: 2,
      toIndex: 0,
    });
    expect(session.removePage({ sceneId: 'start', pageIndex: 1 })).toEqual({
      sceneId: 'start',
      pageIndex: 1,
      removedPageType: 'normal',
    });

    expect(session.toJSON().scenes.start.pages).toEqual([
      { type: 'normal', dialogues: [{ text: 'B' }] },
      expect.objectContaining({ type: 'choice', prompt: 'Pick' }),
    ]);
  });

  it('authors title screen config through structured UI helpers', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_title_screen_authoring',
        characters: {},
        scenes: {},
      },
    });

    expect(session.setTitleScreen({
      background: 'ui/title/background.png',
      bgm: 'audio/title.ogg',
      elements: [
        { id: 'logo', type: 'text', content: 'Moonlit Letter', x: 640, y: 170, anchor: 'center' },
      ],
      merge: false,
    })).toMatchObject({
      uiPath: 'ui.titleScreen',
      screenId: 'titleScreen',
      elementCount: 1,
    });

    expect(session.addTitleElement({
      element: {
        id: 'start-button',
        type: 'button',
        label: 'Start',
        action: 'load',
        x: 640,
        y: 430,
        anchor: 'center',
        size: { width: 220, height: 52 },
      },
    })).toMatchObject({
      uiPath: 'ui.titleScreen',
      elementId: 'start-button',
      elementIndex: 1,
    });

    session.updateTitleElement({
      elementId: 'start-button',
      patch: { text: 'Begin', action: 'start' },
    });
    session.removeTitleElement({ elementId: 'logo' });

    const titleScreen = session.toJSON().ui.titleScreen;
    expect(titleScreen).toEqual({
      background: 'ui/title/background.png',
      bgm: 'audio/title.ogg',
      elements: [
        {
          id: 'start-button',
          type: 'button',
          text: 'Begin',
          action: 'start',
          x: 640,
          y: 430,
          anchor: 'center',
          width: 220,
          height: 52,
        },
      ],
    });
  });

  it('sets supported screen layout config while rejecting unsupported screen ids', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_screen_layout_authoring',
        characters: {},
        scenes: {},
        ui: {
          gameMenu: {
            panel: { width: 360, align: 'center' },
          },
        },
      },
    });

    expect(session.setScreenLayout({
      screenId: 'gameMenu',
      config: {
        panel: { background: 'rgba(0,0,0,0.7)' },
        buttons: { color: '#ffffff' },
      },
    })).toEqual({
      uiPath: 'ui.gameMenu',
      screenId: 'gameMenu',
    });
    expect(session.toJSON().ui.gameMenu).toEqual({
      panel: { width: 360, align: 'center', background: 'rgba(0,0,0,0.7)' },
      buttons: { color: '#ffffff' },
    });

    session.setScreenLayout({
      screenId: 'backlogScreen',
      config: { header: { title: 'History' } },
      merge: false,
    });
    expect(session.toJSON().ui.backlogScreen).toEqual({
      header: { title: 'History' },
    });

    expect(() => session.setScreenLayout({
      screenId: 'titleScreen',
      config: {},
    })).toThrow('Unsupported screen layout id: titleScreen');
  });

  it('authors shared UI config through structured helpers', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_shared_ui_authoring',
        characters: {},
        scenes: {},
        ui: {
          dialogueBox: {
            frame: { opacity: 0.7, padding: 18 },
          },
          theme: {
            tokens: { primary: '#223344' },
          },
          widgetStyles: {
            slider: { trackColor: '#222222' },
          },
        },
      },
    });

    expect(session.setDialogueBox({
      config: {
        frame: { backgroundImage: 'ui/dialogue/frame.png' },
        nameplateStyle: { color: '#ffffff' },
      },
    })).toEqual({
      uiPath: 'ui.dialogueBox',
    });
    expect(session.setTheme({
      config: {
        tokens: { accent: '#88ccff' },
        cursor: { default: 'ui/cursors/default.png' },
      },
    })).toEqual({
      uiPath: 'ui.theme',
    });
    expect(session.setWidgetStyles({
      config: {
        slider: { thumbColor: '#ffffff' },
        toggle: { onColor: '#88ccff' },
      },
      merge: false,
    })).toEqual({
      uiPath: 'ui.widgetStyles',
    });

    expect(session.toJSON().ui.dialogueBox).toEqual({
      frame: { opacity: 0.7, padding: 18, backgroundImage: 'ui/dialogue/frame.png' },
      nameplateStyle: { color: '#ffffff' },
    });
    expect(session.toJSON().ui.theme).toEqual({
      tokens: { primary: '#223344', accent: '#88ccff' },
      cursor: { default: 'ui/cursors/default.png' },
    });
    expect(session.toJSON().ui.widgetStyles).toEqual({
      slider: { thumbColor: '#ffffff' },
      toggle: { onColor: '#88ccff' },
    });

    expect(() => session.setTheme({ config: 'body { color: red; }' }))
      .toThrow('Theme config must be an object');
  });
});
