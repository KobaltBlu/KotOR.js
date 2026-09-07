import { ModuleObject } from "@/module/ModuleObject";
import { GameState } from "@/GameState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { MDLLoader } from "@/loaders";
import { OdysseyModel } from "@/odyssey";
import { GFFObject } from "@/resource/GFFObject";
import { OdysseyModel3D } from "@/three/odyssey";
import { ModuleMGGunBullet } from "@/module/ModuleMGGunBullet";
import type { ModuleMGPlayer } from "@/module/ModuleMGPlayer";
import * as THREE from "three";

/**
* ModuleMGGunBank class.
*
* Class representing a gunbank attached to players and enemy objects found in minigame modules.
*
* : CreateGunBank then AttachGuns enumerates parts named `gunbank%d-*`
* and AddGun places a Gun_Model Gob on each. Fire fires every gun.
*
* @file ModuleMGGunBank.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleMGGunBank extends ModuleObject {
  bullets: ModuleMGGunBullet[];
  owner: ModuleObject;
  isPlayer: boolean = false;
  proto_bullet: any;
  /** @deprecated use fireSound — kept for older call sites */
  fire_sound: any;
  bulletTemplate: any;
  /** Primary / first gun bullet hook (SWMG / legacy). */
  bullet_hook: any;
  gunModel: any;
  bankID: any;
  fireSound: any;
  horizSpread: number = 0;
  inaccuracy: number = 0;
  /** TargettingGunBank — Sensing_Radius from enemy LoadGun. */
  sensingRadius: number = 0;
  vertSpread: number = 0;
  /** Set by Die — blocks Fire; model may still play die. */
  disabled: boolean = false;
  /**
   * gun Gob list (AddGun →). Each entry is one Gun_Model on an attach part.
   */
  guns: OdysseyModel3D[] = [];
  /** Parallel bullet hooks for each gun Gob. */
  gunHooks: (THREE.Object3D | undefined)[] = [];
  /** Indices still playing die after Die. */
  private dyingGunFlags: boolean[] = [];
  /** BehaviorFire — per-gun fire cooldown. */
  gunFireTimers: number[] = [];
  /** Bound playEvent listeners so removeGunAt can detach. */
  private gunEventHandlers: (((e: any) => void) | undefined)[] = [];
  /** True if last BehaviorFire started a fire anim that had no fire* events (fallback spawn). */
  private pendingFallbackFire: boolean[] = [];

  private static readonly _aimScratch = new THREE.Vector3();
  private static readonly _jitterScratch = new THREE.Vector3();
  private static readonly _aimDirScratch = new THREE.Vector3();
  private static readonly _toTargetScratch = new THREE.Vector3();
  private static readonly _rightScratch = new THREE.Vector3();
  private static readonly _upScratch = new THREE.Vector3();
  private static readonly _parentFwdScratch = new THREE.Vector3();
  private static readonly _targetAimScratch = new THREE.Vector3();
  private static readonly _worldQScratch = new THREE.Quaternion();
  private static readonly _parentQScratch = new THREE.Quaternion();
  private static readonly _yForward = new THREE.Vector3(0, 1, 0);
  private static readonly _gunBankNameRe = /^gunbank(\d+)(?:-|$)/i;
  private static readonly _fireEventRe = /^fire(\d*)$/i;

  constructor( template: GFFObject, owner: ModuleObject, isPlayer: boolean = false ){
    super();
    this.objectType |= ModuleObjectType.ModuleMGGunBank;
    this.template = template;
    this.bullets = [];
    this.owner = owner;
    this.isPlayer = isPlayer;

    this.proto_bullet = undefined;
    
  }

  /** IsGunBankTargetting — Sensing_Radius > 0. */
  isTargetting(): boolean {
    return this.sensingRadius > 0;
  }

  /**
   * AttachGuns / EnumGunAttachPoints — parts named `gunbank{id}` or `gunbank{id}-*`.
   */
  static findGunAttachPoints(root: THREE.Object3D, bankID: number): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    if(!root){ return out; }
    const id = Number(bankID);
    root.traverse((obj) => {
      const name = String(obj?.name ?? '');
      const m = ModuleMGGunBank._gunBankNameRe.exec(name);
      if(!m){ return; }
      if(parseInt(m[1], 10) === id){
        out.push(obj);
      }
    });
    return out;
  }

  /**
   * Enemy targeting banks always lock the MiniGame player (CreateGunBank arg6).
   * Sensing_Radius distance + optional Horiz/Vert_Spread cone (degrees; 0/-1 = no cone).
   */
  isPlayerInSensingRange(player?: ModuleMGPlayer): boolean {
    if(!this.isTargetting()){ return false; }
    const target = player || GameState.module?.area?.miniGame?.player;
    if(!target?.alive){ return false; }
    const origin = ModuleMGGunBank._aimScratch;
    const src = this.guns[0] || this.model;
    if(src){
      src.getWorldPosition(origin);
    }else if((this.owner as any)?.container?.getWorldPosition){
      (this.owner as any).container.getWorldPosition(origin);
    }else if(this.owner?.position){
      origin.copy(this.owner.position);
    }else{
      return false;
    }
    const aimPoint = typeof target.getTargetAimPoint === 'function'
      ? target.getTargetAimPoint(ModuleMGGunBank._targetAimScratch)
      : (target.sphere?.center || target.position);
    const r = this.sensingRadius;
    if(origin.distanceToSquared(aimPoint) > r * r){ return false; }

    // Cone from gun forward. Spreads ≤0 or −1 → unbounded (SetHorizontalSpread allows −1).
    const hSpread = this.horizSpread;
    const vSpread = this.vertSpread;
    if((hSpread > 0 || vSpread > 0) && src){
      const forward = ModuleMGGunBank._jitterScratch;
      const hook = this.gunHooks[0] || this.bullet_hook;
      if(hook){
        hook.getWorldDirection(forward);
      }else{
        src.getWorldDirection(forward);
      }
      if(forward.lengthSq() > 0){
        forward.normalize();
        const toTarget = ModuleMGGunBank._toTargetScratch
          .copy(aimPoint)
          .sub(origin);
        if(toTarget.lengthSq() > 0){
          toTarget.normalize();
          const right = ModuleMGGunBank._rightScratch.crossVectors(forward, ModuleMGGunBank._yForward);
          if(right.lengthSq() < 1e-8){
            right.crossVectors(forward, ModuleMGGunBank._aimScratch.set(1, 0, 0));
          }
          right.normalize();
          const trueUp = ModuleMGGunBank._upScratch.crossVectors(right, forward).normalize();
          const localX = toTarget.dot(right);
          const localY = toTarget.dot(forward);
          const localZ = toTarget.dot(trueUp);
          if(localY <= 0){ return false; }
          if(hSpread > 0){
            const horizDeg = THREE.MathUtils.radToDeg(Math.atan2(localX, localY));
            if(Math.abs(horizDeg) > hSpread){ return false; }
          }
          if(vSpread > 0){
            const vertDeg = THREE.MathUtils.radToDeg(Math.atan2(localZ, localY));
            if(Math.abs(vertDeg) > vSpread){ return false; }
          }
        }
      }
    }

    return true;
  }

  update(delta = 0){
    // Control — decay per-gun fire timers.
    for(let i = 0; i < this.gunFireTimers.length; i++){
      if(this.gunFireTimers[i] > 0){
        this.gunFireTimers[i] = Math.max(0, this.gunFireTimers[i] - delta);
      }
    }
    // Keep proto_bullet.fire_timer in sync with primary gun for SWMG rate getters.
    if(this.proto_bullet){
      this.proto_bullet.fire_timer = this.gunFireTimers[0] || 0;
    }

    for(let i = 0; i < this.guns.length; i++){
      this.guns[i]?.update?.(delta);
    }
    if(this.model && this.guns.indexOf(this.model as OdysseyModel3D) < 0){
      this.model.update?.(delta);
    }

    // If fire* anim events never ran (anim ended without FireGunCallback), spawn once.
    for(let i = 0; i < this.pendingFallbackFire.length; i++){
      if(!this.pendingFallbackFire[i]){ continue; }
      const gun = this.guns[i];
      const cur = gun?.animationManager?.currentAnimation;
      const stillFiring = !!cur && cur.name?.toLowerCase?.() === 'fire';
      if(stillFiring){ continue; }
      this.pendingFallbackFire[i] = false;
      this.spawnBulletFromGun(i, 0);
    }

    // Control — aim targeting guns at player.
    if(this.isTargetting() && !this.disabled){
      this.updateGunTracking();
    }

    // GunDie / donedie — purge gun Gob when die anim ends.
    for(let i = this.guns.length - 1; i >= 0; i--){
      if(!this.dyingGunFlags[i]){ continue; }
      const gun = this.guns[i];
      if(!(gun instanceof OdysseyModel3D)){
        this.removeGunAt(i);
        continue;
      }
      const cur = gun.animationManager?.currentAnimation;
      if(!cur || cur.name?.toLowerCase?.() !== 'die'){
        this.removeGunAt(i);
      }
    }

    let old_bullet_indexes = [];

    for(let i = 0, len = this.bullets.length; i < len; i++){
      if(!this.bullets[i].update(delta)){
        old_bullet_indexes.push(i);
      }
    }

    let old_bullets_index = old_bullet_indexes.length;
    while(old_bullets_index--){
      this.bullets.splice(old_bullet_indexes[old_bullets_index], 1);
    }
  }

  updatePaused(delta: number = 0){
    
  }

  /**
   * Die / Die
   * stop fire behavior; play die on each gun Gob or RemoveGun if missing.
   */
  die(){
    this.disabled = true;
    for(let i = this.guns.length - 1; i >= 0; i--){
      const gun = this.guns[i];
      if(!(gun instanceof OdysseyModel3D) || !gun.bonesInitialized){
        this.removeGunAt(i);
        continue;
      }
      const dieAnim = gun.odysseyAnimationMap?.get?.('die');
      if(!dieAnim){
        this.removeGunAt(i);
        continue;
      }
      gun.playAnimation(dieAnim, false);
      this.dyingGunFlags[i] = true;
    }
    if(!this.guns.length && this.model){
      this.removeGunModel();
    }
  }

  /** RemoveGun — detach + drop gun Gob. */
  removeGunAt(index: number){
    if(index < 0 || index >= this.guns.length){ return; }
    const gun = this.guns[index];
    const handler = this.gunEventHandlers[index];
    if(gun && handler){
      gun.removeEventListener?.('playEvent', handler);
    }
    gun?.parent?.remove(gun);
    gun?.dispose?.();
    this.guns.splice(index, 1);
    this.gunHooks.splice(index, 1);
    this.dyingGunFlags.splice(index, 1);
    this.gunFireTimers.splice(index, 1);
    this.gunEventHandlers.splice(index, 1);
    this.pendingFallbackFire.splice(index, 1);
    this.syncPrimaryGun();
  }

  removeGunModel(){
    while(this.guns.length){
      this.removeGunAt(this.guns.length - 1);
    }
    if(this.model && this.guns.indexOf(this.model as OdysseyModel3D) < 0){
      this.model.parent?.remove(this.model);
      this.model.dispose?.();
    }
    this.model = undefined;
    this.bullet_hook = undefined;
  }

  /**
   * Fire → Fire
   * when timer==0: set rate timer, play fire+ready, fire SFX. Bullets spawn from
   * FireGunCallback on anim events `fire` / `fire%d`.
   */
  fire(){
    if(this.disabled){ return; }

    const rate = this.proto_bullet?.rate_of_fire || 0;
    const sfx = this.fire_sound || this.fireSound;
    const gunModels = this.guns.length
      ? this.guns
      : (this.model instanceof OdysseyModel3D ? [this.model] : []);

    if(!gunModels.length){
      // No gun Gob yet — legacy immediate spawn from bank hook.
      if(!(this.gunFireTimers[0] > 0)){
        this.gunFireTimers[0] = rate;
        if(sfx){ GameState.guiAudioEmitter.playSoundFireAndForget(sfx); }
        const hook = this.bullet_hook || this.gunHooks[0];
        if(hook){ this.spawnBulletFromHook(hook); }
      }
      return;
    }

    for(let i = 0; i < gunModels.length; i++){
      if(this.gunFireTimers[i] > 0){ continue; }
      this.gunFireTimers[i] = rate;
      const gun = gunModels[i];
      if(gun instanceof OdysseyModel3D){
        const fireAnim = gun.odysseyAnimationMap?.get?.('fire');
        const hasFireEvents = !!(fireAnim?.events?.some?.(
          (ev: any) => ModuleMGGunBank._fireEventRe.test(String(ev?.name ?? ''))
        ));
        gun.playAnimation(fireAnim || 'fire', false);
        const ready =
          gun.odysseyAnimationMap?.get?.('ready') ||
          gun.odysseyAnimationMap?.get?.('Ready_01');
        if(ready){
          // queues ready after fire (overlay/flag 0x20).
        }
        if(!hasFireEvents){
          // No fire* anim events — spawn immediately (FireGunCallback would never run).
          this.spawnBulletFromGun(i, 0);
          this.pendingFallbackFire[i] = false;
        }else{
          // Wait for fire*/fire%d playEvent; update falls back if the event never runs.
          this.pendingFallbackFire[i] = true;
        }
      }
      if(sfx){
        GameState.guiAudioEmitter.playSoundFireAndForget(sfx);
      }
    }
  }

  /**
   * FireGunCallback — anim event `fire`/`fire%d` → bullethook%d bullet;
   * `startfire` → OnFire (follower OnFire script).
   */
  onGunAnimEvent(gunIndex: number, eventName: string){
    if(this.disabled){ return; }
    const raw = String(eventName ?? '').toLowerCase().trim();
    if(!raw){ return; }

    if(raw === 'startfire' || raw.startsWith('startfire')){
      this.onFireScript();
      return;
    }

    const m = ModuleMGGunBank._fireEventRe.exec(raw);
    if(!m){ return; }
    this.pendingFallbackFire[gunIndex] = false;
    const hookIndex = m[1] !== '' ? parseInt(m[1], 10) : 0;
    this.spawnBulletFromGun(gunIndex, Number.isFinite(hookIndex) ? hookIndex : 0);
  }

  /** OnFire — run follower OnFire script. */
  onFireScript(){
    const owner = this.owner as any;
    if(typeof owner?.onFire === 'function'){
      owner.onFire();
    }
  }

  spawnBulletFromGun(gunIndex: number, hookIndex: number = 0){
    const gun = this.guns[gunIndex];
    let hook: THREE.Object3D | undefined;
    if(gun){
      hook =
        gun.getObjectByName?.(`bullethook${hookIndex}`) ||
        (hookIndex === 0 ? gun.getObjectByName?.('bullethook') : undefined) ||
        this.gunHooks[gunIndex];
    }else{
      hook = this.gunHooks[gunIndex] || this.bullet_hook;
    }
    if(!hook){
      console.warn('ModuleMGGunBank: no bullethook', hookIndex, 'on gun', gunIndex);
      return;
    }
    this.spawnBulletFromHook(hook);
  }

  spawnBulletFromHook(hook: THREE.Object3D){
    if(!this.bulletTemplate){
      console.warn('ModuleMGGunBank: cannot spawn — no Bullet template', this.bankID);
      return;
    }
    const bullet = new ModuleMGGunBullet( this.bulletTemplate, this );
    bullet.load().then( () => {
      if(this.disabled || !hook || !bullet.model){ return; }
      // FireGunCallback — GetPartPosition(bullethook) → pos + ori.
      hook.updateMatrixWorld?.(true);
      hook.getWorldPosition(bullet.position);

      // Targeting banks overwrite ori (aim + inaccuracy); else keep bullethook world ori.
      if(this.isTargetting() && this.aimBulletAtPlayer(bullet)){
        // aimed
      }else{
        hook.getWorldQuaternion(bullet.quaternion);
        // Motion uses quaternion (+Y forward); keep direction in sync for debug/LOS.
        bullet.direction.set(0, 1, 0).applyQuaternion(bullet.quaternion);
      }

      // : PlayAnimation("ready") → AttachToScene → SetPosition/Orientation.
      // Sync mesh before the next bank update or the bolt sits at world origin for a frame.
      const model = bullet.model as OdysseyModel3D;
      model.position.copy(bullet.position);
      model.quaternion.copy(bullet.quaternion);
      model.updateMatrixWorld(true);

      const ready =
        model.odysseyAnimationMap?.get?.('ready') ||
        model.odysseyAnimationMap?.get?.('Ready_01');
      if(ready){
        model.playAnimation(ready, true);
      }else if(typeof model.playAnimation === 'function'){
        model.playAnimation('ready', true);
      }

      // Effect-class bolts (mgb_*) — same scene group as combat projectiles.
      GameState.group.effects.add(model);
      // Seed emitters / alpha controllers once (async attach can land mid-frame).
      model.update?.(0);

      this.bullets.push(bullet);
      GameState.module?.area?.miniGame?.recordBulletFired?.(
        bullet.damage_amt || 0,
        bullet.target_type || 0
      );
    }).catch((e) => {
      console.error('ModuleMGGunBank.spawnBulletFromHook: bullet load failed', e);
    });
  }

  /**
   * Control
   * when player is within Sensing_Radius, yaw/pitch gun toward them; clamp to
   * Horiz_Spread / Vert_Spread (degrees; ≤0 or −1 = unbound). Still orients when
   * outside the fire cone (clears TrackAndFire flag but keeps clamped aim).
   */
  updateGunTracking(){
    const player = GameState.module?.area?.miniGame?.player;
    if(!player?.alive || !player.sphere){ return; }

    const r = this.sensingRadius;
    if(r <= 0){ return; }
    const target = typeof player.getTargetAimPoint === 'function'
      ? player.getTargetAimPoint(ModuleMGGunBank._targetAimScratch)
      : (player.sphere?.center || player.position);
    const hSpread = this.horizSpread;
    const vSpread = this.vertSpread;

    for(let i = 0; i < this.guns.length; i++){
      const gun = this.guns[i];
      if(!gun){ continue; }

      gun.getWorldPosition(ModuleMGGunBank._aimScratch);
      if(ModuleMGGunBank._aimScratch.distanceToSquared(target) > r * r){ continue; }

      const desired = ModuleMGGunBank._aimDirScratch
        .copy(target)
        .sub(ModuleMGGunBank._aimScratch);
      if(desired.lengthSq() <= 0){ continue; }
      desired.normalize();

      const parent = gun.parent;
      if((hSpread > 0 || vSpread > 0) && parent){
        const forward = ModuleMGGunBank._parentFwdScratch
          .copy(ModuleMGGunBank._yForward)
          .applyQuaternion(parent.getWorldQuaternion(ModuleMGGunBank._parentQScratch));
        if(forward.lengthSq() > 0){
          forward.normalize();
          // Prefer world +Z as up for Odyssey +Y-forward guns.
          const right = ModuleMGGunBank._rightScratch.crossVectors(
            forward,
            ModuleMGGunBank._upScratch.set(0, 0, 1)
          );
          if(right.lengthSq() < 1e-8){
            right.crossVectors(forward, ModuleMGGunBank._upScratch.set(1, 0, 0));
          }
          right.normalize();
          const up = ModuleMGGunBank._upScratch.crossVectors(right, forward).normalize();
          let yaw = THREE.MathUtils.radToDeg(
            Math.atan2(desired.dot(right), desired.dot(forward))
          );
          let pitch = THREE.MathUtils.radToDeg(
            Math.atan2(desired.dot(up), desired.dot(forward))
          );
          if(hSpread > 0 && Math.abs(yaw) > hSpread){
            yaw = Math.sign(yaw) * hSpread;
          }
          if(vSpread > 0 && Math.abs(pitch) > vSpread){
            pitch = Math.sign(pitch) * vSpread;
          }
          desired.copy(forward)
            .addScaledVector(right, Math.tan(THREE.MathUtils.degToRad(yaw)))
            .addScaledVector(up, Math.tan(THREE.MathUtils.degToRad(pitch)))
            .normalize();
        }
      }

      ModuleMGGunBank._worldQScratch.setFromUnitVectors(
        ModuleMGGunBank._yForward,
        desired
      );
      if(parent){
        parent.getWorldQuaternion(ModuleMGGunBank._parentQScratch);
        gun.quaternion
          .copy(ModuleMGGunBank._parentQScratch)
          .invert()
          .multiply(ModuleMGGunBank._worldQScratch);
      }else{
        gun.quaternion.copy(ModuleMGGunBank._worldQScratch);
      }
    }
  }

  /**
   * FireGunCallback targeting path
   * aim at player sphere center; when Inaccuracy > 0, offset the aim point by a
   * random unit * (player sphere_radius * Inaccuracy) projected perpendicular to
   * the line of fire (AddGun copies sphere_radius into Track).
   */
  aimBulletAtPlayer(bullet: ModuleMGGunBullet): boolean {
    const player = GameState.module?.area?.miniGame?.player;
    if(!player?.alive){ return false; }

    const aimPoint = ModuleMGGunBank._aimScratch;
    if(typeof player.getTargetAimPoint === 'function'){
      player.getTargetAimPoint(aimPoint);
    }else if(player.sphere){
      aimPoint.copy(player.sphere.center);
    }else{
      return false;
    }

    if(this.inaccuracy > 0){
      const sphereR = player.sphere_radius || player.sphere?.radius || 0;
      const jitter = ModuleMGGunBank._jitterScratch.set(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      );
      if(jitter.lengthSq() > 0 && sphereR > 0){
        jitter.normalize().multiplyScalar(sphereR * this.inaccuracy);
        const aimDir = ModuleMGGunBank._aimDirScratch
          .copy(aimPoint)
          .sub(bullet.position);
        if(aimDir.lengthSq() > 0){
          aimDir.normalize();
          // Remove component along line of fire → disk of radius r*Inaccuracy.
          jitter.addScaledVector(aimDir, -jitter.dot(aimDir));
        }
        aimPoint.add(jitter);
      }
    }

    const aim = ModuleMGGunBank._toTargetScratch
      .copy(aimPoint)
      .sub(bullet.position);
    if(aim.lengthSq() <= 0){ return false; }
    aim.normalize();
    bullet.direction.copy(aim);
    bullet.quaternion.setFromUnitVectors(ModuleMGGunBank._yForward, aim);
    return true;
  }

  load(){
    this.initProperties();
    return Promise.resolve();
  }

  /**
   * AttachGuns + AddGun
   * place Gun_Model on each `gunbank{id}` / `gunbank{id}-*` part under follower models.
   */
  async attachGuns(followerRoot: THREE.Object3D): Promise<number> {
    if(!followerRoot || this.bankID === undefined || this.bankID === null){ return 0; }
    const points = ModuleMGGunBank.findGunAttachPoints(followerRoot, Number(this.bankID));
    let added = 0;
    for(let i = 0; i < points.length; i++){
      if(await this.addGun(points[i])){
        added++;
      }
    }
    // Fallback: exact gunbank{N} already covered by regex; if none, try legacy single hook name.
    if(!added){
      const legacy = followerRoot.getObjectByName?.('gunbank' + this.bankID);
      if(legacy && await this.addGun(legacy)){
        added++;
      }
    }
    return added;
  }

  /** AddGun — NewCAurObject(Gun_Model), attach to part, BehaviorFire + FireGunCallback. */
  async addGun(attachPoint: THREE.Object3D): Promise<boolean> {
    if(!attachPoint || !this.gunModel){ return false; }
    const resref = String(this.gunModel).replace(/\0[\s\S]*$/g,'').toLowerCase();
    if(!resref){ return false; }
    try{
      const mdl = await MDLLoader.loader.load(resref);
      const model = await OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        castShadow: true,
        receiveShadow: true
      });
      attachPoint.add(model);
      if(typeof (model as any).playAnimation === 'function'){
        const ready =
          model.odysseyAnimationMap?.get?.('ready') ||
          model.odysseyAnimationMap?.get?.('Ready_01');
        if(ready){
          model.playAnimation(ready, false);
        }
      }
      const hook =
        model.getObjectByName('bullethook0') ||
        model.getObjectByName('bullethook');
      const modelRef = model;
      const handler = (e: any) => {
        const name = e?.event ?? e?.name ?? '';
        const idx = this.guns.indexOf(modelRef);
        if(idx < 0){ return; }
        this.onGunAnimEvent(idx, String(name));
      };
      model.addEventListener?.('playEvent', handler);
      this.guns.push(model);
      this.gunHooks.push(hook);
      this.dyingGunFlags.push(false);
      this.gunFireTimers.push(0);
      this.gunEventHandlers.push(handler);
      this.pendingFallbackFire.push(false);
      this.syncPrimaryGun();
      return true;
    }catch(e){
      console.error('ModuleMGGunBank.addGun failed', resref, e);
      return false;
    }
  }

  /** Keep `model` / `bullet_hook` as first gun for SWMG getters. */
  syncPrimaryGun(){
    this.model = this.guns[0];
    this.bullet_hook = this.gunHooks[0];
  }

  /** @deprecated Prefer attachGuns — single proto load without attach. */
  loadModel(){
    return new Promise<void>( (resolve, reject) => {
      const resref = String(this.gunModel || '').replace(/\0[\s\S]*$/g,'').toLowerCase();
      if(!resref){
        resolve();
        return;
      }
      MDLLoader.loader.load(resref).then( (mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, {
          onComplete: (model: OdysseyModel3D) => {
            const handler = (e: any) => {
              const name = e?.event ?? e?.name ?? '';
              this.onGunAnimEvent(0, String(name));
            };
            model.addEventListener?.('playEvent', handler);
            this.guns = [model];
            this.gunHooks = [
              model.getObjectByName('bullethook0') || model.getObjectByName('bullethook')
            ];
            this.dyingGunFlags = [false];
            this.gunFireTimers = [0];
            this.gunEventHandlers = [handler];
            this.pendingFallbackFire = [false];
            this.syncPrimaryGun();
            resolve();
          },
          context: this.context,
          castShadow: true,
          receiveShadow: true
        });
      }).catch(reject);
    });
  }

  initProperties(){
    if(this.template.RootNode.hasField('BankID'))
      this.bankID = this.template.getFieldByLabel('BankID').getValue()

    if(this.template.RootNode.hasField('Fire_Sound')){
      this.fireSound = this.template.getFieldByLabel('Fire_Sound').getValue()
      this.fire_sound = this.fireSound;
    }

    if(this.template.RootNode.hasField('Gun_Model'))
      this.gunModel = this.template.getFieldByLabel('Gun_Model').getValue()

    if(this.template.RootNode.hasField('Horiz_Spread'))
      this.horizSpread = this.template.getFieldByLabel('Horiz_Spread').getValue() || 0

    if(this.template.RootNode.hasField('Inaccuracy'))
      this.inaccuracy = this.template.getFieldByLabel('Inaccuracy').getValue() || 0

    if(this.template.RootNode.hasField('Sensing_Radius'))
      this.sensingRadius = this.template.getFieldByLabel('Sensing_Radius').getValue() || 0

    if(this.template.RootNode.hasField('Vert_Spread'))
      this.vertSpread = this.template.getFieldByLabel('Vert_Spread').getValue() || 0
      
    this.bulletTemplate = (() => {
      const field = this.template.RootNode.getFieldByLabel('Bullet');
      if(!field){ return undefined; }
      const struct =
        field.getFieldStruct?.() ||
        field.getChildStructs?.()?.[0];
      return struct ? GFFObject.FromStruct(struct) : undefined;
    })();
    if(this.bulletTemplate){
      this.proto_bullet = new ModuleMGGunBullet(this.bulletTemplate, this);
      this.proto_bullet.initProperties();
    }else{
      console.warn('ModuleMGGunBank: missing Bullet struct', this.bankID);
    }

  }

}
