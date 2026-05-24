# Agent Authoring Implementation Plan

**Status:** Active entry point
**Date:** 2026-05-23
**Supersedes:** `docs/archive/agent-authoring-implementation-plan.md`

The previous implementation plan described the first external-agent authoring layer. Most of that work is now implemented: `apply-plan`, `author-check`, preview planning, handoff artifacts, external file-change safety, structured screen UI commands, and asset listing all exist.

Current implementation should follow these active documents:

- `docs/agent-first-vn-systems-plan.md` — next system roadmap and engineering framework.
- `docs/agent-authoring/integration-contract.md` — operation, transaction, diagnostics, preview, handoff, and conflict rules.
- `docs/agent-authoring/project-contract.md` — canonical `script.json` author-data contract.
- `docs/agent-authoring/command-reference.md` — current CLI/apply-plan command surface.
- `docs/agent-authoring/validation-rules.md` — current diagnostics and readiness gates.

## Current Development Focus

The next cycle is not a rewrite of the agent layer. It extends the existing layer into these systems:

1. Variable registry, condition GUI, and affection presets.
2. Ending registry and persistent profile progression.
3. CG registry and gallery.
4. Branch graph, dead-end checks, and asset analysis.
5. Transition catalog expansion.

## Required Implementation Order

For each system:

1. Update shared contract and normalizer.
2. Add or update runtime/profile behavior.
3. Add authoring API methods.
4. Add CLI/apply-plan commands.
5. Add validation diagnostics and changed paths.
6. Add editor GUI or editor fallback/navigation.
7. Add preview/handoff integration.
8. Add tests and docs.

## Closure Gates

Use these gates before closing a milestone:

```bash
npm run test
npm run build
npm run build:web
npm audit --audit-level=moderate
```

Feature-specific tests should run before the full gates. Export/profile/Electron changes require targeted regression tests.

## Archived Context

The archived implementation plan remains useful for understanding how the current agent layer was built, but it is not the active roadmap. If it conflicts with the active plan or integration contract, follow the active documents.
