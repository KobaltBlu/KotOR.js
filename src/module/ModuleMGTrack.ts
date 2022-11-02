/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleObject } from ".";
import * as THREE from "three";
import { GameState } from "../GameState";
import { OdysseyModel3D } from "../three/odyssey";
import { OdysseyModel } from "../odyssey";
import { LayoutTrack } from "../interface/resource/LayoutTrack";

/* @file
 * The ModuleMGTrack class.
 */

export class ModuleMGTrack extends ModuleObject {
  index: number;
  track: any;
  layout: LayoutTrack;

  constructor(layout: LayoutTrack){
    super();

    this.index = 0;
    this.track = layout.name.replace(/\0[\s\S]*$/g,'').toLowerCase();
    this.position = layout.position.clone();
    this.layout = layout;

  }

  update(delta: number = 0){

  }

  updatePaused(delta: number = 0){
    
  }

  Load( onLoad?: Function ){
    if(typeof onLoad == 'function')
      onLoad();
  }

  LoadModel (onLoad?: Function){
    GameState.ModelLoader.load({
      file: this.track,
      onLoad: (mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, {
          onComplete: (model: OdysseyModel3D) => {
            try{
              console.log('track', model);
              this.model = model;
              this.position = this.model.position.copy(this.position);
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
      }
    });
  }

}
