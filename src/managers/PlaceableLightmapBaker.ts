import * as THREE from 'three';
import type { ModulePlaceable } from '@/module/ModulePlaceable';
import type { ModuleArea } from '@/module/ModuleArea';
import type { LightManager } from '@/managers/LightManager';
import type { OdysseyLight3D } from '@/three/odyssey/OdysseyLight3D';
import type { OdysseyModel3D } from '@/three/odyssey/OdysseyModel3D';
import { OdysseyModelControllerType } from '@/enums/odyssey/OdysseyModelControllerType';
import { retailPointAttenuation } from '@/utility/retailLighting';

/** Mesh entry tracked for dispose / rebake. */
interface IBakedMeshLightmap {
  texture: THREE.DataTexture;
  material: THREE.ShaderMaterial;
  geometry: THREE.BufferGeometry;
  /** True when baker owns uv2. */
  ownedUv2: boolean;
}

const MIN_RESOLUTION = 16;
const MAX_RESOLUTION = 128;
/** Target texels across each triangle chart edge. */
const CHART_EDGE_TEXELS = 8;
/** Spreads chart irradiance into empty half-cells / gutters for bilinear sampling. */
const DILATE_PASSES = 6;

/**
 * Runtime placeable lightmaps — bake static irradiance (DynAmbient + sun +
 * n_dynamic_type == 0 lights) into USE_LIGHTMAP textures. Animated / skin /
 * dangly meshes stay on GetNearestLights. Type-1 lights overlay lightmaps
 * via exclusive_dynamic at runtime.
 */
export class PlaceableLightmapBaker {
  private static dirty = new Set<ModulePlaceable>();
  private static baking = false;
  private static lightManagerProvider: (() => LightManager | undefined) | undefined;
  private static readonly _scratchPos = new THREE.Vector3();
  private static readonly _scratchNrm = new THREE.Vector3();
  private static readonly _scratchLightDir = new THREE.Vector3();
  private static readonly _matrixNormal = new THREE.Matrix3();

  /** Optional provider so callers (GameState) avoid circular imports in tests. */
  static setLightManagerProvider(provider: () => LightManager | undefined): void {
    this.lightManagerProvider = provider;
  }

  private static resolveLightManager(explicit?: LightManager): LightManager | undefined {
    return explicit ?? this.lightManagerProvider?.();
  }

  /** True when this placeable has a live runtime bake on at least one mesh. */
  static isBaked(plc: ModulePlaceable): boolean {
    return !!(plc?.model as OdysseyModel3D | undefined)?.userData?.odysseyPlaceableLightmap;
  }

  /** Queue a placeable for deferred rebake (scripted move / area lighting / settle). */
  static invalidate(plc: ModulePlaceable): void {
    if(!plc || !(plc.model as OdysseyModel3D)?.materials){ return; }
    this.dirty.add(plc);
  }

  /** Invalidate every placeable in an area (DynAmbient / day-night bake inputs). */
  static invalidateArea(area: ModuleArea): void {
    if(!area?.placeables){ return; }
    for(let i = 0; i < area.placeables.length; i++){
      this.invalidate(area.placeables[i]);
    }
  }

  /** Bake all placeables after area load (lights + poses ready). */
  static bakeArea(area: ModuleArea, lightManager?: LightManager): void {
    if(!area?.placeables){ return; }
    const lm = this.resolveLightManager(lightManager);
    if(!lm){ return; }
    this.refreshLightPoses(lm);
    for(let i = 0; i < area.placeables.length; i++){
      this.bakePlaceable(area.placeables[i], lm);
    }
    this.dirty.clear();
  }

  /** Process invalidate() queue once per frame. */
  static flushDirty(lightManager?: LightManager): void {
    if(this.baking || this.dirty.size === 0){ return; }
    this.baking = true;
    try{
      const lm = this.resolveLightManager(lightManager);
      if(!lm){ return; }
      this.refreshLightPoses(lm);
      for(const plc of this.dirty){
        if(plc.destroyed || !(plc.model as OdysseyModel3D)?.materials){ continue; }
        this.bakePlaceable(plc, lm);
      }
      this.dirty.clear();
    }finally{
      this.baking = false;
    }
  }

  static dispose(plc: ModulePlaceable): void {
    this.dirty.delete(plc);
    const model = plc?.model as OdysseyModel3D | undefined;
    if(!model){ return; }
    const baked = model.userData.odysseyPlaceableLightmaps as IBakedMeshLightmap[] | undefined;
    if(baked){
      for(let i = 0; i < baked.length; i++){
        const entry = baked[i];
        this.clearMaterialLightmap(entry.material);
        entry.texture.dispose();
      }
    }
    delete model.userData.odysseyPlaceableLightmaps;
    delete model.userData.odysseyPlaceableLightmap;
    delete model.userData.odysseyObjectBindFp;
  }

  static bakePlaceable(plc: ModulePlaceable, lightManager?: LightManager): void {
    const model = plc?.model as OdysseyModel3D | undefined;
    if(!model?.materials){ return; }

    const lm = this.resolveLightManager(lightManager);
    if(!lm){ return; }
    plc.container.updateMatrixWorld(true);
    this.disposeBakeTextures(model);

    const dynamicMeshes = this.classifyDynamicMeshes(model);
    const entries: IBakedMeshLightmap[] = [];
    const bakeLights = this.collectBakeLights(lm);

    model.traverse((obj) => {
      if(!(obj instanceof THREE.Mesh)){ return; }
      const geometry = obj.geometry as THREE.BufferGeometry;
      if(!geometry?.attributes?.position){ return; }

      // Skin / dangly / transform-animated parts: nearest-lights, not bake.
      if(dynamicMeshes.has(obj)){
        obj.userData.odysseyPlaceableDynamicLit = true;
        return;
      }
      delete obj.userData.odysseyPlaceableDynamicLit;

      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for(let mi = 0; mi < materials.length; mi++){
        const material = materials[mi];
        if(!(material instanceof THREE.ShaderMaterial)){ continue; }
        if(this.isAuthoredLightmapMaterial(material)){ continue; }

        obj.updateWorldMatrix(true, false);
        const resolution = this.resolutionForObject(obj, geometry);
        const ownedUv2 = this.ensureLightmapUVs(geometry, resolution);
        const texture = this.rasterizeLightmap(
          geometry,
          obj.matrixWorld,
          resolution,
          lm,
          bakeLights
        );
        this.applyLightmap(material, texture);
        entries.push({ texture, material, geometry, ownedUv2 });
      }
    });

    if(entries.length === 0){
      delete model.userData.odysseyPlaceableLightmap;
      return;
    }
    model.userData.odysseyPlaceableLightmaps = entries;
    model.userData.odysseyPlaceableLightmap = true;
    delete model.userData.odysseyObjectBindFp;
  }

  /** Mirror TextureLoader LIGHTMAP apply for a runtime DataTexture. */
  static applyLightmap(material: THREE.ShaderMaterial, lightmap: THREE.Texture): void {
    if(!material.uniforms){ return; }
    if(!material.uniforms.lightMap){
      material.uniforms.lightMap = { value: null };
    }
    material.uniforms.lightMap.value = lightmap;
    (material as any).lightMap = lightmap;
    if(typeof (lightmap as any).updateMatrix === 'function'){
      (lightmap as any).updateMatrix();
    }
    material.defines = material.defines || {};
    material.defines.USE_LIGHTMAP = '';
    delete material.defines.IGNORE_LIGHTING;
    material.defines.AURORA = '';
    material.userData.odysseyRuntimeLightmap = true;
    material.uniformsNeedUpdate = true;
    material.needsUpdate = true;
  }

  /**
   * Meshes that must stay on GetNearestLights: skins, dangly, and anything
   * under a node with multi-frame Position/Orientation/Scale controllers.
   */
  static classifyDynamicMeshes(model: OdysseyModel3D): Set<THREE.Object3D> {
    const dynamic = new Set<THREE.Object3D>();

    const skins = model.skins || [];
    for(let i = 0; i < skins.length; i++){
      if(skins[i]){ dynamic.add(skins[i]); }
    }
    const dangly = model.danglyMeshes || [];
    for(let i = 0; i < dangly.length; i++){
      if(dangly[i]){ dynamic.add(dangly[i]); }
    }

    const animatedRoots = this.findAnimatedTransformNodes(model);
    for(let i = 0; i < animatedRoots.length; i++){
      animatedRoots[i].traverse((obj) => {
        if(obj instanceof THREE.Mesh){ dynamic.add(obj); }
      });
    }

    return dynamic;
  }

  /** Safe chart pad: never invert UVs (pad < cell/2). */
  static computeChartPad(cell: number, resolution: number): number {
    const desired = Math.max(cell * 0.08, 1.5 / Math.max(1, resolution));
    const maxPad = Math.max(0, cell * 0.45 - 0.5 / Math.max(1, resolution));
    return Math.min(desired, maxPad);
  }

  private static findAnimatedTransformNodes(model: OdysseyModel3D): THREE.Object3D[] {
    const roots: THREE.Object3D[] = [];
    const seen = new Set<THREE.Object3D>();
    const anims = model.odysseyAnimations || [];
    const transformTypes = [
      OdysseyModelControllerType.Position,
      OdysseyModelControllerType.Orientation,
      OdysseyModelControllerType.Scale,
    ];

    for(let a = 0; a < anims.length; a++){
      const anim = anims[a];
      const nodes = anim?.nodes || [];
      for(let n = 0; n < nodes.length; n++){
        const animNode = nodes[n];
        const controllers = animNode?.controllers;
        if(!controllers){ continue; }
        let multiFrame = false;
        for(let t = 0; t < transformTypes.length; t++){
          const c = controllers.get?.(transformTypes[t]) ?? (controllers as any)[transformTypes[t]];
          if(c && (c.frameCount | 0) > 1){
            multiFrame = true;
            break;
          }
        }
        if(!multiFrame){ continue; }

        let runtime: THREE.Object3D | undefined;
        if(typeof animNode.nodeNumber === 'number' && animNode.nodeNumber >= 0){
          runtime = model.nodesById?.[animNode.nodeNumber];
        }
        if(!runtime && animNode.name){
          runtime = model.nodes?.get?.(animNode.name);
        }
        if(runtime && !seen.has(runtime)){
          seen.add(runtime);
          roots.push(runtime);
        }
      }
    }
    return roots;
  }

  private static isAuthoredLightmapMaterial(material: THREE.ShaderMaterial): boolean {
    if(material.userData?.odysseyAuthoredLightmap){ return true; }
    if(material.userData?.lightmap && !material.userData?.odysseyRuntimeLightmap){
      material.userData.odysseyAuthoredLightmap = true;
      return true;
    }
    if(
      Object.prototype.hasOwnProperty.call(material.defines || {}, 'USE_LIGHTMAP') &&
      !material.userData?.odysseyRuntimeLightmap
    ){
      material.userData.odysseyAuthoredLightmap = true;
      return true;
    }
    return false;
  }

  private static clearMaterialLightmap(material: THREE.ShaderMaterial): void {
    if(!material?.uniforms){ return; }
    if(material.uniforms.lightMap){
      material.uniforms.lightMap.value = null;
    }
    delete (material as any).lightMap;
    if(material.defines){
      delete material.defines.USE_LIGHTMAP;
    }
    delete material.userData.odysseyRuntimeLightmap;
    material.uniformsNeedUpdate = true;
    material.needsUpdate = true;
  }

  private static disposeBakeTextures(model: OdysseyModel3D): void {
    const baked = model.userData.odysseyPlaceableLightmaps as IBakedMeshLightmap[] | undefined;
    if(!baked){ return; }
    for(let i = 0; i < baked.length; i++){
      const entry = baked[i];
      this.clearMaterialLightmap(entry.material);
      entry.texture.dispose();
    }
    delete model.userData.odysseyPlaceableLightmaps;
    delete model.userData.odysseyPlaceableLightmap;
  }

  private static refreshLightPoses(lm: LightManager): void {
    if(!lm?.lights){ return; }
    for(let i = 0, il = lm.lights.length; i < il; i++){
      const light = lm.lights[i];
      light.getWorldPosition(light.worldPosition);
    }
  }

  private static collectBakeLights(lm: LightManager): OdysseyLight3D[] {
    const out: OdysseyLight3D[] = [];
    if(!lm?.lights){ return out; }
    for(let i = 0, il = lm.lights.length; i < il; i++){
      const light = lm.lights[i];
      if((light.dynamicType | 0) !== 0){ continue; }
      if(!(light.getRadius() > 0)){ continue; }
      out.push(light);
    }
    return out;
  }

  private static resolutionForObject(obj: THREE.Object3D, geometry: THREE.BufferGeometry): number {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(this._scratchPos);
    const extent = Math.max(size.x, size.y, size.z, 0.25);
    const byExtent = Math.round(extent * 24);

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const index = geometry.index;
    const triCount = index ? (index.count / 3) | 0 : (pos.count / 3) | 0;
    // Keep ~CHART_EDGE_TEXELS across each chart: grid ≈ sqrt(tri), res ≈ grid * edge.
    const grid = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, triCount))));
    const byTris = grid * CHART_EDGE_TEXELS;

    return Math.max(MIN_RESOLUTION, Math.min(MAX_RESOLUTION, Math.max(byExtent, byTris)));
  }

  /**
   * Unique per-triangle lightmap atlas. Never reuses diffuse UV1→UV2 copies.
   * Expands indexed meshes so chart UVs cannot stomp shared verts.
   */
  private static ensureLightmapUVs(geometry: THREE.BufferGeometry, resolution: number): boolean {
    const prevRes = geometry.userData.odysseyLightmapChartResolution | 0;
    if(
      geometry.userData.odysseyLightmapChartsReady === true &&
      geometry.attributes.uv2 &&
      prevRes === resolution
    ){
      return true;
    }

    this.expandToNonIndexed(geometry);

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const vCount = pos.count;
    const triCount = (vCount / 3) | 0;
    if(triCount <= 0){
      geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(new Float32Array(Math.max(vCount, 1) * 2), 2));
      geometry.userData.odysseyLightmapChartsReady = true;
      geometry.userData.odysseyLightmapChartResolution = resolution;
      return true;
    }

    const grid = Math.max(1, Math.ceil(Math.sqrt(triCount)));
    const cell = 1 / grid;
    const pad = this.computeChartPad(cell, resolution);
    const uv2 = new Float32Array(vCount * 2);

    for(let t = 0; t < triCount; t++){
      const i0 = t * 3;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const gx = t % grid;
      const gy = (t / grid) | 0;
      // Full-cell triangle with gutter — covers most of the cell so bilinear
      // samples stay on filled irradiance after dilation.
      const u0 = gx * cell + pad;
      const v0 = gy * cell + pad;
      const u1 = (gx + 1) * cell - pad;
      const v1 = (gy + 1) * cell - pad;
      uv2[i0 * 2] = u0;     uv2[i0 * 2 + 1] = v0;
      uv2[i1 * 2] = u1;     uv2[i1 * 2 + 1] = v0;
      uv2[i2 * 2] = u0;     uv2[i2 * 2 + 1] = v1;
    }

    geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(uv2, 2));
    geometry.attributes.uv2.needsUpdate = true;
    geometry.userData.odysseyLightmapChartsReady = true;
    geometry.userData.odysseyLightmapChartResolution = resolution;
    return true;
  }

  private static expandToNonIndexed(geometry: THREE.BufferGeometry): void {
    const index = geometry.index;
    if(!index){ return; }

    const triVertCount = index.count;
    const names = Object.keys(geometry.attributes);
    for(let n = 0; n < names.length; n++){
      const name = names[n];
      const attr = geometry.attributes[name] as THREE.BufferAttribute;
      if(!attr?.array){ continue; }
      const itemSize = attr.itemSize;
      const srcArr = attr.array as ArrayLike<number>;
      const out = new Float32Array(triVertCount * itemSize);
      for(let i = 0; i < triVertCount; i++){
        const src = index.getX(i);
        const srcBase = src * itemSize;
        const dstBase = i * itemSize;
        for(let c = 0; c < itemSize; c++){
          out[dstBase + c] = srcArr[srcBase + c];
        }
      }
      geometry.setAttribute(name, new THREE.Float32BufferAttribute(out, itemSize));
    }
    geometry.setIndex(null);
    geometry.userData.odysseyLightmapExpanded = true;
  }

  private static rasterizeLightmap(
    geometry: THREE.BufferGeometry,
    matrixWorld: THREE.Matrix4,
    resolution: number,
    lm: LightManager,
    bakeLights: OdysseyLight3D[]
  ): THREE.DataTexture {
    const w = resolution;
    const h = resolution;
    const data = new Float32Array(w * h * 4);
    const filled = new Uint8Array(w * h);

    // Seed matches filled-texel base (ambient + sun ambient).
    const ar = lm.ambientColor.r + lm.sunAmbientColor.r;
    const ag = lm.ambientColor.g + lm.sunAmbientColor.g;
    const ab = lm.ambientColor.b + lm.sunAmbientColor.b;
    for(let i = 0; i < w * h; i++){
      const o = i * 4;
      data[o] = ar;
      data[o + 1] = ag;
      data[o + 2] = ab;
      data[o + 3] = 1;
    }

    this._matrixNormal.getNormalMatrix(matrixWorld);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const nrmAttr = geometry.attributes.normal as THREE.BufferAttribute | undefined;
    const uv2 = geometry.attributes.uv2 as THREE.BufferAttribute;
    const triCount = (pos.count / 3) | 0;

    const sunCol = lm.sunColor;
    const sunDir = lm.sunDirection;

    for(let t = 0; t < triCount; t++){
      const i0 = t * 3;
      const i1 = i0 + 1;
      const i2 = i0 + 2;

      const u0 = uv2.getX(i0), v0 = uv2.getY(i0);
      const u1 = uv2.getX(i1), v1 = uv2.getY(i1);
      const u2 = uv2.getX(i2), v2 = uv2.getY(i2);

      const area = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
      if(Math.abs(area) < 1e-12){ continue; }

      const minU = Math.min(u0, u1, u2);
      const maxU = Math.max(u0, u1, u2);
      const minV = Math.min(v0, v1, v2);
      const maxV = Math.max(v0, v1, v2);
      const x0 = Math.max(0, Math.floor(minU * w));
      const x1 = Math.min(w - 1, Math.ceil(maxU * w));
      const y0 = Math.max(0, Math.floor(minV * h));
      const y1 = Math.min(h - 1, Math.ceil(maxV * h));

      const p0x = pos.getX(i0), p0y = pos.getY(i0), p0z = pos.getZ(i0);
      const p1x = pos.getX(i1), p1y = pos.getY(i1), p1z = pos.getZ(i1);
      const p2x = pos.getX(i2), p2y = pos.getY(i2), p2z = pos.getZ(i2);

      let n0x = 0, n0y = 0, n0z = 1;
      let n1x = 0, n1y = 0, n1z = 1;
      let n2x = 0, n2y = 0, n2z = 1;
      if(nrmAttr){
        n0x = nrmAttr.getX(i0); n0y = nrmAttr.getY(i0); n0z = nrmAttr.getZ(i0);
        n1x = nrmAttr.getX(i1); n1y = nrmAttr.getY(i1); n1z = nrmAttr.getZ(i1);
        n2x = nrmAttr.getX(i2); n2y = nrmAttr.getY(i2); n2z = nrmAttr.getZ(i2);
      }

      for(let y = y0; y <= y1; y++){
        for(let x = x0; x <= x1; x++){
          const u = (x + 0.5) / w;
          const v = (y + 0.5) / h;
          const bary = this.barycentric(u, v, u0, v0, u1, v1, u2, v2);
          if(!bary){ continue; }
          const [bw0, bw1, bw2] = bary;

          this._scratchPos.set(
            p0x * bw0 + p1x * bw1 + p2x * bw2,
            p0y * bw0 + p1y * bw1 + p2y * bw2,
            p0z * bw0 + p1z * bw1 + p2z * bw2
          ).applyMatrix4(matrixWorld);

          this._scratchNrm.set(
            n0x * bw0 + n1x * bw1 + n2x * bw2,
            n0y * bw0 + n1y * bw1 + n2y * bw2,
            n0z * bw0 + n1z * bw1 + n2z * bw2
          ).applyMatrix3(this._matrixNormal).normalize();

          let ir = ar;
          let ig = ag;
          let ib = ab;

          const sunLen = sunCol.r + sunCol.g + sunCol.b;
          if(sunLen > 0){
            const ndl = Math.max(0, this._scratchNrm.dot(sunDir));
            if(ndl > 0){
              ir += sunCol.r * ndl;
              ig += sunCol.g * ndl;
              ib += sunCol.b * ndl;
            }
          }

          for(let li = 0; li < bakeLights.length; li++){
            const light = bakeLights[li];
            const dist = this._scratchPos.distanceTo(light.worldPosition);
            const atten = retailPointAttenuation(dist, light.getRadius());
            if(atten <= 0){ continue; }
            const scale = light.getIntensity();
            const lr = light.color.r * scale * atten;
            const lg = light.color.g * scale * atten;
            const lb = light.color.b * scale * atten;
            if(light.isAmbient){
              ir += lr; ig += lg; ib += lb;
            }else{
              this._scratchLightDir.subVectors(light.worldPosition, this._scratchPos).normalize();
              const ndl = Math.max(0, this._scratchNrm.dot(this._scratchLightDir));
              if(ndl > 0){
                ir += lr * ndl;
                ig += lg * ndl;
                ib += lb * ndl;
              }
            }
          }

          const pix = y * w + x;
          const o = pix * 4;
          data[o] = ir;
          data[o + 1] = ig;
          data[o + 2] = ib;
          data[o + 3] = 1;
          filled[pix] = 1;
        }
      }
    }

    this.dilateFilled(data, filled, w, h, DILATE_PASSES);

    const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
    tex.needsUpdate = true;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.flipY = false;
    tex.name = 'placeable_runtime_lightmap';
    return tex;
  }

  /** Spread filled chart texels into empty neighbors to kill bilinear seams. */
  private static dilateFilled(
    data: Float32Array,
    filled: Uint8Array,
    w: number,
    h: number,
    passes: number
  ): void {
    const next = new Uint8Array(filled.length);
    for(let pass = 0; pass < passes; pass++){
      next.set(filled);
      for(let y = 0; y < h; y++){
        for(let x = 0; x < w; x++){
          const i = y * w + x;
          if(filled[i]){ continue; }
          let r = 0, g = 0, b = 0, n = 0;
          for(let dy = -1; dy <= 1; dy++){
            for(let dx = -1; dx <= 1; dx++){
              if(dx === 0 && dy === 0){ continue; }
              const nx = x + dx;
              const ny = y + dy;
              if(nx < 0 || ny < 0 || nx >= w || ny >= h){ continue; }
              const ni = ny * w + nx;
              if(!filled[ni]){ continue; }
              const o = ni * 4;
              r += data[o];
              g += data[o + 1];
              b += data[o + 2];
              n++;
            }
          }
          if(n > 0){
            const o = i * 4;
            data[o] = r / n;
            data[o + 1] = g / n;
            data[o + 2] = b / n;
            data[o + 3] = 1;
            next[i] = 1;
          }
        }
      }
      filled.set(next);
    }
  }

  private static barycentric(
    u: number, v: number,
    u0: number, v0: number,
    u1: number, v1: number,
    u2: number, v2: number
  ): [number, number, number] | null {
    const d00 = (u1 - u0);
    const d01 = (u2 - u0);
    const d10 = (v1 - v0);
    const d11 = (v2 - v0);
    const denom = d00 * d11 - d01 * d10;
    if(Math.abs(denom) < 1e-12){ return null; }
    const du = u - u0;
    const dv = v - v0;
    const w1 = (du * d11 - d01 * dv) / denom;
    const w2 = (d00 * dv - du * d10) / denom;
    const w0 = 1 - w1 - w2;
    if(w0 < -0.01 || w1 < -0.01 || w2 < -0.01){ return null; }
    return [w0, w1, w2];
  }
}
