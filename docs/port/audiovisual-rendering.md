# Audiovisual port: rendering and VFX

Source: playable `kotor.js` worktree at `f8bfc1e2`, including staged changes. Shared base: `ea9491d5`. Destination baseline: upstream `002dfe03`.

## Reconciliation policy

The current upstream emitter is the implementation base. This port does **not** replace its bounded two-vertex linked ribbons, world-space P2P fixes, wind, inheritance, tinting, bounce/splat, modern sizing, or instanced chunk rendering with the older local emitter. Missing local behavior is integrated surgically: animated derived-state refresh, fractional particle lifetimes, detonation-controller activation, effective randomized birth rate, texture frame ranges and aligned non-square quads.

The old local renderer instantiated a complete animated model per chunk particle. The retained upstream backend instances the first renderable chunk mesh instead. This is an **intentional retained-upstream limitation**, not a claim of identical rendering for animated/multi-mesh chunk assets. The old full-model backend is not transplanted because it replaces the newer emitter architecture and its coordinate/lifetime behavior; this difference requires an asset-driven visual decision. All original source remains untouched for that comparison.

## Per-path ledger

Paths below are relative to `src/`.

| Path | Decision |
|---|---|
| `effects/EffectVisualEffect.ts` | Port metadata/rumble, animation fallback, attachment handling, pending-load accounting, and instant-effect completion. Add explicit removal cancellation for every asynchronously created body/head/impact model, detach before disposal, clear references, and bound instant shield-model lifetime. |
| `managers/VideoEffectManager.ts` | Port optional time-dilation saturation/modulation/motion blur. Default scale 1 produces zero added intensity. Fix analog input magnitude and allow reset before postprocessing initialization. Reset postprocessing history during reset. |
| `managers/GraphicsManager.ts` | Do not add: source is a zero-byte placeholder with no implementation or exports. |
| `shaders/pass/LightsaberGlowPass.ts` | Port selective glow; fix last-saber stale mask, invisible ancestor handling, shared material restoration, particles/sprites leaking into the mask, exception-safe renderer/scene restoration, and no-camera passthrough. |
| `shaders/pass/OdysseyShader.ts` | Port optional temporal/time-dilation shader uniforms and composition; ordinary blur strength remains zero. |
| `shaders/pass/OdysseyShaderPass.ts` | Port size-aware frame history, reset and GPU-resource disposal. |
| `shaders/ShaderOdysseyEmitter.ts` | Retain upstream shader and its tint/dead-space/wind/ribbon/motion modes. Integrate inclusive start/end sprite frames, safe FPS math, loop-disabled clamping, default full-grid fallback, and aligned non-square scaling without applying scale twice. |
| `three/odyssey/OdysseyLightsaberEffect.ts` | Port layered optional blade effect. Extinguished blades hide and reset velocity samples; billboard camera position now uses world coordinates. |
| `three/odyssey/OdysseyModel3D.ts` | Clean semantic merge: preserve all upstream model loading and rendering; stop emitters when disabling them and update removable effects in reverse order. |
| `three/odyssey/OdysseyEmitter3D.ts` | Keep upstream backend; refresh animated velocity/drag/lifetime caches without shader recompilation or birth-timer resets, trigger detonation on positive controller edges, and port local mean random-rate contribution across capacity, ordinary/P2P timers, explosions and trails. Disabling zeros both base and random rate. |
| `three/odyssey/index.ts` | Preserve current exports and add the optional lightsaber effect. |
| `odyssey/controllers/OdysseyControllerFactory.ts` | Keep upstream enum-based emitter registrations, including newer controllers; restore local light-node shadow-radius and vertical-displacement registrations (the registered classes remain existing stubs, not newly implemented behavior). |
| `odyssey/controllers/LifeExpController.ts` | Keep upstream interpolation while restoring local fractional lifetimes instead of rounding to whole seconds; emitter refresh updates derived uniforms. |
| `odyssey/controllers/BirthRateController.ts` | Keep upstream interpolation; updated emitter handles derived-state changes without restarting its countdown every frame. |
| `odyssey/controllers/BlurLengthController.ts` | Keep upstream interpolated blur-length/uniform updates, superseding the old snap-to-next-key/refresh implementation. |
| `odyssey/controllers/BounceCoefficientController.ts` | Keep upstream interpolated `bounceCo` API rather than old `bounceCoefficient` naming. |
| `odyssey/controllers/CombineTimeController.ts` | Keep upstream implemented/interpolated controller. |
| `odyssey/controllers/DetonateController.ts` | Keep upstream interpolated value; activation is now consumed once per positive edge by the emitter rather than retriggering on every positive frame. |
| `odyssey/controllers/DragController.ts` | Keep upstream interpolation; emitter refresh applies updated drag uniforms. |
| `odyssey/controllers/FPSController.ts` | Keep upstream FPS uniform/define updates and interpolation; avoid wholesale per-frame material recompilation from the old refresh helper. |
| `odyssey/controllers/FrameEndController.ts` | Keep upstream interpolated range updates; reconciled shader now honors the value. |
| `odyssey/controllers/FrameStartController.ts` | Keep upstream interpolated range updates; reconciled shader now honors the value. |
| `odyssey/controllers/GravityController.ts` | Keep upstream implemented/interpolated controller and current physics convention. |
| `odyssey/controllers/LightningDelayController.ts` | Keep upstream implemented/interpolated controller. |
| `odyssey/controllers/LightningRadiusController.ts` | Keep upstream implemented/interpolated controller. |
| `odyssey/controllers/LightningScaleController.ts` | Keep upstream implemented/interpolated controller. |
| `odyssey/controllers/LightningSubDivController.ts` | Keep upstream implemented/interpolated controller. |
| `odyssey/controllers/LightningZigZagController.ts` | Keep upstream implemented/interpolated controller. |
| `odyssey/controllers/P2PBezier2Controller.ts` | Keep upstream implemented/interpolated controller paired with modern P2P implementation. |
| `odyssey/controllers/P2PBezier3Controller.ts` | Keep upstream implemented/interpolated controller paired with modern P2P implementation. |
| `odyssey/controllers/ParticleRotationController.ts` | Keep upstream angular-velocity/uniform implementation and interpolation. |
| `odyssey/controllers/PercentEndController.ts` | Keep upstream implemented/interpolated controller. |
| `odyssey/controllers/PercentMidController.ts` | Keep upstream implemented/interpolated controller. |
| `odyssey/controllers/PercentStartController.ts` | Keep upstream implemented/interpolated controller. |
| `odyssey/controllers/RandomBirthRateController.ts` | Keep upstream interpolation; emitter now consumes the local mean-rate behavior rather than leaving the property inert. |
| `odyssey/controllers/RandomVelocityController.ts` | Keep upstream interpolation; emitter refresh updates cached launch velocity. |
| `odyssey/controllers/SizeEndController.ts` | Keep upstream interpolated X/uniform sizing and modern Y fallback. |
| `odyssey/controllers/SizeEndYController.ts` | Keep upstream independent interpolated Y/uniform sizing. |
| `odyssey/controllers/SizeMidController.ts` | Keep upstream interpolated X/uniform sizing and modern Y fallback. |
| `odyssey/controllers/SizeMidYController.ts` | Keep upstream independent interpolated Y/uniform sizing. |
| `odyssey/controllers/SizeStartController.ts` | Keep upstream interpolated X/uniform sizing and modern Y fallback. |
| `odyssey/controllers/SizeStartYController.ts` | Keep upstream independent interpolated Y/uniform sizing. |
| `odyssey/controllers/SpreadController.ts` | Keep upstream interpolation; emitter refresh updates cached launch directions. |
| `odyssey/controllers/ThresholdController.ts` | Keep upstream interpolated threshold and world-space P2P behavior. |
| `odyssey/controllers/VelocityController.ts` | Keep upstream interpolation; emitter refresh updates cached launch velocity. |
| `odyssey/controllers/XSizeController.ts` | Keep upstream interpolated centimeter-to-world-unit conversion. |
| `odyssey/controllers/YSizeController.ts` | Keep upstream interpolated centimeter-to-world-unit conversion. |

## Integration contracts

The central `GameState` owner must wire `LightsaberGlowPass(scene, () => currentCamera)` into the postprocessing stack and size/dispose it with the other passes. Preserve the original QoL default-off toggle; the glow pass can remain disabled when `ModuleItem.qolLightsaberEnabled` is false. `ModuleItem` owns creating, updating and disposing `OdysseyLightsaberEffect` instances; its original `FromSaberMesh`, `setColor`, `setOpacity`, `setPowered`, `update` and `dispose` calls remain supported.

`VideoEffectManager.Update(delta)` expects the real frame delta for camera motion; its cheat-console scale queries are optional and fall back to ordinary world/player scale 1. `OdysseyShaderPass.resetHistory()` should be called across camera/area discontinuities (the video-effect reset does this already). These rendering files do not modify `GameState`, `ModuleItem` or cheat-console ownership.

## Checks and remaining visual validation

Synthetic Jest suites cover last-blade removal, hidden ancestors, shared-material/state restoration after renderer exceptions, absent-camera passthrough, powered blade visibility, asynchronous VFX results arriving after removal, failed-load instant completion, idempotent disposal, velocity/drag derived-state refresh, detonation edges, random-rate stop behavior and fractional lifetime interpolation.

The focused command is `node node_modules/jest/bin/jest.js --runInBand --coverage=false --roots src/tests/rendering --runTestsByPath src/tests/rendering/lightsaberLifecycle.test.ts src/tests/rendering/visualEffectLifecycle.test.ts src/tests/rendering/emitterDerivedState.test.ts` against the exact projected patch revision recorded in the accompanying execution result. Full-suite discovery currently also sees the existing orphan `src/tests/__snapshots__/odysseyModelAscii.test.ts.snap`; this port neither deletes nor rewrites it.

These tests use mocked GPU calls and synthetic models, **not** a WebGL shader compile or visual/gameplay run. Gameplay acceptance still needs blade colors/occlusion, effect attachments/expiry, animated particle frames, moving linked/P2P effects and optional time-dilation visuals checked on real assets in isolated test storage.
