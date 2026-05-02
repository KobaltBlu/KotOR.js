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

Atomic-desktop **WSL2 / daily-driver** documentation and scripts for this machine live **outside** this repository (not a submodule), typically **`G:\workspaces\Kinoite`**. Agents may set **`KINOITE_WORKSPACE_ROOT`** to that path for tooling. The authoritative Phase A doc is **`$KINOITE_WORKSPACE_ROOT/docs/kinoite-wsl2.md`**; a **plan lines vs on-disk files** table is **`$KINOITE_WORKSPACE_ROOT/docs/plan-stipulated-file-tree.md`**. The spec that originated the workspace is **`.cursor/plans/silverblue_wsl_workspace_ec9c3c8b.plan.md`** here. On that host, **`$KINOITE_WORKSPACE_ROOT/scripts/run-full-plan-capture.ps1`** re-runs winget, WSL, and optional inventories; **`imports/CAPTURE-MANIFEST-*.txt`** (small, committed) is the run index, while large exports under **`imports/**` stay gitignored except the manifest and **`imports/README.md`**. **On the Linux (Kinoite) side,** `$KINOITE_WORKSPACE_ROOT/PROVISION` and **`scripts/apply-atomic-provision.sh`** (optional **`scripts/install-atomic-provision-service.sh`** + **`config/systemd/kinoite-atomic-ostree.service`**) are the **declarative** `rpm-ostree` + Flathub path (`config/rpm-ostree/layers.list`, `config/flatpak/*.list`); all **75** plan frontmatter `todos` (including `provision-atomic-declarative`) map in **`$KINOITE_WORKSPACE_ROOT/docs/plan-frontmatter-coverage.md`** (Appendix **C** = ordered `id` list). After editing the plan’s `todos`, run **`$KINOITE_WORKSPACE_ROOT/scripts/verify-plan-frontmatter-coverage.ps1`** so every `id` is still covered. The base image remains **immutable** — layers and Flatpaks are the editable provision path. A **runnable** KDE/Plasma stack under WSLg (default **non-root** user, WSLg `DISPLAY`/`WAYLAND`, **`plasmashell` actually running**) is a **separate** bar, tracked in **`$KINOITE_WORKSPACE_ROOT/docs/kde-wsl2-runtime-verification.md`** and **`WORKSPACE_STATUS.md`**; it is **not** the same as exhaustive plan-id coverage or a passing **`verify-plan-frontmatter-coverage.ps1`**, and you should not assume **windows-mcp** / **desktop-commander** (or similar) exist in a given agent session. This does not change KotOR.js build or test commands.

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

### Forge and agent parity

KotOR.js does **not** ship an in-app LLM inside Forge. **Coding agents** (e.g. Cursor) share the **git workspace** and can use normal tools (`read_file`, terminal, `grep`) on **saved** files. Forge also keeps per-tab **in-memory** buffers (`EditorFile`); if you edit the same path with an agent while a tab has **unsaved** changes, **disk and UI can disagree**—see [docs/agent-native/CAPABILITY_MAP.md](docs/agent-native/CAPABILITY_MAP.md).

**Safe automation patterns:** `npm test`, `npm run lint`, `npm run format:check`, and file edits **after** the user saves (or with agreement on who owns the buffer). **Not exposed as agent APIs today:** tab switch, close tab, Save inside Forge, or archive-specific open flows as single calls.

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

## Learned User Preferences

- On long audits or multi-file refactors, the user may ask to batch `npm` runs (install, lint, test, webpack) instead of after every small edit; still meet the Testing policy before declaring the overall task done unless they narrow the bar for that pass.
- Use `@/` path aliases for imports across the TypeScript tree (not `from './` or `from '..'`); ESLint enforces this where configured (`.eslintrc.yml`). For Forge tab modules, import `TabState` from `@/apps/forge/states/tabs/TabState` rather than the tabs barrel so initialization order stays safe while paths stay `@/`-based.
- For very large plan documents with many todo items, the user may want **one todo item per assistant response**, moving on when they send **continue** (or similar), with the plan front-loaded as complete as possible.
- When a **subagent result is already visible** in the UI, do not re-summarize it unless the user asks or multi-task synthesis is required.
- For **agdec-http / alignment-map** work:
  - **Rotate binaries:** do not run MCP only against `k1_win_gog_swkotor.exe`. Each investigation pass should pick a **different** `program_path` from the shared Odyssey project (e.g. KotOR I vs II builds the server lists—vary deliberately or pseudo-randomly so coverage is not K1-Windows-exclusive).
  - **Verify before writing the map:** confirm anchors with **`user-agdec-http`** (or another working MCP path) **first**; only then edit `MANUAL_SEEDS` in `scripts/build-src-agdec-alignment-map.mjs` and run `npm run alignment-map:generate`. Do not regenerate `docs/agent-native/src-agdec-alignment-map.json` on guesswork.
  - **No mandatory agentdecompile-first:** HTTP MCP is the default verification surface per `.cursor/k1-binary-exe-coverage-model.md` §2b; do not assume you must pre-verify via CLI/agentdecompile before trusting MCP results when MCP is healthy.
  - Prefer **type/class anchors** on alternate builds; keep **address-bearing** `agdec_refs` tied to the binary that produced those addresses unless re-validated elsewhere.

## Learned Workspace Facts

- The agdec **`user-agdec-http`** server may accept **`execute-script`** while **`get-function`** / full decompilation fails when the remote decompiler process does not start; do not assume decompilation-backed parity is always available in-session.
- Do not paste or commit Ghidra server credentials or `uvx` one-liners with embedded passwords; use private env vars or a gitignored runbook (see `.cursor/k1-binary-exe-coverage-model.md` §2b for placeholder-based CLI patterns).
- For commentary in `src/`, follow `.cursorrules`: neutral product-language for original-game behavior; avoid tooling product names, hex or code addresses, and disassembly-style labels in comments (not only a single tool’s naming style).

(Index: `.cursor/hooks/state/continual-learning-index.json`.)
