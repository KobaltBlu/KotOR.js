import * as THREE from "three";
import { OdysseyModel3D, OdysseyObject3D } from "@/three/odyssey";
import { markOdysseySkeletonsDirtyUnder } from "@/three/odyssey/OdysseySkeletonBind";
import type { OdysseyModelAnimation } from "@/odyssey/OdysseyModelAnimation";
import type { OdysseyModelAnimationNode } from "@/odyssey/OdysseyModelAnimationNode";
import { OdysseyController } from "@/odyssey/controllers/OdysseyController";
import { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelAnimationManagerState } from "@/enums/odyssey/OdysseyModelAnimationManagerState";
import { AuroraAnimationFlag } from "@/enums/animation/AuroraAnimationFlag";
import {
  ANIM_RUN_STACK_CAP,
  AnimRun,
  createAnimRun,
  isAdditiveRun,
  isLoopingRun,
  isOverlayRun,
} from "@/odyssey/AnimRun";

/**
 * OdysseyModelAnimationManager — Gob AnimRun stack (-style MVP).
 *
 * Ordered `runs` (oldest = base). Per-run blend weight + Aurora flags.
 * Compatibility: `currentAnimation` / `overlayAnimation` accessors map to
 * primary base and newest overlay runs.
 *
 * @file OdysseyModelAnimationManager.ts
 */
export class OdysseyModelAnimationManager {
  model: OdysseyModel3D;

  /** AnimRun stack — oldest first, newest last. */
  runs: AnimRun[] = [];

  /**
   * @deprecated Compatibility — prefer runs. Synced from primary base run.
   * Direct assignment still supported for cutscene / forge / pose paths.
   */
  lastAnimation: OdysseyModelAnimation;
  lastAnimationState: OdysseyModelAnimationManagerState;
  trans: boolean;
  lastFrame: number;
  modelNode: OdysseyObject3D;

  headModel: OdysseyModel3D;
  headModelNode: OdysseyObject3D;

  /** @deprecated Weight ramp replaces transtime dual-clip path. */
  transElapsed: number = 0;

  animLoopStates: Map<number, OdysseyModelAnimationManagerState> = new Map();

  _vec3: THREE.Vector3 = new THREE.Vector3();
  _quat: THREE.Quaternion = new THREE.Quaternion();
  _animPosition: THREE.Vector3 = new THREE.Vector3();
  _animQuaternion: THREE.Quaternion = new THREE.Quaternion();
  _animPosition2: THREE.Vector3 = new THREE.Vector3();
  _animQuaternion2: THREE.Quaternion = new THREE.Quaternion();

  private _emptyState: OdysseyModelAnimationManagerState;
  private _matrixBatchDepth = 0;
  private _touchedTransformNodes: OdysseyObject3D[] = [];
  private _touchedTransformNodeSet = new Set<OdysseyObject3D>();

  constructor(model: OdysseyModel3D){
    this.model = model;
    this._emptyState = this.createAnimationState();
    this.lastAnimation = undefined;
    this.lastAnimationState = this.createAnimationState();
    this.trans = false;
    this.modelNode = undefined;
  }

  markNodeTransformDirty(node: OdysseyObject3D = this.modelNode): void {
    if(!node) return;
    if(this._matrixBatchDepth === 0){
      node.updateMatrix();
      node.matrixWorldNeedsUpdate = true;
      // Non-batch path still moves bones — boneTexture must refill next render.
      markOdysseySkeletonsDirtyUnder(this.model);
      return;
    }
    if(!this._touchedTransformNodeSet.has(node)){
      this._touchedTransformNodeSet.add(node);
      this._touchedTransformNodes.push(node);
    }
  }

  private beginMatrixBatch(): void {
    this._matrixBatchDepth++;
  }

  private endMatrixBatch(): void {
    this._matrixBatchDepth = Math.max(0, this._matrixBatchDepth - 1);
    if(this._matrixBatchDepth === 0){
      this.flushTouchedNodeMatrices();
    }
  }

  private flushTouchedNodeMatrices(): void {
    for(let i = 0, len = this._touchedTransformNodes.length; i < len; i++){
      const node = this._touchedTransformNodes[i];
      node.updateMatrix();
      node.matrixWorldNeedsUpdate = true;
    }
    this._touchedTransformNodes.length = 0;
    this._touchedTransformNodeSet.clear();
    // Pose batch wrote bone locals — next Skeleton.update must refill boneTexture.
    markOdysseySkeletonsDirtyUnder(this.model);
  }

  createAnimationState(): OdysseyModelAnimationManagerState {
    return {
      loop: false,
      cFrame: 0,
      elapsed: 0,
      elapsedCount: 0,
      lastTime: 0,
      delta: 0,
      lastEvent: -1,
      events: [],
    };
  }

  destroy(){
    this.model = undefined;
    this.runs = [];
  }

  // --- Compatibility accessors (active/newest base / newest overlay) ---

  /**
   * Newest non-overlay run — target of the latest base PlayAnimation.
   * Used by currentAnimation accessors (not oldest; oldest stays for pose blend).
   */
  getActiveBaseRun(): AnimRun | undefined {
    for(let i = this.runs.length - 1; i >= 0; i--){
      if(!isOverlayRun(this.runs[i]) && !this.runs[i].done){
        return this.runs[i];
      }
    }
    return undefined;
  }

  /** @deprecated Use getActiveBaseRun — kept as alias. */
  getPrimaryBaseRun(): AnimRun | undefined {
    return this.getActiveBaseRun();
  }

  getNewestOverlayRun(): AnimRun | undefined {
    for(let i = this.runs.length - 1; i >= 0; i--){
      if(isOverlayRun(this.runs[i]) && !this.runs[i].done){
        return this.runs[i];
      }
    }
    return undefined;
  }

  /**
   * True if a non-overlay run with this clip name is active (not done / not fading out).
   */
  hasActiveBaseNamed(name: string): boolean {
    if(!name) return false;
    const want = name.toLowerCase();
    for(let i = 0; i < this.runs.length; i++){
      const r = this.runs[i];
      if(isOverlayRun(r) || r.done || r.fadingOut) continue;
      if(r.animation?.name?.toLowerCase() === want) return true;
    }
    return false;
  }

  get currentAnimation(): OdysseyModelAnimation {
    return this.getActiveBaseRun()?.animation;
  }

  set currentAnimation(anim: OdysseyModelAnimation){
    if(!anim){
      this.clearBaseRuns(true);
      return;
    }
    const base = this.getActiveBaseRun();
    if(base){
      base.animation = anim;
      return;
    }
    this.playAnimation(anim, AuroraAnimationFlag.LOOPING, { loop: true });
  }

  get currentAnimationState(): OdysseyModelAnimationManagerState {
    return this.getActiveBaseRun()?.state ?? this._emptyState;
  }

  set currentAnimationState(state: OdysseyModelAnimationManagerState){
    const base = this.getActiveBaseRun();
    if(base && state){
      base.state = state;
      if(state.loop){
        base.flags |= AuroraAnimationFlag.LOOPING;
      }
    }
  }

  get overlayAnimation(): OdysseyModelAnimation {
    return this.getNewestOverlayRun()?.animation;
  }

  set overlayAnimation(anim: OdysseyModelAnimation){
    if(!anim){
      this.stopOverlayAnimation(AuroraAnimationFlag.OVERLAY_STOP);
      return;
    }
    this.playOverlayAnimation(anim, AuroraAnimationFlag.OVERLAY_SLOT);
  }

  get overlayAnimationState(): OdysseyModelAnimationManagerState {
    return this.getNewestOverlayRun()?.state ?? this._emptyState;
  }

  set overlayAnimationState(state: OdysseyModelAnimationManagerState){
    const overlay = this.getNewestOverlayRun();
    if(overlay && state){
      overlay.state = state;
    }
  }

  // --- Play / stop ---

  /**
   * Insert an AnimRun (PlayAnimation).
   * @returns the new or reused run
   */
  playAnimation(
    anim: OdysseyModelAnimation,
    flags: number = 0,
    state?: Partial<OdysseyModelAnimationManagerState>
  ): AnimRun | undefined {
    if(!anim || anim.type !== "OdysseyModelAnimation"){
      return undefined;
    }

    // Additive reuse: same name already active with 0x400 → refresh that run
    if(flags & AuroraAnimationFlag.ADDITIVE_GESTURE){
      for(let i = 0; i < this.runs.length; i++){
        const existing = this.runs[i];
        if(
          isAdditiveRun(existing) &&
          existing.animation?.name === anim.name &&
          !existing.done
        ){
          existing.flags |= flags;
          existing.fadingOut = false;
          existing.done = false;
          existing.weight = Math.max(existing.weight, 0.01);
          existing.state.elapsed = state?.elapsed ?? 0;
          existing.state.lastTime = 0;
          existing.state.events = [];
          existing.state.elapsedCount = 0;
          if(typeof state?.speed === "number") existing.state.speed = state.speed;
          if(state?.animation !== undefined) existing.state.animation = state.animation;
          return existing;
        }
      }
    }

    const incomingOverlay =
      !!(flags & AuroraAnimationFlag.OVERLAY_SLOT) ||
      !!(flags & AuroraAnimationFlag.ADDITIVE_GESTURE);

    // Base same-name promote (0x40 spirit): reuse any matching base on
    // the stack — not only newest — so walk↔run chatter does not stack weight-0.
    if(!incomingOverlay){
      const want = anim.name?.toLowerCase();
      let matchIdx = -1;
      for(let i = 0; i < this.runs.length; i++){
        const existing = this.runs[i];
        if(isOverlayRun(existing) || existing.done) continue;
        if(existing.animation?.name?.toLowerCase() === want){
          matchIdx = i;
          break;
        }
      }
      if(matchIdx >= 0){
        const existing = this.runs[matchIdx];
        existing.fadingOut = false;
        existing.done = false;
        if(state?.loop || (flags & AuroraAnimationFlag.LOOPING)){
          existing.state.loop = true;
          existing.flags |= AuroraAnimationFlag.LOOPING;
        }
        if(flags & AuroraAnimationFlag.FIRE_FORGET){
          existing.flags |= AuroraAnimationFlag.FIRE_FORGET;
        }
        if(typeof state?.speed === "number") existing.state.speed = state.speed;
        if(state?.animation !== undefined) existing.state.animation = state.animation;
        // Keep elapsed; snap visible so pose does not freeze on a weight-0 insert
        existing.weight = 1;
        if(matchIdx !== this.runs.length - 1){
          this.runs.splice(matchIdx, 1);
          this.runs.push(existing);
        }
        this.purgeOlderNonOverlay(existing);
        this.syncLegacyLastAnimation();
        return existing;
      }
    }

    const run = createAnimRun(anim, flags, state);
    if(state?.loop || (flags & AuroraAnimationFlag.LOOPING)){
      run.state.loop = true;
      run.flags |= AuroraAnimationFlag.LOOPING;
    }

    // transtime fades between two clips. With no partner base, weight-0
    // lerps from a static skeleton (freeze/slide) — start fully visible.
    if(!incomingOverlay){
      const hasPartnerBase = this.runs.some((r) => !isOverlayRun(r) && !r.done);
      if(!hasPartnerBase){
        run.weight = 1;
      }
    }

    this.ensureStackCapacity(incomingOverlay);
    this.runs.push(run);

    // Immediate base replace when no transition
    if(!incomingOverlay && run.weight >= 1){
      this.purgeOlderNonOverlay(run);
    }

    this.syncLegacyLastAnimation();
    return run;
  }

  /**
   * Overlay insert — does not clear locomotion base.
   */
  playOverlayAnimation(
    anim: OdysseyModelAnimation,
    flags: number = AuroraAnimationFlag.OVERLAY_SLOT,
    state?: Partial<OdysseyModelAnimationManagerState>
  ): AnimRun | undefined {
    let f = flags;
    if(!(f & AuroraAnimationFlag.OVERLAY_SLOT) && !(f & AuroraAnimationFlag.ADDITIVE_GESTURE)){
      f |= AuroraAnimationFlag.OVERLAY_SLOT;
    }
    return this.playAnimation(anim, f, state);
  }

  /**
   * Compatibility shim — base PlayAnimation via setCurrentAnimation.
   */
  setCurrentAnimation(anim: OdysseyModelAnimation, state: OdysseyModelAnimationManagerState){
    if(typeof state === "undefined"){
      console.warn("setCurrentAnimation: state is undefined");
      state = this.createAnimationState();
    }
    if(!anim){
      this.clearBaseRuns(false);
      return;
    }
    let flags = 0;
    if(state.loop) flags |= AuroraAnimationFlag.LOOPING;
    else flags |= AuroraAnimationFlag.FIRE_FORGET;

    // Keep previous base on stack so weight ramp can crossfade
    this.playAnimation(anim, flags, state);
  }

  /** @deprecated Weight ramp replaces lastAnimation dual-clip. */
  setLastAnimation(anim: OdysseyModelAnimation, state: OdysseyModelAnimationManagerState){
    if(typeof state === "undefined"){
      state = this.createAnimationState();
    }
    this.transElapsed = 0;
    this.lastAnimation = anim;
    this.lastAnimationState = Object.assign({}, state);
  }

  setLastFromCurrentAnimation(){
    this.setLastAnimation(this.currentAnimation, this.currentAnimationState);
  }

  /**
   * Compatibility shim — overlay slot.
   */
  setOverlayAnimation(anim: OdysseyModelAnimation, state: OdysseyModelAnimationManagerState){
    if(typeof state === "undefined"){
      console.warn("setOverlayAnimation: state is undefined");
      state = this.createAnimationState();
    }
    if(!anim){
      this.stopOverlayAnimation(AuroraAnimationFlag.OVERLAY_STOP);
      return;
    }
    let flags = AuroraAnimationFlag.OVERLAY_SLOT;
    if(state.loop) flags |= AuroraAnimationFlag.LOOPING;
    else flags |= AuroraAnimationFlag.FIRE_FORGET;
    this.playOverlayAnimation(anim, flags, state);
  }

  /** Clear all non-overlay runs (and optionally everything). */
  stopAnimation(){
    this.runs = this.runs.filter((r) => isOverlayRun(r) && !r.done);
    // Also clear overlays for full stop parity with old stopAnimation
    this.runs = [];
    this.lastAnimation = undefined;
    this.lastAnimationState = this.createAnimationState();
    this.transElapsed = 0;
  }

  /**
   * Filter-remove overlay runs by stop flag (0x80 / 0x400).
   * - 0x400: fade out additive (0x400) runs
   * - 0x80: remove non-additive overlays; fade additives
   * - neither: clear all overlays (legacy single-slot)
   */
  stopOverlayAnimation(stopFlag: number = AuroraAnimationFlag.OVERLAY_STOP){
    const wantAdditive = !!(stopFlag & AuroraAnimationFlag.ADDITIVE_GESTURE);
    const wantOverlayStop = !!(stopFlag & AuroraAnimationFlag.OVERLAY_STOP);

    if(!wantAdditive && !wantOverlayStop){
      for(let i = this.runs.length - 1; i >= 0; i--){
        if(isOverlayRun(this.runs[i])) this.runs.splice(i, 1);
      }
      return;
    }

    for(let i = this.runs.length - 1; i >= 0; i--){
      const run = this.runs[i];
      if(!isOverlayRun(run)) continue;
      const isAdd = isAdditiveRun(run);

      if(wantAdditive && isAdd){
        run.fadingOut = true;
        continue;
      }
      if(wantOverlayStop){
        if(isAdd){
          run.fadingOut = true;
        }else{
          this.runs.splice(i, 1);
        }
      }
    }
  }

  // --- Per-frame ---

  update(delta = 0){
    if(!this.model) return;

    // Advance + weight ramp (newest→oldest for bookkeeping is fine; we iterate all)
    for(let i = this.runs.length - 1; i >= 0; i--){
      this.advanceRun(this.runs[i], delta);
    }

    // Purge done / zero-weight
    for(let i = this.runs.length - 1; i >= 0; i--){
      const run = this.runs[i];
      if(run.done || (run.fadingOut && run.weight <= 1e-4)){
        this.runs.splice(i, 1);
      }
    }

    // When a non-overlay run reaches full weight, drop older bases
    for(let i = 0; i < this.runs.length; i++){
      const run = this.runs[i];
      if(!isOverlayRun(run) && run.weight >= 1 && !run.fadingOut){
        this.purgeOlderNonOverlay(run);
      }
    }

    this.beginMatrixBatch();
    try{
      // Pose: oldest -> newest, blend by weight
      if(this.model.bonesInitialized && this.model.animateFrame){
      for(let i = 0; i < this.runs.length; i++){
        const run = this.runs[i];
        if(!run.animation || run.weight <= 1e-4) continue;
        const rate =
          typeof run.state.speed === "number" ? run.state.speed : 1;
        // state.delta already advanced; apply pose at current elapsed
        this.applyRunPose(run, Math.abs(rate) > 0 ? run.weight : 0);
      }
    }

      // World Model Animation Loops (unchanged path)
      if(this.model.bonesInitialized && this.model.animLoops.length){
      for(let i = 0, len = this.model.animLoops.length; i < len; i++){
        if(!this.animLoopStates.has(i)){
          this.animLoopStates.set(i, {
            loop: true,
            cFrame: 0,
            elapsed: 0,
            elapsedCount: 0,
            lastTime: 0,
            delta: 0,
            lastEvent: -1,
            events: [],
          });
        }
        this.updateAnimation(this.model.animLoops[i], this.animLoopStates.get(i), delta);
      }
      }
    }finally{
      this.endMatrixBatch();
    }

    this.syncLegacyLastAnimation();
  }

  private advanceRun(run: AnimRun, delta: number){
    if(!run.animation){
      run.done = true;
      return;
    }
    const state = run.state;
    const rate = typeof state.speed === "number" ? state.speed : 1;
    const step = delta * rate;
    state.delta = step;
    state.lastTime = state.elapsed;
    state.elapsed += step;

    const len = run.animation.length > 0 ? run.animation.length : 0;

    if(rate >= 0){
      if(len > 0 && state.elapsed >= len){
        this.updateAnimationEvents(run.animation, state);
        if(isLoopingRun(run)){
          state.elapsed = ((state.elapsed % len) + len) % len;
          state.elapsedCount++;
          state.events = [];
        }else{
          state.elapsed = len;
          state.lastTime = len;
          state.elapsedCount++;
          // Fire-forget / non-loop: fade or finish
          if(isAdditiveRun(run) || (run.flags & AuroraAnimationFlag.FIRE_FORGET)){
            run.fadingOut = true;
          }else if(isOverlayRun(run)){
            run.fadingOut = true;
          }else{
            // Non-loop base finished — mark done (caller may replace)
            run.done = true;
          }
        }
      }
    }else{
      // Reverse
      if(state.elapsed < 0){
        if(isLoopingRun(run) && len > 0){
          state.elapsed = ((state.elapsed % len) + len) % len;
          state.elapsedCount++;
          state.events = [];
        }else{
          state.elapsed = 0;
          run.done = true;
        }
      }
    }

    this.updateAnimationEvents(run.animation, state);

    // Weight ramp
    const trans = run.transition > 0 ? run.transition : 0;
    if(run.fadingOut){
      if(trans > 0){
        run.weight = Math.max(0, run.weight - Math.abs(delta) / trans);
      }else{
        run.weight = 0;
      }
      if(run.weight <= 1e-4){
        run.weight = 0;
        run.done = true;
      }
    }else if(run.weight < 1){
      if(trans > 0){
        run.weight = Math.min(1, run.weight + Math.abs(delta) / trans);
      }else{
        run.weight = 1;
      }
    }
  }

  private applyRunPose(run: AnimRun, blendWeight: number){
    const anim = run.animation;
    const state = run.state;
    if(!anim?.nodes) return;
    for(let i = 0, nl = anim.nodes.length; i < nl; i++){
      this.updateAnimationNode(anim, anim.nodes[i], state, blendWeight);
    }
  }

  private purgeOlderNonOverlay(keep: AnimRun){
    const keepIdx = this.runs.indexOf(keep);
    if(keepIdx < 0) return;
    // : when a non-overlay run hits weight 1, remove deeper (older) bases only
    for(let i = keepIdx - 1; i >= 0; i--){
      if(!isOverlayRun(this.runs[i])){
        this.runs.splice(i, 1);
      }
    }
  }

  private clearBaseRuns(_keepOverlay: boolean){
    if(_keepOverlay){
      this.runs = this.runs.filter((r) => isOverlayRun(r));
    }else{
      this.runs = this.runs.filter((r) => isOverlayRun(r));
    }
  }

  private ensureStackCapacity(incomingOverlay: boolean){
    while(this.runs.length >= ANIM_RUN_STACK_CAP){
      // Evict oldest finished, else oldest non-overlay, else oldest
      let idx = this.runs.findIndex((r) => r.done);
      if(idx < 0 && !incomingOverlay){
        idx = this.runs.findIndex((r) => !isOverlayRun(r));
      }
      if(idx < 0) idx = 0;
      this.runs.splice(idx, 1);
    }
  }

  private syncLegacyLastAnimation(){
    // Keep lastAnimation pointing at previous base for any legacy readers
    const bases = this.runs.filter((r) => !isOverlayRun(r) && !r.done);
    if(bases.length >= 2){
      const prev = bases[bases.length - 2];
      this.lastAnimation = prev.animation;
      this.lastAnimationState = prev.state;
      this.transElapsed = prev.transition > 0 ? prev.weight * prev.transition : 0;
      this.trans = true;
    }else{
      this.lastAnimation = undefined;
      this.trans = false;
      this.transElapsed = 0;
    }
  }

  // --- Legacy helpers kept for animLoops / node sampling ---

  updateAnimation(anim: OdysseyModelAnimation, state: OdysseyModelAnimationManagerState, delta: number = 0){
    if(typeof state === "undefined"){
      state = this.createAnimationState();
    }
    state.delta = delta;
    if(!state.elapsedCount) state.elapsedCount = 0;
    this.trans = false;

    if(!this.model.bonesInitialized){
      return false;
    }

    const standaloneMatrixBatch = this._matrixBatchDepth === 0;
    if(standaloneMatrixBatch) this.beginMatrixBatch();
    try{
      if(this.model.animateFrame){
        for(let i = 0, nl = anim.nodes.length; i < nl; i++){
          this.updateAnimationNode(anim, anim.nodes[i], state, 1);
        }
      }
    }finally{
      if(standaloneMatrixBatch) this.endMatrixBatch();
    }

    state.lastTime = state.elapsed;
    state.elapsed += delta;
    if(delta >= 0){
      state.elapsed = Math.min(state.elapsed, anim.length);
    }else if(state.elapsed < 0){
      if(state.loop && anim.length > 0){
        state.elapsed = ((state.elapsed % anim.length) + anim.length) % anim.length;
        state.elapsedCount++;
      }else{
        state.elapsed = 0;
      }
    }

    this.updateAnimationEvents(anim, state);

    if(delta >= 0 && state.elapsed >= anim.length){
      this.updateAnimationEvents(anim, state);
      state.lastTime = anim.length;
      state.elapsed = 0;
      state.elapsedCount++;
      return false;
    }
    return true;
  }

  /** @deprecated Use stack update; kept for any direct overlay callers. */
  updateOverlayAnimation(anim: OdysseyModelAnimation, state: OdysseyModelAnimationManagerState, delta: number = 0){
    return this.updateAnimation(anim, state, delta);
  }

  updateAnimationEvents(anim: OdysseyModelAnimation, state: OdysseyModelAnimationManagerState){
    if(typeof state === "undefined"){
      state = this.createAnimationState();
    }
    if(!anim?.events?.length) return;
    if(!state.events) state.events = [];

    for(let f = 0, el = anim.events.length; f < el; f++){
      if(anim.events[f].length <= state.elapsed && !state.events[f]){
        this.model.playEvent(anim.events[f].name, f);
        state.events[f] = true;
      }
    }
  }

  /**
   * Sample one anim node onto the skeleton.
   * @param blendWeight NewController weight — lerp from current bone pose
   */
  updateAnimationNode(
    anim: OdysseyModelAnimation,
    node: OdysseyModelAnimationNode,
    state: OdysseyModelAnimationManagerState,
    blendWeight: number = 1
  ){
    if(typeof state === "undefined"){
      state = this.createAnimationState();
    }
    if(!node) return;
    // AnimateHierarchy: match Part / anim node by model node.id (nodeNumber).
    // Always clear first so a missing id cannot reuse the previous bone.
    this.modelNode = undefined;
    if(typeof node.nodeNumber === 'number' && node.nodeNumber >= 0){
      this.modelNode = this.model.nodesById?.[node.nodeNumber];
    }
    if(!this.modelNode){
      this.modelNode = this.model.nodes.get(node.name);
    }
    if(!this.modelNode) return;

    anim._position.x = anim._position.y = anim._position.z = 0;
    anim._quaternion.x = anim._quaternion.y = anim._quaternion.z = 0;
    anim._quaternion.w = 1;

    const w = Math.max(0, Math.min(1, blendWeight));
    const canBlend = w < 1 - 1e-6;

    let last: IOdysseyControllerFrameGeneric;
    let next: IOdysseyControllerFrameGeneric;
    let fl = 0;
    let lastFrame = 0;

    for(let c of node.controllers){
      const controller: OdysseyController = c[1];

      if(controller.frameCount == 1 && !canBlend){
        controller.setFrame(this, anim, controller.data[0]);
        continue;
      }

      if(controller.data.length != controller.frameCount){
        console.log("Missing Controller Data", controller);
        continue;
      }

      lastFrame = 0;
      for(let f = 0, fc = controller.frameCount; f < fc; f++){
        if(controller.data[f].time <= state.elapsed){
          lastFrame = f;
          continue;
        }
        break;
      }

      last = controller.data[lastFrame];
      if(!last) continue;

      if(this.model.wasOffscreen){
        controller.setFrame(this, anim, last);
      }

      next = controller.data[lastFrame + 1];
      fl = 0;

      if(next){
        fl = Math.abs((state.elapsed - last.time) / (next.time - last.time)) % 1;
      }else{
        fl = 1;
        next = controller.data[lastFrame];
        last = controller.data[lastFrame - 1] || controller.data[lastFrame];
      }

      if(state.elapsed < last.time) fl = 0;
      if(fl == Infinity) fl = 1.0;
      if(isNaN(fl)) fl = 0;
      if(fl > 1) fl = 1;
      if(fl < 0) fl = 0;

      if(!canBlend){
        if(controller.frameCount == 1){
          controller.setFrame(this, anim, controller.data[0]);
        }else{
          controller.animate(this, anim, last, next, fl);
        }
        continue;
      }

      // NewController: blend sampled clip into current part pose by weight
      if(controller.type == OdysseyModelControllerType.Position){
        this._animPosition.copy(this.modelNode.position);
        if(controller.frameCount == 1){
          controller.setFrame(this, anim, controller.data[0]);
        }else{
          controller.animate(this, anim, last, next, fl);
        }
        this._animPosition2.copy(this.modelNode.position);
        this.modelNode.position.copy(this._animPosition).lerp(this._animPosition2, w);
        this.markNodeTransformDirty(this.modelNode);
      }else if(controller.type == OdysseyModelControllerType.Orientation){
        this._animQuaternion.copy(this.modelNode.quaternion);
        if(controller.frameCount == 1){
          controller.setFrame(this, anim, controller.data[0]);
        }else{
          controller.animate(this, anim, last, next, fl);
        }
        this._animQuaternion2.copy(this.modelNode.quaternion);
        this.modelNode.quaternion.copy(this._animQuaternion).slerp(this._animQuaternion2, w);
        this.markNodeTransformDirty(this.modelNode);
      }else{
        // Non-transform controllers: apply only when weight is significant
        if(w >= 0.5){
          if(controller.frameCount == 1){
            controller.setFrame(this, anim, controller.data[0]);
          }else{
            controller.animate(this, anim, last, next, fl);
          }
        }
      }
    }
  }
}
