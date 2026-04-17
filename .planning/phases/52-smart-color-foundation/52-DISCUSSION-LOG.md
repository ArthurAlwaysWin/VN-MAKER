# Phase 52: Smart Color Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 52-smart-color-foundation
**Areas discussed:** Module Structure, Color Math, Derivation Rules, API Contract
**Mode:** Auto (--auto flag) — all areas auto-selected, recommended defaults chosen

---

## Module Structure

| Option | Description | Selected |
|--------|-------------|----------|
| New `oklch.js` module | Clean separation, colorHarmony.js stays for PaletteModal backward compat | ✓ |
| Extend `colorHarmony.js` | Add OKLCH alongside HSL in existing module | |
| Separate color-math + rules modules | Split into `oklch-math.js` + `oklch-rules.js` | |

**Agent's choice (auto):** New `oklch.js` module
**Notes:** Research recommended single-file approach. colorHarmony.js is still used by PaletteModal.

---

## Color Math Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Pure JS matrix math (~60 lines) | Zero-dep, inline sRGB↔linear↔OKLCH matrices | ✓ |
| culori npm library | Full-featured color library, adds dependency | |
| chroma.js | Popular but 36KB, overkill for our needs | |

**Agent's choice (auto):** Pure JS implementation
**Notes:** Zero-dependency constraint from engine architecture. Research confirmed 60-line implementation is sufficient.

---

## Gamut Clamping Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Binary-search chroma reduction | Bisect C until in-gamut, preserves L and H | ✓ |
| Simple clamp RGB channels | Fast but distorts perceived color | |
| Chroma mapping via deltaE | Most accurate but complex, diminishing returns | |

**Agent's choice (auto):** Binary-search chroma reduction
**Notes:** Matches pattern in existing `contrast.js:autoFix()`. Good balance of accuracy and simplicity.

---

## Rule Table Format

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in oklch.js | Rules tightly coupled to derivation logic | ✓ |
| Separate JSON data file | More flexible but unnecessary indirection | |
| Config-driven from script.json | Too dynamic for foundational rules | |

**Agent's choice (auto):** Inline in oklch.js
**Notes:** <100 entries, all consumed by single function. No need for external configuration.

---

## Agent's Discretion

- Internal OKLCH math implementation details (matrix coefficients, cube root functions)
- Exact binary-search tolerance for gamut clamping  
- Test structure and test helper utilities
- Intermediate conversion function signatures

## Deferred Ideas

None — all discussion items were within Phase 52 scope.
