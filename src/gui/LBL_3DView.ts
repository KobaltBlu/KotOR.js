import * as THREE from "three";
import { GameState } from "@/GameState";
import type { LightManager } from "@/managers";
import { OdysseyModel3D, OdysseyEmitter3D, OdysseyLightingBinder } from "@/three/odyssey";
import type { GUIControl } from "@/gui/GUIControl";
import { asExtentInt } from "@/gui/GUICoord";
import { runOdysseyDepthPrepass } from "@/utility/odysseyDepthPrepass";

/**
 * SetViewAngle value used by ClassSel / MainCG / PORTCUST /
 * Setup3DScene / Upgrade (≈ 22.726°).
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
  /**
   * Soft-particle / POINTS resolution target — sized to this view's RTT.
   * Emitters read context.depthTarget for gl_PointSize and DEPTH_TEXTURE.
   * Falling back to GameState.depthTarget (full viewport) made GUI POINTS
   * ~viewport/rtt times too large (CharGenMain gas_neut wall of smoke).
   */
  depthTarget: THREE.WebGLRenderTarget | null = null;
  /** Set by DEPTH_TEXTURE emitters during tick; cleared after prepass. */
  softDepthNeeded: boolean = false;
  /** @deprecated Unused — kept for older call sites; prefer depthTarget. */
  tDepth: THREE.WebGLRenderTarget | null = null;
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
  private _fillBound = false;
  /** Last setFillOpaque for rebinds after async chrome loads steal the map. */
  private _fillOpaque = false;
  /**
   * PrioritizeLights focus (Scene.focus_position, default origin).
   * GUI gobs score / nearest light selection against the subject, not the camera.
   */
  lightFocus = new THREE.Vector3(0, 0, 0);

  /**
   * Emitters already matured. Async / late attaches warm on next render
   * (or immediately in addModel) without re-simulating prior emitters.
   */
  private warmedEmitters = new WeakSet<OdysseyEmitter3D>();

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
    this.tDepth = null;
    this.ensureDepthTarget();
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

    // Match GameState debug defaults — helpers only when explicitly enabled.
    this.group.light_helpers.visible = false;
    this.group.shadow_lights.visible = false;

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

    this.bindFillToControl(false);
  }

  /**
   * Bind the RTT to the GUI fill slot. Clears named FILL so initTextures /
   * TextureLoader cannot race-overwrite the procedural map (that was the
   * mainmenu black-screen regression after _fillBound skipped per-frame rebinds).
   * `opaque` is retained for callers; chrome stays on the transparent pass
   * (see GUIControl.setFillOpaque).
   */
  private bindFillToControl(opaque: boolean = this._fillOpaque){
    if(!this.control){ return; }
    this._fillOpaque = opaque;
    if(this.control.border?.fill){ this.control.border.fill.texture = ''; }
    if(this.control.highlight?.fill){ this.control.highlight.fill.texture = ''; }
    this.control.setFillTexture(this.texture.texture);
    this.control.setFillColor(1, 1, 1);
    this.control.setFillOpaque(opaque);
    this._fillBound = true;
  }

  /** Rebind if async GUI chrome loads replaced the RTT or setSize recreated it. */
  private ensureFillBound(){
    if(!this.control){ return; }
    const current = this.control.getFillTexture?.();
    if(!this._fillBound || current !== this.texture.texture){
      this.bindFillToControl(this._fillOpaque);
    }
  }

  /** SetViewAngle — ClassSel / MainCG / PORTCUST / Setup3DScene. */
  setViewAngle(fov: number = GUI_3D_VIEW_FOV){
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Copy pose from a light-model camerahook (AttachToObject).
   * Optional AttachTranslate offset:
   * - worldSpace true → field=1 (Setup3DScene / MainCG): position += offset
   * - worldSpace false → field=0 (PORTCUST): rotate offset by camera orientation
   */
  attachCameraToHook(
    hook: THREE.Object3D | undefined,
    translate?: { x: number; y: number; z: number },
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
    // Score nearest lights around the camera/subject (face), not stuck origin.
    this.lightFocus.copy(this.camera.position);
  }

  getCamera(){
    return this.camera;
  }

  getTexture(){
    return this.texture.texture;
  }

  /**
   * Pack gob nearest lights onto a model immediately so the first paint after
   * a swap is not unlit (materials start with zero odysseyLight* uniforms).
   */
  bindModelLights(model: OdysseyModel3D){
    if(!this.currentCamera) return;
    this.lightManager.update(0, { position: this.lightFocus });
    OdysseyLightingBinder.bindSceneModel(
      this.lightManager,
      model,
      this.currentCamera,
      this.lightFocus,
      'gob'
    );
  }

  addModel(model: THREE.Object3D){
    if(model instanceof THREE.Object3D){
      this.scene.add(model);
      // SkinnedMesh bounds ignore bone deformation — GUI cameras often cull
      // character skins incorrectly (esp. after head attach / odd FOV).
      if(model instanceof OdysseyModel3D){
        for(let i = 0; i < model.skins.length; i++){
          model.skins[i].frustumCulled = false;
        }
        this.bindModelLights(model);
      }
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
    this.updateRatio();
  }

  updateRatio(){
    this.texture.setSize(this.width, this.height);
    this.ensureDepthTarget();
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  /** Allocate/resize depthTarget to match the color RTT. */
  private ensureDepthTarget(){
    const w = Math.max(1, this.width);
    const h = Math.max(1, this.height);
    if(!this.depthTarget){
      this.depthTarget = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      });
      this.depthTarget.texture.generateMipmaps = false;
      this.depthTarget.stencilBuffer = false;
      this.depthTarget.depthBuffer = true;
      this.depthTarget.depthTexture = new THREE.DepthTexture(w, h);
      this.depthTarget.depthTexture.type = THREE.UnsignedShortType;
    }else{
      this.depthTarget.setSize(w, h);
    }
    const dt = this.depthTarget.depthTexture;
    if(dt){
      if(!dt.image){
        dt.image = { width: w, height: h } as any;
      }else{
        dt.image.width = w;
        dt.image.height = h;
      }
      dt.needsUpdate = true;
    }
  }

  /** Update every OdysseyModel3D in the view (nested portraits under light rigs). */
  private forEachOdysseyModel(fn: (model: OdysseyModel3D) => void){
    this.scene.traverse((obj) => {
      if(obj instanceof OdysseyModel3D){
        fn(obj);
      }
    });
  }

  /** SkinnedMesh bounds ignore bone deformation — keep GUI portraits visible. */
  private ensureSkinFrustumState(model: OdysseyModel3D){
    for(let i = 0; i < model.skins.length; i++){
      model.skins[i].frustumCulled = false;
    }
  }

  /** Collect dict + model emitters for maturity warmup. */
  private collectEmitters(): OdysseyEmitter3D[] {
    const seen = new Set<OdysseyEmitter3D>();
    const list: OdysseyEmitter3D[] = [];
    const push = (e: unknown) => {
      if(e instanceof OdysseyEmitter3D && !seen.has(e)){
        seen.add(e);
        list.push(e);
      }
    };
    for(const key in this.emitters){
      push(this.emitters[key]);
    }
    this.forEachOdysseyModel((model) => {
      for(let i = 0; i < model.emitters.length; i++){
        push(model.emitters[i]);
      }
    });
    return list;
  }

  /** Mature any emitters in the view that have not been warmed yet. */
  private warmEmittersIfNeeded(){
    const emitters = this.collectEmitters();
    for(let i = 0; i < emitters.length; i++){
      const e = emitters[i];
      if(!this.warmedEmitters.has(e)){
        OdysseyEmitter3D.warmToMaturity(e);
        this.warmedEmitters.add(e);
      }
    }
  }

  render(delta = 0, options?: { skipModelUpdate?: boolean }){

    if(!this.visible)
      return;

    this.warmEmittersIfNeeded();

    for(let emitter in this.emitters){
      this.emitters[emitter].tick(delta);
    }

    if(!options?.skipModelUpdate){
      // Nested portraits (MenuCharacter under charrec_light) are NOT in
      // parent.childModels — still need their own update(). Skip only models
      // that a parent OdysseyModel3D already ticks via childModels.
      this.forEachOdysseyModel((model) => {
        this.ensureSkinFrustumState(model);
        let parent: THREE.Object3D | null = model.parent;
        while(parent && parent !== this.scene){
          if(parent instanceof OdysseyModel3D){
            const kids = parent.childModels;
            if(Array.isArray(kids) && kids.indexOf(model) >= 0){
              return;
            }
            break;
          }
          parent = parent.parent;
        }
        model.update(delta);
      });
    }else{
      this.forEachOdysseyModel((model) => this.ensureSkinFrustumState(model));
    }

    if(this.currentCamera){
      this.frustumMat4.multiplyMatrices( this.currentCamera.projectionMatrix, this.currentCamera.matrixWorldInverse )
      this.viewportFrustum.setFromProjectionMatrix(this.frustumMat4);
      // Score lights vs subject focus (Scene.focus_position, default origin).
      this.lightManager.update(delta, { position: this.lightFocus });
      // Mainmenu is an AddModel gob: nearest light selection around focus (not room globals).
      this.forEachOdysseyModel((model) => {
        let parent: THREE.Object3D | null = model.parent;
        while(parent && parent !== this.scene){
          if(parent instanceof OdysseyModel3D){
            return;
          }
          parent = parent.parent;
        }
        OdysseyLightingBinder.bindSceneModel(
          this.lightManager,
          model,
          this.currentCamera,
          this.lightFocus,
          'gob'
        );
      });
    }

    let oldClearColor = new THREE.Color()
    GameState.renderer.getClearColor(oldClearColor);
    // Soft-particle depth prepass into this view's depthTarget (not the
    // full-screen GameState.depthTarget — wrong size for POINTS / tDepth UV).
    if(this.softDepthNeeded && this.depthTarget && this.currentCamera){
      this.softDepthNeeded = false;
      runOdysseyDepthPrepass({
        scene: this.scene,
        renderer: GameState.renderer,
        camera: this.currentCamera,
        depthTarget: this.depthTarget,
      });
    }
    //GameState.renderer.setClearColor(this.clearColor, 1);
    GameState.renderer.setRenderTarget(this.texture);
    GameState.renderer.clear();
    GameState.renderer.render(this.scene, this.currentCamera);
    (this.texture as any).needsUpdate = true;
    GameState.renderer.setRenderTarget(null);
    //GameState.renderer.setClearColor(oldClearColor, 1);

    this.ensureFillBound();

  }


}
