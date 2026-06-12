import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { AgentDslDiagnosticError } from '../src/authoring/agentDsl/diagnostics.js';
import { loadAgentDslProject } from '../src/authoring/agentDsl/project.js';
import { createAgentDslPlan } from '../src/authoring/agentDslPlan.js';

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'agent-dsl-project-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function compileProject(inputPath) {
  const project = await loadAgentDslProject(inputPath);
  return createAgentDslPlan(project.source, { file: project.entryPath });
}

describe('agent DSL project loader', () => {
  it('resolves includes from a project manifest', async () => {
    await withTempDir(async (dir) => {
      const sourceRoot = path.join(dir, 'agent-src');
      await mkdir(path.join(sourceRoot, 'lib'), { recursive: true });
      await writeJson(path.join(sourceRoot, 'project.gmdsl.json'), {
        version: 1,
        sourceRoot: '.',
        entry: 'main.gmdsl',
      });
      await writeFile(path.join(sourceRoot, 'lib', 'characters.gmdsl'), 'character sakura "Sakura"\n', 'utf8');
      await writeFile(path.join(sourceRoot, 'main.gmdsl'), `
include "lib/characters.gmdsl"
scene start "Start":
  say sakura "Welcome."
`, 'utf8');

      const plan = await compileProject(path.join(sourceRoot, 'project.gmdsl.json'));
      expect(plan.operations.map((operation) => operation.command)).toEqual([
        'add-character',
        'add-scene',
        'add-page',
      ]);
      expect(plan.operations[0]).toMatchObject({
        id: 'dsl-add-character-sakura',
        params: { id: 'sakura' },
      });
    });
  });

  it('reports missing includes with structured diagnostics', async () => {
    await withTempDir(async (dir) => {
      const mainPath = path.join(dir, 'main.gmdsl');
      await writeFile(mainPath, 'include "missing.gmdsl"\n', 'utf8');

      await expect(loadAgentDslProject(mainPath)).rejects.toMatchObject({
        diagnostics: [
          expect.objectContaining({ code: 'dsl-include-not-found' }),
        ],
      });
    });
  });

  it('reports include cycles', async () => {
    await withTempDir(async (dir) => {
      const aPath = path.join(dir, 'a.gmdsl');
      const bPath = path.join(dir, 'b.gmdsl');
      await writeFile(aPath, 'include "b.gmdsl"\n', 'utf8');
      await writeFile(bPath, 'include "a.gmdsl"\n', 'utf8');

      await expect(loadAgentDslProject(aPath)).rejects.toMatchObject({
        diagnostics: [
          expect.objectContaining({ code: 'dsl-include-cycle' }),
        ],
      });
    });
  });

  it('allows duplicate symbol ids across namespaces by prefixing generated ids', async () => {
    await withTempDir(async (dir) => {
      const mainPath = path.join(dir, 'main.gmdsl');
      await writeFile(mainPath, `
namespace chapter_01:
  scene start "Start":
    jump ending
  scene ending "Ending":
    end

namespace chapter_02:
  scene start "Start":
    jump ending
  scene ending "Ending":
    end
`, 'utf8');

      const plan = await compileProject(mainPath);
      expect(plan.operations.map((operation) => operation.id)).toEqual([
        'dsl-add-scene-chapter_01_start',
        'dsl-set-scene-next-chapter_01_start',
        'dsl-add-scene-chapter_01_ending',
        'dsl-add-scene-chapter_02_start',
        'dsl-set-scene-next-chapter_02_start',
        'dsl-add-scene-chapter_02_ending',
      ]);
      expect(plan.operations.find((operation) => operation.id === 'dsl-set-scene-next-chapter_01_start')).toMatchObject({
        params: { scene: 'chapter_01_start', next: 'chapter_01_ending' },
      });
    });
  });

  it('prefixes all condition variables inside namespaces', async () => {
    await withTempDir(async (dir) => {
      const mainPath = path.join(dir, 'main.gmdsl');
      await writeFile(mainPath, `
namespace chapter_01:
  variable affection number initial 0
  variable saw_letter bool initial false
  scene start "Start":
    if affection >= 5 and saw_letter == true -> good else normal
  scene good "Good":
    end
  scene normal "Normal":
    end
`, 'utf8');

      const plan = await compileProject(mainPath);
      expect(plan.operations.find((operation) => operation.id === 'dsl-add-condition-chapter_01_start-1')).toMatchObject({
        params: {
          scene: 'chapter_01_start',
          conditionMode: 'all',
          conditions: [
            { variableId: 'chapter_01_affection', operator: '>=', value: 5 },
            { variableId: 'chapter_01_saw_letter', operator: '==', value: true },
          ],
          trueTarget: 'chapter_01_good',
          falseTarget: 'chapter_01_normal',
        },
      });
    });
  });

  it('prefixes preset declarations and uses inside namespaces', async () => {
    await withTempDir(async (dir) => {
      const mainPath = path.join(dir, 'main.gmdsl');
      await writeFile(mainPath, `
namespace chapter_01:
  preset mood rainy_school:
    particles rain density 0.6
  scene start "Start":
    preset mood rainy_school
    say "Rain."
`, 'utf8');

      const plan = await compileProject(mainPath);
      expect(plan.operations).toHaveLength(2);
      expect(plan.operations[1]).toMatchObject({
        id: 'dsl-add-page-chapter_01_start-1',
        params: {
          scene: 'chapter_01_start',
          page: {
            particles: { preset: 'rain', density: 0.6 },
          },
        },
      });
    });
  });

  it('prefixes sequence declarations and uses inside namespaces', async () => {
    await withTempDir(async (dir) => {
      const mainPath = path.join(dir, 'main.gmdsl');
      await writeFile(mainPath, `
namespace chapter_01:
  character sakura "Sakura"
  sequence entrance():
    show sakura normal at center animation fade-in
  scene start "Start":
    sequence entrance()
`, 'utf8');

      const plan = await compileProject(mainPath);
      expect(plan.operations.map((operation) => operation.id)).toEqual([
        'dsl-add-character-chapter_01_sakura',
        'dsl-add-scene-chapter_01_start',
        'dsl-add-page-chapter_01_start-1',
      ]);
      expect(plan.operations[2]).toMatchObject({
        params: {
          scene: 'chapter_01_start',
          page: {
            characters: [
              { id: 'chapter_01_sakura', expression: 'normal', position: 'center', animation: 'fade-in' },
            ],
          },
        },
      });
    });
  });

  it('rejects duplicate symbols inside the same namespace', async () => {
    await withTempDir(async (dir) => {
      const mainPath = path.join(dir, 'main.gmdsl');
      await writeFile(mainPath, `
namespace chapter_01:
  scene start "Start":
    end
  scene start "Start Again":
    end
`, 'utf8');

      await expect(compileProject(mainPath)).rejects.toBeInstanceOf(AgentDslDiagnosticError);
      await expect(compileProject(mainPath)).rejects.toMatchObject({
        diagnostics: [
          expect.objectContaining({ code: 'dsl-duplicate-symbol' }),
        ],
      });
    });
  });

  it('rejects traversal includes before reading outside sourceRoot', async () => {
    await withTempDir(async (dir) => {
      const sourceRoot = path.join(dir, 'agent-src');
      await mkdir(sourceRoot, { recursive: true });
      const mainPath = path.join(sourceRoot, 'main.gmdsl');
      await writeFile(mainPath, 'include "../secret.gmdsl"\n', 'utf8');

      await expect(loadAgentDslProject(mainPath)).rejects.toMatchObject({
        diagnostics: [
          expect.objectContaining({ code: 'dsl-invalid-include-path' }),
        ],
      });
    });
  });

  it('rejects manifest entries that escape sourceRoot', async () => {
    await withTempDir(async (dir) => {
      const sourceRoot = path.join(dir, 'agent-src');
      await mkdir(sourceRoot, { recursive: true });
      const manifestPath = path.join(sourceRoot, 'project.gmdsl.json');
      await writeJson(manifestPath, {
        version: 1,
        sourceRoot: '.',
        entry: '../outside.gmdsl',
      });

      await expect(loadAgentDslProject(manifestPath)).rejects.toMatchObject({
        diagnostics: [
          expect.objectContaining({ code: 'dsl-invalid-include-path' }),
        ],
      });
    });
  });

  it('rejects sourceRoot paths that escape the manifest directory', async () => {
    await withTempDir(async (dir) => {
      const sourceRoot = path.join(dir, 'agent-src');
      await mkdir(sourceRoot, { recursive: true });
      const manifestPath = path.join(sourceRoot, 'project.gmdsl.json');
      await writeJson(manifestPath, {
        version: 1,
        sourceRoot: '..',
        entry: 'main.gmdsl',
      });

      await expect(loadAgentDslProject(manifestPath)).rejects.toMatchObject({
        diagnostics: [
          expect.objectContaining({ code: 'dsl-invalid-include-path' }),
        ],
      });
    });
  });

  it('rejects manifests with missing entry', async () => {
    await withTempDir(async (dir) => {
      const manifestPath = path.join(dir, 'project.gmdsl.json');
      await writeJson(manifestPath, {
        version: 1,
        sourceRoot: '.',
      });

      await expect(loadAgentDslProject(manifestPath)).rejects.toMatchObject({
        diagnostics: [
          expect.objectContaining({ code: 'dsl-manifest-entry-missing' }),
        ],
      });
    });
  });
});
