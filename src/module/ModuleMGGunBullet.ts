import { ModuleObject } from "@/module/ModuleObject";
import { GFFObject } from "@/resource/GFFObject";
import * as THREE from "three";
import { GameState } from "@/GameState";
import { OdysseyModel3D } from "@/three/odyssey";
import { OdysseyModel } from "@/odyssey";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { MDLLoader } from "@/loaders";
import type { ModuleMGEnemy } from "@/module/ModuleMGEnemy";
import type { ModuleMGPlayer } from "@/module/ModuleMGPlayer";
import type { ModuleMGObstacle } from "@/module/ModuleMGObstacle";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { hitCheckPart, type MGHitCheckOut } from "@/module/minigame/MGHitCheck";

/**
* ModuleMGGunBullet class.
* 
* Class representing a bullet that was spawned from gun banks found in minigame modules.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleMGGunBullet.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleMGGunBullet extends ModuleObject {
  owner: ModuleObject;
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
  /** Retail explode-anim hold before gob destroy. */
  exploding: boolean = false;

  /** Retail GetPreviousPosition → GetPosition segment for HitCheckPart. */
  directionLine: THREE.Line3 = new THREE.Line3();
  directionLinePoint: THREE.Vector3 = new THREE.Vector3();
  /** Last HitCheckPart world hit (explode orient). */
  lastHitPoint: THREE.Vector3 = new THREE.Vector3();
  lastHitNormal: THREE.Vector3 = new THREE.Vector3();
  private static _hitOut: MGHitCheckOut = {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
  };

  constructor( template: GFFObject, owner: ModuleObject ){
    super();
    this.objectType |= ModuleObjectType.ModuleMGGunBullet;
    this.template = template;
    this.owner = owner;

    this.life = 0;
    this.hit = false;

    this.direction = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
  }

  /**
   * Motion / lifetime only — collision runs from MiniGame.doHitCheck (retail order).
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

    // Prev → curr segment (retail GetPreviousPosition / GetPosition).
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
   * Retail DoBulletHitCheck / HitCheckBullet — HitCheckPart on hitbullet parts.
   */
  doHitCheck(){
    if(this.hit || this.exploding){ return; }
    const mg = GameState.module?.area?.miniGame;
    if(!mg){ return; }

    const ownerIsPlayer = !!(this.owner as ModuleMGPlayer)?.isPlayer ||
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
   * Retail HitCheckBullet @ 006730a0 —
   * segment previous→current vs obstacle part "hitbullet" via HitCheckPart.
   */
  hitsObstacle(obstacle: ModuleMGObstacle): boolean {
    if(!obstacle?.models?.length){ return false; }

    const from = this.directionLine.start;
    const to = this.directionLine.end;
    const out = ModuleMGGunBullet._hitOut;

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

    // No hitbullet part: proximity stand-in at layout position.
    const pos = obstacle.layout?.position ?? obstacle.position;
    if(!pos){ return false; }
    const r = 1.0;
    return this.position.distanceToSquared(pos) <= r * r;
  }

  /**
   * Retail DoBulletHitCheck on follower models — hitbullet HitCheckPart; else sphere.
   */
  hitsFollower(target: ModuleMGPlayer | ModuleMGEnemy): boolean {
    if(!target){ return false; }
    const from = this.directionLine.start;
    const to = this.directionLine.end;
    const out = ModuleMGGunBullet._hitOut;
    const models = (target as ModuleMGPlayer).models || (target as ModuleMGEnemy).models;

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
      // Models present but no hitbullet part — no sphere fallback (retail requires part).
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

  applyHitFollower(target: ModuleMGPlayer | ModuleMGEnemy){
    this.hit = true;
    this.playCollisionSound();
    const mg = GameState.module?.area?.miniGame;
    mg?.recordBulletHit({
      damage: this.damage_amt || 0,
      targetType: this.target_type || 0,
      shooter: this.owner,
      follower: target,
    });
    if(BitWise.InstanceOfObject(target, ModuleObjectType.ModuleMGPlayer)){
      (target as ModuleMGPlayer).onHitBullet(this);
      return;
    }
    const enemy = target as ModuleMGEnemy;
    const hadScript = !!enemy.scripts?.[ModuleObjectScript.MGEnemyOnHitBullet];
    enemy.onHitBullet();
    if(!hadScript && this.damage_amt){
      enemy.damage(this.damage_amt);
    }
  }

  applyHitObstacle(obstacle: ModuleMGObstacle){
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
    // Retail: PlayAnimation("explode"); on success RegisterCallBack(doneexplode); else destroy gob.
    this.playExplodeThenCull();
  }

  /** Retail Collision_Sound on bullet hit (follower or obstacle). */
  playCollisionSound(){
    const sfx = (this.collision_sound || '').replace(/\0[\s\S]*$/g, '').trim();
    if(!sfx){ return; }
    GameState.guiAudioEmitter?.playSoundFireAndForget?.(sfx);
  }

  /**
   * Retail HitCheckBullet explode path — play "explode" if present, else dispose next frame.
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
      });
    });
  }

  loadModel(){
    const resref = this.model_name.replace(/\0[\s\S]*$/g,'').toLowerCase();
    return new Promise<void>( (resolve, reject) => {
      MDLLoader.loader.load(resref).then(
        (mdl: OdysseyModel) => {
          OdysseyModel3D.FromMDL(mdl, {
            context: this.context,
            onComplete: (model: OdysseyModel3D) => {
              this.model = model;
              resolve();
            }
          });
        }
      )
    });
  }

  initProperties(){
    this.model_name = this.template.RootNode.getFieldByLabel('Bullet_Model').getValue();
    this.collision_sound = this.template.RootNode.getFieldByLabel('Collision_Sound').getValue();
    this.damage_amt = this.template.RootNode.getFieldByLabel('Damage').getValue();
    this.lifespan = this.template.RootNode.getFieldByLabel('Lifespan').getValue();
    this.rate_of_fire = this.template.RootNode.getFieldByLabel('Rate_Of_Fire').getValue();
    this.speed = this.template.RootNode.getFieldByLabel('Speed').getValue();
    this.target_type = this.template.RootNode.getFieldByLabel('Target_Type').getValue();

    //TSL speed needs to be increased
    if(this.speed < 1){
      this.speed *= 1000;
    }
  }

}
