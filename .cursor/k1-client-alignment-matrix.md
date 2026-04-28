# K1 (Windows GOG) reference – `src/` coverage matrix (internal)

This file tracks subsystem coverage against the reference program `/K1/k1_win_gog_swkotor.exe` in the shared project. It is for maintainers only; it does not appear in the public site.

**Iteration lists**
- Thematic: [`.cursor/k1-iteration-todos.md`](k1-iteration-todos.md) (P0→P1→P2, MCP batches, quality gates).
- **Per TypeScript file:** [`.cursor/k1-iteration-todos-exhaustive.md`](k1-iteration-todos-exhaustive.md) — one row per `src` `.ts` / `.tsx` (**1490**; `verify_k1_iteration_exhaustive.py` = full coverage; regen in `.cursor/scripts/`). **TS outside `src/` (e.g. `extensions/`):** [k1-iteration-todos-repo-ts-outside-src.md](k1-iteration-todos-repo-ts-outside-src.md) — **36** `EXT-####` rows, default **[N/A]** to retail EXE.
- **Optional (UI only):** [`.cursor/k1-iteration-todos-optional-assets.md`](k1-iteration-todos-optional-assets.md) — `.scss` + `.html` in `src/` (91; no EXE symbol mandate).
- **Non-TS code in `src/`:** ~**167** `*.py` (mostly `tests/holocron/**`) + `*.pyc` + binary fixtures — **N/A** to K1 `swkotor.exe` per-line; see table in [`.cursor/k1-iteration-todos.md`](k1-iteration-todos.md). **MCP P0 resource anchor:** `CExoResFile` / `CERFFile` (packed resources in original client).
- **Binary function inventory (tens of thousands in Ghidra) vs 1490 TS files:** the exhaustive `SRC-####` list does **not** map one-to-one to every decompiled function. For a no-omission bar *vs the retail EXE*, follow [`.cursor/k1-binary-exe-coverage-model.md`](k1-binary-exe-coverage-model.md) (private manifest + domain map + N/A register) **in addition to** per-file and MCP batch work.

The original plan in [`.cursor/plans/k1_swkotor_re_audit_b357eb25.plan.md`](plans/k1_swkotor_re_audit_b357eb25.plan.md) completed **bootstrap** work; full per-area parity follows the backlogs. **`tests/holocron/**`** is a harness volume — track via Jest/Forge triage, not 600+ binary parity rows.

**Reference binary identity:** In **private** notes only (hash & path to `k1_win_gog_swkotor.exe`); not in `src/`.

| Priority | `src` area | ~files (recursive) | P2 / N / host | K1? | MCP query themes (batched) |
|----------|------------|-------------------|---------------|-----|----------------------------|
| P0 | `resource/` + `utility/binary/` | 58+4 | N | Y | BIF, KEY, RIM, ERF, GFF, 2DA, TPC, TLK, LTR, SSF, chitin, ResRef |
| P0 | `nwscript/` (incl. `compiler/`, `decompiler/`, `events/`) | 49+ | N | Y | NCS, VM, opcodes, `Action*`, `Execute*`, `EngineStructure`, decompiler↔VM |
| P0 | `module/` | 32 | N | Y | `Module*`, door/trigger/placeable/creature/encounter, `Area`, `MiniGame`, faction |
| P0 | `engine/` (root, `pathfinding/`, `rules/`, `minigames/`, `menu/`) | 68 | N | Y | save/load, `SaveGame`, `INIManager`, collision, rules 2DAs, path poly |
| P0 | `actions/` (cross queue semantics with effects) | 41 | N | Y | action queue, `GetCurrentAction`, movement, combat, dialog |
| P0 | `effects/` (stacking with module/combat) | 61 | N | Y | `Effect*`, `ApplyEffect`, damage, state, immunities |
| P1 | `combat/` | 9 | N | Y | `CombatRound`, attack, concealment, feedback, TLK |
| P1 | `events/` | 29 | N | Y | `Event*`, order vs effects/actions |
| P1 | `odyssey/` + `odyssey/controllers/` + `odyssey/export/` | 20+61+5 | P2 for export | Y / N | `MDL`, dangly, `Controller`, `Odyssey`, walk — export = tooling |
| P1 | `loaders/`, `three/odyssey/`, `shaders/`, `worker/` | 9+11+12+3 | N | Y | mesh, WOK, materials, GPU, off-thread tex |
| P1 | `managers/` | 34 | N | Y | inventory, pazaak, video, party, game mode |
| P1 | `audio/`, `video/` | 11+9 | N | Y | channels, BIK, `VideoManager` |
| P1 | `gui/`, `game/kotor/`, `controls/` | 31+68+8 | partial / N | Y (kotor) | `GUI*`, `Menu*`, `InGame*`, keymap, mouse |
| P1 | `interface/` | 113 | N | Y | GFF/TLK/DLG public shapes; align with `resource` |
| P1 | `enums/` (many subfolders) | 170 | N | Y | opcodes, effect types, res types, combat — batched by domain |
| P1 | `game/tsl/` | 81 | N | **TSL** | [N/A K1] for vanilla K1 program — separate policy |
| P1 | `tests/` (non-`holocron`), `types/`, `talents/` | varies | N / P2 | Y | resource tests, shared types, talent hooks |
| P2 | `apps/forge/` | 427+ | Y | partial | GFF/2DA/NWScript where editors mirror K1 I/O |
| P2 | `apps/launcher/`, `apps/debugger/`, `apps/game/`, `apps/common/` | 38+24+17+5 | Y | host/tools | K1 path detection, debugger N/A to rules |
| P2 | `electron/`, `server/` | 6+8 | host | N | IPC, not retail gameplay |
| P2 | `assets/`, `devtools/`, `tests/holocron/` | 71+0+634 | assets / harness | N | low TS; holocron = large regression (Jest config separate) |
| P2 | `types/` (if only P2) | 6 | — | — | shared aliases — usually P1 with `enums` |

**Bootstrap (done):** project lists `/K1` with `k1_win_gog_swkotor.exe`; `program_path` for MCP = that file.

**Status:** matrix expanded; **per-row completion** = items in [`.cursor/k1-iteration-todos.md`](k1-iteration-todos.md), not a single “deep-validate” sample.

**MCP order:** `user-agdec-http` first, `user-agdec-mcp` second, CLI last (see plan).

**Validation pass note:** A prior pass hit decompiler sub-scope issues on one environment; **retry locally** for full decompiler output when a change depends on C-level detail.
