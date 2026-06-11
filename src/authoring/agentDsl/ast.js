export function createPosition(file, line, column, offset) {
  return { file, line, column, offset };
}

export function createSpan(file, start, end) {
  return {
    file,
    start: {
      line: start.line,
      column: start.column,
      offset: start.offset,
    },
    end: {
      line: end.line,
      column: end.column,
      offset: end.offset,
    },
  };
}

export function spanFromToken(token) {
  return token?.span ?? null;
}

export function spanFromRange(file, startToken, endToken = startToken) {
  if (!startToken?.span || !endToken?.span) {
    return null;
  }
  return createSpan(file, startToken.span.start, endToken.span.end);
}

export function mergeSpans(file, firstSpan, secondSpan) {
  if (!firstSpan) return secondSpan ?? null;
  if (!secondSpan) return firstSpan;
  return createSpan(file, firstSpan.start, secondSpan.end);
}

export function createNode(kind, span, fields = {}) {
  return {
    kind,
    span,
    ...fields,
  };
}
