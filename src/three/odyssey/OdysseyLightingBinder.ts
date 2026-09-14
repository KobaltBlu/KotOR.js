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
import { OdysseyLightingDebug } from "@/utility/odysseyLightingDebug";
import { envMapRotationFromCamera } from "@/utility/envMapRotation";

/**
 * OdysseyLightingBinder — pushes packed Odyssey light + area ambient/sun
 * uniforms onto ShaderMaterials. Materials must use lights: false.
 *
 * Light positions / sun direction are uploaded in **world space**; the fragment
 * shader applies viewMatrix. Camera motion no longer invalidates light arrays.
 *
 * split (LoadArea / SetAsDay):
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
   * places gidy_sun at (4000, 4500, 7000) in LoadArea.
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
  /** Materials with USE_ODYSSEY_SHADOW — avoids full scene.traverse on refresh. */
  private static _shadowReceivers = new Set<THREE.ShaderMaterial>();

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

  /** Integer hash of the complete camera basis plus translation. */
  private static cameraViewFingerprint(camera?: THREE.Camera): number {
    if(!camera){ return 0; }
    camera.updateMatrixWorld();
    const e = camera.matrixWorldInverse.elements;
    // Diagonal-only fingerprints alias opposite yaw/pitch angles, leaving the
    // envmap rotation frozen until a coarse threshold changes (visible snaps).
    const basis = [0, 1, 2, 4, 5, 6, 8, 9, 10];
    let h = 0x811c9dc5;
    for(let i = 0; i < basis.length; i++){
      h = Math.imul(h ^ (Math.round(e[basis[i]] * 1e6) | 0), 16777619);
    }
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
    // Kept for envmap / legacy callers; lighting uploads use world sun.
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
    _camera: THREE.Camera | undefined
  ): { ambientHex: number; sunAmbientHex: number; sunHex: number; headKey: number; viewFp: number; viewSun: THREE.Vector3; areaFp: number; sunDirFp: number } {
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
    const sunDirFp = this.mixHash(
      Math.round(sunDir.x * 1e5) | 0,
      this.mixHash(Math.round(sunDir.y * 1e5) | 0, Math.round(sunDir.z * 1e5) | 0)
    );
    // Camera is intentionally excluded — lights/sun are world-space; shader applies viewMatrix.
    let areaFp = ambientHex;
    areaFp = this.mixHash(areaFp, sunAmbientHex);
    areaFp = this.mixHash(areaFp, sunHex);
    areaFp = this.mixHash(areaFp, headKey);
    areaFp = this.mixHash(areaFp, sunDirFp);
    if(lightManager){
      areaFp = this.mixHash(areaFp, lightManager.getAreaFingerprint());
    }
    return { ambientHex, sunAmbientHex, sunHex, headKey, viewFp: 0, viewSun: sunDir, areaFp, sunDirFp };
  }

  /**
   * Copy world-space light slots into material arrays (no view transform).
   */
  private static copyLightArrays(
    posArr: THREE.Vector4[],
    colArr: THREE.Vector4[],
    lightSet: IOdysseyLightUniformSlot,
    _camera?: THREE.Camera
  ){
    for(let i = 0; i < MAX_ODYSSEY_LIGHTS; i++){
      posArr[i].copy(lightSet.odysseyLightPos[i]);
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
    // receive the exclusive_dynamic_lights overlay (dynamic-only lights @
    //) but never area sun/ambient — that is baked into the lightmap.
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
    // World-space lights: area fingerprint has no camera term.
    const areaOk = usesLightmap
      ? material.userData.odysseyAreaBound === fp.areaFp
      : (
        material.userData.odysseyAmbientBound === fp.ambientHex &&
        material.userData.odysseySunAmbientBound === fp.sunAmbientHex &&
        material.userData.odysseySunBound === fp.sunHex &&
        material.userData.odysseyHeadLightBound === fp.headKey &&
        material.userData.odysseySunDirBound === fp.sunDirFp &&
        material.userData.odysseyAreaBound === fp.areaFp
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
    if(!usesLightmap){
      material.userData.odysseyAmbientBound = fp.ambientHex;
      material.userData.odysseySunAmbientBound = fp.sunAmbientHex;
      material.userData.odysseySunBound = fp.sunHex;
      material.userData.odysseyHeadLightBound = fp.headKey;
      material.userData.odysseySunDirBound = fp.sunDirFp;
    }
    material.userData.odysseyAreaBound = fp.areaFp;
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
      // World-space; fragment applies mat3(viewMatrix).
      const worldSun = precomputedViewSun ?? sunDir;
      material.uniforms.odysseySunDirection.value.copy(worldSun);
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
   * matches engine behavior shadow light selection(mode=0) / gob shadows (up to maxShadowLights).
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
    const lightingRev = OdysseyLightingDebug.revision;
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
      material.userData.odysseyShadowSoftBound === softBound &&
      material.userData.odysseyLightingDebugRevision === lightingRev){
      return;
    }

    if(!material.uniforms.odysseyShadowMap0 || !material.uniforms.odysseyShadowSoft){
      Object.assign(material.uniforms, createOdysseyShadowUniforms());
    }
    if(!material.uniforms.odysseyShadowDistantFactor || !material.uniforms.odysseyShadowSoftTexelSpreadLocal){
      Object.assign(material.uniforms, createOdysseyShadowUniforms());
    }

    const d = OdysseyLightingDebug.values;
    material.uniforms.odysseyBeamingProjectionAlpha.value = GameState.beamingProjectionAlpha;
    material.uniforms.odysseyShadowMapActive.value = activeCount > 0 ? 1.0 : 0.0;
    material.uniforms.odysseyShadowLightCount.value = activeCount;
    if(material.uniforms.odysseyShadowSoft){
      material.uniforms.odysseyShadowSoft.value = manager?.softShadowMaps ? 1.0 : 0.0;
    }
    if(material.uniforms.odysseyShadowConstantBias){
      material.uniforms.odysseyShadowConstantBias.value = d.constantBias;
    }
    if(material.uniforms.odysseyShadowSlopeBias){
      material.uniforms.odysseyShadowSlopeBias.value = d.slopeBias;
    }
    if(material.uniforms.odysseyShadowSoftTexelSpreadLocal){
      material.uniforms.odysseyShadowSoftTexelSpreadLocal.value = d.softTexelSpreadLocal;
    }
    if(material.uniforms.odysseyShadowSoftTexelSpreadDistant){
      material.uniforms.odysseyShadowSoftTexelSpreadDistant.value = d.softTexelSpreadDistant;
    }
    if(material.uniforms.odysseyShadowSoftDepthWidthLocal){
      material.uniforms.odysseyShadowSoftDepthWidthLocal.value = d.softDepthWidthLocal;
    }
    if(material.uniforms.odysseyShadowSoftDepthWidthDistant){
      material.uniforms.odysseyShadowSoftDepthWidthDistant.value = d.softDepthWidthDistant;
    }
    if(material.uniforms.odysseyShadowInfluenceFadeStart){
      material.uniforms.odysseyShadowInfluenceFadeStart.value = d.influenceFadeStart;
    }
    if(material.uniforms.odysseyShadowInfluenceFadeStartSoft){
      material.uniforms.odysseyShadowInfluenceFadeStartSoft.value = d.influenceFadeStartSoft;
    }
    if(material.uniforms.odysseyShadowMapEdgeFade){
      material.uniforms.odysseyShadowMapEdgeFade.value = d.mapEdgeFade;
    }
    if(material.uniforms.odysseyShadowMapEdgeFadeSoft){
      material.uniforms.odysseyShadowMapEdgeFadeSoft.value = d.mapEdgeFadeSoft;
    }
    if(material.uniforms.odysseyShadowFloorBiasScale){
      material.uniforms.odysseyShadowFloorBiasScale.value = d.floorBiasScale;
    }
    if(material.uniforms.odysseyShadowContactNormalZ){
      material.uniforms.odysseyShadowContactNormalZ.value = d.contactNormalZ;
    }
    if(material.uniforms.odysseyShadowMinVertexColor){
      material.uniforms.odysseyShadowMinVertexColor.value = d.minVertexColor;
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
    material.userData.odysseyLightingDebugRevision = lightingRev;
    material.uniformsNeedUpdate = true;
  }

  /**
   * Track a shadow-receiving material for registry refreshes.
   * Dispose unwraps so disposed materials do not leak in the set.
   */
  static registerShadowReceiver(material: THREE.ShaderMaterial){
    if(material.userData.odysseyShadowReceiverRegistered){ return; }
    material.userData.odysseyShadowReceiverRegistered = true;
    this._shadowReceivers.add(material);
    const previousDispose = material.dispose.bind(material);
    material.dispose = () => {
      OdysseyLightingBinder._shadowReceivers.delete(material);
      delete material.userData.odysseyShadowReceiverRegistered;
      previousDispose();
    };
  }

  /** Rebind live shadow-map texture/matrix right before each shadow receiver draws. */
  static ensureShadowMapBeforeRenderHook(material: THREE.ShaderMaterial){
    OdysseyLightingBinder.registerShadowReceiver(material);
    if(material.userData.odysseyShadowBeforeRenderHook){ return; }
    material.userData.odysseyShadowBeforeRenderHook = true;
    const previous = material.onBeforeRender;
    material.onBeforeRender = function onOdysseyShadowBeforeRender(renderer, scene, camera){
      if(typeof previous === 'function'){
        previous.call(this, renderer, scene, camera);
      }
      // Epoch early-out inside bindShadowMapUniforms; only force when the live
      // shadow texture identity differs from the bound sampler (map just created).
      const mat = this as THREE.ShaderMaterial;
      const manager = GameState.odysseyShadowManager;
      const liveTex = manager?.getShadowMapTextureAt?.(0) ?? manager?.getShadowMapTexture() ?? null;
      const boundTex = mat.uniforms?.odysseyShadowMap0?.value
        ?? mat.uniforms?.odysseyShadowMap?.value
        ?? null;
      if(liveTex && boundTex !== liveTex){
        delete mat.userData.odysseyShadowBoundEpoch;
      }
      OdysseyLightingBinder.bindShadowMapUniforms(mat, manager, camera);
    };
  }

  /**
   * Force shadow-map uniform refresh for every registered receiver.
   * `root` is retained for call-site compatibility; iteration uses the registry
   * instead of scene.traverse.
   */
  static refreshSceneShadowMapUniforms(_root?: THREE.Object3D){
    const camera = GameState.currentCamera ?? undefined;
    const manager = GameState.odysseyShadowManager;
    // Snapshot so dispose / stale removal during bind cannot disturb iteration.
    const receivers = Array.from(this._shadowReceivers);
    for(let i = 0; i < receivers.length; i++){
      const material = receivers[i];
      if(!Object.prototype.hasOwnProperty.call(material.defines || {}, 'USE_ODYSSEY_SHADOW')){
        this._shadowReceivers.delete(material);
        delete material.userData.odysseyShadowReceiverRegistered;
        continue;
      }
      this.ensureShadowMapBeforeRenderHook(material);
      delete material.userData.odysseyShadowBoundEpoch;
      this.bindShadowMapUniforms(material, manager, camera);
    }
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
   * either room globals (light fade pass) or gob nearest light selection around
   * `focus`.
   *
   * @param lightPath `'room'` = illumination prioritize globals (ARE rooms);
   * `'gob'` = nearest light selection (RenderOnlyGobs / GUI AddModel).
   */
  private static bindModelShadowUniforms(model: OdysseyModel3D){
    const manager = GameState.odysseyShadowManager;
    const epoch = manager?.frameEpoch ?? 0;
    const softBound = manager?.softShadowMaps ? 1 : 0;
    const lightingRev = OdysseyLightingDebug.revision;
    if(
      model.userData.odysseyShadowBoundEpoch === epoch &&
      model.userData.odysseyShadowGatingBound === GameState.shadowAlpha &&
      model.userData.odysseyBeamingBound === GameState.beamingProjectionAlpha &&
      model.userData.odysseyShadowSoftBound === softBound &&
      model.userData.odysseyLightingDebugRevision === lightingRev
    ){
      return;
    }

    const seen = this._bindSeen;
    seen.clear();
    // bindMaterialsUnique already dedupes via `seen`; do not re-check here.
    const bindShadow = (material: THREE.ShaderMaterial) => {
      if(Object.prototype.hasOwnProperty.call(material.defines || {}, 'USE_ODYSSEY_SHADOW')){
        this.bindShadowMapUniforms(material, manager, GameState.currentCamera ?? undefined);
      }
    };
    this.bindMaterialsUnique(model.materials, bindShadow, seen);
    model.traverse((obj) => {
      if(obj !== model && (obj as OdysseyModel3D).materials){
        this.bindMaterialsUnique((obj as OdysseyModel3D).materials, bindShadow, seen);
      }
    });

    model.userData.odysseyShadowBoundEpoch = epoch;
    model.userData.odysseyShadowGatingBound = GameState.shadowAlpha;
    model.userData.odysseyBeamingBound = GameState.beamingProjectionAlpha;
    model.userData.odysseyShadowSoftBound = softBound;
    model.userData.odysseyLightingDebugRevision = lightingRev;
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
    // Retail DoEnvMapTransform applies the current camera orientation every
    // render. Lighting cache keys intentionally exclude the camera now that
    // light arrays are world-space, so update env rotations outside the
    // potentially cached light-uniform path.
    this.bindModelEnvMapRotations(model, camera);

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

  private static bindModelEnvMapRotations(
    model: OdysseyModel3D,
    camera?: THREE.Camera
  ){
    const seen = this._bindSeen;
    seen.clear();
    const bindOne = (material: THREE.ShaderMaterial) => {
      this.writeEnvMapRotation(material, camera);
    };
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
      // Hybrid runtime lightmaps: bake holds DynAmbient (+ type-0); gob lights
      // come from nearest light selection on every material (lightmapped and dynamic).
      // Using exclusive_dynamic here left placeables flat; baking type-2 made them
      // over-bright vs the animating nearest path.
      if(model.userData.odysseyRuntimeLightmap || model.userData.odysseyPlaceableLightmap){
        const pos = (obj as any).position instanceof THREE.Vector3
          ? (obj as any).position
          : model.getWorldPosition(this._scratchWorldPos);
        const nearestFp = lightManager.fingerprintNearestLights(pos);
        const hybridFp = this.mixHash(
          nearestFp,
          this.mixHash(
            lightManager.lightsPoseEpoch,
            this.mixHash(lightManager.selectionEpoch, fp.areaFp)
          )
        );
        if(model.userData.odysseyObjectBindFp === hybridFp){
          this.bindModelShadowUniforms(model);
          continue;
        }
        const nearest = lightManager.packLastNearestLights();
        this.bindModelMaterials(model, (material) => {
          // Same nearest set for USE_LIGHTMAP and dynamic mats — lightmap supplies
          // baked ambient/type-0; point overlay matches gob nearest light selection.
          this.bindMaterial(material, nearest, camera, 'objectLightCacheID', lightManager);
        });
        model.userData.odysseyObjectBindFp = hybridFp;
        this.bindModelShadowUniforms(model);
        continue;
      }
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
      // RenderOnlyGobs → nearest light selection(..., 2.0, 0); reuse last nearest scratch
      const set = lightManager.packLastNearestLights();
      this.bindModel(model, set, camera, 'objectLightCacheID', lightManager);
      model.userData.odysseyObjectBindFp = objectFp;
    }
  }
}
