# Resources, serialization and diagnostics port

Source: original working tree at `f8bfc1e21f306d36d29c657cae2d3bb96bc6cd89`, including its staged work. Shared historical base: `ea9491d5`. Destination upstream: `002dfe03b9a59ad2adda6404d9632fc78d5bedff`.

## Exhaustive source contribution ledger

| Original path | Disposition | Reconciliation |
| --- | --- | --- |
| `src/actions/ActionParameter.ts` | Ported | Persist the required `Type` field; tolerate missing fields in legacy action data; retain script-situation name, bytecode, instruction pointer and stack restoration. |
| `src/events/EventSignalEvent.ts` | Ported | Remove unconditional per-event object/caller logging. Other event behavior remains current upstream. |
| `src/managers/CheatConsoleManager.ts` | Ported and reconciled | Retain expanded help, cheats and explicitly requested local diagnostics. Validate finite numeric settings; cancel pending VFX previews when cleared or when module/player identity changes. |
| `src/resource/BIFObject.ts` | Ported and reconciled | Implement in-memory variable-resource table loading and payload extraction; retain upstream lowercase key fallback, cached disk reads and disposal. Validate memory header/table/payload bounds, support byte-offset `Uint8Array` inputs, coalesce concurrent descriptor opens and handle descriptor zero. |
| `src/resource/ERFObject.ts` | Already upstream; unchanged | Both last-byte boundary fixes already exist upstream. Keep upstream indexing, cached descriptors, `setResource`, payload hydration and in-memory entry support intact. Covered by synthetic regression tests. |
| `src/resource/GFFField.ts` | Ported | `setValue()` now populates vector/orientation storage rather than the unrelated scalar slot. Copy components to avoid input-object aliasing and preserve fallback defaults. |
| `src/resource/RIMObject.ts` | Ported and reconciled | Use the exclusive end offset `offset + size` for in-memory reads and exports; retain upstream resource maps, builder and cached disk access. |
| `src/resource/schema/CommonSchemas.ts` | Empty original placeholder; not added | The original file contains zero bytes and has no importing source files. There is no schema implementation to recover. |
| `src/resource/schema/GFFFieldCodecs.ts` | Empty original placeholder; not added | The original file contains zero bytes and has no importing source files. Existing real field codecs remain in `GFFField`/`GFFObject`; no speculative architecture is introduced. |
| `src/resource/schema/GFFSchema.ts` | Empty original placeholder; not added | The original file contains zero bytes and has no importing source files. No behavior is lost by omitting it. |
| `src/utility/BitWise.ts` | Ported | Object-mask checks reject null, non-object and destroyed objects, preventing delayed work from targeting torn-down objects. |
| `src/utility/GameResourceDumper.ts` | Ported and reconciled | Retain explicitly invoked local resource export, filtering and progress. Reconcile TLK buffer loading and model-animation metadata. Reject unsafe output paths and exports inside the game install. Drain concurrent readers and dispose archive handles on success/failure. |
| `src/utility/GameStateSnapshot.ts` | Ported and reconciled | Retain explicit snapshot capture/export. Strip URL query/fragment information, guard missing browser globals, and respect Electron save-dialog cancellation. |
| `src/utility/RuntimeFaultManager.ts` | Ported and corrected | Retain fault aggregation, log throttling, cooldown and fallback behavior. Ensure the first fault is logged even in the initial throttle interval and contain errors in diagnostic callbacks. |

No game installation, proprietary resource, source snapshot, personal absolute path, or original private Git history is included in this contribution.

## Cross-subsystem contracts

The integrated simulation/rendering port must retain `ModuleItem.qolLightsaberEnabled: boolean`; the console uses it to toggle the optional lightsaber enhancement.

The central game loop port must retain `GameState.clampedDelta: number`; diagnostic snapshots record this timing value alongside other game-loop state.

`RuntimeFaultManager` exports the original `run`, `report`, `reset`, `getState` and suppression behavior for the game-loop/effect callers. `GameStateSnapshot` and `GameResourceDumper` remain explicitly invoked diagnostics, not automatic exports or uploads.

The three empty schema files provide **no API contract** to entity or save code. Do not add imports of them on the assumption that they contain implementations.

## Automated validation

Added `src/tests/port/resources.test.ts` and `src/tests/port/resourcesDiagnostics.test.ts`.

The command below passed **34 tests in 2 suites, exit 0**, in a protected discard-only projection of `kotor-integrated-port@r9`:

`node node_modules/jest/bin/jest.js --runInBand --no-cache --roots src/tests/port --runTestsByPath src/tests/port/resources.test.ts src/tests/port/resourcesDiagnostics.test.ts`

Coverage includes synthetic BIF zero/one/multi-byte payloads, byte-offset views, truncated archives, descriptor sharing/disposal, RIM read/export boundaries, preservation of upstream ERF behavior, binary GFF vector/orientation and primitive action round trips, script-situation metadata/stack delegation, destroyed-object guards, diagnostic fault throttling, unsafe export paths, concurrent reader draining and failure disposal.

The script-situation test mocks the NWScript runtime; it verifies the action serialization boundary and restoration calls, not VM stack semantics. Actual VM serialization is owned by the scripting port.

A diagnostics-only full TypeScript pass at `r5` was not green: the two owned cross-subsystem requirements above were absent from the then-partial combined patch, in addition to other upstream/integration diagnostics. The final integrated build/typecheck remains a parent integration gate; the targeted green tests are not a claim that the full application builds.

The test command scopes Jest's roots because the current upstream tree includes an unrelated orphan `src/tests/__snapshots__/odysseyModelAscii.test.ts.snap`; unrestricted discovery reported it even when the diagnostics assertions passed. No upstream tests or snapshots were removed or weakened.

## Manual follow-up

Verify Electron/browser file-pickers, cancellation, resource export progress, snapshot capture during active gameplay, and VFX console preview cleanup after module transitions. Use disposable output directories and copies of saves.

Snapshots and dumps can contain gameplay state, local paths and proprietary resource content. They are local, explicit exports; inspect them before sharing publicly. No network upload or automatic state export was added.
