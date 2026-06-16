# Human Review Tutorial For Agent Routes

Use this checklist after an external agent changes a project through `apply-plan` and writes `agent-handoff.json`. It is designed for the no-code editor; reviewing JSON is not required.

The checked-in [example-plan.json](./example-plan.json) builds a compact reference route with:

- one Sakura affection variable;
- a choice that changes affection and unlocks one CG;
- a condition page that selects between two endings;
- terminal page arrival unlocks for both endings;
- shared transition catalog operations.

Generate a ready-to-open review project and its handoff artifact with:

```bash
npm run verify:agent-example -- --out .tmp/agent-example-project --json
```

On repeated runs, add `--force` to rebuild the previously generated directory. Open `.tmp/agent-example-project` in the desktop editor to follow the walkthrough below.

## 1. Open The Handoff

1. Open the project in the desktop editor.
2. Open **Project Settings** and find the external-agent handoff panel.
3. Confirm the validation, layout, and readiness gates are green.
4. Review the changed paths and checkpoint before accepting visual changes.

If the editor reports that `script.json` changed externally, inspect its structured path diff and reload before editing. Do not save stale editor state over an agent transaction; external changes are never auto-merged.

## 2. Review Story Systems

Open **Story Systems**:

1. In **Variables**, confirm `sakura_affection` is marked as an affection variable for Sakura.
2. In **Endings**, confirm `good_end` and `quiet_end` have their intended titles, thumbnails, and locked visibility.
3. In **CG Gallery**, confirm `cg_confession` has an image, thumbnail, locked thumbnail, and a read-only player progress status.
4. In **Flow**, open the branch graph target and confirm both ending routes are reachable and no dead-end badge appears.
5. If the handoff includes `video-preview` items, confirm registered OP/ED/story videos point at canonical `videos/...` project assets and that ending ED settings live on the ending entries rather than on ad hoc pages or custom code.

The player-profile ending and CG progress panels are runtime data. They can confirm playtest unlocks, but they must not be edited as authored route content.

## 3. Review Pages

Use changed-page and branch-graph navigation from the handoff panel:

1. Preview `start` page 0 and verify the character staging, background, and rightward wipe transition.
2. Preview `start` page 1 and check that its honest option grants affection and the CG unlock.
3. Select `route_check` and verify the condition routes affection `>= 1` to `good_ending` and otherwise to `quiet_ending`.
4. Open each terminal normal page and verify its ending arrival-unlock picker points at the matching registered ending.
5. Preview `good_ending` and confirm its `pop` character motion, `crossfade-pan` background transition, and `vignette` camera overlay are visually acceptable.

Normal-page entry effects are intentionally limited to `unlock:ending`. Any other page-entry effect is a contract error, not a feature to approve.

## 4. Review OP/ED And Video Pages

When the handoff includes video changes:

1. Open the resource library and confirm each video entry has the intended file, label, kind, and optional poster.
2. Open title screen settings and confirm the OP uses `ui.titleScreen.openingVideo`; `after-start` should play before the first story page, and `before-title` may require a click-to-play gate.
3. Open ending settings and confirm each ED uses `systems.endings.<id>.endingVideo`; `manual` is for replay/preview, while `after-unlock` plays after the ending is saved.
4. Open any changed `type: "video"` page and confirm its target, `autoAdvance`, skip/controls, audio mode, fit, and loop settings are editable in the no-code page inspector.
5. Play through the OP, ED, and story video path once. Confirm failed or skipped playback returns cleanly to the expected title, story, or ending flow.

## 5. Playtest Progression

Run each route once:

1. Choose the honest response, reach `good_ending`, return to title, and open Gallery/Ending review surfaces.
2. Start again, choose the quiet response, and reach `quiet_ending`.
3. Confirm the CG unlock remains available after returning to title and browse each registered unlocked image.
4. Confirm ending and CG progress records are shown independently in their player profile panels.

Reloading a save on a terminal page should not add another arrival unlock count merely because the page is redrawn.

## 6. Finish Review

Before export, resolve or explicitly accept handoff review items and run the editor export readiness flow. Pay special attention to:

- missing or placeholder ending/CG art;
- missing OP/ED/story video files or unsupported video formats;
- unused assets intentionally left for later polish;
- unreachable scenes, dead ends, or closed cycles;
- unknown transition or camera warnings.

Once accepted, mark handoff review items resolved and continue normal visual editing. Those acknowledgement/resolution decisions are kept in project-local `agent-review-state.json`, scoped to the active handoff and separate from `script.json` and player progress.
