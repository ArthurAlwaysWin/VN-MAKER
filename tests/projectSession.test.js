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

  it('authors M1 variable registry, affection presets, and choice-effect branches through one session contract', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_m1_authoring',
        characters: {
          sakura: { name: 'Sakura', expressions: {} },
        },
        systems: {
          variables: {
            affection: { type: 'number', initial: 1, label: 'Affection' },
            route_open: { type: 'bool', initial: false, label: 'Route Open' },
          },
        },
        scenes: {
          start: {
            pages: [
              {
                type: 'choice',
                prompt: 'Answer?',
                options: [
                  {
                    text: 'Be kind',
                    effects: [{ type: 'var:add', id: 'affection', value: 1 }],
                  },
                ],
              },
              {
                type: 'condition',
                conditionMode: 'all',
                conditions: [{ variableId: 'affection', operator: '>=', value: 2 }],
                trueTarget: null,
                falseTarget: null,
              },
            ],
          },
        },
      },
    });

    expect(session.addAffectionVariable({
      characterId: 'sakura',
      id: 'sakura_bond',
      label: 'Sakura Bond',
      min: 0,
      max: 10,
      step: 1,
    })).toMatchObject({
      variableId: 'sakura_bond',
      characterId: 'sakura',
      changedPaths: ['systems.variables.sakura_bond'],
    });
    expect(session.updateVariable({
      variableId: 'sakura_bond',
      patch: { initial: 3, group: 'Route Scores' },
    })).toEqual({ variableId: 'sakura_bond' });

    expect(session.renameVariable({
      variableId: 'affection',
      newVariableId: 'sakura_affection',
    })).toMatchObject({
      variableId: 'affection',
      newVariableId: 'sakura_affection',
      updatedReferenceCount: 2,
      changedPaths: expect.arrayContaining([
        'systems.variables.affection',
        'systems.variables.sakura_affection',
        'scenes.start.pages.0.options.0.effects.0',
        'scenes.start.pages.1.conditions.0',
      ]),
    });

    expect(session.setChoiceEffect({
      sceneId: 'start',
      pageIndex: 0,
      optionIndex: 0,
      effectIndex: 0,
      effect: { type: 'var:set', id: 'route_open', value: true },
    })).toEqual({
      sceneId: 'start',
      pageIndex: 0,
      optionIndex: 0,
      effectIndex: 0,
      effect: { type: 'var:set', id: 'route_open', value: true },
    });
    expect(session.removeChoiceEffect({
      sceneId: 'start',
      pageIndex: 0,
      optionIndex: 0,
      effectIndex: 0,
    })).toMatchObject({
      removedEffect: { type: 'var:set', id: 'route_open', value: true },
    });
    expect(() => session.deleteVariable({ variableId: 'sakura_affection' })).toThrow(/still referenced/);
    expect(session.deleteVariable({
      variableId: 'sakura_affection',
      forceReferences: true,
    })).toMatchObject({
      deletedVariableId: 'sakura_affection',
      deletedReferenceCount: 1,
      changedPaths: expect.arrayContaining([
        'systems.variables.sakura_affection',
        'scenes.start.pages.1.conditions.0',
      ]),
    });

    const script = session.toJSON();
    expect(script.systems.variables.sakura_bond).toMatchObject({
      type: 'number',
      initial: 3,
      label: 'Sakura Bond',
      group: 'Route Scores',
      kind: 'affection',
      characterId: 'sakura',
      min: 0,
      max: 10,
      step: 1,
    });
    expect(script.scenes.start.pages[0].options[0].effects).toBeUndefined();
    expect(script.scenes.start.pages[1].conditions).toEqual([]);
  });

  it('authors M2 endings and unlock effects through one session contract', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_m2_authoring',
        characters: {},
        systems: {
          endings: {
            normal_end: { title: 'Normal End', order: 2 },
          },
        },
        scenes: {
          start: {
            pages: [
              {
                type: 'choice',
                prompt: 'Finish?',
                options: [{ text: 'End', target: null }],
              },
            ],
          },
        },
      },
    });

    expect(session.addEnding({
      id: 'good_end',
      title: 'Good End',
      category: 'romance',
      order: 1,
      description: 'Sakura route clear.',
      thumbnail: 'ui/endings/good.png',
      hiddenUntilUnlocked: true,
    })).toEqual({
      endingId: 'good_end',
      changedPaths: ['systems.endings.good_end'],
    });
    expect(session.updateEnding({
      endingId: 'normal_end',
      patch: { category: 'main', description: 'Default route.' },
    })).toEqual({
      endingId: 'normal_end',
      changedPaths: ['systems.endings.normal_end'],
    });
    expect(session.addEndingUnlock({
      sceneId: 'start',
      pageIndex: 0,
      optionIndex: 0,
      endingId: 'good_end',
    })).toEqual({
      sceneId: 'start',
      pageIndex: 0,
      optionIndex: 0,
      effectIndex: 0,
      endingId: 'good_end',
      changedPaths: ['scenes.start.pages.0.options.0.effects.0'],
    });
    expect(() => session.removeEnding({ endingId: 'good_end' })).toThrow(/still referenced/);
    expect(session.removeEnding({
      endingId: 'good_end',
      forceReferences: true,
    })).toMatchObject({
      deletedEndingId: 'good_end',
      deletedReferenceCount: 1,
      changedPaths: [
        'systems.endings.good_end',
        'scenes.start.pages.0.options.0.effects.0',
      ],
    });

    const script = session.toJSON();
    expect(script.systems.endings.normal_end).toMatchObject({
      title: 'Normal End',
      category: 'main',
      order: 2,
      description: 'Default route.',
      hiddenUntilUnlocked: false,
    });
    expect(script.scenes.start.pages[0].options[0].effects).toBeUndefined();
    expect(session.listEndings()).toEqual([
      expect.objectContaining({ endingId: 'normal_end', title: 'Normal End' }),
    ]);
  });

  it('authors M3 CG gallery entries and unlock effects through one session contract', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_m3_authoring',
        scenes: {
          start: {
            pages: [{ type: 'choice', options: [{ text: 'View memory' }] }],
          },
        },
      },
    });

    expect(session.addCg({
      id: 'cg_confession',
      title: 'Confession',
      images: ['backgrounds/cg/confession.png'],
      thumbnail: 'backgrounds/cg/confession_thumb.png',
      lockedThumbnail: 'ui/gallery/locked.png',
      category: 'route',
      order: 1,
    })).toEqual({
      cgId: 'cg_confession',
      changedPaths: ['systems.gallery.cg.cg_confession'],
    });
    expect(session.addCgUnlock({
      sceneId: 'start',
      pageIndex: 0,
      optionIndex: 0,
      cgId: 'cg_confession',
    })).toMatchObject({
      cgId: 'cg_confession',
      changedPaths: ['scenes.start.pages.0.options.0.effects.0'],
    });
    expect(() => session.removeCg({ cgId: 'cg_confession' })).toThrow(/still referenced/);
    expect(session.listCgs()).toEqual([
      expect.objectContaining({ cgId: 'cg_confession', title: 'Confession' }),
    ]);

    expect(session.removeCg({ cgId: 'cg_confession', forceReferences: true })).toMatchObject({
      deletedCgId: 'cg_confession',
      deletedReferenceCount: 1,
      changedPaths: [
        'systems.gallery.cg.cg_confession',
        'scenes.start.pages.0.options.0.effects.0',
      ],
    });
    expect(session.toJSON().scenes.start.pages[0].options[0].effects).toBeUndefined();
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
    })).toMatchObject({
      transition: { type: 'dissolve', duration: 500 },
      changedPaths: ['scenes.start.pages.0.transition'],
    });
    expect(session.setCharacterAnimation({
      sceneId: 'start',
      pageIndex: 0,
      characterId: 'sakura',
      animation: 'breathe',
    })).toMatchObject({
      sceneId: 'start',
      pageIndex: 0,
      characterId: 'sakura',
      animation: 'breathe',
      changedPaths: ['scenes.start.pages.0.characters.0.animation'],
    });

    expect(session.setPageCamera({
      sceneId: 'start',
      pageIndex: 0,
      camera: { effect: 'flash', durationMs: 50000, intensity: 'medium' },
    })).toMatchObject({
      camera: { effect: 'flash', durationMs: 2000 },
      changedPaths: ['scenes.start.pages.0.camera'],
    });

    expect(session.toJSON().scenes.start.pages[0]).toMatchObject({
      camera: { effect: 'flash', durationMs: 2000, trigger: 'onEnter' },
      transition: { type: 'dissolve', duration: 500 },
      characters: [
        expect.objectContaining({ id: 'sakura', animation: 'breathe' }),
      ],
    });

    session.addNormalPage({
      sceneId: 'start',
      transition: { type: 'iris-in', duration: 50000 },
    });
    expect(session.toJSON().scenes.start.pages[1].transition).toEqual({
      type: 'iris-in',
      duration: 5000,
    });
  });

  it('bulk applies page transitions with bounded structural selectors', () => {
    const session = createProjectSession({
      script: {
        projectId: 'gm_bulk_transitions',
        characters: {},
        scenes: {
          start: {
            pages: [
              { type: 'normal', background: 'backgrounds/gate.png', dialogues: [] },
              { type: 'normal', background: '', dialogues: [] },
              { type: 'choice', background: 'backgrounds/menu.png', options: [] },
              { type: 'normal', background: 'backgrounds/room.png', dialogues: [] },
            ],
          },
        },
      },
    });

    expect(session.setPageTransitions({
      sceneId: 'start',
      fromPageIndex: 0,
      toPageIndex: 2,
      pageType: 'normal',
      hasBackground: true,
      transition: { type: 'dissolve', duration: 650 },
    })).toMatchObject({
      matchedPageIndexes: [0],
      changedPaths: ['scenes.start.pages.0.transition'],
      transition: { type: 'dissolve', duration: 650 },
    });

    expect(session.setPageTransitions({
      sceneId: 'start',
      pageType: 'normal',
      hasBackground: true,
      transition: { type: 'blur', duration: 9000 },
    })).toMatchObject({
      matchedPageIndexes: [0, 3],
      changedPaths: [
        'scenes.start.pages.0.transition',
        'scenes.start.pages.3.transition',
      ],
      transition: { type: 'blur', duration: 5000 },
    });

    expect(session.toJSON().scenes.start.pages.map(page => page.transition ?? null)).toEqual([
      { type: 'blur', duration: 5000 },
      null,
      null,
      { type: 'blur', duration: 5000 },
    ]);
    expect(() => session.setPageTransitions({
      sceneId: 'start',
      pageType: 'video',
      transition: { type: 'fade', duration: 800 },
    })).toThrow('Unsupported page type filter: video');
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
