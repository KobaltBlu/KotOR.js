# Workspace VS Code configuration

This folder contains shared **launch** and **task** configurations for the KotOR.js workspace, with a focus on a full, customizable experience for developing and debugging the **KotOR Forge** VS Code extension and the KotOR/TSL web apps.

---

## Launch configurations (`launch.json`)

### Extension development (KotOR Forge)

All extension-host configs use the extension at `extensions/kotor-forge-vscode`. Source maps and `outFiles` are set so breakpoints in TypeScript (extension and LSP server) resolve correctly.

| Configuration | Description |
|---------------|-------------|
| **Launch Extension** | **Recommended for daily development.** Starts the Extension Development Host with **only** the KotOR Forge extension enabled; all other installed extensions are disabled via `--disable-extensions`. Runs the **Compile KotOR Forge extension** task before launch. |
| **Launch Extension (with other extensions)** | Same as above but **does not** use `--disable-extensions`. Use when you need to test KotOR Forge alongside other extensions (e.g. another extension you depend on). |
| **Launch Extension (watch mode)** | Launches the extension after starting the **Watch KotOR Forge extension** task (webpack watch). Use when you want to change extension code and reload the Extension Development Host without re-running a full compile each time. |
| **Attach to Extension Host** | Attaches the debugger to an already-running Extension Development Host. Start the host with `code --extensionDevelopmentPath=...` (or via **Developer: Reload Window** in the host), then run this configuration. |

**Debugging the extension**

- Set breakpoints in `extensions/kotor-forge-vscode/src/**/*.ts` and (for the LSP server) `extensions/kotor-forge-vscode/server/src/**/*.ts`.
- **Webview (Forge editor UI):** The webview runs in a separate process. In the Extension Development Host window, run **Developer: Open Webview Developer Tools** (Command Palette) to open DevTools for the webview and debug the webview bundle (`dist/webview/webview.js` and its source maps).

**Why `--disable-extensions`?**

- Isolates your extension so only KotOR Forge is loaded.
- Reduces noise from other extensions and avoids conflicts.
- Speeds up the Extension Development Host and makes behavior more predictable.

### Electron (root – KotOR.js / Forge standalone)

| Configuration | Description |
|---------------|-------------|
| **Electron (root, with watch)** | Starts the **Watch web verbose (root)** task (webpack dev watch with verbose output), waits for the first successful compile, then launches the Electron app from the repo root. Use **Stop** to stop Electron; the watch task keeps running until you **Terminate Task** or **Rerun Task** from the watch terminal’s dropdown. |

### Browser (KotOR / TSL web apps)

These use VS Code’s **serverReadyAction** to run the static server (`npx serve dist`) as part of the debug session. When you stop debugging (Shift+F5), the server stops too. Chrome opens automatically when the server is ready.

| Configuration | Description |
|---------------|-------------|
| **KotOR Launcher** | One-off build (preLaunchTask) then serve. Server lifecycle tied to debug session. |
| **KotOR Launcher (watch)** | Webpack watch (preLaunchTask, waits for first compile) then serve. Edit code → webpack rebuilds; refresh the browser. Watch keeps running until you terminate its terminal. |
| **KotOR Launcher (clean build)** | Clean + rebuild (preLaunchTask) then serve. Use when you want a fresh build. |
| **KotOR** | Same as KotOR Launcher; opens the game app: `http://localhost:8080/game/index.html?key=kotor`. |
| **TSL** | Same as KotOR Launcher; opens the game app for TSL: `http://localhost:8080/game/index.html?key=tsl`. |

### Compound configurations

| Compound | Description |
|----------|-------------|
| **Extension + Watch (compile then launch)** | Same as **Launch Extension (watch mode)** — starts the watch task and then launches the extension. |

---

## Tasks (`tasks.json`)

Tasks are used by the Run and Debug workflow (e.g. **preLaunchTask**) and can be run from **Terminal → Run Task...** or the Command Palette (**Tasks: Run Task**).

| Task | Default / group | Description |
|-----|-----------------|-------------|
| **Compile KotOR Forge extension** | **Default build** (⇧⌘B / Ctrl+Shift+B) | Runs `npm run compile` in the extension folder (webpack + LSP server compile). Use before debugging or packaging. |
| **Watch KotOR Forge extension** | build | Runs `npm run watch` (webpack watch). Use with **Launch Extension (watch mode)** so changes recompile while the Extension Development Host is running. |
| **Compile extension server only** | build | Runs `npm run compile:server` (only the NWScript LSP server in `server/`). |
| **Clean KotOR Forge extension** | — | Runs `npm run clean` (removes `dist/`, `server/out/`, `output/`). |
| **Lint KotOR Forge extension** | — | Runs `npm run lint` (ESLint) in the extension folder. |
| **Package KotOR Forge extension** | — | Compiles the extension then runs `npm run package` (vsce package) to produce a `.vsix`. |
| **Install extension dependencies** | — | Runs `npm install` in the extension folder (and server deps via postinstall). |
| **Install root dependencies** | — | Runs `npm install` at repo root. |
| **Watch web (root)** | build | Root repo: runs `npm run watch` (webpack dev watch for KotOR.js / Forge Electron bundle). **Background task** — after the first compile, use the terminal tab’s dropdown to **Terminate Task** (stop) or **Rerun Task** (restart). |
| **Watch web verbose (root)** | build | Same as above with `npm run watch:verbose`. Used as **preLaunchTask** for **Electron (root, with watch)** and **KotOR Launcher (watch)**. |
| **Build web for serve (root)** | build | One-off `npm run build:web:dev` so `dist/` exists. PreLaunch for **KotOR Launcher**, **KotOR**, **TSL**. |
| **Clean and build web (root)** | build | Runs `npm run clean && npm run build:web:dev`. PreLaunch for **KotOR Launcher (clean build)**. |

**Problem matchers**

- **Compile** uses `$tsc` only (ESLint is configured as warnings project-wide and does not block the task).
- **Compile extension server only** uses `$tsc`.
- **Watch** (extension and root) use a background problem matcher so VS Code knows when the first webpack compile has finished. That gives you **Terminate Task** / **Rerun Task** in the terminal dropdown and lets launch configs that use a watch as **preLaunchTask** wait for the first build before starting the app.

**KotOR Launcher: server lifecycle**

The KotOR Launcher configs use VS Code’s **serverReadyAction** feature. The static server (`npx serve dist`) is launched as a Node process inside the debug session. When you press **Stop** (Shift+F5), the server process is terminated too — no orphaned serve tasks.

---

## Quick reference

- **F5** (or **Run → Start Debugging**): Starts the currently selected launch configuration (e.g. **Launch Extension**).
- **⇧⌘B / Ctrl+Shift+B**: Runs the default build task (**Compile KotOR Forge extension**).
- **Run Task**: Command Palette → **Tasks: Run Task** → pick a task.
- To debug only your extension: use **Launch Extension** (with `--disable-extensions`).
- To debug the webview: in the Extension Development Host, **Developer: Open Webview Developer Tools**.

---

## Files in this folder

- **`launch.json`** — Debug/launch configurations (extension host, Chrome, compounds).
- **`tasks.json`** — Task definitions (compile, watch, clean, lint, package).
- **`extensions.json`** — Recommended extensions for this workspace.
- **`README.md`** — This file.
- **`*.code-snippets`** — Snippets for Typedoc comments.
