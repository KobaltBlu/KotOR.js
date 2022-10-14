// import { Forge } from "../../Forge";
import { GameState } from "../../GameState";
import { ApplicationProfile } from "../../utility/ApplicationProfile";
import { OdysseyObject3D } from "./";
import * as THREE from "three";
import { OdysseyModel } from "../../odyssey/OdysseyModel";
import { OdysseyModelNodeLight } from "../../odyssey/OdysseyModelNodeLight";


//THREE.js representation of AuroraLight
export class OdysseyLight3D extends OdysseyObject3D {

  _node: OdysseyModelNodeLight;
  // odysseyModel: OdysseyModel;
  worldPosition: THREE.Vector3;
  sphere: THREE.Sphere;
  isAnimated: boolean;
  parentUUID: string;
  priority: number;
  isAmbient: boolean;
  isDynamic: boolean;
  affectDynamic: boolean;
  genFlare: boolean;
  isFading: number;
  maxIntensity: number;
  color: THREE.Color;

  constructor(node: OdysseyModelNodeLight){
    super(node);
    this._node = node;
    this.type = 'AuroraLight';
    this.worldPosition = new THREE.Vector3();
    this.sphere = new THREE.Sphere();
  }

  getIntensity(){
    if(this._node)
      //return this._node.multiplier;
      return 0.5;//(this._node.multiplier > 1 && (Number(this._node.multiplier) === this._node.multiplier && this._node.multiplier % 1 === 0) ? this._node.multiplier : this._node.multiplier);
    else
      return 0;
  }

  getRadius(){
    if(this._node)
      return this._node.radius;
    else
      return 0;
  }

  isOnScreen( frustum = GameState.viewportFrustum ){
    // if(ApplicationProfile.MODE == 'FORGE'){
    //   if(Forge.tabManager.currentTab instanceof ModuleEditorTab){
    //     if(!this.odysseyModel.visible)
    //       return false;
        
    //     frustum = Forge.tabManager.currentTab.viewportFrustum;
    //     this.sphere.center.copy(this.worldPosition);
    //     this.sphere.radius = this.getRadius();
    //     return frustum.intersectsSphere(this.sphere);
    //   }
    //   return false;
    // }else{
      if(!this.odysseyModel.visible)
        return false;

      this.sphere.center.copy(this.worldPosition);
      this.sphere.radius = this.getRadius();
      return frustum.intersectsSphere(this.sphere);
    // }
  }

}