import { createDiagnostic, DIAGNOSTIC_CODES } from './diagnostics.js';
import {
  createConditionDiagnostic,
  lowerConditionExpressionToRows,
  parseConditionStatement,
  visitConditionComparisons,
} from './conditionExpression.js';
import { agentDslTokenText } from './parser.js';

const VALID_EFFECT_TYPES = new Set(['var:set', 'var:add', 'var:sub', 'unlock:ending', 'unlock:cg']);
const VALID_PRESET_CATEGORIES = new Set(['mood']);
const PRESET_BODY_STATEMENT_KINDS = new Set([
  'BackgroundStatement',
  'BgmStatement',
  'SeStatement',
  'ShowStatement',
  'TransitionStatement',
  'CameraStatement',
  'ParticlesStatement',
]);
const SEQUENCE_BODY_STATEMENT_KINDS = new Set([
  'PageStatement',
  'VideoStatement',
  'BackgroundStatement',
  'BgmStatement',
  'SeStatement',
  'ShowStatement',
  'SayStatement',
  'NarrateStatement',
  'TransitionStatement',
  'CameraStatement',
  'ParticlesStatement',
  'PresetUseStatement',
  'SequenceUseStatement',
  'MacroCall',
  'EffectStatement',
]);
const CG_FIELD_KEYS = new Set(['image', 'images', 'thumbnail', 'lockedThumbnail', 'locked-thumbnail']);
const VIDEO_DECLARATION_FIELD_KEYS = new Set(['poster']);
const CHARACTER_FIELD_KEYS = new Set(['expression']);
const MEDIA_STATEMENT_KINDS = new Set(['BackgroundStatement', 'BgmStatement', 'SeStatement']);
const ROUTE_FIELDS = new Set(['affection', 'good_end', 'normal_end']);
const VIDEO_REFERENCE_KEYS = new Set([
  'videoId',
  'video-id',
  'id',
  'file',
  'poster',
  'play',
  'oncePerProfile',
  'once-per-profile',
  'skippable',
  'controls',
  'volume',
  'audioMode',
  'audio-mode',
  'fit',
  'autoAdvance',
  'auto-advance',
  'target',
  'loop',
]);

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

function analyzeConditionVariableReference(diagnostics, symbols, id, token, node) {
  if (!id || hasSymbol(symbols, 'variables', id)) return;
  diagnostics.push(diagnosticFromToken(
    DIAGNOSTIC_CODES.unknownConditionVariable,
    `Condition variable "${id}" is not declared.`,
    token,
    node,
    {
      summary: `Declare variable ${id} or change the condition.`,
      repairHint: {
        action: 'declare-variable-or-update-condition',
        variableId: id,
      },
    },
  ));
}

function variableTypeFor(symbols, id) {
  const symbol = symbols?.variables?.get(id);
  const node = symbol?.node;
  if (!node) return null;
  if (node.kind === 'AffectionDeclaration') return 'number';
  const declaredType = node.tokens?.[2];
  return ['number', 'bool', 'string'].includes(declaredType) ? declaredType : 'number';
}

function conditionTypesMatch(variableType, comparison) {
  if (!variableType) return true;
  if (['>', '>=', '<', '<='].includes(comparison.operator)) {
    return variableType === 'number' && comparison.valueType === 'number';
  }
  if (comparison.operator === '==' || comparison.operator === '!=') {
    return variableType === comparison.valueType;
  }
  return true;
}

function analyzeConditionType(diagnostics, symbols, comparison, node) {
  const variableType = variableTypeFor(symbols, comparison.variableId);
  if (!variableType || conditionTypesMatch(variableType, comparison)) return;
  diagnostics.push(createConditionDiagnostic(
    DIAGNOSTIC_CODES.conditionTypeMismatch,
    `Condition compares ${variableType} variable "${comparison.variableId}" with ${comparison.valueType} value using "${comparison.operator}".`,
    comparison.valueToken ?? comparison.operatorToken ?? comparison.variableToken,
    node.line,
    {
      summary: 'Use a comparison value that matches the declared variable type.',
      repairHint: {
        action: 'fix-condition-type',
        variableId: comparison.variableId,
        variableType,
        valueType: comparison.valueType,
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

function analyzeVideoReference(diagnostics, symbols, id, token, node) {
  if (!id || hasSymbol(symbols, 'videos', id)) return;
  diagnostics.push(diagnosticFromToken(
    DIAGNOSTIC_CODES.unknownVideo,
    `Video "${id}" is not declared.`,
    token,
    node,
    {
      summary: `Declare video ${id} or change the video reference.`,
      repairHint: {
        action: 'declare-video-or-retarget',
        videoId: id,
      },
    },
  ));
}

function presetKey(category, id) {
  return `${category}:${id}`;
}

function analyzePresetUse(diagnostics, symbols, node) {
  if (!node.category || !node.id) {
    diagnostics.push(diagnosticFromToken(
      DIAGNOSTIC_CODES.invalidPreset,
      'Preset use requires a kind and id.',
      tokenAt(node.line, 0),
      node,
    ));
    return;
  }
  if (hasSymbol(symbols, 'presets', presetKey(node.category, node.id))) return;
  diagnostics.push(diagnosticFromToken(
    DIAGNOSTIC_CODES.unknownPreset,
    `Preset "${node.category} ${node.id}" is not declared.`,
    tokenAt(node.line, 2) ?? tokenAt(node.line, 1),
    node,
    {
      summary: `Declare preset ${node.category} ${node.id} or change the reference.`,
      repairHint: {
        action: 'declare-preset-or-retarget',
        category: node.category,
        id: node.id,
      },
    },
  ));
}

function analyzePresetDeclaration(diagnostics, symbols, node, options) {
  if (!VALID_PRESET_CATEGORIES.has(node.category)) {
    diagnostics.push(diagnosticFromToken(
      DIAGNOSTIC_CODES.invalidPreset,
      `Unsupported preset kind "${node.category}".`,
      tokenAt(node.line, 1),
      node,
      {
        summary: 'Use the supported preset kind: mood.',
        repairHint: {
          action: 'replace-preset-kind',
          supportedKinds: [...VALID_PRESET_CATEGORIES],
        },
      },
    ));
  }

  for (const child of node.body ?? []) {
    if (!PRESET_BODY_STATEMENT_KINDS.has(child.kind)) {
      diagnostics.push(diagnosticFromToken(
        DIAGNOSTIC_CODES.invalidPreset,
        `Preset bodies cannot contain ${child.kind}.`,
        child.line?.tokens?.[0],
        child,
        {
          summary: 'Use existing page staging statements such as transition, particles, camera, show, bg, bgm, or se.',
          repairHint: {
            action: 'remove-unsupported-preset-statement',
            statementKind: child.kind,
          },
        },
      ));
      continue;
    }
    visitNode(child, symbols, diagnostics, options);
  }
}

function analyzeSequenceUse(diagnostics, symbols, node) {
  if (!node.id) {
    diagnostics.push(diagnosticFromToken(
      DIAGNOSTIC_CODES.invalidSequence,
      'Sequence use requires an id.',
      tokenAt(node.line, 0),
      node,
    ));
    return;
  }
  const symbol = symbols?.sequences?.get(node.id);
  if (!symbol) {
    diagnostics.push(diagnosticFromToken(
      DIAGNOSTIC_CODES.unknownSequence,
      `Sequence "${node.id}" is not declared.`,
      tokenAt(node.line, 1),
      node,
      {
        summary: `Declare sequence ${node.id} or change the reference.`,
        repairHint: {
          action: 'declare-sequence-or-retarget',
          id: node.id,
        },
      },
    ));
    return;
  }
  const expected = symbol.node?.params?.length ?? 0;
  if ((node.args ?? []).length !== expected) {
    diagnostics.push(diagnosticFromToken(
      DIAGNOSTIC_CODES.sequenceArityMismatch,
      `Sequence "${node.id}" expects ${expected} argument(s), got ${(node.args ?? []).length}.`,
      tokenAt(node.line, 1),
      node,
      {
        summary: 'Pass the declared number of sequence arguments.',
        repairHint: {
          action: 'fix-sequence-arity',
          id: node.id,
          expected,
          actual: (node.args ?? []).length,
        },
      },
    ));
  }
}

function analyzeSequenceDeclaration(diagnostics, symbols, node, options) {
  for (const child of node.body ?? []) {
    if (!SEQUENCE_BODY_STATEMENT_KINDS.has(child.kind)) {
      diagnostics.push(diagnosticFromToken(
        DIAGNOSTIC_CODES.invalidSequence,
        `Sequence bodies cannot contain ${child.kind}.`,
        child.line?.tokens?.[0],
        child,
        {
          summary: 'Use page staging/dialogue statements, compile-time preset/macro calls, or option effects.',
          repairHint: {
            action: 'remove-unsupported-sequence-statement',
            statementKind: child.kind,
          },
        },
      ));
      continue;
    }
    if (child.kind === 'PresetUseStatement' || child.kind === 'SequenceUseStatement') {
      visitNode(child, symbols, diagnostics, options);
    }
  }
}

function routeFieldNode(node, field) {
  return (node.body ?? []).find((child) => child.field === field) ?? null;
}

function routeFieldValue(node, field) {
  const entry = routeFieldNode(node, field);
  if (!entry) return null;
  if (field === 'affection') {
    return entry.tokens?.[1] === 'variable' ? entry.tokens?.[2] : null;
  }
  return entry.tokens?.[1] ?? null;
}

function analyzeRouteDeclaration(diagnostics, symbols, node) {
  analyzeCharacterReference(diagnostics, symbols, node.id, tokenAt(node.line, 1), node);
  const characterSymbol = symbols?.characters?.get(node.id);
  if (characterSymbol?.span?.start?.line > node.span?.start?.line) {
    diagnostics.push(diagnosticFromToken(
      DIAGNOSTIC_CODES.invalidRouteTemplate,
      `Route "${node.id}" must be declared after character "${node.id}".`,
      tokenAt(node.line, 1),
      node,
      {
        summary: 'Move the route template below its character declaration so generated affection variables can be applied.',
        repairHint: {
          action: 'move-route-after-character',
          characterId: node.id,
        },
      },
    ));
  }
  for (const child of node.body ?? []) {
    if (!ROUTE_FIELDS.has(child.field)) {
      diagnostics.push(diagnosticFromToken(
        DIAGNOSTIC_CODES.invalidRouteTemplate,
        `Unsupported route field "${child.field}".`,
        child.line?.tokens?.[0],
        child,
        {
          summary: 'Use affection variable, good_end, or normal_end.',
          repairHint: {
            action: 'replace-route-field',
            supportedFields: [...ROUTE_FIELDS],
          },
        },
      ));
      continue;
    }
    if (child.field === 'affection' && (child.tokens?.[1] !== 'variable' || !child.tokens?.[2])) {
      diagnostics.push(diagnosticFromToken(
        DIAGNOSTIC_CODES.invalidRouteTemplate,
        'Route affection field syntax is: affection variable <variable_id>.',
        child.line?.tokens?.[0],
        child,
      ));
    } else if ((child.field === 'good_end' || child.field === 'normal_end') && !child.tokens?.[1]) {
      diagnostics.push(diagnosticFromToken(
        DIAGNOSTIC_CODES.invalidRouteTemplate,
        `Route ${child.field} field requires an ending/scene id.`,
        child.line?.tokens?.[0],
        child,
      ));
    }
  }

  for (const field of ROUTE_FIELDS) {
    if (routeFieldValue(node, field)) continue;
    diagnostics.push(diagnosticFromToken(
      DIAGNOSTIC_CODES.invalidRouteTemplate,
      `Route "${node.id}" requires ${field === 'affection' ? 'affection variable' : field}.`,
      tokenAt(node.line, 0),
      node,
    ));
  }

  const goodEnd = routeFieldValue(node, 'good_end');
  const normalEnd = routeFieldValue(node, 'normal_end');
  if (goodEnd && normalEnd && goodEnd === normalEnd) {
    diagnostics.push(diagnosticFromToken(
      DIAGNOSTIC_CODES.invalidRouteTemplate,
      `Route "${node.id}" good_end and normal_end must be different ids.`,
      routeFieldNode(node, 'normal_end')?.line?.tokens?.[1],
      routeFieldNode(node, 'normal_end') ?? node,
    ));
  }
}

function analyzeCondition(diagnostics, symbols, node) {
  const parsed = node.condition ? { condition: node.condition, diagnostics: [] } : parseConditionStatement(node.line);
  diagnostics.push(...parsed.diagnostics);
  if (!parsed.condition) return;
  const lowered = lowerConditionExpressionToRows(parsed.condition.expression, node.line);
  diagnostics.push(...lowered.diagnostics);
  visitConditionComparisons(parsed.condition.expression, (comparison) => {
    analyzeConditionVariableReference(diagnostics, symbols, comparison.variableId, comparison.variableToken, node);
    analyzeConditionType(diagnostics, symbols, comparison, node);
  });
  analyzeSceneTarget(diagnostics, symbols, parsed.condition.trueTarget, parsed.condition.trueTargetToken ?? tokenAfter(node.line, '->'), node);
  analyzeSceneTarget(diagnostics, symbols, parsed.condition.falseTarget, parsed.condition.falseTargetToken ?? tokenAfter(node.line, 'else'), node);
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
  if (node.kind === 'VideoDeclaration') {
    reportInvalidAssetPath(diagnostics, tokenText(tokens[2]), tokens[2], node);
    for (let index = 0; index < tokens.length; index += 1) {
      if (!VIDEO_DECLARATION_FIELD_KEYS.has(tokenText(tokens[index]))) continue;
      reportInvalidAssetPath(diagnostics, tokenText(tokens[index + 1]), tokens[index + 1], node);
    }
  }
}

function analyzeMediaAsset(diagnostics, node) {
  const line = node.line;
  if (MEDIA_STATEMENT_KINDS.has(node.kind)) {
    reportInvalidAssetPath(diagnostics, tokenText(tokenAt(line, 1)), tokenAt(line, 1), node);
  }
}

function analyzeVideoReferenceStatement(diagnostics, symbols, node, startIndex) {
  const firstValue = tokenText(tokenAt(node.line, startIndex));
  let videoToken = tokenAt(node.line, startIndex);
  let videoId = firstValue;
  if (VIDEO_REFERENCE_KEYS.has(firstValue)) {
    videoToken = tokenAfter(node.line, 'videoId') ?? tokenAfter(node.line, 'video-id') ?? tokenAfter(node.line, 'id');
    videoId = tokenText(videoToken);
  }
  if (videoId) {
    analyzeVideoReference(diagnostics, symbols, videoId, videoToken, node);
  }

  const fileToken = tokenAfter(node.line, 'file');
  if (fileToken) {
    reportInvalidAssetPath(diagnostics, tokenText(fileToken), fileToken, node);
  }
  const posterToken = tokenAfter(node.line, 'poster');
  if (posterToken) {
    reportInvalidAssetPath(diagnostics, tokenText(posterToken), posterToken, node);
  }
}

function visitNode(node, symbols, diagnostics, options) {
  if (!node || typeof node !== 'object') return;
  if (node.kind === 'MacroDeclaration' && options.skipMacroBodies) {
    return;
  }
  if (node.kind === 'PresetDeclaration') {
    analyzePresetDeclaration(diagnostics, symbols, node, options);
    return;
  }
  if (node.kind === 'SequenceDeclaration') {
    analyzeSequenceDeclaration(diagnostics, symbols, node, options);
    return;
  }
  if (node.kind === 'RouteDeclaration') {
    analyzeRouteDeclaration(diagnostics, symbols, node);
    return;
  }
  if (node.kind === 'SceneDeclaration') {
    analyzeSceneTarget(diagnostics, symbols, node.next, tokenAfter(node.line, 'next'), node);
  } else if (node.kind === 'OpeningVideoStatement') {
    analyzeVideoReferenceStatement(diagnostics, symbols, node, 2);
  } else if (node.kind === 'EndingVideoStatement') {
    analyzeUnlockReference(diagnostics, symbols, 'ending', node.endingId, tokenAt(node.line, 1), node);
    analyzeVideoReferenceStatement(diagnostics, symbols, node, 2);
  } else if (node.kind === 'PresetUseStatement') {
    analyzePresetUse(diagnostics, symbols, node);
  } else if (node.kind === 'SequenceUseStatement') {
    analyzeSequenceUse(diagnostics, symbols, node);
  } else if (node.kind === 'OptionStatement') {
    analyzeSceneTarget(diagnostics, symbols, node.target, tokenAfter(node.line, '->'), node);
  } else if (node.kind === 'ConditionStatement') {
    analyzeCondition(diagnostics, symbols, node);
  } else if (node.kind === 'JumpStatement') {
    analyzeSceneTarget(diagnostics, symbols, node.target, tokenAt(node.line, 1), node);
  } else if (node.kind === 'VideoStatement') {
    analyzeVideoReferenceStatement(diagnostics, symbols, node, 1);
    analyzeSceneTarget(diagnostics, symbols, tokenText(tokenAfter(node.line, 'target')), tokenAfter(node.line, 'target'), node);
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
