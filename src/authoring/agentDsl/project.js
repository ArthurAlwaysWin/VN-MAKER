import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { AgentDslDiagnosticError, createDiagnostic, DIAGNOSTIC_CODES } from './diagnostics.js';

const DSL_EXTENSIONS = new Set(['.dsl', '.gmdsl']);

function toPosixPath(value) {
  return String(value).replace(/\\/g, '/');
}

function isSubPath(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function diagnostic({ code, message, file, line = 1, column = 1, suggestedAction = undefined }) {
  return createDiagnostic({
    code,
    message,
    file,
    line,
    column,
    suggestedAction,
  });
}

function throwDiagnostic(options) {
  throw new AgentDslDiagnosticError([diagnostic(options)], options.message);
}

function validateRelativePath(value, label, file) {
  if (typeof value !== 'string' || value.trim() === '') {
    throwDiagnostic({
      code: DIAGNOSTIC_CODES.invalidIncludePath,
      message: `${label} must be a non-empty relative path.`,
      file,
    });
  }
  if (path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('file:')) {
    throwDiagnostic({
      code: DIAGNOSTIC_CODES.invalidIncludePath,
      message: `${label} "${value}" must be relative.`,
      file,
    });
  }
  if (value.split(/[\\/]+/).some((segment) => segment === '..')) {
    throwDiagnostic({
      code: DIAGNOSTIC_CODES.invalidIncludePath,
      message: `${label} "${value}" must not contain traversal segments.`,
      file,
    });
  }
}

function resolveInside(root, fromDirectory, request, file, label = 'Include path') {
  validateRelativePath(request, label, file);
  const resolved = path.resolve(fromDirectory, request);
  if (!isSubPath(root, resolved)) {
    throwDiagnostic({
      code: DIAGNOSTIC_CODES.invalidIncludePath,
      message: `${label} "${request}" must stay inside sourceRoot.`,
      file,
    });
  }
  return resolved;
}

function parseInclude(line) {
  const match = line.trimmed.match(/^include\s+(['"])(.*?)\1\s*$/);
  return match?.[2] ?? null;
}

function countIndent(raw) {
  return raw.match(/^ */)?.[0].length ?? 0;
}

function splitLines(source, file) {
  return String(source ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map((raw, index) => ({
    raw,
    file,
    number: index + 1,
    indent: countIndent(raw),
    trimmed: raw.trim(),
  }));
}

async function loadDslFile(filePath, context, stack = []) {
  const normalizedPath = path.resolve(filePath);
  if (stack.includes(normalizedPath)) {
    const cycle = [...stack, normalizedPath].map((entry) => toPosixPath(path.relative(context.sourceRoot, entry))).join(' -> ');
    throwDiagnostic({
      code: DIAGNOSTIC_CODES.includeCycle,
      message: `Agent DSL include cycle detected: ${cycle}.`,
      file: normalizedPath,
    });
  }

  let source;
  try {
    source = await readFile(normalizedPath, 'utf8');
  } catch {
    throwDiagnostic({
      code: DIAGNOSTIC_CODES.includeNotFound,
      message: `Agent DSL source file not found: ${toPosixPath(path.relative(context.sourceRoot, normalizedPath))}.`,
      file: normalizedPath,
    });
  }

  const output = [];
  for (const line of splitLines(source, normalizedPath)) {
    const includePath = line.indent === 0 ? parseInclude(line) : null;
    if (!includePath) {
      output.push(line);
      continue;
    }
    const includedPath = resolveInside(context.sourceRoot, path.dirname(normalizedPath), includePath, normalizedPath);
    const included = await loadDslFile(includedPath, context, [...stack, normalizedPath]);
    output.push(...included);
  }
  return output;
}

function namespaceId(value) {
  return String(value ?? '').trim().replace(/[^A-Za-z0-9_\-\u4e00-\u9fa5]+/g, '_').replace(/^_+|_+$/g, '');
}

function qualifyIdentifier(id, namespace) {
  if (!id || !namespace) return id;
  if (id.includes('::')) {
    return id.split('::').map(namespaceId).filter(Boolean).join('_');
  }
  return `${namespace}_${id}`;
}

function rewriteArrowTargets(text, namespace) {
  return text.replace(/->\s*([A-Za-z_][\w:-]*)/g, (_match, id) => `-> ${qualifyIdentifier(id, namespace)}`);
}

function rewriteConditionVariables(text, namespace) {
  return text.replace(
    /(^|[(]\s*|\s+(?:and|or)\s+)([A-Za-z_][\w:-]*)(\s*(?:==|!=|>=|<=|>|<))/g,
    (_match, prefix, id, suffix) => `${prefix}${qualifyIdentifier(id, namespace)}${suffix}`,
  );
}

function rewriteNamespaceLine(raw, namespace) {
  if (!namespace) return raw;
  const indent = raw.match(/^ */)?.[0] ?? '';
  let body = raw.slice(indent.length);
  if (!body.trim() || body.trim().startsWith('#')) return raw;

  body = body.replace(/^(character|variable|ending|cg|macro|scene|sequence|route)\s+([A-Za-z_][\w-]*)/, (_match, command, id) => `${command} ${qualifyIdentifier(id, namespace)}`);
  body = body.replace(/^preset\s+([A-Za-z_][\w-]*)\s+([A-Za-z_][\w:-]*)/, (_match, category, id) => `preset ${category} ${qualifyIdentifier(id, namespace)}`);
  body = body.replace(/^affection\s+variable\s+([A-Za-z_][\w:-]*)/, (_match, variableId) => `affection variable ${qualifyIdentifier(variableId, namespace)}`);
  body = body.replace(/^affection\s+(?!variable\b)([A-Za-z_][\w:-]*)\s+([A-Za-z_][\w-]*)/, (_match, characterId, variableId) => `affection ${qualifyIdentifier(characterId, namespace)} ${qualifyIdentifier(variableId, namespace)}`);
  body = body.replace(/^(good_end|normal_end)\s+([A-Za-z_][\w:-]*)/, (_match, field, id) => `${field} ${qualifyIdentifier(id, namespace)}`);
  body = body.replace(/^(scene\s+[A-Za-z_][\w-]*(?:\s+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s:]+))?\s+next\s+)([A-Za-z_][\w:-]*)/, (_match, prefix, id) => `${prefix}${qualifyIdentifier(id, namespace)}`);
  body = body.replace(/^show\s+([A-Za-z_][\w:-]*)/, (_match, id) => `show ${qualifyIdentifier(id, namespace)}`);
  body = body.replace(/^say\s+([A-Za-z_][\w:-]*)\s+(['"])/, (_match, id, quote) => `say ${qualifyIdentifier(id, namespace)} ${quote}`);
  body = body.replace(/^call\s+([A-Za-z_][\w:-]*)/, (_match, id) => `call ${qualifyIdentifier(id, namespace)}`);
  body = body.replace(/^jump\s+([A-Za-z_][\w:-]*)/, (_match, id) => `jump ${qualifyIdentifier(id, namespace)}`);
  body = body.replace(/^(if\s+)(.*?)(\s*->\s*)/, (_match, prefix, expression, suffix) => `${prefix}${rewriteConditionVariables(expression, namespace)}${suffix}`);
  body = body.replace(/(\selse\s+)([A-Za-z_][\w:-]*)/, (_match, prefix, id) => `${prefix}${qualifyIdentifier(id, namespace)}`);
  body = body.replace(/^(effect\s+var:(?:set|add|sub)\s+)([A-Za-z_][\w:-]*)/, (_match, prefix, id) => `${prefix}${qualifyIdentifier(id, namespace)}`);
  body = body.replace(/^(effect\s+unlock:(?:ending|cg)\s+)([A-Za-z_][\w:-]*)/, (_match, prefix, id) => `${prefix}${qualifyIdentifier(id, namespace)}`);
  body = body.replace(/^(unlock\s+(?:ending|cg)\s+)([A-Za-z_][\w:-]*)/, (_match, prefix, id) => `${prefix}${qualifyIdentifier(id, namespace)}`);
  body = body.replace(/^affection\s+(?!variable\b)([A-Za-z_][\w:-]*)/, (_match, id) => `affection ${qualifyIdentifier(id, namespace)}`);
  body = rewriteArrowTargets(body, namespace);

  return `${indent}${body}`;
}

function flattenNamespaces(lines) {
  const output = [];
  const namespaceStack = [];
  for (const line of lines) {
    if (line.trimmed) {
      while (namespaceStack.length && line.indent <= namespaceStack[namespaceStack.length - 1].indent) {
        namespaceStack.pop();
      }
    }

    const namespaceMatch = line.trimmed.match(/^namespace\s+([A-Za-z_][\w-]*)\s*:\s*$/);
    if (namespaceMatch) {
      const parent = namespaceStack[namespaceStack.length - 1]?.qualifiedName;
      const name = parent ? `${parent}_${namespaceId(namespaceMatch[1])}` : namespaceId(namespaceMatch[1]);
      namespaceStack.push({
        indent: line.indent,
        bodyIndent: line.indent + 2,
        qualifiedName: name,
      });
      continue;
    }

    if (!namespaceStack.length) {
      output.push(line.raw);
      continue;
    }

    const active = namespaceStack[namespaceStack.length - 1];
    const deindent = Math.min(active.bodyIndent, line.raw.length);
    const raw = line.raw.startsWith(' '.repeat(active.bodyIndent))
      ? line.raw.slice(deindent)
      : line.raw;
    output.push(rewriteNamespaceLine(raw, active.qualifiedName));
  }
  return output.join('\n');
}

async function readManifest(manifestPath) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    throwDiagnostic({
      code: DIAGNOSTIC_CODES.syntaxError,
      message: `Could not read Agent DSL manifest: ${error.message}`,
      file: manifestPath,
    });
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throwDiagnostic({
      code: DIAGNOSTIC_CODES.syntaxError,
      message: 'Agent DSL manifest must be a JSON object.',
      file: manifestPath,
    });
  }
  if (!manifest.entry) {
    throwDiagnostic({
      code: DIAGNOSTIC_CODES.manifestEntryMissing,
      message: 'Agent DSL manifest requires an "entry" path.',
      file: manifestPath,
    });
  }
  return manifest;
}

export async function loadAgentDslProject(inputPath) {
  const absoluteInput = path.resolve(inputPath);
  const extension = path.extname(absoluteInput);
  const isManifest = extension === '.json';
  const manifest = isManifest ? await readManifest(absoluteInput) : null;
  const manifestDir = isManifest ? path.dirname(absoluteInput) : path.dirname(absoluteInput);
  const sourceRootRequest = manifest?.sourceRoot ?? '.';
  validateRelativePath(sourceRootRequest, 'sourceRoot', absoluteInput);
  const sourceRoot = path.resolve(manifestDir, sourceRootRequest);
  if (!isSubPath(manifestDir, sourceRoot)) {
    throwDiagnostic({
      code: DIAGNOSTIC_CODES.invalidIncludePath,
      message: `sourceRoot "${sourceRootRequest}" must not escape the manifest directory.`,
      file: absoluteInput,
    });
  }

  const entryPath = isManifest
    ? resolveInside(sourceRoot, sourceRoot, manifest.entry, absoluteInput, 'Manifest entry')
    : absoluteInput;
  if (!DSL_EXTENSIONS.has(path.extname(entryPath))) {
    throwDiagnostic({
      code: DIAGNOSTIC_CODES.invalidIncludePath,
      message: 'Agent DSL entry must use .dsl or .gmdsl.',
      file: absoluteInput,
    });
  }
  if (!isSubPath(sourceRoot, entryPath)) {
    throwDiagnostic({
      code: DIAGNOSTIC_CODES.invalidIncludePath,
      message: 'Agent DSL entry must stay inside sourceRoot.',
      file: absoluteInput,
    });
  }

  const lines = await loadDslFile(entryPath, { sourceRoot });
  return {
    inputPath: absoluteInput,
    manifestPath: isManifest ? absoluteInput : null,
    entryPath,
    sourceRoot,
    manifest,
    source: flattenNamespaces(lines),
  };
}
