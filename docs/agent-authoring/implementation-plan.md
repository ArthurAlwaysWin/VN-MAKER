# Agent Authoring Implementation Plan

**Status:** Roadmap and recorded post-roadmap enhancements complete; active extension reference
**Date:** 2026-05-23
**Closure Date:** 2026-05-26
**Supersedes:** `docs/archive/agent-authoring-implementation-plan.md`

The previous implementation plan described the first external-agent authoring layer. Most of that work is now implemented: `apply-plan`, `author-check`, preview planning, handoff artifacts, external file-change safety, structured screen UI commands, and asset listing all exist.

Current implementation should follow these active documents:

- `docs/agent-first-vn-systems-plan.md` — completed system roadmap and engineering framework.
- `docs/agent-authoring/integration-contract.md` — operation, transaction, diagnostics, preview, handoff, and conflict rules.
- `docs/agent-authoring/project-contract.md` — canonical `script.json` author-data contract.
- `docs/agent-authoring/command-reference.md` — current CLI/apply-plan command surface.
- `docs/agent-authoring/validation-rules.md` — current diagnostics and readiness gates.

## Closure State

The current agent-first system roadmap is complete:

1. Variable registry, condition GUI, and affection presets are complete.
2. Ending registry and persistent profile progression are complete.
3. CG registry and gallery are complete.
4. Branch graph, dead-end checks, and asset analysis are complete.
5. Transition catalog expansion is complete.
6. Release hardening, executable examples, editor review guidance, readiness coverage, and Phase 83 migration guidance are complete.

The recorded post-roadmap P2/P3 enhancement increment is also delivered: optional continuous review/handoff, opt-in strict preview evidence gates, project-local review lifecycle metadata, and read-only structured external-change review. Automatic merging of concurrent author-data edits remains intentionally outside the contract.

## Required Implementation Order

For any post-roadmap system extension:

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
npm run test:focused
npm run test
npm run build
npm run build:web
npm audit --audit-level=moderate
npm run verify:agent-example -- --out .tmp/agent-example-project --force --json
```

Feature-specific tests should run before the full gates. Export/profile/Electron changes require targeted regression tests.

## Archived Context

The archived implementation plan remains useful for understanding how the current agent layer was built, but it is not the active roadmap. If it conflicts with the active plan or integration contract, follow the active documents.
