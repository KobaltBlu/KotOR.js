# Audio, music and movie lifecycle port

Source: original worktree at `f8bfc1e2`, including staged contributions. Shared ancestor: `ea9491d5`. Target upstream: `002dfe03`.

## Per-path decisions

| Original contribution path | Decision | Reconciliation |
| --- | --- | --- |
| `src/audio/AmbientAudioEmitter.ts` | Ported and hardened | Preserve source identity across asynchronous decoding; stop/dispose cancel in-flight playback; distinguish deliberate stop from natural ending; retain playing-track identity; clamp gain. Guard stale `onended` callbacks and clean up failed decodes. |
| `src/audio/AudioEmitter.ts` | Reconciled | Port request-generation cancellation and normalized gain. Retain upstream priority-group fields and methods. Also guard startup after asynchronous load, fire-and-forget destruction, and cache resurrection after destroy; disconnect active nodes on destruction. |
| `src/audio/AudioEngine.ts` | Reconciled | Port reverb-aware channel routing, focus/mute reconnection, gain conversion, menu emitter, and complete reset. Preserve upstream cached-volume updates while muted and upstream removal of the arbitrary half-volume ambient override. Music state transitions now belong to `MusicManager`, not competing emitter callbacks. Iterate an emitter snapshot during reset because destruction removes entries from the source list. |
| `src/audio/binkaudio_dct.ts` | Already upstream; retained unchanged | Current decoder already includes multi-block PCM/sample-count fixes and newer reusable buffers/FFT optimization. Do not replace it with April code. |
| `src/enums/audio/BackgroundMusicMode.ts` | Ported | Add the explicit `MENU` mode without renumbering existing modes. |
| `src/managers/MusicManager.ts` | Ported and hardened | Recover area/battle/stinger/dialog/menu coordination, delayed looping and same-track reuse. Add transition-generation guards so slower loads cannot restart stopped or superseded music; prevent stale same-channel loads from replacing newer buffers. |
| `src/managers/VideoManager.ts` | Reconciled | Preserve upstream movie planes, queues and presentation; retain local object-identity guard after synchronous `BIKObject.update()` completion or playback replacement. |
| `src/resource/BIKObject.ts` | Already upstream; retained unchanged | Historical normalized three-way candidate is byte-identical to current upstream. Initialization, actual sample-count scheduling and readiness guards are already present. |
| `src/worker/bink-worker.ts` | Already upstream; retained unchanged | Historical normalized three-way candidate is byte-identical to current upstream. Full PCM/sample-count transfer and nonempty-packet first-frame handling are already present. |

No proprietary audio/video fixtures or game data are included.

## Integration contract

The central integration and module port must retain the source branch's following hooks:

- Export `MusicManager` from the manager barrel and expose it as `GameState.MusicManager`.
- After creating the audio engine, call `MusicManager.Initialize()` once. It registers music-end listeners and resets coordinator state.
- When unloading/resetting game state, call `MusicManager.Reset()` along with the audio-engine reset. Reset cancels music loads and playback but keeps initialized event handlers registered on the existing engine.
- Call `MusicManager.Update(delta)` once per game update, in seconds, to advance delayed area-music looping.
- In `ModuleArea`, call `MusicManager.UpdateAreaMusicState(GameState.getCurrentPlayer())` to coordinate combat music.
- Preserve the original contribution's menu, dialogue and scripting calls to the manager's named `setAreaDayTrack`, `setAreaNightTrack`, `setBattleTrack`, `setBattleStinger`, `playAreaMusicTrack`, `playDialogMusicTrack`, `playMenuMusicTrack` and stop/resume methods. Do not restore competing legacy automatic music callbacks in `AudioEngine`.

`AudioEngine.percentageToNormalizedGain` takes percentages (0–100); `emitterVolumeToNormalizedGain` takes game emitter volume (0–127). Channel and ambient gains are normalized 0–1. Upstream priority metadata is retained without inventing a new priority-mixing policy.

## Automated validation

Added `src/tests/audio/audioLifecycle.test.ts`, using synthetic buffers and mocked browser audio/device dependencies. Thirteen checks cover pending-load stop, superseding playback, destroy during decoding, fire-and-forget destruction, ambient cancellation/natural-ending distinction, ambient supersession, complete engine reset, muted/focus gain handling, priority metadata, stopped music loads, cross-mode music transitions, same-track reuse and synchronous movie replacement.

Successful command, against exact protected projection `kotor-integrated-port@r5`:

`./node_modules/.bin/jest --runInBand --no-cache --coverage=false --roots src/tests/audio`

Result: exit 0, 1 suite passed, 13 tests passed. The preceding full-root invocation also passed these 13 tests but exited 1 because upstream contains an unrelated obsolete `odysseyModelAscii.test.ts.snap`; no snapshot was deleted or updated to hide that condition. Full integration build and gameplay checks remain the caller's responsibility after all subsystem patches are combined.

Bink duplicate verification ran the historical merge helper for `BIKObject.ts` and `bink-worker.ts`, then `git diff --no-index` against upstream in a discard projection. Both comparisons were empty (exit 0).

Manual acceptance still required: area music through combat/stinger transitions; same-track dialogue continuation; movie/VO gain and focus behavior; save/load and module transitions during pending audio loads; menu music transitions. Synthetic tests do not establish audible quality or end-to-end game playability.
