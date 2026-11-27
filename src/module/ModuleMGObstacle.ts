import { ModuleObject } from "@/module/ModuleObject";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ILayoutObstacle } from "@/interface/resource/ILayoutObstacle";
import { NWScript } from "@/nwscript/NWScript";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { GFFObject } from "@/resource/GFFObject";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { GameState } from "@/GameState";

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
  readonly supportsRuntimeStatePersistence: boolean = false;

  invince: number;
  hit_points: number;
  max_hps: number = 0;
  invince_period: number;
  layout: ILayoutObstacle;

  constructor(template: GFFObject | undefined, layout: ILayoutObstacle){
    super();
    this.objectType |= ModuleObjectType.ModuleMGObstacle;
    this.name = '';
    this.invince = 0;
    this.layout = layout;
    this.position.copy(layout.position);

    if(template){
      this.template = template;
      this.initProperties();
      this.loadScripts();
    }
  }

  setTemplate(template: GFFObject){
    this.template = template;
    this.initProperties();
    this.loadScripts();
  }

  async load(): Promise<void> {
    if(this.layout?.position){
      this.position.copy(this.layout.position);
    }

    if(this.template){
      this.initProperties();
      this.loadScripts();
    }else{
      this.name = this.layout?.name?.replace(/\0[\s\S]*$/g,'').toLowerCase() || '';
      this.initialized = true;
    }
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
    const onAnimEvent = this.scripts[ModuleObjectScript.MGObstacleOnAnimEvent];
    if(!onAnimEvent){ return; }
    onAnimEvent.run(this, 0);
  }

  onCreate(){
    const onCreate = this.scripts[ModuleObjectScript.MGObstacleOnCreate];
    if(!onCreate){ return; }
    onCreate.run(this, 0);
  }

  onHitBullet(){
    const onHitBullet = this.scripts[ModuleObjectScript.MGObstacleOnHitBullet];
    if(!onHitBullet){ return; }
    onHitBullet.run(this, 0);
  }

  onHitFollower(){
    const onHitFollower = this.scripts[ModuleObjectScript.MGObstacleOnHitFollower];
    if(!onHitFollower){ return; }
    onHitFollower.run(this, 0);
  }

  loadScripts(){
    const scriptKeys = [
      ModuleObjectScript.MGObstacleOnAnimEvent,
      ModuleObjectScript.MGObstacleOnCreate,
      ModuleObjectScript.MGObstacleOnHeartbeat,
      ModuleObjectScript.MGObstacleOnHitBullet,
      ModuleObjectScript.MGObstacleOnHitFollower,
    ];

    const scriptsNode = this.template?.getFieldByLabel('Scripts')?.getFieldStruct();
    if(!scriptsNode){ return; }

    for(const scriptKey of scriptKeys){
      if(!scriptsNode.hasField(scriptKey)){ continue; }
      const resRef = scriptsNode.getFieldByLabel(scriptKey).getValue();
      if(!resRef){ continue; }
      const nwscript = GameState.NWScript.Load(resRef);
      if(!nwscript){ 
        console.warn(`ModuleMGObstacle.loadScripts: Failed to load script [${scriptKey}]:${resRef} for object ${this.name}`);
        continue; 
      }
      nwscript.caller = this;
      this.scripts[scriptKey] = nwscript;
    }

  }

  initProperties(){
    this.position.copy(this.layout.position);
    this.name = this.layout?.name?.replace(/\0[\s\S]*$/g,'').toLowerCase() || '';

    if(this.template?.RootNode?.hasField('Name'))
      this.name = this.template.getFieldByLabel('Name').getValue().replace(/\0[\s\S]*$/g,'').toLowerCase();

    this.initialized = true;
  }


}
