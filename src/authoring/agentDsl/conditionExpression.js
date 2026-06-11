import { createDiagnostic, DIAGNOSTIC_CODES } from './diagnostics.js';

const COMPARISON_OPERATORS = new Set(['==', '!=', '>', '>=', '<', '<=']);
const LOGICAL_OPERATORS = new Set(['and', 'or']);

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
  if (token.type === 'string' || token.type === 'number' || token.type === 'true' || token.type === 'false' || token.type === 'null') {
    return token.value;
  }
  const text = tokenText(token);
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === 'null') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  return text;
}

function scalarTypeFromToken(token) {
  if (!token) return 'unknown';
  if (token.type === 'number') return 'number';
  if (token.type === 'true' || token.type === 'false') return 'bool';
  if (token.type === 'string' || token.type === 'identifier') return 'string';
  if (token.type === 'null') return 'null';
  const value = scalarFromToken(token);
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'bool';
  if (value === null) return 'null';
  return 'string';
}

function spanFor(token, line) {
  return token?.span ?? line?.span ?? null;
}

function diagnosticForToken(code, message, token, line, suggestedAction = undefined) {
  const span = spanFor(token, line);
  return createDiagnostic({
    code,
    message,
    file: span?.file ?? 'story.dsl',
    line: span?.start?.line ?? line?.number ?? 1,
    column: span?.start?.column ?? 1,
    span,
    suggestedAction,
  });
}

function tokenizeConditionText(source, line = {}) {
  const tokens = [];
  const text = String(source ?? '');
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      let cursor = index + 1;
      let escaped = false;
      let value = '';
      while (cursor < text.length) {
        const current = text[cursor];
        if (escaped) {
          value += current;
          escaped = false;
          cursor += 1;
          continue;
        }
        if (current === '\\') {
          escaped = true;
          cursor += 1;
          continue;
        }
        if (current === quote) break;
        value += current;
        cursor += 1;
      }
      tokens.push({ type: 'string', value, text: text.slice(index, Math.min(cursor + 1, text.length)) });
      index = Math.min(cursor + 1, text.length);
      continue;
    }
    const two = text.slice(index, index + 2);
    if (['->', '==', '!=', '>=', '<='].includes(two)) {
      tokens.push({ type: 'operator', value: two, text: two });
      index += 2;
      continue;
    }
    if (['(', ')'].includes(char)) {
      tokens.push({ type: 'punctuation', value: char, text: char });
      index += 1;
      continue;
    }
    if (['>', '<'].includes(char)) {
      tokens.push({ type: 'operator', value: char, text: char });
      index += 1;
      continue;
    }
    const numberMatch = text.slice(index).match(/^-?\d+(?:\.\d+)?/);
    if (numberMatch) {
      const [numberText] = numberMatch;
      tokens.push({ type: 'number', value: Number(numberText), text: numberText });
      index += numberText.length;
      continue;
    }
    const identifierMatch = text.slice(index).match(/^[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\-\u4e00-\u9fa5]*(?::[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\-\u4e00-\u9fa5]*)*/);
    if (identifierMatch) {
      const [identifier] = identifierMatch;
      if (identifier === 'true') tokens.push({ type: 'true', value: true, text: identifier });
      else if (identifier === 'false') tokens.push({ type: 'false', value: false, text: identifier });
      else if (identifier === 'null') tokens.push({ type: 'null', value: null, text: identifier });
      else tokens.push({ type: 'identifier', value: identifier, text: identifier });
      index += identifier.length;
      continue;
    }
    tokens.push({ type: 'unknown', value: char, text: char });
    index += 1;
  }
  tokens.forEach((token) => {
    if (!token.span && line?.span) token.span = line.span;
  });
  return tokens;
}

class ExpressionParser {
  constructor(tokens, line) {
    this.tokens = tokens;
    this.line = line;
    this.index = 0;
    this.diagnostics = [];
  }

  current() {
    return this.tokens[this.index] ?? null;
  }

  consume() {
    const token = this.current();
    this.index += 1;
    return token;
  }

  match(value) {
    if (tokenText(this.current()) !== value) return false;
    this.index += 1;
    return true;
  }

  invalid(message, token = this.current()) {
    this.diagnostics.push(diagnosticForToken(
      DIAGNOSTIC_CODES.invalidConditionExpression,
      message,
      token,
      this.line,
    ));
  }

  parse() {
    if (this.tokens.length === 0) {
      this.invalid('Condition expression is required.');
      return null;
    }
    const expression = this.parseOr();
    if (this.current()) {
      this.invalid(`Unexpected token "${tokenText(this.current())}" in condition expression.`, this.current());
      return expression;
    }
    return expression;
  }

  parseOr() {
    let left = this.parseAnd();
    const children = [left].filter(Boolean);
    while (tokenText(this.current()) === 'or') {
      this.consume();
      const right = this.parseAnd();
      if (right) children.push(right);
    }
    if (children.length === 1) return left;
    return { kind: 'LogicalExpression', operator: 'or', children };
  }

  parseAnd() {
    let left = this.parsePrimary();
    const children = [left].filter(Boolean);
    while (tokenText(this.current()) === 'and') {
      this.consume();
      const right = this.parsePrimary();
      if (right) children.push(right);
    }
    if (children.length === 1) return left;
    return { kind: 'LogicalExpression', operator: 'and', children };
  }

  parsePrimary() {
    if (tokenText(this.current()) === 'not') {
      this.invalid('"not" is not supported in condition expressions yet.', this.current());
      this.consume();
      return this.parsePrimary();
    }
    if (this.match('(')) {
      const expression = this.parseOr();
      if (!this.match(')')) {
        this.invalid('Expected ")" to close condition expression.', this.current());
      }
      return { kind: 'GroupedExpression', expression };
    }
    return this.parseComparison();
  }

  parseComparison() {
    const variableToken = this.consume();
    if (!variableToken || variableToken.type !== 'identifier') {
      this.invalid('Condition comparison must start with a variable identifier.', variableToken);
      return null;
    }
    const operatorToken = this.consume();
    const operator = tokenText(operatorToken);
    if (!COMPARISON_OPERATORS.has(operator)) {
      this.invalid('Condition comparison requires one of ==, !=, >, >=, <, <=.', operatorToken);
      return null;
    }
    const valueToken = this.consume();
    if (!valueToken || valueToken.type === 'operator' || valueToken.type === 'punctuation' || LOGICAL_OPERATORS.has(tokenText(valueToken))) {
      this.invalid('Condition comparison requires a scalar value.', valueToken);
      return null;
    }
    return {
      kind: 'ComparisonExpression',
      variableId: tokenText(variableToken),
      operator,
      value: scalarFromToken(valueToken),
      valueType: scalarTypeFromToken(valueToken),
      variableToken,
      operatorToken,
      valueToken,
    };
  }
}

function splitConditionTokens(line) {
  const tokens = line?.tokens ?? tokenizeConditionText(line?.trimmed ?? line?.raw ?? '', line);
  const ifIndex = tokenText(tokens[0]) === 'if' ? 0 : -1;
  const arrowIndex = tokens.findIndex((token) => tokenText(token) === '->');
  const elseIndex = arrowIndex === -1
    ? -1
    : tokens.findIndex((token, index) => index > arrowIndex && tokenText(token) === 'else');
  return {
    tokens,
    expressionTokens: ifIndex === 0 && arrowIndex !== -1 ? tokens.slice(1, arrowIndex) : [],
    arrowIndex,
    elseIndex,
    trueTargetToken: arrowIndex === -1 ? null : tokens[arrowIndex + 1] ?? null,
    falseTargetToken: elseIndex === -1 ? null : tokens[elseIndex + 1] ?? null,
  };
}

export function parseConditionStatement(line) {
  const parts = splitConditionTokens(line);
  const diagnostics = [];
  if (parts.arrowIndex === -1) {
    diagnostics.push(diagnosticForToken(
      DIAGNOSTIC_CODES.invalidConditionExpression,
      'Condition syntax is: if expression -> true_scene else false_scene.',
      parts.tokens[0],
      line,
    ));
    return { ok: false, diagnostics, condition: null };
  }
  if (!parts.trueTargetToken) {
    diagnostics.push(diagnosticForToken(
      DIAGNOSTIC_CODES.invalidConditionExpression,
      'Condition requires a true scene target after "->".',
      parts.tokens[parts.arrowIndex],
      line,
    ));
  } else {
    const expectedNextIndex = parts.tokens.indexOf(parts.trueTargetToken) + 1;
    const nextToken = parts.tokens[expectedNextIndex];
    if (nextToken && tokenText(nextToken) !== 'else') {
      diagnostics.push(diagnosticForToken(
        DIAGNOSTIC_CODES.invalidConditionExpression,
        `Unexpected token "${tokenText(nextToken)}" after true scene target.`,
        nextToken,
        line,
      ));
    }
  }
  if (parts.elseIndex !== -1 && !parts.falseTargetToken) {
    diagnostics.push(diagnosticForToken(
      DIAGNOSTIC_CODES.invalidConditionExpression,
      'Condition requires a false scene target after "else".',
      parts.tokens[parts.elseIndex],
      line,
    ));
  } else if (parts.falseTargetToken) {
    const expectedEndIndex = parts.tokens.indexOf(parts.falseTargetToken) + 1;
    const trailingToken = parts.tokens[expectedEndIndex];
    if (trailingToken) {
      diagnostics.push(diagnosticForToken(
        DIAGNOSTIC_CODES.invalidConditionExpression,
        `Unexpected token "${tokenText(trailingToken)}" after false scene target.`,
        trailingToken,
        line,
      ));
    }
  }
  const parser = new ExpressionParser(parts.expressionTokens, line);
  const expression = parser.parse();
  diagnostics.push(...parser.diagnostics);
  return {
    ok: diagnostics.length === 0,
    diagnostics,
    condition: {
      expression,
      trueTarget: tokenText(parts.trueTargetToken) || null,
      falseTarget: tokenText(parts.falseTargetToken) || null,
      trueTargetToken: parts.trueTargetToken,
      falseTargetToken: parts.falseTargetToken,
    },
  };
}

function unwrapGroup(expression) {
  return expression?.kind === 'GroupedExpression' ? unwrapGroup(expression.expression) : expression;
}

function flattenSupportedExpression(expression, diagnostics = [], line = null) {
  const unwrapped = unwrapGroup(expression);
  if (!unwrapped) {
    diagnostics.push(diagnosticForToken(
      DIAGNOSTIC_CODES.invalidConditionExpression,
      'Condition expression could not be parsed.',
      null,
      line,
    ));
    return null;
  }
  if (unwrapped.kind === 'ComparisonExpression') {
    return { conditionMode: 'all', comparisons: [unwrapped] };
  }
  if (unwrapped.kind !== 'LogicalExpression') {
    diagnostics.push(diagnosticForToken(
      DIAGNOSTIC_CODES.nestedConditionUnsupported,
      'Only flat "and" or flat "or" condition expressions are supported.',
      null,
      line,
    ));
    return null;
  }
  const comparisons = [];
  for (const child of unwrapped.children) {
    const childExpression = unwrapGroup(child);
    if (childExpression?.kind !== 'ComparisonExpression') {
      diagnostics.push(diagnosticForToken(
        DIAGNOSTIC_CODES.nestedConditionUnsupported,
        'Nested or mixed condition expressions are not supported yet.',
        childExpression?.variableToken,
        line,
      ));
      return null;
    }
    comparisons.push(childExpression);
  }
  return {
    conditionMode: unwrapped.operator === 'or' ? 'any' : 'all',
    comparisons,
  };
}

export function lowerConditionExpressionToRows(expression, line = null) {
  const diagnostics = [];
  const flattened = flattenSupportedExpression(expression, diagnostics, line);
  if (!flattened) {
    return { ok: false, diagnostics, conditionMode: 'all', conditions: [] };
  }
  return {
    ok: true,
    diagnostics,
    conditionMode: flattened.conditionMode,
    conditions: flattened.comparisons.map((comparison) => ({
      variableId: comparison.variableId,
      operator: comparison.operator,
      value: comparison.value,
    })),
    comparisons: flattened.comparisons,
  };
}

export function visitConditionComparisons(expression, visitor) {
  const unwrapped = unwrapGroup(expression);
  if (!unwrapped) return;
  if (unwrapped.kind === 'ComparisonExpression') {
    visitor(unwrapped);
    return;
  }
  if (unwrapped.kind === 'LogicalExpression') {
    unwrapped.children.forEach((child) => visitConditionComparisons(child, visitor));
  }
}

export function createConditionDiagnostic(code, message, token, line, suggestedAction = undefined) {
  return diagnosticForToken(code, message, token, line, suggestedAction);
}
