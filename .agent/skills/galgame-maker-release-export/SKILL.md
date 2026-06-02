---
name: galgame-maker-release-export
description: Prepare Galgame Maker release/export artifacts for users or public demo delivery. Use when the user asks an AI agent to export a game to a directory, make a web build, make a desktop build, package the portable editor, create a release zip, prepare a Bilibili/Douyin/GitHub release, or verify that exported artifacts are safe and complete.
---

# Galgame Maker Release Export

Use this for release and export delivery. Always run QA/readiness before packaging.

## Before Export

```bash
git status --short --branch
npm run test
npm run build
npm run build:web
npm run vn:readiness -- --script public/game/script.json --asset-root public/game/assets --json
```

If readiness reports blockers, stop and fix or report them before packaging.

## Current Export Surfaces

The repo currently has:

- Electron editor export flows through the desktop app.
- `npm run vn:export-web -- --out <dir>` for hands-free web game export.
- `npm run vn:export-desktop -- --out <dir>` for hands-free Windows desktop game export.
- `npm run package:editor:win` for a portable Windows editor zip.
- `npm run package:editor:win:dir` for an unpacked portable Windows editor directory.
- `vn-author export-readiness` for export safety checks.

CLI export runs export readiness first and refuses to write when blockers exist unless `--allow-readiness-blockers` is explicitly passed.

## Portable Editor Package

For a green/no-install Windows editor release:

```bash
npm run package:editor:win
```

Expected output:

- `release/Galgame Maker-win32-x64/`
- `release/Galgame Maker-win32-x64.zip`

After packaging, start the executable once if the environment allows it and confirm it opens without crashing.

## Game Export Request

When the user says "export to <directory>":

1. Run project QA and export readiness.
2. Confirm whether the target is web game, desktop game, or portable editor unless the request is explicit.
3. For web export, run:

```bash
npm run vn:export-web -- --script public/game/script.json --out "<directory>" --zip --json
```

4. For desktop game export, run:

```bash
npm run vn:export-desktop -- --script public/game/script.json --out "<directory>" --zip --json
```

5. Report the output path, zip path when present, readiness result, and any warnings.

## References

- `../../../docs/agent-authoring/validation-rules.md` for readiness gates.
- `../../../docs/agent-authoring/workflow.md` for final handoff.
- `../../../docs/milestone-11-effect-packs-feasibility-security-audit.md` for effect-pack export safety.
- `../../../scripts/package-editor-win.js` for portable editor packaging.

## Do Not

- Do not skip readiness before export.
- Do not include source-only, temporary, or development files in a user-facing release package unless the user asked for source distribution.
- Do not open commercial licensing or marketplace claims unless the release policy explicitly allows them.
