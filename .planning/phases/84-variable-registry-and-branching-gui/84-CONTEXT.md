# Phase 84: 变量注册表与条件分支 GUI - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning
**Mode:** Auto-generated from roadmap + Phase 83 outputs

<domain>
## Phase Boundary

Phase 84 turns the Phase 83 contract into an author-facing GUI slice:

- project-level variable registry management
- choice/page variable write configuration through pickers instead of raw keys
- condition-page GUI for 1~3 variable comparisons
- scene-target picker plus readable branch summary
- rename/delete safety with reference counts and reverse references

This phase is about **usable authoring UX on top of the new contract**, not about ending progression, affection presets, or CG gallery UI.

</domain>

<decisions>
## Implementation Decisions

### Locked upstream decisions

- Phase 83 is complete and is the contract foundation for all Phase 84 work.
- `script.json.systems.variables` is the canonical variable registry.
- Canonical write format stays `effects[]`; Phase 84 must not reintroduce raw-key write contracts as first-class saved data.
- Variable scope stays limited to `bool` and `number`.
- No expression language, string variables, or generic persistent variables in this phase.
- Condition GUI scope is intentionally narrow: 1~3 conditions, operators `== != > >= < <=`, mode = all / any.
- Scene routing should use scene pickers and readable summaries, not raw scene IDs as the primary UX.
- Rename/delete flows must surface references and safety instead of silently breaking logic.

### Explicit non-goals

- no affection preset UI yet (Phase 85)
- no ending registry UI yet (Phase 85)
- no CG registry or gallery UI yet (Phase 86)
- no flowchart / node editor
- no replay / extras systems

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/83-galgame-core-contract-persistence/83-VERIFICATION.md`
- `.planning/phases/83-galgame-core-contract-persistence/83-03-SUMMARY.md`
- `.planning/research/SUMMARY.md`
- `.planning/research/v1.7-authoring-ux.md`
- `.planning/research/v1.7-systems.md`
- `.planning/research/v1.7-pitfalls.md`
- `docs/v1.7-phase-83-report.md`

</canonical_refs>

<specifics>
## Specific Ideas

- Prefer one coherent authoring flow over sprinkling variable controls across many disconnected panels.
- Variable registry should probably live at project level, while option/page edits consume registry IDs via pickers.
- If UI scope becomes too large, prioritize correctness and reference safety over visual polish.

</specifics>

<deferred>
## Deferred Ideas

- affection-specific affordances beyond generic number-variable editing
- ending unlock authoring
- CG unlock authoring
- milestone-level integrity dashboard

</deferred>

---

*Phase: 84-variable-registry-and-branching-gui*
