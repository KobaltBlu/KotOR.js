## Plan: Comprehensive PyKotor/Holocron Test Port

Port the vendor Python test suites into KotOR.js in layers, using Jest as the primary runner for resource, utility, and Forge state/data tests, while adding a browser-capable integration layer only where Forge behavior cannot be represented faithfully in a pure Node test. The goal is functional parity against KotOR.js targets, not a literal Qt-to-Jest translation.

This plan is intended to be execution-grade. It should contain enough detail to derive a concrete TODO list, sequence the work, identify dependencies and blockers, and define what completion looks like.

**Primary objective**
Create a comprehensive KotOR.js-native test program that captures the useful coverage of:
- `vendor/PyKotor/Libraries/PyKotor/tests`
- `vendor/PyKotor/Tools/HolocronToolset/tests`
- the existing TypeScript ports under `src/tests`

and expresses that coverage against real KotOR.js production code in `src/resource`, `src/loaders`, `src/utility`, `src/apps/forge`, and related engine/editor modules.

**End results**
By the end of this work, the repository should have:
1. One canonical migration inventory covering every relevant Python source test file.
2. One canonical test strategy for KotOR.js instead of fragmented Jest and Vitest-style parallel efforts.
3. A large Jest-native TypeScript test suite for resource formats, utility behavior, extraction/install workflows, and Forge state/model logic.
4. A clearly isolated browser-capable test layer only for Forge behavior that genuinely needs DOM or rendering context.
5. A documented backlog of product gaps where tests cannot be ported without implementing missing KotOR.js functionality.
6. Validation commands and acceptance criteria that make progress measurable phase by phase.

**Hard constraints and guiding decisions**
- Keep Jest as the default backbone because the repo already standardizes on it through `ts-jest` and `npm test`.
- Do not maintain a separate long-term test architecture for `src/tests`; merge it into the real repo conventions.
- Do not attempt literal Qt widget or `QApplication` parity. Port observed editor behavior into Forge state, helper, model, and browser interaction tests.
- Preserve behavior coverage, not file-count parity. Some Python suites will collapse into fewer KotOR.js tests if the KotOR.js abstraction is broader.
- Add missing product functionality only where the migration matrix proves a high-value gap; do not invent large new subsystems speculatively.
- Keep the implementation incremental and batch-verifiable. Each phase should be independently shippable.

**Non-goals**
- Reproducing Python-specific internals, pytest plugin mechanics, or Qt implementation details for their own sake.
- Recreating native desktop UI semantics where Forge is browser/Electron-driven and structurally different.
- Claiming full parity for areas that do not yet exist in KotOR.js; those must be tracked as explicit gaps.

**Execution model**
Treat this effort as two parallel but linked deliverables:
1. Test-suite migration: port, normalize, and verify tests against existing KotOR.js functionality.
2. Functionality-gap backlog: identify vendor expectations that require additional production code before equivalent tests can exist.

The work should be executed through a canonical inventory, then split into workstreams that can become TODO items.

**Canonical workstreams**

### Workstream 1: Migration Inventory and Coverage Accounting
Build and maintain a source-to-target inventory that maps every relevant vendor test file to:
- Source path.
- Category.
- Target KotOR.js subsystem.
- Recommended target test location.
- Runner type: Jest Node, Jest DOM, browser-capable secondary framework, or deferred.
- Status: unmapped, planned, in progress, migrated, merged, blocked, deferred, superseded.
- Dependency notes.
- Product gaps, if any.

This inventory is a prerequisite for all other work because it prevents silent omissions and makes scope explicit.

The inventory should group files into at least these categories:
- Resource formats.
- Generic GFF-backed resource behavior.
- Extraction and installation workflows.
- Utility and common helpers.
- Forge editor state/model behavior.
- Forge component and interaction behavior.
- Compiler, decompiler, and patcher workflows.
- Visual or platform-bound tests.

**Inventory completion criterion**
Every relevant source file under the two vendor test roots and `src/tests` must be assigned to exactly one of:
- migrate directly,
- merge into another suite,
- defer due to missing product surface,
- block pending architecture decision,
- explicitly drop as non-transferable Python/Qt-specific behavior.

### Workstream 2: Test Architecture Convergence
Normalize the test architecture around one primary convention.

Required outputs:
1. Decide the default environments:
	 - Jest Node for most resource, utility, loader, and Forge state/model tests.
	 - Jest jsdom or a narrowly scoped browser-capable layer for React and DOM interactions.
2. Remove or migrate Vitest-oriented assumptions from `src/tests`.
3. Ensure the canonical test commands in `package.json` and `jest.config.js` can discover and run the migrated suites predictably.
4. Add a clear folder policy so new tests land near production code or in a stable central test area with an explicit reason.

Architecture decisions that should be captured as TODOs:
- Whether any existing `src/tests` files can be converted in place versus moved.
- Whether jsdom under Jest is sufficient for Forge component tests, or whether a secondary framework is truly needed.
- How to isolate installation-backed tests so they do not destabilize fast local runs.
- How to represent ignored or unsupported suites in the runner configuration without losing traceability.

### Workstream 3: Existing Holocron TypeScript Port Convergence
The existing TypeScript ports are currently an architectural fork. Resolve that first because it reduces future duplicated effort.

Tasks in this workstream:
1. Inventory the current `src/tests` contents by category.
2. Convert their assertions, imports, setup assumptions, and adapters to the repo’s canonical testing conventions.
3. Replace any adapter-only abstractions with real KotOR.js production modules wherever available.
4. Decide which tests stay as dedicated migration references and which should be relocated beside production code.
5. Remove drift between these ports and the current Jest configuration.

Definition of done for this workstream:
- Existing holocron TypeScript tests either run under the canonical runner, are migrated into new homes, or are explicitly deferred with recorded reasons.

### Workstream 4: Resource Format Porting
Port resource-format tests into Jest-native TypeScript suites under the real KotOR.js modules that implement them.

Primary target areas include:
- `src/resource`
- `src/loaders`
- format-specific helpers or serializers

High-confidence targets that already have meaningful coverage surfaces:
- GFF
- KEY
- ERF
- RIM
- BIF
- TPC
- TGA
- TXI
- LIP
- LYT
- SSF
- WAV
- VIS
- 2DA

Likely partial or missing areas that need explicit review:
- NCS
- MDL ASCII write or equivalent parity
- DDS write/validation or format completeness
- WOK
- BWM or other walkmesh-related resources

For each resource category, TODOs should cover:
1. Source test inventory and grouping.
2. Target module validation.
3. Choice of inline builders versus fixture files.
4. Porting read-path assertions.
5. Porting write or round-trip assertions.
6. Porting invalid/corrupt/truncated input coverage.
7. Validation command for the category.
8. Product gap notes if parity cannot be achieved.

**Resource porting rules**
- Prefer inline synthetic fixtures when the original Python test uses minimal binary data.
- Prefer shared golden files only when the fixtures are large, reused heavily, or meaningful as compatibility artifacts.
- Keep tests close to the resource implementation unless a cross-format helper is under test.
- Preserve semantics around edge cases and corruption handling, not Python API shapes.

### Workstream 5: Utility and Common Test Porting
Port the pure logic suites that validate behavior independent of GUI or full game runtime.

Candidate areas include:
- Binary stream and serialization helpers.
- Path handling, case sensitivity, and filesystem normalization.
- Geometry and math helpers.
- Encoding and decode fallback behavior.
- Async loader edge cases.
- Miscellaneous common utilities.

These suites are good early wins because they:
- tend to have minimal dependencies,
- surface regressions clearly,
- and help establish shared test helpers and conventions.

For each utility family, TODOs should include:
- target module audit,
- port strategy,
- missing helper creation,
- edge case coverage,
- platform-specific assumptions,
- validation command.

### Workstream 6: Extraction, Installation, and Loader Workflow Porting
Port the vendor tests that validate installation discovery, archive extraction, capsule traversal, nested archive behavior, and resource lookup precedence.

Primary KotOR.js targets likely include:
- `src/loaders/ResourceLoader.ts`
- `src/GameInitializer.ts`
- installation-related helpers and registries
- capsule and archive helpers under Forge

Important behaviors to preserve:
- override versus module versus global precedence.
- nested archive handling.
- talktable access.
- install structure discovery.
- module and area extraction workflows.

This workstream should produce TODOs for:
1. Installation-backed fixture policy.
2. Optional versus required environment variables.
3. Fast-path synthetic tests versus slower integration tests.
4. Clear skip behavior for unavailable proprietary assets.
5. Regression coverage for precedence and nested-container edge cases.

### Workstream 7: Forge Editor State and Model Behavior Porting
HolocronToolset editor tests should map first to Forge state, helper, and model layers instead of direct widget parity.

Primary targets include:
- `src/apps/forge/helpers/ReferenceFinderCore.ts`
- `src/apps/forge/data/ReferenceSearchConfig.ts`
- `src/apps/forge/utils/DLGTreeModel.ts`
- `src/apps/forge/utils/DLGValidation.ts`
- `src/apps/forge/utils/DLGUndoManager.ts`
- `src/apps/forge/utils/DLGClipboardManager.ts`
- `src/apps/forge/EditorFile.ts`
- `src/apps/forge/Project.ts`
- `src/apps/forge/ProjectFileSystem.ts`
- `src/apps/forge/states/tabs`

Representative editor families to cover:
- DLG.
- GFF-backed editors like UTC, UTI, UTP, UTD, UTS, UTE, UTT, UTW.
- ARE, IFO, GIT, FAC, PTH, JRL, GUI, TLK, 2DA.
- reference finder and search configuration.
- file and project lifecycle behavior.

For each editor family, TODOs should capture:
1. What the vendor test is really asserting: serialization, validation, tree mutation, selection, undo, clipboard, field mapping, or save/load behavior.
2. Whether a state/model test is sufficient.
3. Whether a DOM/component test is needed.
4. What KotOR.js abstractions already exist.
5. What product gaps block parity.

**Editor porting rule**
Always bias toward state/model/helper tests before rendering-layer or component-level tests. Only move upward when lower-level coverage cannot express the behavior under test.

### Workstream 8: Forge Component and Browser Interaction Tests
Some Forge behavior may not be expressible meaningfully in pure Node tests. This workstream should be narrow and deliberate.

Potential targets include:
- React component interaction.
- tree and grid editing behavior.
- selection and command flows.
- editor tab lifecycle that depends on component wiring.

This workstream should only begin after state/model behavior is covered, because many apparent UI tests will collapse into simpler, faster state tests.

Tasks should determine:
- whether Jest with jsdom is sufficient,
- whether React testing utilities need to be added,
- whether a secondary framework is truly necessary,
- and how to isolate slower interaction suites from the bulk of the repository’s fast tests.

### Workstream 9: Missing Product Surface and Deferred Buckets
Some vendor expectations cannot be ported fully until KotOR.js gains missing functionality.

Current likely high-risk or missing areas include:
- script compilation.
- compiled-script decompilation or NCS parity.
- TSLPatcher runtime flows.
- parts of indoor builder or module designer behavior.
- walkmesh and related resource support.
- some visual conformance or platform-native dialog behavior.

For each gap bucket, the plan should produce one of:
- implement now because it is a prerequisite for major coverage,
- stub and defer with a clear blocker note,
- or explicitly mark as non-goal for this migration wave.

This keeps the migration honest instead of silently pretending unsupported functionality is covered.

**Detailed migration phases**

### Phase 0: Planning and Inventory Foundation
Required outcomes:
- Canonical inventory exists.
- Category taxonomy exists.
- Migration status vocabulary exists.
- Target test architecture is decided.
- Phase gates and success metrics are documented.

TODO seeds:
- inventory every source test file,
- tag by category and target subsystem,
- identify unmapped product areas,
- decide default test homes and naming conventions,
- decide environment split: node, jsdom, browser-capable secondary.

### Phase A: Converge Existing TypeScript Holocron Ports
Required outcomes:
- `src/tests` no longer operates as an orphan architecture.
- converted or relocated tests run under the canonical strategy.

TODO seeds:
- audit each file under `src/tests`,
- replace incompatible assertions/imports,
- remove adapter-only indirection where production modules exist,
- fold stable suites into production-adjacent test locations,
- update ignore patterns only with explicit reasons.

### Phase B: Resource Formats and Utility Coverage
Required outcomes:
- major format and utility categories have canonical Jest suites.
- corruption, round-trip, and edge-case behavior are covered.

TODO seeds:
- port GFF family comprehensively,
- port archive/container families,
- port texture and media metadata suites,
- port stream/path/geometry/common suites,
- add shared builders and golden-fixture helpers,
- document unsupported format gaps.

### Phase C: Loader, Installation, and Workflow Coverage
Required outcomes:
- install discovery and archive traversal behavior are covered.
- precedence and nested resource resolution have regression tests.

TODO seeds:
- define installation-backed fixture policy,
- port capsule and nested archive tests,
- port talktable and installation discovery tests,
- add override/module/global precedence coverage,
- separate asset-dependent from synthetic integration tests.

### Phase D: Forge State, Model, and Editor Behavior
Required outcomes:
- core Forge editor logic is covered without depending on literal Qt widget parity.

TODO seeds:
- port reference finder suites,
- port DLG tree, validation, undo, and clipboard semantics,
- port file/project lifecycle tests,
- port GFF-backed editor state behavior,
- port save/load semantics for editor states that have real abstractions.

### Phase E: Forge DOM and Interaction Layer
Required outcomes:
- only the irreducibly UI-dependent behavior is covered here.

TODO seeds:
- decide testing-library stack if needed,
- port interaction-critical editor/component tests,
- isolate slower browser-capable suites,
- add deterministic setup and teardown helpers.

### Phase F: Product Gaps and Deferred Parity
Required outcomes:
- unsupported or incomplete parity areas are converted into a tracked backlog with explicit rationale.

TODO seeds:
- triage script compile/decompile coverage,
- triage patcher runtime parity,
- triage indoor builder and module designer scope,
- triage missing resource types like WOK/BWM equivalents,
- classify each as implement now, defer, or non-goal.

**Category-specific parity matrix**

### Resource formats
High-priority categories to inventory and port first:
- GFF.
- ERF.
- RIM.
- KEY.
- BIF.
- 2DA.
- SSF.
- TLK.
- TPC.
- TGA.
- TXI.
- WAV.
- LIP.
- LYT.
- VIS.

Categories likely needing gap analysis:
- NCS.
- MDL ASCII parity.
- DDS completeness.
- WOK.
- BWM.

### Generic GFF-backed resources and editors
Map vendor generic tests into Forge editor or resource-level behavior for:
- UTC.
- UTI.
- UTP.
- UTD.
- UTS.
- UTE.
- UTT.
- UTW.
- ARE.
- IFO.
- DLG.
- GIT.
- JRL.
- FAC.
- PTH.
- GUI.

### Utility and common categories
Port or map behavior for:
- stream readers/writers,
- case-aware paths,
- geometry and vector math,
- decode fallbacks,
- async loader edge cases,
- common filesystem and normalization helpers.

### Workflow and installation categories
Port or map behavior for:
- capsule extraction,
- nested archives,
- chitin and install discovery,
- talktable loading,
- diff and round-trip workflows,
- module extraction or installation-wide scans.

### Forge editor behavior categories
Port or map behavior for:
- reference search and result shape,
- tree editing,
- undo/redo,
- clipboard operations,
- validation rules,
- field editing semantics,
- file lifecycle,
- save destinations and module integration.

**What each TODO item should contain**
Every TODO generated from this plan should be specific enough to execute without reopening scope discovery.

Required fields for each TODO:
1. Category and phase.
2. Source test file or source group.
3. Target KotOR.js module or subsystem.
4. Intended destination for the new or migrated test.
5. Runner and environment.
6. Dependencies or blockers.
7. Product functionality gaps, if any.
8. Exact validation command.
9. Definition of done.

Suggested TODO template:
- Title.
- Source coverage.
- Target code.
- Planned test location.
- Required helpers or fixtures.
- Migration approach.
- Validation command.
- Done when.

**Recommended TODO granularity**
- One TODO per coherent source family when the target subsystem is the same and the helper strategy is shared.
- Split TODOs when the same source family maps to different product layers, such as resource parsing versus Forge editor behavior.
- Split TODOs when one bucket contains a likely product gap that should not block the rest of the category.

**Relevant files and anchor points**
- `c:\GitHub\KotOR.js\jest.config.js` — primary Jest entrypoint that should become the canonical runner for migrated suites.
- `c:\GitHub\KotOR.js\package.json` — test scripts and any framework additions required for DOM-capable or browser-capable Forge tests.
- `c:\GitHub\KotOR.js\src\tests\holocron\README.md` — current PyKotor/Holocron port intent and existing Vitest-oriented structure to collapse into the main test strategy.
- `c:\GitHub\KotOR.js\src\resource\ResourceFormatRoundtrip.test.ts` — reference pattern for multi-format parity and serialization coverage.
- `c:\GitHub\KotOR.js\src\resource\TwoDAObject.test.ts` — reference for inline binary fixture generation and table-behavior assertions.
- `c:\GitHub\KotOR.js\src\tests\resource\GFFField.test.ts` — reference for field-level mutation and type/bounds assertions.
- `c:\GitHub\KotOR.js\src\tests\helpers\testInstallation.ts` — installation-backed helper pattern for data-dependent suites.
- `c:\GitHub\KotOR.js\src\apps\forge\helpers\ReferenceFinderCore.ts` — strong candidate for direct parity with Holocron/PyKotor reference-search tests.
- `c:\GitHub\KotOR.js\src\apps\forge\data\ReferenceSearchConfig.ts` — already documented as ported from Holocron reference-search config and should anchor related test parity.
- `c:\GitHub\KotOR.js\src\apps\forge\utils\DLGTreeModel.ts` — core dialog-editor state model for data-first editor test ports.
- `c:\GitHub\KotOR.js\src\apps\forge\utils\DLGValidation.ts` — validation behavior target for dialog-editor parity tests.
- `c:\GitHub\KotOR.js\src\apps\forge\utils\DLGUndoManager.ts` — likely target for undo behavior parity.
- `c:\GitHub\KotOR.js\src\apps\forge\utils\DLGClipboardManager.ts` — likely target for clipboard behavior parity.
- `c:\GitHub\KotOR.js\src\apps\forge\EditorFile.ts` — core editor file abstraction for porting file/editor lifecycle tests.
- `c:\GitHub\KotOR.js\src\apps\forge\Project.ts` — project-level behavior target for Forge workspace and file-management test ports.
- `c:\GitHub\KotOR.js\src\apps\forge\ProjectFileSystem.ts` — likely target for filesystem-behavior parity.
- `c:\GitHub\KotOR.js\src\apps\forge\states\tabs` — main target area for editor-state parity when vendor editor tests map to Forge tab state instead of Qt widgets.
- `c:\GitHub\KotOR.js\src\loaders\ResourceLoader.ts` — primary target for extraction, precedence, and installation behavior.
- `c:\GitHub\KotOR.js\src\GameInitializer.ts` — startup and installation-related workflow anchor.
- `c:\GitHub\KotOR.js\vendor\PyKotor\Libraries\PyKotor\tests` — primary source suite for exhaustive library/resource test migration.
- `c:\GitHub\KotOR.js\vendor\PyKotor\Tools\HolocronToolset\tests` — primary source suite for editor and tool behavior migration into Forge-oriented tests.

**Validation strategy**
Validation should happen at four levels.

1. Inventory validation.
	 - Every source suite is accounted for.
	 - Every migrated suite names its target subsystem and environment.

2. Category validation.
	 - Each workstream or resource family has a focused test command.
	 - Failures are attributable to one category, not the entire repo.

3. Integration validation.
	 - Shared helpers and runner changes are validated against the broader repository test suite.

4. Gap validation.
	 - Any deferred or blocked parity area is documented with an explicit blocker and recommended next action.

**Acceptance criteria**
The overall effort is only complete when all of the following are true:
1. Every relevant source test file has an explicit disposition.
2. The canonical runner configuration is settled and the existing TypeScript holocron ports are no longer architecturally separate.
3. Major resource and utility categories have first-class Jest suites with corruption and round-trip coverage where applicable.
4. Installation, extraction, and precedence workflows have regression tests.
5. Forge editor behavior is covered primarily through state, helper, and model tests, with browser-capable tests only where necessary.
6. Missing KotOR.js product surfaces exposed by the migration are tracked explicitly as backlog or completed implementations.
7. The validation commands for each phase are documented and reproducible.

**Verification checkpoints by phase**
- Phase 0 checkpoint: canonical inventory exists and every source test root is accounted for.
- Phase A checkpoint: `src/tests` is converged onto the canonical strategy or fully dispositioned.
- Phase B checkpoint: major resource and utility families run under Jest with focused commands.
- Phase C checkpoint: installation and loader workflows have dedicated regression coverage.
- Phase D checkpoint: Forge editor state/model behavior has meaningful parity coverage.
- Phase E checkpoint: only irreducibly UI-dependent tests remain in the browser-capable layer.
- Phase F checkpoint: missing-surface items are tracked explicitly rather than silently omitted.

**Risks and mitigation**
- Risk: scope balloons because vendor suite count is large.
	Mitigation: require canonical inventory, phase gates, and explicit dispositions.
- Risk: product gaps are mistaken for test-port failures.
	Mitigation: maintain a separate functionality-gap backlog and label blocked suites clearly.
- Risk: browser-level test work starts too early and slows everything down.
	Mitigation: bias toward state/model/helper coverage first.
- Risk: installation-backed suites become flaky or unusable without game assets.
	Mitigation: isolate asset-dependent tests and define clear skip policies.
- Risk: existing holocron TypeScript ports remain a second-class architecture.
	Mitigation: converge them early in Phase A.

**Recommended first TODO batches**
1. Build the canonical migration inventory and status matrix.
2. Audit and converge `src/tests` onto the canonical runner and folder policy.
3. Port the highest-value resource families: GFF, ERF, RIM, KEY, 2DA, and shared binary helpers.
4. Port utility/common suites that establish cross-cutting helpers: stream, path, geometry, decode fallback.
5. Add loader and installation regression coverage for precedence and nested archive behavior.
6. Port Forge reference finder and DLG state/model behavior as the first editor-centric wave.
7. Triage missing-surface buckets: script compile/decompile, patcher flows, walkmesh-related resources, and indoor builder scope.

**Short version for TODO generation**
If this plan is later transformed into a TODO list, the list must:
- start with inventory and test-architecture convergence,
- then cover resource and utility foundations,
- then cover loader and workflow behavior,
- then cover Forge state/model editor behavior,
- then cover only the necessary browser-layer tests,
- and finally convert unresolved parity areas into explicit product-gap tasks.

Nothing should be omitted silently. Every source suite must end up migrated, merged, deferred, blocked, or explicitly dropped with rationale.
