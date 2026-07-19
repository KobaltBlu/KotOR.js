import * as THREE from "three";
import { LightManager } from "@/managers/LightManager";
import { GameState } from "@/GameState";
import {
  retailStencilShadowDisk,
  retailStencilShadowOpacity,
  RETAIL_STENCIL_SHADOW_SEGMENTS,
} from "@/utility/retailLighting";

interface ICasterStencilState {
  colorWrite: boolean;
  depthWrite: boolean;
  stencilWrite: boolean;
  stencilFunc: THREE.StencilFunc;
  stencilRef: number;
  stencilZPass: THREE.StencilOp;
}

interface ICasterSave {
  mesh: THREE.Mesh;
  visible: boolean;
  materials: THREE.Material[];
  state: ICasterStencilState[];
}

/**
 * ShadowBlobManager — retail-equivalent stencil-masked shadow disks.
 *
 * Aligns with Scene::RenderStencilShadowsForThisLight @ 00450730:
 * - dark ground disks at focus Z
 * - opacity shadowAlpha * 0.5
 * - radius from light/shadow radius (clamped / foreshortened by Δz)
 * - ten-segment fan geometry
 * - stencil mask written from caster meshes (castShadow / flagShadow)
 *
 * Soft path (Graphics Options.Soft Shadows) uses a radial alpha falloff instead
 * of the legacy NV/ATI image-space soft-shadow extensions.
 *
 * Mask pass uses a dedicated camera layer so non-casters are skipped without
 * a full-scene hide traverse.
 */
export class ShadowBlobManager {
  /** Camera/object layer bit used only for stencil mask draws. */
  static STENCIL_LAYER = 7;

  group = new THREE.Group();
  private blobs: THREE.Mesh[] = [];
  private geometry: THREE.CircleGeometry;
  private hardMaterial: THREE.MeshBasicMaterial;
  private softTexture: THREE.DataTexture;
  private lightManager: LightManager;
  private focus = new THREE.Vector3();
  private _world = new THREE.Vector3();
  private _castersScratch: THREE.Mesh[] = [];
  private _savedScratch: ICasterSave[] = [];
  private _blobVisScratch: boolean[] = [];

  init(lightManager: LightManager, parent?: THREE.Object3D){
    this.lightManager = lightManager;
    this.rebuildBlobs();
    if(parent && this.group.parent !== parent){
      parent.add(this.group);
    }
  }

  /** Rebuild disk pool to match LightManager.MAXSHADOWLIGHTS. */
  rebuildBlobs(){
    const maxBlobs = Math.max(1, LightManager.MAXSHADOWLIGHTS);

    if(this.geometry){ this.geometry.dispose(); }
    // Retail fan uses 10 circumferential samples @ 00450730.
    this.geometry = new THREE.CircleGeometry(1, RETAIL_STENCIL_SHADOW_SEGMENTS);

    if(this.hardMaterial){ this.hardMaterial.dispose(); }
    this.hardMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      // Retail glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA) for hard path
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      stencilWrite: false,
      stencilFunc: THREE.EqualStencilFunc,
      stencilRef: 1,
      stencilZPass: THREE.KeepStencilOp,
    });

    if(!this.softTexture){
      this.softTexture = this.createSoftDiskTexture();
    }

    while(this.blobs.length){
      const m = this.blobs.pop();
      this.group.remove(m);
      (m.material as THREE.Material)?.dispose?.();
    }

    const soft = !!this.lightManager?.softShadowsEnabled;
    for(let i = 0; i < maxBlobs; i++){
      // Retail glStencilFunc bit: 1 << (lightIndex)
      const stencilRef = 1 << (i % 8);
      const mat = this.hardMaterial.clone();
      if(soft){
        mat.map = this.softTexture;
      }
      mat.stencilFunc = THREE.EqualStencilFunc;
      mat.stencilRef = stencilRef;
      mat.stencilWrite = false;
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.visible = false;
      mesh.renderOrder = -1;
      mesh.frustumCulled = false;
      mesh.userData.stencilRef = stencilRef;
      mesh.userData.lightIndex = i;
      this.blobs.push(mesh);
      this.group.add(mesh);
    }
  }

  private createSoftDiskTexture(): THREE.DataTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    const cx = (size - 1) * 0.5;
    for(let y = 0; y < size; y++){
      for(let x = 0; x < size; x++){
        const dx = (x - cx) / cx;
        const dy = (y - cx) / cx;
        const d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
        const a = Math.max(0, 1 - d * d);
        const i = (y * size + x) * 4;
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = Math.round(a * 255);
      }
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Update blob disks from GetShadowLights(mode=0) + GameState.shadowAlpha.
   * @param focus World focus (player / camera target) — retail focus_position
   */
  update(focus: THREE.Vector3){
    if(!this.lightManager){ return; }
    this.focus.copy(focus);

    if(this.blobs.length !== Math.max(1, LightManager.MAXSHADOWLIGHTS)){
      this.rebuildBlobs();
    }

    // SunShadows / MoonShadows off → GameState.shadowAlpha forced to 0 in applyLightingColors.
    const opacity = retailStencilShadowOpacity(GameState.shadowAlpha);
    const lights = this.lightManager.shadowLights;

    for(let i = 0; i < this.blobs.length; i++){
      const mesh = this.blobs[i];
      const light = lights[i];
      if(!light || opacity <= 0){
        mesh.visible = false;
        continue;
      }

      const disk = retailStencilShadowDisk(
        light.worldPosition.x,
        light.worldPosition.y,
        light.worldPosition.z + (light.verticalDisplacement || 0),
        light.getRadius(),
        light.shadowRadius || 0,
        this.focus.x,
        this.focus.y,
        this.focus.z
      );

      if(!(disk.radius > 0.01)){
        mesh.visible = false;
        continue;
      }

      mesh.visible = true;
      // Small bias to avoid z-fighting with ground; retail draws at focus Z.
      mesh.position.set(disk.x, disk.y, disk.z + 0.05);
      mesh.scale.set(disk.radius, disk.radius, 1);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      // Exact zero shadow fade must remain zero (no fadeFactor fallback).
      const fade = Number.isFinite(light.shadowFadeFactor) ? light.shadowFadeFactor : 0;
      mat.opacity = opacity * fade;
      mat.stencilRef = mesh.userData.stencilRef || (1 << (i % 8));
    }
  }

  /**
   * Write per-light stencil masks from caster meshes into the current render
   * target. Disks use EqualStencilFunc so they only darken masked ground.
   * Caller owns color/depth clears; this clears stencil when clearStencil is true.
   */
  renderStencilMasks(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    clearStencil = true
  ){
    if(!this.lightManager || !renderer || !scene || !camera){ return; }
    const lights = this.lightManager.shadowLights;
    if(!lights.length || retailStencilShadowOpacity(GameState.shadowAlpha) <= 0){
      return;
    }

    const gl = renderer.getContext() as WebGLRenderingContext;
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    const prevStencilMask = gl.getParameter(gl.STENCIL_WRITEMASK);
    gl.stencilMask(0xff);
    if(clearStencil){
      gl.clearStencil(0);
      gl.clear(gl.STENCIL_BUFFER_BIT);
    }

    const casters = this._castersScratch;
    casters.length = 0;
    const stencilLayer = ShadowBlobManager.STENCIL_LAYER;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if(mesh.isMesh && mesh.castShadow && mesh.visible && !this.blobs.includes(mesh)){
        mesh.layers.enable(stencilLayer);
        casters.push(mesh);
      }
    });
    if(!casters.length){
      gl.stencilMask(prevStencilMask);
      renderer.autoClear = prevAutoClear;
      return;
    }

    const saved = this._savedScratch;
    saved.length = 0;
    for(let i = 0; i < casters.length; i++){
      const mesh = casters[i];
      const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        .filter((m): m is THREE.Material => m instanceof THREE.Material);
      let entry = saved[i];
      if(!entry){
        entry = { mesh, visible: true, materials: [], state: [] };
        saved[i] = entry;
      }
      entry.mesh = mesh;
      entry.visible = mesh.visible;
      entry.materials = materials;
      const state = entry.state;
      state.length = materials.length;
      for(let mi = 0; mi < materials.length; mi++){
        const mat = materials[mi];
        let st = state[mi];
        if(!st){
          st = {
            colorWrite: true,
            depthWrite: true,
            stencilWrite: false,
            stencilFunc: THREE.AlwaysStencilFunc,
            stencilRef: 0,
            stencilZPass: THREE.KeepStencilOp,
          };
          state[mi] = st;
        }
        st.colorWrite = (mat as any).colorWrite !== false;
        st.depthWrite = mat.depthWrite;
        st.stencilWrite = mat.stencilWrite;
        st.stencilFunc = mat.stencilFunc;
        st.stencilRef = mat.stencilRef;
        st.stencilZPass = mat.stencilZPass;
      }
    }
    saved.length = casters.length;

    const blobVis = this._blobVisScratch;
    blobVis.length = this.blobs.length;
    for(let i = 0; i < this.blobs.length; i++){
      blobVis[i] = this.blobs[i].visible;
      this.blobs[i].visible = false;
    }

    const prevLayersMask = camera.layers.mask;
    camera.layers.set(stencilLayer);

    for(let i = 0; i < lights.length && i < this.blobs.length; i++){
      const light = lights[i];
      const stencilRef = (this.blobs[i].userData.stencilRef as number) || (1 << (i % 8));
      const lightRadius = Math.max(light.shadowRadius || 0, light.getRadius());
      if(!(lightRadius > 0)){ continue; }

      for(let ci = 0; ci < saved.length; ci++){
        const entry = saved[ci];
        const dist = entry.mesh.getWorldPosition(this._world).distanceTo(light.worldPosition);
        entry.mesh.visible = dist <= lightRadius + 2;
        for(let mi = 0; mi < entry.materials.length; mi++){
          const mat = entry.materials[mi];
          (mat as any).colorWrite = false;
          mat.depthWrite = false;
          mat.stencilWrite = true;
          mat.stencilFunc = THREE.AlwaysStencilFunc;
          mat.stencilRef = stencilRef;
          mat.stencilZPass = THREE.ReplaceStencilOp;
        }
      }

      renderer.render(scene, camera);
    }

    camera.layers.mask = prevLayersMask;

    for(let i = 0; i < saved.length; i++){
      const entry = saved[i];
      entry.mesh.visible = entry.visible;
      for(let mi = 0; mi < entry.materials.length; mi++){
        const mat = entry.materials[mi];
        const prev = entry.state[mi];
        (mat as any).colorWrite = prev.colorWrite;
        mat.depthWrite = prev.depthWrite;
        mat.stencilWrite = prev.stencilWrite;
        mat.stencilFunc = prev.stencilFunc;
        mat.stencilRef = prev.stencilRef;
        mat.stencilZPass = prev.stencilZPass;
      }
    }
    for(let i = 0; i < this.blobs.length; i++){
      this.blobs[i].visible = blobVis[i];
    }

    gl.stencilMask(prevStencilMask);
    renderer.autoClear = prevAutoClear;
  }

  dispose(){
    for(const mesh of this.blobs){
      this.group.remove(mesh);
      (mesh.material as THREE.Material)?.dispose?.();
    }
    this.blobs = [];
    this.geometry?.dispose?.();
    this.hardMaterial?.dispose?.();
    this.softTexture?.dispose?.();
  }
}
