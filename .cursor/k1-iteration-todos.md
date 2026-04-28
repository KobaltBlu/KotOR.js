# K1 reference client — exhaustive `src/` ↔ `k1_win_gog_swkotor.exe` iteration backlog

**Purpose:** Track **every** subsystem that must be validated against the shared Windows GOG K1 program via workspace MCPs (`user-agdec-http` first, then `user-agdec-mcp`, then CLI), then reflected in TypeScript and tests. **Phrasing in `src/`** stays neutral per `.cursor/plans/k1_swkotor_re_audit_b357eb25.plan.md` (no process jargon, no addresses, no research-tool names in committed code).

**Hard rule:** Do not edit gameplay-parity `src/` (combat, module, nwscript, resource, engine rules, save I/O, etc.) without **first** running discovery against `/K1/k1_win_gog_swkotor.exe` and, when hits land on the code path you are changing, following up with at least one deep inspection (function or structure). Put symbol-level notes in chat or private/PR notes, not in `src/` comments. JSDoc that **states** new client behavior counts as a parity claim and needs the same research pass.

**`SRC-####` row = one physical file — closure:** There are **1490** source files and **1490** rows. Marking a subsystem “done” in the P0 list does not replace checking off each `SRC-####` (or the parent `SUBDIR-####` when closing a whole folder in one shot with the same evidence theme). The **same** set is what `tsconfig` includes, ESLint/Prettier run on, and the exhaustive file list enumerates; see [k1-iteration-axes.md](k1-iteration-axes.md) **Tooling uses the same @src set**.

**Definition of “done” per item:** (1) batched `search-everything` (or equivalent) with query themes logged; (2) at least one `get-function` + `get-references` (or `execute-script`) on a representative **hot** symbol when hits warrant code changes; (3) TS/tests updated if mismatch; (4) `format:check` / `lint` / targeted `npm test` for touched paths. Jest: use path args or `--runTestsByPath` (Context7: `/jestjs/jest` CLI) — on Windows prefer `/` in paths or escaped `\\`.

**K1 vs TSL:** The reference binary is K1 only. `game/tsl/`, TSL-only enums, or K2 code paths get **[N/A K1]** with a one-line reason or a guarded cross-check — not silent parity claims.

**Plan note:** The original plan YAML “completed” items are **bootstrap** (matrix, one deep sample). **This file** is the high-level work breakdown.

**Index of *all* axes (1490 + 200 + 91 + 36 + inventory):** [`.cursor/k1-iteration-axes.md`](k1-iteration-axes.md) — use this to prove nothing under `src/` is outside the contract. **TypeScript outside `src/` (satellite, e.g. VS Code):** [`.cursor/k1-iteration-todos-repo-ts-outside-src.md`](k1-iteration-todos-repo-ts-outside-src.md) (**36** `EXT-####` rows; verify: `python .cursor/scripts/diff_repo_ts_outside_src.py` — not part of retail EXE 1:1 work).

**TypeScript (mandatory, canonical):** one row per `src/**/*.ts` and `src/**/*.tsx` — [`.cursor/k1-iteration-todos-exhaustive.md`](k1-iteration-todos-exhaustive.md) (**1490** as of last regen; **single verify:** `python .cursor/scripts/verify_k1_iteration_exhaustive.py` — must exit 0; or run `diff_exhaustive_src.py` alone; regen: `python .cursor/scripts/regenerate_exhaustive_src_checklist.py`).

**TypeScript (mandatory, directory axis):** one row per folder under `src/` that **directly** contains ≥1 `.ts`/`.tsx` — [`.cursor/k1-iteration-todos-exhaustive-subdirs.md`](k1-iteration-todos-exhaustive-subdirs.md) (**200** as of last regen; verify: `python .cursor/scripts/diff_exhaustive_src_subdirs.py` — must exit 0; regen: `python .cursor/scripts/regenerate_exhaustive_src_subdirs.py`). Use with the **1490** file list so no path is skipped.

**By-directory map (no extra files, same 1490):** [`.cursor/k1-src-directory-coverage.md`](k1-src-directory-coverage.md) — per-folder file counts and **P0/P1** mapping hints. Regenerate the table with `python .cursor/scripts/regenerate_k1_src_directory_coverage.py`. Use with the per-file `SRC-####` list; anything not a gameplay analogue gets **[N/A]** in private notes.

**Non-TypeScript in `src/` (optional, UI/markup only):** [`.cursor/k1-iteration-todos-optional-assets.md`](k1-iteration-todos-optional-assets.md) — **91** `.scss` + `.html` (regen: `python .cursor/scripts/regenerate_optional_non_ts_src.py`). These are **not** required to have direct symbol matches in the retail EXE; treat as layout/theming/Forge surface.

**Nothing in `src/` escapes tracking:** the **only** authoritative per-file parity grid for TypeScript is the **1490** `SRC-####` rows plus the **200** `SUBDIR-####` rows (folder axis). Optional UI assets add **91** `AST-####` rows. Everything below is **inventory-only** (no per-file checkbox yet) so agents do not assume “only TS exists”.

**Non-TypeScript / non-checkbox extensions under `src/` (snapshot counts — re-measure after big adds):**

| Extension / kind | ~files | K1 `k1_win_gog_swkotor.exe` iteration policy |
|--------------------|--------|---------------------------------------------|
| `.ts` / `.tsx` | **1490** | **Mandatory** — exhaustive list + MCP or **[N/A]** per row |
| `.scss` / `.html` | **91** | Optional `AST-####` list; screen/layout parity, not disassembly |
| `.pyc` | ~261 | Bytecache — remove from VCS or gitignore; **N/A** |
| `.py` | ~167 | Mostly `tests/holocron/**`; harness/CLI — **N/A** to retail EXE unless you open a separate Python↔tool checklist |
| `.ttf` / `.woff` / `.woff2` | ~73 | Fonts — asset QA; **N/A** symbol row |
| `.png` / `.jpg` / `.svg` / `.psd` | ~27 | Images — **N/A** |
| `.mdl` / `.mdx` | ~26 | Binary mesh fixtures — validate via TS loaders + tests; **N/A** “line in EXE” |
| `.nss` | ~17 | Source script samples — compiler/VM parity is still via **TS** `nwscript/` rows |
| `.wok` | ~10 | Walkmesh fixtures — **MCP-B08** via TS `pathfinding` / `odyssey` |
| `.md` (under `src/`) | ~10 | Co-located docs — phrasing policy; **N/A** |
| `.xml` | ~8 | Data/fixtures — **N/A** unless a TS parser is added |
| `.tlk` / `.wav` / `.ncs` / `.gui` / `.json` | small | Fixture/sample data — parity through **resource/** + **tests/** TS rows |

**Default map — top-level `src/*` folder → MCP query batch (starting point):** use this so every TS file inherits a **first** search theme before you specialize.

| Top-level folder | Start with MCP batch(es) | Primary P-row |
|------------------|--------------------------|---------------|
| `resource/`, `utility/` | B01–B04, B02–B03 | P0-RES, P0-UBN |
| `nwscript/` | B05 | P0-NWS |
| `actions/`, `effects/` | B06, B09 | P0-AXE |
| `module/` | B07 | P0-MOD |
| `engine/` (pathfinding, rules, save) | B08, B02, B10 | P0-ENG |
| `combat/`, `managers/` (party), `talents/` | B09, B10 | P1-CMB, P1-MGR |
| `odyssey/`, `loaders/`, `three/`, `shaders/`, `worker/` | B11, B12 | P1-ODY |
| `gui/`, `game/kotor/`, `apps/game/` UI | B13 | P1-GUI, P2-APP |
| `audio/`, `video/` | B04, B14 | P1-AV |
| `interface/`, `enums/`, `types/` | B02–B03 + domain tokens | P1-IF, P1-EN, P1-TST |
| `events/` | B09 + event names | P1-EVT |
| `controls/` | B13, input tokens | P1-CTL |
| `apps/` (non-runtime) | B16 + **N/A** where UI-only | P2-APP |
| `electron/`, `server/` | B16 host / **N/A** | P2-HST |
| `tests/` | Fixture batches + same batch as code under test | P1-TST |
| `game/tsl/` | B17 | P1-TSL |

**P0 EXE ↔ resource stack (for MCP):** the original client’s packed-file layer is centered on **`CExoResFile`** and related `CERFFile` / GFF types. When validating `BIFObject`, `ERFObject`, `KEYObject`, and `GFF*`, use **`search-symbols` / `get-function`** on those class names first, then follow callers into `ReadResource` / `LoadHeader` and map behavior to the TS `resource/` + `managers/` types — still with **neutral** `src/` comments (no symbol addresses).

Use the **1490** TS list so **no** `.ts`/`.tsx` file is skipped without **N/A** in private notes (TSL, Electron, holocron-only, pure editor, etc.).

---

## Exhaustive top-level `src/` directories (29 trees)

Every TypeScript file under `src/` belongs to exactly one of these folders. **File-level** work is still the **1490** rows in [`k1-iteration-todos-exhaustive.md`](k1-iteration-todos-exhaustive.md); this block is a **second axis** so no subsystem is forgotten when mapping to `k1_win_gog_swkotor.exe`. Mark a row done only when **all** `.ts`/`.tsx` under that tree are either validated against K1 behavior or explicitly **[N/A]** with reason in private notes.

- [ ] **SRC-DIR-actions** — script `Action*` queue items vs engine action service (**MCP-B06**)
- [ ] **SRC-DIR-apps** — Forge / launcher / game shell / debugger (**P2-APP**; gameplay rules only where they mirror K1)
- [ ] **SRC-DIR-assets** — static paths for UI; **N/A** to EXE rules unless wrong resref breaks parity (**P2-AST**)
- [ ] **SRC-DIR-audio** — ADPCM/WAV load, channels (**MCP-B04**, **P1-AV**)
- [ ] **SRC-DIR-combat** — rounds, attacks, messages (**MCP-B09**, **P1-CMB**)
- [ ] **SRC-DIR-controls** — input mapping (**P1-CTL**)
- [ ] **SRC-DIR-devtools** — empty or stub; **N/A** unless populated (**P2-DEV**)
- [ ] **SRC-DIR-effects** — `Effect*` stacks (**P0-AXE**, **MCP-B09**)
- [ ] **SRC-DIR-electron** — host shell; **N/A** to in-engine bytecode (**P2-HST**)
- [ ] **SRC-DIR-engine** — save, INI, rules, pathfinding, minigames, menu (**P0-ENG**, **MCP-B08**–**B10**)
- [ ] **SRC-DIR-enums** — numeric constants consumed by engine/module; batch by domain (**P1-EN**)
- [ ] **SRC-DIR-events** — event bus ordering (**P1-EVT**)
- [ ] **SRC-DIR-game** — `kotor` vs `tsl`; K1 rows only for `game/kotor` (**P1-TSL** policy)
- [ ] **SRC-DIR-gui** — base controls and chrome (**MCP-B13**, **P1-GUI**)
- [ ] **SRC-DIR-interface** — TS shapes for GFF/TLK/TPC headers; align with `resource/` (**P1-IF**)
- [ ] **SRC-DIR-loaders** — asset pipeline into odyssey (**P1-ODY**)
- [ ] **SRC-DIR-managers** — TLK, party, video, mode (**P1-MGR**)
- [ ] **SRC-DIR-module** — doors, triggers, creatures, areas, encounters (**MCP-B07**, **P0-MOD**)
- [ ] **SRC-DIR-nwscript** — VM, compiler, decompiler, events (**MCP-B05**, **P0-NWS**)
- [ ] **SRC-DIR-odyssey** — MDL runtime, controllers, walkmesh (**MCP-B11**, **P1-ODY**)
- [ ] **SRC-DIR-resource** — BIF/KEY/RIM/ERF/GFF/2DA/TLK/TPC/MDL/… (**MCP-B01**–**B04**, **P0-RES**)
- [ ] **SRC-DIR-server** — IPC; **N/A** to retail EXE except message contracts (**P2-HST**)
- [ ] **SRC-DIR-shaders** — GPU path; visual parity vs K1 (**P1-ODY**)
- [ ] **SRC-DIR-talents** — feats/force/skills hooks (**P1-TL**)
- [ ] **SRC-DIR-tests** — Jest/specs; validate fixtures against formats, not “EXE lines” (**P1-TST**)
- [ ] **SRC-DIR-three** — Three.js scene glue (**MCP-B12**, **P1-ODY**)
- [ ] **SRC-DIR-types** — shared aliases (**P1-TST**)
- [ ] **SRC-DIR-utility** — binary readers/writers, bits (**P0-UBN**)
- [ ] **SRC-DIR-video** — host playback timing (**P1-AV**; BIK decode **N/A** 1:1 native player)
- [ ] **SRC-DIR-worker** — texture offload thread (**P1-ODY**)

---

## P0 — Resource and binary I/O

- [ ] P0-RES-01: `BIF` / `KEY` listing and chitin / override resolution vs engine load order
- [ ] P0-RES-02: `RIM` read/write and RIM-in-module cases
- [ ] P0-RES-03: `ERF` / saved-module containers (versions, headers)
- [ ] P0-RES-04: GFF game-critical struct types in `src/resource` (UT*/ARE/GIT/IFO/UTC/UTD/UTM/UTE…); `GFFObject` + `GFFField` / `GFFStruct` + `DLGObject` (GFF host) and **neutral** JSDoc passes in progress; validate hot structs vs binary still TBD
- [ ] P0-RES-05: 2DA column typing, edge rows, and engine consumption in `src/engine/rules` + `resource` (MCP: 2DA types in **private** notes; neutral JSDoc on `TwoDAObject.ts` started)
- [ ] P0-RES-06: `TLK` / `StrRef` invariants and localized string layout (neutral JSDoc on `TLKObject.ts` started; deep-validate service/load path in MCP still TBD)
- [ ] P0-RES-07: LTR and SSF roundtrips (see `ResourceFormatRoundtrip` / `LTRObject` tests) — `LTRObject` already documented; `SSFObject` JSDoc pass started
- [ ] P0-RES-08: TPC / texture headers and DXT paths (neutral JSDoc on `TPCObject.ts` started; TPC resource type in MCP still TBD in **private** follow-up)
- [ ] P0-UBN-01: `utility/binary` + rest of `utility/` — `BinaryReader` / `Writer` + host helpers; neutral JSDoc pass in progress (tick when every non-test file under `utility/` has parity or **[N/A]** note)

## P0 — NWScript (VM, compiler, decompiler)

- [ ] P0-NWS-01: NCS VM opcode table vs `nwscript` runtime dispatch
- [ ] P0-NWS-02: Compiler opcode emission vs VM (same fixture in/out)
- [ ] P0-NWS-03: `Action*` / `Execute*` and action parameter encoding
- [ ] P0-NWS-04: Stack / `GetScriptParameter` / `StoreState` discipline
- [ ] P0-NWS-05: `EngineStructure` layouts used by script helpers
- [ ] P0-NWS-06: `nwscript/compiler` intrinsics and globals vs `OBJECT_SELF`
- [ ] P0-NWS-07: `nwscript/decompiler` CFG quality vs same-bytecode fixture as VM
- [ ] P0-NWS-08: `nwscript/events` wiring vs `Module` script events

## P0 — Module and world

- [ ] P0-MOD-01: `ModuleDoor` open/close/blocked/locked/use
- [ ] P0-MOD-02: `ModuleTrigger` enter/exit/heartbeat
- [ ] P0-MOD-03: `ModuleCreature` AI hooks / perception
- [ ] P0-MOD-04: Placeable / use / animation resrefs
- [ ] P0-MOD-05: `ModuleEncounter` spawn and difficulty
- [ ] P0-MOD-06: `ModuleArea` + environment (fog/music/ambient as present in code)
- [ ] P0-MOD-07: Faction / hostile / `GetIsEnemy` behavior
- [ ] P0-MOD-08: `ModuleMiniGame` / SWMG (K1 set)
- [ ] P0-MOD-09: `GetNearestObject*` and path to object
- [ ] P0-MOD-10: Dynamic placeable state save/restore if implemented

## P0 — Engine core (incl. `engine/rules`, `engine/pathfinding`, `engine/minigames`, `engine/menu`)

- [ ] P0-ENG-01: `SaveGame` / `GameState` serialization sections
- [ ] P0-ENG-02: `INIManager` and config paths
- [ ] P0-ENG-03: `pathfinding` (`A*`, `BinaryHeap`, `ComputedPath`)
- [ ] P0-ENG-04: `engine/rules` 2DA-driven d20 and feat/skill application order
- [ ] P0-ENG-05: Collision vs doors and walkable surfaces
- [ ] P0-ENG-06: `minigames` engine glue
- [ ] P0-ENG-07: `menu` engine vs `gui` boundary
- [ ] P0-ENG-08: Auto-pause, difficulty, and time-scale if present

## P0 — Cross-cutting: actions and effects (game-semantic)

- [ ] P0-AXE-01: `actions` queue order vs `Action*` families
- [ ] P0-AXE-02: `effects` `ApplyEffect` / `EffectDamage` stacks and `Effect*`
- [ ] P0-AXE-03: Interaction of `actions` + `effects` with `ModuleObject` state

## P1 — Combat, events, and feedback

- [ ] P1-CMB-01: `CombatRound` and initiative/order
- [ ] P1-CMB-02: `Attack` resolution (AB, AC, crit) vs rules
- [ ] P1-CMB-03: `CombatMessageTLK` (or strref mapping) and feedback
- [ ] P1-CMB-04: Concealment / miss / concealment effects
- [ ] P1-EVT-01: `events` bus ordering (`EventApplyEffect`, game events)
- [ ] P1-EVT-02: Attack/defend/surrender and faction-related event hooks

## P1 — Odyssey, loaders, three, shaders, worker

- [ ] P1-ODY-01: `loaders` MDL/texture loading (neutral **Observed game behavior** on all non-test `src/loaders/**/*.ts`; deep MCP vs texture manager still TBD)
- [ ] P1-ODY-02: `odyssey` model host and `OdysseyObject` lifecycle
- [ ] P1-ODY-03: `odyssey/controllers` walk/root/dangly/color/audio controllers
- [ ] P1-ODY-04: `three/odyssey` mesh, light, facing, culling
- [ ] P1-ODY-05: `shaders` / material parity with K1
- [ ] P1-ODY-06: `worker` texture pipeline vs main-thread sampling
- [ ] P1-ODY-07: `odyssey/export` (tooling; N/A to runtime if exporter-only)

## P1 — Audio, video, managers, controls

- [ ] P1-AV-01: `audio` `AudioLoader`, channels, 3D/2D
- [ ] P1-AV-02: `video` BIK/BIK-related playback and `VideoManager` timing
- [ ] P1-MGR-01: `managers` inventory, party, pazaak, video, game mode
- [ ] P1-CTL-01: `controls` keymap, mouse, gamepad if any

## P1 — GUI, game client (K1), interface, enums, talents

- [ ] P1-GUI-01: `gui` base controls
- [ ] P1-GUI-02: `game/kotor` in-game UI flows (K1)
- [ ] P1-IF-01: `interface` GFF/TLK/dialog shape alignment with `resource` (neutral **Observed game behavior** on all `src/interface/**/*.ts`; regen-safe helper: `python .cursor/scripts/annotate_interface_observed_behavior.py`)
- [ ] P1-EN-01: `enums` batched by domain: resource, combat, nwscript, module, effects, odyssey, gui, IPC (neutral **Observed game behavior** on all `src/enums/**/*.ts`; idempotent: `python .cursor/scripts/annotate_enums_observed_behavior.py` - deep value audit vs K1 still TBD)
- [ ] P1-TL-01: `talents` / force hooks (K1 set)

## P1 — Tests (non-holocron) and `types`

- [ ] P1-TST-01: `src/tests/resource` and root `src/tests` helpers
- [ ] P1-TST-02: `types` shared aliases vs `enums`/`interface` (neutral **Observed game behavior** on all `src/types/*`; mostly **[N/A]** host/build except `PartyManagerEvent` + `dxt-js` parity notes)

## P1 — TSL and shared code (policy per row)

- [ ] P1-TSL-01: `game/tsl` — **[N/A K1]** or explicit dual-title tests
- [ ] P1-TSL-02: Shared `enum`/`interface` between K1 and TSL: document behavior or split

## P2 — Apps, electron, server, assets, holocron, devtools

- [ ] P2-APP-01: `apps/forge` GFF/2DA/DLG/UT* / NWScript LSP / roundtrip editors (engine rules only where they mirror K1)
- [ ] P2-APP-02: `apps/launcher` install/profile (K1 path validation)
- [ ] P2-APP-03: `apps/game` game shell
- [ ] P2-APP-04: `apps/debugger` (likely **N/A** to gameplay rules; document)
- [ ] P2-APP-05: `apps/common` shared
- [ ] P2-HST-01: `electron` + `server` IPC (host; **N/A** to in-engine rules unless message IDs affect gameplay bridge)
- [ ] P2-AST-01: `assets/*` path references in UI
- [ ] P2-HC-01: `tests/holocron` — treat as **regression** harness; triage Jest/TSX parse issues separately
- [ ] P2-DEV-01: `devtools` empty — delete or populate (optional)

## MCP search batches (repeat until each batch has reviewed hits)

Track completion of these **query batches** against `k1_win_gog_swkotor.exe` (log internally; not in `src/`):

- [ ] MCP-B01: Containers: BIF, KEY, RIM, ERF, chitin, ResRef, override
- [ ] MCP-B02: GFF / CExo* / module structs
- [ ] MCP-B03: 2DA, TLK, StrRef, LTR, SSF
- [ ] MCP-B04: TPC, DXT, WAV, BIK, LIP
- [ ] MCP-B05: NCS, VM, stack, EngineStructure
- [ ] MCP-B06: Action service / action queue
- [ ] MCP-B07: Object model, Area, door/trigger/placeable
- [ ] MCP-B08: Pathfinding, walkmesh, WOK, surface, door nav
- [ ] MCP-B09: Combat, AC, AB, Effect*, feedback TLK
- [ ] MCP-B10: SaveGame, party, globals, current game
- [ ] MCP-B11: MDL/MDA, controllers, dangly, walk
- [ ] MCP-B12: Three, lights, materials, culling
- [ ] MCP-B13: GUI, Menu, InGame, DLG, cutscenes
- [ ] MCP-B14: Audio engine, music, 3D sound, video sync
- [ ] MCP-B15: Pazaak / SWMG / K1 minigames
- [ ] MCP-B16: Forge/editor save paths, holocron smoke (P2)
- [ ] MCP-B17: TSL-only symbols — skip or [N/A K1] column

## Quality gates (per AGENTS.md; repeat when changing touched areas)

- [ ] QG-00: `npm run k1:exhaustive:all` after editing exhaustive checklist markdown, moving files under `src/`, adding/removing `extensions/**/*.ts|tsx`, or many `.scss`/`.html` under `src/` (must exit 0; see [k1-iteration-axes.md](k1-iteration-axes.md))
- [ ] QG-01: `npm run format:check`
- [ ] QG-02: `npm run lint`
- [ ] QG-03: Targeted `npm test -- <path>` or `--runTestsByPath` (avoid full suite if Forge TSX/Jest known failures)
- [ ] QG-04: `npm run webpack:dev` when bundles change

## Meta

- [ ] META-01: Expand `.cursor/k1-client-alignment-matrix.md` with **per-row** status and dates
- [ ] META-02: Private notes only: reference binary hash/version (not in `src/`)
- [ ] META-03: Legacy disallowed phrasing scan on files you touch (plan policy)
- [ ] META-04: **Closure ledger (private):** every `SRC-####` / `SUBDIR-####` eventually has either (a) logged MCP query themes + hot-symbol follow-up + TS alignment, or (b) explicit **[N/A K1]** / **[N/A host]** / **TSL** / **Forge-only** with one-line rationale — no silent skips
- [ ] META-05: After large `src/` file moves or renames, run `python .cursor/scripts/verify_k1_iteration_exhaustive.py`; if it fails, regen exhaustive MDs before continuing parity work

## Binary (retail EXE) function inventory — O(10⁴) decompiled functions

**Not optional** for a “no omissions vs RE / agdec” bar. **Independent** of the 1490 `SRC-####` file list. Canonical model: [k1-binary-exe-coverage-model.md](k1-binary-exe-coverage-model.md).

- [ ] BINARY-01: **Private** full function manifest (or full-program export) for `k1_win_gog_swkotor.exe` with **count**, **inclusion rules** (e.g. unlabeled `FUN_*`, thunks, import stubs), and **content hash** in private notes only — obtain via `agentdecompile://list-functions`, `ghidra://analysis-dump`, `export`, or `execute-script` (see model doc; HTTP `search-everything` is bounded and is **not** a full inventory)
- [ ] BINARY-02: **Domain partition** of the manifest (game engine, NWScript, resource I/O, combat/module, render/audio, imports/CRT/duplicate, etc.); each domain is a coverage unit, not every leaf function
- [ ] BINARY-03: **N/A / out-of-scope register** (versioned, in private or team-only docs): written rules for host, tooling, import-only, non-game libraries — so skipped binary functions are **auditable**, not forgotten
- [ ] BINARY-04: **Map domains** to [k1-client-alignment-matrix.md](k1-client-alignment-matrix.md) rows and `src/` areas; track triage % or explicit **N/A**
- [ ] BINARY-05: **Cross-check** `SRC-####` / MCP-B closure: private ledgers tie work to a **domain** and/or **anchor** symbol — file-only “done” is insufficient for EXE-wide completeness

**Total checkboxes (full surface):** ~100+ thematic rows **+ 29** `SRC-DIR-*` top-level directory rows in **this** file; **1490** `SRC-####` per-file rows; **200** `SUBDIR-####` folder rows; **91** optional `AST-####` asset rows; **17** MCP-B01–B17 batch rows; **5** BINARY-01–BINARY-05; P0/P1/P2 + **QG-00**–QG-04 (and META) rows above; **36** optional `EXT-####` (repo TypeScript **outside** `src/`). See [k1-iteration-axes.md](k1-iteration-axes.md) for the full index. The **1490** `SRC-####` set is the complete contract for **TypeScript file** coverage; **BINARY-** rows are the contract for **retail EXE function surface** vs decompilation. `EXT-####` is tool/editor tracking with default **[N/A]** to the EXE. Check off as you go; split any row into sub-rows if a subsystem has multiple top call sites (e.g. one per `Module*` class family).
