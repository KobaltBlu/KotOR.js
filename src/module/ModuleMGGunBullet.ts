/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleObject } from ".";
import { GFFObject } from "../resource/GFFObject";
import * as THREE from "three";
import { GameState } from "../GameState";
import { OdysseyModel3D } from "../three/odyssey";
import { OdysseyModel } from "../odyssey";

/* @file
 * The ModuleMGGunBullet class.
 */

export class ModuleMGGunBullet extends ModuleObject {
  owner: ModuleObject;
  life: number;
  direction: THREE.Vector3;
  velocity: THREE.Vector3;
  lifespan: any;
  model_name: any;
  collision_sound: any;
  rate_of_fire: any;
  target_type: any;
  damage_amt: number;

  constructor( template: GFFObject, owner: ModuleObject ){
    super();
    this.template = template;
    this.owner = owner;

    this.life = 0;

    this.direction = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
  }

  update(delta = 0){
    this.life += delta;

    if(this.life >= this.lifespan){
      this.model.dispose();

      if(this.model.parent)
        this.model.parent.remove(this.model);

      return false;
    }else{
      this.velocity.set(0, this.speed * delta, 0);
      this.velocity.applyQuaternion(this.quaternion);
      this.position.add( this.velocity );
      this.model.quaternion.copy(this.quaternion);
      this.model.position.copy(this.position);
      
      if(this.owner.isPlayer){
        const enemies = GameState.module.area.MiniGame.Enemies;
        for(let i = 0, len = enemies.length; i < len; i++){
          const enemy = enemies[i];
          if(enemy.sphere.containsPoint(this.position)){
            enemy.damage(this.damage_amt);
            //Set the life to Infinity so it will be culled on the next pass
            this.life = Infinity;
            break;
          }
        }
      }else{
        const player = GameState.module.area.MiniGame.Player;
        if(player.sphere.containsPoint(this.position)){
          player.damage(this.damage_amt);
          //Set the life to Infinity so it will be culled on the next pass
          this.life = Infinity;
        }
      }

    }
    if(this.model) this.model.update(delta);
    return true;
  }

  updatePaused(delta: number = 0){
    
  }

  Load(){
    this.InitProperties();
    return new Promise<void>( (resolve, reject) => {
      this.LoadModel().then( () => {
        resolve();
      });
    });
  }

  LoadModel(){
    const resref = this.model_name.replace(/\0[\s\S]*$/g,'').toLowerCase();
    return new Promise<void>( (resolve, reject) => {
      GameState.ModelLoader.load(resref).then(
        (mdl: OdysseyModel) => {
          OdysseyModel3D.FromMDL(mdl, {
            onComplete: (model: OdysseyModel3D) => {
              this.model = model;
              resolve();
            }
          });
        }
      )
    });
  }

  InitProperties(){
    this.model_name = this.template.RootNode.GetFieldByLabel('Bullet_Model').GetValue();
    this.collision_sound = this.template.RootNode.GetFieldByLabel('Collision_Sound').GetValue();
    this.damage_amt = this.template.RootNode.GetFieldByLabel('Damage').GetValue();
    this.lifespan = this.template.RootNode.GetFieldByLabel('Lifespan').GetValue();
    this.rate_of_fire = this.template.RootNode.GetFieldByLabel('Rate_Of_Fire').GetValue();
    this.speed = this.template.RootNode.GetFieldByLabel('Speed').GetValue();
    this.target_type = this.template.RootNode.GetFieldByLabel('Target_Type').GetValue();

    //TSL speed needs to be increased
    if(this.speed < 1){
      this.speed *= 1000;
    }
  }

}
