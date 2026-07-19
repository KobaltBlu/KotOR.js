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
  depthTest: boolean;
  stencilWrite: boolean;
  stencilWriteMask: number;
  stencilFunc: THREE.StencilFunc;
  stencilRef: number;
  stencilFail: THREE.StencilOp;
  stencilZFail: THREE.StencilOp;
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
 * - depth test disabled while drawing the disk
 * - stencil Equal + Keep (mask written by caster meshes first)
 * - ten-segment fan geometry
 *
 * Three.js only enables the stencil *test* when material.stencilWrite is true
 * (see WebGLRenderer setMaterial). Disks therefore keep stencilWrite=true with
 * stencilWriteMask=0 so Equal is applied without modifying the stencil buffer.
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
  private _hiddenScratch: THREE.Object3D[] = [];

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
      // Retail glDisable(GL_DEPTH_TEST) while drawing the disk @ 00450730.
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      // Three.js gates stencil *test* on stencilWrite — keep write on with mask 0.
      stencilWrite: true,
      stencilWriteMask: 0,
      stencilFunc: THREE.EqualStencilFunc,
      stencilRef: 1,
      stencilFail: THREE.KeepStencilOp,
      stencilZFail: THREE.KeepStencilOp,
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
      // Retail glStencilFunc bit: 1 << (lightIndex)  (param_3 is 1-based in retail)
      const stencilRef = 1 << (i % 8);
      const mat = this.hardMaterial.clone();
      if(soft){
        mat.map = this.softTexture;
      }
      this.applyDiskStencilState(mat, stencilRef);
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.visible = false;
      // After opaque geometry; depthTest is off so order among transparent only.
      mesh.renderOrder = 1;
      mesh.frustumCulled = false;
      mesh.userData.stencilRef = stencilRef;
      mesh.userData.lightIndex = i;
      this.blobs.push(mesh);
      this.group.add(mesh);
    }
  }

  private applyDiskStencilState(mat: THREE.MeshBasicMaterial, stencilRef: number){
    mat.stencilWrite = true;
    mat.stencilWriteMask = 0;
    mat.stencilFunc = THREE.EqualStencilFunc;
    mat.stencilRef = stencilRef;
    mat.stencilFuncMask = 0xffffffff;
    mat.stencilFail = THREE.KeepStencilOp;
    mat.stencilZFail = THREE.KeepStencilOp;
    mat.stencilZPass = THREE.KeepStencilOp;
    mat.depthTest = false;
    mat.depthWrite = false;
    mat.needsUpdate = true;
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
      // Retail draws the disk at focus Z (no +bias); depth test is off.
      mesh.position.set(disk.x, disk.y, disk.z);
      mesh.scale.set(disk.radius, disk.radius, 1);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const fade = Number.isFinite(light.shadowFadeFactor) ? light.shadowFadeFactor : 0;
      mat.opacity = opacity * fade;
      this.applyDiskStencilState(mat, mesh.userData.stencilRef || (1 << (i % 8)));
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
    const blobSet = this.blobs;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if(!mesh.isMesh || !mesh.visible || blobSet.indexOf(mesh) >= 0){ return; }
      // castShadow from MDL flagShadow / loader options; SkinnedMesh covers
      // creatures whose meshes were built before castShadow was forced on.
      if(mesh.castShadow || (mesh as THREE.SkinnedMesh).isSkinnedMesh){
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
      for(let mi = 0; mi < materials.length; mi++){
        const mat = materials[mi];
        let st = state[mi];
        if(!st){
          st = {
            colorWrite: true,
            depthWrite: true,
            depthTest: true,
            stencilWrite: false,
            stencilWriteMask: 0xff,
            stencilFunc: THREE.AlwaysStencilFunc,
            stencilRef: 0,
            stencilFail: THREE.KeepStencilOp,
            stencilZFail: THREE.KeepStencilOp,
            stencilZPass: THREE.KeepStencilOp,
          };
          state[mi] = st;
        }
        st.colorWrite = (mat as any).colorWrite !== false;
        st.depthWrite = mat.depthWrite;
        st.depthTest = mat.depthTest;
        st.stencilWrite = mat.stencilWrite;
        st.stencilWriteMask = mat.stencilWriteMask;
        st.stencilFunc = mat.stencilFunc;
        st.stencilRef = mat.stencilRef;
        st.stencilFail = mat.stencilFail;
        st.stencilZFail = mat.stencilZFail;
        st.stencilZPass = mat.stencilZPass;
      }
      state.length = materials.length;
    }
    saved.length = casters.length;

    const blobVis = this._blobVisScratch;
    blobVis.length = this.blobs.length;
    for(let i = 0; i < this.blobs.length; i++){
      blobVis[i] = this.blobs[i].visible;
      this.blobs[i].visible = false;
    }

    // Hide non-casters for the mask pass (layer filter alone can miss parented
    // skinned setups if a parent is culled; visibility hide is the reliable path).
    const hidden = this._hiddenScratch;
    hidden.length = 0;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if(mesh.isMesh && mesh.visible && casters.indexOf(mesh) < 0){
        mesh.visible = false;
        hidden.push(mesh);
      }
    });

    const prevLayersMask = camera.layers.mask;
    try{
      // Prefer layer filter when it works; visibility hide is the safety net above.
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
            mat.depthTest = true;
            mat.stencilWrite = true;
            mat.stencilWriteMask = 0xff;
            mat.stencilFunc = THREE.AlwaysStencilFunc;
            mat.stencilRef = stencilRef;
            mat.stencilFuncMask = 0xffffffff;
            mat.stencilFail = THREE.KeepStencilOp;
            mat.stencilZFail = THREE.KeepStencilOp;
            mat.stencilZPass = THREE.ReplaceStencilOp;
            mat.needsUpdate = true;
          }
        }

        renderer.render(scene, camera);
      }
    }finally{
      camera.layers.mask = prevLayersMask;
    }

    for(let i = 0; i < saved.length; i++){
      const entry = saved[i];
      entry.mesh.visible = entry.visible;
      for(let mi = 0; mi < entry.materials.length; mi++){
        const mat = entry.materials[mi];
        const prev = entry.state[mi];
        (mat as any).colorWrite = prev.colorWrite;
        mat.depthWrite = prev.depthWrite;
        mat.depthTest = prev.depthTest;
        mat.stencilWrite = prev.stencilWrite;
        mat.stencilWriteMask = prev.stencilWriteMask;
        mat.stencilFunc = prev.stencilFunc;
        mat.stencilRef = prev.stencilRef;
        mat.stencilFail = prev.stencilFail;
        mat.stencilZFail = prev.stencilZFail;
        mat.stencilZPass = prev.stencilZPass;
        mat.needsUpdate = true;
      }
    }
    for(let i = 0; i < hidden.length; i++){
      hidden[i].visible = true;
    }
    for(let i = 0; i < this.blobs.length; i++){
      this.blobs[i].visible = blobVis[i];
      const mat = this.blobs[i].material as THREE.MeshBasicMaterial;
      this.applyDiskStencilState(mat, this.blobs[i].userData.stencilRef || (1 << (i % 8)));
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
