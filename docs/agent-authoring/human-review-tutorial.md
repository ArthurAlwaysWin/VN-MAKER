# Human Review Tutorial For Agent Routes

Use this checklist after an external agent changes a project through `apply-plan` and writes `agent-handoff.json`. It is designed for the no-code editor; reviewing JSON is not required.

The checked-in [example-plan.json](./example-plan.json) builds a compact reference route with:

- one Sakura affection variable;
- a choice that changes affection and unlocks one CG;
- a condition page that selects between two endings;
- terminal page arrival unlocks for both endings;
- shared transition catalog operations.

## 1. Open The Handoff

1. Open the project in the desktop editor.
2. Open **Project Settings** and find the external-agent handoff panel.
3. Confirm the validation, layout, and readiness gates are green.
4. Review the changed paths and checkpoint before accepting visual changes.

If the editor reports that `script.json` changed externally, reload before editing. Do not save stale editor state over an agent transaction.

## 2. Review Story Systems

Open **Story Systems**:

1. In **Variables**, confirm `sakura_affection` is marked as an affection variable for Sakura.
2. In **Endings**, confirm `good_end` and `quiet_end` have their intended titles, thumbnails, and locked visibility.
3. In **CG Gallery**, confirm `cg_confession` has an image, thumbnail, locked thumbnail, and a read-only player progress status.
4. In **Flow**, open the branch graph target and confirm both ending routes are reachable and no dead-end badge appears.

The player-profile ending and CG progress panels are runtime data. They can confirm playtest unlocks, but they must not be edited as authored route content.

## 3. Review Pages

Use changed-page and branch-graph navigation from the handoff panel:

1. Preview `start` page 0 and verify the character staging, background, and dissolve transition.
2. Preview `start` page 1 and check that its honest option grants affection and the CG unlock.
3. Select `route_check` and verify the condition routes affection `>= 1` to `good_ending` and otherwise to `quiet_ending`.
4. Open each terminal normal page and verify its ending arrival-unlock picker points at the matching registered ending.
5. Preview `good_ending` and confirm its supported character motion and background transition are visually acceptable.

Normal-page entry effects are intentionally limited to `unlock:ending`. Any other page-entry effect is a contract error, not a feature to approve.

## 4. Playtest Progression

Run each route once:

1. Choose the honest response, reach `good_ending`, return to title, and open Gallery/Ending review surfaces.
2. Start again, choose the quiet response, and reach `quiet_ending`.
3. Confirm the CG unlock remains available after returning to title and browse each registered unlocked image.
4. Confirm ending and CG progress records are shown independently in their player profile panels.

Reloading a save on a terminal page should not add another arrival unlock count merely because the page is redrawn.

## 5. Finish Review

Before export, resolve or explicitly accept handoff review items and run the editor export readiness flow. Pay special attention to:

- missing or placeholder ending/CG art;
- unused assets intentionally left for later polish;
- unreachable scenes, dead ends, or closed cycles;
- transition fallback warnings.

Once accepted, mark local handoff review items resolved and continue normal visual editing.
