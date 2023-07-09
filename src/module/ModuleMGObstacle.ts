/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleObject } from ".";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { LayoutObstacle } from "../interface/resource/LayoutObstacle";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFObject } from "../resource/GFFObject";
import { AsyncLoop } from "../utility/AsyncLoop";

/* @file
 * The ModuleMGObstacle class.
 */

export class ModuleMGObstacle extends ModuleObject {
  invince: number;
  hit_points: number;
  max_hps: number = 0;
  invince_period: number;
  layout: LayoutObstacle;

  constructor(template: GFFObject, layout: LayoutObstacle){
    super(template);
    this.objectType |= ModuleObjectType.ModuleMGObstacle;
    this.name = '';
    this.invince = 0;
    this.layout = layout;
  }

  setTemplate(template: GFFObject){
    this.template = template;
    this.initProperties();
  }

  update(delta: number = 0){

    this.invince -= delta;
    if(this.invince < 0) this.invince = 0;

  }

  updatePaused(delta: number = 0){
    
  }

  damage(damage = 0){

  }

  adjustHitPoints(nHP = 0, nAbsolute = 0){
    this.hit_points += nHP;
  }

  startInvulnerability(){
    this.invince = this.invince_period || 0;
  }

  onAnimEvent(){
    if(this.scripts.onAnimEvent instanceof NWScriptInstance){
      this.scripts.onAnimEvent.nwscript.newInstance().run(this, 0);
    }
  }

  onCreate(){
    if(this.scripts.onCreate instanceof NWScriptInstance){
      this.scripts.onCreate.nwscript.newInstance().run(this, 0);
    }
  }

  onHitBullet(){
    if(this.scripts.onHitBullet instanceof NWScriptInstance){
      this.scripts.onHitBullet.nwscript.newInstance().run(this, 0);
    }
  }

  onHitFollower(){
    if(this.scripts.onHitFollower instanceof NWScriptInstance){
      this.scripts.onHitFollower.nwscript.newInstance().run(this, 0);
    }
  }

  loadScripts (){
    this.scripts = {
      onAnimEvent: undefined,
      onCreate: undefined,
      onHeartbeat: undefined,
      onHitBullet: undefined,
      onHitFollower: undefined,
    };

    let scriptsNode = this.template.GetFieldByLabel('Scripts').GetChildStructs()[0];
    if(scriptsNode){
      
      if(scriptsNode.HasField('OnAnimEvent'))
        this.scripts.onAnimEvent = scriptsNode.GetFieldByLabel('OnAnimEvent').GetValue();

      if(scriptsNode.HasField('OnCreate'))
        this.scripts.onCreate = scriptsNode.GetFieldByLabel('OnCreate').GetValue();

      if(scriptsNode.HasField('OnHeartbeat'))
        this.scripts.onHeartbeat = scriptsNode.GetFieldByLabel('OnHeartbeat').GetValue();
      
      if(scriptsNode.HasField('OnHitBullet'))
        this.scripts.onHitBullet = scriptsNode.GetFieldByLabel('OnHitBullet').GetValue();

      if(scriptsNode.HasField('OnHitFollower'))
        this.scripts.onHitFollower = scriptsNode.GetFieldByLabel('OnHitFollower').GetValue();

    }

    let keys = Object.keys(this.scripts);
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = NWScript.Load(_script);
      }
    }

  }

  initProperties(){
    if(this.template.RootNode.HasField('Name'))
      this.name = this.template.GetFieldByLabel('Name').GetValue().toLowerCase();

    this.initialized = true;
  }


}
