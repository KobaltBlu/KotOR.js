import { ModuleObject } from "./ModuleObject";
import { GameState } from "../GameState";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { MDLLoader } from "../loaders";
import { OdysseyModel } from "../odyssey";
import { GFFObject } from "../resource/GFFObject";
import { OdysseyModel3D } from "../three/odyssey";
import { ModuleMGGunBullet } from "./ModuleMGGunBullet";

/**
* ModuleMGGunBank class.
* 
* Class representing a gunbank attached to players and enemy objects found in minigame modules.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
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
  fire_sound: any;
  bulletTemplate: any;
  bullet_hook: any;
  gunModel: any;
  bankID: any;
  fireSound: any;
  horizSpread: any;
  inaccuracy: any;
  sensingRadius: any;
  vertSpread: any;

  constructor( template: GFFObject, owner: ModuleObject, isPlayer: boolean = false ){
    super();
    this.objectType |= ModuleObjectType.ModuleMGGunBank;
    this.template = template;
    this.bullets = [];
    this.owner = owner;
    this.isPlayer = isPlayer;

    this.proto_bullet = undefined;
    
  }

  update(delta = 0){
    //Update the gun timer
    if(this.proto_bullet.fire_timer > 0){
      this.proto_bullet.fire_timer -= 1 * delta;
      if(this.proto_bullet.fire_timer < 0){
        this.proto_bullet.fire_timer = 0;
      }
    }else{
      this.proto_bullet.fire_timer = 0;
    }

    if(this.model) this.model.update(delta);

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

  fire(){
    if(!this.proto_bullet.fire_timer){
      this.proto_bullet.fire_timer = this.proto_bullet.rate_of_fire;

      if(this.fire_sound){
        GameState.audioEmitter.playSound(this.fire_sound);
      }

      if(this.model instanceof OdysseyModel3D){
        this.model.playAnimation('fire', false);
      }

      const bullet = new ModuleMGGunBullet( this.bulletTemplate, this );
      bullet.load().then( () => {
        this.bullet_hook.getWorldPosition(bullet.position);
        //this.bullet_hook.getWorldQuaternion(bullet.quaternion);
        this.owner.model.getWorldQuaternion(bullet.quaternion);
        this.bullet_hook.getWorldDirection(bullet.direction);

        GameState.group.placeables.add(bullet.model);
        this.bullets.push(bullet);
      });
    }
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
    return new Promise<void>( (resolve, reject) => {
      const resref = this.gunModel.replace(/\0[\s\S]*$/g,'').toLowerCase();
      MDLLoader.loader.load(resref).then( (mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, {
          onComplete: (model: OdysseyModel3D) => {
            this.model = model;
            this.bullet_hook = this.model.getObjectByName('bullethook0');
            resolve();
          },
          context: this.context,
          castShadow: true,
          receiveShadow: true
        });
      });
    });
  }

  initProperties(){
    if(this.template.RootNode.hasField('BankID'))
      this.bankID = this.template.getFieldByLabel('BankID').getValue()

    if(this.template.RootNode.hasField('Fire_Sound'))
      this.fireSound = this.template.getFieldByLabel('Fire_Sound').getValue()

    if(this.template.RootNode.hasField('Gun_Model'))
      this.gunModel = this.template.getFieldByLabel('Gun_Model').getValue()

    if(this.template.RootNode.hasField('Horiz_Spread'))
      this.horizSpread = this.template.getFieldByLabel('Horiz_Spread').getValue()

    if(this.template.RootNode.hasField('Inaccuracy'))
      this.inaccuracy = this.template.getFieldByLabel('Inaccuracy').getValue()

    if(this.template.RootNode.hasField('Sensing_Radius'))
      this.sensingRadius = this.template.getFieldByLabel('Sensing_Radius').getValue()

    if(this.template.RootNode.hasField('Vert_Spread'))
      this.vertSpread = this.template.getFieldByLabel('Vert_Spread').getValue()
      
    this.bulletTemplate = GFFObject.FromStruct(this.template.RootNode.getFieldByLabel('Bullet').getChildStructs()[0]);
    this.proto_bullet = new ModuleMGGunBullet(this.bulletTemplate, this);
    this.proto_bullet.initProperties();

  }

}
