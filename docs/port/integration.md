# Central integration port ledger

Source: original `kotor.js` worktree (including its staged changes), based on `ea9491d5`, with committed HEAD `f8bfc1e21f306d36d29c657cae2d3bb96bc6cd89`.

Destination baseline: `002dfe03b9a59ad2adda6404d9632fc78d5bedff`. Source files, Git index and history are not modified by this port.

## Exhaustive integration-path decisions

| Original path | Decision |
| --- | --- |
| `.DS_Store` | Excluded: operating-system metadata, not contribution material. Both capitalization variants are ignored. |
| `.gitignore` | Reconciled: retain upstream exclusions; add original game-data, snapshots, logs and local-tool exclusions. Allow `docs/port/` through the existing generated-docs ignore so the contribution ledger can be committed. |
| `package-lock.json` | Retain upstream unchanged. The old branch did not add a required dependency; transplanting its lockfile would downgrade current dependencies. |
| `src/GameInitializer.ts` | Translate its MusicManager registration into `src/apps/game/GameInitializer.ts`. Do not recreate the removed root initializer. Preserve upstream loading events, resource parallelism, error handling and application architecture. |
| `src/GameState.ts` | Semantically reconciled onto upstream, not replaced by the old monolith. See lifecycle details below. |
| `src/KotOR.ts` | Add GameResourceDumper and GameStateSnapshot exports; retain all current upstream exports and script-inspection APIs. |
| `src/loaders/ResourceLoader.ts` | Add the original invalid/empty cached-reference guard. Retain upstream cache scopes, duck-typed cross-bundle archives, project support and override lookup. |
| `src/managers/index.ts` | Export MusicManager; retain all current manager exports including WindManager and EventManager. |
| `tsconfig.json` | Add `resolveJsonModule` for scripting metadata. Retain current aliases, include/exclude rules, compiler settings and target dependency versions. The file remains TypeScript's JSON-with-comments/trailing-commas format, as upstream supplied it. |

`GraphicsManager.ts` in the original source is empty. There is no GraphicsManager runtime API to register; no fictitious manager is introduced. Its path-level disposition is recorded by the audiovisual owner.

## GameState reconciliation

- Preserve upstream's split update methods, Forge preview host and archive-loading support, resize observers, event notifications, audio priorities, wind manager, room-light updates, screenshot implementation and newer model-loading flow.
- Register/initialize/update/reset MusicManager. GameState.Init provides lazy fallback registration for non-game-app consumers such as Forge, avoiding eager cyclic-import access; the game initializer explicitly registers it as before.
- Normalize INI volume percentages through the ported AudioEngine API, retaining current priority-group assignments.
- Install LightsaberGlowPass before GUI composition. Keep the upstream-disabled generic bloom pass disabled; restore OdysseyShaderPass because dialogue/vision effects and original optional time-dilation visuals require it.
- Restore the cheat-console per-frame hook, `disableHealthRegen`, missing-camera `undefined` result, and runtime fault reporting. Port selectable-object protection into upstream's `UpdateIngame`, not as a second duplicate tick. Keep the fallback renderer in upstream's `Render` method.
- Reconcile the original module-load guard with upstream's `loadingModule`: `isModuleLoading` is an alias for the same lock, not a second divergent flag. Both ordinary and Forge archive loads acquire it before firing synchronous events and release it on failure.
- Preserve upstream's module movie queue, while waiting for its completion callback and asynchronous area-spawn initialization before resolving LoadModule or releasing the lock. VideoManager's start promise is not mistaken for queue completion. Callback errors now propagate instead of leaving the engine permanently locked.
- Route the level-up cue through the GUI emitter's fire-and-forget API.

## Cross-subsystem contracts

The final integrated build requires the following ported APIs from the other ownership areas:

- `MusicManager.Initialize()`, `Update(delta)` and `Reset()`.
- `AudioEngine.percentageToNormalizedGain(value)` and `AudioEmitter.playSoundFireAndForget(resRef)`.
- `LightsaberGlowPass(scene, cameraGetter)` with the standard Three.js postprocessing pass contract.
- `RuntimeFaultManager.run`, `report` and `isSuppressed`.
- `CheatConsoleManager.Update(delta)`.
- The diagnostic classes exported from `GameResourceDumper` and `GameStateSnapshot`.

Time-dilation simulation scaling remains in its original owning subsystems; the central game loop is not globally rescaled a second time. The new Odyssey postprocessing pass makes the audiovisual owner's time-dilation visuals reachable.

## Checks and remaining acceptance

`src/tests/integration/GameStateLifecycle.test.ts` exercises actual GameState loader method source with fake renderer/audio/resource collaborators. It checks lock ownership, synchronous-event failure, shared aliasing, asynchronous movie/spawn completion, callback failure recovery, GUI level-up routing and preservation of Forge archive loading, without requiring proprietary game assets or a WebGL context.

The initial targeted Jest run on patch revision r4 passed all eight lifecycle assertions but returned exit 1 because upstream contains an orphaned `src/tests/__snapshots__/odysseyModelAscii.test.ts.snap` file. That unrelated snapshot is not deleted or rewritten by this port. A targeted run with the integration test directory as Jest's root avoids scanning unrelated snapshots; the complete-suite baseline must still record their status.

These tests do not establish gameplay correctness. The integrated result still needs Endar Spire-to-Taris playthrough checks, module transitions with/without movies, save-load round trips, Forge previews, dialogue camera fallbacks, visual effects and lightsaber appearance/performance checks.
