import * as THREE from "three";
import { ILayoutTrack } from "../../../interface/resource/ILayoutTrack";

export class ForgeMGTrack {
  // Basic properties
  name: string = '';
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  index: number = 0;

  constructor(layout?: ILayoutTrack){
    if(layout){
      this.loadFromLayout(layout);
    }
  }

  loadFromLayout(layout: ILayoutTrack){
    this.name = layout.name.replace(/\0[\s\S]*$/g,'').toLowerCase();
    this.position = layout.position.clone();
  }
}

