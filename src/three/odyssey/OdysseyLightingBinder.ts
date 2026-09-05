import * as THREE from "three";
import type { OdysseyModel3D } from "@/three/odyssey/OdysseyModel3D";
import type { LightManager, IOdysseyLightUniformSlot } from "@/managers/LightManager";
import type { OdysseyShadowManager } from "@/managers/OdysseyShadowManager";
import { GameState } from "@/GameState";
import {
  MAX_ODYSSEY_LIGHTS,
  createEmptyOdysseyLightPosArray,
  createEmptyOdysseyLightColorArray,
} from "@/shaders/chunks/OdysseyLighting";
import {
  createOdysseyShadowUniforms,
  MAX_ODYSSEY_SHADOW_MAPS,
} from "@/shaders/chunks/OdysseyShadow";
import { ODYSSEY_SHADOW_MAP_DEPTH_BIAS } from "@/utility/odysseyShadowMap";
import { envMapRotationFromCamera } from "@/utility/envMapRotation";

/**
 * OdysseyLightingBinder — pushes packed Odyssey light + area ambient/sun
 * uniforms onto ShaderMaterials. Materials must use lights: false.
 *
 * Light positions are transformed to view-space on upload (camera required for
 * correct lighting). Area ambient/sun state is owned by each LightManager.
 *
 * Retail split (LoadArea / SetAsDay):
 * - ambientColor = ARE DynAmbientColor → SetAmbient
 * - sunAmbientColor = sun/moon ambient → directional light ambient channel
 * - sunColor = sun/moon diffuse → directional light diffuse (N·L)
 *
 * ARE room AmbientScale is audio-only (UpdateRoom → SetDesiredAmbientScale).
 */
export class OdysseyLightingBinder {
  /** Fallback scene light-model ambient when no LightManager is provided. */
  static ambientColor = new THREE.Color(0, 0, 0);
  /** Fallback directional sun/moon ambient channel (no N·L). */
  static sunAmbientColor = new THREE.Color(0, 0, 0);
  static sunColor = new THREE.Color(0, 0, 0);
  /**
   * Fallback world-space direction toward the sun (for N·L).
   * Retail places gidy_sun at (4000, 4500, 7000) in LoadArea.
   */
  static sunDirection = new THREE.Vector3(4000, 4500, 7000).normalize();

  /** Optional gameplay LightManager targeted by static setters. */
  static activeManager: LightManager | undefined;

  private static _viewSunDir = new THREE.Vector3();
  private static _tmpMatrix = new THREE.Matrix4();
  private static _scratchWorldPos = new THREE.Vector3();
  private static _scratchViewPos = new THREE.Vector3();
  /** Per-frame view-space sun cache (numeric camera+sun fingerprint). */
  private static _viewSunCacheKey = 0;
  private static _viewSunCacheDir = new THREE.Vector3();
  private static _bindSeen = new Set<THREE.Material>();
  private static _envMapRotation = new THREE.Matrix3();
  private static _envMapRotationFp = 0;

  static setActiveManager(manager?: LightManager){
    this.activeManager = manager;
  }

  static setAreaAmbient(color: THREE.Color | number, g?: number, b?: number, manager?: LightManager){
    const target = manager ?? this.activeManager;
    if(target){
      target.setAreaAmbient(color as any, g, b);
    }
    if(typeof color === 'number'){
      this.ambientColor.setRGB(color, g ?? 0, b ?? 0);
    }else{
      this.ambientColor.copy(color);
    }
  }

  static setAreaSunAmbient(color: THREE.Color | number, g?: number, b?: number, manager?: LightManager){
    const target = manager ?? this.activeManager;
    if(target){
      target.setAreaSunAmbient(color as any, g, b);
    }
    if(typeof color === 'number'){
      this.sunAmbientColor.setRGB(color, g ?? 0, b ?? 0);
    }else{
      this.sunAmbientColor.copy(color);
    }
  }

  static setAreaSun(color: THREE.Color | number, g?: number, b?: number, manager?: LightManager){
    const target = manager ?? this.activeManager;
    if(target){
      target.setAreaSun(color as any, g, b);
    }
    if(typeof color === 'number'){
      this.sunColor.setRGB(color, g ?? 0, b ?? 0);
    }else{
      this.sunColor.copy(color);
    }
  }

  static setAreaSunDirection(x: number, y: number, z: number, manager?: LightManager){
    const target = manager ?? this.activeManager;
    if(target){
      target.setAreaSunDirection(x, y, z);
    }
    this.sunDirection.set(x, y, z).normalize();
  }

  /** Integer hash of sampled camera.matrixWorldInverse elements. */
  private static cameraViewFingerprint(camera?: THREE.Camera): number {
    if(!camera){ return 0; }
    const e = camera.matrixWorldInverse.elements;
    let h = Math.round(e[0] * 1e5) | 0;
    h = Math.imul(h ^ (Math.round(e[5] * 1e5) | 0), 16777619);
    h = Math.imul(h ^ (Math.round(e[10] * 1e5) | 0), 16777619);
    h = Math.imul(h ^ (Math.round(e[12] * 1e4) | 0), 16777619);
    h = Math.imul(h ^ (Math.round(e[13] * 1e4) | 0), 16777619);
    h = Math.imul(h ^ (Math.round(e[14] * 1e4) | 0), 16777619);
    return h | 0;
  }

  private static mixHash(a: number, b: number): number {
    return Math.imul(a ^ (b | 0), 16777619) | 0;
  }

  private static resolveViewSunDir(
    camera: THREE.Camera | undefined,
    sunDir: THREE.Vector3
  ): THREE.Vector3 {
    if(!camera){
      return sunDir;
    }
    const key = this.mixHash(
      this.cameraViewFingerprint(camera),
      this.mixHash(
        Math.round(sunDir.x * 1000) | 0,
        this.mixHash(Math.round(sunDir.y * 1000) | 0, Math.round(sunDir.z * 1000) | 0)
      )
    );
    if(key === this._viewSunCacheKey){
      return this._viewSunCacheDir;
    }
    this._tmpMatrix.copy(camera.matrixWorldInverse);
    this._viewSunCacheDir.copy(sunDir).transformDirection(this._tmpMatrix).normalize();
    this._viewSunCacheKey = key;
    return this._viewSunCacheDir;
  }

  private static areaFingerprint(
    lightManager: LightManager | undefined,
    camera: THREE.Camera | undefined
  ): { ambientHex: number; sunAmbientHex: number; sunHex: number; headKey: number; viewFp: number; viewSun: THREE.Vector3; areaFp: number } {
    const ambient = lightManager?.ambientColor ?? this.ambientColor;
    const sunAmbient = lightManager?.sunAmbientColor ?? this.sunAmbientColor;
    const sun = lightManager?.sunColor ?? this.sunColor;
    const sunDir = lightManager?.sunDirection ?? this.sunDirection;
    const ambientHex = ambient.getHex();
    const sunAmbientHex = sunAmbient.getHex();
    const sunHex = sun.getHex();
    let headKey = 0;
    if(lightManager?.headLightEnabled){
      headKey = this.mixHash(1, this.mixHash(lightManager.headLightAmbient.getHex(), lightManager.headLightDiffuse.getHex()));
    }
    const viewSun = this.resolveViewSunDir(camera, sunDir);
    const viewFp = this.mixHash(
      this.cameraViewFingerprint(camera),
      this.mixHash(
        Math.round(viewSun.x * 1e5) | 0,
        this.mixHash(Math.round(viewSun.y * 1e5) | 0, Math.round(viewSun.z * 1e5) | 0)
      )
    );
    let areaFp = ambientHex;
    areaFp = this.mixHash(areaFp, sunAmbientHex);
    areaFp = this.mixHash(areaFp, sunHex);
    areaFp = this.mixHash(areaFp, headKey);
    areaFp = this.mixHash(areaFp, viewFp);
    if(lightManager){
      areaFp = this.mixHash(areaFp, lightManager.getAreaFingerprint());
    }
    return { ambientHex, sunAmbientHex, sunHex, headKey, viewFp, viewSun, areaFp };
  }

  /**
   * Copy world-space light slots into material arrays, transforming xyz to
   * view-space when a camera is provided.
   */
  private static copyLightArrays(
    posArr: THREE.Vector4[],
    colArr: THREE.Vector4[],
    lightSet: IOdysseyLightUniformSlot,
    camera?: THREE.Camera
  ){
    const inv = camera ? camera.matrixWorldInverse : undefined;
    for(let i = 0; i < MAX_ODYSSEY_LIGHTS; i++){
      const srcPos = lightSet.odysseyLightPos[i];
      const dstPos = posArr[i];
      if(inv && (srcPos.x !== 0 || srcPos.y !== 0 || srcPos.z !== 0 || srcPos.w !== 0)){
        this._scratchViewPos.set(srcPos.x, srcPos.y, srcPos.z).applyMatrix4(inv);
        dstPos.set(this._scratchViewPos.x, this._scratchViewPos.y, this._scratchViewPos.z, srcPos.w);
      }else{
        dstPos.copy(srcPos);
      }
      colArr[i].copy(lightSet.odysseyLightColor[i]);
    }
  }

  /**
   * DoEnvMapTransform — upload camera world rotation for cubemap sample.
   * Called for USE_ENVMAP materials even when IGNORE_LIGHTING skips light arrays.
   */
  static writeEnvMapRotation(material: THREE.ShaderMaterial, camera?: THREE.Camera){
    if(!material.uniforms){ return; }
    const defines = material.defines || {};
    if(!Object.prototype.hasOwnProperty.call(defines, 'USE_ENVMAP')){
      return;
    }
    if(!material.uniforms.envMapRotation){
      material.uniforms.envMapRotation = { value: new THREE.Matrix3() };
    }
    const viewFp = this.cameraViewFingerprint(camera);
    if(material.userData.odysseyEnvMapRotFp === viewFp &&
      material.userData.odysseyEnvMapRotOwned === true){
      return;
    }
    // Own the Matrix3 — ShaderLib clone aliases the same identity across materials.
    if(material.userData.odysseyEnvMapRotOwned !== true){
      material.uniforms.envMapRotation.value = new THREE.Matrix3();
      material.userData.odysseyEnvMapRotOwned = true;
    }
    if(viewFp !== this._envMapRotationFp){
      envMapRotationFromCamera(camera, this._envMapRotation);
      this._envMapRotationFp = viewFp;
    }
    (material.uniforms.envMapRotation.value as THREE.Matrix3).copy(this._envMapRotation);
    material.userData.odysseyEnvMapRotFp = viewFp;
    material.uniformsNeedUpdate = true;
  }

  static bindMaterial(
    material: THREE.ShaderMaterial,
    lightSet: IOdysseyLightUniformSlot,
    camera?: THREE.Camera,
    cacheKey = 'odysseyLightCacheID',
    lightManager?: LightManager
  ){
    if(!material.uniforms){ return; }

    this.writeEnvMapRotation(material, camera);
    this.bindScreenSpaceShadowUniforms(material, undefined, camera);

    const defines = material.defines || {};
    const usesLightmap = Object.prototype.hasOwnProperty.call(defines, 'USE_LIGHTMAP');
    const ignoreLighting = Object.prototype.hasOwnProperty.call(defines, 'IGNORE_LIGHTING');
    // Unlit meshes ignore runtime lights entirely. Lightmapped surfaces still
    // receive the exclusive_dynamic_lights overlay (EnableLightsDynamicOnly @
    // ) but never area sun/ambient — that is baked into the lightmap.
    if(ignoreLighting && !usesLightmap){
      if(material.userData[cacheKey] === lightSet.cacheID &&
        material.userData.odysseyLightArraysSkipped === true){
        return;
      }
      if(!material.uniforms.numOdysseyLights){
        material.uniforms.numOdysseyLights = { value: 0 };
      }
      material.uniforms.numOdysseyLights.value = 0;
      material.userData[cacheKey] = lightSet.cacheID;
      material.userData.odysseyLightArraysSkipped = true;
      material.uniformsNeedUpdate = true;
      return;
    }

    if(!material.uniforms.odysseyLightPos || !material.uniforms.odysseyLightColor){
      return;
    }

    const fp = this.areaFingerprint(lightManager, camera);
    const lightCacheOk = material.userData[cacheKey] === lightSet.cacheID;
    // Lightmapped materials bind no area uniforms, so only the view transform
    // used for view-space light positions has to stay current.
    const areaOk = usesLightmap
      ? material.userData.odysseyViewSunBound === fp.viewFp
      : (
        material.userData.odysseyAmbientBound === fp.ambientHex &&
        material.userData.odysseySunAmbientBound === fp.sunAmbientHex &&
        material.userData.odysseySunBound === fp.sunHex &&
        material.userData.odysseyHeadLightBound === fp.headKey &&
        material.userData.odysseyViewSunBound === fp.viewFp
      );

    if(lightCacheOk && areaOk && material.userData.odysseyLightArraysSkipped !== true){
      return;
    }

    const count = Math.min(lightSet.count, MAX_ODYSSEY_LIGHTS);
    // Three.UniformsUtils.clone reuses Vector4 element identity across every
    // material cloned from ShaderLib.odyssey — so lightmap clears and lit binds
    // would clobber each other through aliased slots. Always own unique arrays.
    let posArr = material.uniforms.odysseyLightPos.value as THREE.Vector4[];
    let colArr = material.uniforms.odysseyLightColor.value as THREE.Vector4[];
    const needsOwnedPos = !Array.isArray(posArr) || posArr.length !== MAX_ODYSSEY_LIGHTS ||
      !material.userData.odysseyLightPosOwned;
    const needsOwnedCol = !Array.isArray(colArr) || colArr.length !== MAX_ODYSSEY_LIGHTS ||
      !material.userData.odysseyLightColorOwned;
    if(needsOwnedPos){
      posArr = createEmptyOdysseyLightPosArray();
      material.uniforms.odysseyLightPos.value = posArr;
      material.userData.odysseyLightPosOwned = true;
    }
    if(needsOwnedCol){
      colArr = createEmptyOdysseyLightColorArray();
      material.uniforms.odysseyLightColor.value = colArr;
      material.userData.odysseyLightColorOwned = true;
    }

    // View-space positions must refresh when the camera moves even if lightSet is unchanged.
    if(!lightCacheOk || material.userData.odysseyLightArraysSkipped === true || !areaOk){
      this.copyLightArrays(posArr, colArr, lightSet, camera);
    }
    if(!material.uniforms.numOdysseyLights){
      material.uniforms.numOdysseyLights = { value: 0 };
    }
    material.uniforms.numOdysseyLights.value = count;
    if(!areaOk && !usesLightmap){
      this.writeAreaUniforms(material, camera, lightManager, fp.viewSun);
      this.writeHeadLightUniforms(material, lightManager);
    }
    material.userData[cacheKey] = lightSet.cacheID;
    // Leave the area bound keys unset for lightmapped materials so a material
    // that later loses USE_LIGHTMAP still gets its area uniforms written.
    if(!usesLightmap){
      material.userData.odysseyAmbientBound = fp.ambientHex;
      material.userData.odysseySunAmbientBound = fp.sunAmbientHex;
      material.userData.odysseySunBound = fp.sunHex;
      material.userData.odysseyHeadLightBound = fp.headKey;
    }
    material.userData.odysseyViewSunBound = fp.viewFp;
    material.userData.odysseyLightArraysSkipped = false;
    material.uniformsNeedUpdate = true;
  }

  static writeAreaUniforms(
    material: THREE.ShaderMaterial,
    camera?: THREE.Camera,
    lightManager?: LightManager,
    precomputedViewSun?: THREE.Vector3
  ){
    const ambient = lightManager?.ambientColor ?? this.ambientColor;
    const sunAmbient = lightManager?.sunAmbientColor ?? this.sunAmbientColor;
    const sun = lightManager?.sunColor ?? this.sunColor;
    const sunDir = lightManager?.sunDirection ?? this.sunDirection;

    if(material.uniforms.odysseyAmbientColor){
      material.uniforms.odysseyAmbientColor.value.copy(ambient);
    }
    if(material.uniforms.odysseySunAmbientColor){
      material.uniforms.odysseySunAmbientColor.value.copy(sunAmbient);
    }
    if(material.uniforms.odysseySunColor){
      material.uniforms.odysseySunColor.value.copy(sun);
    }
    if(material.uniforms.odysseySunDirection){
      if(precomputedViewSun){
        material.uniforms.odysseySunDirection.value.copy(precomputedViewSun);
      }else if(camera){
        material.uniforms.odysseySunDirection.value.copy(this.resolveViewSunDir(camera, sunDir));
      }else{
        material.uniforms.odysseySunDirection.value.copy(sunDir);
      }
    }
  }

  static writeHeadLightUniforms(material: THREE.ShaderMaterial, lightManager?: LightManager){
    if(!material.uniforms){ return; }
    if(!material.uniforms.odysseyHeadLightEnabled){
      material.uniforms.odysseyHeadLightEnabled = { value: 0 };
    }
    if(!material.uniforms.odysseyHeadLightAmbient){
      material.uniforms.odysseyHeadLightAmbient = { value: new THREE.Color() };
    }
    if(!material.uniforms.odysseyHeadLightDiffuse){
      material.uniforms.odysseyHeadLightDiffuse = { value: new THREE.Color() };
    }
    const enabled = !!lightManager?.headLightEnabled;
    material.uniforms.odysseyHeadLightEnabled.value = enabled ? 1 : 0;
    if(enabled && lightManager){
      material.uniforms.odysseyHeadLightAmbient.value.copy(lightManager.headLightAmbient);
      material.uniforms.odysseyHeadLightDiffuse.value.copy(lightManager.headLightDiffuse);
    }else{
      material.uniforms.odysseyHeadLightAmbient.value.setRGB(0, 0, 0);
      material.uniforms.odysseyHeadLightDiffuse.value.setRGB(0, 0, 0);
    }
  }

  /**
   * Bind multi-light shadow-map uniforms — independent of IGNORE_LIGHTING /
   * light-array skip path so lightmapped static receivers still darken.
   * Matches retail GetShadowLights(mode=0) / DoGobShadows (up to maxShadowLights).
   */
  static bindShadowMapUniforms(
    material: THREE.ShaderMaterial,
    shadowManager?: OdysseyShadowManager,
    _camera?: THREE.Camera
  ){
    if(!material.uniforms){ return; }
    const defines = material.defines || {};
    if(!Object.prototype.hasOwnProperty.call(defines, 'USE_ODYSSEY_SHADOW')){
      return;
    }

    OdysseyLightingBinder.ensureShadowMapBeforeRenderHook(material);

    const manager = shadowManager ?? GameState.odysseyShadowManager;
    const epoch = manager?.frameEpoch ?? 0;
    const activeCount = manager?.activeLightCount ?? 0;
    const softBound = manager?.softShadowMaps ? 1 : 0;
    const shadowTexLive = manager?.getShadowMapTextureAt?.(0) ?? manager?.getShadowMapTexture() ?? null;
    const shadowsActive = activeCount > 0;
    const boundTex = material.uniforms.odysseyShadowMap0?.value
      ?? material.uniforms.odysseyShadowMap?.value
      ?? null;
    const needsTextureRefresh = shadowsActive && !!shadowTexLive && boundTex !== shadowTexLive;
    if(!needsTextureRefresh &&
      material.userData.odysseyShadowBoundEpoch === epoch &&
      material.userData.odysseyShadowGatingBound === GameState.shadowAlpha &&
      material.userData.odysseyBeamingBound === GameState.beamingProjectionAlpha &&
      material.userData.odysseyShadowSoftBound === softBound){
      return;
    }

    if(!material.uniforms.odysseyShadowMap0 || !material.uniforms.odysseyShadowSoft){
      Object.assign(material.uniforms, createOdysseyShadowUniforms());
    }
    if(!material.uniforms.odysseyShadowDistantFactor){
      Object.assign(material.uniforms, createOdysseyShadowUniforms());
    }

    material.uniforms.odysseyBeamingProjectionAlpha.value = GameState.beamingProjectionAlpha;
    material.uniforms.odysseyShadowMapActive.value = activeCount > 0 ? 1.0 : 0.0;
    material.uniforms.odysseyShadowLightCount.value = activeCount;
    if(material.uniforms.odysseyShadowSoft){
      material.uniforms.odysseyShadowSoft.value = manager?.softShadowMaps ? 1.0 : 0.0;
    }
    if(material.uniforms.odysseyShadowConstantBias){
      material.uniforms.odysseyShadowConstantBias.value = ODYSSEY_SHADOW_MAP_DEPTH_BIAS;
    }
    if(material.uniforms.odysseyShadowSlopeBias){
      material.uniforms.odysseyShadowSlopeBias.value = 0.001;
    }

    const mapSize = material.uniforms.odysseyShadowMapSize.value as THREE.Vector2;
    if(manager?.mapResolution){
      mapSize.set(manager.mapResolution, manager.mapResolution);
    }

    const matrices = material.uniforms.odysseyShadowMatrix.value as THREE.Matrix4[];
    const strengths = material.uniforms.odysseyShadowStrength.value as number[];
    const influences = material.uniforms.odysseyShadowInfluenceRadius.value as number[];
    const lightWorlds = material.uniforms.odysseyShadowLightWorld.value as THREE.Vector3[];
    const actives = material.uniforms.odysseyShadowActive.value as number[];
    const distantFactors = material.uniforms.odysseyShadowDistantFactor.value as number[];

    const mapUniformNames = [
      'odysseyShadowMap0',
      'odysseyShadowMap1',
      'odysseyShadowMap2',
      'odysseyShadowMap3',
    ] as const;

    for(let i = 0; i < MAX_ODYSSEY_SHADOW_MAPS; i++){
      const slot = manager?.getSlotState?.(i);
      const tex = manager?.getShadowMapTextureAt?.(i) ?? null;
      const mapUniform = material.uniforms[mapUniformNames[i]];
      if(mapUniform){
        mapUniform.value = (slot?.active && i < activeCount) ? tex : null;
      }
      if(i === 0 && material.uniforms.odysseyShadowMap){
        material.uniforms.odysseyShadowMap.value = mapUniform?.value ?? null;
      }

      if(slot?.active && i < activeCount){
        actives[i] = 1;
        strengths[i] = slot.strength;
        influences[i] = slot.influenceRadius;
        distantFactors[i] = slot.distantFactor ?? 0;
        lightWorlds[i].copy(slot.lightWorld);
        manager?.getShadowMatrixAt?.(i, matrices[i]);
        if(tex?.image && i === 0){
          mapSize.set(tex.image.width || mapSize.x, tex.image.height || mapSize.y);
        }
      }else{
        actives[i] = 0;
        strengths[i] = 0;
        influences[i] = 0;
        distantFactors[i] = 0;
        lightWorlds[i].set(0, 0, 0);
        matrices[i].identity();
      }
    }

    material.userData.odysseyShadowBoundEpoch = epoch;
    material.userData.odysseyShadowGatingBound = GameState.shadowAlpha;
    material.userData.odysseyBeamingBound = GameState.beamingProjectionAlpha;
    material.userData.odysseyShadowSoftBound = softBound;
    material.uniformsNeedUpdate = true;
  }

  /** Rebind live shadow-map texture/matrix right before each shadow receiver draws. */
  static ensureShadowMapBeforeRenderHook(material: THREE.ShaderMaterial){
    if(material.userData.odysseyShadowBeforeRenderHook){ return; }
    material.userData.odysseyShadowBeforeRenderHook = true;
    const previous = material.onBeforeRender;
    material.onBeforeRender = function onOdysseyShadowBeforeRender(renderer, scene, camera){
      if(typeof previous === 'function'){
        previous.call(this, renderer, scene, camera);
      }
      // Shadow map texture/matrix are finalized during this frame's shadow pass.
      delete (this as THREE.ShaderMaterial).userData.odysseyShadowBoundEpoch;
      OdysseyLightingBinder.bindShadowMapUniforms(
        this as THREE.ShaderMaterial,
        GameState.odysseyShadowManager,
        camera
      );
    };
  }

  /** Force shadow-map uniform refresh for every receiver under `root`. */
  static refreshSceneShadowMapUniforms(root: THREE.Object3D){
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if(!mesh.isMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh){ return; }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for(let i = 0; i < mats.length; i++){
        const material = mats[i];
        if(!(material instanceof THREE.ShaderMaterial)){ continue; }
        if(!Object.prototype.hasOwnProperty.call(material.defines || {}, 'USE_ODYSSEY_SHADOW')){
          continue;
        }
        this.ensureShadowMapBeforeRenderHook(material);
        delete material.userData.odysseyShadowBoundEpoch;
        this.bindShadowMapUniforms(material, GameState.odysseyShadowManager, GameState.currentCamera ?? undefined);
      }
    });
  }

  /** @deprecated Use bindShadowMapUniforms */
  static bindScreenSpaceShadowUniforms(
    material: THREE.ShaderMaterial,
    shadowManager?: OdysseyShadowManager,
    camera?: THREE.Camera
  ){
    this.bindShadowMapUniforms(material, shadowManager, camera);
  }

  /** @deprecated Use bindShadowMapUniforms */
  static bindShadowUniforms(
    material: THREE.ShaderMaterial,
    shadowManager?: OdysseyShadowManager,
    camera?: THREE.Camera
  ){
    this.bindShadowMapUniforms(material, shadowManager, camera);
  }

  /** Bind unique ShaderMaterials from a list (heads may already be in model.materials). */
  private static bindMaterialsUnique(
    materials: THREE.Material[],
    bindOne: (material: THREE.ShaderMaterial) => void,
    seen: Set<THREE.Material>
  ){
    for(let i = 0, il = materials.length; i < il; i++){
      const material = materials[i];
      if(!(material instanceof THREE.ShaderMaterial)){ continue; }
      if(seen.has(material)){ continue; }
      seen.add(material);
      bindOne(material);
    }
  }

  static bindModel(
    model: OdysseyModel3D,
    lightSet: IOdysseyLightUniformSlot,
    camera?: THREE.Camera,
    cacheKey = 'odysseyLightCacheID',
    lightManager?: LightManager
  ){
    const seen = this._bindSeen;
    seen.clear();
    const bindOne = (material: THREE.ShaderMaterial) => {
      const defines = material.defines || {};
      // Empty-string define values are falsy; test key presence.
      if(lightManager && Object.prototype.hasOwnProperty.call(defines, 'USE_LIGHTMAP')){
        this.bindMaterial(material, lightManager.getLightmapLightSet(), camera, 'lightmapLightCacheID', lightManager);
        return;
      }
      if(lightManager && Object.prototype.hasOwnProperty.call(defines, 'USE_BUMPMAP')){
        this.bindMaterial(material, lightManager.getBumpMapLightSet(), camera, 'bumpLightCacheID', lightManager);
        return;
      }
      this.bindMaterial(material, lightSet, camera, cacheKey, lightManager);
    };

    this.bindMaterialsUnique(model.materials, bindOne, seen);
    model.traverse((obj) => {
      if(obj !== model && (obj as OdysseyModel3D).materials){
        this.bindMaterialsUnique((obj as OdysseyModel3D).materials, bindOne, seen);
      }
    });
  }

  /**
   * Bind a self-contained scene model (main menu, forge preview, room mesh).
   * Lightmapped → exclusive_dynamic_lights overlay; bump → bump light; else
   * either room globals (ControlLightsFade) or gob GetNearestLights around
   * `focus`.
   *
   * @param lightPath `'room'` = PrioritizeIllumination globals (ARE rooms);
   * `'gob'` = GetNearestLights (RenderOnlyGobs / GUI AddModel).
   */
  private static bindModelShadowUniforms(model: OdysseyModel3D){
    const seen = this._bindSeen;
    seen.clear();
    const bindShadow = (material: THREE.ShaderMaterial) => {
      if(seen.has(material)){ return; }
      seen.add(material);
      if(Object.prototype.hasOwnProperty.call(material.defines || {}, 'USE_ODYSSEY_SHADOW')){
        this.bindShadowMapUniforms(material, GameState.odysseyShadowManager, GameState.currentCamera ?? undefined);
      }
    };
    this.bindMaterialsUnique(model.materials, bindShadow, seen);
    model.traverse((obj) => {
      if(obj !== model && (obj as OdysseyModel3D).materials){
        this.bindMaterialsUnique((obj as OdysseyModel3D).materials, bindShadow, seen);
      }
    });
  }

  static bindSceneModel(
    lightManager: LightManager,
    model: OdysseyModel3D,
    camera?: THREE.Camera,
    focus?: THREE.Vector3,
    lightPath: 'room' | 'gob' = 'room'
  ){
    const focusPos = focus ?? model.getWorldPosition(this._scratchWorldPos);
    const fp = this.areaFingerprint(lightManager, camera);

    if(lightPath === 'gob'){
      const nearestFp = lightManager.fingerprintNearestLights(focusPos);
      const objectFp = this.mixHash(
        nearestFp,
        this.mixHash(
          lightManager.lightsPoseEpoch,
          this.mixHash(lightManager.lightmapLights.cacheID, fp.areaFp)
        )
      );
      if(model.userData.odysseyObjectBindFp === objectFp){
        this.bindModelShadowUniforms(model);
        return;
      }
      const nearest = lightManager.packLastNearestLights();
      this.bindModelMaterials(model, (material) => {
        const defines = material.defines || {};
        const usesLightmap = Object.prototype.hasOwnProperty.call(defines, 'USE_LIGHTMAP');
        const usesBump = Object.prototype.hasOwnProperty.call(defines, 'USE_BUMPMAP');
        const set = usesLightmap
          ? lightManager.getLightmapLightSet()
          : (usesBump ? lightManager.getBumpMapLightSet() : nearest);
        const key = usesLightmap
          ? 'lightmapLightCacheID'
          : (usesBump ? 'bumpLightCacheID' : 'objectLightCacheID');
        this.bindMaterial(material, set, camera, key, lightManager);
      });
      model.userData.odysseyObjectBindFp = objectFp;
      this.bindModelShadowUniforms(model);
      return;
    }

    // Room path: global / bump / lightmap from selection epoch + area/view.
    const roomFp = this.mixHash(
      lightManager.selectionEpoch,
      this.mixHash(
        lightManager.globalLights.cacheID,
        this.mixHash(
          lightManager.bumpMapLights.cacheID,
          this.mixHash(lightManager.lightmapLights.cacheID, fp.areaFp)
        )
      )
    );
    if(model.userData.odysseyBindFp === roomFp){
      this.bindModelShadowUniforms(model);
      return;
    }

    this.bindModelMaterials(model, (material) => {
      const defines = material.defines || {};
      const usesLightmap = Object.prototype.hasOwnProperty.call(defines, 'USE_LIGHTMAP');
      const usesBump = Object.prototype.hasOwnProperty.call(defines, 'USE_BUMPMAP');
      const set = usesLightmap
        ? lightManager.getLightmapLightSet()
        : (usesBump
          ? lightManager.getBumpMapLightSet()
          : lightManager.getGlobalLightSet());
      const key = usesLightmap
        ? 'lightmapLightCacheID'
        : (usesBump ? 'bumpLightCacheID' : 'globalLightCacheID');
      this.bindMaterial(material, set, camera, key, lightManager);
    });
    model.userData.odysseyBindFp = roomFp;
    this.bindModelShadowUniforms(model);
  }

  private static bindModelMaterials(
    model: OdysseyModel3D,
    bindOne: (material: THREE.ShaderMaterial) => void
  ){
    const seen = this._bindSeen;
    seen.clear();
    this.bindMaterialsUnique(model.materials, bindOne, seen);
    model.traverse((obj) => {
      if(obj !== model && (obj as OdysseyModel3D).materials){
        this.bindMaterialsUnique((obj as OdysseyModel3D).materials, bindOne, seen);
      }
    });
  }

  /**
   * Bind rooms (global/lightmap/bump) and dynamic objects from a LightManager.
   */
  static bindArea(
    lightManager: LightManager,
    rooms: Array<{ isVisible(): boolean; model?: unknown }>,
    dynamics: Array<{ model?: unknown; position?: THREE.Vector3 }>,
    camera?: THREE.Camera
  ){
    for(let i = 0; i < rooms.length; i++){
      const room = rooms[i];
      if(!room.isVisible() || !(room.model as OdysseyModel3D)?.materials){ continue; }
      this.bindSceneModel(lightManager, room.model as OdysseyModel3D, camera);
    }

    const fp = this.areaFingerprint(lightManager, camera);
    for(let i = 0; i < dynamics.length; i++){
      const obj = dynamics[i];
      if(!(obj?.model as OdysseyModel3D)?.materials){ continue; }
      const model = obj.model as OdysseyModel3D;
      const pos = (obj as any).position instanceof THREE.Vector3
        ? (obj as any).position
        : model.getWorldPosition(this._scratchWorldPos);
      const nearestFp = lightManager.fingerprintNearestLights(pos);
      const objectFp = this.mixHash(
        nearestFp,
        this.mixHash(
          lightManager.lightsPoseEpoch,
          this.mixHash(lightManager.lightmapLights.cacheID, fp.areaFp)
        )
      );
      if(model.userData.odysseyObjectBindFp === objectFp){
        this.bindModelShadowUniforms(model);
        continue;
      }
      // RenderOnlyGobs → GetNearestLights(..., 2.0, 0); reuse last nearest scratch
      const set = lightManager.packLastNearestLights();
      this.bindModel(model, set, camera, 'objectLightCacheID', lightManager);
      model.userData.odysseyObjectBindFp = objectFp;
    }
  }
}
