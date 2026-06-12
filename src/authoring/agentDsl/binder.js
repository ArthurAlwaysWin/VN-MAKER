import { createDiagnostic, DIAGNOSTIC_CODES } from './diagnostics.js';

const DECLARATION_TABLES = {
  SceneDeclaration: 'scenes',
  MacroDeclaration: 'macros',
  CharacterDeclaration: 'characters',
  VariableDeclaration: 'variables',
  AffectionDeclaration: 'variables',
  EndingDeclaration: 'endings',
  CgDeclaration: 'cgs',
  PresetDeclaration: 'presets',
  SequenceDeclaration: 'sequences',
  RouteDeclaration: 'routes',
};

function createSymbolTables() {
  return {
    scenes: new Map(),
    macros: new Map(),
    characters: new Map(),
    variables: new Map(),
    endings: new Map(),
    cgs: new Map(),
    presets: new Map(),
    sequences: new Map(),
    routes: new Map(),
  };
}

function symbolIdFor(node) {
  if (node.kind === 'PresetDeclaration') {
    return `${node.category}:${node.id}`;
  }
  if (node.kind === 'SequenceDeclaration') {
    return node.id;
  }
  if (node.kind === 'RouteDeclaration') {
    return node.id;
  }
  if (node.kind === 'AffectionDeclaration') {
    return node.tokens?.[2] ?? node.id;
  }
  return node.id;
}

function symbolTokenFor(node) {
  if (node.kind === 'PresetDeclaration') {
    return node.line?.tokens?.[2] ?? node.line?.tokens?.[1] ?? null;
  }
  if (node.kind === 'SequenceDeclaration') {
    return node.line?.tokens?.[1] ?? null;
  }
  if (node.symbolToken) {
    return node.symbolToken;
  }
  if (node.kind === 'AffectionDeclaration') {
    return node.line?.tokens?.[2] ?? node.line?.tokens?.[1] ?? null;
  }
  return node.line?.tokens?.[1] ?? null;
}

function symbolLabel(tableName) {
  if (tableName === 'cgs') return 'CG';
  return tableName.slice(0, -1);
}

function createDuplicateDiagnostic(tableName, id, node, existing) {
  const token = symbolTokenFor(node);
  const span = token?.span ?? node.span;
  const existingLine = existing.node?.span?.start?.line;
  const message = existingLine
    ? `Duplicate ${symbolLabel(tableName)} symbol "${id}" previously declared on line ${existingLine}.`
    : `Duplicate ${symbolLabel(tableName)} symbol "${id}".`;
  return createDiagnostic({
    code: DIAGNOSTIC_CODES.duplicateSymbol,
    message,
    file: span?.file ?? 'story.dsl',
    line: span?.start?.line ?? 1,
    column: span?.start?.column ?? 1,
    span,
    suggestedAction: {
      summary: `Rename or remove the duplicate ${symbolLabel(tableName)} "${id}".`,
      repairHint: {
        action: 'rename-or-remove-duplicate-symbol',
        table: tableName,
        id,
      },
    },
  });
}

function addSymbol(tables, tableName, id, node, diagnostics) {
  if (!id) return;
  const table = tables[tableName];
  const existing = table.get(id);
  if (existing) {
    diagnostics.push(createDuplicateDiagnostic(tableName, id, node, existing));
    return;
  }
  table.set(id, {
    id,
    kind: node.kind,
    node,
    span: node.span,
  });
}

function routeFieldValue(node, field) {
  const entry = (node.body ?? []).find((child) => child.field === field);
  if (!entry) return null;
  if (field === 'affection') {
    return entry.tokens?.[1] === 'variable' ? entry.tokens?.[2] : null;
  }
  return entry.tokens?.[1] ?? null;
}

function routeFieldToken(node, field) {
  const entry = (node.body ?? []).find((child) => child.field === field);
  if (!entry) return null;
  if (field === 'affection') {
    return entry.line?.tokens?.[2] ?? entry.line?.tokens?.[1] ?? null;
  }
  return entry.line?.tokens?.[1] ?? null;
}

function addRouteGeneratedSymbols(tables, node, diagnostics) {
  const affectionVariable = routeFieldValue(node, 'affection');
  const goodEnd = routeFieldValue(node, 'good_end');
  const normalEnd = routeFieldValue(node, 'normal_end');
  if (affectionVariable) {
    addSymbol(tables, 'variables', affectionVariable, {
      ...node,
      kind: 'RouteGeneratedVariable',
      id: affectionVariable,
      symbolToken: routeFieldToken(node, 'affection'),
    }, diagnostics);
  }
  for (const [field, id] of [['good_end', goodEnd], ['normal_end', normalEnd]]) {
    if (!id) continue;
    const symbolToken = routeFieldToken(node, field);
    addSymbol(tables, 'endings', id, {
      ...node,
      kind: 'RouteGeneratedEnding',
      id,
      symbolToken,
    }, diagnostics);
    addSymbol(tables, 'scenes', id, {
      ...node,
      kind: 'RouteGeneratedScene',
      id,
      symbolToken,
    }, diagnostics);
  }
}

export function bindAgentDsl(ast) {
  const symbols = createSymbolTables();
  const diagnostics = [];

  for (const node of ast?.body ?? []) {
    const tableName = DECLARATION_TABLES[node.kind];
    if (!tableName) continue;
    addSymbol(symbols, tableName, symbolIdFor(node), node, diagnostics);
    if (node.kind === 'RouteDeclaration') {
      addRouteGeneratedSymbols(symbols, node, diagnostics);
    }
  }

  return {
    ok: diagnostics.length === 0,
    symbols,
    diagnostics,
  };
}
