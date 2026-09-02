import * as THREE from "three";
import { LightManager } from "@/managers/LightManager";
import { GameState } from "@/GameState";
import {
  retailStencilShadowDisk,
  retailStencilShadowOpacity,
  retailStencilShadowFanVertices,
  retailShadowLightPosition,
  buildRetailShadowProjectionPlane,
  retailShadowProjectionPlaneKind,
  RETAIL_STENCIL_SHADOW_SEGMENTS,
} from "@/utility/retailLighting";
import { ShadowVolumeBuilder } from "@/utility/ShadowVolumeBuilder";
import type { IShadowRegistryEntry } from "@/managers/ShadowCasterRegistry";

/** Unit-radius retail fan: center + 10 ring vertices, 10 triangular wedges. */
function createRetailStencilFanGeometry(): THREE.BufferGeometry {
  const fan = retailStencilShadowFanVertices(1);
  const positions: number[] = [];
  for(let i = 1; i <= RETAIL_STENCIL_SHADOW_SEGMENTS; i++){
    const a = fan[i];
    const next = fan[i === RETAIL_STENCIL_SHADOW_SEGMENTS ? 1 : i + 1];
    positions.push(0, 0, 0, a.x, a.y, 0, next.x, next.y, 0);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geom;
}

/**
 * ShadowBlobManager — retail-equivalent stencil-masked shadow disks.
 *
 * Aligns with RenderStencilShadowsForThisLight:
 * - dark ground disks at focus Z
 * - opacity shadowAlpha * 0.5
 * - depth test disabled while drawing the disk
 * - stencil Equal + Keep (mask written by extruded shadow volumes first)
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
  private geometry: THREE.BufferGeometry;
  private hardMaterial: THREE.MeshBasicMaterial;
  private softTexture: THREE.DataTexture;
  private lightManager: LightManager;
  private focus = new THREE.Vector3();
  private _world = new THREE.Vector3();
  private volumeBuilder = new ShadowVolumeBuilder();
  private _cameraForward = new THREE.Vector3();

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
    this.geometry = createRetailStencilFanGeometry();

    if(this.hardMaterial){ this.hardMaterial.dispose(); }
    this.hardMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      // Retail glDisable(GL_DEPTH_TEST) while drawing the disk.
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
      // Retail glStencilFunc bit: 1 << (lightIndex) (arg3 is 1-based in retail)
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
    if(!this.lightManager || !GameState.areShadowsEnabled()){ return; }
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
   * Write per-light stencil masks from extruded shadow volumes into the current
   * render target. Disks use EqualStencilFunc so they only darken masked ground.
   * Caller owns color/depth clears; this clears stencil when clearStencil is true.
   */
  renderStencilMasks(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    clearStencil = true
  ){
    if(!this.lightManager || !renderer || !scene || !camera){ return; }
    if(!GameState.areShadowsEnabled()){ return; }
    const lights = this.lightManager.shadowLights;
    if(!lights.length || retailStencilShadowOpacity(GameState.shadowAlpha) <= 0){
      return;
    }
    const registry = GameState.shadowCasterRegistry;
    if(!registry){ return; }

    const gl = renderer.getContext() as WebGLRenderingContext;
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    const prevStencilMask = gl.getParameter(gl.STENCIL_WRITEMASK);
    gl.stencilMask(0xff);
    if(clearStencil){
      gl.clearStencil(0);
      gl.clear(gl.STENCIL_BUFFER_BIT);
    }

    const focusPos = this.focus;
    const getForward = (out: { x: number; y: number; z: number }) => {
      this._cameraForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      out.x = this._cameraForward.x;
      out.y = this._cameraForward.y;
      out.z = this._cameraForward.z;
    };
    const camStub = { position: camera.position, near: (camera as THREE.PerspectiveCamera).near ?? 0.1 };

    try{
      for(let i = 0; i < lights.length && i < this.blobs.length; i++){
        const light = lights[i];
        const stencilRef = (this.blobs[i].userData.stencilRef as number) || (1 << (i % 8));
        const lightRadius = Math.max(light.shadowRadius || 0, light.getRadius());
        if(!(lightRadius > 0)){ continue; }

        const lp = retailShadowLightPosition({
          x: light.worldPosition.x,
          y: light.worldPosition.y,
          z: light.worldPosition.z,
          radius: light.getRadius(),
          shadowRadius: light.shadowRadius || 0,
          verticalDisplacement: light.verticalDisplacement || 0,
        });
        const planeKind = retailShadowProjectionPlaneKind(light.getRadius(), false);
        const plane = buildRetailShadowProjectionPlane(planeKind, camStub, focusPos.z, getForward);

        const volumeCasters = registry.getCastersInLightRadius(
          lp.x, lp.y, lp.z,
          light.getRadius(),
          light.shadowRadius || 0,
          focusPos
        );

        if(!volumeCasters.length){ continue; }

        const ownerGroups = new Map<string, IShadowRegistryEntry[]>();
        for(let ci = 0; ci < volumeCasters.length; ci++){
          const caster = volumeCasters[ci];
          const key = caster.ownerUuid || caster.mesh?.uuid || `caster:${ci}`;
          let group = ownerGroups.get(key);
          if(!group){
            group = [];
            ownerGroups.set(key, group);
          }
          group.push(caster);
        }

        for(const group of ownerGroups.values()){
          const built = this.volumeBuilder.buildForLight(
            group,
            lp.x, lp.y, lp.z,
            light.getRadius(),
            light.shadowRadius || 0,
            plane,
            registry
          );
          if(!built){ continue; }

          this.volumeBuilder.applyStencilWriteState(stencilRef);
          if(this.volumeBuilder.mesh.parent !== scene){
            scene.add(this.volumeBuilder.mesh);
          }
          this.volumeBuilder.mesh.visible = true;
          renderer.render(this.volumeBuilder.mesh, camera);
          this.volumeBuilder.mesh.visible = false;
        }
      }
    }finally{
      /* volume pass uses default camera layers */
    }

    gl.stencilMask(prevStencilMask);
    renderer.autoClear = prevAutoClear;
  }

  /** Last-built extruded volume mesh (Forge debug wireframe). */
  getVolumeDebugMesh(): THREE.Mesh {
    return this.volumeBuilder.mesh;
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
    this.volumeBuilder.dispose();
  }
}
