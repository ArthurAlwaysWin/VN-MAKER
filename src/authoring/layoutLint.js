const DEFAULT_DIALOGUE_TEXT_LIMIT = 120;
const DEFAULT_CHOICE_TEXT_LIMIT = 48;
const KNOWN_POSITIONS = new Set(['left', 'center', 'right']);

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function pathToString(path) {
  return path.map((part) => String(part)).join('.');
}

function createSuggestedAction(code, details = {}) {
  const pageArgs = details.sceneId && Number.isInteger(details.pageIndex)
    ? ['--scene', details.sceneId, '--page', String(details.pageIndex)]
    : [];

  if (code === 'layout-blank-page') {
    return {
      summary: 'Add visible page content before previewing.',
      commands: [
        { command: 'set-page-background', args: [...pageArgs, '--background', '<asset-path>'] },
        { command: 'set-page-characters', args: [...pageArgs, '--preset', 'solo-center', '--character', '<character-id>'] },
        { command: 'add-dialogue', args: [...pageArgs, '--text', '<dialogue>'] },
      ],
    };
  }

  if (code === 'layout-dialogue-on-blank-stage') {
    return {
      summary: 'Stage the dialogue with a background or at least one character.',
      commands: [
        { command: 'set-page-background', args: [...pageArgs, '--background', '<asset-path>'] },
        { command: 'set-page-characters', args: [...pageArgs, '--preset', 'solo-center', '--character', '<character-id>'] },
      ],
    };
  }

  if (code === 'layout-too-many-characters' || code === 'layout-overlapping-character-position') {
    return {
      summary: 'Restage the page with a named blocking preset or explicit non-overlapping coordinates.',
      commands: [
        { command: 'set-page-characters', args: [...pageArgs, '--preset', 'duo-left-right', '--character', '<left-id>', '--character', '<right-id>'] },
      ],
    };
  }

  if (code === 'layout-dialogue-text-overflow-risk') {
    return {
      summary: 'Shorten this dialogue line or split it into multiple dialogue entries.',
      commands: [
        { command: 'set-dialogue', args: [...pageArgs, '--dialogue-index', String(details.dialogueIndex ?? '<index>'), '--text', '<shorter text>'] },
        { command: 'add-dialogue', args: [...pageArgs, '--text', '<continued text>'] },
      ],
    };
  }

  if (code === 'layout-choice-missing-prompt') {
    return {
      summary: 'Add prompt text to explain what the player is choosing.',
      commands: [],
      note: 'Choice prompt editing is not yet covered by a dedicated CLI mutation; use add-page for new choices or projectSession for existing pages.',
    };
  }

  if (code === 'layout-too-many-choice-options') {
    return {
      summary: 'Reduce the visible choice count or split the choice into another page.',
      commands: [
        { command: 'remove-choice-option', args: [...pageArgs, '--option', '<index>'] },
        { command: 'move-choice-option', args: [...pageArgs, '--from', '<index>', '--to', '<index>'] },
      ],
    };
  }

  if (code === 'layout-choice-text-overflow-risk') {
    return {
      summary: 'Shorten this option label so it scans cleanly in the choice menu.',
      commands: [
        { command: 'set-choice-option', args: [...pageArgs, '--option', String(details.optionIndex ?? '<index>'), '--text', '<shorter label>'] },
      ],
    };
  }

  return {
    summary: 'Review this page in the editor or preview and adjust the layout.',
    commands: [],
  };
}

function createWarning(code, message, path = [], details = {}) {
  const location = {
    sceneId: details.sceneId ?? null,
    pageIndex: Number.isInteger(details.pageIndex) ? details.pageIndex : null,
  };

  return {
    severity: 'warning',
    code,
    message,
    path,
    pathString: pathToString(path),
    location,
    suggestedAction: createSuggestedAction(code, details),
    ...details,
  };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getPositionKey(character = {}) {
  if (KNOWN_POSITIONS.has(character.position)) {
    return `position:${character.position}`;
  }

  if (Number.isFinite(character.x)) {
    return `x:${Math.round(character.x)}`;
  }

  return character.position ? `position:${character.position}` : 'position:center';
}

function lintCharacterLayout(page, context, warnings) {
  const characters = Array.isArray(page.characters) ? page.characters : [];
  const pagePath = ['scenes', context.sceneId, 'pages', context.pageIndex];

  if (characters.length > 3) {
    warnings.push(createWarning(
      'layout-too-many-characters',
      'Page stages more than 3 characters; use a simpler blocking preset or custom coordinates.',
      [...pagePath, 'characters'],
      { sceneId: context.sceneId, pageIndex: context.pageIndex, characterCount: characters.length },
    ));
  }

  const byPosition = new Map();
  characters.forEach((character, characterIndex) => {
    if (!isPlainObject(character)) {
      return;
    }

    const key = getPositionKey(character);
    const previous = byPosition.get(key);
    if (previous != null) {
      warnings.push(createWarning(
        'layout-overlapping-character-position',
        `Characters share the same stage position "${key.replace(/^position:/, '')}".`,
        [...pagePath, 'characters', characterIndex, 'position'],
        {
          sceneId: context.sceneId,
          pageIndex: context.pageIndex,
          characterId: character.id ?? null,
          previousCharacterIndex: previous,
          positionKey: key,
        },
      ));
      return;
    }

    byPosition.set(key, characterIndex);
  });
}

function lintNormalPage(page, context, warnings, options) {
  const pagePath = ['scenes', context.sceneId, 'pages', context.pageIndex];
  const dialogues = Array.isArray(page.dialogues) ? page.dialogues : [];
  const hasVisual = isNonEmptyString(page.background) || (Array.isArray(page.characters) && page.characters.length > 0);

  if (!hasVisual && dialogues.length === 0) {
    warnings.push(createWarning(
      'layout-blank-page',
      'Normal page has no background, characters, or dialogue.',
      pagePath,
      { sceneId: context.sceneId, pageIndex: context.pageIndex },
    ));
  }

  if (!hasVisual && dialogues.length > 0) {
    warnings.push(createWarning(
      'layout-dialogue-on-blank-stage',
      'Normal page has dialogue but no background or staged characters.',
      pagePath,
      { sceneId: context.sceneId, pageIndex: context.pageIndex },
    ));
  }

  dialogues.forEach((dialogue, dialogueIndex) => {
    const text = dialogue?.text ?? '';
    if (typeof text === 'string' && text.length > options.dialogueTextLimit) {
      warnings.push(createWarning(
        'layout-dialogue-text-overflow-risk',
        `Dialogue text is longer than ${options.dialogueTextLimit} characters and may overflow the dialogue box.`,
        [...pagePath, 'dialogues', dialogueIndex, 'text'],
        {
          length: text.length,
          limit: options.dialogueTextLimit,
          sceneId: context.sceneId,
          pageIndex: context.pageIndex,
          dialogueIndex,
        },
      ));
    }
  });
}

function lintChoicePage(page, context, warnings, options) {
  const pagePath = ['scenes', context.sceneId, 'pages', context.pageIndex];
  const optionsList = Array.isArray(page.options) ? page.options : [];

  if (!isNonEmptyString(page.prompt) && optionsList.length > 0) {
    warnings.push(createWarning(
      'layout-choice-missing-prompt',
      'Choice page has options but no prompt text.',
      [...pagePath, 'prompt'],
      { sceneId: context.sceneId, pageIndex: context.pageIndex },
    ));
  }

  if (optionsList.length > 4) {
    warnings.push(createWarning(
      'layout-too-many-choice-options',
      'Choice page has more than 4 options; the choice menu may need visual review.',
      [...pagePath, 'options'],
      { sceneId: context.sceneId, pageIndex: context.pageIndex, optionCount: optionsList.length },
    ));
  }

  optionsList.forEach((option, optionIndex) => {
    const text = option?.text ?? '';
    if (typeof text === 'string' && text.length > options.choiceTextLimit) {
      warnings.push(createWarning(
        'layout-choice-text-overflow-risk',
        `Choice option text is longer than ${options.choiceTextLimit} characters and may wrap poorly.`,
        [...pagePath, 'options', optionIndex, 'text'],
        {
          length: text.length,
          limit: options.choiceTextLimit,
          sceneId: context.sceneId,
          pageIndex: context.pageIndex,
          optionIndex,
        },
      ));
    }
  });
}

function lintPage(page, context, warnings, options) {
  if (!isPlainObject(page)) {
    return;
  }

  lintCharacterLayout(page, context, warnings);

  if (page.type === 'normal') {
    lintNormalPage(page, context, warnings, options);
  } else if (page.type === 'choice') {
    lintChoicePage(page, context, warnings, options);
  }
}

export function lintProjectLayout(script = {}, options = {}) {
  const warnings = [];
  const config = {
    dialogueTextLimit: options.dialogueTextLimit ?? DEFAULT_DIALOGUE_TEXT_LIMIT,
    choiceTextLimit: options.choiceTextLimit ?? DEFAULT_CHOICE_TEXT_LIMIT,
  };

  for (const [sceneId, scene] of Object.entries(script.scenes ?? {})) {
    if (!Array.isArray(scene?.pages)) {
      continue;
    }

    scene.pages.forEach((page, pageIndex) => {
      lintPage(page, { sceneId, pageIndex }, warnings, config);
    });
  }

  return {
    ok: warnings.length === 0,
    warnings,
    suggestions: warnings.map((warning) => ({
      code: warning.code,
      pathString: warning.pathString,
      location: warning.location,
      suggestedAction: warning.suggestedAction,
    })),
  };
}
