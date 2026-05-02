# K1 retail EXE — binary function inventory vs `src/` TypeScript (coverage model)

**Why this doc exists:** Agdec (HTTP MCP, stdio MCP, CLI) can expose on the order of **tens of thousands** of decompiled **functions** for a single program such as `k1_win_gog_swkotor.exe`. The repo’s **1490** `SRC-####` rows prove **every `src/**/*.ts|tsx` file** is on a checklist — **not** that every binary function has a one-to-one line in TypeScript. Treating the two as the same would guarantee **false confidence** and **silent omissions** on the binary side.

**Authority:** [`.cursor/plans/k1_swkotor_re_audit_b357eb25.plan.md`](plans/k1_swkotor_re_audit_b357eb25.plan.md). **File-level checklists:** [k1-iteration-axes.md](k1-iteration-axes.md). **Checkboxes for this model:** [k1-iteration-todos.md](k1-iteration-todos.md) (`BINARY-01`–`BINARY-05`).

---

## 1) Two orthogonal completeness claims

| Claim | What it proves | Machine check |
|--------|----------------|---------------|
| **A. Source tree** | No TS file under `src/` is forgotten | `npm run k1:exhaustive:all` = 0 |
| **B. Binary program** | Every in-scope function is **accounted for** (mapped, merged as duplicate, or **N/A** with a written rule) | **No** in-repo auto-proof yet; use **private** manifest + [k1-iteration-todos.md](k1-iteration-todos.md) **`BINARY-01`–`BINARY-05`** (same steps as §3) |

**Execution rule:** When parity work “starts for real,” **both** A and B must be under active control. **A** is already automated. **B** is **mandatory** for a “no omissions vs RE” bar and is **not** implied by **A**.

---

## 2) How to obtain a full (or full-enough) function set

**Tooling:** Agdec tool schemas are loaded from the local Cursor **MCP** project folder (e.g. `user-agdec-http`, `user-agdec-mcp`); paths are not vendored inside this git tree. On your machine, open the server’s `tools/*.json` and `resources/*.json` for exact parameters.

**Bounded searches are not a full inventory:** `search-everything` (HTTP) uses `limit`, `per_scope_limit`, and `max_functions_scan` — fine for **batched discovery**, not for “list all N functions” in one call. **`search-symbols`** is paginated (`offset` / `limit`).

### 2a) Prefer signatures and binary layout over symbol-name search

**Do not treat `search-symbols` as the default mapper from TypeScript to the executable.** Name substring search yields fuzzy collisions and skips evidence about layout.

**Preferred MCP moves (HTTP `user-agdec-http`):**

1. **`inspect-memory`** — `segments` / `blocks` to ground image layout; `read` / **`read-bytes`** to verify magic bytes, headers, and structure-sized regions at candidate VAs.
2. **`search-everything`** — narrow **`scopes`** (e.g. **`disassembly`** with an explicit instruction budget, **`strings`**, data-bearing scopes) for instruction patterns and stable literals—not open-ended symbol greps.
3. **`get-references`** — expand from a **verified** address, thunk, or defined data item (incoming/outgoing refs).
4. **`execute-script`** — Ghidra Python/Java API (`findBytes`, iterators over defined data/code units) for masked byte signatures and bulk scans when no single tool exposes the pattern.

Reserve **`search-symbols`** for cases where you already know an **exact** label and need pagination—not exploratory subsystem mapping.

**Bulk / enumeration paths (typical):**

- **MCP resources (stdio server):** e.g. `agentdecompile://list-functions` and `ghidra://analysis-dump` (resource names `Functions` / `Analysis_Dump` in the **user-agdec-mcp** server’s `resources/*.json` when that server is installed in Cursor) — *URI availability depends on how the stdio server is connected in your IDE; nothing under `mcps/` is committed in this repository.*
- **`export` tool (HTTP):** full-program export to `c` / `cpp` / `gzf` / `xml` etc. — store **off-repo**; use for audits or to derive lists.
- **`execute-script` (HTTP):** Ghidra Python with `__result__` return — the reliable **escape hatch** to iterate **all** `Function` in the program, emit stable keys (e.g. address + name), and hash.
- **`manage-symbols` mode `count`:** useful for **totals**; defaults like `filter_default_names` can hide unlabeled `FUN_*` — understand filters before comparing counts.

**Gotcha:** HTTP and stdio **differ** (e.g. `search-everything` shapes). Do not assume the same one-liner works on both without checking descriptors.

### 2b) Access order: HTTP MCP → stdio MCP → CLI (last resort)

Use the same *program* and *project* in analysis for all three; only the **transport** changes.

**Flow:** start with the **HTTP** MCP. If the IDE cannot reach it (server off, config missing, or tool errors), switch to the **stdio** `user-agdec-mcp` server. Only if **both** MCPs are unusable, use the **`uvx` + `agentdecompile-cli`** line against a Ghidra **Server** (headless, CI, or one-off shell).

| Priority | When | What |
|--------|------|------|
| **1** | Default | **`user-agdec-http`** — unified `search-everything`, `execute-script`, `export`, `get-function`, etc. (see that server’s `tools/*.json`). |
| **2** | **1** unavailable | **`user-agdec-mcp`** (stdio) — same *kind* of tooling **plus** resource URIs such as `agentdecompile://list-functions` / `ghidra://analysis-dump` when the stdio server is connected. HTTP and stdio **differ** (e.g. `search-everything` schema); read both servers’ descriptors. |
| **3** | **1** and **2** unavailable | **`agentdecompile-cli`** via **`uvx`** from [bolabaden/agentdecompile](https://github.com/bolabaden/agentdecompile). Install/refresh: `uvx --refresh --from git+https://github.com/bolabaden/agentdecompile agentdecompile-cli …` then pass your Ghidra Server connection flags and the subcommand. |

**CLI (safe for git — use env vars).** The flag names match a typical shared-server setup (`--ghidra-server-host` … `--ghidra-server-repository`); real values go in the environment, not in committed files:

```bash
uvx --refresh --from git+https://github.com/bolabaden/agentdecompile \
  agentdecompile-cli \
  --ghidra-server-host "${AGDEC_GHIDRA_HOST}" \
  --ghidra-server-port "${AGDEC_GHIDRA_PORT}" \
  --ghidra-server-username "${AGDEC_GHIDRA_USER}" \
  --ghidra-server-password "${AGDEC_GHIDRA_PASSWORD}" \
  --ghidra-server-repository "${AGDEC_GHIDRA_REPOSITORY}" \
  <command-or-subcommand>
```

**Private runbook (not in this repo):** your team may keep a *literal* one-liner with the same flags and real host/port/user/password/repository for copy-paste in a password manager or internal doc. If that was ever shared in a chat or ticket, **rotate the password** and treat the host as semi-public. This repository intentionally documents only the **shape** above and env names.

**Example `~/.env` or repo-root `.env` (gitignored — [`.gitignore`](../.gitignore) includes `.env` / `.env.*.local):**

```dotenv
# K1 / Ghidra server — do not commit
AGDEC_GHIDRA_HOST=
AGDEC_GHIDRA_PORT=
AGDEC_GHIDRA_USER=
AGDEC_GHIDRA_PASSWORD=
AGDEC_GHIDRA_REPOSITORY=
```

Then: `set -a && source .env && set +a` (or your OS equivalent) before running the `uvx` command. The exact subcommands mirror MCP capabilities in spirit; see the CLI’s `--help` and upstream [agentdecompile](https://github.com/bolabaden/agentdecompile) docs.

---

## 3) Zero-omission model (scales to ~30k+)

You **do not** commit 30,000 per-function rows. You commit **process + structure**:

1. **Private full manifest (or deterministic export)**  
   Store outside the repo (or encrypted team bucket). Record in **private notes only:** hash, `program_path`, analysis tool version, **inclusion rules** (e.g. include thunks, exclude library glue, `FUN_*` included or not).

2. **Partition into domains**  
   Cluster by segment, import layer, string references, or manual labels — e.g. *NWScript VM*, *GFF/resource*, *combat/AI*, *DirectX path*, *CRT/imports only*, *duplicate/clone*. Domains are the **unit of coverage**, not each leaf function, unless a leaf is a known hot **anchor**.

3. **N/A / out-of-scope register (versioned)**  
   Written rules, e.g.: *not reimplemented in TS (host/Electron only)*, *import thunk only*, *trivial wrapper duplicate*, *Microsoft CRT*, *GPU driver boundary* — each with **who/when** so “missing from TS” is **auditable**, not forgotten.

4. **Map domains → `src/` areas**  
   Reuse the subsystem rows in [`.cursor/k1-client-alignment-matrix.md`](k1-client-alignment-matrix.md) as the high-level **bridge**. For each domain: **% addressed**, or **N/A** citing the register.

5. **Cross-check `SRC-####` work**  
   When closing a file row, the **private** log ties work to at least one **domain** or **anchor** (not: “I searched once” with no domain link).

---

## 4) Relationship to `MCP-B01`…`B17` and `SRC-####`

- **Batched MCP searches** find **evidence** and **hot symbols**; they **do not** by themselves prove **full** binary surface coverage.
- **`SRC-####`** ensures **no TS file** is skipped.
- **This model** ensures **no (in-scope) binary function family** is silently skipped — by **domain + N/A** discipline, not by listing every symbol in git.

---

## 5) Optional future automation (not required to adopt the model)

- Local script: compare new manifest hash to last recorded hash; require CHANGELOG entry if program or analysis version changed.
- Optional CI (self-hosted): **never** required to ship app code; only to guard **manifest drift** if the team stores artifacts internally.

---

**Bottom line:** “All agdec functions accounted for” is a **binary inventory + domain map + N/A** problem. “All `src` TS files on a list” is **necessary** and **insufficient** for that bar.

**Staleness check:** §2 must **not** link to a machine path such as `Users/.../.cursor/.../mcps/.../Functions.json`. The canonical text uses the `agentdecompile://` / `ghidra://` URIs and the **`BINARY-01`–`BINARY-05`** row in [k1-iteration-todos.md](k1-iteration-todos.md) only. If your copy still has the old link or omits the **BINARY** line in §1’s table, re-open the file from git.
