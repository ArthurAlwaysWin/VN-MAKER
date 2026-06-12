import { normalizeCgRegistry } from '../../shared/cgRegistry.js';
import { normalizeEndingRegistry } from '../../shared/endingRegistry.js';
import { normalizeEffects } from '../../shared/effectDsl.js';
import { ensureGalgameContract } from '../../shared/galgameContract.js';
import { PARTICLE_FIELD_SCHEMA } from '../../shared/particleContract.js';
import { normalizeVariableRegistry } from '../../shared/variableRegistry.js';

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function quoteDslString(value) {
  return JSON.stringify(String(value ?? ''));
}

function scalarToDsl(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value === null) {
    return 'null';
  }
  return quoteDslString(value ?? '');
}

function createReport() {
  return {
    declarations: {
      characters: 0,
      variables: 0,
      endings: 0,
      cgs: 0,
      scenes: 0,
      normalPages: 0,
      choicePages: 0,
      conditionPages: 0,
      choiceOptions: 0,
      effects: 0,
      sceneNext: 0,
      mediaStatements: 0,
      stagingStatements: 0,
      cameraStatements: 0,
      particleStatements: 0,
      dialogues: 0,
    },
    unsupported: [],
    lossy: [],
    warnings: [],
  };
}

function addIssue(report, collection, issue) {
  report[collection].push(issue);
  report.warnings.push({
    code: issue.code,
    message: issue.message,
    path: issue.path,
  });
}

function addUnsupported(report, lines, indent, issue) {
  addIssue(report, 'unsupported', issue);
  lines.push(`${' '.repeat(indent)}# ${issue.message}`);
}

function addLossy(report, lines, indent, issue) {
  addIssue(report, 'lossy', issue);
  lines.push(`${' '.repeat(indent)}# ${issue.message}`);
}

function emitCharacter(lines, id, character, report) {
  const tokens = ['character', id, quoteDslString(character?.name ?? id)];
  if (character?.color) {
    tokens.push('color', quoteDslString(character.color));
  }
  const expressions = isPlainObject(character?.expressions) ? character.expressions : {};
  for (const [expressionId, expressionPath] of Object.entries(expressions)) {
    tokens.push('expression', expressionId, quoteDslString(expressionPath));
  }
  lines.push(tokens.join(' '));
  report.declarations.characters += 1;
}

function emitVariable(lines, id, variable, report) {
  const tokens = ['variable', id, variable?.type ?? 'number'];
  if (variable?.initial !== undefined) tokens.push('initial', scalarToDsl(variable.initial));
  if (variable?.label) tokens.push('label', quoteDslString(variable.label));
  if (variable?.group) tokens.push('group', quoteDslString(variable.group));
  if (variable?.notes) tokens.push('notes', quoteDslString(variable.notes));
  if (variable?.kind) tokens.push('kind', quoteDslString(variable.kind));
  if (variable?.characterId) tokens.push('character', variable.characterId);
  if (variable?.min != null) tokens.push('min', scalarToDsl(variable.min));
  if (variable?.max != null) tokens.push('max', scalarToDsl(variable.max));
  if (variable?.step != null) tokens.push('step', scalarToDsl(variable.step));
  lines.push(tokens.join(' '));
  report.declarations.variables += 1;
}

function emitEnding(lines, id, ending, report) {
  const tokens = ['ending', id, quoteDslString(ending?.title ?? id)];
  if (ending?.category) tokens.push('category', quoteDslString(ending.category));
  if (ending?.description) tokens.push('description', quoteDslString(ending.description));
  if (ending?.thumbnail) tokens.push('thumbnail', quoteDslString(ending.thumbnail));
  if (ending?.order) tokens.push('order', scalarToDsl(ending.order));
  if (ending?.hiddenUntilUnlocked) tokens.push('hidden');
  lines.push(tokens.join(' '));
  report.declarations.endings += 1;
}

function emitCg(lines, id, cg, report) {
  const tokens = ['cg', id, quoteDslString(cg?.title ?? id)];
  if (Array.isArray(cg?.images) && cg.images.length > 0) {
    tokens.push('image', ...cg.images.map(quoteDslString));
  }
  if (cg?.thumbnail) tokens.push('thumbnail', quoteDslString(cg.thumbnail));
  if (cg?.lockedThumbnail) tokens.push('lockedThumbnail', quoteDslString(cg.lockedThumbnail));
  if (cg?.category) tokens.push('category', quoteDslString(cg.category));
  if (cg?.description) tokens.push('description', quoteDslString(cg.description));
  if (cg?.order) tokens.push('order', scalarToDsl(cg.order));
  lines.push(tokens.join(' '));
  report.declarations.cgs += 1;
}

function emitDialogue(lines, dialogue, report) {
  const speaker = typeof dialogue?.speaker === 'string' && dialogue.speaker.trim()
    ? dialogue.speaker.trim()
    : null;
  const text = quoteDslString(dialogue?.text ?? '');
  const tokens = speaker ? ['say', speaker, text] : ['narrate', text];
  if (dialogue?.expression) tokens.push('expression', dialogue.expression);
  if (dialogue?.voice) tokens.push('voice', quoteDslString(dialogue.voice));
  lines.push(`  ${tokens.join(' ')}`);
  report.declarations.dialogues += 1;
}

function effectToDsl(effect) {
  if (effect?.type === 'var:set' || effect?.type === 'var:add' || effect?.type === 'var:sub') {
    return `effect ${effect.type} ${effect.id} ${scalarToDsl(effect.value)}`;
  }
  if (effect?.type === 'unlock:ending') {
    return `unlock ending ${effect.id}`;
  }
  if (effect?.type === 'unlock:cg') {
    return `unlock cg ${effect.id}`;
  }
  return null;
}

function conditionValueToDsl(value) {
  return scalarToDsl(value);
}

function conditionRowsToExpression(conditions, conditionMode) {
  const joiner = conditionMode === 'any' ? ' or ' : ' and ';
  return conditions
    .map((condition) => `${condition.variableId} ${condition.operator} ${conditionValueToDsl(condition.value)}`)
    .join(joiner);
}

function canEmitConditionPage(page) {
  const conditions = Array.isArray(page?.conditions) ? page.conditions : [];
  const conditionMode = page?.conditionMode ?? 'all';
  if (!['all', 'any'].includes(conditionMode)) {
    return false;
  }
  if (conditions.length === 0) {
    return false;
  }
  if (typeof page?.trueTarget !== 'string' || !page.trueTarget.trim()) {
    return false;
  }
  return conditions.every((condition) => (
    condition
    && typeof condition.variableId === 'string'
    && condition.variableId.trim()
    && ['==', '!=', '>', '>=', '<', '<='].includes(condition.operator)
    && (
      typeof condition.value === 'string'
      || typeof condition.value === 'number'
      || typeof condition.value === 'boolean'
      || condition.value === null
    )
  ));
}

function emitConditionPage(lines, sceneId, page, pageIndex, report) {
  if (!canEmitConditionPage(page)) {
    addUnsupported(report, lines, 2, {
      code: 'agent-dsl-skeleton-condition-unsupported',
      path: `scenes.${sceneId}.pages.${pageIndex}`,
      message: `P7.3 skeleton did not convert condition page at scenes.${sceneId}.pages.${pageIndex}.`,
      pageType: page?.type ?? null,
    });
    return;
  }

  const conditionMode = page.conditionMode ?? 'all';
  const expression = conditionRowsToExpression(page.conditions, conditionMode);
  const falseTarget = typeof page.falseTarget === 'string' && page.falseTarget.trim()
    ? ` else ${page.falseTarget.trim()}`
    : '';
  lines.push(`  if ${expression} -> ${page.trueTarget.trim()}${falseTarget}`);
  report.declarations.conditionPages += 1;

  const unsupportedFields = [];
  if (page?.id) unsupportedFields.push('id');
  if (page?.target) unsupportedFields.push('target');
  if (page?.background) unsupportedFields.push('background');
  if (Array.isArray(page?.characters) && page.characters.length > 0) unsupportedFields.push('characters');
  if (page?.bgm) unsupportedFields.push('bgm');
  if (page?.se) unsupportedFields.push('se');
  if (page?.camera) unsupportedFields.push('camera');
  if (page?.particles) unsupportedFields.push('particles');
  if (Array.isArray(page?.effectPacks) && page.effectPacks.length > 0) unsupportedFields.push('effectPacks');

  if (unsupportedFields.length > 0) {
    addLossy(report, lines, 2, {
      code: 'agent-dsl-skeleton-condition-fields-deferred',
      path: `scenes.${sceneId}.pages.${pageIndex}`,
      message: `P7.3 skeleton omitted condition page fields at scenes.${sceneId}.pages.${pageIndex}: ${unsupportedFields.join(', ')}.`,
      fields: unsupportedFields,
    });
  }
}

function normalizedEffectsForOption(option, report, lines, sceneId, pageIndex, optionIndex) {
  try {
    return normalizeEffects(option);
  } catch (error) {
    addUnsupported(report, lines, 6, {
      code: 'agent-dsl-skeleton-choice-effects-invalid',
      path: `scenes.${sceneId}.pages.${pageIndex}.options.${optionIndex}.effects`,
      message: `P7.2 skeleton could not convert invalid choice effects at scenes.${sceneId}.pages.${pageIndex}.options.${optionIndex}.effects: ${error.message}.`,
    });
    return [];
  }
}

function emitChoicePage(lines, sceneId, page, pageIndex, report) {
  const options = Array.isArray(page?.options) ? page.options : [];
  if (options.length === 0) {
    addUnsupported(report, lines, 2, {
      code: 'agent-dsl-skeleton-empty-choice-unsupported',
      path: `scenes.${sceneId}.pages.${pageIndex}`,
      message: `P7.2 skeleton did not convert empty choice page at scenes.${sceneId}.pages.${pageIndex}.`,
      pageType: page?.type ?? null,
    });
    return;
  }

  lines.push(`  choice ${quoteDslString(page?.prompt ?? '')}:`);
  report.declarations.choicePages += 1;

  for (const [optionIndex, option] of options.entries()) {
    const effects = normalizedEffectsForOption(option, report, lines, sceneId, pageIndex, optionIndex);
    const target = typeof option?.target === 'string' && option.target.trim()
      ? option.target.trim()
      : null;
    const hasEffectBlock = effects.length > 0;
    const optionHeader = [
      '    option',
      quoteDslString(option?.text ?? ''),
      target ? `-> ${target}` : null,
    ].filter(Boolean).join(' ');
    lines.push(`${optionHeader}${hasEffectBlock ? ':' : ''}`);
    report.declarations.choiceOptions += 1;

    for (const [effectIndex, effect] of effects.entries()) {
      const effectLine = effectToDsl(effect);
      if (effectLine) {
        lines.push(`      ${effectLine}`);
        report.declarations.effects += 1;
        continue;
      }
      addUnsupported(report, lines, 6, {
        code: 'agent-dsl-skeleton-choice-effect-unsupported',
        path: `scenes.${sceneId}.pages.${pageIndex}.options.${optionIndex}.effects.${effectIndex}`,
        message: `P7.2 skeleton did not convert unsupported choice effect at scenes.${sceneId}.pages.${pageIndex}.options.${optionIndex}.effects.${effectIndex}.`,
        effectType: effect?.type ?? null,
      });
    }
  }

  const unsupportedFields = [];
  if (page?.target) unsupportedFields.push('target');
  if (page?.variableId) unsupportedFields.push('variableId');
  if (page?.background) unsupportedFields.push('background');
  if (Array.isArray(page?.characters) && page.characters.length > 0) unsupportedFields.push('characters');
  if (page?.bgm) unsupportedFields.push('bgm');
  if (page?.se) unsupportedFields.push('se');
  if (page?.camera) unsupportedFields.push('camera');
  if (page?.particles) unsupportedFields.push('particles');
  if (Array.isArray(page?.effectPacks) && page.effectPacks.length > 0) unsupportedFields.push('effectPacks');

  if (unsupportedFields.length > 0) {
    addLossy(report, lines, 2, {
      code: 'agent-dsl-skeleton-choice-fields-deferred',
      path: `scenes.${sceneId}.pages.${pageIndex}`,
      message: `P7.2 skeleton omitted choice page fields at scenes.${sceneId}.pages.${pageIndex}: ${unsupportedFields.join(', ')}.`,
      fields: unsupportedFields,
    });
  }
}

function emitPageMedia(lines, sceneId, page, pageIndex, report) {
  if (typeof page?.background === 'string' && page.background) {
    lines.push(`  bg ${quoteDslString(page.background)}`);
    report.declarations.mediaStatements += 1;
  }

  if (isPlainObject(page?.transition)) {
    const transitionType = typeof page.transition.type === 'string' && page.transition.type.trim()
      ? page.transition.type.trim()
      : 'fade';
    const duration = Number.isFinite(Number(page.transition.duration)) ? Number(page.transition.duration) : 800;
    if (transitionType !== 'fade' || duration !== 800) {
      lines.push(`  transition ${transitionType} ${duration}`);
      report.declarations.mediaStatements += 1;
    }
    const extraTransitionFields = Object.keys(page.transition).filter((key) => !['type', 'duration'].includes(key));
    if (extraTransitionFields.length > 0) {
      addLossy(report, lines, 2, {
        code: 'agent-dsl-skeleton-transition-fields-deferred',
        path: `scenes.${sceneId}.pages.${pageIndex}.transition`,
        message: `P7.3 skeleton omitted transition fields at scenes.${sceneId}.pages.${pageIndex}.transition: ${extraTransitionFields.join(', ')}.`,
        fields: extraTransitionFields,
      });
    }
  } else if (page?.transition != null) {
    addLossy(report, lines, 2, {
      code: 'agent-dsl-skeleton-transition-unsupported',
      path: `scenes.${sceneId}.pages.${pageIndex}.transition`,
      message: `P7.3 skeleton did not convert non-object transition at scenes.${sceneId}.pages.${pageIndex}.transition.`,
    });
  }

  if (isPlainObject(page?.bgm) && typeof page.bgm.file === 'string' && page.bgm.file) {
    const tokens = ['  bgm', quoteDslString(page.bgm.file)];
    if (page.bgm.volume !== undefined) {
      tokens.push('volume', scalarToDsl(page.bgm.volume));
    }
    lines.push(tokens.join(' '));
    report.declarations.mediaStatements += 1;
    const extraBgmFields = Object.keys(page.bgm).filter((key) => !['file', 'volume'].includes(key));
    if (extraBgmFields.length > 0) {
      addLossy(report, lines, 2, {
        code: 'agent-dsl-skeleton-bgm-fields-deferred',
        path: `scenes.${sceneId}.pages.${pageIndex}.bgm`,
        message: `P7.3 skeleton omitted BGM fields at scenes.${sceneId}.pages.${pageIndex}.bgm: ${extraBgmFields.join(', ')}.`,
        fields: extraBgmFields,
      });
    }
  } else if (page?.bgm != null) {
    addLossy(report, lines, 2, {
      code: 'agent-dsl-skeleton-bgm-unsupported',
      path: `scenes.${sceneId}.pages.${pageIndex}.bgm`,
      message: `P7.3 skeleton did not convert BGM at scenes.${sceneId}.pages.${pageIndex}.bgm.`,
    });
  }

  if (isPlainObject(page?.se) && typeof page.se.file === 'string' && page.se.file) {
    lines.push(`  se ${quoteDslString(page.se.file)}`);
    report.declarations.mediaStatements += 1;
    const extraSeFields = Object.keys(page.se).filter((key) => key !== 'file');
    if (extraSeFields.length > 0) {
      addLossy(report, lines, 2, {
        code: 'agent-dsl-skeleton-se-fields-deferred',
        path: `scenes.${sceneId}.pages.${pageIndex}.se`,
        message: `P7.3 skeleton omitted sound effect fields at scenes.${sceneId}.pages.${pageIndex}.se: ${extraSeFields.join(', ')}.`,
        fields: extraSeFields,
      });
    }
  } else if (page?.se != null) {
    addLossy(report, lines, 2, {
      code: 'agent-dsl-skeleton-se-unsupported',
      path: `scenes.${sceneId}.pages.${pageIndex}.se`,
      message: `P7.3 skeleton did not convert sound effect at scenes.${sceneId}.pages.${pageIndex}.se.`,
    });
  }
}

function emitPageStaging(lines, sceneId, page, pageIndex, report) {
  const characters = Array.isArray(page?.characters) ? page.characters : [];
  for (const [characterIndex, character] of characters.entries()) {
    if (!character?.id) {
      addLossy(report, lines, 2, {
        code: 'agent-dsl-skeleton-character-staging-unsupported',
        path: `scenes.${sceneId}.pages.${pageIndex}.characters.${characterIndex}`,
        message: `P7.3 skeleton did not convert character staging without id at scenes.${sceneId}.pages.${pageIndex}.characters.${characterIndex}.`,
      });
      continue;
    }

    const tokens = ['  show', character.id];
    if (typeof character.expression === 'string' && character.expression.trim()) {
      tokens.push(character.expression.trim());
    }
    if (typeof character.position === 'string' && character.position.trim()) {
      tokens.push('at', character.position.trim());
    }
    if (typeof character.animation === 'string' && character.animation.trim() && character.animation !== 'none') {
      tokens.push('animation', character.animation.trim());
    }
    lines.push(tokens.join(' '));
    report.declarations.stagingStatements += 1;

    const extraCharacterFields = Object.keys(character).filter((key) => !['id', 'expression', 'position', 'animation'].includes(key));
    if (extraCharacterFields.length > 0) {
      addLossy(report, lines, 2, {
        code: 'agent-dsl-skeleton-character-staging-fields-deferred',
        path: `scenes.${sceneId}.pages.${pageIndex}.characters.${characterIndex}`,
        message: `P7.3 skeleton omitted character staging fields at scenes.${sceneId}.pages.${pageIndex}.characters.${characterIndex}: ${extraCharacterFields.join(', ')}.`,
        fields: extraCharacterFields,
      });
    }
  }
}

function emitPageCamera(lines, sceneId, page, pageIndex, report) {
  if (!isPlainObject(page?.camera)) {
    if (page?.camera != null) {
      addLossy(report, lines, 2, {
        code: 'agent-dsl-skeleton-camera-unsupported',
        path: `scenes.${sceneId}.pages.${pageIndex}.camera`,
        message: `P7.3 skeleton did not convert camera at scenes.${sceneId}.pages.${pageIndex}.camera.`,
      });
    }
    return;
  }

  const effect = typeof page.camera.effect === 'string' && page.camera.effect.trim()
    ? page.camera.effect.trim()
    : 'shake';
  const intensity = typeof page.camera.intensity === 'string' && page.camera.intensity.trim()
    ? page.camera.intensity.trim()
    : 'medium';
  const durationMs = Number.isFinite(Number(page.camera.durationMs)) ? Number(page.camera.durationMs) : 800;
  lines.push(`  camera ${effect} ${intensity} ${durationMs}`);
  report.declarations.cameraStatements += 1;

  const extraCameraFields = Object.keys(page.camera).filter((key) => !['effect', 'intensity', 'durationMs'].includes(key));
  if (extraCameraFields.length > 0) {
    addLossy(report, lines, 2, {
      code: 'agent-dsl-skeleton-camera-fields-deferred',
      path: `scenes.${sceneId}.pages.${pageIndex}.camera`,
      message: `P7.3 skeleton omitted camera fields at scenes.${sceneId}.pages.${pageIndex}.camera: ${extraCameraFields.join(', ')}.`,
      fields: extraCameraFields,
    });
  }
}

function emitPageParticles(lines, sceneId, page, pageIndex, report) {
  if (!isPlainObject(page?.particles)) {
    if (page?.particles != null) {
      addLossy(report, lines, 2, {
        code: 'agent-dsl-skeleton-particles-unsupported',
        path: `scenes.${sceneId}.pages.${pageIndex}.particles`,
        message: `P7.3 skeleton did not convert particles at scenes.${sceneId}.pages.${pageIndex}.particles.`,
      });
    }
    return;
  }

  const preset = typeof page.particles.preset === 'string' && page.particles.preset.trim()
    ? page.particles.preset.trim()
    : 'dust';
  const tokens = ['  particles', preset];
  const supportedKeys = Object.keys(PARTICLE_FIELD_SCHEMA).filter((key) => key !== 'preset');
  const omittedFields = [];
  for (const key of supportedKeys) {
    if (page.particles[key] === undefined) {
      continue;
    }
    const value = page.particles[key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      tokens.push(key, scalarToDsl(value));
    } else {
      omittedFields.push(key);
    }
  }
  const extraParticleFields = Object.keys(page.particles).filter((key) => !Object.hasOwn(PARTICLE_FIELD_SCHEMA, key));
  omittedFields.push(...extraParticleFields);
  lines.push(tokens.join(' '));
  report.declarations.particleStatements += 1;

  if (omittedFields.length > 0) {
    addLossy(report, lines, 2, {
      code: 'agent-dsl-skeleton-particles-fields-deferred',
      path: `scenes.${sceneId}.pages.${pageIndex}.particles`,
      message: `P7.3 skeleton omitted particle fields at scenes.${sceneId}.pages.${pageIndex}.particles: ${omittedFields.join(', ')}.`,
      fields: omittedFields,
    });
  }
}

function emitNormalPage(lines, sceneId, page, pageIndex, report) {
  if (page?.id) {
    lines.push(`  page ${page.id}:`);
  }

  emitPageMedia(lines, sceneId, page, pageIndex, report);
  emitPageStaging(lines, sceneId, page, pageIndex, report);
  emitPageCamera(lines, sceneId, page, pageIndex, report);
  emitPageParticles(lines, sceneId, page, pageIndex, report);

  for (const dialogue of Array.isArray(page?.dialogues) ? page.dialogues : []) {
    emitDialogue(lines, dialogue, report);
  }

  report.declarations.normalPages += 1;

  const unsupportedFields = [];
  if (Array.isArray(page?.effects) && page.effects.length > 0) unsupportedFields.push('effects');
  if (Array.isArray(page?.effectPacks) && page.effectPacks.length > 0) unsupportedFields.push('effectPacks');

  if (unsupportedFields.length > 0) {
    addLossy(report, lines, 2, {
      code: 'agent-dsl-skeleton-page-fields-deferred',
      path: `scenes.${sceneId}.pages.${pageIndex}`,
      message: `P7.3 skeleton omitted normal page fields at scenes.${sceneId}.pages.${pageIndex}: ${unsupportedFields.join(', ')}.`,
      fields: unsupportedFields,
    });
  }
}

function emitScene(lines, sceneId, scene, report) {
  const next = typeof scene?.next === 'string' && scene.next.trim() ? scene.next.trim() : null;
  lines.push(`scene ${sceneId} ${quoteDslString(scene?.name ?? sceneId)}${next ? ` next ${next}` : ''}:`);
  report.declarations.scenes += 1;
  if (next) {
    report.declarations.sceneNext += 1;
  } else if (scene?.next !== undefined && scene.next !== null) {
    addLossy(report, lines, 2, {
      code: 'agent-dsl-skeleton-scene-next-invalid',
      path: `scenes.${sceneId}.next`,
      message: `P7.2 skeleton omitted non-string scene next target at scenes.${sceneId}.next.`,
      target: scene.next,
    });
  }

  const pages = Array.isArray(scene?.pages) ? scene.pages : [];
  if (pages.length === 0) {
    lines.push('  # Scene has no pages.');
    return;
  }

  for (const [pageIndex, page] of pages.entries()) {
    if (page?.type === 'normal' || page?.type == null) {
      emitNormalPage(lines, sceneId, page, pageIndex, report);
      continue;
    }
    if (page?.type === 'choice') {
      emitChoicePage(lines, sceneId, page, pageIndex, report);
      continue;
    }
    if (page?.type === 'condition') {
      emitConditionPage(lines, sceneId, page, pageIndex, report);
      continue;
    }
    addUnsupported(report, lines, 2, {
      code: 'agent-dsl-skeleton-page-type-unsupported',
      path: `scenes.${sceneId}.pages.${pageIndex}`,
      message: `P7.2 skeleton did not convert ${page?.type ?? 'unknown'} page at scenes.${sceneId}.pages.${pageIndex}.`,
      pageType: page?.type ?? null,
    });
  }
}

export function createAgentDslSkeleton(scriptInput = {}, options = {}) {
  const script = ensureGalgameContract(scriptInput);
  const report = createReport();
  const lines = [
    '# Generated Agent DSL starter source.',
    '# This skeleton is a migration aid; it does not claim original DSL provenance.',
    '',
    `title ${quoteDslString(options.title ?? script.title ?? 'Untitled Galgame')}`,
  ];

  const characters = isPlainObject(script.characters) ? script.characters : {};
  for (const [id, character] of Object.entries(characters)) {
    lines.push('');
    emitCharacter(lines, id, character, report);
  }

  const variables = normalizeVariableRegistry(script.systems?.variables);
  for (const [id, variable] of Object.entries(variables)) {
    lines.push('');
    emitVariable(lines, id, variable, report);
  }

  const endings = normalizeEndingRegistry(script.systems?.endings);
  for (const [id, ending] of Object.entries(endings)) {
    lines.push('');
    emitEnding(lines, id, ending, report);
  }

  const cgs = normalizeCgRegistry(script.systems?.gallery?.cg);
  for (const [id, cg] of Object.entries(cgs)) {
    lines.push('');
    emitCg(lines, id, cg, report);
  }

  const scenes = isPlainObject(script.scenes) ? script.scenes : {};
  for (const [sceneId, scene] of Object.entries(scenes)) {
    lines.push('');
    emitScene(lines, sceneId, scene, report);
  }

  const source = `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
  return {
    source,
    report: {
      ...report,
      warningCount: report.warnings.length,
      unsupportedCount: report.unsupported.length,
      lossyCount: report.lossy.length,
      sourceMapCreated: false,
    },
  };
}
