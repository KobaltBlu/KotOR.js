import { GameState } from "@engine/runtime/GameState";
import { GFFObject } from "@core/resource/GFFObject";
import { placeableCameraOrientation } from "@engine/render/aurora-camera-orientation";
import * as THREE from "three";
import { areaCameraSerializer } from "@engine/module/serialization/AreaCameraSerializer";

/**
 * Represents a static camera found in module areas.
 *
 * AreaCamera is used to define camera positions and properties within game areas.
 * These cameras can be used for cutscenes, dialogs to show specific viewing angles.
 * The camera data is stored in GFF format and can be loaded from area's GIT file.
 *
 * @class AreaCamera
 *
 * @example
 * ```typescript
 * // Create a new camera from GFF data
 * const cameraGFF = new GFFObject;
 * const camera = new AreaCamera(cameraGFF);
 * camera.load;
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
 * @file AreaCamera.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @memberof KotOR
 */
export class AreaCamera {
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
   * Creates a new AreaCamera instance.
   *
   * @param {GFFObject} [gff=new GFFObject] - The GFF template containing camera data
   *
   * @example
   * ```typescript
   * // Create camera from existing GFF data
   * const cameraGFF = new GFFObject;
   * const camera = new AreaCamera(cameraGFF);
   *
   * // Create camera with default empty GFF
   * const camera = new AreaCamera;
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
   * const camera = new AreaCamera(cameraGFF);
   * camera.load; // Loads data and builds Three.js camera
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
   * const camera = new AreaCamera;
   * camera.fov = 75;
   * camera.position.set(10, 5, 10);
   * camera.buildCamera; // Creates the Three.js camera
   * ```
   */
  buildCamera(){
    if(this.perspectiveCamera){
      this.perspectiveCamera.removeFromParent();
      this.perspectiveCamera = undefined;
    }
    // LoadPlaceableCameras / SetShotFromScript
    // / UpdateShotCamera (angle 6) / Control:
    // position.z += Height; FOV default 55;
    // orientation = YawPitchRoll(Yaw(q), Pitch(q)+Pitch, Roll(q)).
    // GFF Orientation is WXYZ (ReadFieldQuaternion).
    // Aurora Camera and Three.js both look along local −Z.
    // No near-plane pad — SetShot uses the rebuilt pose as-is.
    const fov = (typeof this.fov === 'number' && this.fov > 0) ? this.fov : 55;
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      fov,
      GameState.ResolutionManager.getViewportWidth() / GameState.ResolutionManager.getViewportHeight(),
      0.1,
      1500
    );
    this.perspectiveCamera.up = new THREE.Vector3(0, 0, 1);

    const height = typeof this.height === 'number' ? this.height : 0;
    this.perspectiveCamera.position.set(
      this.position.x,
      this.position.y,
      this.position.z + height
    );

    const pitchDeg = typeof this.pitch === 'number' ? this.pitch : 0;
    placeableCameraOrientation(this.orientation, pitchDeg, this.perspectiveCamera.quaternion);
    this.perspectiveCamera.rotation.setFromQuaternion(this.perspectiveCamera.quaternion, 'YZX');
    this.perspectiveCamera.updateMatrixWorld(true);

    this.perspectiveCamera.userData.gameObject = this;
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
   * const camera = new AreaCamera(cameraGFF);
   * camera.initProperties; // Loads all properties from GFF data
   * console.log(camera.cameraID); // Now populated from GFF
   * ```
   */
  initProperties(){
    areaCameraSerializer.deserialize(this, this.template);
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
   * const camera = new AreaCamera;
   * camera.cameraID = 1;
   * camera.fov = 75;
   * camera.position.set(10, 5, 10);
   *
   * const gff = camera.save;
   * console.log(gff.RootNode.type); // 14 (camera type)
   * ```
   */
  save(){
    const gff = areaCameraSerializer.serialize(this);
    this.template = gff;
    return gff;
  }

}
