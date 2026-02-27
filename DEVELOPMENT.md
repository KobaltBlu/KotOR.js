# Development

This document describes how to build, run, and test KotOR.js from the repository. For environment setup and prerequisites, see [SETUP.md](SETUP.md).

## Application (Electron)

The desktop app runs in Electron. It compiles TypeScript for the main process, then launches the launcher window (from which you can start the game or Forge).

| Script | Description |
|--------|--------------|
| `npm start` | Compile main-process TypeScript once and launch Electron. |
| `npm run start-watch` | Watch main-process sources; on successful compile, launch Electron (process restarts on change). |

### Running with npx

You can run any npm script via `npx` without cloning or installing the repo first. This works whether the package is published to the npm registry or not (e.g. from a GitHub URL).

**From npm (if published):** use the package name as the command. **From GitHub:** you must use `-p` (or `--package`) to specify the package, then the command name `kotor-js` and the script. The first run from GitHub clones the repo and runs `npm install`, which can take several minutes for this repo.

| Equivalent | From npm (if published) | From GitHub (no publish) |
|------------|--------------------------|---------------------------|
| `npm run start:electron` | `npx -y kotor-js start:electron` | `npx -y -p git+https://github.com/KobaltBlu/KotOR.js.git kotor-js start:electron` |
| `npm run start:web` | `npx -y kotor-js start:web` | `npx -y -p git+https://github.com/KobaltBlu/KotOR.js.git kotor-js start:web` |
| `npm test` | `npx -y kotor-js test` | `npx -y -p git+https://github.com/KobaltBlu/KotOR.js.git kotor-js test` |

- **`-y`** skips the “install?” prompt.
- **From repo root (local development):** `node bin/cli.js <script>` or `npx -y -p . kotor-js <script>` (e.g. `npx -y -p . kotor-js start:electron`). Do not use `npx -y . kotor-js …` — that runs the project script named `kotor-js`, not the CLI.
- **Git shorthand:** `npx -y -p github:KobaltBlu/KotOR.js kotor-js start:electron` is equivalent to the `git+https://...` form.
- To list all scripts: `npx -y kotor-js --help` or, from GitHub, `npx -y -p git+https://github.com/KobaltBlu/KotOR.js.git kotor-js --help`.

### Debugging the main process

To get Chromium and Node warning stack traces in the terminal:

| Script | Description |
|--------|--------------|
| `npm run start:debug` | Same as `npm start` with `ELECTRON_ENABLE_LOGGING=1` and `NODE_OPTIONS=--trace-warnings`. |
| `npm run start-watch:debug` | Same as `npm run start-watch` with the same environment (for ongoing development with logging). |

To attach a debugger to the main process, use Node’s inspector:

| Script | Description |
|--------|--------------|
| `npm run start:inspect` | Compile once and run Electron with `--inspect=5858`. In Chrome, open `chrome://inspect`, then "Open dedicated DevTools for Node" and connect to the target. |

Setting the environment manually (when not using the debug scripts):

- **PowerShell:** `$env:ELECTRON_ENABLE_LOGGING=1; $env:NODE_OPTIONS="--trace-warnings"; npm run start-watch`
- **CMD:** `set ELECTRON_ENABLE_LOGGING=1 && set NODE_OPTIONS=--trace-warnings && npm run start-watch`
- **Bash/zsh:** `ELECTRON_ENABLE_LOGGING=1 NODE_OPTIONS=--trace-warnings npm run start-watch`

### Debugging the renderer (Launcher, Game, Forge)

Renderer DevTools can be opened from inside the app (e.g. by enabling `openDevTools()` in `src/electron/LauncherWindow.ts` or `src/electron/ApplicationWindow.ts`). To use Chrome against a remote-debugging endpoint:

1. Compile and run with a fixed port: `npx electron --remote-debugging-port=9222 ./main`
2. In Chrome, open `http://localhost:9222` and attach to the desired target.

---

## Build (Webpack)

The project uses a single Webpack configuration file that exports multiple configs (KotOR library, launcher, game, Forge, debugger). One `webpack` run builds all of them; there is no npm script to build a single target.

| Script | Description |
|--------|--------------|
| `npm run webpack:dev` | Single development build (`NODE_ENV=development`). Output under `dist/`. |
| `npm run webpack:dev-watch` | Development build in watch mode (rebuilds on file changes). |
| `npm run webpack:prod` | Single production build (`NODE_ENV=production`). |
| `npm run webpack:dev:verbose` | Development build with `--progress` and `--stats verbose`. |

### TypeScript typecheck

Full-project type checking (no emit) is available separately from the Webpack build:

| Script | Description |
|--------|--------------|
| `npm run typecheck:build` | Type-check all `src` with `tsconfig.buildcheck.json` (strict null checks off). Use before or after changes to catch type errors without strict null/undefined. |
| `npm run typecheck` | Strict type-check with `tsconfig.check.json` (strict null checks and strict property init off). Use to find null/undefined and other strict issues. |

Webpack uses esbuild-loader, which transpiles TypeScript but does not run the full type checker. Run `npm run typecheck:build` (or `npm run typecheck`) to fail fast on type errors at the command line.

---

## Main-process TypeScript only

If you only need to recompile the Electron main process without running Webpack or Electron:

| Script | Description |
|--------|--------------|
| `npm run electron:compile` | Compile `tsconfig.electron.json` once. Output in `dist/electron/`. |
| `npm run electron:watch` | Watch main-process TypeScript and recompile on change. Does not start Electron; use another terminal to run `npm start` or `electron ./main` when needed. |

---

## Packaged build

| Script | Description |
|--------|--------------|
| `npm run electron:build` | Production Webpack build, main-process compile, then `electron-builder build --publish=never` to produce the distributable application. |

---

## Tests

Tests are in `./src/tests` and run with Jest.

| Script | Description |
|--------|--------------|
| `npm test` | Run tests with verbose output and coverage. Disables cache. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run test:verbose` | Run tests with verbose output, no coverage. |

To run a single test file: `npx jest --runInBand path/to/file.test.ts`

---

## API documentation

| Script | Description |
|--------|--------------|
| `npm run typedoc` | Generate API documentation from `./src/KotOR.ts` into `./wiki`. |

---

## Type checking

These are not defined as npm scripts; run when needed:

- `npx tsc --noEmit` — full project (uses root `tsconfig.json`).
- `npx tsc --noEmit -p tsconfig.forge.json` — Forge app only.
- `npx tsc --noEmit -p tsconfig.game.json` — Game app only.
- Similarly for `tsconfig.launcher.json`, `tsconfig.electron.json`, and other project files.

---

## CI

- **`.github/workflows/webpack-dev.yml`** — On-demand: install dependencies and run `npm run webpack:dev`.
- **`.github/workflows/webpack-prod.yml`** — Production Webpack build (see workflow for trigger).

---

## Typical development workflow

1. **Terminal 1:** `npm run webpack:dev-watch` — keep front-end bundles (launcher, game, Forge) rebuilding on change.
2. **Terminal 2:** `npm run start-watch` — run the app and restart the main process on change. For extra logging and trace output, use `npm run start-watch:debug` instead.
