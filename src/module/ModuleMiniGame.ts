import { GameState } from "@/GameState";
import { MiniGameType } from "@/enums/engine/MiniGameType";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { ModuleMGEnemy } from "@/module/ModuleMGEnemy";
import type { ModuleMGObstacle } from "@/module/ModuleMGObstacle";
import type { ModuleMGPlayer } from "@/module/ModuleMGPlayer";
import { ModuleMGTrack } from "@/module/ModuleMGTrack";
import type { ModuleObject } from "@/module/ModuleObject";
import { AudioEngine } from "@/audio/AudioEngine";
import { AudioLoader } from "@/audio/AudioLoader";
import { AmbientAudioEmitter } from "@/audio/AmbientAudioEmitter";
import { AudioPriorityGroup } from "@/enums/audio/AudioPriorityGroup";
import { MiniGameObjectArray } from "@/module/minigame/MiniGameObjectArray";
import type { OdysseyModel3D } from "@/three/odyssey";
import * as THREE from "three";

/** MiniGame physics state (24 bytes: accel + vel). */
export interface MGMPhysicsState {
  acceleration: THREE.Vector3;
  velocity: THREE.Vector3;
}

/**
* ModuleMiniGame class.
*
* Class representing the minigame instance in a minigame module.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file ModuleMiniGame.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleMiniGame {
  /**
   * TSL Control — gravity applied to jumpSpeed each frame (type 1).
   * jumpSpeed -= JUMP_GRAVITY * dt; offset.z += jumpSpeed * dt.
   */
  static readonly JUMP_GRAVITY = 45.8;
  /** Fallback player hop when MGshoot/jump and OnFire did not call SWMG_SetJumpSpeed. */
  static readonly PLAYER_JUMP_SPEED = 15;

  type: MiniGameType;

  bumpPlane: number = 0;
  cameraViewAngle: number = 0;
  dof: number = 0;
  doBumping: number = 0;
  player: ModuleMGPlayer;

  farClip: number = 0;
  lateralAccel: number = 0;
  movementPerSec: number = 0;
  /**
   * MiniGame.Music — CResRef (streammusic), not ambientmusic.2da index.
   * K1 Win Load; Go plays via Play(..., STREAMMUSIC=8).
   */
  music: string = '';
  nearClip: number = 0;
  useInertia: number = 0;

  /**
   * Player.Mouse AxisX/Y (signed: abs 1/2/3 → x/y/z; negative flips).
   * UpdateMouse.
   */
  axisX: number = 0;
  axisY: number = 0;

  /**
   * ctor defaults to **1** (AxisAcceleration).
   * 0 → AxisVelocity; 1 → AxisAcceleration.
   */
  axisMode: number = 1;

  /** previous physics state. */
  physicsPrev: MGMPhysicsState = {
    acceleration: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
  };
  /** next physics state (written by AxisAcceleration). */
  physicsNext: MGMPhysicsState = {
    acceleration: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
  };
  /**..46 — last axis input for Accel midpoint. */
  lastAxisInput: THREE.Vector3 = new THREE.Vector3();
  /** axis_velocity @ — mouse accum / Velocity-mode output. */
  axisVelocity: THREE.Vector3 = new THREE.Vector3();

  /**
   * TSL MiniGame jump velocity (offset). Set by SWMG_SetJumpSpeed / PlayerApplyForce.
   * Always decayed by JUMP_GRAVITY while type==SWOOPRACE.
   */
  jumpSpeed: number = 0;

  /** True after streammusic buffer is loaded for `music`. */
  musicLoaded: boolean = false;
  /**
   * MiniGame owns a dedicated CExoStreamingSoundSource (ctor).
   * Do not reuse area day music.
   */
  musicEmitter: AmbientAudioEmitter | null = null;

  /** SWMG last-event / last-bullet hit & fire state. */
  lastEvent: string = '';
  lastEventModelName: string = '';
  lastBulletHitDamage: number = 0;
  lastBulletHitTarget: number = 0;
  lastBulletHitShooter: ModuleObject | undefined;
  lastBulletHitPart: string = '';
  lastBulletFiredDamage: number = 0;
  lastBulletFiredTarget: number = 0;
  lastFollowerHit: ModuleObject | undefined;
  lastObstacleHit: ModuleObject | undefined;

  enemies: ModuleMGEnemy[] = [];
  /**
   * Enemies removed from the live hit list (RemoveEnemy) but still playing die anim.
   * Gobs keep updating via scene; we tick these until models are gone.
   */
  dyingEnemies: ModuleMGEnemy[] = [];
  obstacles: ModuleMGObstacle[] = [];
  tracks: ModuleMGTrack[] = [];
  /**
   * ARE Obstacles Name → Scripts structs for LYT merge.
   * Live MGOs register in MiniGameObjectArray (255-slot client registry).
   */
  obstacleTemplates: Map<string, GFFObject> = new Map();

  constructor(struct: GFFStruct){
    this.type = ModuleMiniGame.readDword(struct, 'Type', 0) as MiniGameType;

    const movementDefault =
      this.type === MiniGameType.SWOOPRACE ? 6 :
      this.type === MiniGameType.TURRET ? 90 : 0;

    // Load defaults.
    this.movementPerSec = ModuleMiniGame.readFloat(struct, 'MovementPerSec', movementDefault);
    this.lateralAccel = ModuleMiniGame.readFloat(struct, 'LateralAccel', 60);
    this.bumpPlane = ModuleMiniGame.readDword(struct, 'Bump_Plane', 0);
    if(this.bumpPlane < 0 || this.bumpPlane > 3){
      this.bumpPlane = 0;
    }
    this.doBumping = ModuleMiniGame.readByte(struct, 'DoBumping', 0);
    this.useInertia = ModuleMiniGame.readByte(struct, 'UseInertia', 0);
    this.dof = ModuleMiniGame.readDword(struct, 'DOF', 0);
    this.music = ModuleMiniGame.parseMusicResRef(struct);
    this.farClip = ModuleMiniGame.readFloat(struct, 'Far_Clip', 100);
    this.nearClip = ModuleMiniGame.readFloat(struct, 'Near_Clip', 0.1);
    this.cameraViewAngle = ModuleMiniGame.readFloat(struct, 'CameraViewAngle', 65);

    this.player = new GameState.Module.ModuleArea.ModuleMGPlayer(
      GFFObject.FromStruct(struct.getFieldByLabel('Player').getChildStructs()[0])
    );
    this.parseMouseFromPlayer();

    const enemies = struct.getFieldByLabel('Enemies').getChildStructs();
    for(let i = 0; i < enemies.length; i++){
      this.enemies.push(
        new ModuleMGEnemy(
          GFFObject.FromStruct(enemies[i])
        )
      );
    }

    this.parseObstacleTemplates(struct);
  }

  /**
   * Load Obstacles — ARE Name list; Scripts loaded onto live MGO
   * found via GetMiniGameObjectByName. We index ARE structs here for LYT Name merge.
   */
  parseObstacleTemplates(struct: GFFStruct){
    this.obstacleTemplates.clear();
    if(!struct?.hasField?.('Obstacles')){ return; }
    const list = struct.getFieldByLabel('Obstacles').getChildStructs();
    for(let i = 0; i < list.length; i++){
      const obsStruct = list[i];
      if(!obsStruct?.hasField?.('Name')){ continue; }
      const raw = obsStruct.getFieldByLabel('Name').getValue();
      const name = ModuleMiniGame.normalizeMgoName(raw);
      if(!name || name === '****'){ continue; }
      this.obstacleTemplates.set(name, GFFObject.FromStruct(obsStruct));
    }
  }

  /** Match CResRef/CExoString obstacle Name compare (lowercased, null-trimmed). */
  static normalizeMgoName(name: string | undefined | null): string {
    return String(name ?? '').replace(/\0[\s\S]*$/g, '').toLowerCase();
  }

  /**
   * ARE Obstacles Name → Scripts template (not the live client MGO array).
   * Live lookup: `MiniGameObjectArray.getByName`.
   */
  getMiniGameObjectByName(name: string | undefined | null): GFFObject | undefined {
    const n = ModuleMiniGame.normalizeMgoName(name);
    if(!n){ return undefined; }
    return this.obstacleTemplates.get(n);
  }

  /**
   * Load reads Player.Mouse AxisX/Y + FlipAxisX/Y.
   * Flip negates the stored axis enum (UpdateMouse uses signed abs).
   */
  parseMouseFromPlayer(){
    const root = this.player?.template?.RootNode;
    if(!root?.hasField?.('Mouse')){ return; }
    const mouseField = root.getFieldByLabel('Mouse');
    const mouseStruct: GFFStruct =
      mouseField.getFieldStruct?.() ||
      mouseField.getChildStructs?.()?.[0];
    if(!mouseStruct){ return; }

    let axisX = ModuleMiniGame.readDword(mouseStruct, 'AxisX', 0);
    let axisY = ModuleMiniGame.readDword(mouseStruct, 'AxisY', 0);
    if(ModuleMiniGame.readByte(mouseStruct, 'FlipAxisX', 0)){
      axisX = -axisX;
    }
    if(ModuleMiniGame.readByte(mouseStruct, 'FlipAxisY', 0)){
      axisY = -axisY;
    }
    this.axisX = axisX;
    this.axisY = axisY;
  }

  /** ReadFieldFLOAT with default when field missing. */
  static readFloat(struct: GFFStruct, label: string, defaultValue: number): number {
    if(!struct?.hasField?.(label)){ return defaultValue; }
    const v = struct.getFieldByLabel(label).getValue();
    return (typeof v === 'number' && Number.isFinite(v)) ? v : defaultValue;
  }

  /** ReadFieldDWORD with default when field missing. */
  static readDword(struct: GFFStruct, label: string, defaultValue: number): number {
    if(!struct?.hasField?.(label)){ return defaultValue; }
    const v = struct.getFieldByLabel(label).getValue();
    return (typeof v === 'number' && Number.isFinite(v)) ? v : defaultValue;
  }

  /** ReadFieldBYTE with default when field missing. */
  static readByte(struct: GFFStruct, label: string, defaultValue: number): number {
    return ModuleMiniGame.readDword(struct, label, defaultValue);
  }

  /** ReadFieldCResRef("Music"); tolerate legacy DWORD forge exports. */
  static parseMusicResRef(struct: GFFStruct): string {
    if(!struct?.hasField?.('Music')){ return ''; }
    const raw = struct.getFieldByLabel('Music').getValue();
    if(typeof raw === 'number'){
      // Legacy forge wrote ambientmusic row index as DWORD — resolve resource if possible.
      const row = GameState.TwoDAManager?.datatables?.get('ambientmusic')?.rows?.[raw];
      const res = row?.resource;
      if(typeof res === 'string' && res && res !== '****'){
        return res.replace(/\0[\s\S]*$/g, '').toLowerCase();
      }
      return '';
    }
    if(typeof raw !== 'string'){ return ''; }
    const resRef = raw.replace(/\0[\s\S]*$/g, '').toLowerCase();
    if(!resRef || resRef === '****'){ return ''; }
    return resRef;
  }

  /** SWMG_SetJumpSpeed (TSL Win) — writes MiniGame jumpSpeed. K1 has no op. */
  setJumpSpeed(speed: number = 0){
    if(GameState.GameKey != GameEngineType.TSL){ return; }
    this.jumpSpeed = speed;
  }

  /**
   * BumpPlane
   * bump_plane 1/2/3 → quat x/y/z direction; else zero.
   */
  bumpPlaneNormal(quat: THREE.Quaternion, out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
    switch(this.bumpPlane){
      case 1:
        return out.set(1, 0, 0).applyQuaternion(quat);
      case 2:
        return out.set(0, 1, 0).applyQuaternion(quat);
      case 3:
        return out.set(0, 0, 1).applyQuaternion(quat);
      default:
        return out.set(0, 0, 0);
    }
  }

  tick(delta: number = 0){
    this.player?.update?.(delta);

    for(let i = this.enemies.length - 1; i >= 0; i--){
      this.enemies[i]?.update?.(delta);
    }

    // Finish die anims after RemoveEnemy (Gob continues until donedie).
    for(let i = this.dyingEnemies.length - 1; i >= 0; i--){
      const enemy = this.dyingEnemies[i];
      if(!enemy){
        this.dyingEnemies.splice(i, 1);
        continue;
      }
      enemy.update(delta);
      if(!enemy.models.length){
        enemy.disposeFollower?.();
        this.dyingEnemies.splice(i, 1);
      }
    }
    
    for(let i = 0; i < this.obstacles.length; i++){
      this.obstacles[i]?.update?.(delta);
    }

    // Update — DoHitCheck only while follower running bit set.
    if(this.player?.alive && this.player.running){
      this.doHitCheck();
    }
  }

  /**
   * DoHitCheck
   * live bullets → obstacles vs player → follower sphere bumps.
   */
  doHitCheck(){
    const player = this.player;
    if(!player?.alive || !player.running){ return; }

    // 1) Bullets (player + enemy gun banks).
    this.doBulletHitChecks(player);
    for(let i = 0; i < this.enemies.length; i++){
      const enemy = this.enemies[i];
      if(!enemy){ continue; }
      this.doBulletHitChecks(enemy);
    }

    // 2) Obstacles vs player.
    for(let i = 0; i < this.obstacles.length; i++){
      const obstacle = this.obstacles[i];
      if(!obstacle){ continue; }
      player.tryHitObstacle(obstacle);
    }

    // 3) Follower bumps (sphere latch).
    for(let i = 0; i < this.enemies.length; i++){
      const enemy = this.enemies[i];
      if(!enemy || !enemy.alive || enemy.collided){ continue; }
      if(enemy.sphere?.containsPoint?.(player.sphere.center)){
        enemy.collided = true;
        player.onHitFollower(enemy);
      }
    }
  }

  /** Run HitCheck on each live bullet for a follower's gun banks. */
  private doBulletHitChecks(follower: { gunBanks?: { bullets?: { doHitCheck?: () => void; hit?: boolean; exploding?: boolean }[] }[] }){
    const banks = follower.gunBanks;
    if(!banks?.length){ return; }
    for(let b = 0; b < banks.length; b++){
      const bullets = banks[b]?.bullets;
      if(!bullets?.length){ continue; }
      for(let i = 0; i < bullets.length; i++){
        const bullet = bullets[i];
        if(!bullet || bullet.hit || bullet.exploding){ continue; }
        bullet.doHitCheck?.();
      }
    }
  }

  tickPaused(delta: number = 0){
    this.player.updatePaused(delta);
    
    for(let i = 0; i < this.enemies.length; i++){
      this.enemies[i].updatePaused(delta);
    }

    for(let i = 0; i < this.obstacles.length; i++){
      this.obstacles[i].updatePaused(delta);
    }
  }

  async load(){
    try { await this.loadMGTracks(); } catch(e){ console.error(e); }
    try {
      await this.loadMGPlayer();
    }catch(e){
      console.error(e);
      // type-2 Load aborts when Camera missing/invalid — propagate.
      throw e;
    }
    try { await this.loadMGEnemies(); } catch(e){ console.error(e); }
    try { await this.loadMGObstacles(); } catch(e){ console.error(e); }
    try { await this.loadMusic(); } catch(e){ console.error(e); }
  }

  /**
   * Load stores Music CResRef; buffer load happens before Go.
   * Dedicated CExoStreamingSoundSource on MiniGame (not area day music).
   */
  async loadMusic(): Promise<void> {
    this.musicLoaded = false;
    if(!this.music){ return; }
    try{
      const data = await AudioLoader.LoadMusic(this.music);
      const emitter = this.ensureMusicEmitter();
      emitter.setData(data.buffer as ArrayBuffer);
      emitter.name = this.music;
      this.musicLoaded = true;
    }catch(e){
      console.error('ModuleMiniGame: failed to load music', this.music, e);
    }
  }

  /** MiniGame ctor allocates streaming source + SetLooping(1). */
  ensureMusicEmitter(): AmbientAudioEmitter {
    if(this.musicEmitter){ return this.musicEmitter; }
    const engine = AudioEngine.GetAudioEngine();
    this.musicEmitter = new AmbientAudioEmitter(engine);
    this.musicEmitter.setPriorityGroupId(AudioPriorityGroup.MUSIC_STREAMS);
    this.musicEmitter.setDestination(AudioEngine.musicChannel.getGainNode());
    return this.musicEmitter;
  }

  initMiniGameObjects(){
    for(let i = 0; i < this.enemies.length; i++){
      if(this.enemies[i]){
        this.enemies[i].onCreate();
      }
    }

    for(let i = 0; i < this.obstacles.length; i++){
      if(this.obstacles[i]){
        this.obstacles[i].onCreate();
      }
    }

    this.player?.onCreate?.();
    // Go — start track followers + streammusic.
    this.go();
  }

  /**
   * Go (K1) / (TSL Aspyr)
   * TSL: when type==1 (swoop), clear global FORFEIT_SWOOPRACE before follower Go/music.
   * player/enemies Go; if streaming source set, Play(musicResRef, STREAMMUSIC=8, loop).
   */
  go(){
    if(this.type === MiniGameType.SWOOPRACE){
      GameState.GlobalVariableManager.SetGlobalBoolean('FORFEIT_SWOOPRACE', false);
    }
    this.player?.go();
    for(let i = 0; i < this.enemies.length; i++){
      this.enemies[i]?.go();
    }
    this.playMusic();
  }

  /** streaming Play with SetLooping from MiniGame ctor. */
  playMusic(){
    if(!this.music || !this.musicLoaded){ return; }
    const emitter = this.ensureMusicEmitter();
    if(!emitter.data){ return; }
    // Pause area BGM while MG owns the music bus (dedicated source in).
    const engine = AudioEngine.GetAudioEngine();
    engine.areaMusicDayAudioEmitter?.stop?.();
    engine.areaMusicNightAudioEmitter?.stop?.();
    if(!emitter.playing){
      void emitter.play(true);
    }
  }

  stopMusic(){
    this.musicEmitter?.stop?.();
  }

  /**
   * UpdateMouse
   * accumulates into axis_velocity (=.velocity @). Call after UpdateAxis.
   */
  updateMouse(dx: number, dy: number, delta: number = 0){
    if(!this.player || (!dx && !dy) || delta <= 0){ return; }
    const scale = this.movementPerSec * delta;
    let mx = dx * scale;
    let my = dy * scale;
    ModuleMiniGame.applyMouseAxis(this.axisX, mx, this.physicsNext.velocity);
    ModuleMiniGame.applyMouseAxis(this.axisY, my, this.physicsNext.velocity);
    this.axisVelocity.copy(this.physicsNext.velocity);
  }

  /**
   * UpdateAxis
   * type remap then AxisAcceleration (default) or AxisVelocity into.
   * Always call (including zero stick) so Accel damping runs.
   */
  updateAxis(x: number, y: number, z: number = 0, delta: number = 0){
    if(!this.player || delta <= 0){ return; }

    const v = new THREE.Vector3(x, y, z);
    if(this.type === MiniGameType.SWOOPRACE){
      v.y *= -1;
      v.z *= -1;
    }else if(this.type === MiniGameType.TURRET){
      const tmp = v.x;
      v.x = -v.z;
      v.z = -tmp;
      v.y *= -1;
    }else{
      return;
    }

    if(this.axisMode === 1){
      this.axisAcceleration(v, delta);
    }else if(this.axisMode === 0){
      this.axisVelocityIntegrate(v, delta);
    }
  }

  /**
   * GetAcceleration
   * A_lat * axis - (A_lat / MovementPerSec) * state.acceleration
   */
  getAcceleration(axis: THREE.Vector3, state: MGMPhysicsState, out: THREE.Vector3): THREE.Vector3 {
    const move = this.movementPerSec || 1e-6;
    const damp = this.lateralAccel / move;
    out.x = this.lateralAccel * axis.x - damp * state.acceleration.x;
    out.y = this.lateralAccel * axis.y - damp * state.acceleration.y;
    out.z = this.lateralAccel * axis.z - damp * state.acceleration.z;
    return out;
  }

  /**
   * AxisVelocity
   *.velocity =.velocity + MovementPerSec * axis * dt
   */
  axisVelocityIntegrate(axis: THREE.Vector3, dt: number){
    const m = this.movementPerSec * dt;
    this.physicsNext.acceleration.copy(this.physicsPrev.acceleration);
    this.physicsNext.velocity.set(
      this.physicsPrev.velocity.x + m * axis.x,
      this.physicsPrev.velocity.y + m * axis.y,
      this.physicsPrev.velocity.z + m * axis.z
    );
    this.axisVelocity.copy(this.physicsNext.velocity);
  }

  /**
   * AxisAcceleration — RK4 on.
   * Derivative: { GetAcceleration(axis, state), state.acceleration }.
   */
  axisAcceleration(axis: THREE.Vector3, dt: number){
    const mid = ModuleMiniGame._tmpAxisMid
      .copy(this.lastAxisInput)
      .add(axis)
      .multiplyScalar(0.5);

    const y0 = this.physicsPrev;
    const k1 = ModuleMiniGame._tmpK1;
    const k2 = ModuleMiniGame._tmpK2;
    const k3 = ModuleMiniGame._tmpK3;
    const k4 = ModuleMiniGame._tmpK4;
    const st = ModuleMiniGame._tmpPhysState;
    const dA = ModuleMiniGame._tmpDerivA;

    // k1 = f(y0, lastAxis) * dt
    this.getAcceleration(this.lastAxisInput, y0, dA);
    k1.acceleration.copy(dA).multiplyScalar(dt);
    k1.velocity.copy(y0.acceleration).multiplyScalar(dt);

    // k2 = f(y0 + k1/2, mid) * dt
    ModuleMiniGame.physicsAddScaled(st, y0, k1, 0.5);
    this.getAcceleration(mid, st, dA);
    k2.acceleration.copy(dA).multiplyScalar(dt);
    k2.velocity.copy(st.acceleration).multiplyScalar(dt);

    // k3 = f(y0 + k2/2, mid) * dt
    ModuleMiniGame.physicsAddScaled(st, y0, k2, 0.5);
    this.getAcceleration(mid, st, dA);
    k3.acceleration.copy(dA).multiplyScalar(dt);
    k3.velocity.copy(st.acceleration).multiplyScalar(dt);

    // k4 = f(y0 + k3, axis) * dt
    ModuleMiniGame.physicsAddScaled(st, y0, k3, 1);
    this.getAcceleration(axis, st, dA);
    k4.acceleration.copy(dA).multiplyScalar(dt);
    k4.velocity.copy(st.acceleration).multiplyScalar(dt);

    // y1 = y0 + k1/6 + k2/3 + k3/3 + k4/6
    this.physicsNext.acceleration.set(
      y0.acceleration.x + k1.acceleration.x / 6 + k2.acceleration.x / 3 + k3.acceleration.x / 3 + k4.acceleration.x / 6,
      y0.acceleration.y + k1.acceleration.y / 6 + k2.acceleration.y / 3 + k3.acceleration.y / 3 + k4.acceleration.y / 6,
      y0.acceleration.z + k1.acceleration.z / 6 + k2.acceleration.z / 3 + k3.acceleration.z / 3 + k4.acceleration.z / 6
    );
    this.physicsNext.velocity.set(
      y0.velocity.x + k1.velocity.x / 6 + k2.velocity.x / 3 + k3.velocity.x / 3 + k4.velocity.x / 6,
      y0.velocity.y + k1.velocity.y / 6 + k2.velocity.y / 3 + k3.velocity.y / 3 + k4.velocity.y / 6,
      y0.velocity.z + k1.velocity.z / 6 + k2.velocity.z / 3 + k3.velocity.z / 3 + k4.velocity.z / 6
    );
    this.axisVelocity.copy(this.physicsNext.velocity);

    this.lastAxisInput.copy(axis);
  }

  private static physicsAddScaled(
    out: MGMPhysicsState,
    base: MGMPhysicsState,
    k: MGMPhysicsState,
    scale: number
  ){
    out.acceleration.set(
      base.acceleration.x + k.acceleration.x * scale,
      base.acceleration.y + k.acceleration.y * scale,
      base.acceleration.z + k.acceleration.z * scale
    );
    out.velocity.set(
      base.velocity.x + k.velocity.x * scale,
      base.velocity.y + k.velocity.y * scale,
      base.velocity.z + k.velocity.z * scale
    );
  }

  private static _tmpAxisMid = new THREE.Vector3();
  private static _tmpDerivA = new THREE.Vector3();
  private static _tmpPhysState: MGMPhysicsState = {
    acceleration: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
  };
  private static _tmpK1: MGMPhysicsState = {
    acceleration: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
  };
  private static _tmpK2: MGMPhysicsState = {
    acceleration: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
  };
  private static _tmpK3: MGMPhysicsState = {
    acceleration: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
  };
  private static _tmpK4: MGMPhysicsState = {
    acceleration: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
  };

  /**
   * Control → Control
   * offset += (.velocity -.velocity), then copy next→prev.
   * Call after UseInertia has added DoInertia into physicsNext.acceleration
   * (inertia affects the *next* AxisAcceleration frame, not this delta).
   */
  commitPhysicsToPlayer(delta: number = 0){
    if(!this.player){ return; }
    const dx = this.physicsNext.velocity.x - this.physicsPrev.velocity.x;
    const dy = this.physicsNext.velocity.y - this.physicsPrev.velocity.y;
    const dz = this.physicsNext.velocity.z - this.physicsPrev.velocity.z;

    if(this.type === MiniGameType.SWOOPRACE){
      // : +=(&offset, &tmp44) with full XYZ velocity delta.
      this.player.playerOffset.x += dx;
      this.player.playerOffset.y += dy;
      this.player.playerOffset.z += dz;
      // Bank from axis input magnitude (not post-commit velocity rate).
      this.player.lateralForce = this.lastAxisInput.x * this.lateralAccel;
    }else if(this.type === MiniGameType.TURRET){
      // Control — offset += velocity delta in **degrees**, then
      // KeepInTunnel + write offset to ori controllers. Not radians (was ~57× fast).
      this.player.playerOffset.x += dx;
      this.player.playerOffset.y += dy;
      this.player.playerOffset.z += dz;
      this.player.keepInTunnel(this.player.playerOffset);
      this.player.applyTurretOffsetRotation();
    }

    this.physicsPrev.acceleration.copy(this.physicsNext.acceleration);
    this.physicsPrev.velocity.copy(this.physicsNext.velocity);
  }

  /** Reset axis physics state (not called after KeepInTunnel — Control does not). */
  clearAxisPhysics(){
    this.physicsPrev.acceleration.set(0, 0, 0);
    this.physicsPrev.velocity.set(0, 0, 0);
    this.physicsNext.acceleration.set(0, 0, 0);
    this.physicsNext.velocity.set(0, 0, 0);
    this.axisVelocity.set(0, 0, 0);
    this.lastAxisInput.set(0, 0, 0);
  }

  /** UpdateMouse axis enum: abs 1/2/3 → x/y/z; negative flips contribution. */
  static applyMouseAxis(axis: number, amount: number, out: { x: number; y: number; z: number }){
    if(!axis || !amount){ return; }
    let v = amount;
    if(axis < 0){ v = -v; }
    const which = Math.abs(axis);
    if(which === 1){ out.x -= v; }
    else if(which === 2){ out.y -= v; }
    else if(which === 3){ out.z -= v; }
  }

  recordBulletFired(damage: number, targetType: number){
    this.lastBulletFiredDamage = damage || 0;
    this.lastBulletFiredTarget = targetType || 0;
  }

  recordBulletHit(opts: {
    damage: number;
    targetType: number;
    shooter?: ModuleObject;
    part?: string;
    follower?: ModuleObject;
    obstacle?: ModuleObject;
  }){
    this.lastBulletHitDamage = opts.damage || 0;
    this.lastBulletHitTarget = opts.targetType || 0;
    this.lastBulletHitShooter = opts.shooter;
    this.lastBulletHitPart = opts.part || '';
    if(opts.follower){ this.lastFollowerHit = opts.follower; }
    if(opts.obstacle){ this.lastObstacleHit = opts.obstacle; }
  }

  recordAnimEvent(eventName: string, modelName: string = ''){
    this.lastEvent = eventName || '';
    this.lastEventModelName = modelName || '';
  }

  /**
   * LYT proto track by normalized ResRef/name (AddTrack list).
   */
  findTrackByName(name: string | undefined | null): ModuleMGTrack | undefined {
    const n = ModuleMGTrack.normalizeName(name);
    if(!n){ return undefined; }
    return this.tracks.find(t => t.track === n);
  }

  /**
   * GetAttachType — swoop=1, turret=2, else 0.
   */
  getAttachType(): number {
    if(this.type === MiniGameType.SWOOPRACE){ return 1; }
    if(this.type === MiniGameType.TURRET){ return 2; }
    return 0;
  }

  /**
   * ForceSetTrack path — NewCAurObject(trackResRef) per follower, not a shared LYT mesh.
   * attachType: SetPlayer passes GetAttachType (1/2); AddEnemy passes 0.
   * Returns false when Track has no LYT proto (AddEnemy skips the follower entirely).
   */
  async bindFollowerTrack(
    follower: {
      trackName: any;
      setTrack: (model: any, owns?: boolean, attachType?: number) => void;
    },
    attachType: number = 0,
  ): Promise<boolean> {
    const proto = this.findTrackByName(follower.trackName);
    if(!proto){
      console.warn('ModuleMiniGame.bindFollowerTrack: no proto for', follower.trackName);
      return false;
    }
    const model = await proto.createFollowerModel();
    GameState.group.creatures.add(model);
    follower.setTrack(model, true, attachType);
    return true;
  }

  /**
   * Stop dedicated MG streammusic and drop the emitter (area unload).
   * Caller may restore area BGM afterward.
   */
  dispose(){
    // SWMG_SetSpeedBlurEffect may leave AurEnableSpeedBlur on; clear so
    // AccumulationBlurPass does not carry into the next module / restart.
    GameState.SetSpeedBlurEffect(false);

    this.stopMusic();
    if(this.musicEmitter){
      this.musicEmitter.dispose?.();
      this.musicEmitter = null;
    }
    this.musicLoaded = false;

    // Dispose owned follower track Gobs first (ForceSetTrack ownership).
    if(this.player?.disposeFollower){
      this.player.disposeFollower();
    }
    this.player = undefined as any;

    for(let i = 0; i < this.enemies.length; i++){
      this.enemies[i]?.disposeFollower?.();
    }
    this.enemies.length = 0;

    for(let i = 0; i < this.dyingEnemies.length; i++){
      this.dyingEnemies[i]?.disposeFollower?.();
    }
    this.dyingEnemies.length = 0;

    for(let i = 0; i < this.tracks.length; i++){
      const track = this.tracks[i];
      // Proto tracks should not hold a shared scene model; clean if legacy path left one.
      if(track?.model){
        track.model.parent?.remove(track.model);
        track.model.dispose?.();
        track.model = undefined;
      }
    }
    this.tracks.length = 0;

    for(let i = 0; i < this.obstacles.length; i++){
      this.obstacles[i]?.dispose?.();
    }
    this.obstacles.length = 0;

    // client MGO array is cleared when the minigame tears down.
    MiniGameObjectArray.clear();
  }

  /**
   * RemoveEnemy — drop enemy from live list by identity.
   * Does not destroy the follower (die anim / DestroyMiniGameObject handle teardown).
   */
  removeEnemy(enemy: ModuleMGEnemy): boolean {
    const idx = this.enemies.indexOf(enemy);
    if(idx < 0){ return false; }
    this.enemies.splice(idx, 1);
    return true;
  }

  /** Queue a removed enemy so die anim can finish before disposeFollower. */
  noteDyingEnemy(enemy: ModuleMGEnemy): void {
    if(!enemy){ return; }
    if(this.dyingEnemies.indexOf(enemy) >= 0){ return; }
    this.dyingEnemies.push(enemy);
  }

  /**
   * TSL SWMG_DestroyMiniGameObject — tear down enemy/obstacle (or player) and drop from MG.
   */
  destroyMiniGameObject(obj: ModuleObject | undefined): void {
    if(!obj){ return; }

    if(obj === this.player){
      this.player.disposeFollower?.();
      this.player = undefined as any;
      return;
    }

    const enemy = obj as ModuleMGEnemy;
    const enemyIdx = this.enemies.indexOf(enemy);
    if(enemyIdx >= 0){
      enemy.disposeFollower?.();
      this.enemies.splice(enemyIdx, 1);
      return;
    }

    const dyingIdx = this.dyingEnemies.indexOf(enemy);
    if(dyingIdx >= 0){
      enemy.disposeFollower?.();
      this.dyingEnemies.splice(dyingIdx, 1);
      return;
    }

    const obsIdx = this.obstacles.indexOf(obj as ModuleMGObstacle);
    if(obsIdx >= 0){
      (obj as ModuleMGObstacle).dispose?.();
      this.obstacles.splice(obsIdx, 1);
    }
  }

  async loadMGPlayer(): Promise<void> {
    console.log('Loading MG Player')
    const player: ModuleMGPlayer = this.player;
    if(!player){ return; }
    await player.load();
    // type 2 Load requires valid Camera ResRef (return 0 if missing).
    if(this.type === MiniGameType.TURRET && !player.cameraName){
      throw new Error('ModuleMiniGame: turret Player.Camera ResRef required');
    }
    const cameraOk = await player.loadCamera();
    if(this.type === MiniGameType.TURRET && !cameraOk){
      throw new Error('ModuleMiniGame: turret Camera model load failed');
    }
    await player.loadModel();
    await player.loadGunBanks();
    // ARE LateralAccel default → player lateral force scale (keyboard / stick).
    if(!player.accel_lateral_secs && this.lateralAccel){
      player.accel_lateral_secs = this.lateralAccel;
    }
    // SetPlayer order: models → ForceSetTrack → SetCameraHook(CameraRotate).
    const bound = await this.bindFollowerTrack(player, this.getAttachType());
    if(!bound){
      throw new Error(
        `ModuleMiniGame: player Track [${player.trackName}] has no LYT proto`
      );
    }
    // CameraRotate BYTE is SetCameraHook attach flag (0 vs GetAttachType), not yaw degrees.
    player.setCameraHook(player.cameraRotate ? 1 : 0);
    player.getCurrentRoom();
  }

  /**
   * AddTrack — store LYT proto (name + Vector). Follower Gobs created in bindFollowerTrack.
   */
  async loadMGTracks(): Promise<void>{
    for(let i = 0; i < this.tracks.length; i++){
      const track = this.tracks[i];
      await track.load();
      track.getCurrentRoom?.();
    }
  }

  async loadMGEnemies(): Promise<void> {
    // AddEnemy — invalid Track skips the follower (no orphan Gob).
    // initProperties (via load) must run first — Track lives on the ARE template.
    for(let i = this.enemies.length - 1; i >= 0; i--){
      const enemy = this.enemies[i];
      if(!enemy){
        this.enemies.splice(i, 1);
        continue;
      }
      await enemy.load();
      const trackName = ModuleMGTrack.normalizeName(enemy.trackName);
      if(!trackName || !this.findTrackByName(trackName)){
        console.warn(
          'ModuleMiniGame.loadMGEnemies: skipping enemy — no LYT track for',
          enemy.trackName
        );
        enemy.disposeFollower?.();
        this.enemies.splice(i, 1);
        continue;
      }
      enemy.trackName = trackName;
      await enemy.loadModel();
      await enemy.loadGunBanks();
      const bound = await this.bindFollowerTrack(enemy, 0);
      if(!bound){
        enemy.disposeFollower?.();
        this.enemies.splice(i, 1);
        continue;
      }
      enemy.computeBoundingBox();
      enemy.getCurrentRoom();
    }
  }

  /**
   * AddObstacle — load Gob from LYT name + ready anim.
   * ARE Scripts already applied in ModuleArea layout parse.
   */
  async loadMGObstacles(): Promise<void> {
    for(let i = 0; i < this.obstacles.length; i++){
      const obstacle = this.obstacles[i];
      if(!obstacle){ continue; }
      await obstacle.loadModel();
    }
  }

  runMiniGameScripts(){
    // Enemy/obstacle/player OnCreate already ran in initMiniGameObjects.
    // Go follows OnCreate; keep this hook for restart / late script bind.
  }

  /**
   * Push MG OdysseyModel3Ds into the area lighting dynamics list.
   * ModuleMG* `.model` / `.position` is the container (tunnel-local for followers)
   * omit position so OdysseyLightingBinder uses each child model's world pose
   * (same nearest light selection query point as scene AttachToObject gobs).
   * Camera HUD stays unlit (IGNORE_LIGHTING / MG_CAMERA_HUD) — do not bind it.
   */
  collectLightingModels(
    out: Array<{ model?: unknown; position?: THREE.Vector3 }>
  ): void {
    const pushModels = (models: OdysseyModel3D[] | undefined) => {
      if(!models){ return; }
      for(let i = 0; i < models.length; i++){
        const model = models[i];
        if(model?.materials){
          out.push({ model });
        }
      }
    };

    const pushGunBanks = (gunBanks: { guns?: OdysseyModel3D[] }[] | undefined) => {
      if(!gunBanks){ return; }
      for(let i = 0; i < gunBanks.length; i++){
        pushModels(gunBanks[i]?.guns);
      }
    };

    const player = this.player;
    if(player){
      pushModels(player.models);
      pushGunBanks(player.gunBanks);
    }

    for(let i = 0; i < this.enemies.length; i++){
      const enemy = this.enemies[i];
      if(!enemy){ continue; }
      pushModels(enemy.models);
      pushGunBanks(enemy.gunBanks);
    }

    for(let i = 0; i < this.obstacles.length; i++){
      const obstacle = this.obstacles[i];
      if(!obstacle){ continue; }
      pushModels(obstacle.models);
    }
  }

}
