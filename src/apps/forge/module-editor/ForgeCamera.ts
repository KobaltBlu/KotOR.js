import { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";
import * as KotOR from "@/apps/forge/KotOR";
import * as THREE from "three";
import {
  cameraOrientationFromYaw,
  setCameraOrientationFromYaw,
  yawFromCameraOrientation,
} from "@/apps/forge/helpers/cameraOrientation";

export class ForgeCamera extends ForgeGameObject {
  aspectRatio: number = 1;
  cameraID: number = -1;
  fov: number = 45;
  height: number = 0;
  micRange: number = 0;
  pitch: number = 90;

  /** Retail GIT Orientation (yaw-only). Not the container display quaternion. */
  orientation: THREE.Quaternion = cameraOrientationFromYaw(0);

  perspectiveCamera: THREE.PerspectiveCamera;
  cameraHelper: THREE.CameraHelper;

  constructor(){
    super();
    this.aspectRatio = 1920 / 1080;
    this.addEventListener('onPropertyChange', this.onPropertyChange.bind(this));
  }
  
  getEditorName(): string {
    return `Camera ${this.cameraID}`;
  }

  /**
   * Compose container display pose from authored Pitch + Orientation (retail YZX).
   * Does not bake pitch into Orientation.
   */
  applyEditorPose(): void {
    this.rotation.reorder('YZX');
    this.rotation.x = THREE.MathUtils.degToRad(this.pitch);
    this.rotation.y = 0;
    this.rotation.z = yawFromCameraOrientation(this.orientation);
    // Object3D keeps quaternion in sync from Euler; do not setFromEuler back
    // onto the aliased container quaternion (can flip equivalent Eulers).

    if(this.perspectiveCamera){
      this.perspectiveCamera.position.set(0, 0, this.height);
      this.perspectiveCamera.rotation.set(0, 0, 0);
      this.perspectiveCamera.updateMatrix();
      this.cameraHelper?.update();
    }
    this.updateBoundingBox();
  }

  /**
   * After the rotate gizmo mutates container Euler, split back into Pitch + Orientation.
   */
  syncAuthoredFieldsFromDisplayPose(): void {
    this.rotation.reorder('YZX');
    this.pitch = THREE.MathUtils.radToDeg(this.rotation.x);
    setCameraOrientationFromYaw(this.orientation, this.rotation.z);
    this.applyEditorPose();
  }

  onPropertyChange(property: string, _value: any, _old: any): void {
    if(property === 'pitch' || property === 'orientation' || property === 'height'){
      this.applyEditorPose();
    }
  }

  async load(){
    if(this.cameraID === -1 && this.area){
      this.cameraID = this.area.getNextCameraId();
    }

    this.perspectiveCamera?.removeFromParent();
    this.cameraHelper?.removeFromParent();

    this.applyEditorPose();

    // Child camera stays local so gizmo moves on the container are not doubled.
    this.perspectiveCamera = new THREE.PerspectiveCamera(this.fov, this.aspectRatio, 0.1, 100);
    this.perspectiveCamera.position.set(0, 0, this.height);
    this.perspectiveCamera.rotation.set(0, 0, 0);
    this.perspectiveCamera.updateMatrix();

    this.cameraHelper = new THREE.CameraHelper(this.perspectiveCamera);
    // CameraHelper defaults to camera.matrixWorld (scene-root assumption).
    // Under container, bind local matrix so parent.matrixWorld is applied once.
    this.cameraHelper.matrix = this.perspectiveCamera.matrix;

    this.container.add(this.perspectiveCamera);
    this.container.add(this.cameraHelper);
    this.updateBoundingBox();
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(14);
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.INT, 'CameraID', this.cameraID));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'FieldOfView', this.fov));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Height', this.height));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'MicRange', this.micRange));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.ORIENTATION, 'Orientation', this.orientation));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'Pitch', this.pitch));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.VECTOR, 'Position', this.position));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.cameraID = strt.getFieldByLabel('CameraID').getValue() as number;
    this.fov = strt.getFieldByLabel('FieldOfView').getValue() as number;
    this.height = strt.getFieldByLabel('Height').getValue() as number;
    this.micRange = strt.getFieldByLabel('MicRange').getValue() as number;
    this.orientation.copy(strt.getFieldByLabel('Orientation').getOrientation() as THREE.Quaternion);
    this.pitch = strt.getFieldByLabel('Pitch').getValue() as number;
    this.position.copy(strt.getFieldByLabel('Position').getVector() as THREE.Vector3);
    this.applyEditorPose();
  }

  /** Sidebar helper: facing yaw in degrees from authored Orientation. */
  getFacingYawDegrees(): number {
    return THREE.MathUtils.radToDeg(yawFromCameraOrientation(this.orientation));
  }

  setFacingYawDegrees(degrees: number): void {
    setCameraOrientationFromYaw(this.orientation, THREE.MathUtils.degToRad(degrees));
    this.applyEditorPose();
  }

}
