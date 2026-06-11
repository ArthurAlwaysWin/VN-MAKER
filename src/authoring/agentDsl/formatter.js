import { parseAgentDsl, agentDslTokenText } from './parser.js';
import { throwIfDiagnostics } from './diagnostics.js';

const INDENT = '  ';

function quoteString(value) {
  return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function valueToken(token) {
  if (!token) return '';
  if (token.type === 'string') return quoteString(token.value);
  return agentDslTokenText(token);
}

function tokensToSource(tokens) {
  let output = '';
  for (const token of tokens) {
    const value = valueToken(token);
    if (!value) continue;
    if (value === ',') {
      output = output.replace(/\s+$/, '');
      output += ', ';
      continue;
    }
    if (value === '(') {
      output = output.replace(/\s+$/, '');
      output += '(';
      continue;
    }
    if (value === ')') {
      output = output.replace(/\s+$/, '');
      output += ')';
      continue;
    }
    if (value === ':') {
      output = output.replace(/\s+$/, '');
      output += ':';
      continue;
    }
    if (value === '->') {
      output = output.replace(/\s+$/, '');
      output += ' -> ';
      continue;
    }
    output += output && !output.endsWith(' ') && !output.endsWith('(') ? ` ${value}` : value;
  }
  return output.trimEnd();
}

function formatLine(line, indentLevel) {
  const inlineComment = line.comments?.[0]?.value;
  return `${INDENT.repeat(indentLevel)}${tokensToSource(line.tokens)}${inlineComment ? ` ${inlineComment}` : ''}`;
}

function formatComment(comment) {
  return `${INDENT.repeat(Math.floor(comment.indent / 2))}${comment.token.value}`;
}

function formatTopLevelDeclaration(node) {
  return formatLine(node.line, 0);
}

function formatStatement(node, indentLevel, lines, emitCommentsBefore = () => {}) {
  if (node.kind === 'ChoiceStatement') {
    lines.push(formatLine(node.line, indentLevel));
    for (const option of node.options) {
      emitCommentsBefore(option.line.number);
      lines.push(formatLine(option.line, indentLevel + 1));
      for (const child of option.body) {
        emitCommentsBefore(child.line.number);
        formatStatement(child, indentLevel + 2, lines, emitCommentsBefore);
      }
    }
    return;
  }

  lines.push(formatLine(node.line, indentLevel));
}

export function formatAgentDsl(source, options = {}) {
  const parsed = parseAgentDsl(source, options);
  throwIfDiagnostics(parsed.diagnostics);

  const lines = [];
  const standaloneComments = (parsed.comments ?? [])
    .filter((comment) => comment.standalone)
    .sort((left, right) => left.number - right.number);
  let commentIndex = 0;

  function emitCommentsBefore(lineNumber) {
    while (commentIndex < standaloneComments.length && standaloneComments[commentIndex].number < lineNumber) {
      lines.push(formatComment(standaloneComments[commentIndex]));
      commentIndex += 1;
    }
  }

  for (const node of parsed.ast.body) {
    emitCommentsBefore(node.line.number);
    if (lines.length > 0) {
      lines.push('');
    }
    if (node.kind === 'MacroDeclaration') {
      lines.push(formatLine(node.line, 0));
      for (const statement of node.body) {
        emitCommentsBefore(statement.line.number);
        formatStatement(statement, 1, lines, emitCommentsBefore);
      }
      continue;
    }
    if (node.kind === 'SceneDeclaration') {
      lines.push(formatLine(node.line, 0));
      for (const statement of node.body) {
        emitCommentsBefore(statement.line.number);
        formatStatement(statement, 1, lines, emitCommentsBefore);
      }
      continue;
    }
    lines.push(formatTopLevelDeclaration(node));
  }
  emitCommentsBefore(Number.POSITIVE_INFINITY);

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
}
