/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleObject } from ".";
import * as THREE from "three";
import { GameState } from "../GameState";
import { OdysseyModel3D } from "../three/odyssey";
import { OdysseyModel } from "../odyssey";

/* @file
 * The ModuleMGTrack class.
 */

export class ModuleMGTrack extends ModuleObject {
  index: number;
  track: any;

  constructor(args: any = {}){
    super();

    args = Object.assign({
      track: '',
      x: 0,
      y: 0,
      z: 0
    }, args);

    this.index = 0;
    this.track = args.name.replace(/\0[\s\S]*$/g,'').toLowerCase();
    this.position = new THREE.Vector3(parseFloat(args.x), parseFloat(args.y), parseFloat(args.z));

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
