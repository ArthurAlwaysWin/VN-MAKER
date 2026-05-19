const DEFAULT_DIALOGUE_TEXT_LIMIT = 120;
const DEFAULT_CHOICE_TEXT_LIMIT = 48;
const KNOWN_POSITIONS = new Set(['left', 'center', 'right']);

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function pathToString(path) {
  return path.map((part) => String(part)).join('.');
}

function createWarning(code, message, path = [], details = {}) {
  return {
    severity: 'warning',
    code,
    message,
    path,
    pathString: pathToString(path),
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
      { characterCount: characters.length },
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
    ));
  }

  if (!hasVisual && dialogues.length > 0) {
    warnings.push(createWarning(
      'layout-dialogue-on-blank-stage',
      'Normal page has dialogue but no background or staged characters.',
      pagePath,
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
    ));
  }

  if (optionsList.length > 4) {
    warnings.push(createWarning(
      'layout-too-many-choice-options',
      'Choice page has more than 4 options; the choice menu may need visual review.',
      [...pagePath, 'options'],
      { optionCount: optionsList.length },
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
  };
}
