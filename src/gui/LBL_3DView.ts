import * as THREE from "three";
import { GameState } from "@/GameState";
import type { LightManager } from "@/managers";
import { OdysseyModel3D, OdysseyLightingBinder } from "@/three/odyssey";
import type { GUIControl } from "@/gui/GUIControl";
import { asExtentInt } from "@/gui/GUICoord";

/**
 * Retail SetViewAngle value used by ClassSel / MainCG / PORTCUST /
 * Setup3DScene / Upgrade (0x41b5ced9 ≈ 22.726).
 */
export const GUI_3D_VIEW_FOV = 22.72;

/**
 * LBL_3DView class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file LBL_3DView.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class LBL_3DView {
  width: number;
  height: number;
  visible: boolean;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  texture: THREE.WebGLRenderTarget;
  tDepth: THREE.WebGLRenderTarget;
  clearColor: THREE.Color;
  currentCamera: THREE.Camera;
  globalLight: THREE.AmbientLight;
  lightManager: LightManager = new GameState.LightManager();
  emitters: any = {};
  _emitters: any = {};
  group: { 
    emitters: THREE.Group; 
    lights: THREE.Group; 
    light_helpers: THREE.Group; 
    shadow_lights: THREE.Group; 
    creatures: THREE.Group; 
  };
  control: any;
  frustumMat4: THREE.Matrix4;
  viewportFrustum: THREE.Frustum;
  /**
   * PrioritizeLights focus (retail Scene.focus_position, default origin).
   * GUI gobs score / GetNearestLights against the subject, not the camera.
   */
  lightFocus = new THREE.Vector3(0, 0, 0);

  /** Scratch for AttachTranslate local-space offsets. */
  private static readonly _tmpOffset = new THREE.Vector3();

  /** Standalone fallback only; prefer control extent via setControl. */
  constructor(width: number = 1, height: number = 1){

    this.width = Math.max(1, asExtentInt(width));
    this.height = Math.max(1, asExtentInt(height));
    this.visible = false;
    this.frustumMat4 = new THREE.Matrix4();
    this.viewportFrustum = new THREE.Frustum();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( GUI_3D_VIEW_FOV, this.width/this.height, 0.1, 15000 );
    this.texture = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
		this.tDepth = new THREE.WebGLRenderTarget( this.width, this.height, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat } );
    this.clearColor = new THREE.Color(0x000000);

    this.currentCamera = this.camera;

    this.globalLight = new THREE.AmbientLight(0x7F7F7F);
    this.globalLight.position.x = 0;
    this.globalLight.position.y = 0;
    this.globalLight.position.z = 0;
    this.globalLight.intensity  = 1;
    //this.scene.add(this.globalLight);
    this.camera.up = new THREE.Vector3( 0, 0, 1 );
    this.camera.updateProjectionMatrix();

    this.emitters = {};
    this._emitters = {};
    this.group = {
      emitters: new THREE.Group(),
      lights: new THREE.Group(),
      light_helpers: new THREE.Group(),
      shadow_lights: new THREE.Group(),
      creatures: new THREE.Group()
    }

    this.scene.add(this.group.emitters);
    this.scene.add(this.group.lights);
    this.scene.add(this.group.shadow_lights);
    this.scene.add(this.group.creatures);

    this.lightManager.init(this);
    // GUI 3D views have no ARE DynAmbientColor — scene ambient stays black so
    // authored model lights (and their quadratic falloff) create the mood.
    this.lightManager.setAreaAmbient(0, 0, 0);
    this.lightManager.setAreaSun(0, 0, 0);
  }

  setControl(control: GUIControl){
    this.control = control;

    const w = Math.max(1, asExtentInt(control.extent?.width ?? this.width));
    const h = Math.max(1, asExtentInt(control.extent?.height ?? this.height));
    this.setSize(w, h);

    this.control.setFillTexture(this.texture.texture);
    // this.control.getFill.material.uniforms.map.value = this.texture.texture;
    this.control.setFillColor(1, 1, 1);
  }

  /** Retail SetViewAngle — ClassSel / MainCG / PORTCUST / Setup3DScene. */
  setViewAngle(fov: number = GUI_3D_VIEW_FOV){
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Copy pose from a light-model camerahook (retail AttachToObject).
   * Optional AttachTranslate offset:
   * - worldSpace true → field=1 (Setup3DScene / MainCG): position += offset
   * - worldSpace false → field=0 (PORTCUST): rotate offset by camera orientation
   */
  attachCameraToHook(
    hook: THREE.Object3D | undefined,
    translate?: THREE.Vector3Like,
    worldSpace: boolean = true,
  ){
    if(!hook) return;
    this.camera.position.copy(hook.position);
    this.camera.quaternion.copy(hook.quaternion);
    if(translate){
      const offset = LBL_3DView._tmpOffset.set(translate.x, translate.y, translate.z);
      if(!worldSpace){
        offset.applyQuaternion(this.camera.quaternion);
      }
      this.camera.position.add(offset);
    }
    this.camera.updateProjectionMatrix();
  }

  getCamera(){
    return this.camera;
  }

  getTexture(){
    return this.texture.texture;
  }

  addModel(model: THREE.Object3D){
    if(model instanceof THREE.Object3D){
      this.scene.add(model);
    }
  }

  removeModel(model: THREE.Object3D){
    if(model instanceof THREE.Object3D){
      this.scene.remove(model);
    }
  }

  setVisible(bVisible: boolean){
    this.visible = bVisible;
  }

  setSize(width = 0, height = 0){
    this.width = Math.max(1, asExtentInt(width));
    this.height = Math.max(1, asExtentInt(height));
    this.tDepth.setSize(this.width, this.height);
    this.updateRatio();
  }

  updateRatio(){
    this.texture.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  render(delta = 0, options?: { skipModelUpdate?: boolean }){

    if(!this.visible)
      return;

    for(let emitter in this.emitters){
      this.emitters[emitter].tick(delta);
    }

    if(!options?.skipModelUpdate){
      for(let i = 0; i < this.scene.children.length; i++){
        let element = this.scene.children[i];
        if(element instanceof OdysseyModel3D){
          element.update(delta);
        }
      }
    }

    if(this.currentCamera){
      this.frustumMat4.multiplyMatrices( this.currentCamera.projectionMatrix, this.currentCamera.matrixWorldInverse )
      this.viewportFrustum.setFromProjectionMatrix(this.frustumMat4);
      // Score lights vs subject focus (Scene.focus_position, default origin).
      this.lightManager.update(delta, { position: this.lightFocus });
      // Mainmenu is an AddModel gob: GetNearestLights around focus (not room globals).
      for(let i = 0; i < this.scene.children.length; i++){
        const element = this.scene.children[i];
        if(element instanceof OdysseyModel3D){
          OdysseyLightingBinder.bindSceneModel(
            this.lightManager,
            element,
            this.currentCamera,
            this.lightFocus,
            'gob'
          );
        }
      }
    }

    let oldClearColor = new THREE.Color()
    GameState.renderer.getClearColor(oldClearColor);
    //GameState.renderer.setClearColor(this.clearColor, 1);
    GameState.renderer.setRenderTarget(this.texture);
    GameState.renderer.clear();
    GameState.renderer.render(this.scene, this.currentCamera);
    (this.texture as any).needsUpdate = true;
    GameState.renderer.setRenderTarget(null);
    //GameState.renderer.setClearColor(oldClearColor, 1);

    if(this.control){
      this.control.setFillTexture(this.texture.texture);
      this.control.setFillOpaque(false);
    }

  }


}
