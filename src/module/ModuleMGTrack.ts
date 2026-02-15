import { ModuleObject } from "@/module/ModuleObject";
import { OdysseyModel3D } from "@/three/odyssey";
import { OdysseyModel } from "@/odyssey";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import { ILayoutTrack } from "@/interface/resource/ILayoutTrack";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Module);
import { MDLLoader } from "@/loaders";

/**
* ModuleMGTrack class.
* 
* Class representing the rails that an enemy or player are attached to in minigame modules.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleMGTrack.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleMGTrack extends ModuleObject {
  index: number;
  track: string;
  layout: ILayoutTrack;

  constructor(layout: ILayoutTrack){
    super();
    this.objectType |= ModuleObjectType.ModuleMGTrack;

    this.index = 0;
    this.track = layout.name.replace(/\0[\s\S]*$/g,'').toLowerCase();
    this.position.copy(layout.position.clone());
    this.layout = layout;

  }

  update(delta: number = 0){

  }

  updatePaused(delta: number = 0){
    
  }

  async load(){
    //stub
  }

  async loadModel (){
    const mdl = await MDLLoader.loader.load(this.track);
    const model = await OdysseyModel3D.FromMDL(mdl, {
      context: this.context,
      castShadow: false,
      receiveShadow: false
    });

    try{
      log.info('track', model);
      this.model = model;
      model.name = this.track;
    }catch(e){
      log.error(e);
    }
    return this.model;
  }

}
