import { ModuleObject } from "./ModuleObject";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ILayoutObstacle } from "../interface/resource/ILayoutObstacle";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFObject } from "../resource/GFFObject";

/**
* ModuleMGObstacle class.
* 
* Class representing a obstacle found in minigame modules.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleMGObstacle.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleMGObstacle extends ModuleObject {
  invince: number;
  hit_points: number;
  max_hps: number = 0;
  invince_period: number;
  layout: ILayoutObstacle;

  constructor(template: GFFObject, layout: ILayoutObstacle){
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

    let scriptsNode = this.template.getFieldByLabel('Scripts').getChildStructs()[0];
    if(scriptsNode){
      
      if(scriptsNode.hasField('OnAnimEvent'))
        this.scripts.onAnimEvent = scriptsNode.getFieldByLabel('OnAnimEvent').getValue();

      if(scriptsNode.hasField('OnCreate'))
        this.scripts.onCreate = scriptsNode.getFieldByLabel('OnCreate').getValue();

      if(scriptsNode.hasField('OnHeartbeat'))
        this.scripts.onHeartbeat = scriptsNode.getFieldByLabel('OnHeartbeat').getValue();
      
      if(scriptsNode.hasField('OnHitBullet'))
        this.scripts.onHitBullet = scriptsNode.getFieldByLabel('OnHitBullet').getValue();

      if(scriptsNode.hasField('OnHitFollower'))
        this.scripts.onHitFollower = scriptsNode.getFieldByLabel('OnHitFollower').getValue();

    }

    let keys = Object.keys(this.scripts);
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = NWScript.Load(_script);
        this.scripts[key].caller = this;
      }
    }

  }

  initProperties(){
    if(this.template.RootNode.hasField('Name'))
      this.name = this.template.getFieldByLabel('Name').getValue().toLowerCase();

    this.initialized = true;
  }


}
