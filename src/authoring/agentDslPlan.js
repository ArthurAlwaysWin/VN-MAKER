import { AgentDslDiagnosticError, createDiagnostic, DIAGNOSTIC_CODES, throwIfDiagnostics } from './agentDsl/diagnostics.js';
import { analyzeAgentDsl } from './agentDsl/analyzer.js';
import { bindAgentDsl } from './agentDsl/binder.js';
import { emitAgentDslPlan } from './agentDsl/emitPlan.js';
import { lowerAgentDslToIr } from './agentDsl/ir.js';
import { astToLineRecords, parseAgentDsl } from './agentDsl/parser.js';
import { createAgentDslSourceMap } from './agentDsl/sourceMap.js';

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
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

function normalizeCompileTimeBlock(block) {
  if (block.length === 0) return [];
  const minIndent = Math.min(...block.filter((entry) => entry.trimmed).map((entry) => entry.indent));
  return block.map((entry) => ({
    ...entry,
    indent: Math.max(0, entry.indent - minIndent),
    text: entry.text.slice(Math.min(entry.text.length, minIndent)),
    trimmed: entry.text.slice(Math.min(entry.text.length, minIndent)).trim(),
  }));
}

function collectCompileTimeDeclarations(lines) {
  const macros = new Map();
  const presets = new Map();
  const sequences = new Map();
  const remaining = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const macroMatch = line.trimmed.match(/^macro\s+([A-Za-z_][\w-]*)\s*\(([^)]*)\)\s*:$/);
    const presetMatch = line.trimmed.match(/^preset\s+([A-Za-z_][\w-]*)\s+([A-Za-z_][\w-]*)\s*:$/);
    const sequenceMatch = line.trimmed.match(/^sequence\s+([A-Za-z_][\w-]*)\s*\(([^)]*)\)\s*:$/);
    if (line.indent !== 0 || (!macroMatch && !presetMatch && !sequenceMatch)) {
      remaining.push(line);
      index += 1;
      continue;
    }

    const { block, nextIndex } = collectIndentedBlock(lines, index + 1, line.indent);
    if (block.length === 0 && macroMatch) {
      fail(line, `macro "${macroMatch[1]}" must contain an indented body`);
    }
    if (block.length === 0 && presetMatch) {
      fail(line, `preset "${presetMatch[1]} ${presetMatch[2]}" must contain an indented body`, DIAGNOSTIC_CODES.invalidPreset);
    }
    if (block.length === 0 && sequenceMatch) {
      fail(line, `sequence "${sequenceMatch[1]}" must contain an indented body`, DIAGNOSTIC_CODES.invalidSequence);
    }
    const body = normalizeCompileTimeBlock(block);
    if (macroMatch) {
      const [, name, paramsSource] = macroMatch;
      macros.set(name, {
        name,
        params: paramsSource.split(',').map((param) => param.trim()).filter(Boolean),
        body,
      });
    } else if (presetMatch) {
      const [, category, id] = presetMatch;
      presets.set(`${category}:${id}`, {
        category,
        id,
        body,
      });
    } else {
      const [, name, paramsSource] = sequenceMatch;
      sequences.set(name, {
        name,
        params: paramsSource.split(',').map((param) => param.trim()).filter(Boolean),
        body,
      });
    }
    index = nextIndex;
  }
  return { macros, presets, sequences, lines: remaining };
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
    fail(lines[0] ?? { number: 1 }, 'Agent DSL macro expansion exceeded the recursion limit', DIAGNOSTIC_CODES.macroRecursionLimit);
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

function expandPresetUses(lines, presets, depth = 0) {
  if (depth > 8) {
    fail(lines[0] ?? { number: 1 }, 'Agent DSL preset expansion exceeded the recursion limit', DIAGNOSTIC_CODES.invalidPreset);
  }

  const expanded = [];
  for (const line of lines) {
    const match = line.trimmed.match(/^preset\s+([A-Za-z_][\w-]*)\s+([A-Za-z_][\w-]*)\s*$/);
    if (!match) {
      expanded.push(line);
      continue;
    }

    const [, category, id] = match;
    const preset = presets.get(`${category}:${id}`);
    if (!preset) {
      fail(line, `unknown preset "${category} ${id}"`, DIAGNOSTIC_CODES.unknownPreset);
    }
    const materialized = preset.body.map((entry) => {
      const text = `${' '.repeat(line.indent + entry.indent)}${entry.trimmed}`;
      return {
        ...entry,
        number: line.number,
        indent: line.indent + entry.indent,
        raw: text,
        text,
        trimmed: text.trim(),
        span: line.span,
      };
    });
    expanded.push(...expandPresetUses(materialized, presets, depth + 1));
  }
  return expanded;
}

function expandSequenceUses(lines, sequences, depth = 0) {
  if (depth > 8) {
    fail(lines[0] ?? { number: 1 }, 'Agent DSL sequence expansion exceeded the recursion limit', DIAGNOSTIC_CODES.sequenceRecursionLimit);
  }

  const expanded = [];
  for (const line of lines) {
    const match = line.trimmed.match(/^sequence\s+([A-Za-z_][\w-]*)\s*(?:\((.*)\))?\s*$/);
    if (!match) {
      expanded.push(line);
      continue;
    }

    const [, name, argsSource = ''] = match;
    const sequence = sequences.get(name);
    if (!sequence) {
      fail(line, `unknown sequence "${name}"`, DIAGNOSTIC_CODES.unknownSequence);
    }
    const args = splitCommaArgs(argsSource);
    if (args.length !== sequence.params.length) {
      fail(line, `sequence "${name}" expects ${sequence.params.length} argument(s), got ${args.length}`, DIAGNOSTIC_CODES.sequenceArityMismatch);
    }
    const values = Object.fromEntries(sequence.params.map((param, index) => [param, args[index]]));
    const materialized = sequence.body.map((entry) => {
      const text = `${' '.repeat(line.indent + entry.indent)}${substituteMacroLine(entry.trimmed, values)}`;
      return {
        ...entry,
        number: line.number,
        indent: line.indent + entry.indent,
        raw: text,
        text,
        trimmed: text.trim(),
        span: line.span,
      };
    });
    expanded.push(...expandSequenceUses(materialized, sequences, depth + 1));
  }
  return expanded;
}

function expandCompileTimeUses(lines, macros, presets, sequences) {
  let expanded = lines;
  for (let pass = 0; pass < 8; pass += 1) {
    const before = JSON.stringify(expanded.map((line) => [line.indent, line.trimmed]));
    const next = expandPresetUses(
      expandMacroCalls(
        expandSequenceUses(expanded, sequences),
        macros,
      ),
      presets,
    );
    const after = JSON.stringify(next.map((line) => [line.indent, line.trimmed]));
    expanded = next;
    if (after === before) {
      return expanded;
    }
  }
  fail(expanded[0] ?? { number: 1 }, 'Agent DSL compile-time expansion exceeded the recursion limit', DIAGNOSTIC_CODES.sequenceRecursionLimit);
}

function lineRecordsToSource(lines) {
  return lines.map((line) => line.raw ?? line.text ?? '').join('\n');
}

export function createAgentDslIr(source, options = {}) {
  const sourceFile = options.file ?? options.sourceFile ?? 'story.dsl';
  const parsed = parseAgentDsl(source, { file: sourceFile });
  throwIfDiagnostics(parsed.diagnostics);
  const bound = bindAgentDsl(parsed.ast);
  throwIfDiagnostics(bound.diagnostics);
  const preAnalyzed = analyzeAgentDsl(parsed.ast, bound.symbols);
  throwIfDiagnostics(preAnalyzed.diagnostics);
  const normalized = astToLineRecords(parsed.ast)
    .map((line) => {
      const text = stripComment(line.raw).replace(/\s+$/, '');
      return {
        ...line,
        text,
        trimmed: text.trim(),
      };
    })
    .filter((line) => line.trimmed);
  const { macros, presets, sequences, lines } = collectCompileTimeDeclarations(normalized);
  const expandedLines = expandCompileTimeUses(lines, macros, presets, sequences);
  const expanded = parseAgentDsl(lineRecordsToSource(expandedLines), { file: sourceFile });
  throwIfDiagnostics(expanded.diagnostics);
  const analyzed = analyzeAgentDsl(expanded.ast, bound.symbols);
  throwIfDiagnostics(analyzed.diagnostics);
  return lowerAgentDslToIr(expanded.ast, {
    lines: expandedLines,
    macroCount: macros.size,
    title: options.title,
  });
}

export function createAgentDslPlan(source, options = {}) {
  return createAgentDslBuildArtifacts(source, options).plan;
}

export function createAgentDslBuildArtifacts(source, options = {}) {
  const ir = createAgentDslIr(source, options);
  const plan = emitAgentDslPlan(ir, { title: ir.title });
  const sourceMap = createAgentDslSourceMap(ir, plan, {
    sourceRoot: options.sourceRoot,
    sourceText: source,
  });
  return {
    ir,
    plan,
    sourceMap,
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
