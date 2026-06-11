import { createDiagnostic, DIAGNOSTIC_CODES } from './diagnostics.js';
import { agentDslTokenText } from './parser.js';

const VALID_EFFECT_TYPES = new Set(['var:set', 'var:add', 'var:sub', 'unlock:ending', 'unlock:cg']);
const CG_FIELD_KEYS = new Set(['image', 'images', 'thumbnail', 'lockedThumbnail', 'locked-thumbnail']);
const CHARACTER_FIELD_KEYS = new Set(['expression']);
const MEDIA_STATEMENT_KINDS = new Set(['BackgroundStatement', 'BgmStatement', 'SeStatement']);

function tokenText(token) {
  return agentDslTokenText(token);
}

function tokenAt(line, index) {
  return line?.tokens?.[index] ?? null;
}

function spanFor(token, node) {
  return token?.span ?? node?.span ?? node?.line?.span ?? null;
}

function diagnosticFromToken(code, message, token, node, suggestedAction) {
  const span = spanFor(token, node);
  return createDiagnostic({
    code,
    message,
    file: span?.file ?? 'story.dsl',
    line: span?.start?.line ?? 1,
    column: span?.start?.column ?? 1,
    span,
    suggestedAction,
  });
}

function hasSymbol(symbols, tableName, id) {
  return !id || Boolean(symbols?.[tableName]?.has(id));
}

function isPathTraversalOrAbsolute(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  const text = value.trim();
  if (/^[A-Za-z]:[\\/]/.test(text)) return true;
  if (text.startsWith('/') || text.startsWith('\\')) return true;
  if (text.startsWith('file:')) return true;
  return text.split(/[\\/]+/).some((segment) => segment === '..');
}

function reportInvalidAssetPath(diagnostics, pathValue, token, node) {
  if (!isPathTraversalOrAbsolute(pathValue)) return;
  diagnostics.push(diagnosticFromToken(
    DIAGNOSTIC_CODES.invalidAssetPath,
    `Asset path "${pathValue}" must be project-relative and must not contain traversal segments.`,
    token,
    node,
    {
      summary: 'Use a project-relative asset path such as backgrounds/room.png.',
      repairHint: {
        action: 'replace-asset-path',
        assetPath: pathValue,
      },
    },
  ));
}

function indexOfToken(line, value) {
  return line?.tokens?.findIndex((token) => tokenText(token) === value) ?? -1;
}

function tokenAfter(line, value) {
  const index = indexOfToken(line, value);
  return index === -1 ? null : tokenAt(line, index + 1);
}

function analyzeSceneTarget(diagnostics, symbols, id, token, node) {
  if (!id || hasSymbol(symbols, 'scenes', id)) return;
  diagnostics.push(diagnosticFromToken(
    DIAGNOSTIC_CODES.unknownSceneTarget,
    `Scene target "${id}" is not declared.`,
    token,
    node,
    {
      summary: `Declare scene ${id} or change the target.`,
      repairHint: {
        action: 'add-scene-or-retarget',
        target: id,
      },
    },
  ));
}

function analyzeCharacterReference(diagnostics, symbols, id, token, node) {
  if (!id || hasSymbol(symbols, 'characters', id)) return;
  diagnostics.push(diagnosticFromToken(
    DIAGNOSTIC_CODES.unknownCharacter,
    `Character "${id}" is not declared.`,
    token,
    node,
    {
      summary: `Declare character ${id} or change the speaker/staging reference.`,
      repairHint: {
        action: 'declare-character-or-retarget',
        characterId: id,
      },
    },
  ));
}

function analyzeVariableReference(diagnostics, symbols, id, token, node) {
  if (!id || hasSymbol(symbols, 'variables', id)) return;
  diagnostics.push(diagnosticFromToken(
    DIAGNOSTIC_CODES.unknownVariable,
    `Variable "${id}" is not declared.`,
    token,
    node,
    {
      summary: `Declare variable ${id} or change the reference.`,
      repairHint: {
        action: 'declare-variable-or-retarget',
        variableId: id,
      },
    },
  ));
}

function analyzeUnlockReference(diagnostics, symbols, kind, id, token, node) {
  const tableName = kind === 'ending' ? 'endings' : 'cgs';
  const code = kind === 'ending' ? DIAGNOSTIC_CODES.unknownEnding : DIAGNOSTIC_CODES.unknownCg;
  const label = kind === 'ending' ? 'Ending' : 'CG';
  if (!id || hasSymbol(symbols, tableName, id)) return;
  diagnostics.push(diagnosticFromToken(
    code,
    `${label} "${id}" is not declared.`,
    token,
    node,
    {
      summary: `Declare ${kind} ${id} or change the unlock reference.`,
      repairHint: {
        action: `declare-${kind}-or-retarget`,
        id,
      },
    },
  ));
}

function analyzeCondition(diagnostics, symbols, node) {
  const line = node.line;
  analyzeVariableReference(diagnostics, symbols, tokenText(tokenAt(line, 1)), tokenAt(line, 1), node);
  const arrowIndex = indexOfToken(line, '->');
  if (arrowIndex !== -1) {
    analyzeSceneTarget(diagnostics, symbols, tokenText(tokenAt(line, arrowIndex + 1)), tokenAt(line, arrowIndex + 1), node);
  }
  const elseIndex = indexOfToken(line, 'else');
  if (elseIndex !== -1) {
    analyzeSceneTarget(diagnostics, symbols, tokenText(tokenAt(line, elseIndex + 1)), tokenAt(line, elseIndex + 1), node);
  }
}

function analyzeEffect(diagnostics, symbols, node) {
  const line = node.line;
  const command = tokenText(tokenAt(line, 0));
  if (command === 'unlock') {
    const kind = tokenText(tokenAt(line, 1));
    if (kind !== 'ending' && kind !== 'cg') {
      diagnostics.push(diagnosticFromToken(
        DIAGNOSTIC_CODES.invalidEffect,
        'Unlock effects must target "ending" or "cg".',
        tokenAt(line, 1),
        node,
      ));
      return;
    }
    analyzeUnlockReference(diagnostics, symbols, kind, tokenText(tokenAt(line, 2)), tokenAt(line, 2), node);
    return;
  }
  if (command === 'affection') {
    analyzeVariableReference(diagnostics, symbols, tokenText(tokenAt(line, 1)), tokenAt(line, 1), node);
    return;
  }
  if (command !== 'effect') return;
  const effectType = tokenText(tokenAt(line, 1));
  if (!VALID_EFFECT_TYPES.has(effectType)) {
    diagnostics.push(diagnosticFromToken(
      DIAGNOSTIC_CODES.invalidEffect,
      `Unsupported effect type "${effectType}".`,
      tokenAt(line, 1),
      node,
      {
        summary: 'Use var:set, var:add, var:sub, unlock:ending, or unlock:cg.',
        repairHint: {
          action: 'replace-effect-type',
          effectType,
          supportedEffectTypes: [...VALID_EFFECT_TYPES],
        },
      },
    ));
    return;
  }
  if (effectType.startsWith('var:')) {
    analyzeVariableReference(diagnostics, symbols, tokenText(tokenAt(line, 2)), tokenAt(line, 2), node);
  } else if (effectType === 'unlock:ending') {
    analyzeUnlockReference(diagnostics, symbols, 'ending', tokenText(tokenAt(line, 2)), tokenAt(line, 2), node);
  } else if (effectType === 'unlock:cg') {
    analyzeUnlockReference(diagnostics, symbols, 'cg', tokenText(tokenAt(line, 2)), tokenAt(line, 2), node);
  }
}

function analyzeSay(diagnostics, symbols, node) {
  const line = node.line;
  const firstArg = tokenAt(line, 1);
  if (firstArg?.type !== 'string' && tokenText(firstArg) !== 'null') {
    analyzeCharacterReference(diagnostics, symbols, tokenText(firstArg), firstArg, node);
  }
  const voiceIndex = indexOfToken(line, 'voice');
  if (voiceIndex !== -1) {
    reportInvalidAssetPath(diagnostics, tokenText(tokenAt(line, voiceIndex + 1)), tokenAt(line, voiceIndex + 1), node);
  }
}

function analyzeDeclarationAssets(diagnostics, node) {
  const line = node.line;
  const tokens = line?.tokens ?? [];
  if (node.kind === 'CharacterDeclaration') {
    tokens.forEach((token, index) => {
      if (CHARACTER_FIELD_KEYS.has(tokenText(token))) {
        reportInvalidAssetPath(diagnostics, tokenText(tokens[index + 2]), tokens[index + 2], node);
      }
    });
  }
  if (node.kind === 'CgDeclaration') {
    for (let index = 0; index < tokens.length; index += 1) {
      if (!CG_FIELD_KEYS.has(tokenText(tokens[index]))) continue;
      let cursor = index + 1;
      while (cursor < tokens.length && !CG_FIELD_KEYS.has(tokenText(tokens[cursor])) && !['category', 'order', 'description'].includes(tokenText(tokens[cursor]))) {
        reportInvalidAssetPath(diagnostics, tokenText(tokens[cursor]), tokens[cursor], node);
        cursor += 1;
      }
    }
  }
}

function analyzeMediaAsset(diagnostics, node) {
  const line = node.line;
  if (MEDIA_STATEMENT_KINDS.has(node.kind)) {
    reportInvalidAssetPath(diagnostics, tokenText(tokenAt(line, 1)), tokenAt(line, 1), node);
  }
}

function visitNode(node, symbols, diagnostics, options) {
  if (!node || typeof node !== 'object') return;
  if (node.kind === 'MacroDeclaration' && options.skipMacroBodies) {
    return;
  }
  if (node.kind === 'SceneDeclaration') {
    analyzeSceneTarget(diagnostics, symbols, node.next, tokenAfter(node.line, 'next'), node);
  } else if (node.kind === 'OptionStatement') {
    analyzeSceneTarget(diagnostics, symbols, node.target, tokenAfter(node.line, '->'), node);
  } else if (node.kind === 'ConditionStatement') {
    analyzeCondition(diagnostics, symbols, node);
  } else if (node.kind === 'JumpStatement') {
    analyzeSceneTarget(diagnostics, symbols, node.target, tokenAt(node.line, 1), node);
  } else if (node.kind === 'ShowStatement') {
    analyzeCharacterReference(diagnostics, symbols, tokenText(tokenAt(node.line, 1)), tokenAt(node.line, 1), node);
  } else if (node.kind === 'SayStatement') {
    analyzeSay(diagnostics, symbols, node);
  } else if (node.kind === 'EffectStatement') {
    analyzeEffect(diagnostics, symbols, node);
  }

  analyzeDeclarationAssets(diagnostics, node);
  analyzeMediaAsset(diagnostics, node);

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => visitNode(entry, symbols, diagnostics, options));
    } else if (value && typeof value === 'object' && value.kind) {
      visitNode(value, symbols, diagnostics, options);
    }
  }
}

export function analyzeAgentDsl(ast, symbols, options = {}) {
  const diagnostics = [];
  const visitOptions = {
    skipMacroBodies: options.skipMacroBodies ?? true,
  };
  visitNode(ast, symbols, diagnostics, visitOptions);
  return {
    ok: diagnostics.length === 0,
    diagnostics,
  };
}
