# `src/` TypeScript surface by top-level path (exhaustive coverage)

**Regenerate table body (counts + TOTAL row):** from repo root:

`python .cursor/scripts/regenerate_k1_src_directory_coverage.py`

**Also when `src` layout changes a lot:** `python .cursor/scripts/diff_exhaustive_src.py` and `python .cursor/scripts/regenerate_exhaustive_src_checklist.py` if the per-file list drifts.

The canonical machine lists are [k1-iteration-todos-exhaustive.md](k1-iteration-todos-exhaustive.md) (**1490** files) and [k1-iteration-todos-exhaustive-subdirs.md](k1-iteration-todos-exhaustive-subdirs.md) (**200** folders that directly hold `.ts`/`.tsx`). This table is a **human map** (top-level only) so no subtree is missed when planning MCP batches.

<!-- K1_DIR_TABLE_START -->
| Top-level (under `src/`) | `.ts` / `.tsx` files | Notes for K1 ↔ `k1_win_gog_swkotor.exe` |
|-------------------------|----------------------|----------------------------------------|
| `(src root)` | 5 | `GameInitializer`, `KotOR`, `LoadingScreen`, `GameState`, `index.d.ts` — entry/bootstrap; parts **N/A** to gameplay EXE |
| `actions/` | 41 | Map to `Action*` / action queue; batch with P0-AXE |
| `apps/` | 415 | **Many [N/A EXE]**: debugger, launcher, forge UI — retail binary not authority for UI-only |
| `audio/` | 11 | P1-AV; client audio |
| `combat/` | 9 | P1-CMB; rules + `CombatMessageTLK` |
| `controls/` | 8 | P1-CTL |
| `effects/` | 61 | P0-AXE-02; `Effect*` stacks |
| `electron/` | 6 | **N/A EXE** — host process |
| `engine/` | 68 | P0-ENG; **SaveGame**, `INIManager`, rules, pathfinding |
| `enums/` | 170 | P1-EN-01; batch by domain; many TSL — **[N/A K1]** with reason |
| `events/` | 29 | P1-EVT |
| `game/` | 150 | P1-GUI-02; K1 client UI (`game/kotor/`) |
| `gui/` | 31 | P1-GUI |
| `interface/` | 113 | P1-IF-01; shapes for GFF/TLK |
| `loaders/` | 9 | P1-ODY-01 |
| `managers/` | 34 | P1-MGR |
| `module/` | 32 | P0-MOD |
| `nwscript/` | 49 | P0-NWS |
| `odyssey/` | 86 | P1-ODY; rendering/model host (partial N/A if tooling) |
| `resource/` | 58 | P0-RES-01..08; **BIF, KEY, ERF, RIM, GFF, 2DA, TLK, LTR, TPC** |
| `server/` | 8 | **Often N/A** to retail single-player EXE unless paralleled |
| `shaders/` | 12 | P1-ODY-05; GPU, not 1:1 to gameplay EXE |
| `talents/` | 5 | P1-TL-01; K1 force/talent set |
| `tests/` | 24 | Harness — parity via fixtures, not line-by-line EXE |
| `three/` | 11 | P1-ODY-04 |
| `types/` | 6 | Shared types; N/A to EXE unless re-exports game structs |
| `utility/` | 27 | P0-UBN-01 + format helpers used by `resource/` |
| `video/` | 9 | P1-AV-02 |
| `worker/` | 3 | Texture thread; P1-ODY-06 |

| **TOTAL** | **1490** | Must match [k1-iteration-todos-exhaustive.md](k1-iteration-todos-exhaustive.md) |
<!-- K1_DIR_TABLE_END -->

**Verify:** `python .cursor/scripts/verify_k1_iteration_exhaustive.py` (exit 0; runs both diffs + footer count). Or `python .cursor/scripts/diff_exhaustive_src.py` alone.

**Rule:** "Almost everything" in TS *may* have a conceptual analogue in the client; many rows are explicitly **N/A** (Electron, holocron-only, TSL-only, Forge-only, shaders). See [k1-iteration-todos.md](k1-iteration-todos.md) (K1 vs TSL) and optional assets.

**Per-file index:** [k1-iteration-todos-exhaustive.md](k1-iteration-todos-exhaustive.md) `SRC-0001`…`SRC-1490`. **Per-folder index:** [k1-iteration-todos-exhaustive-subdirs.md](k1-iteration-todos-exhaustive-subdirs.md) `SUBDIR-0001`…`SUBDIR-0200`.
