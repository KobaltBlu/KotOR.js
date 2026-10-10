import { GameObject } from "@engine/module/GameObject";
import { miniGameGunBulletSerializer } from "@engine/module/serialization/MiniGameGunBulletSerializer";
import { GFFObject } from "@core/resource/GFFObject";
import * as THREE from "three";
import { GameState } from "@engine/runtime/GameState";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import { OdysseyModel } from "@engine/odyssey";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { MDLLoader } from "@engine/loaders";
import type { MiniGameEnemy } from "@engine/module/MiniGameEnemy";
import type { MiniGamePlayer } from "@engine/module/MiniGamePlayer";
import type { MiniGameObstacle } from "@engine/module/MiniGameObstacle";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import { hitCheckPart, type MGHitCheckOut } from "@engine/module/minigame/MGHitCheck";

import { isMGPlayer } from "@engine/module/guards/isMGPlayer";

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
    const mg = GameState.module?.area?.miniGame;
    if(!mg){ return; }

    const ownerIsPlayer = !!(this.owner as MiniGamePlayer)?.isPlayer ||
      (mg.player === this.owner);

    if(ownerIsPlayer){
      for(let i = 0, len = mg.enemies.length; i < len; i++){
        const enemy = mg.enemies[i];
        if(!enemy?.alive){ continue; }
        if(this.hitsFollower(enemy)){
          this.applyHitFollower(enemy);
          return;
        }
      }
      for(let i = 0, len = mg.obstacles.length; i < len; i++){
        const obstacle = mg.obstacles[i];
        if(this.hitsObstacle(obstacle)){
          this.applyHitObstacle(obstacle);
          return;
        }
      }
    }else{
      const player = mg.player;
      if(player?.alive && this.hitsFollower(player)){
        this.applyHitFollower(player);
        return;
      }
      for(let i = 0, len = mg.obstacles.length; i < len; i++){
        const obstacle = mg.obstacles[i];
        if(this.hitsObstacle(obstacle)){
          this.applyHitObstacle(obstacle);
          return;
        }
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
   * DoBulletHitCheck on follower models — hitbullet HitCheckPart; else sphere.
   */
  hitsFollower(target: MiniGamePlayer | MiniGameEnemy): boolean {
    if(!target){ return false; }
    const from = this.directionLine.start;
    const to = this.directionLine.end;
    const out = MiniGameGunBullet._hitOut;
    const models = (target as MiniGamePlayer).models || (target as MiniGameEnemy).models;

    if(models?.length){
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
      // Models present but no hitbullet part — no sphere fallback (requires part).
      // If none of the models had a part, fall through to sphere.
      let anyPart = false;
      for(let i = 0; i < models.length; i++){
        const root = models[i];
        if(!root){ continue; }
        if(root.nodes?.get?.('hitbullet') || root.getObjectByName?.('hitbullet')){
          anyPart = true;
          break;
        }
      }
      if(anyPart){ return false; }
    }

    return !!(target.sphere?.containsPoint?.(this.position));
  }

  applyHitFollower(target: MiniGamePlayer | MiniGameEnemy){
    this.hit = true;
    this.playCollisionSound();
    const mg = GameState.module?.area?.miniGame;
    mg?.recordBulletHit({
      damage: this.damage_amt || 0,
      targetType: this.target_type || 0,
      shooter: this.owner,
      follower: target,
    });
    if(isMGPlayer(target)){
      (target as MiniGamePlayer).onHitBullet(this);
      return;
    }
    const enemy = target as MiniGameEnemy;
    const hadScript = !!enemy.scripts?.[ScriptHook.MGEnemyOnHitBullet];
    enemy.onHitBullet();
    if(!hadScript && this.damage_amt){
      enemy.damage(this.damage_amt);
    }
  }

  applyHitObstacle(obstacle: MiniGameObstacle){
    this.hit = true;
    this.playCollisionSound();
    const mg = GameState.module?.area?.miniGame;
    mg?.recordBulletHit({
      damage: this.damage_amt || 0,
      targetType: this.target_type || 0,
      shooter: this.owner,
      obstacle,
    });
    obstacle.onHitBullet?.();
    if(this.damage_amt){
      obstacle.adjustHitPoints?.(-this.damage_amt, 0);
    }
    // : PlayAnimation("explode"); on success RegisterCallBack(doneexplode); else destroy gob.
    this.playExplodeThenCull();
  }

  /** Collision_Sound on bullet hit (follower or obstacle). */
  playCollisionSound(){
    const sfx = (this.collision_sound || '').replace(/\0[\s\S]*$/g, '').trim();
    if(!sfx){ return; }
    GameState.guiAudioEmitter?.playSoundFireAndForget?.(sfx);
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
  }

}
