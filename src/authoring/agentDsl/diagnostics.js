export const DIAGNOSTIC_CODES = {
  syntaxError: 'dsl-syntax-error',
  invalidIndent: 'dsl-invalid-indent',
  duplicateSymbol: 'dsl-duplicate-symbol',
  unknownSceneTarget: 'dsl-unknown-scene-target',
  unknownCharacter: 'dsl-unknown-character',
  unknownVariable: 'dsl-unknown-variable',
  unknownEnding: 'dsl-unknown-ending',
  unknownCg: 'dsl-unknown-cg',
  invalidAssetPath: 'dsl-invalid-asset-path',
  invalidEffect: 'dsl-invalid-effect',
  macroNotFound: 'dsl-macro-not-found',
  macroArityMismatch: 'dsl-macro-arity-mismatch',
  macroRecursionLimit: 'dsl-macro-recursion-limit',
};

export function createDiagnostic({
  severity = 'error',
  code = DIAGNOSTIC_CODES.syntaxError,
  message,
  file = 'story.dsl',
  line = 1,
  column = 1,
  span = null,
  suggestedAction = undefined,
} = {}) {
  const diagnostic = {
    severity,
    code,
    message: message ?? 'Agent DSL diagnostic.',
    source: { file, line, column },
  };
  if (span) {
    diagnostic.span = {
      start: {
        line: span.start.line,
        column: span.start.column,
        offset: span.start.offset,
      },
      end: {
        line: span.end.line,
        column: span.end.column,
        offset: span.end.offset,
      },
    };
  }
  if (suggestedAction) {
    diagnostic.suggestedAction = suggestedAction;
  }
  return diagnostic;
}

export class AgentDslDiagnosticError extends Error {
  constructor(diagnostics, message = 'Agent DSL compilation failed') {
    super(message);
    this.name = 'AgentDslDiagnosticError';
    this.diagnostics = diagnostics;
    this.code = diagnostics?.[0]?.code ?? DIAGNOSTIC_CODES.syntaxError;
  }
}

export function hasErrors(diagnostics = []) {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}

export function throwIfDiagnostics(diagnostics = [], message = 'Agent DSL compilation failed') {
  if (hasErrors(diagnostics)) {
    throw new AgentDslDiagnosticError(diagnostics, message);
  }
}
