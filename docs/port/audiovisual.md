# Audiovisual contribution ledger

This packet reconciles the audiovisual group of the original worktree at `f8bfc1e2` (including staged changes) against upstream `002dfe03`, using shared base `ea9491d5`. The original checkout is unchanged.

## Exhaustive per-path inventory

The audiovisual group is partitioned, without overlapping ownership, across these ledgers:

- [Audio, music and movie lifecycle](audiovisual-audio.md): every changed `src/audio/` path, `MusicManager`, `VideoManager`, `BackgroundMusicMode`, `BIKObject`, and the Bink worker.
- [Rendering and VFX](audiovisual-rendering.md): every changed controller, emitter, model, shader/pass and rendering export, plus `EffectVisualEffect`, `VideoEffectManager`, and the original empty `GraphicsManager` placeholder. Every controller retained upstream is named individually.
- The table below: the five remaining dialogue, lip-sync and camera paths.

| Original path | Decision | Reconciliation |
| --- | --- | --- |
| `src/engine/FollowerCamera.ts` | Reconciled | Use the creature camera-hook height API from the playable branch rather than hard-coded height. Keep upstream null-safe appearance offset handling, collision/raycast behavior, viewport sizing, zoom and focus behavior. |
| `src/managers/CutsceneManager.ts` | Reconciled and hardened | Recover conversation session IDs, complete camera-state reset, reply initialization/journal updates, duplicate-reply protection, voice/LIP cancellation, safe animated-camera fallback, listener-camera targeting and movement/rotation invalidation. Keep upstream parallel resource loading, bark-specific menu handling and engine-mode restoration. Guard asynchronous completion and script-driven conversation replacement so an old session cannot reopen UI, stop new music or clear a new conversation. Auto-continued computer nodes explicitly enter the choice state before invoking the guarded reply handler. |
| `src/resource/DLGNode.ts` | Reconciled and hardened | Recover plot-XP awards and request-token-based voice/LIP cancellation. Keep upstream text/continue filtering, player-reply recording and missing-speaker tolerance. Plot rewards run independently of text filtering. Handle LIP-load failures within the VO error path; stale completion cannot attach LIP or complete a reused node. |
| `src/resource/DLGObject.ts` | Reconciled and hardened | Route dialogue background music through `MusicManager`. Optional session guards cover camera and stunt-actor loader side effects; canceled loads cannot attach a late camera, change facing/equipment or re-enter cutscene mode. Models built after cancellation are disposed. Existing direct callers retain the no-argument API. |
| `src/resource/LIPObject.ts` | Reconciled | Quiet expected missing-LIP resources while preserving other error reporting and all upstream editor/keyframe and empty-animation fixes. |

## Explicit retained-upstream differences

- Bink decoder, movie object and worker fixes already landed; upstream versions and newer optimizations remain unchanged.
- Current upstream particle architecture is retained. The original full animated/multi-mesh model-per-chunk implementation is **not** restored over upstream's instanced first-mesh chunk backend. This is an explicit remaining visual difference requiring a concrete asset comparison, not a claim of identical rendering or complete recovery of that experimental backend.
- Original `GraphicsManager.ts` was empty; no nonfunctional placeholder is introduced.

## Cross-subsystem wiring

The central/simulation/interface packets own these hooks, not this packet:

1. Export/expose `MusicManager`; initialize after audio-engine creation, reset on game reset, and update its delayed music timer once per frame. `ModuleArea` must call `MusicManager.UpdateAreaMusicState` and retain the branch's area/battle/stinger/menu calls. Competing legacy automatic `AudioEngine` music callbacks are deliberately removed.
2. Construct `LightsaberGlowPass(scene, () => currentCamera)`, insert it into postprocessing and retain its size/disposal lifecycle. The original QoL lightsaber feature remains default-off. `ModuleItem` supplies blade creation/update/disposal using the unchanged effect APIs.
3. Pass real frame delta to `VideoEffectManager.Update(delta)` and reset postprocessing history on area/camera discontinuities.
4. Preserve the original dialogue/bark UI calls to `DLGNode.cancelVoiceOver`/`resetLIP` on skip, replacement and close, and the `ModuleCreature.setLIP` cleanup behavior. Cutscene-managed transitions invoke cancellation internally.
5. Retain `JournalManager.AwardPlotXPByIndex` and creature camera-height APIs from the state/simulation packets.

## Verification

The integrated audiovisual packet was tested in the **exact protected projection `kotor-integrated-port@r23`**:

`node node_modules/jest/bin/jest.js --runInBand --no-cache --coverage=false --roots src/tests/audio src/tests/rendering src/tests/dialogue`

Result: **exit 0; 5 suites and 36 tests passed** (13 audio/music/movie, 12 rendering/VFX/emitters, 11 dialogue/cutscene).

Dialogue tests run actual production source through TypeScript transpilation with isolated engine/resource dependencies; they are lifecycle unit tests, not whole-project semantic typechecking. Audio/rendering tests use synthetic buffers/models and mocked device/GPU calls. No project compiler options, existing tests or snapshots were weakened. A first dialogue test run found a missing fixture type, which was corrected before the successful run.

Discovery is deliberately scoped to these five new suites. Broader discovery has an unrelated existing orphan snapshot at `src/tests/__snapshots__/odysseyModelAscii.test.ts.snap`, recorded by the sub-packets rather than deleted to make tests green. The parent integration must still run full typechecking/builds and reconcile baseline failures.

## Gameplay acceptance still needed

No proprietary assets or user saves are included. These automated checks do not establish audible/visual quality or Endar Spire-to-Taris playability. Check isolated copies of saves for: rapid skip/close and script-started follow-up conversations; bark speech through mode restoration; camera/stunt models finishing after cancellation; dialogue quest/XP updates; missing optional LIP files; area-to-combat-to-stinger music; menu/dialogue same-track reuse; stop/destroy during slow audio loads; Bink playback; optional lightsaber glow/occlusion and last-blade removal; VFX attachment/expiry; animated particle sheets and P2P/ribbon behavior; optional time-dilation effects.
