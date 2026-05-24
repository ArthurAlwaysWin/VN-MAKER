import { createExportReadiness } from './exportReadiness.js';
import { lintProjectLayout } from './layoutLint.js';
import { createProjectReport } from './projectReport.js';
import { collectSceneReferenceDiagnostics } from './sceneReferenceDiagnostics.js';

function summarizeCheckpoint(entry = {}) {
  return {
    path: entry.path,
    name: entry.name ?? null,
    createdAt: entry.createdAt ?? null,
    size: entry.size ?? null,
  };
}

function summarizeTransaction(transaction = null) {
  if (!transaction) {
    return null;
  }

  const changeSummary = transaction.changeSummary ?? {};
  return {
    command: transaction.transaction?.command ?? changeSummary.command ?? transaction.command ?? null,
    status: transaction.transaction?.status ?? changeSummary.writeStatus ?? null,
    wrote: transaction.transaction?.wrote ?? null,
    dryRun: transaction.dryRun ?? changeSummary.dryRun ?? null,
    operationCount: changeSummary.operationCount ?? transaction.operations?.length ?? null,
    changedPaths: Array.isArray(changeSummary.changedPaths)
      ? changeSummary.changedPaths.slice(0, 20)
      : [],
    changedPathCount: Array.isArray(changeSummary.changedPaths)
      ? changeSummary.changedPaths.length
      : 0,
    checkpointPath: transaction.transaction?.checkpointPath ?? changeSummary.checkpointPath ?? null,
    backupPath: transaction.transaction?.backupPath ?? changeSummary.backupPath ?? null,
    validation: changeSummary.validation ?? transaction.validation ?? null,
  };
}

const PREVIEW_SCREEN_PATHS = new Map([
  ['ui.titleScreen', 'titleScreen'],
  ['ui.settingsScreen', 'settingsScreen'],
  ['ui.gameMenu', 'gameMenu'],
  ['ui.saveLoadScreen', 'saveLoadScreen'],
  ['ui.backlogScreen', 'backlogScreen'],
]);

const PREVIEW_SCREEN_IDS = new Set(PREVIEW_SCREEN_PATHS.values());

function previewTargetsFromChangedPaths(changedPaths = []) {
  const targets = [];
  for (const changedPath of changedPaths) {
    const scenePageMatch = /^scenes\.([^.]+)\.pages\.(\d+)/.exec(String(changedPath));
    if (scenePageMatch) {
      targets.push({
        type: 'scene',
        sceneId: scenePageMatch[1],
        pageIndex: Number(scenePageMatch[2]),
      });
      continue;
    }

    const sceneMatch = /^scenes\.([^.]+)/.exec(String(changedPath));
    if (sceneMatch) {
      targets.push({
        type: 'scene',
        sceneId: sceneMatch[1],
        pageIndex: 0,
      });
      continue;
    }

    for (const [pathPrefix, screenId] of PREVIEW_SCREEN_PATHS.entries()) {
      if (changedPath === pathPrefix || String(changedPath).startsWith(`${pathPrefix}.`)) {
        targets.push({ type: 'screen', screenId });
      }
    }

    if (changedPath === 'systems.endings' || String(changedPath).startsWith('systems.endings.')) {
      targets.push({
        type: 'ending-list',
        kind: 'ending-list',
        pathString: 'systems.endings',
        reason: 'changed-ending-registry',
      });
    }
  }

  const seen = new Set();
  return targets.filter((target) => {
    const key = target.type === 'ending-list'
      ? 'ending-list:systems.endings'
      : target.type === 'screen'
      ? `screen:${target.screenId}`
      : `scene:${target.sceneId}:${target.pageIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createAssetSuggestedAction(issue = {}) {
  if (issue.code === 'missing-asset-reference') {
    return {
      summary: `Import or rename the missing ${issue.assetKind ?? 'asset'} asset, then rerun validation with asset checks.`,
      commands: [
        {
          command: 'list-assets',
          args: ['--script', '<script.json>', '--json'],
        },
        {
          command: 'validate',
          args: ['--script', '<script.json>', '--check-assets', '--json'],
        },
      ],
      assetPath: issue.assetPath ?? null,
      assetKind: issue.assetKind ?? null,
    };
  }

  if (issue.code === 'unused-asset') {
    return {
      summary: 'Confirm whether this asset should be referenced by the script, renamed for clarity, or removed from the project assets folder.',
      commands: [
        {
          command: 'list-assets',
          args: ['--script', '<script.json>', '--json'],
        },
      ],
      assetPath: issue.assetPath ?? null,
    };
  }

  if (issue.code === 'asset-check-not-run') {
    return {
      summary: 'Run readiness or validation with asset checks before handing the project back for final review.',
      commands: [
        {
          command: 'handoff-report',
          args: ['--script', '<script.json>', '--write-editor-handoff', '--json'],
        },
      ],
    };
  }

  return undefined;
}

function getReviewCategory(source, issue = {}) {
  if (issue.code === 'missing-asset-reference') return 'missing-asset';
  if (issue.code === 'unused-asset') return 'unused-asset';
  if (issue.code === 'asset-check-not-run') return 'asset-check';
  if (source === 'layout') return 'layout';
  if (source === 'readiness') return 'readiness';
  if (source === 'validation') return 'validation';
  return source;
}

function createReviewItem(source, severity, issue = {}) {
  const suggestedAction = issue.suggestedAction ?? createAssetSuggestedAction(issue);
  return {
    source,
    severity,
    category: getReviewCategory(source, issue),
    code: issue.code,
    pathString: issue.pathString ?? '',
    message: issue.message,
    ...('assetPath' in issue ? { assetPath: issue.assetPath } : {}),
    ...('assetKind' in issue ? { assetKind: issue.assetKind } : {}),
    ...('sceneId' in issue ? { sceneId: issue.sceneId } : {}),
    ...('missingSlots' in issue ? { missingSlots: issue.missingSlots } : {}),
    ...('missingStates' in issue ? { missingStates: issue.missingStates } : {}),
    ...('familyKey' in issue ? { familyKey: issue.familyKey } : {}),
    ...(suggestedAction ? { suggestedAction } : {}),
  };
}

function collectPreviewReviewItems(previewTargets = []) {
  const screenItems = previewTargets
    .filter((target) => target?.type === 'screen' || target?.screenId)
    .map((target) => {
      const screenId = target.screenId;
      return {
        source: 'preview',
        severity: 'warning',
        category: 'screen-ui-preview',
        code: 'screen-ui-preview-required',
        pathString: screenId ? `ui.${screenId}` : 'ui',
        message: screenId
          ? `Screen "${screenId}" changed and needs visual review in the editor preview.`
          : 'A screen UI section changed and needs visual review in the editor preview.',
        screenId: screenId ?? null,
        suggestedAction: {
          summary: 'Open Project Settings, inspect the visual preview target, and mark the handoff item resolved after review.',
          commands: [
            {
              command: 'author-check',
              args: ['--script', '<script.json>', '--transaction', '<apply-result.json>', '--write-preview-plan', '--json'],
            },
          ],
        },
      };
    });

  const endingItems = previewTargets
    .filter((target) => target?.type === 'ending-list' || target?.kind === 'ending-list')
    .map((target) => ({
      source: 'preview',
      severity: 'warning',
      category: 'ending-list-preview',
      code: 'ending-list-preview-required',
      pathString: target.pathString ?? 'systems.endings',
      message: 'Ending registry changed and needs review in Story Systems.',
      suggestedAction: {
        summary: 'Open Story Systems and inspect the ending list, unlock effects, and handoff diagnostics.',
        commands: [
          {
            command: 'list-endings',
            args: ['--script', '<script.json>', '--json'],
          },
        ],
      },
    }));

  return [...screenItems, ...endingItems];
}

function normalizeReferenceScreenshotNotes(transaction = null) {
  const notes = transaction?.handoff?.referenceScreenshotNotes
    ?? transaction?.changeSummary?.referenceScreenshotNotes
    ?? [];
  if (!Array.isArray(notes)) {
    return [];
  }

  return notes
    .filter((note) => note && typeof note === 'object')
    .map((note) => {
      const screenId = typeof note.screenId === 'string' && PREVIEW_SCREEN_IDS.has(note.screenId)
        ? note.screenId
        : null;
      const summary = typeof note.summary === 'string' && note.summary.trim()
        ? note.summary.trim()
        : null;
      const reference = typeof note.reference === 'string' && note.reference.trim()
        ? note.reference.trim()
        : null;
      const matched = Array.isArray(note.matched)
        ? note.matched.filter((entry) => typeof entry === 'string' && entry.trim()).map((entry) => entry.trim())
        : [];
      const gaps = Array.isArray(note.gaps)
        ? note.gaps.filter((entry) => typeof entry === 'string' && entry.trim()).map((entry) => entry.trim())
        : [];
      if (!screenId && !summary && !reference && matched.length === 0 && gaps.length === 0) {
        return null;
      }
      return {
        screenId,
        reference,
        summary,
        matched,
        gaps,
      };
    })
    .filter(Boolean);
}

function collectReferenceScreenshotReviewItems(transaction = null) {
  return normalizeReferenceScreenshotNotes(transaction).map((note) => {
    const pathString = note.screenId ? `ui.${note.screenId}` : 'ui';
    const details = [
      note.summary,
      note.matched.length ? `Matched: ${note.matched.join('; ')}` : null,
      note.gaps.length ? `Needs review: ${note.gaps.join('; ')}` : null,
    ].filter(Boolean).join(' ');
    return {
      source: 'preview',
      severity: 'warning',
      category: 'reference-screenshot-fidelity',
      code: 'reference-screenshot-fidelity-note',
      pathString,
      message: details || 'Review screen UI fidelity against the provided reference screenshot.',
      screenId: note.screenId,
      reference: note.reference,
      matched: note.matched,
      gaps: note.gaps,
      suggestedAction: {
        summary: 'Compare the editor preview against the reference screenshot and adjust only through structured screen UI fields.',
        commands: [
          {
            command: 'author-check',
            args: ['--script', '<script.json>', '--transaction', '<apply-result.json>', '--write-preview-plan', '--json'],
          },
        ],
      },
    };
  });
}

function normalizeAssetPath(assetPath) {
  if (typeof assetPath !== 'string' || !assetPath.trim()) {
    return null;
  }

  return assetPath.trim().replace(/\\/g, '/').replace(/^\.?\//, '');
}

function isReviewableAssetPath(assetPath) {
  const normalized = normalizeAssetPath(assetPath);
  if (!normalized) return false;
  if (/^(https?:|data:|asset:|file:|blob:)/i.test(normalized)) return false;
  return /^(backgrounds|characters|audio|fonts|ui|voices)\//.test(normalized);
}

const PLACEHOLDER_ASSET_TOKENS = new Set([
  'placeholder',
  'temp',
  'tmp',
  'dummy',
  'todo',
  'replace',
  'replace-me',
  'replace_me',
  'changeme',
  'change-me',
  'sample',
]);

const AMBIGUOUS_ASSET_NAMES = new Set([
  'asset',
  'image',
  'sprite',
  'background',
  'bg',
  'char',
  'character',
  'button',
  'audio',
  'sound',
  'voice',
]);

function getAssetStem(assetPath) {
  const normalized = normalizeAssetPath(assetPath) ?? '';
  const fileName = normalized.split('/').pop() ?? '';
  return fileName.replace(/\.[^.]+$/, '').toLowerCase();
}

function getAssetNameTokens(assetPath) {
  return getAssetStem(assetPath)
    .split(/[^a-z0-9]+/i)
    .map((token) => token.toLowerCase())
    .filter(Boolean);
}

function isPlaceholderAssetPath(assetPath) {
  return getAssetNameTokens(assetPath).some((token) => PLACEHOLDER_ASSET_TOKENS.has(token));
}

function isAmbiguousAssetPath(assetPath) {
  const stem = getAssetStem(assetPath);
  if (AMBIGUOUS_ASSET_NAMES.has(stem)) return true;
  return /^(bg|img|image|asset|button|sprite|char|voice|se|bgm)[-_]?\d+$/i.test(stem);
}

function collectReferencedAssetEntries(script = {}) {
  const entries = [];

  function add(assetPath, pathParts, assetKind) {
    const normalized = normalizeAssetPath(assetPath);
    if (!isReviewableAssetPath(normalized)) {
      return;
    }
    entries.push({
      assetPath: normalized,
      assetKind,
      pathString: pathParts.map((part) => String(part)).join('.'),
    });
  }

  for (const [characterId, character] of Object.entries(script.characters ?? {})) {
    for (const [expressionId, assetPath] of Object.entries(character?.expressions ?? {})) {
      add(assetPath, ['characters', characterId, 'expressions', expressionId], 'character-expression');
    }
  }

  for (const [sceneId, scene] of Object.entries(script.scenes ?? {})) {
    for (const [pageIndex, page] of (scene?.pages ?? []).entries()) {
      const pagePath = ['scenes', sceneId, 'pages', pageIndex];
      add(page?.background, [...pagePath, 'background'], 'background');
      add(page?.bgm?.file ?? page?.bgm, [...pagePath, 'bgm'], 'bgm');
      add(page?.se?.file ?? page?.se, [...pagePath, 'se'], 'se');
      for (const [dialogueIndex, dialogue] of (page?.dialogues ?? []).entries()) {
        add(dialogue?.voice, [...pagePath, 'dialogues', dialogueIndex, 'voice'], 'voice');
      }
    }
  }

  for (const [fontIndex, font] of (script.assets?.fonts ?? []).entries()) {
    add(font?.file, ['assets', 'fonts', fontIndex, 'file'], 'font');
  }

  const titleScreen = script.ui?.titleScreen;
  add(titleScreen?.background, ['ui', 'titleScreen', 'background'], 'ui-background');
  add(titleScreen?.bgm, ['ui', 'titleScreen', 'bgm'], 'bgm');
  for (const [elementIndex, element] of (titleScreen?.elements ?? []).entries()) {
    if (element?.type === 'image') {
      add(element.src, ['ui', 'titleScreen', 'elements', elementIndex, 'src'], 'ui-image');
    }
  }

  function scanUi(value, pathParts = ['ui']) {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => scanUi(entry, [...pathParts, index]));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, entry] of Object.entries(value)) {
        scanUi(entry, [...pathParts, key]);
      }
      return;
    }
    add(value, pathParts, 'ui-image');
  }
  scanUi(script.ui ?? {}, ['ui']);

  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.pathString}:${entry.assetPath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createAssetReviewItem(entry, category, code, message) {
  return {
    source: 'asset-review',
    severity: 'warning',
    category,
    code,
    pathString: entry.pathString,
    message,
    assetPath: entry.assetPath,
    assetKind: entry.assetKind,
    suggestedAction: {
      summary: category === 'placeholder-asset'
        ? 'Replace this placeholder asset path with final art/audio before final handoff, or explicitly tell the human it is intentional.'
        : 'Rename this generic asset path or document why it is the intended asset so future agent matching remains reliable.',
      commands: [
        {
          command: 'list-assets',
          args: ['--script', '<script.json>', '--json'],
        },
      ],
      assetPath: entry.assetPath,
      assetKind: entry.assetKind,
    },
  };
}

function collectAssetNameReviewItems(script = {}) {
  const items = [];
  for (const entry of collectReferencedAssetEntries(script)) {
    if (isPlaceholderAssetPath(entry.assetPath)) {
      items.push(createAssetReviewItem(
        entry,
        'placeholder-asset',
        'placeholder-asset-reference',
        `Referenced ${entry.assetKind} asset "${entry.assetPath}" appears to be a placeholder.`,
      ));
    } else if (isAmbiguousAssetPath(entry.assetPath)) {
      items.push(createAssetReviewItem(
        entry,
        'ambiguous-asset',
        'ambiguous-asset-name',
        `Referenced ${entry.assetKind} asset "${entry.assetPath}" has a generic name that may be ambiguous for future agent matching.`,
      ));
    }
  }
  return items;
}

function collectReviewItems({ script, validation, layout, readiness, referenceDiagnostics, previewTargets, transaction }) {
  return [
    ...(validation.errors ?? []).map((issue) => createReviewItem('validation', 'error', issue)),
    ...(validation.warnings ?? []).map((issue) => createReviewItem('validation', 'warning', issue)),
    ...(layout.warnings ?? []).map((issue) => createReviewItem('layout', issue.severity ?? 'warning', issue)),
    ...(readiness.blockers ?? []).map((issue) => createReviewItem('readiness', 'error', issue)),
    ...(readiness.warnings ?? []).map((issue) => createReviewItem('readiness', 'warning', issue)),
    ...collectPreviewReviewItems(previewTargets),
    ...collectReferenceScreenshotReviewItems(transaction),
    ...collectAssetNameReviewItems(script),
    ...(referenceDiagnostics ?? []),
  ];
}

export function createAgentHandoff(script = {}, options = {}) {
  const validationOptions = options.validation ?? {};
  const readinessOptions = options.readiness ?? {};
  const projectReport = createProjectReport(script, {
    validation: validationOptions,
    layout: options.layout,
    readiness: readinessOptions,
  });
  const validation = projectReport.validation;
  const layout = projectReport.layout;
  const readiness = projectReport.readiness ?? createExportReadiness(script, readinessOptions);
  const checkpoints = (options.checkpoints ?? []).map(summarizeCheckpoint);
  const transactionSummary = summarizeTransaction(options.transaction);
  const previewTargets = previewTargetsFromChangedPaths(transactionSummary?.changedPaths ?? []);
  const referenceDiagnostics = collectSceneReferenceDiagnostics(script, {
    changedPaths: transactionSummary?.changedPaths ?? [],
  });
  const reviewItems = collectReviewItems({
    script,
    validation,
    layout,
    readiness,
    referenceDiagnostics,
    previewTargets,
    transaction: options.transaction,
  });
  const gates = {
    validation: validation.ok,
    layout: layout.ok,
    readiness: readiness.ready,
  };

  return {
    kind: 'agent-authoring-handoff',
    version: 1,
    createdAt: options.createdAt ?? new Date().toISOString(),
    scriptPath: options.scriptPath ?? null,
    title: projectReport.title,
    projectId: projectReport.projectId,
    gates,
    ok: Object.values(gates).every(Boolean),
    counts: projectReport.counts,
    sceneGraph: projectReport.sceneGraph,
    checkpoints,
    latestCheckpointPath: checkpoints[0]?.path ?? null,
    transactionSummary,
    previewTargets,
    reviewItems,
    reviewItemCount: reviewItems.length,
    notes: options.notes ?? [],
  };
}
