import { ForgeGameObject } from "./ForgeGameObject";
import * as KotOR from "../KotOR";

export class ForgeCamera extends ForgeGameObject {
  cameraID: number = 0;
  fov: number = 0;
  height: number = 0;
  micRange: number = 0;
  pitch: number = 0;

  constructor(){
    super();
  }

  async load(){
    
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(14);
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'CameraID', this.cameraID));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'FieldOfView', this.fov));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Height', this.height));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MicRange', this.micRange));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.ORIENTATION, 'Orientation', this.quaternion));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Pitch', this.pitch));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.VECTOR, 'Position', this.position));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.cameraID = strt.getFieldByLabel('CameraID').getValue() as number;
    this.fov = strt.getFieldByLabel('FieldOfView').getValue() as number;
    this.height = strt.getFieldByLabel('Height').getValue() as number;
    this.micRange = strt.getFieldByLabel('MicRange').getValue() as number;
    this.quaternion.copy(strt.getFieldByLabel('Orientation').getOrientation() as THREE.Quaternion);
    this.pitch = strt.getFieldByLabel('Pitch').getValue() as number;
    this.position.copy(strt.getFieldByLabel('Position').getVector() as THREE.Vector3);
  }

}