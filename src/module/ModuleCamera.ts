import { GameState } from "../GameState";
import { GFFDataType } from "../enums/resource/GFFDataType";
// import { ResolutionManager } from "../managers";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import * as THREE from "three";

/**
 * Represents a static camera found in module areas.
 * 
 * ModuleCamera is used to define camera positions and properties within game areas.
 * These cameras can be used for cutscenes, dialogs to show specific viewing angles.
 * The camera data is stored in GFF format and can be loaded from area's GIT file.
 * 
 * @class ModuleCamera
 * 
 * @example
 * ```typescript
 * // Create a new camera from GFF data
 * const cameraGFF = new GFFObject();
 * const camera = new ModuleCamera(cameraGFF);
 * camera.load();
 * 
 * // Access camera properties
 * console.log(camera.cameraID); // Camera identifier
 * console.log(camera.fov); // Field of view
 * console.log(camera.position); // Camera position
 * 
 * // Get the Three.js camera object
 * const threeCamera = camera.perspectiveCamera;
 * ```
 * 
 * @file ModuleCamera.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @memberof KotOR
 */
export class ModuleCamera {
  /** Unique identifier for this camera */
  cameraID: number;
  
  /** Field of view angle in degrees */
  fov: number;
  
  /** Camera height offset */
  height: number;
  
  /** Microphone range for audio detection */
  micRange: number;
  
  /** Camera orientation as a quaternion */
  orientation: THREE.Quaternion = new THREE.Quaternion(0, 0, 0, 1);
  
  /** Camera pitch angle in degrees */
  pitch: number;
  
  /** The Three.js PerspectiveCamera instance */
  perspectiveCamera: THREE.PerspectiveCamera;
  
  /** Camera position in 3D space */
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  
  /** GFF template containing camera data */
  template: GFFObject;
  
  /** Whether the camera has been initialized */
  initialized: boolean = false;

  /**
   * Creates a new ModuleCamera instance.
   * 
   * @param {GFFObject} [gff=new GFFObject()] - The GFF template containing camera data
   * 
   * @example
   * ```typescript
   * // Create camera from existing GFF data
   * const cameraGFF = new GFFObject();
   * const camera = new ModuleCamera(cameraGFF);
   * 
   * // Create camera with default empty GFF
   * const camera = new ModuleCamera();
   * ```
   */
  constructor ( gff = new GFFObject() ) {
    this.template = gff;
  }

  /**
   * Loads camera data from the GFF template and builds the Three.js camera.
   * 
   * This method initializes all camera properties from the GFF data and creates
   * the corresponding Three.js PerspectiveCamera instance.
   * 
   * @example
   * ```typescript
   * const camera = new ModuleCamera(cameraGFF);
   * camera.load(); // Loads data and builds Three.js camera
   * ```
   */
  load(){
    this.initProperties();
    this.buildCamera();
  }

  /**
   * Builds the Three.js PerspectiveCamera instance from the camera properties.
   * 
   * This method creates a new PerspectiveCamera with the configured field of view,
   * position, orientation, and other properties. It also applies a clipping hack
   * to prevent rendering issues and sets up user data for identification.
   * 
   * @example
   * ```typescript
   * const camera = new ModuleCamera();
   * camera.fov = 75;
   * camera.position.set(10, 5, 10);
   * camera.buildCamera(); // Creates the Three.js camera
   * ```
   */
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

  /**
   * Initializes camera properties from the GFF template data.
   * 
   * This method reads all camera properties from the GFF template fields and
   * sets the corresponding instance properties. It handles optional fields
   * gracefully, only setting properties if the corresponding GFF field exists.
   * 
   * @example
   * ```typescript
   * const camera = new ModuleCamera(cameraGFF);
   * camera.initProperties(); // Loads all properties from GFF data
   * console.log(camera.cameraID); // Now populated from GFF
   * ```
   */
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
      this.orientation.copy(this.template.getFieldByLabel('Orientation').getOrientation() as THREE.Quaternion);

    if(this.template.RootNode.hasField('Pitch'))
      this.pitch = this.template.getFieldByLabel('Pitch').getValue();

    if(this.template.RootNode.hasField('Position')){
      this.position.copy(this.template.getFieldByLabel('Position').getVector() as THREE.Vector3);
    }

    this.initialized = true;

  }

  /**
   * Saves the current camera properties to a GFF object.
   * 
   * This method creates a new GFF object with all current camera properties
   * and updates the internal template. The GFF structure type is set to 14
   * (camera type) and all properties are stored with appropriate data types.
   * 
   * @returns {GFFObject} The GFF object containing the camera data
   * 
   * @example
   * ```typescript
   * const camera = new ModuleCamera();
   * camera.cameraID = 1;
   * camera.fov = 75;
   * camera.position.set(10, 5, 10);
   * 
   * const gff = camera.save();
   * console.log(gff.RootNode.type); // 14 (camera type)
   * ```
   */
  save(){
    const gff = new GFFObject();
    gff.RootNode.type = 14;

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'CameraID') ).setValue(this.cameraID);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'FieldOfView') ).setValue(this.fov);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Height') ).setValue(this.height);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'MicRange') ).setValue(this.micRange);
    gff.RootNode.addField( new GFFField(GFFDataType.ORIENTATION, 'Orientation') ).setValue({x: this.orientation.x, y: this.orientation.y, z: this.orientation.z, w: this.orientation.w});
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Pitch') ).setValue(this.pitch);
    gff.RootNode.addField( new GFFField(GFFDataType.VECTOR, 'Position') ).setValue({x: this.position.x, y: this.position.y, z: this.position.z});

    this.template = gff;
    return gff;
  }

}
