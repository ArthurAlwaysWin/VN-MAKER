function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
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

function countIndent(rawLine) {
  if (rawLine.includes('\t')) {
    throw new Error('Agent DSL uses spaces for indentation; tabs are not supported');
  }
  return rawLine.match(/^ */)?.[0].length ?? 0;
}

function stripComment(line) {
  let quote = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '#') {
      return line.slice(0, index);
    }
  }
  return line;
}

function normalizeLines(source) {
  return String(source ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((raw, index) => {
      const text = stripComment(raw).replace(/\s+$/, '');
      return {
        number: index + 1,
        indent: countIndent(raw),
        raw,
        text,
        trimmed: text.trim(),
      };
    });
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

function splitCommaArgs(source) {
  const args = [];
  let current = '';
  let quote = null;
  let escaped = false;
  for (const char of source) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      current += char;
      escaped = true;
      continue;
    }
    if (quote) {
      current += char;
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ',') {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    args.push(current.trim());
  }
  return args.map((arg) => {
    const tokens = tokenize(arg);
    return tokens.length === 1 ? parseScalar(tokens[0]) : tokens.join(' ');
  });
}

function createProvenance(kind, line, details = {}) {
  return {
    kind,
    line: line.number,
    ...details,
  };
}

function createOperation(command, params, line, id, provenanceKind, provenance = {}) {
  return {
    id,
    command,
    provenance: createProvenance(provenanceKind, line, provenance),
    params,
  };
}

function fail(line, message) {
  throw new Error(`Agent DSL line ${line.number}: ${message}`);
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

function collectMacros(lines) {
  const macros = new Map();
  const remaining = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const match = line.trimmed.match(/^macro\s+([A-Za-z_][\w-]*)\s*\(([^)]*)\)\s*:$/);
    if (line.indent !== 0 || !match) {
      remaining.push(line);
      index += 1;
      continue;
    }

    const [, name, paramsSource] = match;
    const { block, nextIndex } = collectIndentedBlock(lines, index + 1, line.indent);
    if (block.length === 0) {
      fail(line, `macro "${name}" must contain an indented body`);
    }
    const minIndent = Math.min(...block.filter((entry) => entry.trimmed).map((entry) => entry.indent));
    macros.set(name, {
      name,
      params: paramsSource.split(',').map((param) => param.trim()).filter(Boolean),
      body: block.map((entry) => ({
        ...entry,
        indent: Math.max(0, entry.indent - minIndent),
        text: entry.text.slice(Math.min(entry.text.length, minIndent)),
        trimmed: entry.text.slice(Math.min(entry.text.length, minIndent)).trim(),
      })),
    });
    index = nextIndex;
  }
  return { macros, lines: remaining };
}

function substituteMacroLine(text, values) {
  let next = text;
  for (const [key, value] of Object.entries(values)) {
    const replacement = String(value);
    next = next.replaceAll(`\${${key}}`, replacement);
    next = next.replaceAll(`$${key}`, replacement);
  }
  return next;
}

function expandMacroCalls(lines, macros, depth = 0) {
  if (depth > 8) {
    throw new Error('Agent DSL macro expansion exceeded the recursion limit');
  }

  const expanded = [];
  for (const line of lines) {
    const match = line.trimmed.match(/^call\s+([A-Za-z_][\w-]*)\s*(?:\((.*)\))?\s*$/);
    if (!match) {
      expanded.push(line);
      continue;
    }

    const [, name, argsSource = ''] = match;
    const macro = macros.get(name);
    if (!macro) {
      fail(line, `unknown macro "${name}"`);
    }
    const args = splitCommaArgs(argsSource);
    if (args.length !== macro.params.length) {
      fail(line, `macro "${name}" expects ${macro.params.length} argument(s), got ${args.length}`);
    }
    const values = Object.fromEntries(macro.params.map((param, index) => [param, args[index]]));
    const materialized = macro.body.map((entry) => {
      const text = `${' '.repeat(line.indent + entry.indent)}${substituteMacroLine(entry.trimmed, values)}`;
      return {
        number: line.number,
        indent: line.indent + entry.indent,
        raw: text,
        text,
        trimmed: text.trim(),
      };
    });
    expanded.push(...expandMacroCalls(materialized, macros, depth + 1));
  }
  return expanded;
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

  return createOperation(
    'add-character',
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

  const params = { id, type };
  while (index < tokens.length) {
    const key = tokens[index];
    if (key === 'initial') {
      params.initial = parseScalar(tokens[index + 1]);
      index += 2;
      continue;
    }
    if (['label', 'group', 'notes', 'kind', 'character'].includes(key)) {
      const outputKey = key === 'character' ? 'characterId' : key;
      params[outputKey] = tokens[index + 1] ?? '';
      index += 2;
      continue;
    }
    if (['min', 'max', 'step'].includes(key)) {
      params[key] = Number(tokens[index + 1]);
      index += 2;
      continue;
    }
    fail(line, `unknown variable field "${key}"`);
  }

  return createOperation(
    'add-variable',
    params,
    line,
    `dsl-add-variable-${id}`,
    'variable',
    { variableId: id },
  );
}

function parseEnding(line) {
  const tokens = tokenize(line.trimmed);
  const id = slugifyId(tokens[1], `ending_${line.number}`);
  const params = { id, title: tokens[2] ?? id };
  let index = 3;
  while (index < tokens.length) {
    const key = tokens[index];
    if (['category', 'description', 'thumbnail'].includes(key)) {
      params[key] = tokens[index + 1] ?? '';
      index += 2;
      continue;
    }
    if (key === 'order') {
      params.order = Number(tokens[index + 1]);
      index += 2;
      continue;
    }
    if (key === 'hidden') {
      params.hiddenUntilUnlocked = true;
      index += 1;
      continue;
    }
    fail(line, `unknown ending field "${key}"`);
  }
  return createOperation('add-ending', params, line, `dsl-add-ending-${id}`, 'ending', { endingId: id });
}

function parseCg(line) {
  const tokens = tokenize(line.trimmed);
  const id = slugifyId(tokens[1], `cg_${line.number}`);
  const params = { id, title: tokens[2] ?? id };
  let index = 3;
  while (index < tokens.length) {
    const key = tokens[index];
    if (key === 'image' || key === 'images') {
      params.images = [];
      index += 1;
      while (index < tokens.length && !['thumbnail', 'lockedThumbnail', 'locked-thumbnail', 'category', 'order', 'description'].includes(tokens[index])) {
        params.images.push(tokens[index]);
        index += 1;
      }
      continue;
    }
    if (key === 'thumbnail') {
      params.thumbnail = tokens[index + 1] ?? '';
      index += 2;
      continue;
    }
    if (key === 'lockedThumbnail' || key === 'locked-thumbnail') {
      params.lockedThumbnail = tokens[index + 1] ?? '';
      index += 2;
      continue;
    }
    if (['category', 'description'].includes(key)) {
      params[key] = tokens[index + 1] ?? '';
      index += 2;
      continue;
    }
    if (key === 'order') {
      params.order = Number(tokens[index + 1]);
      index += 2;
      continue;
    }
    fail(line, `unknown cg field "${key}"`);
  }
  return createOperation('add-cg', params, line, `dsl-add-cg-${id}`, 'cg', { cgId: id });
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

function parseSceneBody(sceneId, body, startLine) {
  const operations = [];
  let currentPage = createEmptyPage();
  let pageIndex = 0;
  let sceneNext = null;

  function flushPage(line = startLine) {
    if (!pageHasContent(currentPage)) {
      return;
    }
    const page = {
      ...currentPage,
      characters: cloneJsonValue(currentPage.characters),
      dialogues: cloneJsonValue(currentPage.dialogues),
    };
    operations.push(createOperation(
      'add-page',
      {
        scene: sceneId,
        type: 'normal',
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
      operations.push(createOperation(
        'add-page',
        {
          scene: sceneId,
          type: 'choice',
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
      operations.push(createOperation(
        'add-page',
        {
          scene: sceneId,
          type: 'condition',
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

function parseScene(lines, startIndex) {
  const line = lines[startIndex];
  const header = line.trimmed.replace(/:\s*$/, '');
  const tokens = tokenize(header);
  const id = slugifyId(tokens[1], `scene_${line.number}`);
  if (!id) {
    fail(line, 'scene requires an id');
  }
  let name = id;
  let next = null;
  let index = 2;
  if (tokens[index] && tokens[index] !== 'next') {
    name = tokens[index];
    index += 1;
  }
  if (tokens[index] === 'next') {
    next = tokens[index + 1] ?? null;
  }
  const { block, nextIndex } = collectIndentedBlock(lines, startIndex + 1, line.indent);
  const parsedBody = parseSceneBody(id, block, line);
  return {
    nextIndex,
    operations: [
      createOperation('add-scene', { id, name, next: parsedBody.next ?? next }, line, `dsl-add-scene-${id}`, 'scene', { sceneId: id }),
      ...parsedBody.operations,
    ],
  };
}

export function createAgentDslPlan(source, options = {}) {
  const normalized = normalizeLines(source).filter((line) => line.trimmed);
  const { macros, lines } = collectMacros(normalized);
  const expandedLines = expandMacroCalls(lines, macros);
  const operations = [];
  const warnings = [];
  let title = options.title ?? 'Agent DSL plan';
  let index = 0;

  while (index < expandedLines.length) {
    const line = expandedLines[index];
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
      const characterId = tokens[1];
      operations.push(createOperation(
        'add-affection-variable',
        { characterId, id: tokens[2] },
        line,
        `dsl-add-affection-${characterId}`,
        'variable',
        { characterId },
      ));
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
      const parsedScene = parseScene(expandedLines, index);
      operations.push(...parsedScene.operations);
      index = parsedScene.nextIndex;
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
      macroCount: macros.size,
    },
    operations,
    warnings,
  };
}

export function createAgentDslPlanFromJson(value = {}, options = {}) {
  if (!isPlainObject(value) || typeof value.source !== 'string') {
    throw new Error('Agent DSL JSON input must be an object with a source string');
  }
  return createAgentDslPlan(value.source, {
    title: options.title ?? value.title,
  });
}
