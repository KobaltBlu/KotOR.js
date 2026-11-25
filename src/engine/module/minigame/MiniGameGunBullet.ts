import { GameObject } from "@engine/module/GameObject";
import { miniGameGunBulletSerializer } from "@engine/module/serialization/MiniGameGunBulletSerializer";
import { GFFObject } from "@core/resource/GFFObject";
import * as THREE from "three";
import { GameState } from "@engine/runtime/GameState";
import { getDefaultRuntimeContext } from "@engine/runtime/context";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import { OdysseyModel } from "@engine/odyssey";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { MDLLoader } from "@engine/loaders";
import type { MiniGameEnemy } from "@engine/module/minigame/MiniGameEnemy";
import type { MiniGamePlayer } from "@engine/module/minigame/MiniGamePlayer";
import type { MiniGameObstacle } from "@engine/module/minigame/MiniGameObstacle";
import { hitCheckPart, type MGHitCheckOut } from "@engine/module/minigame/MGHitCheck";
import type { MGBulletHitInfo } from "@engine/module/minigame/MGBulletHit";

/**
* MiniGameGunBullet class.
*
* Class representing a bullet that was spawned from gun banks found in minigame modules.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file MiniGameGunBullet.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class MiniGameGunBullet extends GameObject {
  owner: GameObject;
  life: number;
  direction: THREE.Vector3;
  velocity: THREE.Vector3;
  lifespan: any;
  model_name: string = '';
  collision_sound: string = '';
  rate_of_fire: any;
  target_type: any;
  damage_amt: number = 0;
  /** True after a hit; culled next update (unless exploding). */
  hit: boolean = false;
  /** explode-anim hold before gob destroy. */
  exploding: boolean = false;

  /** GetPreviousPosition → GetPosition segment for HitCheckPart. */
  directionLine: THREE.Line3 = new THREE.Line3();
  directionLinePoint: THREE.Vector3 = new THREE.Vector3();
  /** Last HitCheckPart world hit (explode orient). */
  lastHitPoint: THREE.Vector3 = new THREE.Vector3();
  lastHitNormal: THREE.Vector3 = new THREE.Vector3();
  private static _hitOut: MGHitCheckOut = {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
  };

  constructor( template: GFFObject, owner: GameObject ){
    super();
    this.objectType |= GameObjectType.MiniGameGunBullet;
    this.template = template;
    this.owner = owner;

    this.life = 0;
    this.hit = false;

    this.direction = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
  }

  /**
   * Motion / lifetime only — collision runs from MiniGame.doHitCheck (order).
   */
  update(delta = 0){
    this.life += delta;

    if(this.exploding){
      if(this.model) this.model.update(delta);
      if(this.life >= this.lifespan){
        this.disposeBullet();
        return false;
      }
      return true;
    }

    if(this.hit || this.life >= this.lifespan){
      this.disposeBullet();
      return false;
    }

    this.velocity.set(0, this.speed * delta, 0);
    this.velocity.applyQuaternion(this.quaternion);

    // Prev → curr segment (GetPreviousPosition / GetPosition).
    this.directionLine.start.copy(this.position);
    this.directionLine.end.copy(this.position).add(this.velocity);

    this.position.add( this.velocity );
    if(this.model){
      this.model.quaternion.copy(this.quaternion);
      this.model.position.copy(this.position);
    }

    if(this.model) this.model.update(delta);
    return true;
  }

  /**
   * DoBulletHitCheck / HitCheckBullet — HitCheckPart on hitbullet parts.
   */
  doHitCheck(){
    if(this.hit || this.exploding){ return; }
    const mg = getDefaultRuntimeContext().getModule()?.area?.miniGame;
    if(!mg){ return; }

    // CSWMiniGame::DoHitCheck (0x006732f0): every bullet is tested against the
    // player, then each enemy (reverse list order), then obstacles. Only the
    // bullet's own shooter is skipped, so enemy bullets can hit other enemies.
    const shooter = this.getShooter();
    const player = mg.player;
    if(player && player !== shooter && this.hitsFollower(player)){
      this.applyHitFollower(player);
      return;
    }
    for(let i = mg.enemies.length - 1; i >= 0; i--){
      const enemy = mg.enemies[i];
      if(!enemy || enemy === shooter){ continue; }
      if(this.hitsFollower(enemy)){
        this.applyHitFollower(enemy);
        return;
      }
    }
    for(let i = mg.obstacles.length - 1; i >= 0; i--){
      const obstacle = mg.obstacles[i];
      if(this.hitsObstacle(obstacle)){
        this.applyHitObstacle(obstacle);
        return;
      }
    }
  }

  /**
   * HitCheckBullet
   * segment previous→current vs obstacle part "hitbullet" via HitCheckPart.
   */
  hitsObstacle(obstacle: MiniGameObstacle): boolean {
    if(!obstacle?.models?.length){ return false; }

    const from = this.directionLine.start;
    const to = this.directionLine.end;
    const out = MiniGameGunBullet._hitOut;

    for(let i = 0; i < obstacle.models.length; i++){
      const root = obstacle.models[i];
      if(!root){ continue; }
      const part = root.nodes?.get?.('hitbullet') || root.getObjectByName?.('hitbullet');
      if(!part){ continue; }
      if(hitCheckPart(root, part, from, to, out)){
        if(out.point) this.lastHitPoint.copy(out.point);
        if(out.normal) this.lastHitNormal.copy(out.normal);
        return true;
      }
    }

    // HitCheckBullet — no hitbullet part → miss (no proximity stand-in).
    return false;
  }

  /**
   * DoBulletHitCheck (0x0066d4e0) on follower models — HitCheckPart against the
   * "hitbullet" part only. No part → miss (no sphere stand-in).
   */
  hitsFollower(target: MiniGamePlayer | MiniGameEnemy): boolean {
    if(!target){ return false; }
    const from = this.directionLine.start;
    const to = this.directionLine.end;
    const out = MiniGameGunBullet._hitOut;
    const models = (target as MiniGamePlayer).models || (target as MiniGameEnemy).models;
    if(!models?.length){ return false; }

    for(let i = 0; i < models.length; i++){
      const root = models[i];
      if(!root){ continue; }
      const part = root.nodes?.get?.('hitbullet') || root.getObjectByName?.('hitbullet');
      if(!part){ continue; }
      if(hitCheckPart(root, part, from, to, out)){
        if(out.point) this.lastHitPoint.copy(out.point);
        if(out.normal) this.lastHitNormal.copy(out.normal);
        return true;
      }
    }
    return false;
  }

  /** Follower (player / enemy) that owns the gun bank this bullet came from. */
  getShooter(): GameObject | undefined {
    const owner = this.owner as any;
    return owner?.owner || owner;
  }

  /**
   * Copy this bullet's hit data onto the target's per-object record
   * (CSWMiniGameObject last-bullet fields read by OnHitBullet / SWMG getters).
   */
  recordHitOn(target: { lastBulletHit?: MGBulletHitInfo } | undefined){
    const info = target?.lastBulletHit;
    if(!info){ return; }
    info.damage = this.damage_amt || 0;
    info.targetType = Number(this.target_type) || 0;
    info.collisionSound = this.collision_sound || '';
    info.point.copy(this.lastHitPoint);
    info.shooter = this.getShooter();
    info.part = 'hitbullet';
  }

  applyHitFollower(target: MiniGamePlayer | MiniGameEnemy){
    this.hit = true;
    const mg = getDefaultRuntimeContext().getModule()?.area?.miniGame;
    mg?.recordBulletHit({
      damage: this.damage_amt || 0,
      targetType: this.target_type || 0,
      shooter: this.getShooter(),
      follower: target,
    });
    this.recordHitOn(target);
    // OnHitBullet(0): script if set, else default damage (TargetType mask) + sound.
    target.onHitBullet(this, false);
    // HitCheckBullet plays "explode" for every hit, followers included.
    this.playExplodeThenCull();
  }

  applyHitObstacle(obstacle: MiniGameObstacle){
    this.hit = true;
    const mg = getDefaultRuntimeContext().getModule()?.area?.miniGame;
    mg?.recordBulletHit({
      damage: this.damage_amt || 0,
      targetType: this.target_type || 0,
      shooter: this.getShooter(),
      obstacle,
    });
    this.recordHitOn(obstacle);
    // Obstacles are not followers — no HP change; default path only plays the sound.
    obstacle.onHitBullet?.(this, false);
    // : PlayAnimation("explode"); on success RegisterCallBack(doneexplode); else destroy gob.
    this.playExplodeThenCull();
  }

  /**
   * HitCheckBullet explode path — play "explode" if present, else dispose next frame.
   */
  playExplodeThenCull(){
    const model = this.model as OdysseyModel3D | undefined;
    const anim = model?.odysseyAnimationMap?.get?.('explode');
    if(!anim || !model){
      return;
    }
    this.exploding = true;
    this.hit = false;
    model.playAnimation(anim, false);
    const duration = typeof (anim as any).length === 'number' ? (anim as any).length : 0.5;
    this.lifespan = this.life + Math.max(0.05, duration);
  }

  disposeBullet(){
    if(this.model){
      this.model.dispose?.();
      if(this.model.parent){
        this.model.parent.remove(this.model);
      }
    }
  }

  updatePaused(delta: number = 0){
    
  }

  load(){
    this.initProperties();
    return new Promise<void>( (resolve, reject) => {
      this.loadModel().then( () => {
        resolve();
      }).catch(reject);
    });
  }

  loadModel(){
    const resref = this.model_name.replace(/\0[\s\S]*$/g,'').toLowerCase();
    if(!resref){
      return Promise.reject(new Error('MiniGameGunBullet: empty Bullet_Model'));
    }
    return MDLLoader.loader.load(resref).then(
      (mdl: OdysseyModel) => OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        castShadow: false,
        receiveShadow: false,
      })
    ).then((model: OdysseyModel3D) => {
      this.model = model;
    });
  }

  initProperties(){
    miniGameGunBulletSerializer.deserialize(this, this.template);
    this.initialized = true;
  }

}
