import * as THREE from "three";

import * as KotOR from "@/apps/forge/KotOR";
import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";

export class ForgeCamera extends ForgeGameObject {
  aspectRatio: number = 1;
  cameraID: number = -1;
  fov: number = 45;
  height: number = 0;
  micRange: number = 0;
  pitch: number = 90

  perspectiveCamera: THREE.PerspectiveCamera;
  cameraHelper: THREE.CameraHelper;

  constructor(){
    super();
    this.aspectRatio = 1920 / 1080;
  }

  getEditorName(): string {
    return `Camera ${this.cameraID}`;
  }

  async load(){
    if(this.cameraID === -1 && this.area){
      this.cameraID = this.area.getNextCameraId();
    }
    this.perspectiveCamera = new THREE.PerspectiveCamera(this.fov, this.aspectRatio, 0.1, 100);
    this.rotation.reorder('YZX');
    this.rotation.x = THREE.MathUtils.degToRad(this.pitch);
    this.rotation.z = -Math.atan2(this.quaternion.w, -this.quaternion.x)*2;
    this.perspectiveCamera.updateMatrixWorld(true);
    this.perspectiveCamera.updateMatrix();
    this.perspectiveCamera.rotation.reorder('YZX');
    this.perspectiveCamera.rotation.x = THREE.MathUtils.degToRad(this.pitch);
    this.perspectiveCamera.rotation.z = -Math.atan2(this.quaternion.w, -this.quaternion.x)*2;

    this.perspectiveCamera.position.copy(this.position as THREE.Vector3);

    this.cameraHelper = new THREE.CameraHelper(this.perspectiveCamera);
    this.context.scene.add(this.perspectiveCamera);
    this.context.scene.add(this.cameraHelper);
    this.updateBoundingBox();
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
    this.cameraID = strt.getNumberByLabel('CameraID');
    this.fov = strt.getNumberByLabel('FieldOfView');
    this.height = strt.getNumberByLabel('Height');
    this.micRange = strt.getNumberByLabel('MicRange');
    this.quaternion.copy(strt.getFieldByLabel('Orientation').getOrientation() as THREE.Quaternion);
    this.pitch = strt.getNumberByLabel('Pitch');
    this.position.copy(strt.getFieldByLabel('Position').getVector() as THREE.Vector3);
  }

}
