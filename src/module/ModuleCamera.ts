import { GameState } from "../GameState";
import { GFFDataType } from "../enums/resource/GFFDataType";
// import { ResolutionManager } from "../managers";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import * as THREE from "three";

/**
* ModuleCamera class.
* 
* Class representing a static camera found in module areas.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleCamera.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleCamera {
  cameraID: number;
  fov: number;
  height: number;
  micRange: number;
  orientation: THREE.Quaternion = new THREE.Quaternion;
  pitch: number;
  perspectiveCamera: THREE.PerspectiveCamera;
  position: THREE.Vector3 = new THREE.Vector3();
  template: GFFObject;
  initialized: boolean = false;

  constructor ( gff = new GFFObject() ) {
    this.template = gff;
  }

  load(){
    this.initProperties();
    this.buildCamera();
  }

  buildCamera(){
    if(this.perspectiveCamera){
      this.perspectiveCamera.removeFromParent();
      this.perspectiveCamera = undefined;
    }
    this.perspectiveCamera = new THREE.PerspectiveCamera(this.fov, GameState.ResolutionManager.getViewportWidth() / GameState.ResolutionManager.getViewportHeight(), 0.1, 1500);
    this.perspectiveCamera.up = new THREE.Vector3( 0, 1, 0 );
    this.perspectiveCamera.position.set(0, 0, this.height);
    this.perspectiveCamera.position.add(this.position);
    this.perspectiveCamera.rotation.reorder('YZX');
    this.perspectiveCamera.rotation.x = THREE.MathUtils.degToRad(this.pitch);
    this.perspectiveCamera.rotation.z = -Math.atan2(this.orientation.w, -this.orientation.x)*2;

    //Clipping hack
    this.perspectiveCamera.position.add(new THREE.Vector3(0, 0, 0.5).applyEuler(this.perspectiveCamera.rotation));

    this.perspectiveCamera.userData.moduleObject = this;
    this.perspectiveCamera.userData.ingameID = this.cameraID;
  }

  initProperties(){

    if(this.template.RootNode.hasField('CameraID'))
      this.cameraID = this.template.getFieldByLabel('CameraID').getValue();

    if(this.template.RootNode.hasField('FieldOfView'))
      this.fov = this.template.getFieldByLabel('FieldOfView').getValue();

    if(this.template.RootNode.hasField('Height'))
      this.height = this.template.getFieldByLabel('Height').getValue();

    if(this.template.RootNode.hasField('MicRange'))
      this.micRange = this.template.getFieldByLabel('MicRange').getValue();

    if(this.template.RootNode.hasField('Orientation'))
      this.orientation = this.template.getFieldByLabel('Orientation').getOrientation();

    if(this.template.RootNode.hasField('Pitch'))
      this.pitch = this.template.getFieldByLabel('Pitch').getValue();

    if(this.template.RootNode.hasField('Position')){
      this.position.copy(this.template.getFieldByLabel('Position').getVector());
    }

    this.initialized = true;

  }

  save(){
    let gff = new GFFObject();
    gff.RootNode.type = 14;

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'CameraID') ).setValue(this.cameraID);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'FieldOfView') ).setValue(this.fov);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Height') ).setValue(this.height);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'MicRange') ).setValue(this.micRange);
    gff.RootNode.addField( new GFFField(GFFDataType.ORIENTATION, 'Orientation') ).setValue( this.template.getFieldByLabel('Orientation').getOrientation() );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Pitch') ).setValue(this.pitch);
    gff.RootNode.addField( new GFFField(GFFDataType.VECTOR, 'Position') ).setValue( this.template.getFieldByLabel('Position').getVector() );

    this.template = gff;
    return gff;
  }

  toToolsetInstance(){

    let instance = new GFFStruct(4);
    
    instance.addField(
      new GFFField(GFFDataType.INT, 'CameraID', this.cameraID)
    );
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'FieldOfView', this.fov)
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'Height', this.height)
    );
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'MicRange', this.micRange)
    );
    
    instance.addField(
      new GFFField(GFFDataType.ORIENTATION, 'Orientation', this.orientation)
    )
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'Pitch', this.position.z)
    );
    
    instance.addField(
      new GFFField(GFFDataType.VECTOR, 'Position', this.position)
    );

    return instance;

  }

}
