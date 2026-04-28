# Phase 83: 剧情系统契约与持久化护栏 - Research

**Researched:** 2026-04-28
**Domain:** galgame runtime contract, persistence boundaries, author-vs-player data ownership
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### the agent's Discretion
- Phase 83 should favor a **registry-first, contract-first** shape over UI-first implementation.
- If storage or schema decisions are uncertain, bias toward simple, explicit, inspectable JSON shapes.
- If scope slips, prefer preserving `projectId`, save/profile separation, and effect contract before any convenience surfaces.

### Deferred Ideas (OUT OF SCOPE)
- variable registry UI and pickers (Phase 84)
- affection preset UI and ending registry UI (Phase 85)
- CG registry UI, unlock viewer, and milestone-level parity gates (Phase 86)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | 项目拥有稳定 `projectId`，玩家持久化数据不再依赖标题名等可变字段作为 key | Stable top-level `script.json.projectId`, immutable once created, used by profile/save repository keys |
| DATA-02 | `script.json` 以显式注册表定义 variables / endings / gallery.cg，全部使用稳定 ID 而不是自由文本或资源路径推断 | `systems.variables`, `systems.endings`, `systems.gallery.cg` explicit ID-keyed registries |
| DATA-03 | 运行时变量变化与解锁变化统一走最小 effect DSL | Shared `effects[]` contract with `var:set`, `var:add`, `var:sub`, `unlock:ending`, `unlock:cg` |
| PERS-01 | 玩家持久化 `profile` 与普通 `save slot` 严格分层 | `profile.json` owns read-history/unlocks; slot JSON owns only run snapshot |
| PERS-02 | 用户在开发和测试阶段可以明确重置或重建 profile/save 数据 | Explicit reset/rebuild operations: rebuild contract, reset profile, reset saves, reset all |
</phase_requirements>

## Summary

Phase 83 should freeze a clean persistence contract before any v1.7 authoring UX is built. Current code already proves the core risk: runtime save slots are file-backed, but read history is still `localStorage` keyed by title (`src/main.js`, `src/engine/ReadHistory.js`), and choice-side variable writes still use ad-hoc `option.setVariable` accumulation in `ScriptEngine.selectChoice()` (`src/engine/ScriptEngine.js`). That combination will break as soon as endings, CG unlocks, or project renames become real progression features.

The recommended implementation is a strict three-part split: **author definitions in `script.json`**, **cross-run player progression in a versioned `profile`**, and **run snapshots in slot saves only**. Put a stable immutable `projectId` directly in `script.json`, add explicit registries under `script.json.systems`, and replace special-case write fields with a single `effects[]` contract that the runtime can execute from any supported trigger point. Do not spend this phase on migration-heavy compatibility work; spend it on a clean schema, deterministic reset semantics, and a narrow testable persistence boundary.

**Primary recommendation:** Add `script.json.projectId` + `script.json.systems.*` + shared `effects[]`, then introduce a `PlayerDataRepository` that persists `profile` separately from slot saves.

## Project Constraints (from copilot-instructions.md)

- Use JavaScript ES modules; **do not migrate to TypeScript**.
- Keep the no-code product direction: developers/authors should configure via engine/editor contracts, not handwritten logic systems.
- Windows-first behavior must remain compatible with macOS.
- Keep UI conventions aligned with the existing dark-theme, pure-CSS, Chinese-interface product.
- JS modules use named exports, no default exports, and explicit `.js` extensions.
- Renderer processes must not touch the filesystem directly; persistence/file I/O should stay behind Electron IPC.
- Follow existing style: 2-space indentation, semicolons, single quotes.
- Do not make direct repo edits outside the GSD workflow; this research only defines the contract for later planned work.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | 41.0.4 (repo), 41.3.0 current registry | Desktop persistence boundary via IPC and `app.getPath('userData')`-style storage | Existing app shell and the correct place for profile/save file ownership |
| Vue | 3.5.31 (repo), 3.5.33 current registry | Editor-side contract serialization and future registry UIs | Existing editor framework; no new UI stack needed |
| Pinia | 3.0.4 (repo/current registry) | Editor project/script store updates | Existing single-source editor state layer |
| Vitest | 4.1.4 (repo), 4.1.5 current registry | Repo test runner for most UI/runtime tests | Existing suite already uses it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:test | Node 24.13.1 builtin | Fast engine contract tests | For pure runtime contract tests like `ScriptEngine` and persistence helpers |
| JSON files | n/a | Inspectable author/player data | Preferred for this phase because the contract must stay explicit and debuggable |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `script.json.projectId` | Keep identity only in `project.json` | Worse for preview/export parity because runtime currently loads `script.json` directly |
| Separate `profile` + slot saves | Put unlocks into save slots | Simpler short-term, but breaks cross-run truth and delete/load semantics |
| Shared `effects[]` | Keep `option.setVariable` + add more one-off unlock fields | Faster locally, but guarantees contract sprawl and later rewrites |

**Installation:**
```bash
npm install
```

**Version verification:** Verified with `npm view` on 2026-04-28.

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── engine/
│   ├── PlayerDataRepository.js   # profile/save persistence facade
│   ├── ReadHistory.js            # move behind profile-backed implementation
│   └── ScriptEngine.js           # effect execution + tolerant restore
├── shared/
│   ├── galgameContract.js        # helpers for projectId/systems defaults
│   └── effectDsl.js              # effect validation/normalization helpers
└── editor/
    └── stores/
        ├── script.js             # seeds systems registries on load/save
        └── project.js            # save pipeline wiring only
```

### Pattern 1: Stable Project Identity in Author Data
**What:** Store an immutable `projectId` at top level in `script.json`, seed it once for projects that do not have it, and never derive persistence keys from title/name again.
**When to use:** On project create, on project load for additive backfill, and in runtime initialization before profile access.
**Example:**
```json
{
  "projectId": "gm_01JTA8W6Y4D4M5K2N8Q7P3R1S9",
  "contractVersion": 1,
  "characters": {},
  "scenes": {},
  "ui": {},
  "systems": {
    "variables": {},
    "endings": {},
    "gallery": { "cg": {} }
  }
}
```

### Pattern 2: Registry-First Author Contract
**What:** Keep all author-owned gameplay definitions under explicit registries in `script.json.systems`.
**When to use:** For variables, endings, and CG entries; anything the author names, orders, or references by ID.
**Example:**
```json
{
  "systems": {
    "variables": {
      "sakura_affection": {
        "type": "number",
        "label": "樱好感",
        "initial": 0,
        "group": "affection",
        "notes": ""
      },
      "route_sakura": {
        "type": "bool",
        "label": "樱线锁定",
        "initial": false,
        "group": "route",
        "notes": ""
      }
    },
    "endings": {},
    "gallery": { "cg": {} }
  }
}
```

### Pattern 3: Single Effect DSL for All Player-State Writes
**What:** Normalize all write-side gameplay actions to `effects[]`.
**When to use:** Choice selections now; page-enter / ending / CG unlock triggers as later phases attach UI.
**Example:**
```json
{
  "options": [
    {
      "text": "太好了，谢谢你！",
      "target": "path_friendly",
      "effects": [
        { "type": "var:add", "id": "sakura_affection", "value": 1 }
      ]
    }
  ]
}
```

```json
{
  "effects": [
    { "type": "unlock:ending", "id": "sakura_good" },
    { "type": "unlock:cg", "id": "cg_sakura_confession" }
  ]
}
```

### Pattern 4: Profile Owns Cross-Run Truth; Saves Own Run Snapshots
**What:** Persist profile data separately from save slots and keep slot files free of persistent unlock truth.
**When to use:** Always. Save load/delete must never erase read-history, ending, or CG progression.
**Example:**
```json
// profile.json
{
  "version": 1,
  "projectId": "gm_01JTA8W6Y4D4M5K2N8Q7P3R1S9",
  "readHistory": {
    "pages": ["start:0", "start:1"]
  },
  "unlocks": {
    "endings": {
      "sakura_good": {
        "firstUnlockedAt": 1745800000000,
        "lastUnlockedAt": 1745800000000,
        "count": 1
      }
    },
    "cg": {}
  }
}
```

```json
// slot_001.json
{
  "version": 3,
  "projectId": "gm_01JTA8W6Y4D4M5K2N8Q7P3R1S9",
  "state": {
    "currentScene": "start",
    "pageIndex": 0,
    "dialogueIndex": 0,
    "variables": {},
    "history": [],
    "expressionState": {}
  }
}
```

### Anti-Patterns to Avoid
- **Title-based persistence keys:** current `ReadHistory` uses `engine.script.meta?.title || 'untitled'`; this must not survive Phase 83.
- **Two truth sources for progression:** do not duplicate ending/CG/read history into both slots and profile.
- **Special-case write fields:** do not add `unlockEndingId`, `unlockCgIds`, or more `setVariable` variants alongside `effects[]`.
- **Migration-first design:** do not contort the contract around legacy projects; additive seeding + reset semantics is enough for v1.7.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-run progression | Per-feature ad-hoc localStorage keys | Single `PlayerDataRepository` + versioned `profile` | Prevents split ownership like current save files + `ReadHistory` localStorage |
| Unlock detection | Resource/path inference | Explicit ending/CG registries + `unlock:*` effects | Renames and asset moves otherwise break progression |
| Variable writes | Per-page bespoke fields | Shared `effects[]` executor | One validator, one serializer, one runtime write path |
| Persistent identity | `project.name` or title hashing | Stored immutable `projectId` | Renames must not drop progression |
| Compatibility strategy | Broad automatic migration pipeline | Additive default seeding + explicit reset/rebuild actions | Matches user scope: clean contract over legacy complexity |

**Key insight:** The dangerous complexity in this phase is not JSON shape; it is hidden ownership drift. Centralize ownership, not magic.

## Common Pitfalls

### Pitfall 1: Mixing save-slot truth with profile truth
**What goes wrong:** Ending/CG/read-history state gets wiped or rolled back when a slot is loaded or deleted.
**Why it happens:** Current code already splits persistence between slot JSON and `ReadHistory` localStorage.
**How to avoid:** Make `profile` the only authority for cross-run progression and keep slot JSON to run snapshot fields only.
**Warning signs:** Load/delete logic touches unlock state, or slot payloads grow new persistent sections.

### Pitfall 2: Keeping title as the persistence key
**What goes wrong:** Renaming the game silently forks player progress.
**Why it happens:** `src/main.js` currently instantiates `ReadHistory` with `engine.script.meta?.title`.
**How to avoid:** Read `projectId` from the loaded script contract before any profile/read-history initialization.
**Warning signs:** Any persistence key still references title/name/meta label fields.

### Pitfall 3: Letting `effects[]` and legacy fields coexist as peers
**What goes wrong:** Runtime/editor must support two write contracts forever.
**Why it happens:** Existing `choice.options[].setVariable` already has semantics and tests.
**How to avoid:** Normalize legacy `setVariable` into `effects[]` at load time or inside the runtime executor; only persist `effects[]` after Phase 83 edits.
**Warning signs:** New schema docs mention both `setVariable` and `effects` as first-class.

### Pitfall 4: Solving migration instead of freezing the contract
**What goes wrong:** Phase 83 burns time on one-off legacy cases and still ships no stable boundary.
**Why it happens:** Brownfield persistence work tempts “just support everything”.
**How to avoid:** Backfill missing fields additively, tolerate absent data on load, and expose explicit reset/rebuild semantics for development.
**Warning signs:** Tasks start with title-key importers, old unlock scanners, or schema-upgrade trees before contract helpers exist.

## Code Examples

Verified patterns from repo and phase research:

### Contract seeding helper
```js
export function ensureGalgameContract(script) {
  const next = JSON.parse(JSON.stringify(script || {}));
  next.projectId ??= createProjectId();
  next.contractVersion ??= 1;
  next.characters ??= {};
  next.scenes ??= {};
  next.ui ??= {};
  next.systems ??= {};
  next.systems.variables ??= {};
  next.systems.endings ??= {};
  next.systems.gallery ??= {};
  next.systems.gallery.cg ??= {};
  return next;
}
```

### Effect execution boundary
```js
export function applyEffects(effects, runState, profile, now = Date.now()) {
  for (const effect of effects || []) {
    switch (effect.type) {
      case 'var:set':
        runState.variables.set(effect.id, effect.value);
        break;
      case 'var:add':
        runState.variables.set(effect.id, (runState.variables.get(effect.id) || 0) + effect.value);
        break;
      case 'var:sub':
        runState.variables.set(effect.id, (runState.variables.get(effect.id) || 0) - effect.value);
        break;
      case 'unlock:ending':
        profile.unlockEnding(effect.id, now);
        break;
      case 'unlock:cg':
        profile.unlockCg(effect.id, now);
        break;
      default:
        throw new Error(`Unknown effect type: ${effect.type}`);
    }
  }
}
```

### Reset/rebuild semantics
```js
export const ResetScope = {
  CONTRACT: 'contract',
  PROFILE: 'profile',
  SAVES: 'saves',
  ALL: 'all',
};

// contract: ensure missing projectId/systems only
// profile: rewrite default profile for current projectId
// saves: delete slot/quicksave data only
// all: profile + saves
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ReadHistory` keyed by title in localStorage | `profile` keyed by immutable `projectId` | Phase 83 | Renames stop breaking progression |
| `choice.options[].setVariable` only | Shared `effects[]` for variable/unlock writes | Phase 83 | One contract for runtime + editor + validation |
| Slot JSON as de facto only persistence surface | Slot JSON + separate `profile` authority | Phase 83 | Save/delete semantics become predictable |
| Implicit future unlock inference | Explicit registry IDs + explicit unlock events | v1.7 contract | Enables validation and rename safety |

**Deprecated/outdated:**
- `choice.options[].setVariable` as the persisted contract: keep read-compat only if needed, but do not extend it.
- Title-derived progression keys: already unsafe for `ReadHistory`, and completely unacceptable for ending/CG progression.

## Open Questions

1. **Should missing legacy `setVariable` be normalized on editor load or only at runtime?**
   - What we know: current tests and demo data still use `setVariable`.
   - What's unclear: whether the editor should rewrite old data immediately.
   - Recommendation: runtime must support read-normalization immediately; editor save path should emit only `effects[]`.

2. **Should profile storage move to userData in Electron during Phase 83, or can a repository abstraction initially wrap current locations?**
   - What we know: slots are project-folder files today; read history is localStorage.
   - What's unclear: whether moving physical slot location is in-scope for this phase.
   - Recommendation: phase contract should introduce the repository abstraction now; physical relocation can be incremental as long as profile/save separation is real and tested.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + Node `node:test` (mixed repo) |
| Config file | `vitest.config.js` |
| Quick run command | `node --test tests/scriptEngine.test.js` |
| Full suite command | `npx vitest run && node --test tests/scriptEngine.test.js` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | `projectId` is created once, persisted, and used for progression keys | unit | `npx vitest run tests/playerDataRepository.test.js -t "projectId"` | ❌ Wave 0 |
| DATA-02 | missing `systems.variables/endings/gallery.cg` are seeded and preserved on save/load | unit | `npx vitest run tests/galgameContract.test.js -t "systems registries"` | ❌ Wave 0 |
| DATA-03 | `effects[]` executes `var:set/add/sub` and `unlock:*` consistently | unit | `node --test tests/effectDsl.test.js` | ❌ Wave 0 |
| PERS-01 | slot load/delete does not mutate profile unlock/read-history state | integration | `npx vitest run tests/playerDataRepository.test.js -t "save profile separation"` | ❌ Wave 0 |
| PERS-02 | reset/rebuild commands touch only requested scope | unit | `npx vitest run tests/playerDataRepository.test.js -t "reset scope"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/scriptEngine.test.js`
- **Per wave merge:** `npx vitest run && node --test tests/scriptEngine.test.js`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/galgameContract.test.js` — contract seeding for `projectId`, `contractVersion`, `systems.*`
- [ ] `tests/effectDsl.test.js` — parse/validate/apply `effects[]`
- [ ] `tests/playerDataRepository.test.js` — profile/save separation and reset semantics
- [ ] `tests/scriptEngine.test.js` additions — legacy `setVariable` normalization and tolerant restore with profile-backed reads

## Sources

### Primary (HIGH confidence)
- `E:\projects\my-awesome-project\.planning\phases\83-galgame-core-contract-persistence\83-CONTEXT.md` - locked phase scope and explicit non-goals
- `E:\projects\my-awesome-project\.planning\ROADMAP.md` - Phase 83 success criteria and requirement mapping
- `E:\projects\my-awesome-project\.planning\REQUIREMENTS.md` - DATA-01/02/03 and PERS-01/02 definitions
- `E:\projects\my-awesome-project\.planning\research\v1.7-architecture.md` - registry/profile/effect recommendations
- `E:\projects\my-awesome-project\.planning\research\v1.7-pitfalls.md` - brownfield persistence risks
- `E:\projects\my-awesome-project\src\engine\ScriptEngine.js` - current `setVariable`, condition handling, state snapshot shape
- `E:\projects\my-awesome-project\src\engine\ReadHistory.js` - current title-keyed persistent read state
- `E:\projects\my-awesome-project\src\main.js` - runtime initialization and `ReadHistory` key source
- `E:\projects\my-awesome-project\electron\main.js` - current save-slot/quicksave file contract and project load/save pipeline
- `E:\projects\my-awesome-project\tests\scriptEngine.test.js` - existing runtime contract coverage and gaps

### Secondary (MEDIUM confidence)
- `E:\projects\my-awesome-project\.planning\research\SUMMARY.md` - synthesized milestone guidance
- `E:\projects\my-awesome-project\.planning\research\v1.7-systems.md` - product scope cut line
- `E:\projects\my-awesome-project\.planning\research\v1.7-authoring-ux.md` - downstream authoring implications
- `E:\projects\my-awesome-project\docs\v1.7-planning-report.md` - confirmed milestone-level decisions

### Tertiary (LOW confidence)
- `E:\projects\my-awesome-project\docs\script-format.md` - useful as historical context, but stale for current page-based runtime

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - repo stack is explicit and package versions were verified with `npm view`
- Architecture: HIGH - recommendations directly address current code paths and locked phase scope
- Pitfalls: HIGH - risks are already visible in current persistence split and runtime contracts

**Research date:** 2026-04-28
**Valid until:** 2026-05-28
