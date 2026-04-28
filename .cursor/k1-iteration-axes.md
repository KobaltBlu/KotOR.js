# K1 ↔ `k1_win_gog_swkotor.exe` — all iteration axes (index)

**Completeness (TypeScript):** If `npm run k1:exhaustive` exits **0**, then **every** file under `src/**/*.ts` and `src/**/*.tsx` appears **exactly once** as an `SRC-####` row — there is no additional “hidden” `@src` surface to add to the TODO list.

**Completeness (retail EXE, ~tens of thousands of binary functions):** **Not** implied by `k1:exhaustive:all`. See [k1-binary-exe-coverage-model.md](k1-binary-exe-coverage-model.md) — private function manifest, **domain** partition, and **N/A** register, orthogonal to the 1492 file checklist.

**Purpose:** One place that lists **every** checklist axis so no `src/` work is orphaned. The retail Windows GOG binary is the authority for in-engine behavior; `src/**` TypeScript is iterated until each row is validated or explicitly **[N/A]**.

**Reference program (in analysis workspace):** `/K1/k1_win_gog_swkotor.exe`. **Tooling order:** `user-agdec-http` (MCP) first; if unavailable use `user-agdec-mcp` (stdio); last resort `agentdecompile-cli` via `uvx` (env-based Ghidra server flags — see [k1-binary-exe-coverage-model.md](k1-binary-exe-coverage-model.md) §2b; **never** commit host/credentials in-tree). Evidence belongs in private notes, not in `src/` (see `k1_swkotor` plan).

---

| Axis | Rows | Canonical file | Machine check |
|------|------:|----------------|---------------|
| Per `src/**/*.ts` and `src/**/*.tsx` | **1492** | [k1-iteration-todos-exhaustive.md](k1-iteration-todos-exhaustive.md) | `python .cursor/scripts/verify_k1_iteration_exhaustive.py` (also `diff_exhaustive_src.py`) |
| Per directory under `src/` that **directly** contains TS | **200** | [k1-iteration-todos-exhaustive-subdirs.md](k1-iteration-todos-exhaustive-subdirs.md) | same verify script (includes `diff_exhaustive_src_subdirs.py`) |
| Thematic P0–P2, **29** `SRC-DIR-*` trees, **17** `MCP-B` batches, QG, META | ~100+ | [k1-iteration-todos.md](k1-iteration-todos.md) | manual / PR discipline |
| Top-level `src/*` file counts and notes | 29 groups | [k1-src-directory-coverage.md](k1-src-directory-coverage.md) | `python .cursor/scripts/regenerate_k1_src_directory_coverage.py` (must match 1492 total) |
| Optional UI assets `.scss` / `.html` | **91** | [k1-iteration-todos-optional-assets.md](k1-iteration-todos-optional-assets.md) | `regenerate_optional_non_ts_src.py` (optional) |
| Non-TS `src` extensions (fixtures, bytecache, fonts) | n/a (inventory) | [k1-iteration-todos.md](k1-iteration-todos.md) (extension table) | no per-file rows |
| TypeScript **outside** `src/` (e.g. VS Code extension) | **36** | [k1-iteration-todos-repo-ts-outside-src.md](k1-iteration-todos-repo-ts-outside-src.md) | `python .cursor/scripts/diff_repo_ts_outside_src.py` (regen: `regenerate_repo_ts_outside_src_checklist.py`) |
| Binary `k1_win_gog_swkotor.exe` function surface (O(10⁴) in analysis) | **1 model** (not per-function rows) | [k1-binary-exe-coverage-model.md](k1-binary-exe-coverage-model.md) | private manifest hash + **BINARY-01..05** in [k1-iteration-todos.md](k1-iteration-todos.md) |

**Jest:** `testMatch: **/*.test.ts` in `jest.config.js`. All 62+ `*.test.ts` under `src/` are part of the **1492** `SRC-####` set (no parallel list).

**Game runtime (`src/`):** the **1492** `SRC-####` rows are the authority for `k1_win_gog_swkotor.exe` parity. **Repo satellite** `.ts`/`.tsx` (currently under `extensions/kotor-forge-vscode/`) is tracked as **36** `EXT-####` rows; default **[N/A]** to the retail EXE (editor / LSP). There is no `main/*.ts` at repo root in this tree; bundler config is JS.

**npm:** `npm run k1:exhaustive` — `src/` TypeScript + per-dir lists only. `npm run k1:exhaustive:all` — same plus `EXT-####` satellite TypeScript, plus optional `AST-####` `.scss`/`.html` under `src/` (requires `python` on `PATH`). `npm run k1:exhaustive:summary` — print counts and footer numbers (no substitute for `k1:exhaustive:all`).

**Regen after big tree moves:** `regenerate_exhaustive_src_checklist.py`, `regenerate_exhaustive_src_subdirs.py`, then `verify_k1_iteration_exhaustive.py` until exit 0.

---

**Nothing under `src/` is “between” checklists:** every `.{ts,tsx}` file is exactly one `SRC-####`; every folder that directly holds such a file is exactly one `SUBDIR-####`. Close each with MCP support or **[N/A K1]** / host-only rationale in private notes.

**Tooling uses the same `@src` set (no hidden TS):**

- **`tsconfig.json`:** `include` is `src/**/*.ts`, `src/**/*.tsx`, and `src/index.d.ts` — the same files enumerated by the **1492** list (and nothing else is typechecked as “app” TS in that config).
- **ESLint:** `eslint --ext .ts,.tsx src/` — the whole `src/` tree.
- **Prettier / format:** `src/**/*.{ts,tsx}`.
- **Jest:** `testMatch: ['**/*.test.ts']` — all tests under `src/` today use the `*.test.ts` suffix (no `*.test.tsx` or `*.spec.ts` in `src/` in the current tree). Each test file is still a normal `SRC-####` file for K1 work.
- **Split `tsconfig` / bundles:** `tsconfig.forge.json`, `tsconfig.game.json`, `tsconfig.launcher.json`, `tsconfig.debugger.json`, `tsconfig.jest.json`, and `tsconfig.eslint.json` all use `include` globs under `src/**` (plus shared pieces like `src/types` / `src/index.d.ts`). Those are **subsets** of the same **1492** files for IDE/build/Jest — they do not introduce a second hidden file universe. `tsconfig.electron.json` lists **entry** files under `src/electron/`; the rest of the folder compiles as dependencies of those entries. **`tsconfig.webview.json`** is the outlier: it compiles `extensions/kotor-forge-vscode/src/webview/**` only; that is covered by the **36** `EXT-####` rows, not by `SRC-####`.
- **Webpack:** `webpack.config.js` defines JavaScript entry points; bundled TypeScript is still drawn from `src/**` and (where applicable) `extensions/`. The authoritative per-file K1 list for **`@src`** is always the **1492** `SRC-####` checklist, not per-chunk or per-`tsconfig` name.

**What “close an `SRC-####` row” means:** (1) batched `search-everything` (or `search-symbols`) on `k1_win_gog_swkotor.exe` with terms from that file’s domain; (2) at least one `get-function` (or struct follow-up) on a **hot** symbol if the file participates in game data or engine rules; (3) TS/tests updated if a mismatch; or (4) one-line **[N/A K1]** / **Forge** / **Electron** / **TSL** in private notes with no behavioral claim in `src/` that contradicts it. See [k1-iteration-todos.md](k1-iteration-todos.md) hard rule + QG-00.
