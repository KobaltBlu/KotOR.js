# AGENTS.md

## Cursor Cloud specific instructions

### Overview

KotOR.js is a TypeScript reimplementation of the Odyssey Game Engine (Star Wars: KotOR I & II). It has four web/Electron frontends:

- Launcher
- Game Client
- KotOR Forge (modding suite)
- Debugger

All frontends are bundled through Webpack 5 (`webpack.config.js`) and esbuild-loader.

### Fedora Kinoite workspace (optional)

Atomic-desktop **WSL2 / daily-driver** documentation and scripts for this machine live **outside** this repository (not a submodule), typically **`G:\workspaces\Kinoite`**. Agents may set **`KINOITE_WORKSPACE_ROOT`** to that path for tooling. The authoritative Phase A doc is **`$KINOITE_WORKSPACE_ROOT/docs/kinoite-wsl2.md`**; the spec that originated the workspace is **`.cursor/plans/silverblue_wsl_workspace_ec9c3c8b.plan.md`** here. On that host, **`$KINOITE_WORKSPACE_ROOT/scripts/run-full-plan-capture.ps1`** re-runs winget, WSL, and optional inventories; **`imports/CAPTURE-MANIFEST-*.txt`** (small, committed) is the run index, while large exports under **`imports/**` stay gitignored except the manifest and **`imports/README.md`**. **On the Linux (Kinoite) side,** `$KINOITE_WORKSPACE_ROOT/PROVISION` and **`scripts/apply-atomic-provision.sh`** (optional **`scripts/install-atomic-provision-service.sh`** + **`config/systemd/kinoite-atomic-ostree.service`**) are the **declarative** `rpm-ostree` + Flathub path (`config/rpm-ostree/layers.list`, `config/flatpak/*.list`); plan frontmatter `provision-atomic-declarative` maps in **`$KINOITE_WORKSPACE_ROOT/docs/plan-frontmatter-coverage.md`**. The base image remains **immutable** — layers and Flatpaks are the editable provision path. This does not change KotOR.js build or test commands.

### Agent mission and quality bar

When working in this repo, optimize for:

1. Fast, reproducible validation loops.
2. Zero-regression changes (lint, tests, and build should remain green).
3. Clear evidence in final responses (commands, outputs, and artifacts where relevant).
4. Respect for legal/runtime constraints: proprietary game assets are not in this repository.

### Pre-flight checklist (always do this first)

1. Read this file plus:
   - `README.md`
   - `DEVELOPER_QUICK_REFERENCE.md`
2. Identify the change type:
   - Engine/runtime code
   - UI/frontend code
   - Build/config/CI changes
   - Docs-only changes
3. Pick the smallest high-signal test plan that exercises changed code paths.
4. If UI changed, prefer Cloud web mode for manual validation (see below).
5. Avoid reverting unrelated, pre-existing git changes.

### Quick command reference

Standard commands are documented in `DEVELOPER_QUICK_REFERENCE.md` and `README.md`. High-value scripts:

- `npm ci` - clean install using lockfile (preferred in CI)
- `npm test` - run tests with coverage
- `npm run lint` - run ESLint (legacy mode set by script)
- `npm run format:check` - check Prettier formatting
- `npm run webpack:dev` - one-shot dev build of all bundles
- `npm run webpack:prod` - one-shot prod build of all bundles
- `npm run webpack:dev-watch` - watch mode for local iteration
- `npm run electron:compile` - compile Electron TypeScript entry points
- `npm start` - compile Electron TypeScript then launch Electron

### Known caveats

- **ESLint uses legacy config mode**: The project uses `.eslintrc.yml` with ESLint 9. The lint scripts set `ESLINT_USE_FLAT_CONFIG=false` automatically.
- **Electron renders black on headless VMs**: Launcher uses a transparent frameless window and can render black without GPU compositing.
- **Game files required for full gameplay testing**: Game Client and major Forge flows require proprietary KotOR data files. Agents must not claim full gameplay coverage when those assets are unavailable.

### Cloud VM: reliable UI validation path

Use web-mode launcher validation instead of Electron for headless/manual checks:

1. Build assets: `npm run webpack:dev`
2. Serve static output: `cd dist && python3 -m http.server 8080`
3. Open Chrome at: `http://localhost:8080/launcher/`

Without proprietary game files, these launcher surfaces are still valid to test:

- Main launcher shell rendering
- Community page
- Need KotOR page
- General navigation and interactive UI controls that do not depend on installed game assets

### Testing policy for agents

Pick tests based on change scope.

#### Required by default (non-trivial code changes)

1. `npm run format:check`
2. `npm run lint`
3. `npm test`
4. One build path:
   - `npm run webpack:dev` for most app/runtime changes
   - `npm run webpack:prod` when production bundling behavior might be affected

#### Additional checks by change type

- **Webpack/build config changes**: run both `npm run webpack:dev` and `npm run webpack:prod`.
- **Electron main-process changes**: run `npm run electron:compile` at minimum.
- **UI changes** (`.tsx/.scss/.css/.html`): manual browser validation in Cloud web mode; provide screenshot/video artifact in final response when possible.
- **Docs-only changes**: no runtime tests required; ensure docs stay accurate and internally consistent.

#### Explicitly report test coverage limits

If game assets or Blender are unavailable, state exactly what was tested, what was not, and why.

### Blender and kotorblender validation playbook

This repository does not currently bundle the `kotorblender` add-on. Treat Blender checks as optional unless task-specific instructions require them.

When Blender validation is requested:

1. Check whether `blender` is available on PATH.
2. Run a headless Blender smoke test (`--background --factory-startup`) to prove runtime health.
3. If a `kotorblender` checkout/path is provided:
   - add it to Python path
   - import the addon module
   - enable addon via `bpy.ops.preferences.addon_enable(...)`
4. Report success/failure with concrete logs; do not over-claim coverage.

### CI/CD expectations

GitHub Actions should provide:

1. **CI on push/PR** with:
   - install (`npm ci`)
   - format check
   - lint
   - tests
   - build verification
2. **Manual deployment workflows** for dev/prod bundle publication.
3. **Optional/manual Blender smoke workflow** for headless Blender + optional kotorblender import checks.

When editing workflows:

- Pin official actions to current major versions (`actions/checkout@v4`, `actions/setup-node@v4`, etc.).
- Use `npm ci` (not `npm install`) in CI.
- Upload build artifacts for debugging failed deploys.
- Keep secrets usage explicit and minimal.

### Final response requirements for agents

Every non-trivial change should include:

1. Concise summary of files/behavior changed.
2. Exact commands run and their outcome.
3. Any environment/test limitations and why.
4. For UI work, walkthrough artifacts (video and/or screenshots).
