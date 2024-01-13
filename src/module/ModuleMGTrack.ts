import { ModuleObject } from "./ModuleObject";
import { GameState } from "../GameState";
import { OdysseyModel3D } from "../three/odyssey";
import { OdysseyModel } from "../odyssey";
import { ILayoutTrack } from "../interface/resource/ILayoutTrack";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { MDLLoader } from "../loaders";

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
  track: any;
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

  load( onLoad?: Function ){
    if(typeof onLoad == 'function')
      onLoad();
  }

  loadModel (onLoad?: Function){
    MDLLoader.loader.load(this.track).then((mdl: OdysseyModel) => {
      OdysseyModel3D.FromMDL(mdl, {
        onComplete: (model: OdysseyModel3D) => {
          try{
            console.log('track', model);
            this.model = model;
            model.name = this.track;
            if(typeof onLoad == 'function')
              onLoad(this.model);
          }catch(e){
            console.error(e);
            if(typeof onLoad == 'function')
              onLoad(this.model);
          }
        },
        context: this.context,
        castShadow: false,
        receiveShadow: false
      });
    });
  }

}
