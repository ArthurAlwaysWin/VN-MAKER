import { createPosition, createSpan } from './ast.js';
import { createDiagnostic, DIAGNOSTIC_CODES, hasErrors } from './diagnostics.js';

const KEYWORDS = new Set(['true', 'false', 'null']);
const SINGLE_PUNCTUATION = new Set(['(', ')', ':', ',']);
const TWO_CHAR_OPERATORS = new Set(['->', '==', '!=', '>=', '<=']);
const ONE_CHAR_OPERATORS = new Set(['>', '<']);

function normalizeNewlines(source) {
  return String(source ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function createToken(type, value, file, line, column, offset, endColumn, endOffset, extra = {}) {
  return {
    type,
    value,
    span: createSpan(
      file,
      createPosition(file, line, column, offset),
      createPosition(file, line, endColumn, endOffset),
    ),
    ...extra,
  };
}

function unescapeString(value, quote) {
  return value
    .replaceAll(`\\${quote}`, quote)
    .replaceAll('\\\\', '\\');
}

function lineStartOffset(lines, lineIndex) {
  let offset = 0;
  for (let index = 0; index < lineIndex; index += 1) {
    offset += lines[index].length + 1;
  }
  return offset;
}

function scanLineContent(raw, lineNumber, baseOffset, file, diagnostics) {
  const tokens = [];
  let index = raw.match(/^ */)?.[0].length ?? 0;

  while (index < raw.length) {
    const char = raw[index];
    const column = index + 1;
    const offset = baseOffset + index;

    if (char === ' ') {
      index += 1;
      continue;
    }

    if (char === '#') {
      tokens.push(createToken('comment', raw.slice(index), file, lineNumber, column, offset, raw.length + 1, baseOffset + raw.length));
      break;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      let cursor = index + 1;
      let escaped = false;
      let value = '';
      while (cursor < raw.length) {
        const current = raw[cursor];
        if (escaped) {
          value += `\\${current}`;
          escaped = false;
          cursor += 1;
          continue;
        }
        if (current === '\\') {
          escaped = true;
          cursor += 1;
          continue;
        }
        if (current === quote) {
          const rawValue = raw.slice(index + 1, cursor);
          tokens.push(createToken(
            'string',
            unescapeString(rawValue, quote),
            file,
            lineNumber,
            column,
            offset,
            cursor + 2,
            baseOffset + cursor + 1,
            { quote },
          ));
          index = cursor + 1;
          value = null;
          break;
        }
        value += current;
        cursor += 1;
      }
      if (value !== null) {
        const span = createSpan(
          file,
          createPosition(file, lineNumber, column, offset),
          createPosition(file, lineNumber, raw.length + 1, baseOffset + raw.length),
        );
        diagnostics.push(createDiagnostic({
          code: DIAGNOSTIC_CODES.syntaxError,
          message: 'Unterminated string literal.',
          file,
          line: lineNumber,
          column,
          span,
        }));
        break;
      }
      continue;
    }

    const twoChars = raw.slice(index, index + 2);
    if (TWO_CHAR_OPERATORS.has(twoChars)) {
      tokens.push(createToken('operator', twoChars, file, lineNumber, column, offset, column + 2, offset + 2));
      index += 2;
      continue;
    }

    if (SINGLE_PUNCTUATION.has(char)) {
      tokens.push(createToken('punctuation', char, file, lineNumber, column, offset, column + 1, offset + 1));
      index += 1;
      continue;
    }

    if (ONE_CHAR_OPERATORS.has(char)) {
      tokens.push(createToken('operator', char, file, lineNumber, column, offset, column + 1, offset + 1));
      index += 1;
      continue;
    }

    if (char === '-' && /\d/.test(raw[index + 1] ?? '')) {
      const match = raw.slice(index).match(/^-?\d+(?:\.\d+)?/);
      const text = match[0];
      tokens.push(createToken('number', Number(text), file, lineNumber, column, offset, column + text.length, offset + text.length, { text }));
      index += text.length;
      continue;
    }

    if (/\d/.test(char)) {
      const match = raw.slice(index).match(/^\d+(?:\.\d+)?/);
      const text = match[0];
      tokens.push(createToken('number', Number(text), file, lineNumber, column, offset, column + text.length, offset + text.length, { text }));
      index += text.length;
      continue;
    }

    const match = raw.slice(index).match(/^\$?[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\-\u4e00-\u9fa5]*(?::[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\-\u4e00-\u9fa5]*)*/);
    if (match) {
      const text = match[0];
      const type = KEYWORDS.has(text) ? text : 'identifier';
      const value = type === 'true' ? true : type === 'false' ? false : type === 'null' ? null : text;
      tokens.push(createToken(type, value, file, lineNumber, column, offset, column + text.length, offset + text.length, { text }));
      index += text.length;
      continue;
    }

    diagnostics.push(createDiagnostic({
      code: DIAGNOSTIC_CODES.syntaxError,
      message: `Unexpected character "${char}".`,
      file,
      line: lineNumber,
      column,
      span: createSpan(
        file,
        createPosition(file, lineNumber, column, offset),
        createPosition(file, lineNumber, column + 1, offset + 1),
      ),
    }));
    index += 1;
  }

  return tokens;
}

export function lexAgentDsl(source, options = {}) {
  const file = options.file ?? 'story.dsl';
  const normalized = normalizeNewlines(source);
  const rawLines = normalized.split('\n');
  const tokens = [];
  const lines = [];
  const comments = [];
  const diagnostics = [];
  const indentStack = [0];

  rawLines.forEach((raw, lineIndex) => {
    const lineNumber = lineIndex + 1;
    const baseOffset = lineStartOffset(rawLines, lineIndex);
    const tabIndex = raw.indexOf('\t');
    if (tabIndex !== -1) {
      const column = tabIndex + 1;
      diagnostics.push(createDiagnostic({
        code: DIAGNOSTIC_CODES.invalidIndent,
        message: 'Agent DSL uses spaces for indentation; tabs are not supported.',
        file,
        line: lineNumber,
        column,
        span: createSpan(
          file,
          createPosition(file, lineNumber, column, baseOffset + tabIndex),
          createPosition(file, lineNumber, column + 1, baseOffset + tabIndex + 1),
        ),
      }));
    }

    const contentTokens = scanLineContent(raw, lineNumber, baseOffset, file, diagnostics);
    const codeTokens = contentTokens.filter((token) => token.type !== 'comment');
    const trimmed = raw.trim();
    if (codeTokens.length > 0) {
      const indent = raw.match(/^ */)?.[0].length ?? 0;
      const currentIndent = indentStack[indentStack.length - 1];
      if (indent > currentIndent) {
        indentStack.push(indent);
        tokens.push(createToken('indent', indent, file, lineNumber, 1, baseOffset, indent + 1, baseOffset + indent));
      } else if (indent < currentIndent) {
        while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
          indentStack.pop();
          tokens.push(createToken('dedent', indent, file, lineNumber, 1, baseOffset, indent + 1, baseOffset + indent));
        }
        if (indent !== indentStack[indentStack.length - 1]) {
          diagnostics.push(createDiagnostic({
            code: DIAGNOSTIC_CODES.invalidIndent,
            message: 'Indentation does not match any open block.',
            file,
            line: lineNumber,
            column: indent + 1,
          }));
        }
      }
      tokens.push(...contentTokens);
      tokens.push(createToken('newline', '\n', file, lineNumber, raw.length + 1, baseOffset + raw.length, raw.length + 1, baseOffset + raw.length));
      const lineComments = contentTokens.filter((token) => token.type === 'comment');
      for (const token of lineComments) {
        comments.push({
          number: lineNumber,
          indent,
          raw,
          token,
          standalone: false,
        });
      }
      lines.push({
        number: lineNumber,
        indent,
        raw,
        trimmed: raw.slice(indent).replace(/\s+#.*$/, '').trimEnd(),
        tokens: codeTokens,
        comments: lineComments,
        span: createSpan(file, codeTokens[0].span.start, codeTokens[codeTokens.length - 1].span.end),
      });
    } else if (trimmed.startsWith('#')) {
      const lineComments = contentTokens.filter((token) => token.type === 'comment');
      for (const token of lineComments) {
        comments.push({
          number: lineNumber,
          indent: raw.match(/^ */)?.[0].length ?? 0,
          raw,
          token,
          standalone: true,
        });
      }
      tokens.push(...contentTokens);
      tokens.push(createToken('newline', '\n', file, lineNumber, raw.length + 1, baseOffset + raw.length, raw.length + 1, baseOffset + raw.length));
    }
  });

  while (indentStack.length > 1) {
    indentStack.pop();
    const lastOffset = normalized.length;
    tokens.push(createToken('dedent', 0, file, rawLines.length, 1, lastOffset, 1, lastOffset));
  }
  tokens.push(createToken('eof', '', file, rawLines.length, rawLines[rawLines.length - 1].length + 1, normalized.length, rawLines[rawLines.length - 1].length + 1, normalized.length));

  return {
    ok: !hasErrors(diagnostics),
    tokens,
    lines,
    comments,
    diagnostics,
  };
}
