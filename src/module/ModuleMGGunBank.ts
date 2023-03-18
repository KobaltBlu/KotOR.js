/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleMGGunBullet, ModuleObject } from ".";
import { GameState } from "../GameState";
import { OdysseyModel } from "../odyssey";
import { GFFObject } from "../resource/GFFObject";
import { OdysseyModel3D } from "../three/odyssey";

/* @file
 * The ModuleMGGunBank class.
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
        GameState.audioEmitter.PlaySound(this.fire_sound);
      }

      if(this.model instanceof OdysseyModel3D){
        this.model.playAnimation('fire', false);
      }

      const bullet = new ModuleMGGunBullet( this.bulletTemplate, this );
      bullet.Load().then( () => {
        this.bullet_hook.getWorldPosition(bullet.position);
        //this.bullet_hook.getWorldQuaternion(bullet.quaternion);
        this.owner.model.getWorldQuaternion(bullet.quaternion);
        this.bullet_hook.getWorldDirection(bullet.direction);

        GameState.group.placeables.add(bullet.model);
        this.bullets.push(bullet);
      });
    }
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
    return new Promise<void>( (resolve, reject) => {
      const resref = this.gunModel.replace(/\0[\s\S]*$/g,'').toLowerCase();
      GameState.ModelLoader.load(resref).then( (mdl: OdysseyModel) => {
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

  InitProperties(){
    if(this.template.RootNode.HasField('BankID'))
      this.bankID = this.template.GetFieldByLabel('BankID').GetValue()

    if(this.template.RootNode.HasField('Fire_Sound'))
      this.fireSound = this.template.GetFieldByLabel('Fire_Sound').GetValue()

    if(this.template.RootNode.HasField('Gun_Model'))
      this.gunModel = this.template.GetFieldByLabel('Gun_Model').GetValue()

    if(this.template.RootNode.HasField('Horiz_Spread'))
      this.horizSpread = this.template.GetFieldByLabel('Horiz_Spread').GetValue()

    if(this.template.RootNode.HasField('Inaccuracy'))
      this.inaccuracy = this.template.GetFieldByLabel('Inaccuracy').GetValue()

    if(this.template.RootNode.HasField('Sensing_Radius'))
      this.sensingRadius = this.template.GetFieldByLabel('Sensing_Radius').GetValue()

    if(this.template.RootNode.HasField('Vert_Spread'))
      this.vertSpread = this.template.GetFieldByLabel('Vert_Spread').GetValue()
      
    this.bulletTemplate = GFFObject.FromStruct(this.template.RootNode.GetFieldByLabel('Bullet').GetChildStructs()[0]);
    this.proto_bullet = new ModuleMGGunBullet(this.bulletTemplate, this);
    this.proto_bullet.InitProperties();

  }

}
