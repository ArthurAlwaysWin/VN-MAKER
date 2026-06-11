function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function createProvenance(irOperation) {
  const source = irOperation.source ?? {};
  return {
    kind: source.provenanceKind ?? 'agent-dsl',
    line: source.line ?? 1,
    ...(source.file ? { file: source.file } : {}),
    ...(source.column ? { column: source.column } : {}),
    ...(irOperation.sourceId ? { sourceId: irOperation.sourceId } : {}),
    ...(source.details ?? {}),
  };
}

function createOperation(irOperation, command, params) {
  return {
    id: irOperation.stableId,
    command,
    provenance: createProvenance(irOperation),
    params: cloneJsonValue(params),
  };
}

function emitOperation(irOperation) {
  const payload = irOperation.payload ?? {};
  if (irOperation.kind === 'DeclareCharacter') {
    return createOperation(irOperation, 'add-character', payload);
  }
  if (irOperation.kind === 'DeclareVariable') {
    return createOperation(irOperation, payload.affection ? 'add-affection-variable' : 'add-variable', payload.affection ? {
      characterId: payload.characterId,
      id: payload.id,
    } : payload);
  }
  if (irOperation.kind === 'DeclareEnding') {
    return createOperation(irOperation, 'add-ending', payload);
  }
  if (irOperation.kind === 'DeclareCg') {
    return createOperation(irOperation, 'add-cg', payload);
  }
  if (irOperation.kind === 'CreateScene') {
    return createOperation(irOperation, 'add-scene', payload);
  }
  if (irOperation.kind === 'CreateNormalPage') {
    return createOperation(irOperation, 'add-page', {
      scene: payload.scene,
      type: 'normal',
      page: payload.page,
    });
  }
  if (irOperation.kind === 'CreateChoicePage') {
    return createOperation(irOperation, 'add-page', {
      scene: payload.scene,
      type: 'choice',
      prompt: payload.prompt,
      options: payload.options,
    });
  }
  if (irOperation.kind === 'CreateConditionPage') {
    return createOperation(irOperation, 'add-page', {
      scene: payload.scene,
      type: 'condition',
      conditionMode: payload.conditionMode,
      conditions: payload.conditions,
      trueTarget: payload.trueTarget,
      falseTarget: payload.falseTarget,
    });
  }
  if (irOperation.kind === 'SetSceneNext') {
    return createOperation(irOperation, 'set-scene-next', {
      scene: payload.scene,
      next: payload.next ?? null,
    });
  }
  throw new Error(`Unsupported Agent DSL IR operation kind: ${irOperation.kind}`);
}

export function emitAgentDslPlan(ir, options = {}) {
  const operations = (ir.operations ?? []).map(emitOperation);
  return {
    version: 1,
    title: options.title ?? ir.title ?? 'Agent DSL plan',
    source: {
      kind: 'agent-dsl',
      macroCount: ir.source?.macroCount ?? 0,
    },
    operations,
    warnings: cloneJsonValue(ir.warnings ?? []),
  };
}
