import { createNode, mergeSpans } from './ast.js';
import { createDiagnostic, DIAGNOSTIC_CODES, hasErrors } from './diagnostics.js';
import { lexAgentDsl } from './lexer.js';

const TOP_LEVEL = new Set(['title', 'character', 'variable', 'affection', 'ending', 'cg', 'macro', 'scene']);
const SCENE_STATEMENTS = new Set([
  'page',
  'bg',
  'background',
  'transition',
  'bgm',
  'se',
  'show',
  'say',
  'narrate',
  'choice',
  'if',
  'jump',
  'end',
  'camera',
  'particles',
  'call',
]);
const EFFECT_STATEMENTS = new Set(['effect', 'unlock', 'affection', 'call']);

function tokenText(token) {
  if (!token) return '';
  if (token.type === 'string') return token.value;
  if (token.type === 'number') return token.text ?? String(token.value);
  if (token.type === 'true') return 'true';
  if (token.type === 'false') return 'false';
  if (token.type === 'null') return 'null';
  return token.text ?? String(token.value);
}

function scalarFromToken(token) {
  if (!token) return null;
  return token.value;
}

export function agentDslTokenText(token) {
  return tokenText(token);
}

function hasTrailingColon(line) {
  return line.tokens[line.tokens.length - 1]?.value === ':';
}

function withoutTrailingColon(tokens) {
  return tokens[tokens.length - 1]?.value === ':' ? tokens.slice(0, -1) : tokens;
}

function diagnosticForLine(line, message, code = DIAGNOSTIC_CODES.syntaxError, token = line?.tokens?.[0]) {
  const span = token?.span ?? line?.span ?? null;
  return createDiagnostic({
    code,
    message,
    file: span?.file ?? 'story.dsl',
    line: span?.start?.line ?? line?.number ?? 1,
    column: span?.start?.column ?? 1,
    span,
  });
}

class Parser {
  constructor(lines, file) {
    this.lines = lines;
    this.file = file;
    this.index = 0;
    this.diagnostics = [];
  }

  current() {
    return this.lines[this.index] ?? null;
  }

  parseFile() {
    const body = [];
    while (this.index < this.lines.length) {
      const line = this.current();
      if (line.indent !== 0) {
        this.diagnostics.push(diagnosticForLine(line, 'Top-level statements must not be indented.'));
        this.index += 1;
        continue;
      }
      const node = this.parseTopLevel();
      if (node) {
        body.push(node);
      } else {
        this.index += 1;
      }
    }

    const firstSpan = body[0]?.span ?? this.lines[0]?.span ?? null;
    const lastSpan = body[body.length - 1]?.span ?? firstSpan;
    return createNode('File', mergeSpans(this.file, firstSpan, lastSpan), { body });
  }

  parseTopLevel() {
    const line = this.current();
    const command = tokenText(line.tokens[0]);
    if (!TOP_LEVEL.has(command)) {
      this.diagnostics.push(diagnosticForLine(line, `Unknown top-level statement "${command}".`));
      return null;
    }

    if (command === 'title') {
      this.index += 1;
      return createNode('TitleDeclaration', line.span, {
        value: line.tokens.slice(1).map(tokenText).join(' '),
        line,
      });
    }
    if (command === 'character') return this.parseDeclaration('CharacterDeclaration');
    if (command === 'variable') return this.parseDeclaration('VariableDeclaration');
    if (command === 'affection') return this.parseDeclaration('AffectionDeclaration');
    if (command === 'ending') return this.parseDeclaration('EndingDeclaration');
    if (command === 'cg') return this.parseDeclaration('CgDeclaration');
    if (command === 'macro') return this.parseMacroDeclaration();
    if (command === 'scene') return this.parseSceneDeclaration();
    return null;
  }

  parseDeclaration(kind) {
    const line = this.current();
    this.index += 1;
    return createNode(kind, line.span, {
      id: tokenText(line.tokens[1]),
      tokens: line.tokens.map(tokenText),
      line,
    });
  }

  parseMacroDeclaration() {
    const line = this.current();
    const tokens = line.tokens;
    const name = tokenText(tokens[1]);
    if (!hasTrailingColon(line)) {
      this.diagnostics.push(diagnosticForLine(line, 'Expected ":" after macro declaration.'));
    }
    const openIndex = tokens.findIndex((token) => token.value === '(');
    const closeIndex = tokens.findIndex((token) => token.value === ')');
    if (openIndex === -1 || closeIndex === -1 || closeIndex < openIndex) {
      this.diagnostics.push(diagnosticForLine(line, 'Expected macro parameter list in parentheses.'));
    }
    const params = openIndex !== -1 && closeIndex !== -1 && closeIndex > openIndex
      ? tokens.slice(openIndex + 1, closeIndex).filter((token) => token.value !== ',').map(tokenText).filter(Boolean)
      : [];
    this.index += 1;
    const body = this.parseIndentedBlock(line.indent, (entry) => this.parseSceneStatement(entry, { allowEffects: true }));
    if (body.length === 0) {
      this.diagnostics.push(diagnosticForLine(line, `Macro "${name}" must contain an indented body.`));
    }
    const span = mergeSpans(this.file, line.span, body[body.length - 1]?.span);
    return createNode('MacroDeclaration', span, {
      id: name,
      params,
      body,
      line,
    });
  }

  parseSceneDeclaration() {
    const line = this.current();
    const tokens = withoutTrailingColon(line.tokens);
    if (!hasTrailingColon(line)) {
      this.diagnostics.push(diagnosticForLine(line, 'Expected ":" after scene declaration.'));
    }
    const id = tokenText(tokens[1]);
    let name = id;
    let next = null;
    let index = 2;
    if (tokens[index] && tokenText(tokens[index]) !== 'next') {
      name = tokenText(tokens[index]);
      index += 1;
    }
    if (tokenText(tokens[index]) === 'next') {
      next = tokenText(tokens[index + 1]);
    }
    this.index += 1;
    const body = this.parseIndentedBlock(line.indent, (entry) => this.parseSceneStatement(entry));
    const span = mergeSpans(this.file, line.span, body[body.length - 1]?.span);
    return createNode('SceneDeclaration', span, {
      id,
      name,
      next,
      body,
      line,
    });
  }

  parseIndentedBlock(parentIndent, parseLine) {
    const nodes = [];
    while (this.index < this.lines.length) {
      const line = this.current();
      if (line.indent <= parentIndent) {
        break;
      }
      const node = parseLine(line);
      if (node) {
        nodes.push(node);
      }
      this.index += 1;
    }
    return nodes;
  }

  parseSceneStatement(line, options = {}) {
    const command = tokenText(line.tokens[0]);
    if (!SCENE_STATEMENTS.has(command) && !(options.allowEffects && EFFECT_STATEMENTS.has(command))) {
      const kind = options.allowEffects ? 'macro' : 'scene';
      this.diagnostics.push(diagnosticForLine(line, `Unknown ${kind} statement "${command}".`));
      return null;
    }
    if (command === 'call') return this.parseMacroCall(line);
    if (command === 'choice') return this.parseChoiceStatement(line);
    if (command === 'option') {
      this.diagnostics.push(diagnosticForLine(line, 'Option statements must be inside a choice block.'));
      return null;
    }
    if (command === 'page') {
      if (!hasTrailingColon(line)) {
        this.diagnostics.push(diagnosticForLine(line, 'Expected ":" after page statement.'));
      }
      return createNode('PageStatement', line.span, { id: tokenText(line.tokens[1]), line });
    }
    if (command === 'bg' || command === 'background') return createNode('BackgroundStatement', line.span, { line });
    if (command === 'transition') return createNode('TransitionStatement', line.span, { line });
    if (command === 'bgm') return createNode('BgmStatement', line.span, { line });
    if (command === 'se') return createNode('SeStatement', line.span, { line });
    if (command === 'show') return createNode('ShowStatement', line.span, { line });
    if (command === 'say') return createNode('SayStatement', line.span, { line });
    if (command === 'narrate') return createNode('NarrateStatement', line.span, { line });
    if (command === 'if') return createNode('ConditionStatement', line.span, { line });
    if (command === 'jump') return createNode('JumpStatement', line.span, { target: tokenText(line.tokens[1]), line });
    if (command === 'end') return createNode('EndStatement', line.span, { line });
    if (command === 'camera') return createNode('CameraStatement', line.span, { line });
    if (command === 'particles') return createNode('ParticlesStatement', line.span, { line });
    if (EFFECT_STATEMENTS.has(command)) return createNode('EffectStatement', line.span, { line });
    return createNode('Statement', line.span, { line });
  }

  parseMacroCall(line) {
    const tokens = line.tokens;
    const name = tokenText(tokens[1]);
    const openIndex = tokens.findIndex((token) => token.value === '(');
    const closeIndex = tokens.findIndex((token) => token.value === ')');
    const args = openIndex !== -1 && closeIndex !== -1 && closeIndex > openIndex
      ? tokens.slice(openIndex + 1, closeIndex).filter((token) => token.value !== ',').map(scalarFromToken)
      : [];
    return createNode('MacroCall', line.span, { id: name, args, line });
  }

  parseChoiceStatement(line) {
    if (!hasTrailingColon(line)) {
      this.diagnostics.push(diagnosticForLine(line, 'Expected ":" after choice statement.'));
    }
    this.index += 1;
    const options = [];
    while (this.index < this.lines.length) {
      const optionLine = this.current();
      if (optionLine.indent <= line.indent) {
        break;
      }
      if (tokenText(optionLine.tokens[0]) !== 'option') {
        this.diagnostics.push(diagnosticForLine(optionLine, 'Choice blocks only accept option statements.'));
        this.index += 1;
        continue;
      }
      options.push(this.parseOptionStatement(optionLine));
    }
    this.index -= 1;
    if (options.length === 0) {
      this.diagnostics.push(diagnosticForLine(line, 'Choice requires at least one option.'));
    }
    const promptToken = line.tokens[1];
    const span = mergeSpans(this.file, line.span, options[options.length - 1]?.span);
    return createNode('ChoiceStatement', span, {
      prompt: promptToken ? tokenText(promptToken) : '',
      options,
      line,
    });
  }

  parseOptionStatement(line) {
    const tokens = withoutTrailingColon(line.tokens);
    const arrowIndex = tokens.findIndex((token) => token.value === '->');
    const text = tokenText(tokens[1]);
    const target = arrowIndex === -1 ? null : tokenText(tokens[arrowIndex + 1]);
    this.index += 1;
    const body = [];
    while (this.index < this.lines.length) {
      const bodyLine = this.current();
      if (bodyLine.indent <= line.indent) {
        break;
      }
      const command = tokenText(bodyLine.tokens[0]);
      if (!EFFECT_STATEMENTS.has(command)) {
        this.diagnostics.push(diagnosticForLine(bodyLine, `Unknown option statement "${command}".`));
        this.index += 1;
        continue;
      }
      body.push(command === 'call' ? this.parseMacroCall(bodyLine) : createNode('EffectStatement', bodyLine.span, { line: bodyLine }));
      this.index += 1;
    }
    const span = mergeSpans(this.file, line.span, body[body.length - 1]?.span);
    return createNode('OptionStatement', span, {
      text,
      target,
      body,
      line,
    });
  }
}

function collectMacroCalls(node, calls = []) {
  if (!node || typeof node !== 'object') return calls;
  if (node.kind === 'MacroCall') {
    calls.push(node);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => collectMacroCalls(entry, calls));
    } else if (value && typeof value === 'object' && value.kind) {
      collectMacroCalls(value, calls);
    }
  }
  return calls;
}

function validateMacroCalls(ast, diagnostics) {
  const macros = new Map();
  for (const node of ast.body) {
    if (node.kind === 'MacroDeclaration') {
      macros.set(node.id, node);
    }
  }
  for (const call of collectMacroCalls(ast)) {
    const macro = macros.get(call.id);
    if (!macro) {
      diagnostics.push(createDiagnostic({
        code: DIAGNOSTIC_CODES.macroNotFound,
        message: `Unknown macro "${call.id}".`,
        file: call.span.file,
        line: call.span.start.line,
        column: call.span.start.column,
        span: call.span,
      }));
      continue;
    }
    if (call.args.length !== macro.params.length) {
      diagnostics.push(createDiagnostic({
        code: DIAGNOSTIC_CODES.macroArityMismatch,
        message: `Macro "${call.id}" expects ${macro.params.length} argument(s), got ${call.args.length}.`,
        file: call.span.file,
        line: call.span.start.line,
        column: call.span.start.column,
        span: call.span,
      }));
    }
  }
}

export function parseAgentDsl(source, options = {}) {
  const file = options.file ?? 'story.dsl';
  const lexed = lexAgentDsl(source, { file });
  const parser = new Parser(lexed.lines, file);
  const ast = parser.parseFile();
  const diagnostics = [...lexed.diagnostics, ...parser.diagnostics];
  if (!hasErrors(diagnostics)) {
    validateMacroCalls(ast, diagnostics);
  }

  return {
    ok: !hasErrors(diagnostics),
    ast: hasErrors(diagnostics) ? null : ast,
    diagnostics,
    comments: lexed.comments,
    lines: lexed.lines,
    tokens: lexed.tokens,
  };
}

export function astToLineRecords(ast) {
  const lines = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.line) {
      lines.push({
        number: node.line.number,
        indent: node.line.indent,
        raw: node.line.raw,
        text: node.line.raw,
        trimmed: node.line.raw.trim(),
        span: node.line.span,
      });
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else if (value && typeof value === 'object' && value.kind) {
        visit(value);
      }
    }
  }
  visit(ast);
  return lines.sort((left, right) => left.number - right.number || left.indent - right.indent);
}
