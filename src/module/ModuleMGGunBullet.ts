import { ModuleObject } from "./ModuleObject";
import { GFFObject } from "../resource/GFFObject";
import * as THREE from "three";
import { GameState } from "../GameState";
import { OdysseyModel3D } from "../three/odyssey";
import { OdysseyModel } from "../odyssey";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { MDLLoader } from "../loaders";

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

  directionLine: THREE.Line3 = new THREE.Line3();
  directionLinePoint: THREE.Vector3 = new THREE.Vector3();

  constructor( template: GFFObject, owner: ModuleObject ){
    super();
    this.objectType |= ModuleObjectType.ModuleMGGunBullet;
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

      this.directionLine.start.copy(this.position);
      this.directionLine.end.copy(this.position).add(this.velocity);

      this.position.add( this.velocity );
      this.model.quaternion.copy(this.quaternion);
      this.model.position.copy(this.position);
      
      if(this.owner.isPlayer){
        const enemies = GameState.module.area.miniGame.enemies;
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
        const player = GameState.module.area.miniGame.player;
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
