# Milestone 11 Feasibility And Security Design Audit: Agent Effect Packs

Milestone 11 is closed as a design/security audit plus a manifest-only built-in
adapter thin slice. The audit decision is unchanged: project-local effect code
is not safe to execute in the current Web/Electron runtime. The shipped slice
therefore uses only data-only manifests, page references, validation, export
scanning, preview/handoff routing, and the in-app `canvas2d:film-flicker`
adapter. Any project-owned executable code still requires a separate sandbox
milestone.

## Decision

Effect packs may be designed as project assets, but they must not become
arbitrary JavaScript, shader, plugin-market, or layout/effect DSL execution.

The safe shipped shape is:

- A project asset folder contains a manifest, preview thumbnail, and optional
  non-code media.
- Page or UI config references an effect pack by stable id and normalized
  parameters.
- Runtime dispatches only to built-in allowlisted adapters compiled with the app.
- Validator rejects or warns on manifests that request unsupported capabilities.
- Export copies only manifest/media files that are explicitly referenced and
  path-safe.

The unsafe shape is:

- A project asset folder contains `runtime.js` and the app executes it directly.
- The manifest grants network, filesystem, arbitrary DOM, `eval`, shader,
  WebGL, plugin marketplace, or AI chat capabilities.
- Pages embed raw code, CSS, HTML, or a general visual DSL.

## Current Architecture Audit

### Particles

Particles are contract-first and data-only:

- `src/shared/particleContract.js` owns preset ids, parameter schema,
  normalization, and same-scene inheritance.
- Page data stores `scenes.*.pages.*.particles` as object/null/omitted.
- `src/ui/ParticleLayer.js` renders built-in procedural Canvas 2D particles
  through a narrow `play(config)`, `stop()`, `clear()`, `resize()`, `destroy()`
  API.
- Runtime never loads project particle code or particle asset scripts.
- Validation, CLI/apply-plan, preview targets, handoff review, and export use the
  same page path.

Reusable M11 lesson: keep authored data separate from runtime code, normalize at
the shared contract boundary, and make skip/reduced-motion cleanup first-class.

### Transitions

Transitions use a catalog/preset model:

- `src/shared/transitionCatalog.js` defines ids, target, storage field,
  category, render mode, parameter schema, defaults, support flags, and fallback.
- `src/shared/cinematicContract.js` preserves unknown future values while routing
  runtime fallback safely.
- `src/ui/BackgroundLayer.js` owns the narrow runtime switch between CSS
  transitions and the M8 canvas-mask helper.
- `src/ui/TransitionMask.js` is built-in procedural Canvas 2D code, not project
  code.

Reusable M11 lesson: `renderMode` and `fallbackId` are the right pattern for
effect capability routing, but new render modes must remain allowlisted.

### Cinematic Fields

Page cinematic data is normal script data:

- `transition.type` and `transition.duration` select cataloged background work.
- `camera.effect` and character `animation` use shared known-value helpers.
- Unknown values are preserved for compatibility but are not executed.

Reusable M11 lesson: future effect references should preserve unknown ids without
running them, and runtime fallback must be deterministic.

### Effect DSL

`src/shared/effectDsl.js` is not a visual effect system. It is a small choice and
page-entry consequence DSL:

- `var:set`
- `var:add`
- `var:sub`
- `unlock:ending`
- `unlock:cg`

It intentionally has no visual runtime, no arbitrary operations, and no script
execution. M11 must not extend this DSL into a generic visual/effect language.

### Validation And Export

Current safety relies on shared scanners and path filters:

- `src/shared/projectValidator.js` emits stable diagnostics for unsupported
  cinematic, particle, motion, and UI preset data.
- `src/engine/scanAssets.js` is pure, has no filesystem dependency, accepts only
  known asset roots, and rejects URL/data/blob/file schemes, absolute paths, and
  traversal.
- Desktop export calls `scanAssets`, copies only referenced paths, and already
  has path safety tests.
- Theme packages provide a reusable manifest pattern: namespace ids, file
  manifests, path validation, bytes/hash metadata, and preflight errors.

M11 implementation note: effect-pack files are manifest-listed, referenced by
canonical script paths, and scanned through an explicit `effects` asset bucket.

### Preview, Apply-Plan, And Handoff

The current visual review pattern is consistent:

- Mutations report exact changed paths.
- `author-check --transaction --write-preview-plan` derives preview targets from
  changed paths.
- Handoff adds review items such as `particle-preview`, `transition-preview`, and
  `screen-ui-preview`.
- UI style presets are recipes: they write normal editable sections and provide
  an impact summary instead of storing opaque preset state.

M11 implementation note: effect-pack references use exact changed paths,
preview targets, and `effect-pack-preview` review items before handoff.

## Shipped Contract

Effect packs are declared under `assets.effectPacks` and their files live under
the export asset root `effects/<id>/`:

```text
effects/old-film-flicker/
  effect.json
  preview.png
  noise.png
```

The manifest should be data-only:

```json
{
  "id": "old-film-flicker",
  "kind": "postprocess",
  "label": "Old Film Flicker",
  "version": 1,
  "adapter": "canvas2d:film-flicker",
  "paramsSchema": {
    "intensity": { "type": "number", "minimum": 0, "maximum": 1, "default": 0.5 }
  },
  "defaults": { "intensity": 0.5 },
  "files": [
    { "path": "effects/old-film-flicker/preview.png", "role": "preview" },
    { "path": "effects/old-film-flicker/noise.png", "role": "texture" }
  ],
  "performance": {
    "usesCanvas": true,
    "maxParticles": 0,
    "supportsSkip": true,
    "supportsReducedMotion": true
  }
}
```

Pages reference the effect by id and parameters, not by executable file:

```json
{
  "effectPacks": [
    {
      "id": "old-film-flicker",
      "enabled": true,
      "params": { "intensity": 0.35 }
    }
  ]
}
```

The exact changed page path is
`scenes.<sceneId>.pages.<pageIndex>.effectPacks`.

## Required Runtime Boundary

The runtime boundary stays narrower than the app:

```javascript
adapter.play({
  canvas,
  width,
  height,
  params,
  assets,
  time,
  signal,
  motion,
});
```

Allowed capabilities:

- Draw to the provided Canvas 2D context or update an app-owned container through
  a fixed adapter.
- Read normalized params.
- Read manifest-listed, path-safe media assets resolved by the engine.
- Observe an abort signal and reduced-motion/skip state.

Forbidden capabilities:

- Network requests, including `fetch`, `XMLHttpRequest`, WebSocket, EventSource,
  WebRTC, beacon, or remote image/audio URLs.
- Filesystem, shell, Electron IPC, Node APIs, or preload APIs.
- `eval`, `new Function`, dynamic import of project files, script tags, workers
  from project code, or string-to-code transforms.
- Arbitrary DOM reads/writes outside an app-provided element.
- Persistent storage, cookies, localStorage/sessionStorage, IndexedDB, or
  clipboard.
- WebGL/shaders unless a later explicit milestone reopens that scope.

## Security Feasibility

Executing project-local `runtime.js` is not feasible in this milestone.
In a browser/Electron app, a script that runs in the same realm can reach too
much ambient authority unless the project adds a substantial sandbox: strict CSP,
sandboxed iframe or worker isolation, capability membranes, URL rewriting,
resource budgets, and failure containment. That is a separate security feature,
not a visual-polish increment.

The shipped M11 slice is an allowlisted-adapter model:

1. Agents propose or implement new effect code in the application repository.
2. The code is reviewed, tested, and compiled with the app.
3. Project assets contain only manifests, parameters, thumbnails, and media.
4. Runtime selects adapters by manifest `adapter`, and unknown adapters no-op or
   fall back.

## Validation Coverage

The thin slice adds stable diagnostics for manifest and page-reference safety:

- `invalid-effect-pack-manifest`
- `unsupported-effect-pack-kind`
- `unsupported-effect-pack-adapter`
- `invalid-effect-pack-file-path`
- `effect-pack-reference-missing`
- `invalid-effect-pack-registry`
- `effect-pack-id-mismatch`
- `condition-page-effect-packs`
- `invalid-page-effect-packs`
- `invalid-page-effect-pack-entry`
- `invalid-page-effect-pack-id`
- `invalid-effect-pack-params`

Validation rejects executable entries, URL schemes, traversal paths, absolute
paths, forbidden capabilities, and malformed parameter schemas. Unsupported
future adapters warn and runtime no-ops.

## Export Coverage

Export is consistent through the deliberate `effects` bucket:

- `scanAssets()` returns `effects`.
- Web and Electron export copy only manifest-listed effect files from
  runtime-resolved page references.
- Export readiness treats `effects/...` as an asset-like path.
- Invalid, unsupported-adapter, disabled, and unreferenced effect pack folders
  remain outside the script-driven runtime/export set.
- Preserve current URL, traversal, absolute-path, and root filtering.
- Keep Web and Electron desktop export behavior identical.

## Preview, Apply-Plan, And Handoff Coverage

Effect-pack commands follow existing visual paths:

- `list-effect-packs` reads validated manifests.
- `register-effect-pack` stores a validated manifest under
  `assets.effectPacks.<id>`.
- `set-page-effect-pack` writes canonical page references.
- `clear-page-effect-packs` removes page references.
- `apply-plan` returns exact changed paths such as
  `scenes.<sceneId>.pages.<pageIndex>.effectPacks`.
- `author-check --transaction --write-preview-plan` creates scene-page or screen
  preview targets.
- Handoff emits an `effect-pack-preview` review item.
- Editor UI remains future work; the shipped path is shared contract, CLI,
  validation, preview planning, handoff, export, and runtime cleanup.

Commands are documented only for this manifest-only thin slice, and tests cover
contract, validation, CLI/apply-plan, preview planning, handoff, export scanning,
runtime events, and Canvas 2D adapter behavior.

## Final Completion Audit

The final M11 completion audit on 2026-06-02 found no blockers. The completed
contract is:

- Effect packs are project data only: `assets.effectPacks` manifests plus page
  `effectPacks` references on normal and choice pages.
- Runtime, export, readiness, validation, author-check, handoff, direct CLI, and
  apply-plan all use the same shared effect-pack contract.
- Runtime/export resolution is referenced-only: a pack must be referenced by a
  renderable page, enabled, valid, and backed by a built-in adapter before its
  files are considered.
- Unsupported, invalid, disabled, condition-page-only, and unreferenced manifests
  may be reported by validation, but they do not enter runtime playback or export
  file copying.
- Changed paths for direct CLI and apply-plan effect-pack edits are canonical:
  `scenes.<sceneId>.pages.<pageIndex>.effectPacks`.
- The built-in adapter surface remains narrow. The shipped adapter allowlist is
  compiled with the app and dispatches only to reviewed Canvas 2D code.
- Network, filesystem, eval, arbitrary DOM, WebGL, shader, plugin marketplace,
  AI chat, and project-local JavaScript remain explicitly out of scope.

Verification commands passed during the completion audit:

- `git status --short --branch`
- `git log --oneline -8`
- `npm run test`
- `npm run build`
- `npm run build:web`

## Explicit Non-Scope

This audit does not reopen:

- WebGL or shaders.
- Live2D or Spine.
- Plugin marketplace/distribution.
- Arbitrary JavaScript execution.
- Generic effect/layout DSL.
- Rich text.
- Built-in AI chat.
- Uploaded transition masks beyond the completed M8 built-in canvas-mask milestone.

## Audit Outcome

Milestone 11 is complete as a feasibility/security design audit plus a
manifest-only allowlisted-adapter thin slice. The next safe expansion should add
more built-in reviewed adapters or explicit editor controls. Project-local
runtime code remains blocked until a separate sandbox milestone exists.
