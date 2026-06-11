import { AgentDslDiagnosticError, createDiagnostic, DIAGNOSTIC_CODES } from './diagnostics.js';

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function slugifyId(value, fallback) {
  const source = typeof value === 'string' && value.trim() ? value : fallback;
  const slug = String(source)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-\u4e00-\u9fa5]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || fallback;
}

function tokenize(source) {
  const tokens = [];
  const pattern = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|[^\s]+/g;
  let match = pattern.exec(source);
  while (match) {
    const [, doubleQuoted, singleQuoted] = match;
    if (doubleQuoted != null) {
      tokens.push(doubleQuoted.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
    } else if (singleQuoted != null) {
      tokens.push(singleQuoted.replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
    } else {
      tokens.push(match[0]);
    }
    match = pattern.exec(source);
  }
  return tokens;
}

function parseScalar(value) {
  if (value == null) {
    return null;
  }
  const text = String(value);
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === 'null') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) {
    return Number(text);
  }
  return value;
}

function stripTrailingColon(value) {
  return typeof value === 'string' && value.endsWith(':') ? value.slice(0, -1) : value;
}

function fail(line, message, code = DIAGNOSTIC_CODES.syntaxError) {
  const span = line?.span ?? null;
  throw new AgentDslDiagnosticError([
    createDiagnostic({
      code,
      message,
      file: span?.file ?? 'story.dsl',
      line: span?.start?.line ?? line?.number ?? 1,
      column: span?.start?.column ?? 1,
      span,
    }),
  ], `Agent DSL line ${line?.number ?? 1}: ${message}`);
}

function collectIndentedBlock(lines, startIndex, parentIndent) {
  const block = [];
  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trimmed) {
      index += 1;
      continue;
    }
    if (line.indent <= parentIndent) {
      break;
    }
    block.push(line);
    index += 1;
  }
  return { block, nextIndex: index };
}

function sourceIdFor(line) {
  const span = line?.span ?? null;
  const file = span?.file ?? line?.file ?? 'story.dsl';
  const sourceLine = span?.start?.line ?? line?.number ?? 1;
  const column = span?.start?.column ?? 1;
  return `${file}:${sourceLine}:${column}`;
}

function sourceFor(line, provenanceKind, details = {}) {
  const span = line?.span ?? null;
  return {
    provenanceKind,
    file: span?.file ?? line?.file,
    line: span?.start?.line ?? line?.number ?? 1,
    column: span?.start?.column ?? 1,
    span: span
      ? {
        start: { ...span.start },
        end: { ...span.end },
      }
      : null,
    details,
  };
}

function createIrOperation(kind, payload, line, stableId, provenanceKind, details = {}) {
  return {
    kind,
    stableId,
    sourceId: sourceIdFor(line),
    source: sourceFor(line, provenanceKind, details),
    payload: cloneJsonValue(payload),
  };
}

function parseCharacter(line) {
  const tokens = tokenize(line.trimmed);
  const id = slugifyId(tokens[1], `character_${line.number}`);
  if (!id) {
    fail(line, 'character requires an id');
  }

  let name = id;
  let color = '#ffffff';
  const expressions = {};
  let index = 2;
  if (tokens[index] && !['color', 'expression', 'expr'].includes(tokens[index])) {
    name = tokens[index];
    index += 1;
  }
  while (index < tokens.length) {
    const key = tokens[index];
    if (key === 'color') {
      color = tokens[index + 1] ?? color;
      index += 2;
      continue;
    }
    if (key === 'expression' || key === 'expr') {
      const expressionId = slugifyId(tokens[index + 1], 'normal');
      const expressionPath = tokens[index + 2] ?? `characters/${id}_${expressionId}.svg`;
      expressions[expressionId] = expressionPath;
      index += 3;
      continue;
    }
    fail(line, `unknown character field "${key}"`);
  }
  if (Object.keys(expressions).length === 0) {
    expressions.normal = `characters/${id}_normal.svg`;
  }

  return createIrOperation(
    'DeclareCharacter',
    { id, name, color, expressions },
    line,
    `dsl-add-character-${id}`,
    'character',
    { characterId: id },
  );
}

function parseVariable(line) {
  const tokens = tokenize(line.trimmed);
  const id = slugifyId(tokens[1], `variable_${line.number}`);
  if (!id) {
    fail(line, 'variable requires an id');
  }
  const knownTypes = new Set(['number', 'bool', 'string']);
  let type = 'number';
  let index = 2;
  if (knownTypes.has(tokens[index])) {
    type = tokens[index];
    index += 1;
  }

  const payload = { id, type };
  while (index < tokens.length) {
    const key = tokens[index];
    if (key === 'initial') {
      payload.initial = parseScalar(tokens[index + 1]);
      index += 2;
      continue;
    }
    if (['label', 'group', 'notes', 'kind', 'character'].includes(key)) {
      const outputKey = key === 'character' ? 'characterId' : key;
      payload[outputKey] = tokens[index + 1] ?? '';
      index += 2;
      continue;
    }
    if (['min', 'max', 'step'].includes(key)) {
      payload[key] = Number(tokens[index + 1]);
      index += 2;
      continue;
    }
    fail(line, `unknown variable field "${key}"`);
  }

  return createIrOperation(
    'DeclareVariable',
    payload,
    line,
    `dsl-add-variable-${id}`,
    'variable',
    { variableId: id },
  );
}

function parseAffection(line) {
  const tokens = tokenize(line.trimmed);
  const characterId = tokens[1];
  return createIrOperation(
    'DeclareVariable',
    { affection: true, characterId, id: tokens[2] },
    line,
    `dsl-add-affection-${characterId}`,
    'variable',
    { characterId },
  );
}

function parseEnding(line) {
  const tokens = tokenize(line.trimmed);
  const id = slugifyId(tokens[1], `ending_${line.number}`);
  const payload = { id, title: tokens[2] ?? id };
  let index = 3;
  while (index < tokens.length) {
    const key = tokens[index];
    if (['category', 'description', 'thumbnail'].includes(key)) {
      payload[key] = tokens[index + 1] ?? '';
      index += 2;
      continue;
    }
    if (key === 'order') {
      payload.order = Number(tokens[index + 1]);
      index += 2;
      continue;
    }
    if (key === 'hidden') {
      payload.hiddenUntilUnlocked = true;
      index += 1;
      continue;
    }
    fail(line, `unknown ending field "${key}"`);
  }
  return createIrOperation('DeclareEnding', payload, line, `dsl-add-ending-${id}`, 'ending', { endingId: id });
}

function parseCg(line) {
  const tokens = tokenize(line.trimmed);
  const id = slugifyId(tokens[1], `cg_${line.number}`);
  const payload = { id, title: tokens[2] ?? id };
  let index = 3;
  while (index < tokens.length) {
    const key = tokens[index];
    if (key === 'image' || key === 'images') {
      payload.images = [];
      index += 1;
      while (index < tokens.length && !['thumbnail', 'lockedThumbnail', 'locked-thumbnail', 'category', 'order', 'description'].includes(tokens[index])) {
        payload.images.push(tokens[index]);
        index += 1;
      }
      continue;
    }
    if (key === 'thumbnail') {
      payload.thumbnail = tokens[index + 1] ?? '';
      index += 2;
      continue;
    }
    if (key === 'lockedThumbnail' || key === 'locked-thumbnail') {
      payload.lockedThumbnail = tokens[index + 1] ?? '';
      index += 2;
      continue;
    }
    if (['category', 'description'].includes(key)) {
      payload[key] = tokens[index + 1] ?? '';
      index += 2;
      continue;
    }
    if (key === 'order') {
      payload.order = Number(tokens[index + 1]);
      index += 2;
      continue;
    }
    fail(line, `unknown cg field "${key}"`);
  }
  return createIrOperation('DeclareCg', payload, line, `dsl-add-cg-${id}`, 'cg', { cgId: id });
}

function parseEffectStatement(line) {
  const tokens = tokenize(line.trimmed);
  if (tokens[0] === 'unlock') {
    const kind = tokens[1];
    const id = tokens[2];
    if (kind === 'ending') return { type: 'unlock:ending', id };
    if (kind === 'cg') return { type: 'unlock:cg', id };
    fail(line, 'unlock expects "ending" or "cg"');
  }
  if (tokens[0] === 'affection') {
    const id = tokens[1];
    const delta = Number(tokens[2]);
    if (!Number.isFinite(delta)) {
      fail(line, 'affection expects a numeric delta');
    }
    return { type: delta >= 0 ? 'var:add' : 'var:sub', id, value: Math.abs(delta) };
  }
  if (tokens[0] === 'effect') {
    const type = tokens[1];
    if (type === 'var:set') return { type, id: tokens[2], value: parseScalar(tokens[3]) };
    if (type === 'var:add' || type === 'var:sub') return { type, id: tokens[2], value: Number(tokens[3]) };
    if (type === 'unlock:ending' || type === 'unlock:cg') return { type, id: tokens[2] };
    fail(line, `unsupported effect "${type}"`);
  }
  fail(line, `unknown effect statement "${tokens[0]}"`);
}

function parseChoiceOption(line, block) {
  const match = line.trimmed.match(/^option\s+(.+?)(?:\s+->\s+([A-Za-z0-9_\-\u4e00-\u9fa5]+))?\s*:?\s*$/);
  if (!match) {
    fail(line, 'option syntax is: option "Text" -> target:');
  }
  const text = tokenize(match[1])[0] ?? '';
  const target = match[2] ?? null;
  const effects = [];
  for (const entry of block) {
    if (!entry.trimmed) {
      continue;
    }
    effects.push(parseEffectStatement(entry));
  }
  return { text, target, effects };
}

function parseChoiceBlock(lines, startIndex, choiceLine) {
  const tokens = tokenize(choiceLine.trimmed.replace(/:\s*$/, ''));
  const prompt = tokens.slice(1).join(' ');
  const { block, nextIndex } = collectIndentedBlock(lines, startIndex + 1, choiceLine.indent);
  const options = [];
  let index = 0;
  while (index < block.length) {
    const line = block[index];
    if (!line.trimmed) {
      index += 1;
      continue;
    }
    if (!line.trimmed.startsWith('option ')) {
      fail(line, 'choice blocks only accept option statements');
    }
    const { block: effectBlock, nextIndex: nextOptionIndex } = collectIndentedBlock(block, index + 1, line.indent);
    options.push(parseChoiceOption(line, effectBlock));
    index = nextOptionIndex;
  }
  if (options.length === 0) {
    fail(choiceLine, 'choice requires at least one option');
  }
  return { prompt, options, nextIndex };
}

function parseCondition(line) {
  const match = line.trimmed.match(/^if\s+([A-Za-z_][\w-]*)\s*(==|!=|>=|<=|>|<)\s*(.+?)\s+->\s+([A-Za-z0-9_\-\u4e00-\u9fa5]+)(?:\s+else\s+([A-Za-z0-9_\-\u4e00-\u9fa5]+))?\s*$/);
  if (!match) {
    fail(line, 'condition syntax is: if variable >= value -> true_scene else false_scene');
  }
  const [, variableId, operator, valueSource, trueTarget, falseTarget = null] = match;
  const valueTokens = tokenize(valueSource);
  return {
    conditionMode: 'all',
    conditions: [{
      variableId,
      operator,
      value: parseScalar(valueTokens.length === 1 ? valueTokens[0] : valueSource),
    }],
    trueTarget,
    falseTarget,
  };
}

function parseShowStatement(line) {
  const tokens = tokenize(line.trimmed);
  const id = tokens[1];
  if (!id) {
    fail(line, 'show requires a character id');
  }
  const reserved = new Set(['at', 'position', 'animation', 'transition']);
  const character = {
    id,
    expression: tokens[2] && !reserved.has(tokens[2]) ? tokens[2] : 'normal',
    position: 'center',
  };
  let index = character.expression === tokens[2] ? 3 : 2;
  while (index < tokens.length) {
    const key = tokens[index];
    if (key === 'at' || key === 'position') {
      character.position = tokens[index + 1] ?? character.position;
      index += 2;
      continue;
    }
    if (key === 'animation' || key === 'transition') {
      character.animation = tokens[index + 1] ?? 'none';
      index += 2;
      continue;
    }
    fail(line, `unknown show field "${key}"`);
  }
  return character;
}

function parseSayStatement(line) {
  const tokens = tokenize(line.trimmed);
  if (tokens[0] === 'narrate') {
    return { speaker: null, text: tokens[1] ?? '', expression: null, voice: null };
  }

  const rest = line.trimmed.slice('say'.length).trim();
  let speaker = tokens[1] ?? null;
  let textIndex = 2;
  if (rest.startsWith('"') || rest.startsWith("'") || speaker === 'null') {
    speaker = null;
    textIndex = 1;
  }
  const dialogue = {
    speaker: speaker === 'null' ? null : speaker,
    text: tokens[textIndex] ?? '',
    expression: null,
    voice: null,
  };
  let index = textIndex + 1;
  while (index < tokens.length) {
    const key = tokens[index];
    if (key === 'expression') {
      dialogue.expression = tokens[index + 1] ?? null;
      index += 2;
      continue;
    }
    if (key === 'voice') {
      dialogue.voice = tokens[index + 1] ?? null;
      index += 2;
      continue;
    }
    fail(line, `unknown say field "${key}"`);
  }
  return dialogue;
}

function createEmptyPage(id = null) {
  return {
    id: id ?? undefined,
    type: 'normal',
    background: '',
    characters: [],
    bgm: null,
    se: null,
    dialogues: [],
    transition: { type: 'fade', duration: 800 },
  };
}

function pageHasContent(page) {
  return Boolean(
    page.id
    || page.background
    || page.characters.length
    || page.bgm
    || page.se
    || page.dialogues.length
    || page.camera
    || page.particles
    || page.transition?.type !== 'fade'
    || page.transition?.duration !== 800,
  );
}

function lowerSceneBody(sceneId, body, startLine) {
  const operations = [];
  let currentPage = createEmptyPage();
  let pageIndex = 0;
  let sceneNext = undefined;

  function flushPage(line = startLine) {
    if (!pageHasContent(currentPage)) {
      return;
    }
    const page = {
      ...currentPage,
      characters: cloneJsonValue(currentPage.characters),
      dialogues: cloneJsonValue(currentPage.dialogues),
    };
    operations.push(createIrOperation(
      'CreateNormalPage',
      {
        scene: sceneId,
        page,
      },
      line,
      `dsl-add-page-${sceneId}-${pageIndex + 1}`,
      'page',
      { sceneId, pageIndex },
    ));
    pageIndex += 1;
    currentPage = createEmptyPage();
  }

  let index = 0;
  while (index < body.length) {
    const line = body[index];
    if (!line.trimmed) {
      index += 1;
      continue;
    }
    const tokens = tokenize(line.trimmed.replace(/:\s*$/, ''));
    const command = tokens[0];

    if (command === 'page') {
      flushPage(line);
      currentPage = createEmptyPage(tokens[1] ?? null);
      index += 1;
      continue;
    }
    if (command === 'bg' || command === 'background') {
      currentPage.background = tokens[1] ?? '';
      index += 1;
      continue;
    }
    if (command === 'transition') {
      currentPage.transition = {
        type: tokens[1] ?? 'fade',
        duration: Number(tokens[2] ?? 800),
      };
      index += 1;
      continue;
    }
    if (command === 'bgm') {
      currentPage.bgm = {
        file: tokens[1] ?? '',
        volume: tokens.includes('volume') ? Number(tokens[tokens.indexOf('volume') + 1]) : 0.6,
      };
      index += 1;
      continue;
    }
    if (command === 'se') {
      currentPage.se = { file: tokens[1] ?? '' };
      index += 1;
      continue;
    }
    if (command === 'show') {
      currentPage.characters.push(parseShowStatement(line));
      index += 1;
      continue;
    }
    if (command === 'say' || command === 'narrate') {
      currentPage.dialogues.push(parseSayStatement(line));
      index += 1;
      continue;
    }
    if (command === 'camera') {
      currentPage.camera = {
        effect: tokens[1] ?? 'shake',
        intensity: tokens[2] ?? 'medium',
        durationMs: Number(tokens[3] ?? 800),
      };
      index += 1;
      continue;
    }
    if (command === 'particles') {
      currentPage.particles = { preset: tokens[1] ?? 'dust' };
      for (let tokenIndex = 2; tokenIndex < tokens.length; tokenIndex += 2) {
        const key = tokens[tokenIndex];
        currentPage.particles[key] = parseScalar(tokens[tokenIndex + 1]);
      }
      index += 1;
      continue;
    }
    if (command === 'choice') {
      flushPage(line);
      const parsed = parseChoiceBlock(body, index, line);
      operations.push(createIrOperation(
        'CreateChoicePage',
        {
          scene: sceneId,
          prompt: parsed.prompt,
          options: parsed.options,
        },
        line,
        `dsl-add-choice-${sceneId}-${pageIndex + 1}`,
        'choice',
        { sceneId, pageIndex },
      ));
      pageIndex += 1;
      index = parsed.nextIndex;
      continue;
    }
    if (command === 'if') {
      flushPage(line);
      operations.push(createIrOperation(
        'CreateConditionPage',
        {
          scene: sceneId,
          ...parseCondition(line),
        },
        line,
        `dsl-add-condition-${sceneId}-${pageIndex + 1}`,
        'condition',
        { sceneId, pageIndex },
      ));
      pageIndex += 1;
      index += 1;
      continue;
    }
    if (command === 'jump') {
      sceneNext = tokens[1] ?? null;
      index += 1;
      continue;
    }
    if (command === 'end') {
      sceneNext = null;
      index += 1;
      continue;
    }

    fail(line, `unknown scene statement "${command}"`);
  }

  flushPage(startLine);
  return { operations, next: sceneNext };
}

function lowerScene(lines, startIndex) {
  const line = lines[startIndex];
  const header = line.trimmed.replace(/:\s*$/, '');
  const tokens = tokenize(header);
  const id = slugifyId(tokens[1], `scene_${line.number}`);
  if (!id) {
    fail(line, 'scene requires an id');
  }
  let name = id;
  let next = null;
  let nextWasDeclared = false;
  let index = 2;
  if (tokens[index] && tokens[index] !== 'next') {
    name = tokens[index];
    index += 1;
  }
  if (tokens[index] === 'next') {
    next = tokens[index + 1] ?? null;
    nextWasDeclared = true;
  }
  const { block, nextIndex } = collectIndentedBlock(lines, startIndex + 1, line.indent);
  const loweredBody = lowerSceneBody(id, block, line);
  const effectiveNext = loweredBody.next === undefined ? next : loweredBody.next;
  const operations = [
    createIrOperation('CreateScene', { id, name }, line, `dsl-add-scene-${id}`, 'scene', { sceneId: id }),
    ...loweredBody.operations,
  ];
  if ((nextWasDeclared || loweredBody.next !== undefined) && effectiveNext != null) {
    operations.push(createIrOperation(
      'SetSceneNext',
      { scene: id, next: effectiveNext },
      line,
      `dsl-set-scene-next-${id}`,
      'scene-next',
      { sceneId: id },
    ));
  }
  return { nextIndex, operations };
}

export function lowerAgentDslToIr(ast, options = {}) {
  const lines = options.lines ?? [];
  const operations = [];
  const warnings = [];
  let title = options.title ?? 'Agent DSL plan';
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.indent !== 0) {
      fail(line, 'top-level statements must not be indented');
    }
    const tokens = tokenize(stripTrailingColon(line.trimmed));
    const command = tokens[0];
    if (command === 'title') {
      title = tokens.slice(1).join(' ') || title;
      index += 1;
      continue;
    }
    if (command === 'character') {
      operations.push(parseCharacter(line));
      index += 1;
      continue;
    }
    if (command === 'variable') {
      operations.push(parseVariable(line));
      index += 1;
      continue;
    }
    if (command === 'affection') {
      operations.push(parseAffection(line));
      index += 1;
      continue;
    }
    if (command === 'ending') {
      operations.push(parseEnding(line));
      index += 1;
      continue;
    }
    if (command === 'cg') {
      operations.push(parseCg(line));
      index += 1;
      continue;
    }
    if (command === 'scene') {
      const loweredScene = lowerScene(lines, index);
      operations.push(...loweredScene.operations);
      index = loweredScene.nextIndex;
      continue;
    }
    fail(line, `unknown top-level statement "${command}"`);
  }

  if (operations.length === 0) {
    warnings.push({
      code: 'empty-agent-dsl-plan',
      message: 'Agent DSL did not produce any operations.',
    });
  }

  return {
    version: 1,
    title,
    source: {
      kind: 'agent-dsl',
      languageVersion: 1,
      macroCount: options.macroCount ?? 0,
    },
    operations,
    warnings,
  };
}
