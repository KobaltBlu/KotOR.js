import { ModuleObject } from "@/module/ModuleObject";
import { GFFObject } from "@/resource/GFFObject";
import * as THREE from "three";
import { GameState } from "@/GameState";
import { OdysseyModel3D, OdysseyObject3D } from "@/three/odyssey";
import { Utility } from "@/utility/Utility";
import { OdysseyModel, OdysseyModelAnimationManager } from "@/odyssey";
import { OdysseyModelControllerType } from "@/enums/odyssey/OdysseyModelControllerType";
import type { IOdysseyControllerFrameGeneric } from "@/interface/odyssey/controller/IOdysseyControllerFrameGeneric";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
// import { NWScript } from "@/nwscript/NWScript";
import { IModelListItem } from "@/interface/module/minigame/IModelListItem";
import { MiniGameType } from "@/enums/engine/MiniGameType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { MDLLoader } from "@/loaders";
import type { ModuleRoom } from "@/module/ModuleRoom";
import { ModuleMGGunBank } from "@/module/ModuleMGGunBank";
import type { ModuleMGGunBullet } from "@/module/ModuleMGGunBullet";
import type { ModuleMGEnemy } from "@/module/ModuleMGEnemy";
import type { ModuleMGObstacle } from "@/module/ModuleMGObstacle";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { MGTrackFollowerSounds } from "@/module/minigame/MGTrackFollowerSounds";
import { MGTrackFollowerAudio } from "@/module/minigame/MGTrackFollowerAudio";
import { MiniGameObjectArray } from "@/module/minigame/MiniGameObjectArray";
import { ModuleMiniGame } from "@/module/ModuleMiniGame";
import { ModuleMGTrack } from "@/module/ModuleMGTrack";
import { hitCheckPart } from "@/module/minigame/MGHitCheck";

/** Retail SWMGKeyInfo (0x24) appended by OnReportKey @ 0066dd60. */
export interface SWMGKeyInfo {
  time: number;
  position: THREE.Vector3;
  orientation: THREE.Quaternion;
  hasPosition: boolean;
  hasOrientation: boolean;
}

/**
* ModuleMGPlayer class.
* 
* Class representing the player in minigame modules.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleMGPlayer.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleMGPlayer extends ModuleObject {

  camera: OdysseyModel3D;
  models: OdysseyModel3D[] = [];
  track: OdysseyObject3D;
  animationManagers: OdysseyModelAnimationManager[];
  lastRoom: ModuleRoom;
  gun_hook: THREE.Object3D;

  gunBanks: ModuleMGGunBank[] = [];
  bullets: ModuleMGGunBullet[] = [];

  /** Retail CSWTrackFollower Sounds (Engine / Death) + SWMG sound properties. */
  trackFollowerSounds: MGTrackFollowerSounds = new MGTrackFollowerSounds();
  /** Engine loop + death oneshot (Go / Stop / OnDeath). */
  trackFollowerAudio: MGTrackFollowerAudio = new MGTrackFollowerAudio(this.trackFollowerSounds, true);

  //debug sphere
  sphere_geom: THREE.Mesh;

  modelProps: IModelListItem[] = [];
  no_rotate: THREE.Group;
  speed_min: number;
  speed_max: number;
  accel_secs: number;
  accel_lateral_secs: number;
  lateralForce: number;
  invince: number;
  gear: number;
  gunTimer: number;
  /** @deprecated Use MiniGame.jumpSpeed (TSL retail). Kept for legacy reads. */
  jumpVelcolity: number;
  boostVelocity: number;
  falling: boolean;
  alive: boolean;
  /**
   * Retail tunnel limits from GFF (raw floats).
   * Type 1 (swoop): position offsets. Type 2 (turret): degrees (applied as radians to rotation).
   */
  tunnel: { neg: { x: number; y: number; z: number; }; pos: { x: number; y: number; z: number; }; };
  /** Retail KeepInTunnel: when component != 0, axis is infinite (type 2 wraps 0–360). */
  tunnelInfinite: { x: number; y: number; z: number };
  /** Retail player origin (Start_Offset_*) added to tunnel clamps. */
  origin: { x: number; y: number; z: number };
  /**
   * Retail Target_Offset_X/Y/Z @ Load 006702f0 (fields 0x214–0x21c) —
   * local-space aim point for BehaviorTrack / FireGunCallback targeting.
   */
  targetOffset: THREE.Vector3 = new THREE.Vector3();
  /**
   * Retail CSWMiniPlayer offset — tunnel-local translation (swoop) or aim (turret uses rotation).
   * Applied to container local position for type 1.
   */
  playerOffset: THREE.Vector3;
  hit_points: any;
  max_hps: any;
  onCreateRun: boolean;
  sphere_radius: number;
  invince_period: number;
  bump_damage: any;
  cameraRotate: any;
  num_loops: any;
  /** Last HP delta for SWMG_GetLastHPChange / OnDamage. */
  lastHPChange: number = 0;
  /** Retail AdjustPosition bank level −10..10 for BankL/R_## anims. */
  bankLevel: number = 0;
  /**
   * Retail CSWMiniGame field35_0x8c — continuous signed bank magnitude.
   * Mapped to bankLevel via Control @ 006710e0 thresholds.
   */
  bankMagnitude: number = 0;
  /** Retail field36_0x90 — latch so decay snaps to plateau once per release. */
  bankDecayLatched: boolean = false;
  /**
   * Retail CSWMiniPlayer DoInertia @ 0066cd30 — previous modelhook velocity
   * (fields 0x228–0x230) for bump-plane projection when UseInertia.
   */
  inertiaVelocity: THREE.Vector3 = new THREE.Vector3();
  /**
   * Retail OnReportKey @ 0066dd60 → follower.trigger (Pos keys, flag+0xc≠0)
   * and MiniPlayer field3_0x1ac (Ori keys, flag+0xc==0). SWMGKeyInfo 0x24.
   */
  inertiaKeysTrigger: SWMGKeyInfo[] = [];
  inertiaKeysReport: SWMGKeyInfo[] = [];
  /** Anim time before track.update this frame (for key-crossing emit). */
  private inertiaAnimT0: number = 0;
  private inertiaHookPrev: THREE.Vector3 = new THREE.Vector3();
  private inertiaHookCurr: THREE.Vector3 = new THREE.Vector3();
  private inertiaHookQuat: THREE.Quaternion = new THREE.Quaternion();
  private inertiaScratch: THREE.Vector3 = new THREE.Vector3();
  private inertiaPlane: THREE.Vector3 = new THREE.Vector3();
  private inertiaOut: THREE.Vector3 = new THREE.Vector3();
  private inertiaReady: boolean = false;
  private inertiaSegPrev: THREE.Vector3 = new THREE.Vector3();
  private inertiaSegCurr: THREE.Vector3 = new THREE.Vector3();
  private inertiaSegQuat: THREE.Quaternion = new THREE.Quaternion();
  private inertiaLocalMat: THREE.Matrix4 = new THREE.Matrix4();
  private inertiaWorldMat: THREE.Matrix4 = new THREE.Matrix4();
  private static readonly _mergeOrder: SWMGKeyInfo[] = [];
  private static readonly _aimOffScratch = new THREE.Vector3();
  private static readonly _aimQuatScratch = new THREE.Quaternion();

  cameraName: string = '';
  trackName: string = '';
  /**
   * Retail CSWTrackFollower field9_0x88 bit0 — set by Go, cleared by Stop / ForceSetTrack.
   * DoHitCheck only runs while the player follower is running.
   */
  running: boolean = false;
  /** True when `track` was created for this follower (must dispose with follower). */
  ownsTrack: boolean = false;
  /** Retail SetSpeed / Go — PlayAnimation("track", speed * 0.01). */
  trackAnimRate: number = 0;
  /**
   * Model world position at start of update — DoObstacleHitCheck segment start
   * (retail follower GetPreviousPosition → GetPosition).
   */
  hitModelSegFrom: THREE.Vector3 = new THREE.Vector3();
  private hitModelSegReady: boolean = false;
  private static _tmpHitBump = new THREE.Vector3();
  private static _tmpHitModel = new THREE.Vector3();
  /**
   * Retail OnAnimKeyEvent @ 0066fe50 — bound playEvent listeners on track + models.
   * Detached in disposeFollower.
   */
  private animPlayEventHandler = (e: { event?: string; target?: { name?: string } }) => {
    this.handleAnimPlayEvent(e);
  };
  private animPlayEventTargets: Array<{ target: THREE.Object3D; handler: typeof this.animPlayEventHandler }> = [];

  constructor(template: GFFObject){
    super();
    this.objectType |= ModuleObjectType.ModuleMGPlayer;
    console.log('ModuleMGPlayer', template, this);
    this.template = template;

    this.camera = null;
    this.gunBanks = [];
    this.modelProps = [];
    this.track = new OdysseyObject3D();
    this.model = this.container as any;

    this.bullets = [];

    this.no_rotate = new THREE.Group();

    this.animationManagers = [];

    this.speed = 0;
    this.speed_min = 0;
    this.speed_max = 0;
    this.accel_secs = 0;
    this.accel_lateral_secs = 0;
    this.lateralForce = 0;
    this.invince = 0;

    this.gear = -1;
    //this.timer = 0;
    this.gunTimer = 0;
    this.jumpVelcolity = 0;
    this.boostVelocity = 0;
    this.falling = true;
    this.alive = true;
    this.lastHPChange = 0;

    this.tunnel = {
      neg: {x: 0, y: 0, z: 0},
      pos: {x: 0, y: 0, z: 0}
    };
    this.tunnelInfinite = { x: 0, y: 0, z: 0 };
    this.origin = { x: 0, y: 0, z: 0 };
    this.playerOffset = new THREE.Vector3(0, 0, 0);

    this.setTrack(this.track);

    this._heartbeatTimerOffset = -2900;

    const geometry = new THREE.SphereGeometry( 1, 16, 16 );
    const material = new THREE.MeshBasicMaterial( { color: 0x0000FF } );
    material.transparent = true;
    material.opacity = 0.15;
    this.sphere_geom = new THREE.Mesh( geometry, material );

    // Retail CSWTrackFollower → CSWMiniGameObject @ 0066c540.
    MiniGameObjectArray.register(this);
  }

  canMove(){
    return false;
  }

  getHP(){
    return this.hit_points;
  }

  getMaxHP(){
    return this.max_hps;
  }

  setTrack(model: THREE.Object3D = new OdysseyObject3D(), ownsTrack: boolean = false){
    // Retail ForceSetTrack: destroy previous track Gob if replacing.
    if(this.track && this.track !== model){
      this.unbindAnimPlayEvent(this.track);
      if(this.ownsTrack){
        this.track.parent?.remove(this.track);
        (this.track as OdysseyModel3D).dispose?.();
      }
    }

    this.ownsTrack = ownsTrack;
    this.track = model;
    this.running = false;
    this.rotation.reorder('YZX');

    this.rotate('x', 0);
    this.rotate('y', 0);
    this.rotate('z', 0);

    this.container.removeFromParent();
    this.no_rotate.removeFromParent();

    try{
      const hook = this.track.getObjectByName('modelhook');
      if(hook){
        hook.add(this.container);
      }else{
        this.track.add(this.container);
        console.warn('ModuleMGPlayer.setTrack: no modelhook on', this.trackName);
      }
    }catch(e){
      console.error(e);
    }

    try{
      if(this.track.parent){
        this.track.parent.add(this.no_rotate);
      }else{
        GameState.group?.creatures?.add?.(this.no_rotate);
      }
      this.no_rotate.position.copy(this.track.position);
      this.no_rotate.quaternion.copy(this.track.quaternion);
    }catch(e){
      console.error(e);
    }

    this.playerOffset.set(0, 0, 0);
    this.container.position.set(0, 0, 0);
    this.inertiaReady = false;
    this.clearInertiaKeyBuffers();
    this.onCreateRun = false;
    this._heartbeatTimeout = 0;
    // Retail Go RegisterCallBack(OnAnimKeyEvent) on track Gob.
    this.bindAnimPlayEvent(this.track);
  }

  /** Sync track anim playback rate — retail SetSpeed @ 0066c870. */
  setFollowerSpeed(speed: number){
    this.speed = speed;
    this.trackAnimRate = Math.max(0, speed) * 0.01;
    if(this.running && this.track instanceof OdysseyModel3D){
      this.ensureTrackAnimation();
    }
  }

  /**
   * Ensure "track" anim is playing.
   * Retail Go also RegisterCallBack(OnReportKey) on the track Gob; JS synthesizes
   * those reports from modelhook Position/Orientation key crossings (no Aurora CB).
   */
  ensureTrackAnimation(){
    if(!(this.track instanceof OdysseyModel3D)){ return; }
    const mgr = this.track.animationManager;
    const cur = mgr?.currentAnimation;
    const want =
      this.track.odysseyAnimationMap?.get?.('track') ||
      this.track.odysseyAnimations?.[0];
    if(!want){ return; }
    if(!cur || cur !== want){
      this.track.playAnimation(want, true);
    }
  }

  /**
   * Retail Target_Offset aim point — model world position + local offset rotated
   * by model world orientation (BehaviorTrack / FireGunCallback @ 00673a40).
   */
  getTargetAimPoint(out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    const model =
      this.models?.[0] ||
      (this.container as THREE.Object3D) ||
      undefined;
    if(model && typeof (model as any).getWorldPosition === 'function'){
      (model as THREE.Object3D).getWorldPosition(out);
      if(this.targetOffset.lengthSq() > 0){
        const q = ModuleMGPlayer._aimQuatScratch;
        (model as THREE.Object3D).getWorldQuaternion(q);
        ModuleMGPlayer._aimOffScratch
          .copy(this.targetOffset)
          .applyQuaternion(q);
        out.add(ModuleMGPlayer._aimOffScratch);
      }
      return out;
    }
    out.copy(this.sphere?.center || this.position);
    if(this.targetOffset.lengthSq() > 0){
      out.add(this.targetOffset);
    }
    return out;
  }

  /** Read FLOAT from template; optional legacy alias. */
  private readFloatField(label: string, legacy?: string): number {
    const root = this.template?.RootNode;
    if(!root){ return 0; }
    if(root.hasField(label)){
      return root.getFieldByLabel(label).getValue() || 0;
    }
    if(legacy && root.hasField(legacy)){
      return root.getFieldByLabel(legacy).getValue() || 0;
    }
    return 0;
  }

  update(delta: number = 0){

    this.invince -= delta;
    if(this.invince < 0) this.invince = 0;

    // Capture model world pos before motion — DoObstacleHitCheck segment start.
    this.getHitModelWorld(this.hitModelSegFrom);
    this.hitModelSegReady = true;

    //super.update(delta);
    //Process the heartbeat timer
    if(GameState.module){
      this.triggerHeartbeat();
    }

    this.sphere.radius = this.sphere_radius;
    // this.model.parent.getWorldPosition(this.position);
    this.sphere.center.copy(this.position);

    this.sphere_geom.scale.setScalar(this.sphere_radius);
    this.sphere_geom.position.copy(this.sphere.center);

    for(let i = 0; i < this.animationManagers.length; i++){
      const aManager = this.animationManagers[i];
      if(
        aManager.currentAnimationState.loop || 
        ( !aManager.currentAnimationState.loop && !aManager.currentAnimationState.elapsedCount )
      ){
        aManager.updateAnimation(aManager.currentAnimation, aManager.currentAnimationState, delta);
      }
    }

    for(let i = 0; i < this.container.children.length; i++){
      const model = this.container.children[i];
      if(model instanceof OdysseyModel3D && model.bonesInitialized && model.visible){
        model.update(delta);
      }
    }

    // Retail TrackFollowerPartDie / donedie — purge follower models when die ends.
    if(!this.alive){
      for(let i = this.models.length - 1; i >= 0; i--){
        const model = this.models[i];
        if(!(model instanceof OdysseyModel3D)){
          model?.parent?.remove?.(model);
          (model as any)?.dispose?.();
          this.models.splice(i, 1);
          continue;
        }
        const cur = model.animationManager?.currentAnimation;
        if(!cur || cur.name?.toLowerCase?.() !== 'die'){
          model.parent?.remove(model);
          model.dispose?.();
          this.models.splice(i, 1);
        }
      }
      for(let i = 0; i < this.gunBanks.length; i++){
        this.gunBanks[i]?.update?.(delta);
      }
      if(!this.models.length){
        const mg = GameState.module?.area?.miniGame;
        if(mg?.player === this){
          this.disposeFollower();
          mg.player = undefined as any;
        }
      }
      return;
    }

    //this.animationManagers
    this.forceVector.set(0, 0, 0);

    switch(GameState.module.area.miniGame.type){
      case MiniGameType.SWOOPRACE: {
        const miniGame = GameState.module.area.miniGame;

        // Retail Control accelerates only while follower running bit is set.
        if(this.running && (this.speed_min || this.speed)){
          if(this.speed < this.speed_min){
            this.speed = this.speed_min;
          }

          this.speed += (this.accel_secs * delta);

          if(this.speed_max && (this.speed >= this.speed_max)){
            this.speed = this.speed_max;
          }

          this.setFollowerSpeed(this.speed);
          this.forceVector.set(0, this.speed * delta, 0);
        }

        // Retail MiniGame::Control → velocity delta (field49−field48) into lateral, then copy.
        miniGame.commitPhysicsToPlayer(delta);

        // Lateral into tunnel offset (independent of forward speed).
        this.playerOffset.x += this.lateralForce * delta;
        this.updateBankAnimation(this.lateralForce, delta);
        this.lateralForce = 0;

        // TSL CSWMiniPlayer::Control @ 005446a4 — jumpSpeed * dt on Z, then gravity.
        const jumpBefore = miniGame.jumpSpeed;
        this.playerOffset.z += jumpBefore * delta;
        miniGame.jumpSpeed = jumpBefore - ModuleMiniGame.JUMP_GRAVITY * delta;
        this.jumpVelcolity = miniGame.jumpSpeed;

        const offsetBeforeX = this.playerOffset.x;
        this.keepInTunnel(this.playerOffset);
        // Retail: lateral tunnel clamp clears MiniGame axis/physics velocity.
        if(Math.abs(offsetBeforeX - this.playerOffset.x) > 0.01){
          this.lateralForce = 0;
          miniGame.clearAxisPhysics();
        }

        this.container.position.set(
          this.playerOffset.x,
          this.playerOffset.y,
          this.playerOffset.z
        );

        // Retail Go/SetSpeed: "track" at speed*0.01 — rate 0 freezes (no :1 fallback while running).
        if(this.track instanceof OdysseyModel3D){
          const rate = this.running ? this.trackAnimRate : 0;
          const animState = this.track.animationManager?.currentAnimationState;
          this.inertiaAnimT0 = typeof animState?.lastTime === 'number'
            ? animState.lastTime
            : (typeof animState?.elapsed === 'number' ? Math.max(0, animState.elapsed - delta * rate) : 0);
          this.track.update(delta * rate);
          if(!this.running || !this.track.animationManager?.currentAnimation){
            this.track.position.add(this.forceVector);
          }
          // OnReportKey stand-in: emit SWMGKeyInfo for keys crossed this frame.
          if(miniGame.useInertia && this.running){
            this.emitInertiaKeysFromTrackAnim();
          }
        }else if(this.track){
          this.track.updateMatrixWorld();
          this.track.position.add(this.forceVector);
        }

        // Retail UseInertia: merge OnReportKey buffers → DoInertia (Control @ 0066d640).
        if(miniGame.useInertia && this.running){
          this.applyInertia(delta);
        }

        if(this.boostVelocity > 0){
          this.boostVelocity -= (2 * delta);
        }else{
          this.boostVelocity = 0;
        }
      } break;
      case MiniGameType.TURRET:
        // Aim from UpdateAxis/UpdateMouse → commitPhysicsToPlayer (velocity delta → rotate).
        miniGame.commitPhysicsToPlayer(delta);
        break;
    }
        
    for(let i = 0; i < this.gunBanks.length; i++){
      this.gunBanks[i].update(delta);
    }
    
    // this.model.parent.getWorldPosition(this.position);

    this.sphere.center.copy(this.position);
    this.sphere_geom.position.copy(this.sphere.center);

    this.trackFollowerAudio.updatePosition(this.position.x, this.position.y, this.position.z);

    if(this.camera instanceof OdysseyModel3D && this.camera.bonesInitialized && this.camera.visible){
      this.camera.update(delta);
    }
    else if(!this.camera){
      let camerahook = this.container.getObjectByName('camerahook');
      if(camerahook)
        this.camera = camerahook.parent.parent as OdysseyModel3D;
    }
    
  }

  updatePaused(delta: number = 0){

  }

  damage(damage = 0){
    if(this.alive){
      // Retail path: AdjustHitPoints → OnDamage (script or default apply + anims).
      this.adjustHitPoints(-damage, 0);
    }
  }

  /**
   * Retail CSWTrackFollower::OnDeath @ 0066e2a0.
   * skipScript=true = DefaultImpl path (OnDeath(1)).
   */
  die(skipScript: boolean = false){
    if(!this.alive){ return; }

    if(!skipScript){
      const instance = this.scripts[ModuleObjectScript.MGPlayerOnDeath];
      if(instance){
        instance.run(this, 0);
        return;
      }
    }

    this.alive = false;
    this.stopTrack();
    void this.trackFollowerAudio.playDeathSound();

    for(let i = this.models.length - 1; i >= 0; i--){
      const model = this.models[i];
      if(!(model instanceof OdysseyModel3D) || !model.bonesInitialized){
        model?.parent?.remove(model);
        model?.dispose?.();
        this.models.splice(i, 1);
        continue;
      }
      const dieAnim = model.odysseyAnimationMap?.get?.('die');
      if(!dieAnim){
        model.parent?.remove(model);
        model.dispose?.();
        this.models.splice(i, 1);
        continue;
      }
      model.playAnimation(dieAnim, false);
    }

    // Retail OnDeath → each gun bank Die @ 00674990.
    for(let i = 0; i < this.gunBanks.length; i++){
      this.gunBanks[i]?.die?.();
    }

    // Retail: if models empty → SetPlayer(null).
    if(!this.models.length){
      const mg = GameState.module?.area?.miniGame;
      if(mg?.player === this){
        this.disposeFollower();
        mg.player = undefined as any;
      }
    }
  }

  /** Retail CSWTrackFollower::Go @ 006701c0 — Ready_01, track anim @ speed*0.01, running bit, engine.
   * Also RegisterCallBack(OnReportKey) when UseInertia path active — see emitInertiaKeysFromTrackAnim. */
  go(){
    if(this.running || !this.alive){ return; }

    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      if(model instanceof OdysseyModel3D && model.bonesInitialized){
        model.playAnimation('Ready_01', false);
      }
    }

    this.setFollowerSpeed(this.speed || this.speed_min || 0);
    this.ensureTrackAnimation();
    this.running = true;
    this.clearInertiaKeyBuffers();
    this.trackFollowerAudio.go(this.position.x, this.position.y, this.position.z);
  }

  /** Retail CSWTrackFollower::Stop @ 0066d440 — stop track anim, clear running, stop engine. */
  stopTrack(){
    if(this.track instanceof OdysseyModel3D && this.running){
      this.track.stopAnimation?.();
    }
    this.running = false;
    this.trackFollowerAudio.stop();
  }

  /**
   * Tear down follower for RestartMiniGame / DestroyMiniGameObject / area dispose.
   * Does not destroy shared LYT proto tracks — only owned follower track instances.
   */
  disposeFollower(){
    this.stopTrack();
    this.alive = false;
    this.unbindAnimPlayEvents();
    this.trackFollowerAudio.destroy?.();

    for(let i = 0; i < this.gunBanks.length; i++){
      const bank = this.gunBanks[i];
      while(bank.bullets?.length){
        const b = bank.bullets.pop();
        b?.disposeBullet?.();
      }
      bank.removeGunModel?.();
    }
    this.gunBanks.length = 0;

    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      model?.parent?.remove(model);
      model?.dispose?.();
    }
    this.models.length = 0;

    this.container?.removeFromParent?.();
    this.no_rotate?.removeFromParent?.();
    this.sphere_geom?.parent?.remove(this.sphere_geom);

    if(this.ownsTrack && this.track){
      this.track.parent?.remove(this.track);
      (this.track as OdysseyModel3D).dispose?.();
      this.ownsTrack = false;
    }
    this.track = new OdysseyObject3D();
    MiniGameObjectArray.unregister(this);
  }

  /**
   * Retail AdjustHitPoints @ 0066e8e0 — queue hp_adjust then OnDamage(0).
   * SetFollowerHitPoints → SetHitPoints @ 0066c900 (nAbsolute path; only if nHP > 0).
   * ExecuteCommand Adjust pops one int only — nAbsolute is unused by retail Adjust.
   */
  adjustHitPoints(nHP = 0, nAbsolute = 0){
    if(nAbsolute){
      if(nHP > 0){
        this.hit_points = nHP;
      }
      return;
    }
    this.lastHPChange = nHP;
    this.onDamaged(false);
  }

  /**
   * Retail OnDamage @ 0066e7a0 —
   * param 0: OnDamage script if present (return; script may SWMG_OnDamage).
   * else / param 1: apply lastHPChange, damage anims, death if HP ≤ 0.
   */
  applyQueuedHitPoints(){
    const adjust = this.lastHPChange;
    let hp = this.hit_points + adjust;
    this.hit_points = hp;
    if(adjust < 0){
      if(hp > 0){
        this.playAnimation('damage', 0, 0, 0);
        this.playAnimation('Ready_01', 0, 0, 1);
      }else if(this.alive){
        this.die(false);
      }
    }else{
      if(this.max_hps > 0 && hp > this.max_hps){
        this.hit_points = this.max_hps;
      }
    }
  }

  startInvulnerability(){
    this.invince = this.invince_period || 0;
  }

  shoot(){
    switch(GameState.module.area.miniGame.type){
      case MiniGameType.SWOOPRACE:
        this.jump();
      break;
      case MiniGameType.TURRET:
        this.fire();
      break;
    }
  }

  /**
   * Swoop jump: prefer OnFire scripts (SWMG_SetJumpSpeed), else TSL player hop.
   * Retail gravity @ JUMP_GRAVITY acts on MiniGame.jumpSpeed each frame.
   */
  jump(){
    const miniGame = GameState.module?.area?.miniGame;
    if(!miniGame || miniGame.type !== MiniGameType.SWOOPRACE){ return; }

    const before = miniGame.jumpSpeed;
    this.onFire();
    if(miniGame.jumpSpeed === before && miniGame.jumpSpeed <= 0){
      miniGame.setJumpSpeed(ModuleMiniGame.PLAYER_JUMP_SPEED);
    }
  }

  /**
   * Retail CSWMiniGame::Control @ 006710e0 bank curve + AdjustPosition @ 0066ce60 —
   * accumulate/decay continuous `bankMagnitude`, map ABS to level −10..10, play
   * Ready_01 / BankL_## / BankR_## when the discrete level changes.
   *
   * @param lateralInput retail field44_0xb0 — signed rate (keys: ±LateralAccel; stick: axis).
   */
  updateBankAnimation(lateralInput: number, delta: number = 0){
    if(delta < 0){ delta = 0; }

    const BANK_SNAP = 0.255;
    const signOf = (v: number) => (v < 0 ? -1 : 1);

    if(lateralInput !== 0){
      const step = delta * lateralInput;
      this.bankDecayLatched = false;
      const mag = Math.abs(this.bankMagnitude);
      const sameSign =
        (lateralInput < 0 && this.bankMagnitude < 0) ||
        (lateralInput > 0 && this.bankMagnitude > 0);
      // Same-sign accumulate only while |mag| < 0.25; at/above plateau, hold.
      if(sameSign){
        if(mag < 0.25){
          let next = this.bankMagnitude + step;
          if(next >= 0.25){ next = BANK_SNAP; }
          else if(next <= -0.25){ next = -BANK_SNAP; }
          this.bankMagnitude = next;
        }
      }else{
        this.bankMagnitude = step;
      }
    }else if(this.bankMagnitude !== 0){
      const sgn = signOf(this.bankMagnitude);
      let mag = Math.abs(this.bankMagnitude);
      // First decay frame: snap into retail plateaus when inside those bands.
      if(!this.bankDecayLatched){
        if(mag >= 0.23 && mag < 0.235){
          mag = 0.235;
        }else if(mag >= 0.17 && mag < 0.175){
          mag = 0.175;
        }else if(mag >= 0.1 && mag < 0.105){
          mag = 0.105;
        }else if(mag >= 0.042 && mag < 0.047){
          mag = 0.042;
        }
        this.bankMagnitude = sgn * mag;
        this.bankDecayLatched = true;
      }
      const decay = sgn * delta;
      if(Math.abs(decay) <= Math.abs(this.bankMagnitude)){
        this.bankMagnitude -= decay;
      }else{
        this.bankMagnitude = 0;
      }
    }

    const level = ModuleMGPlayer.bankMagnitudeToLevel(this.bankMagnitude);
    if(level === this.bankLevel){ return; }
    this.bankLevel = level;

    let anim = 'Ready_01';
    if(this.bankLevel !== 0){
      const side = this.bankLevel > 0 ? 'R' : 'L';
      const n = Math.abs(this.bankLevel);
      anim = `Bank${side}_${n < 10 ? '0' : ''}${n}`;
    }
    this.playAnimation(anim, 1, 0, 0);
  }

  /**
   * Retail Control @ 006710e0 — map |bankMagnitude| thresholds → bank level 0..10.
   */
  static bankMagnitudeToLevel(magnitude: number): number {
    const sgn = magnitude < 0 ? -1 : magnitude > 0 ? 1 : 0;
    if(!sgn){ return 0; }
    const a = Math.abs(magnitude);
    let n = 0;
    if(a >= 0.25){ n = 10; }
    else if(a >= 0.24){ n = 9; }
    else if(a >= 0.23){ n = 8; }
    else if(a >= 0.2){ n = 7; }
    else if(a >= 0.17){ n = 6; }
    else if(a >= 0.135){ n = 5; }
    else if(a >= 0.1){ n = 4; }
    else if(a >= 0.071){ n = 3; }
    else if(a >= 0.042){ n = 2; }
    else if(a >= 0.021){ n = 1; }
    return sgn * n;
  }

  clearInertiaKeyBuffers(){
    this.inertiaKeysTrigger.length = 0;
    this.inertiaKeysReport.length = 0;
  }

  /**
   * Retail OnReportKey @ 0066dd60 stand-in — for each modelhook Position key crossed
   * append to follower.trigger list; Orientation keys → field3 list.
   * World-bakes Aurora local key values for DoInertia (expects world pos/quat).
   */
  emitInertiaKeysFromTrackAnim(){
    const trackModel = this.track as OdysseyModel3D;
    const animMgr = trackModel?.animationManager;
    const anim = animMgr?.currentAnimation;
    const state = animMgr?.currentAnimationState;
    if(!anim || !state || !anim.nodes?.length){ return; }

    const animNode = anim.nodes.find(
      (n) => n?.name && n.name.toLowerCase() === 'modelhook'
    );
    if(!animNode){ return; }

    const t0 = this.inertiaAnimT0;
    const t1 = typeof state.elapsed === 'number' ? state.elapsed : t0;
    if(!(t1 > t0)){ return; }

    const posCtrl = animNode.controllers?.get?.(OdysseyModelControllerType.Position);
    const oriCtrl = animNode.controllers?.get?.(OdysseyModelControllerType.Orientation);
    const posFrames: IOdysseyControllerFrameGeneric[] = posCtrl?.data;
    const oriFrames: IOdysseyControllerFrameGeneric[] = oriCtrl?.data;

    const hook = trackModel.getObjectByName?.('modelhook');
    const parent = hook?.parent;
    if(parent){ parent.updateWorldMatrix(true, false); }
    const parentWorld = parent?.matrixWorld || trackModel.matrixWorld;

    if(posFrames?.length){
      for(let i = 0; i < posFrames.length; i++){
        const t = posFrames[i]?.time;
        if(typeof t !== 'number' || !(t > t0 && t <= t1)){ continue; }
        const key: SWMGKeyInfo = {
          time: t,
          position: new THREE.Vector3(),
          orientation: new THREE.Quaternion(),
          hasPosition: true,
          hasOrientation: false,
        };
        this.sampleHookWorldAt(posFrames, oriFrames, t, parentWorld, key.position, key.orientation);
        this.inertiaKeysTrigger.push(key);
      }
    }

    if(oriFrames?.length){
      for(let i = 0; i < oriFrames.length; i++){
        const t = oriFrames[i]?.time;
        if(typeof t !== 'number' || !(t > t0 && t <= t1)){ continue; }
        // Skip if Position already emitted at same time (avoid duplicate merge events).
        if(posFrames?.some((f) => f?.time === t)){ continue; }
        const key: SWMGKeyInfo = {
          time: t,
          position: new THREE.Vector3(),
          orientation: new THREE.Quaternion(),
          hasPosition: false,
          hasOrientation: true,
        };
        this.sampleHookWorldAt(posFrames || [], oriFrames, t, parentWorld, key.position, key.orientation);
        this.inertiaKeysReport.push(key);
      }
    }
  }

  /**
   * Retail UseInertia: Control @ 0066d640 merges OnReportKey buffers → DoInertia
   * per segment, then remainder to live modelhook; clears counts each frame.
   */
  applyInertia(delta: number){
    const hook = this.track?.getObjectByName?.('modelhook');
    if(!hook || delta <= 0){ return; }

    this.track.updateMatrixWorld(true);
    hook.getWorldPosition(this.inertiaHookCurr);
    hook.getWorldQuaternion(this.inertiaHookQuat);

    if(!this.inertiaReady){
      this.inertiaHookPrev.copy(this.inertiaHookCurr);
      this.inertiaVelocity.set(0, 0, 0);
      this.inertiaReady = true;
      this.clearInertiaKeyBuffers();
      return;
    }

    const merged = this.mergeInertiaKeyBuffers();
    this.inertiaSegPrev.copy(this.inertiaHookPrev);
    this.inertiaSegQuat.copy(this.inertiaHookQuat);
    let tCursor = this.inertiaAnimT0;

    for(let i = 0; i < merged.length; i++){
      const key = merged[i];
      const dt = key.time - tCursor;
      if(dt > 0){
        if(key.hasPosition){
          this.inertiaSegCurr.copy(key.position);
        }else{
          this.inertiaSegCurr.copy(this.inertiaSegPrev);
        }
        if(key.hasOrientation){
          this.inertiaSegQuat.copy(key.orientation);
        }
        this.doInertia(
          this.inertiaSegPrev,
          this.inertiaSegCurr,
          this.inertiaSegQuat,
          dt,
          this.inertiaOut
        );
        this.playerOffset.add(this.inertiaOut);
        this.inertiaSegPrev.copy(this.inertiaSegCurr);
      }else{
        // Zero-dt / same-time key: update pose state only (Control coalesces).
        if(key.hasOrientation){ this.inertiaSegQuat.copy(key.orientation); }
        if(key.hasPosition){ this.inertiaSegPrev.copy(key.position); }
      }
      tCursor = key.time;
    }

    // Frame remainder → live modelhook (retail final DoInertia with leftover dt).
    const t1 = this.inertiaAnimT0 + delta;
    // Prefer anim elapsed span when available.
    const trackModel = this.track as OdysseyModel3D;
    const elapsed = trackModel?.animationManager?.currentAnimationState?.elapsed;
    const tEnd = typeof elapsed === 'number' && elapsed > this.inertiaAnimT0 ? elapsed : t1;
    const rem = tEnd - tCursor;
    if(rem > 1e-8){
      this.doInertia(
        this.inertiaSegPrev,
        this.inertiaHookCurr,
        this.inertiaHookQuat,
        rem,
        this.inertiaOut
      );
      this.playerOffset.add(this.inertiaOut);
      this.inertiaSegPrev.copy(this.inertiaHookCurr);
      this.inertiaSegQuat.copy(this.inertiaHookQuat);
    }

    this.inertiaHookPrev.copy(this.inertiaSegPrev);
    this.inertiaHookCurr.copy(this.inertiaSegPrev);
    this.inertiaHookQuat.copy(this.inertiaSegQuat);

    this.keepInTunnel(this.playerOffset);
    this.container.position.set(
      this.playerOffset.x,
      this.playerOffset.y,
      this.playerOffset.z
    );
    this.clearInertiaKeyBuffers();
  }

  /**
   * Retail Control merge of two 0x24 lists by ascending time.
   * Rewrites absolute times stay absolute here; segment dts computed in applyInertia.
   */
  mergeInertiaKeyBuffers(): SWMGKeyInfo[] {
    const out = ModuleMGPlayer._mergeOrder;
    out.length = 0;
    const a = this.inertiaKeysTrigger;
    const b = this.inertiaKeysReport;
    let i = 0;
    let j = 0;
    while(i < a.length || j < b.length){
      if(j >= b.length || (i < a.length && a[i].time <= b[j].time)){
        out.push(a[i++]);
      }else{
        out.push(b[j++]);
      }
    }
    return out;
  }

  /** Evaluate modelhook local Position/Orientation at anim time → world. */
  sampleHookWorldAt(
    posFrames: IOdysseyControllerFrameGeneric[],
    oriFrames: IOdysseyControllerFrameGeneric[] | undefined,
    time: number,
    parentWorld: THREE.Matrix4,
    outPos: THREE.Vector3,
    outQuat: THREE.Quaternion
  ){
    if(posFrames?.length){
      const pos = this.sampleVec3Frame(posFrames, time);
      outPos.set(pos.x, pos.y, pos.z);
    }else{
      outPos.set(0, 0, 0);
    }
    if(oriFrames?.length){
      const o = this.sampleQuatFrame(oriFrames, time);
      outQuat.set(o.x, o.y, o.z, o.w);
    }else{
      outQuat.identity();
    }
    this.inertiaLocalMat.compose(outPos, outQuat, this.inertiaScratch.set(1, 1, 1));
    this.inertiaWorldMat.multiplyMatrices(parentWorld, this.inertiaLocalMat);
    this.inertiaWorldMat.decompose(outPos, outQuat, this.inertiaScratch);
  }

  sampleVec3Frame(frames: IOdysseyControllerFrameGeneric[], time: number): { x: number; y: number; z: number } {
    if(frames.length === 1){
      const f = frames[0];
      return { x: f.x ?? 0, y: f.y ?? 0, z: f.z ?? 0 };
    }
    if(time <= frames[0].time){
      const f = frames[0];
      return { x: f.x ?? 0, y: f.y ?? 0, z: f.z ?? 0 };
    }
    const last = frames[frames.length - 1];
    if(time >= last.time){
      return { x: last.x ?? 0, y: last.y ?? 0, z: last.z ?? 0 };
    }
    for(let i = 0; i < frames.length - 1; i++){
      const a = frames[i];
      const b = frames[i + 1];
      if(time >= a.time && time <= b.time){
        const span = b.time - a.time;
        const fl = span > 0 ? (time - a.time) / span : 0;
        return {
          x: (a.x ?? 0) + ((b.x ?? 0) - (a.x ?? 0)) * fl,
          y: (a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * fl,
          z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * fl,
        };
      }
    }
    return { x: last.x ?? 0, y: last.y ?? 0, z: last.z ?? 0 };
  }

  sampleQuatFrame(frames: IOdysseyControllerFrameGeneric[], time: number): { x: number; y: number; z: number; w: number } {
    if(frames.length === 1){
      const f = frames[0];
      return { x: f.x ?? 0, y: f.y ?? 0, z: f.z ?? 0, w: f.w ?? 1 };
    }
    if(time <= frames[0].time){
      const f = frames[0];
      return { x: f.x ?? 0, y: f.y ?? 0, z: f.z ?? 0, w: f.w ?? 1 };
    }
    const last = frames[frames.length - 1];
    if(time >= last.time){
      return { x: last.x ?? 0, y: last.y ?? 0, z: last.z ?? 0, w: last.w ?? 1 };
    }
    for(let i = 0; i < frames.length - 1; i++){
      const a = frames[i];
      const b = frames[i + 1];
      if(time >= a.time && time <= b.time){
        const span = b.time - a.time;
        const fl = span > 0 ? (time - a.time) / span : 0;
        this.inertiaHookQuat.set(a.x ?? 0, a.y ?? 0, a.z ?? 0, a.w ?? 1);
        this.inertiaSegQuat.set(b.x ?? 0, b.y ?? 0, b.z ?? 0, b.w ?? 1);
        this.inertiaHookQuat.slerp(this.inertiaSegQuat, fl);
        return {
          x: this.inertiaHookQuat.x,
          y: this.inertiaHookQuat.y,
          z: this.inertiaHookQuat.z,
          w: this.inertiaHookQuat.w,
        };
      }
    }
    return { x: last.x ?? 0, y: last.y ?? 0, z: last.z ?? 0, w: last.w ?? 1 };
  }

  /**
   * Retail CSWMiniPlayer::DoInertia @ 0066cd30 —
   * vel = (curr−prev)/dt; project (prevVel−vel) off BumpPlane; store vel;
   * return Inverse(quat) * tangential (scale 1.0).
   */
  doInertia(
    prevPos: THREE.Vector3,
    currPos: THREE.Vector3,
    quat: THREE.Quaternion,
    dt: number,
    out: THREE.Vector3 = new THREE.Vector3()
  ): THREE.Vector3 {
    const miniGame = GameState.module?.area?.miniGame;
    if(!miniGame || dt <= 0){
      return out.set(0, 0, 0);
    }

    miniGame.bumpPlaneNormal(quat, this.inertiaPlane);
    this.inertiaScratch.copy(currPos).sub(prevPos).divideScalar(dt);
    out.copy(this.inertiaVelocity).sub(this.inertiaScratch);
    const along = out.dot(this.inertiaPlane);
    out.x -= this.inertiaPlane.x * along;
    out.y -= this.inertiaPlane.y * along;
    out.z -= this.inertiaPlane.z * along;
    this.inertiaVelocity.copy(this.inertiaScratch);
    // Inverse(quat) * tangential — retail FLOAT scale is 1.0 @ 007a2488.
    this.inertiaHookQuat.copy(quat).invert();
    out.applyQuaternion(this.inertiaHookQuat);
    return out;
  }

  /**
   * Retail CSWMiniPlayer::KeepInTunnel @ 0066cb40 / TSL 00544160.
   * Type 1: clamp offset to origin±tunnel. Type 2 infinite: wrap degrees 0–360.
   */
  keepInTunnel(offset: THREE.Vector3){
    const type = GameState.module?.area?.miniGame?.type;

    const clampAxis = (
      value: number,
      infinite: number,
      origin: number,
      neg: number,
      pos: number
    ): number => {
      if(infinite === 0){
        const max = origin + pos;
        const min = origin + neg;
        if(value > max){ return max; }
        if(value < min){ return min; }
        return value;
      }
      if(type === MiniGameType.TURRET){
        if(value < 0){ return value + 360; }
        if(value >= 360){ return value - 360; }
      }
      return value;
    };

    offset.x = clampAxis(offset.x, this.tunnelInfinite.x, this.origin.x, this.tunnel.neg.x, this.tunnel.pos.x);
    offset.y = clampAxis(offset.y, this.tunnelInfinite.y, this.origin.y, this.tunnel.neg.y, this.tunnel.pos.y);
    offset.z = clampAxis(offset.z, this.tunnelInfinite.z, this.origin.z, this.tunnel.neg.z, this.tunnel.pos.z);
  }

  /**
   * Retail DoObstacleHitCheck @ 0066e6b0 —
   * GetPart("hitbump") + HitCheckPart when Gob loaded; else proximity sphere.
   * OnHitObstacle(player), set obstacle.last_follower_hit = player, OnHitFollower(obstacle).
   * Latched once per obstacle (like enemy.collided).
   */
  /**
   * World position of primary follower model (or container) for HitCheckPart segments.
   */
  getHitModelWorld(out: THREE.Vector3): THREE.Vector3 {
    const model = this.models?.[0];
    if(model){
      model.updateMatrixWorld?.(true);
      return model.getWorldPosition(out);
    }
    this.container.updateMatrixWorld?.(true);
    return this.container.getWorldPosition(out);
  }

  /**
   * Named collision part on loaded follower Gobs (`hitbullet`).
   */
  getHitPart(partName: string): THREE.Object3D | undefined {
    const key = partName.toLowerCase();
    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      if(!model){ continue; }
      const node = model.nodes?.get?.(key) || model.getObjectByName?.(partName);
      if(node){ return node; }
    }
    return undefined;
  }

  /**
   * Retail DoObstacleHitCheck @ 0066e6b0 —
   * HitCheckPart(hitbump, follower model prev→curr) when obstacle models loaded.
   */
  tryHitObstacle(obstacle: ModuleMGObstacle){
    // Retail DoObstacleHitCheck does not gate on invulnerability — scripts do.
    if(!this.alive){ return; }
    if(!obstacle || obstacle.hit){ return; }
    if(!obstacle.models?.length){ return; }
    // Retail DoObstacleHitCheck requires follower models.size != 0.
    if(!this.models?.length){ return; }

    let hit = false;
    const from = this.hitModelSegReady
      ? this.hitModelSegFrom
      : this.getHitModelWorld(ModuleMGPlayer._tmpHitModel);
    const to = this.getHitModelWorld(ModuleMGPlayer._tmpHitBump);

    for(let i = 0; i < obstacle.models.length; i++){
      const root = obstacle.models[i];
      if(!root){ continue; }
      const hitPart = root.nodes?.get?.('hitbump') || root.getObjectByName?.('hitbump');
      if(!hitPart){ continue; }
      if(hitCheckPart(root, hitPart, from, to)){
        hit = true;
        break;
      }
    }

    if(!hit){
      // No hitbump part on any model — proximity stand-in.
      let anyBump = false;
      for(let i = 0; i < obstacle.models.length; i++){
        const root = obstacle.models[i];
        if(root?.nodes?.get?.('hitbump') || root?.getObjectByName?.('hitbump')){
          anyBump = true;
          break;
        }
      }
      if(anyBump){ return; }
      const obsPos = obstacle.layout?.position ?? obstacle.position;
      if(!obsPos){ return; }
      const radius = this.sphere_radius || 1;
      hit = this.sphere.center.distanceToSquared(obsPos) <= (radius * 2) * (radius * 2);
    }
    if(!hit){ return; }

    obstacle.hit = true;
    const mg = GameState.module?.area?.miniGame;
    if(mg){ mg.lastFollowerHit = this; }
    obstacle.lastFollowerHit = this;

    // Retail order: player OnHitObstacle, then obstacle OnHitFollower.
    this.onHitObstacle(obstacle);
    obstacle.onHitFollower(this);
  }

  fire(){
    if(this.gunBanks.length){
      for(let i = 0; i < this.gunBanks.length; i++){
        this.gunBanks[i].fire();
      }
    }
    this.onFire();
  }

  rotate(axis = 'x', amount = 0){
    // Turret tunnels are degrees in GFF; rotation is stored in radians.
    const toRadLimit = (deg: number) => THREE.MathUtils.degToRad(deg);
    const type = GameState.module?.area?.miniGame?.type;
    const useDeg = type === MiniGameType.TURRET;

    const limPos = (v: number) => useDeg ? toRadLimit(v) : v;
    const limNeg = (v: number) => useDeg ? toRadLimit(v) : v;

    switch(axis){
      case 'x':
        this.rotation.x += amount;
        if(this.tunnelInfinite.x === 0){
          if(this.rotation.x > limPos(this.tunnel.pos.x))
            this.rotation.x = limPos(this.tunnel.pos.x);
          if(this.rotation.x < limNeg(this.tunnel.neg.x))
            this.rotation.x = limNeg(this.tunnel.neg.x);
        }
      break;
      case 'y':
        this.rotation.y += amount;
        if(this.tunnelInfinite.y === 0){
          if(this.rotation.y > limPos(this.tunnel.pos.y))
            this.rotation.y = limPos(this.tunnel.pos.y);
          if(this.rotation.y < limNeg(this.tunnel.neg.y))
            this.rotation.y = limNeg(this.tunnel.neg.y);
        }
      break;
      case 'z':
        this.rotation.z += amount;
        if(this.tunnelInfinite.z === 0){
          if(this.rotation.z > limPos(this.tunnel.pos.z))
            this.rotation.z = limPos(this.tunnel.pos.z);
          if(this.rotation.z < limNeg(this.tunnel.neg.z))
            this.rotation.z = limNeg(this.tunnel.neg.z);
        }
      break;
    }

    this.rotation.x = Utility.NormalizeRadian(this.rotation.x);
    this.rotation.y = Utility.NormalizeRadian(this.rotation.y);
    this.rotation.z = Utility.NormalizeRadian(this.rotation.z);
  }

  playAnimation(name = '', bLooping = 0, bQueue = 0, bOverlay = 0){
    // const padding = '                                             ';
    //console.log(`play: ${name}${padding}`.substring(0, 20), `bLooping: ${bLooping ? 'true' : 'false'}${padding}`.substring(0, 20), `bQueue: ${bQueue ? 'true' : 'false'}${padding}`.substring(0, 20), `bOverlay: ${bOverlay ? 'true' : 'false'}${padding}`.substring(0, 20));
    for(let i = 0; i < this.models.length; i++){
      const model = this.models[i];
      const anim = model.odysseyAnimationMap.get(name.toLowerCase().trim());
      if(anim){

        //Check if this animation has already been applied
        const existingIndex = this.animationManagers.findIndex( am => am?.currentAnimation?.name == name );
        if(existingIndex >= 0){
          this.animationManagers.splice(existingIndex, 1);
        }

        if(bOverlay){
          const animManager = new OdysseyModelAnimationManager(model);
          const state = animManager.createAnimationState();
          state.loop = bLooping ? true : false;
          animManager.setCurrentAnimation(anim, state);
          this.animationManagers.push(animManager);
        }else{
          model.playAnimation(anim, false);
        }
      }
    }
  }

  removeAnimation(name = ''){
    // const padding = '                                             ';
    //console.log( `remove: ${name}${padding}`.substring(0, 20) );
    const existingIndex = this.animationManagers.findIndex( am => am?.currentAnimation?.name == name );
    if(existingIndex >= 0){
      this.animationManagers.splice(existingIndex, 1);
    }
  }

  updateCollision(delta = 0){

    if(!GameState.module || !GameState.module.area)
      return;

    let _axisFront = this.forceVector.clone();
    let _oPosition = this.position.clone();

    //this.getCurrentRoom();
    const hitdist = this.sphere_radius;
    const hitdist_half = hitdist/2;

    this.box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    this.box.translate(this.position);
    this.box.translate(_axisFront);

    const box = this.box.clone();

    //START Gravity
    GameState.raycaster.far = 10;
    let scratchVec3 = new THREE.Vector3(0, 0, 2);
    let playerFeetRay = this.position.clone().add( ( scratchVec3 ) );
    GameState.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    GameState.raycaster.ray.direction.set(0, 0,-1);

    let obj = undefined;

    if(!this.room) this.getCurrentRoom();

    if(this.room){

      //START: PLACEABLE COLLISION
      this.tmpPos = this.position.clone().add(this.forceVector);
      let plcEdgeLines = [];
      let face;
      let edge;
      let line;
      let closestPoint = new THREE.Vector3(0, 0, 0);
      let distance;
      let plcCollision = false;
      /*for(let j = 0, jl = this.room.placeables.length; j < jl; j++){
        obj = this.room.placeables[j];
        if(obj && obj.walkmesh && obj.model && obj.model.visible){
          obj.box.setFromObject(obj.model);
          if(obj.box.intersectsBox(box) || obj.box.containsBox(box)){
            for(let l = 0, ll = obj.walkmesh.edgeKeys.length; l < ll; l++){
              edge = obj.walkmesh.edges[obj.walkmesh.edgeKeys[l]];
              edge.line.closestPointToPoint(this.tmpPos, true, closestPoint);
              distance = closestPoint.distanceTo(this.tmpPos);
              if(distance < hitdist_half){
                plcEdgeLines.push({
                  object: obj,
                  line: line,
                  closestPoint: closestPoint.clone(),
                  distance: distance,
                  maxDistance: hitdist_half,
                  position: this.position
                });
                plcCollision = true;
              }
            }
          }
        }
      }*/

      //END: PLACEABLE COLLISION
      
      //START: ROOM COLLISION
      if(!this.collisionManager.groundFace){
        this.findWalkableFace();
      }

      //room walkable edge check
      let roomCollision = false;
      for (const [index, edge] of this.room.collisionManager.walkmesh.edges) {
        if(edge && edge.transition == -1){
          edge.line.closestPointToPoint(this.tmpPos, true, closestPoint);
          distance = closestPoint.distanceTo(this.tmpPos);
          if(distance < hitdist_half){
            plcEdgeLines.push({
              object: this.room,
              line: edge.line,
              closestPoint: closestPoint.clone(),
              distance: distance,
              maxDistance: hitdist_half,
              position: this.position
            });
            roomCollision = true;
          }
        }
      }

      
        
      if(!(plcCollision && roomCollision)){
        if(plcEdgeLines.length){
          plcEdgeLines.sort((a, b) => (a.distance > b.distance) ? -1 : 1)
          let average = new THREE.Vector3();
          let edgeLine = undefined;
          let distanceOffset = 0;
          let force: THREE.Vector3;
          for(let i = 0, len = plcEdgeLines.length; i < len; i++){
            edgeLine = plcEdgeLines[i];
            distanceOffset = edgeLine.maxDistance - edgeLine.distance;
            force = edgeLine.closestPoint.clone().sub(edgeLine.position);
            force.multiplyScalar(distanceOffset * 2.5);
            force.z = 0;
            average.add( force.negate() );
          }
          this.position.copy(this.tmpPos);
          this.forceVector.copy(average.divideScalar(plcEdgeLines.length));
        }
      }else{
        this.forceVector.set(0, 0, 0);
      }
      //END: ROOM COLLISION

      //Check to see if we tp'd inside of a placeable
      if(this.forceVector.length()){
        this.tmpPos.copy(this.position).add(this.forceVector);
        for(let j = 0, jl = this.room.placeables.length; j < jl; j++){
          obj = this.room.placeables[j];
          if(obj && obj.collisionManager.walkmesh && obj.model && obj.model.visible){
            for(let i = 0, iLen = obj.collisionManager.walkmesh.faces.length; i < iLen; i++){
              face = obj.collisionManager.walkmesh.faces[i];
              if(face.triangle.containsPoint(this.tmpPos) && face.surfacemat.walk){
                //bail we should not be here
                this.forceVector.set(0, 0, 0);
                this.position.copy(_oPosition);
              }
            }
          }
        }
      
        //DETECT: ROOM TRANSITION
        for (const [index, edge] of this.room.collisionManager.walkmesh.edges) {
          if(edge && edge.transition >= 0){
            if(
              Utility.LineLineIntersection(
                this.position.x,
                this.position.y,
                this.position.x + this.forceVector.x,
                this.position.y + this.forceVector.y,
                edge.line.start.x,
                edge.line.start.y,
                edge.line.end.x,
                edge.line.end.y
              )
            ){
              this.attachToRoom(GameState.module.area.rooms[edge.transition]);
              break;
            }
          }
        }

        //update creature position
        this.position.add(this.forceVector);
        //DETECT: GROUND FACE
        this.lastRoom = this.room;
        this.collisionManager.lastGroundFace = this.collisionManager.groundFace;
        //this.groundFace = undefined;
        if(this.room){
          let face = this.room.findWalkableFace(this);
          if(!face){
            this.findWalkableFace();
          }
        }

        if(!this.collisionManager.groundFace){
          this.forceVector.set(0, 0, 0);
          this.position.copy(_oPosition);
          this.collisionManager.groundFace = this.collisionManager.lastGroundFace;
          this.attachToRoom(this.lastRoom);
          this.forceVector.set(0, 0, 0);
        }
      }
    }

    //END Gravity
    GameState.raycaster.far = Infinity;
    this.track.updateMatrixWorld();

    this.box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    this.box.translate(this.position);
    this.box.translate(this.forceVector);

  }

  getCurrentRoom(){
    if(this instanceof ModuleObject){
      this.room = undefined;
      let aabbFaces = [];
      let intersects;// = GameState.raycaster.intersectOctreeObjects( meshesSearch );
      const box = this.box.clone();

      this.rooms = [];
      for(let i = 0; i < GameState.module.area.rooms.length; i++){
        let room = GameState.module.area.rooms[i];
        let model = room.model;
        if(model instanceof OdysseyModel3D){
          if(model.box.containsPoint(this.position)){
            this.roomIds.push(i);
          }
        }
      }

      if(box){
        for(let j = 0, jl = this.rooms.length; j < jl; j++){
          let room = GameState.module.area.rooms[this.roomIds[j]];
          if(room && room.collisionManager.walkmesh && room.collisionManager.walkmesh.aabbNodes.length){
            aabbFaces.push({
              object: room, 
              faces: room.collisionManager.walkmesh.getAABBCollisionFaces(box)
            });
          }
        }
      }
      
      let scratchVec3 = new THREE.Vector3(0, 0, 2);
      let playerFeetRay = this.position.clone().add(scratchVec3);
      GameState.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
      GameState.raycaster.ray.direction.set(0, 0,-1);
      
      for(let j = 0, jl = aabbFaces.length; j < jl; j++){
        let castableFaces = aabbFaces[j];
        intersects = castableFaces.object.collisionManager.walkmesh.raycast(GameState.raycaster, castableFaces.faces) || [];
        
        if(intersects.length){
          if(intersects[0].object.userData.moduleObject){
            this.attachToRoom(intersects[0].object.userData.moduleObject);
            return;
          }
        }
      }
      if(this.roomIds.length){
        this.attachToRoom(GameState.module.area.rooms[this.roomIds[0]]);
        return;
      }
      this.findWalkableFace();
    }
  }

  findWalkableFace(){
    let face;
    let room;
    for(let i = 0, il = GameState.module.area.rooms.length; i < il; i++){
      room = GameState.module.area.rooms[i];
      if(room.collisionManager.walkmesh){
        for(let j = 0, jl = room.collisionManager.walkmesh.walkableFaces.length; j < jl; j++){
          face = room.collisionManager.walkmesh.walkableFaces[j];
          if(face.triangle.containsPoint(this.position)){
            this.collisionManager.groundFace = face;
            this.collisionManager.lastGroundFace = this.collisionManager.groundFace;
            this.collisionManager.surfaceId = this.collisionManager.groundFace.walkIndex;
            this.attachToRoom(room);
            face.triangle.closestPointToPoint(this.position, this.collisionManager.wm_c_point);
            this.position.z = this.collisionManager.wm_c_point.z + .005;
          }
        }
      }
    }
    return face;
  }

  load(){
    this.initProperties();
    this.loadScripts();
    GameState.scene.add(this.sphere_geom);
    void this.trackFollowerAudio.load();
  }

  loadCamera(): Promise<void> {
    return new Promise<void>((resolve) => {
      if(!this.cameraName){
        resolve();
        return;
      }
      const resref = this.cameraName.replace(/\0[\s\S]*$/g,'').toLowerCase();
      MDLLoader.loader.load(resref).then(
        (mdl: OdysseyModel) => {
          OdysseyModel3D.FromMDL(mdl, {
            onComplete: (camera: OdysseyModel3D) => {
              try{
                this.camera = camera;
                camera.name = this.cameraName;
                this.container.add(camera);
              }catch(e){
                console.error(e);
              }
              resolve();
            },
            context: this.context,
            castShadow: true,
            receiveShadow: true
          });
        }
      ).catch((e) => {
        console.error('ModuleMGPlayer.loadCamera failed', resref, e);
        resolve();
      });
    });
  }

  async loadModel (){
    for(let i = 0; i < this.modelProps.length; i++){
      try{
        const item = this.modelProps[i];
        const resref = item.model.replace(/\0[\s\S]*$/g,'').toLowerCase();
        const mdl = await MDLLoader.loader.load(resref);
        const model = await OdysseyModel3D.FromMDL(mdl, {
          context: this.context,
          castShadow: true,
          receiveShadow: true
        });
        if(item.rotating){
          this.container.add(model);
        }else{
          this.no_rotate.add(model);
        }
        this.models.push(model);
        model.name = item.model;
        // Retail Go RegisterCallBack(OnAnimKeyEvent) on follower models.
        this.bindAnimPlayEvent(model);

        if(this.camera && model.name == this.camera.name)
          model.visible = false;
      }catch(e){
        console.error(e);
      }
    }
  }

  getGunHook(bankID: number): THREE.Object3D | undefined {
    const points = ModuleMGGunBank.findGunAttachPoints(this.container, bankID);
    if(points.length){ return points[0]; }
    return this.container.getObjectByName('gunbank'+bankID) as THREE.Object3D;
  }

  /**
   * Retail TrackFollower::Load Gun_Banks then AttachGuns on each model @ 0066fff0.
   */
  async loadGunBanks(){
    for(let i = 0; i < this.gunBanks.length; i++){
      const gunbank = this.gunBanks[i];
      await gunbank.load();
      let added = 0;
      for(let m = 0; m < this.models.length; m++){
        added += await gunbank.attachGuns(this.models[m]);
      }
      // Also scan container / no_rotate roots (models may be parented there).
      if(!added){
        added += await gunbank.attachGuns(this.container);
      }
      if(!added && this.no_rotate){
        await gunbank.attachGuns(this.no_rotate);
      }
      this.gun_hook = gunbank.gunHooks[0] || this.getGunHook(gunbank.bankID);
    }
  }

  /**
   * Retail OnAnimKeyEvent @ 0066fe50 stand-in via OdysseyModel3D playEvent.
   * custom_* → lastEvent = suffix + OnAnimEvent script; loop → Num_Loops + OnTrackLoop.
   */
  handleAnimPlayEvent(e: { event?: string; target?: { name?: string } }){
    const raw = String(e?.event ?? '');
    if(!raw){ return; }
    const lower = raw.toLowerCase();
    const modelName = e?.target?.name || this.models?.[0]?.name || this.name || '';
    const mg = GameState.module?.area?.miniGame;

    if(lower.startsWith('custom_')){
      // Retail stores param_2+7 (suffix after "custom_").
      mg?.recordAnimEvent?.(raw.substring(7), modelName);
      this.onAnimEvent();
      return;
    }
    if(lower === 'loop'){
      // Retail: if looping != -1, decrement + SetSpeed, then OnTrackLoop script.
      if(typeof this.num_loops === 'number' && this.num_loops !== -1){
        this.num_loops = this.num_loops - 1;
        this.setFollowerSpeed(this.speed);
      }
      this.onTrackLoop();
    }
  }

  bindAnimPlayEvent(target: THREE.Object3D | undefined | null){
    if(!target || typeof (target as any).addEventListener !== 'function'){ return; }
    // Avoid double-bind on the same object.
    for(let i = 0; i < this.animPlayEventTargets.length; i++){
      if(this.animPlayEventTargets[i].target === target){ return; }
    }
    (target as any).addEventListener('playEvent', this.animPlayEventHandler);
    this.animPlayEventTargets.push({ target, handler: this.animPlayEventHandler });
  }

  unbindAnimPlayEvent(target: THREE.Object3D | undefined | null){
    if(!target){ return; }
    for(let i = this.animPlayEventTargets.length - 1; i >= 0; i--){
      const entry = this.animPlayEventTargets[i];
      if(entry.target !== target){ continue; }
      (entry.target as any).removeEventListener?.('playEvent', entry.handler);
      this.animPlayEventTargets.splice(i, 1);
    }
  }

  unbindAnimPlayEvents(){
    for(let i = 0; i < this.animPlayEventTargets.length; i++){
      const { target, handler } = this.animPlayEventTargets[i];
      (target as any).removeEventListener?.('playEvent', handler);
    }
    this.animPlayEventTargets.length = 0;
  }

  onAnimEvent(){
    const instance = this.scripts[ModuleObjectScript.MGPlayerOnAnimEvent];
    if(!instance){ return; }
    instance.run(this, 0);
  }

  onCreate(){
    const instance = this.scripts[ModuleObjectScript.MGPlayerOnCreate];
    if(!instance){ return; }
    instance.run(this, 0);
  }

  onDamaged(skipScript: boolean = false): boolean{
    if(!skipScript){
      const instance = this.scripts[ModuleObjectScript.MGPlayerOnDamage];
      if(instance){
        instance.run(this, 0);
        return true;
      }
    }
    this.applyQueuedHitPoints();
    return true;
  }

  onFire(){
    const instance = this.scripts[ModuleObjectScript.MGPlayerOnFire];
    if(!instance){ return; }
    instance.run(this, 0);
  }

  onAccelerate(){
    const instance = this.scripts[ModuleObjectScript.MGPlayerOnAccelerate];
    if(!instance){ return; }
    instance.run(this, 0);
  }

  onHitBullet( bullet: ModuleMGGunBullet ){
    const instance = this.scripts[ModuleObjectScript.MGPlayerOnHitBullet];
    if(instance){
      instance.mgBullet = bullet;
      instance.run(this, 0);
      return;
    }
    // Retail OnHitBullet default: AdjustHitPoints(-damage) when invuln expired.
    if(this.invince > 0){ return; }
    const dmg = (bullet as any)?.damage_amt ?? (bullet as any)?.damage ?? 0;
    if(dmg){
      this.adjustHitPoints(-dmg, 0);
    }
  }

  onHitFollower( follower: ModuleMGEnemy ){
    const instance = this.scripts[ModuleObjectScript.MGPlayerOnHitFollower];
    if(!instance){ return; }
    instance.mgFollower = follower;
    instance.run(this, 0);
  }

  /**
   * Retail OnHitObstacle @ 0066e5c0 —
   * param 0: try OnHitObstacle script; else stop anims, dead bit, OnDeath(0).
   * param 1 (SWMG_OnObstacleHit DefaultImpl): skip script → OnDeath(0).
   */
  onHitObstacle( obstacle: ModuleMGObstacle, skipScript: boolean = false ){
    if(!skipScript){
      const instance = this.scripts[ModuleObjectScript.MGPlayerOnHitObstacle];
      if(instance){
        instance.mgObstacle = obstacle;
        instance.run(this, 0);
        return;
      }
    }
    if(this.alive){
      this.die(false);
    }
  }

  onTrackLoop(){
    const instance = this.scripts[ModuleObjectScript.MGPlayerOnTrackLoop];
    if(!instance){ return; }
    instance.run(this, 0);
  }

  loadScripts (){
    const scriptResRefs = [
      ModuleObjectScript.MGPlayerOnAccelerate,
      ModuleObjectScript.MGPlayerOnAnimEvent,
      ModuleObjectScript.MGPlayerOnBrake,
      ModuleObjectScript.MGPlayerOnCreate,
      ModuleObjectScript.MGPlayerOnDamage,
      ModuleObjectScript.MGPlayerOnDeath,
      ModuleObjectScript.MGPlayerOnFire,
      ModuleObjectScript.MGPlayerOnHeartbeat,
      ModuleObjectScript.MGPlayerOnHitBullet,
      ModuleObjectScript.MGPlayerOnHitFollower,
      ModuleObjectScript.MGPlayerOnHitObstacle,
      ModuleObjectScript.MGPlayerOnHitWorld,
      ModuleObjectScript.MGPlayerOnTrackLoop,
    ];

    const scriptsNode = this.template.getFieldByLabel('Scripts')?.getFieldStruct();
    if(scriptsNode){
      for(const scriptKey of scriptResRefs){
        if(scriptsNode.hasField(scriptKey)){
          const resRef = scriptsNode.getFieldByLabel(scriptKey).getValue();
          if(!resRef){ continue; }
          const nwscript = GameState.NWScript.Load(resRef);
          if(!nwscript){ 
            console.warn(`ModuleMGPlayer.loadScripts: Failed to load script [${scriptKey}]:${resRef} for object ${this.name}`);
            continue; 
          }
          nwscript.caller = this;
          this.scripts[scriptKey] = nwscript;
        }
      }
    }
  }

  initProperties(){
    if(this.template.RootNode.hasField('Accel_Secs'))
      this.accel_secs = this.template.getFieldByLabel('Accel_Secs').getValue();

    if(this.template.RootNode.hasField('Bump_Damage'))
      this.bump_damage = this.template.getFieldByLabel('Bump_Damage').getValue();

    if(this.template.RootNode.hasField('Camera'))
      this.cameraName = this.template.getFieldByLabel('Camera').getValue();

    if(this.template.RootNode.hasField('CameraRotate'))
      this.cameraRotate = this.template.getFieldByLabel('CameraRotate').getValue();

    if(this.template.RootNode.hasField('Hit_Points'))
      this.hit_points = this.template.getFieldByLabel('Hit_Points').getValue();

    if(this.template.RootNode.hasField('Invince_Period'))
      this.invince_period = this.template.getFieldByLabel('Invince_Period').getValue();

    if(this.template.RootNode.hasField('Max_HPs'))
      this.max_hps = this.template.getFieldByLabel('Max_HPs').getValue();

    if(this.template.RootNode.hasField('Maximum_Speed'))
      this.speed_max = this.template.getFieldByLabel('Maximum_Speed').getValue();

    if(this.template.RootNode.hasField('Minimum_Speed'))
      this.speed_min = this.template.getFieldByLabel('Minimum_Speed').getValue();

    if(this.template.RootNode.hasField('Num_Loops'))
      this.num_loops = this.template.getFieldByLabel('Num_Loops').getValue();

    if(this.template.RootNode.hasField('Sphere_Radius'))
      this.sphere_radius = this.template.getFieldByLabel('Sphere_Radius').getValue();

    if(this.template.RootNode.hasField('Track'))
      this.trackName = ModuleMGTrack.normalizeName(
        this.template.getFieldByLabel('Track').getValue()
      );

    // Retail CSWTrackFollower Sounds struct (Death / Engine resrefs).
    if(this.template.RootNode.hasField('Sounds')){
      this.trackFollowerSounds.loadFromSoundsStruct(
        this.template.getFieldByLabel('Sounds').getFieldStruct()
      );
    }

    if(this.template.RootNode.hasField('TunnelXNeg'))
      this.tunnel.neg.x = this.template.getFieldByLabel('TunnelXNeg').getValue();

    if(this.template.RootNode.hasField('TunnelXPos'))
      this.tunnel.pos.x = this.template.getFieldByLabel('TunnelXPos').getValue();
    else if(this.template.RootNode.hasField('TunneXPos'))
      this.tunnel.pos.x = this.template.getFieldByLabel('TunneXPos').getValue();
    
    if(this.template.RootNode.hasField('TunnelYNeg'))
      this.tunnel.neg.y = this.template.getFieldByLabel('TunnelYNeg').getValue();

    if(this.template.RootNode.hasField('TunnelYPos'))
      this.tunnel.pos.y = this.template.getFieldByLabel('TunnelYPos').getValue();

    if(this.template.RootNode.hasField('TunnelZNeg'))
      this.tunnel.neg.z = this.template.getFieldByLabel('TunnelZNeg').getValue();
    else if(this.template.RootNode.hasField('TunneZNeg'))
      this.tunnel.neg.z = this.template.getFieldByLabel('TunneZNeg').getValue();

    if(this.template.RootNode.hasField('TunnelZPos'))
      this.tunnel.pos.z = this.template.getFieldByLabel('TunnelZPos').getValue();

    const loadTunnelInfinite = (label: string) => {
      if(!this.template.RootNode.hasField(label)){ return; }
      const field = this.template.getFieldByLabel(label);
      const vec = field?.vector ?? field?.getValue?.();
      if(vec && typeof vec === 'object'){
        this.tunnelInfinite.x = vec.x ?? 0;
        this.tunnelInfinite.y = vec.y ?? 0;
        this.tunnelInfinite.z = vec.z ?? 0;
      }
    };
    if(this.template.RootNode.hasField('TunnelInfinite')){
      loadTunnelInfinite('TunnelInfinite');
    }
    loadTunnelInfinite('Tunnellnfinite'); // forge typo present in some exports

    // Retail Start_Offset_* → SetOrigin @ 0066cfd0 (also seeds offset when not running).
    const startX = this.readFloatField('Start_Offset_X', 'XOrigin');
    const startY = this.readFloatField('Start_Offset_Y', 'YOrigin');
    const startZ = this.readFloatField('Start_Offset_Z', 'ZOrigin');
    this.origin.x = startX;
    this.origin.y = startY;
    this.origin.z = startZ;
    if(!this.running){
      this.playerOffset.set(startX, startY, startZ);
    }

    // Retail Target_Offset_* — BehaviorTrack aim point in player local space.
    this.targetOffset.set(
      this.readFloatField('Target_Offset_X'),
      this.readFloatField('Target_Offset_Y'),
      this.readFloatField('Target_Offset_Z')
    );

    if(this.template.RootNode.hasField('Models')){
      let models = this.template.getFieldByLabel('Models').getChildStructs();
      for(let i = 0; i < models.length; i++){
        let modelStruct = models[i];
        this.modelProps.push({
          model: modelStruct.getFieldByLabel('Model').getValue(),
          rotating: !!modelStruct.getFieldByLabel('RotatingModel').getValue()
        });
      }
    }

    if(this.template.RootNode.hasField('Gun_Banks')){
      const gun_banks = this.template.getFieldByLabel('Gun_Banks').getChildStructs();
      for(let i = 0; i < gun_banks.length; i++){
        this.gunBanks.push(
          new ModuleMGGunBank(
            GFFObject.FromStruct(gun_banks[i]),
            this,
            true
          )
        );
      }

      this.initialized = true;
    }


    /*if(this.template.RootNode.hasField('CameraRotate'))
      this.cameraRotate = this.template.getFieldByLabel('CameraRotate').getValue();

    if(this.template.RootNode.hasField('Hit_Points'))
      this.hit_points = this.template.getFieldByLabel('Hit_Points').getValue();

    if(this.template.RootNode.hasField('Invince_Period'))
      this.invince_period = this.template.getFieldByLabel('Invince_Period').getValue();

    if(this.template.RootNode.hasField('Max_HPs'))
      this.max_hps = this.template.getFieldByLabel('Max_HPs').getValue();

    if(this.template.RootNode.hasField('Maximum_Speed'))
      this.maximum_speed = this.template.getFieldByLabel('Maximum_Speed').getValue();*/



  }


}
