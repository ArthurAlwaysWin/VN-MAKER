# Phase 83: 剧情系统契约与持久化护栏 - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning
**Source:** v1.7 milestone research + roadmap + user scope clarification

<domain>
## Phase Boundary

Phase 83 only establishes the **foundational contract** for v1.7:

- stable `projectId` / persistent identity
- explicit author-owned registries in `script.json`
- player-owned `profile` vs run-owned `save slot` separation
- minimal effect DSL for variable and unlock writes
- development-friendly reset / rebuild semantics

This phase does **not** build the full variable editor UX, affection preset UI, ending screens, or CG gallery UI. It exists to prevent later authoring/runtime work from being built on a brittle persistence model.

</domain>

<decisions>
## Implementation Decisions

### Locked decisions

- `script.json` remains the single author-defined truth source; v1.7 definitions for variables / endings / gallery live there.
- Player progression state must not live in `script.json`; it belongs to runtime persistence (`profile` + `saves`).
- `save slot` and `persistent profile` are separate authorities. Save load/delete must not own ending / CG / read-history truth.
- Use a stable `projectId` / `gameId` for progression keys; do not use title-based keys.
- Variable and unlock writes converge on one minimal effect DSL: `var:set`, `var:add`, `var:sub`, `unlock:ending`, `unlock:cg`.
- Endings and CGs are explicit registries with canonical IDs and explicit unlock events; no auto-detected unlocks.
- User override: **do not treat old-project migration compatibility as a v1.7 blocker**. Prefer clean contract + explicit reset / versioning semantics over legacy migration work.

### Explicit non-goals for this phase

- no flowchart / branch graph
- no replay / BGM room / achievements
- no string variables or expression language
- no generic persistent variables
- no final authoring UI for affection / endings / gallery

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope
- `.planning/PROJECT.md` — current milestone definition and active requirements
- `.planning/REQUIREMENTS.md` — v1.7 requirements and out-of-scope boundaries
- `.planning/ROADMAP.md` — phase 83 goal, success criteria, and dependencies
- `.planning/STATE.md` — current milestone state and next-step routing

### Research
- `.planning/research/SUMMARY.md` — synthesized v1.7 scope, architecture, UX, pitfalls, and cut line
- `.planning/research/v1.7-architecture.md` — strongest persistence and schema recommendations
- `.planning/research/v1.7-systems.md` — gameplay-systems scope and MVP cut line
- `.planning/research/v1.7-authoring-ux.md` — editor UX recommendations and cut line
- `.planning/research/v1.7-pitfalls.md` — risk list, migration warning, and validation traps

### Supporting reference
- `docs/v1.7-planning-report.md` — condensed decision/tech-selection report
- `docs/script-format.md` — current script format reference (may be partially stale; validate against runtime)

</canonical_refs>

<specifics>
## Specific Ideas

- Phase 83 should favor a **registry-first, contract-first** shape over UI-first implementation.
- If storage or schema decisions are uncertain, bias toward simple, explicit, inspectable JSON shapes.
- If scope slips, prefer preserving `projectId`, save/profile separation, and effect contract before any convenience surfaces.

</specifics>

<deferred>
## Deferred Ideas

- variable registry UI and pickers (Phase 84)
- affection preset UI and ending registry UI (Phase 85)
- CG registry UI, unlock viewer, and milestone-level parity gates (Phase 86)

</deferred>

---

*Phase: 83-galgame-core-contract-persistence*
*Context gathered: 2026-04-28 via auto milestone research synthesis*
