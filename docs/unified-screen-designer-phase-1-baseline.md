# Unified Screen Designer Phase 1 Baseline And Parity Ledger

**Status:** Complete
**Date:** 2026-06-22
**Baseline:** `main` at `7cf2e9a`
**Scope:** Evidence only. No runtime, project-contract, renderer, or editor behavior changed.

## Purpose And Evidence Rules

This document records the current behavior that later Unified Screen Designer phases must preserve, intentionally migrate, or explicitly retire. The product remains Agent-first and Editor-completable: future Agent output may be more expressive than common editor workflows, but the editor must render, inspect, preserve, explain, and safely adjust it.

An item is marked covered only when it has executable DOM/behavior evidence, Browser evidence, or a checked screenshot. Source inspection is inventory evidence, not behavioral acceptance.

Evidence produced in Phase 1:

- deterministic fixture catalog: `tests/fixtures/unifiedScreenDesignerLegacyFixtures.js`;
- cross-surface DOM baseline: `tests/unifiedScreenDesignerBaseline.test.js`;
- 13 directly related Vitest files, 256 passing tests;
- Browser DOM and interaction run at `http://[::1]:4174/index.html` using a temporary web package under `.tmp/usd-browser-runtime`;
- screenshots under `.tmp/`: `usd-phase1-title-1280x720.png`, `usd-phase1-title-1440x900.png`, and `usd-phase1-settings-1280x720.png`.

The temporary runtime package adds a `projectId` only to its copied `.tmp/script.json`. The committed sample project and canonical contract are unchanged.

## Current Ownership Map

| Surface | Runtime owner | Current editor entry | Canonical current data | Current preview target |
| --- | --- | --- | --- | --- |
| 1. Title | `TitleScreen` | `App.vue` workspace `title` -> `TitleDesigner.vue` | `ui.titleScreen` | iframe `show-screen:titleScreen`; standalone runtime title |
| 2. Gameplay UI | `DialogueBox`, `ChoiceMenu`, `QuickActionBar` | Page Editor canvas/inspector plus Project Settings dialogue/theme controls | `ui.dialogueBox`, `ui.widgetStyles`, `ui.theme`, `ui.motion`; live page dialogue/choice data under `scenes.*.pages.*` | `show-dialogue-preview`, `show-choice-preview`, Page Editor approximation, runtime |
| 3. Game menu | `GameMenu`; route orchestration in `src/main.js` | workspace `game-menu` -> `GameMenuEditor.vue` / `GameMenuSection.vue` | `ui.gameMenu`, shared theme icons/button families, `ui.motion.menus` | iframe `show-screen:gameMenu`; runtime overlay |
| 4. Settings | `SettingsScreen` plus registered setting widgets and `ConfigManager` | workspace `settings-page` -> `SettingsPageEditor.vue` | `ui.settingsScreen`, `ui.widgetStyles`, theme icons, `ui.motion.menus` | iframe `show-screen:settingsScreen`; runtime screen |
| 5. Save/load | `SaveLoadScreen` plus active save manager | workspace `save-load` -> `SaveLoadEditor.vue` / `SaveLoadSection.vue` | `ui.saveLoadScreen`, theme icons/button families, `ui.motion.menus`; save records are external player data | iframe `show-screen:saveLoadScreen` in save/preview mode; runtime save/load modes |
| 6. Backlog | `BacklogScreen` plus `AudioManager` | workspace `backlog` -> `BacklogEditor.vue` | `ui.backlogScreen`, theme icons, `ui.motion.menus`; history is runtime engine data | iframe `show-screen:backlogScreen` with empty history; runtime history screen |
| 7. Gallery | `GalleryScreen` plus title/main routing | Story Systems CG and ending registries; no layout editor | `systems.gallery.cg`, `systems.endings`; unlocks in `player-data/profile.json` | runtime title `gallery` action only; no deterministic editor `show-screen` target |
| Text input overlay | `TextInputScreen` | Page Inspector input-page controls | input page fields under `scenes.*.pages.*`; transient value is runtime state | runtime/input-page flow; no reusable overlay editor target |
| Confirmation overlay | inline `SaveLoadScreen._showConfirmation()` DOM | none | no project field; transient overwrite/delete intent | save/load runtime only |
| Video controls overlay | `VideoPlayer` native controls, gate, and skip button | Video Library, title opening-video control, page/ending inspectors | `assets.videos`, `ui.titleScreen.openingVideo`, `scenes.*.pages.*.video`, `systems.endings.*.endingVideo` | runtime video path and video-specific previews; no reusable overlay editor target |

## Surface Behavior Baseline

### 1. Title

- **States:** default/custom layout; save absent/present; gallery absent/present; visible/hiding/re-shown; opening-video policy supplied separately from element layout.
- **Actions:** `start`, `continue`, `settings`, `gallery`, `play-opening-video`, and `quit`. Default buttons are availability-sensitive; custom buttons use allowlisted action strings.
- **Data and assets:** `background`, `bgm`, `openingVideo`, and `elements[]` containing text, image, and button fields. Image/background/font/BGM/video references remain project assets.
- **Input:** pointer activation; editor Delete/Backspace and arrow-based layer changes are focus-guarded; runtime title does not install a screen-level keyboard navigation model.
- **Current editing:** the strongest current canvas: palette, drag/drop, select, move, resize, z-order, inspector, background/BGM/opening video, asset picking, and runtime iframe preview.
- **Gap:** the Vue canvas is a separate visual interpretation from `TitleScreen`; no common hierarchy, responsive constraints, common focus model, or renderer-owned node ids.
- **Future mapping:** panel/root, text, image, button primitives; title menu semantic group; built-in title actions.
- **Evidence:** `unifiedScreenDesignerBaseline.test.js`, `galleryScreen.test.js`; Browser title DOM; both title screenshots.

### 2. Gameplay UI

- **States:** narration or named dialogue; completed/typewriter line; choice prompt/options; quick-action auto, skip, and quick-load enabled states.
- **Actions:** advance/finish line, select choice, auto, skip, backlog, save, load, quick-save, quick-load, and settings. Quick-action clicks stop propagation so they do not advance dialogue.
- **Data and assets:** live page dialogue/choice content; `ui.dialogueBox`; shared widget styles; dialogue frame/nameplate/decorations; choice/button families and badges; quick-action icons; voice remains page/history runtime data.
- **Input:** dialogue pointer/keyboard progression is orchestrated in `main.js`; choices and quick actions are buttons; global Space/Enter/Escape/right-click routing applies during play.
- **Current editing:** story content remains in Page Editor; dialogue/global visual settings live in Project Settings; choice preview is partly Page Editor-owned and partly runtime-preview-owned.
- **Gap:** no unified hierarchy or canvas for persistent gameplay chrome; Page Editor choice/dialogue visuals are not the runtime renderer.
- **Future mapping:** protected story viewport plus dialogue box, nameplate, choice list, quick action bar, and status semantic widgets.
- **Evidence:** `unifiedScreenDesignerBaseline.test.js`, `dialogueBoxSchemaFlow.test.js`, `dialogueBoxPreviewWiring.test.js`, `choiceMenuMotion.test.js`, and `quickActionBarThemeIcon.test.js`.

### 3. Game Menu

- **States:** hidden/visible; default/custom panel; all six built-in destinations. Supported opening inputs are Escape and the gameplay menu/quick-action path; the menu itself stores no source value.
- **Actions:** save, load, backlog, settings, title, and close. Every menu action first hides the menu. Save/load then open `SaveLoadScreen` with source `menu`; closing save/load with that source reopens the menu.
- **Data and assets:** panel position/width/background/background image/radius/blur/gap, per-action text/icon, chrome decorations, theme icons/button families, menu motion.
- **Input:** delegated pointer clicks; Escape and right-click priority routing live in `main.js`, not `GameMenu`; no explicit focus acquisition/restoration or local arrow/gamepad navigation.
- **Current editing:** fixed form plus runtime iframe; no element selection, hierarchy, or direct manipulation.
- **Future mapping:** modal/panel root, navigation button primitives, semantic menu action group.
- **Evidence:** `gameMenuLayout.test.js`, `unifiedScreenDesignerBaseline.test.js`; save/load source-route DOM tests.

### 4. Settings

- **States:** default, custom `elements[]`, structured tabs, structured left tabs, and structured single-page mode. Tab assignments normalize known setting definitions and render each setting once.
- **Actions/data:** values come only from `ConfigManager`; sliders, selects, toggles, close, title, and reset remain declarative. Reset refreshes controls through the built-in manager.
- **Assets:** screen/header/panel images, decorations, theme close/tab/button icons, widget styles.
- **Input:** buttons, sliders, selects, and pointer tab switching. Controls are native or widget-backed, but screen show/hide does not explicitly move or restore focus.
- **Current editing:** rich bespoke structured form/canvas workflow and runtime iframe, but not a common screen hierarchy.
- **Gap:** large settings-specific schema; current Browser run opened settings while focus remained on the title settings button. The checked screenshot also records the transparent overlay/title bleed-through baseline.
- **Future mapping:** settings group, setting control, tab bar semantic widgets plus panel/text/button primitives.
- **Evidence:** `settingsStructured.test.js`, `settingsScreenContract.test.js`; Browser open/close DOM evidence; settings screenshot.

### 5. Save/Load

- **States:** save/load mode; source `bar`, `menu`, or `title`; empty/occupied slots; configured grid; pages; active overwrite/delete confirmation; cached/pending/stale refresh.
- **Actions/data:** save, load, delete, close, page select. Slot data belongs to the save manager; load success hides with route suppression; normal close reports the original source.
- **Assets:** screen/header/slot backgrounds, thumbnails including data URLs, decorations, close/pager/button-family icons.
- **Input:** slot/delete/confirmation buttons, pointer pagination, ArrowLeft/ArrowRight page navigation.
- **Current editing:** fixed screen form and save-mode iframe fixture.
- **Gap:** preview does not switch fixtures between save/load, populated/empty, or source routes. Inline confirmation has no modal role, focus transfer/trap/restoration, Escape handling, or keyboard-specific testable contract.
- **Future mapping:** save-slot grid semantic widget with save/load variants; pagination semantic part; shared confirmation overlay.
- **Evidence:** `saveLoadScreenLayout.test.js` covers modes, empty/occupied, pagination, stale async render/cache protection, arrows, source routing, and delete cancel/confirm.

### 6. Backlog

- **States:** empty content region, narration, speaker entries, voiced entry, playing/stopped/error-restored voice, custom/default layout.
- **Actions/data:** close and replay voice. History and character colors come from the active engine; voice uses `AudioManager`.
- **Assets:** background/header/decorations, close icon, voice-replay icon, voice asset references.
- **Input:** close/replay buttons, pointer scrolling. No explicit screen keyboard navigation or focus lifecycle.
- **Current editing:** fixed form and empty runtime iframe.
- **Gap:** current empty state is a blank content region rather than an explanatory message; editor cannot preview recorded or voiced entries.
- **Future mapping:** backlog list semantic widget with protected entry/voice parts plus panel/header primitives.
- **Evidence:** `backlogScreenLayout.test.js` covers empty, recorded, voiced, replay rejection restoration, and layout states.

### 7. Gallery

- **States:** no CGs; locked/unlocked CG; multi-image focus navigation; ending locked/unlocked; manual ending-video replay eligibility.
- **Actions/data:** close, select unlocked card, previous/next image, replay eligible ending video. Author data comes from CG/ending registries; unlock truth comes from player profile and is never written by the screen.
- **Assets:** CG images/thumbnails/locked thumbnails, ending thumbnails, ending-video references.
- **Input:** pointer buttons/cards. Locked cards are non-interactive; no screen-level keyboard/focus navigation model.
- **Current editing:** Story Systems edits registry content and reads unlock records; there is no `ui.galleryScreen`, layout editor, or preview message target.
- **Gap:** no layout contract/editor and no deterministic editor fixture host.
- **Future mapping:** gallery grid and focus viewer semantic widgets, optional tab bar, image/text/button primitives.
- **Evidence:** `galleryScreen.test.js` covers empty, locked/unlocked, multi-image, eligible/ineligible replay, title action, and title hide/show race protection.

## Shared Overlay Baseline

| Overlay | Current behavior | Current editing gap | Future semantic widget | Evidence |
| --- | --- | --- | --- | --- |
| Text input | Prompt/default/placeholder/max length/required/submit text; autofocus/select; Enter submits; empty required value refocuses; successful submit hides | Page fields exist, but no reusable template, cancel control, validation-message part, or modal focus restoration | protected prompt, input, confirm, cancel, validation parts | `unifiedScreenDesignerBaseline.test.js` |
| Confirmation | Save/load creates inline overwrite/delete DOM; cancel removes it; confirm invokes one callback then refreshes slot data | no shared template; no modal semantics, focus trap/restore, Escape, or project styling contract | protected title/body/confirm/cancel shared overlay | `saveLoadScreenLayout.test.js` |
| Video controls | native video controls obey `controls`; built-in skip obeys `skippable`; Escape skips only skippable playback; gate handles autoplay rejection; audio mode is restored on completion | no reusable control layout/template; policy-authorable parts are undecided | progress, play/pause, skip, volume parts gated by video policy | `videoPlayer.test.js` |

## Editing Capability And Gap Summary

| Capability | Current baseline | Phase 1 disposition |
| --- | --- | --- |
| Canvas manipulation | Title only; Page Editor approximates gameplay UI | preserve evidence; migrate later |
| Fixed structured forms | Game menu, settings, save/load, backlog | preserve until each screen migration |
| Runtime iframe preview | title/settings/menu/save/backlog plus dialogue/choice messages | preserve protocol behavior; add deterministic state fixtures later |
| Gallery content editing | Story Systems registry only | preserve registry editor; add separate layout editor later |
| Hierarchy/common inspector | absent | future Phase 4 capability |
| Responsive preview | runtime scales fixed game resolution; no common authoring constraints | screenshot baseline records 16:9 letterboxing |
| Keyboard/focus | fragmented across `main.js`, native controls, and individual screens | preserve current routes; treat missing focus ownership as migration risk |
| Agent authoring | existing screen-specific commands/config only | inventory only; no new CLI in Phase 1 |

## Fixture Matrix

| Required state | Fixture | Executed evidence |
| --- | --- | --- |
| Minimal configuration | `MINIMAL_LEGACY_UI` | null/default branches in the directly related screen tests |
| Heavily customized configuration | `CUSTOMIZED_LEGACY_UI` | title/gameplay/menu DOM baseline and existing full-config screen tests |
| Settings tabbed/single page | `SETTINGS_FIXTURES` | `settingsStructured.test.js` |
| Save/load empty/populated and both modes | `SAVE_LOAD_FIXTURES` | `saveLoadScreenLayout.test.js` |
| Backlog empty/recorded/voiced | `BACKLOG_FIXTURES` | `backlogScreenLayout.test.js` |
| Gallery empty/locked/unlocked/multi-image/ending replay | `GALLERY_FIXTURES` | `galleryScreen.test.js` |
| Game menu opening/closing inputs | `GAME_MENU_FIXTURES` plus current `main.js` routing inventory | menu DOM tests and save/load source-route tests; global Escape/right-click remain Browser/e2e risk |
| Title default/custom buttons | `TITLE_FIXTURES` | `unifiedScreenDesignerBaseline.test.js`, `galleryScreen.test.js` |
| Dialogue/choice/quick bar | `GAMEPLAY_UI_FIXTURES` | `unifiedScreenDesignerBaseline.test.js` plus focused component tests |
| Text/confirmation/video overlays | `OVERLAY_FIXTURES` | unified baseline, save/load, and video tests |

## Parity Ledger

`Preserve` means behavior and ownership survive migration. `Migrate` means keep behavior but move rendering/editing to the canonical system. `Retire` means remove only after equivalent parity evidence exists.

| Current behavior/path | Decision | Future owner / retirement gate |
| --- | --- | --- |
| Engine-owned settings, save records, history, gallery unlocks, and live choice data | Preserve | semantic data adapters; never copy transient player data into screen documents |
| Built-in action allowlists and source-aware save/load return routing | Preserve | shared action router with behavior tests |
| Title element intent, screen-specific layout fields, theme references, assets, and motion | Migrate | pure legacy adapters -> canonical nodes/widgets; changed paths and loss diagnostics required |
| Save/load mode variants, pagination, cached async refresh, and stale-request rejection | Preserve and migrate | save-slot semantic widget |
| Backlog voice replay and error restoration | Preserve and migrate | backlog-list semantic widget |
| Gallery lock gating, multi-image viewer, and manual ending replay policy | Preserve and migrate | gallery grid/focus widgets |
| Current screen-specific runtime DOM constructors | Retire later | only after shared renderer parity per migrated screen |
| Title Vue-only canvas interpretation | Retire later | shared renderer must replace both editor canvas and runtime interpretation |
| Fixed screen forms as the primary layout editor | Retire later | Unified Editor Shell must cover safe edits and preserve advanced Agent fields |
| Story Systems CG/ending registry editor | Preserve | remains content registry; future Gallery designer owns layout only |
| Page Editor story staging | Preserve | protected story viewport boundary; never migrate into screen document |
| Inline save/load confirmation DOM | Retire after migration | shared confirmation overlay with modal/focus/action parity |
| Blank Backlog empty content | Preserve as legacy baseline, candidate intentional change | any new empty-state copy must be called out as an intended change |
| Preview wildcard avoidance and concrete-origin messaging | Preserve | canonical preview snapshots must retain origin safety |
| Legacy fields/readers | Preserve until Phase 11 evidence | explicit migration, rollback, export, and sample-project closure required |

## Browser And Screenshot Evidence

Browser availability: available and used first.

- Page identity passed: URL `http://[::1]:4174/index.html`; title `Galgame Maker — Runtime Engine`.
- Not blank/framework overlay passed: DOM contained the title, start/settings buttons, and hidden runtime screen owners.
- Current-page console passed: no `error` or `warn` entries from port 4174.
- Interaction passed: the unique title `设 定` button opened `#settings-screen`; the unique settings `返回` button changed the screen class to `hidden` while the title remained visible.
- Focus observation: after opening settings, focus remained on the title settings button. This is a baseline gap, not a Phase 1 fix.
- In-app Browser screenshot capture failed twice with a `Page.captureScreenshot` timeout. The already-installed Playwright CLI was used only for screenshot fallback; DOM, console, and interaction evidence remained on the Browser path.
- `1280x720`: title and settings screenshots captured.
- `1440x900`: title screenshot captured; fixed 16:9 stage remains centered with visible top/bottom letterboxing.

## Decisions Still Open And Risks

1. Exact canonical node ordering, variants, breakpoints, and internal semantic-widget part exposure remain Phase 2 decisions.
2. Gallery mixed grid versus CG/ending tabs remains open.
3. Video-control authorability must stay bounded by active playback policy.
4. Current global Escape/right-click routing is centralized in `main.js`; component-only migration could accidentally bypass its priority order.
5. Menu, settings, save/load, backlog, gallery, confirmation, and text input lack a complete focus ownership/restoration contract. Settings focus retention and confirmation non-modal behavior are now explicit baseline risks.
6. Save/load preview has only empty save-mode data; Backlog preview has only empty history; Gallery has no editor preview target. Later deterministic fixture injection must not be mistaken for current runtime parity.
7. The checked sample `public/game/script.json` lacks the stable `projectId` required by current standalone web initialization. Browser evidence therefore used an isolated `.tmp` copy with a temporary id; the source sample was not fixed in Phase 1.
8. Direct Vite runtime development serves `index.html` while standalone web expects a sibling `script.json`; the repo sample lives under `public/game/`. Use a packaged/export-shaped directory for repeatable runtime browser evidence.
9. The settings screenshot records current transparent overlay/title bleed-through. Later visual changes must classify any change as intentional rather than silently calling it parity.
10. Browser screenshot transport was unreliable in this run. Preserve the Playwright screenshot fallback until the in-app capture timeout is understood.

## Phase 1 Acceptance

- No runtime or project-contract behavior changed.
- Every primary screen and named overlay has a deterministic fixture or fixture state, behavior checklist, future widget mapping, and executable evidence reference.
- 1280x720 and alternate-aspect screenshots exist under `.tmp`, not committed output.
- Navigation/close routing, input focus, delete confirmation, pagination, stale async refresh, voice replay, lock/unlock, and relevant keyboard behavior have DOM, Browser, or screenshot evidence where currently applicable.
- Known gaps are recorded rather than fixed or hidden.
- The parity ledger explicitly distinguishes preserve, migrate, and retire decisions.

## Phase 1 Closure Batch

Completed on 2026-06-22 before Phase 2:

- aligned the shared populated Save/Load fixture with the runtime `previewText` slot shape;
- added DOM behavior evidence for populated preview text, timestamps, and inline thumbnails;
- retained the missing sample `projectId` as an explicit Phase 3 browser-harness prerequisite rather than a Phase 1 blocker.

Phase 1 is complete. Phase 2 has not started.
