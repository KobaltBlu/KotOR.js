import * as THREE from "three";
import { OdysseyLight3D } from "@/three/odyssey";
import type { ModuleObject } from "@/module";
import { TwoDAManager } from "@/managers/TwoDAManager";
import { MAX_ODYSSEY_LIGHTS } from "@/shaders/chunks/OdysseyLighting";
import {
  compareRetailLights,
  retailDynamicRank,
  retailEffectivePriority,
  retailFadeInit,
  retailFadeStep,
  retailIlluminationScore,
  retailQuadraticAttenuation,
  retailShadowFadeStep,
  isRetailShadowColorVisible,
  retailSelectIlluminationBump,
  retailSelectPrioritizeBump,
  retailSelectDistantStaticShadowLight,
  retailSelectDynamicOnlyLights,
  retailModelLightSlots,
  retailVideoQualityRowIndex,
  RETAIL_GOB_LIGHT_RADIUS as RETAIL_GOB_LIGHT_RADIUS_CONST,
  RETAIL_MAX_LIGHTS_PER_MODEL,
  RetailLightFadeChannel,
  RetailShadowLightMode,
  type IRetailLightSortKey,
} from "@/utility/retailLighting";

/**
 * Fixed-size, shader-ready light buffers. Positions are world-space in the
 * manager; OdysseyLightingBinder transforms xyz to view-space on upload.
 * `w` holds retail's quadratic attenuation coefficient. Colors use `w` as the
 * ambient-only flag.
 */
export interface IOdysseyLightUniformSlot {
  odysseyLightPos: THREE.Vector4[];
  odysseyLightColor: THREE.Vector4[];
  count: number;
  cacheID: number;
}

function createLightUniformSet(): IOdysseyLightUniformSlot {
  const odysseyLightPos: THREE.Vector4[] = [];
  const odysseyLightColor: THREE.Vector4[] = [];
  for(let i = 0; i < MAX_ODYSSEY_LIGHTS; i++){
    odysseyLightPos.push(new THREE.Vector4());
    odysseyLightColor.push(new THREE.Vector4());
  }
  return { odysseyLightPos, odysseyLightColor, count: 0, cacheID: 0 };
}

/**
 * Dynamic lighting aligned with retail K1 LightManager / PartLight selection,
 * fade, ambient flag, and quadratic attenuation. Shader RGB follows the VP
 * path (fade×color / color; no PartLight.multiplier). This manager deliberately
 * owns only Odyssey light data; no THREE.Light instances exist.
 */
export class LightManager {
  /**
   * Scene dynamic-light budget: up to 8 hardware lights (GL_LIGHT0..7),
   * NumDynamicLights row in videoquality.2da, capped by shader capacity.
   */
  static MAXLIGHTS = MAX_ODYSSEY_LIGHTS;
  /** NumShadowCastingLights row in videoquality.2da. */
  static MAXSHADOWLIGHTS = 3;
  /**
   * Per-model light cap: retail hard-sets VertexProgram allowed_lights = 3
   * (VertexProgram ctor). Each model's shader receives at most the
   * top 3 of the scene's prioritized lights (SetUpVertexProgramLightShaderConstants
   *), and GetNearestLights likewise packs GL_LIGHT0..2.
   */
  static MAX_LIGHTS_PER_MODEL = RETAIL_MAX_LIGHTS_PER_MODEL;
  /**
   * Object query radius passed to GetNearestLights from RenderOnlyGobs
   * (hardcoded 2.0).
   */
  static RETAIL_GOB_LIGHT_RADIUS = RETAIL_GOB_LIGHT_RADIUS_CONST;

  modelLightCounter: Record<string, number> = {};
  lights: OdysseyLight3D[] = [];
  /**
   * Retail render_lights: ControlLightsFade output (bound/fading pool).
   * PrioritizeShadow / PrioritizeBump scan this list.
   */
  boundLights: OdysseyLight3D[] = [];
  /** Current top-N light-selection result, before fading retention. */
  selectedLights: OdysseyLight3D[] = [];
  /**
   * bump_map_lights from PrioritizeIllumination (default) or PrioritizeBump.
   */
  bumpLights: OdysseyLight3D[] = [];
  /**
   * Retail exclusive_dynamic_lights: the fading pool built by
   * EnableLightsDynamicOnly from the `n_dynamic_type == 1` subset of
   * prioritized_lights. RenderStaticGeometry binds this set before
   * drawing static/lightmapped geometry, so these are the only lights that
   * overlay a bake.
   */
  exclusiveDynamicLights: OdysseyLight3D[] = [];
  lightsShown = new Set<string>();

  /** Room lights: selected/fading light set. */
  globalLights: IOdysseyLightUniformSlot = createLightUniformSet();
  /** Dynamic object lights: selected non-ambient lights plus nearby ambient lights. */
  dynamicLights: IOdysseyLightUniformSlot = createLightUniformSet();
  /** Bump-map materials: at most one prioritized dynamic light. */
  bumpMapLights: IOdysseyLightUniformSlot = createLightUniformSet();
  /**
   * Lightmap materials: exclusive_dynamic_lights packed with the secondary fade
   * channel. Static (type 0) contribution is already in the bake.
   */
  lightmapLights: IOdysseyLightUniformSlot = createLightUniformSet();
  /** Scratch buffer for per-object GetNearestLights packing. */
  objectLights: IOdysseyLightUniformSlot = createLightUniformSet();

  /** GetShadowLights(mode=0) multi-light set for gob / stencil disks. */
  shadowLights: OdysseyLight3D[] = [];
  /** GetShadowLights(mode=1) single dynamic light for static mesh shadows. */
  staticMeshShadowLights: OdysseyLight3D[] = [];
  /** GetShadowLights(mode=2) distant/static light. */
  distantShadowLight: OdysseyLight3D | undefined;

  /**
   * Per-context area lighting (ARE DynAmbient + sun/moon). Owned by each
   * LightManager so gameplay / GUI / Forge previews cannot overwrite each other.
   */
  ambientColor = new THREE.Color(1, 1, 1);
  sunAmbientColor = new THREE.Color(0, 0, 0);
  sunColor = new THREE.Color(0, 0, 0);
  sunDirection = new THREE.Vector3(4000, 4500, 7000).normalize();

  /**
   * Camera headlight (SetUpVertexProgramLightShaderConstants).
   * When enabled, reserves one of the model's three light slots.
   */
  headLightEnabled = false;
  headLightAmbient = new THREE.Color(1, 1, 1);
  headLightDiffuse = new THREE.Color(1, 1, 1);

  /** Soft-shadow INI path (Graphics Options.Soft Shadows). */
  softShadowsEnabled = false;

  focusPosition = new THREE.Vector3();
  context: any;
  /** Next registration ordinal for lightcmp pointer-order approximation. */
  private nextRegistrationOrder = 0;

  /**
   * Bumped when any registered light's world pose changes (epsilon).
   * Used by binder model-level gob skip fingerprints.
   */
  lightsPoseEpoch = 0;
  /**
   * Bumped when packed global/bump/dynamic uniform cacheIDs change after sync.
   * Used by binder model-level room skip fingerprints.
   */
  selectionEpoch = 0;

  /** Reused scratch for PrioritizeIllumination candidates. */
  private _candidateScratch: OdysseyLight3D[] = [];
  /** Double-buffer for ControlLightsFade next bound set. */
  private _boundNextScratch: OdysseyLight3D[] = [];
  /** Double-buffer for the exclusive_dynamic_lights fade pool. */
  private _exclusiveNextScratch: OdysseyLight3D[] = [];
  /** Reused EnableLightsDynamicOnly desired set (n_dynamic_type == 1). */
  private _dynamicOnlyScratch: OdysseyLight3D[] = [];
  private _exclusiveShownScratch = new Set<string>();
  private _desiredIndexScratch = new Map<string, number>();
  private _registeredScratch = new Set<string>();
  private _ambientScratch: OdysseyLight3D[] = [];
  private _dynamicScratch: OdysseyLight3D[] = [];
  private _bumpBoundScratch: OdysseyLight3D[] = [];
  private _appendSeenScratch = new Set<string>();
  private _fillColor = new THREE.Color();
  private _shadowCandidateScratch: OdysseyLight3D[] = [];
  private _shadowDesiredScratch: OdysseyLight3D[] = [];
  private _shadowNextScratch: OdysseyLight3D[] = [];
  private _shadowDesiredSetScratch = new Set<string>();
  /** Reused GetNearestLights result (valid until next nearest query). */
  private _nearestScratch: OdysseyLight3D[] = [];
  private _poseScratch = new THREE.Vector3();
  private _prevGlobalCacheID = -1;
  private _prevBumpCacheID = -1;
  private _prevDynamicCacheID = -1;
  private _prevLightmapCacheID = -1;

  init(context: any){
    this.context = context;
    LightManager.MAXLIGHTS = MAX_ODYSSEY_LIGHTS;
    LightManager.MAXSHADOWLIGHTS = 3;
    this.applyVideoQualityLimits();
    this.clearLights();
  }

  setAreaAmbient(color: THREE.Color | number, g?: number, b?: number){
    if(typeof color === 'number'){
      this.ambientColor.setRGB(color, g ?? 0, b ?? 0);
    }else{
      this.ambientColor.copy(color);
    }
  }

  setAreaSunAmbient(color: THREE.Color | number, g?: number, b?: number){
    if(typeof color === 'number'){
      this.sunAmbientColor.setRGB(color, g ?? 0, b ?? 0);
    }else{
      this.sunAmbientColor.copy(color);
    }
  }

  setAreaSun(color: THREE.Color | number, g?: number, b?: number){
    if(typeof color === 'number'){
      this.sunColor.setRGB(color, g ?? 0, b ?? 0);
    }else{
      this.sunColor.copy(color);
    }
  }

  setAreaSunDirection(x: number, y: number, z: number){
    this.sunDirection.set(x, y, z).normalize();
  }

  setHeadLightEnabled(on: boolean){
    this.headLightEnabled = !!on;
  }

  /**
   * Read NumDynamicLights / NumShadowCastingLights from the active
   * videoquality.2da row (Texture Quality / Video Quality INI).
   * The dynamic limit cannot exceed MAX_ODYSSEY_LIGHTS, the fixed GLSL array size.
   */
  applyVideoQualityLimits(){
    const vq = this.context?.TwoDAManager?.datatables?.get?.('videoquality')
      ?? TwoDAManager.datatables?.get?.('videoquality');
    if(!vq?.rows){ return; }

    const count = vq.RowCount | 0;
    const ini = this.context?.iniConfig;
    const textureQuality = Number(ini?.getProperty?.('Graphics Options.Texture Quality'));
    const videoQuality = Number(ini?.getProperty?.('Graphics Options.Video Quality'));
    const rowIndex = retailVideoQualityRowIndex(count, textureQuality, videoQuality);
    const row = vq.rows[rowIndex] || vq.rows[0] || vq.getByID?.(0);
    if(!row){ return; }

    const dyn = Number(row.numdynamiclights ?? row.NumDynamicLights ?? row.dynamiclights);
    const sh = Number(row.numshadowcastinglights ?? row.NumShadowCastingLights ?? row.shadowlights);
    if(Number.isFinite(dyn) && dyn > 0){
      LightManager.MAXLIGHTS = Math.min(MAX_ODYSSEY_LIGHTS, Math.max(1, Math.floor(dyn)));
    }
    if(Number.isFinite(sh) && sh > 0){
      LightManager.MAXSHADOWLIGHTS = Math.max(1, Math.floor(sh));
    }
    this.softShadowsEnabled = Number(ini?.getProperty?.('Graphics Options.Soft Shadows')) === 1;
    const shadowsIni = ini?.getProperty?.('Graphics Options.Shadows');
    if(shadowsIni !== undefined && shadowsIni !== null && shadowsIni !== ''){
      this.context.userShadowsEnabled = String(shadowsIni) !== '0';
    }
  }

  clearLights(){
    this.modelLightCounter = {};
    this.lights = [];
    this.boundLights = [];
    this.selectedLights = [];
    this.bumpLights = [];
    this.exclusiveDynamicLights = [];
    this.shadowLights = [];
    this.staticMeshShadowLights = [];
    this.distantShadowLight = undefined;
    this.nextRegistrationOrder = 0;
    this.lightsShown.clear();
    this.clearUniformSet(this.globalLights);
    this.clearUniformSet(this.dynamicLights);
    this.clearUniformSet(this.bumpMapLights);
    this.clearUniformSet(this.lightmapLights);
    this.clearUniformSet(this.objectLights);

    // Keep the legacy scene group empty for integrations that still expect it.
    const lightGroup = this.context?.group?.lights;
    while(lightGroup?.children?.length){
      lightGroup.remove(lightGroup.children[0]);
    }
  }

  private clearUniformSet(set: IOdysseyLightUniformSlot){
    for(let i = 0; i < MAX_ODYSSEY_LIGHTS; i++){
      set.odysseyLightPos[i].set(0, 0, 0, 0);
      set.odysseyLightColor[i].set(0, 0, 0, 0);
    }
    set.count = 0;
    set.cacheID++;
  }

  addLight(light: OdysseyLight3D){
    if(light && this.lights.indexOf(light) === -1){
      light.registrationOrder = this.nextRegistrationOrder++;
      this.lights.push(light);
      light.getWorldPosition(light.worldPosition);
      this.lightsPoseEpoch++;
    }
  }

  removeLight(light: OdysseyLight3D){
    const index = this.lights.indexOf(light);
    if(index >= 0){
      this.lights.splice(index, 1);
      this.lightsPoseEpoch++;
    }
    this.boundLights = this.boundLights.filter((entry) => entry !== light);
    this.selectedLights = this.selectedLights.filter((entry) => entry !== light);
    this.bumpLights = this.bumpLights.filter((entry) => entry !== light);
    this.exclusiveDynamicLights = this.exclusiveDynamicLights.filter((entry) => entry !== light);
    this.shadowLights = this.shadowLights.filter((entry) => entry !== light);
    this.staticMeshShadowLights = this.staticMeshShadowLights.filter((entry) => entry !== light);
    if(this.distantShadowLight === light){ this.distantShadowLight = undefined; }
    this.syncUniformBuffers();
  }

  /**
   * Score lights relative to a focus position (retail Scene.focus_position), then
   * run PrioritizeIllumination / ControlLightsFade / shadow selection.
   * Accepts a Camera, ModuleObject, or any object with a world `position`.
   */
  update(delta = 0, target: THREE.Camera|ModuleObject|{ position: THREE.Vector3 }){
    if(!target?.position) return;

    this.focusPosition.copy(target.position);
    let poseChanged = false;
    for(let i = 0, il = this.lights.length; i < il; i++){
      const light = this.lights[i];
      light.getWorldPosition(this._poseScratch);
      if(this._poseScratch.distanceToSquared(light.worldPosition) > 1e-8){
        poseChanged = true;
      }
      light.worldPosition.copy(this._poseScratch);
      light.cameraDistance = this.focusPosition.distanceTo(light.worldPosition);
      light.illuminationScore = retailIlluminationScore(
        light.worldPosition.x,
        light.worldPosition.y,
        this.focusPosition.x,
        this.focusPosition.y,
        light.getRadius()
      );
    }
    if(poseChanged){
      this.lightsPoseEpoch++;
    }

    this.updateDynamicLights(delta);
    this.updateShadowLightSelection(delta);
  }

  /**
   * PrioritizeIllumination eligibility for the room/global render set:
   * radius != 0 and color not black. Score <= 1 is applied by the caller.
   * Unlike GetNearestLights, static lights (no dynamic/affectDynamic) are included.
   */
  isPrioritizeEligible(light: OdysseyLight3D): boolean {
    return !!light &&
      !!light.odysseyModel?.visible &&
      light.getRadius() > 0 &&
      !light.isColorBlack();
  }

  /** @deprecated Use isPrioritizeEligible / isNearestLightEligible. */
  isEligibleLight(light: OdysseyLight3D): boolean {
    return this.isNearestLightEligible(light) &&
      !!light.odysseyModel?.visible &&
      !light.isColorBlack();
  }

  buildSortKey(light: OdysseyLight3D): IRetailLightSortKey {
    const key = light.sortKey;
    key.priority = retailEffectivePriority(light.priority, light.authoredPriority);
    key.dynamicRank = retailDynamicRank(light.dynamicType ?? (light.isDynamic ? 1 : 0));
    key.illuminationScore = light.illuminationScore;
    key.colorIsBlack = light.isColorBlack();
    key.registrationOrder = light.registrationOrder;
    key.uuid = light.uuid;
    return key;
  }

  /** Sort in place using lightcmp. buildSortKey mutates per-light scratch (no alloc). */
  private prepareAndSort(lights: OdysseyLight3D[]){
    lights.sort(this.sortLights);
  }

  sortLights = (a: OdysseyLight3D, b: OdysseyLight3D) => {
    return compareRetailLights(this.buildSortKey(a), this.buildSortKey(b));
  };

  /**
   * PrioritizeLights + PrioritizeIllumination (arg1=false): score lights,
   * keep those with score <= 1, sort via lightcmp. Cap at MAXLIGHTS for the
   * desired fade set (ControlLightsFade). No per-parent limit — that is a
   * GetNearestLights / GL_LIGHT0..2 concern only.
   */
  updateDynamicLights(delta = 0){
    const candidates = this._candidateScratch;
    candidates.length = 0;
    for(let i = 0, il = this.lights.length; i < il; i++){
      const light = this.lights[i];
      if(this.isPrioritizeEligible(light) && light.illuminationScore <= 1){
        candidates.push(light);
      }
    }
    this.prepareAndSort(candidates);

    this.modelLightCounter = {};
    this.lightsShown.clear();
    this.selectedLights.length = 0;
    const selectedCount = Math.min(candidates.length, LightManager.MAXLIGHTS);
    for(let i = 0; i < selectedCount; i++){
      this.selectedLights.push(candidates[i]);
    }
    this.updateBumpLightSelection(candidates);

    this.reclaimLights(delta, this.selectedLights);
    // EnableLightsDynamicOnly scans the full prioritized list, not the capped
    // room selection, so pass the sorted candidates.
    this.reclaimExclusiveDynamicLights(delta, candidates);
    this.syncUniformBuffers();
  }

  /**
   * PrioritizeIllumination bump_map_lights: scan the first 3 sorted
   * illumination lights; keep the first non-ambient with n_dynamic_type != 0.
   */
  updateBumpLightSelection(sortedCandidates: OdysseyLight3D[] = this.selectedLights){
    this.bumpLights = retailSelectIlluminationBump(sortedCandidates);
  }

  /**
   * Standalone PrioritizeBump: non-ambient dynamic lights from the
   * render/fade pool, lightcmp-sorted, capped at 1. Used when retail selects
   * the independent bump path instead of the illumination-inline scan.
   */
  prioritizeBump(){
    this.bumpLights = retailSelectPrioritizeBump(this.boundLights, this.sortLights);
    this.fillUniformSet(this.bumpMapLights, this.bumpLights);
  }

  /** Read the fade field ControlLightsFade selects for `channel`. */
  private readFade(light: OdysseyLight3D, channel: RetailLightFadeChannel): number {
    return channel === RetailLightFadeChannel.Secondary
      ? light.dynamicOnlyFadeFactor
      : light.fadeFactor;
  }

  private writeFade(light: OdysseyLight3D, channel: RetailLightFadeChannel, value: number){
    if(channel === RetailLightFadeChannel.Secondary){
      light.dynamicOnlyFadeFactor = value;
    }else{
      light.fadeFactor = value;
    }
  }

  /**
   * ControlLightsFade: keep the bound render-light pool, fade with
   * ±deltaT, and apply fadingLightFlag only as the initial fade (0 vs 1).
   * Lights leaving the desired set always fade out — not only when isFading.
   *
   * `channel` selects the PartLight fade field (retail arg4), so the room
   * pool and the static-geometry pool fade independently.
   */
  private controlLightsFade(
    boundPool: OdysseyLight3D[],
    desiredLights: OdysseyLight3D[],
    delta: number,
    channel: RetailLightFadeChannel,
    next: OdysseyLight3D[],
    shown: Set<string>
  ): OdysseyLight3D[] {
    const maxLights = LightManager.MAXLIGHTS;
    const desiredIndex = this._desiredIndexScratch;
    desiredIndex.clear();
    for(let i = 0; i < desiredLights.length; i++){
      desiredIndex.set(desiredLights[i].uuid, i);
    }
    const registered = this._registeredScratch;
    registered.clear();
    for(let i = 0, il = this.lights.length; i < il; i++){
      registered.add(this.lights[i].uuid);
    }
    next.length = 0;

    for(let i = 0, il = boundPool.length; i < il; i++){
      const light = boundPool[i];
      const index = desiredIndex.get(light.uuid);
      if(index !== undefined){
        if(index < maxLights){
          this.writeFade(light, channel, retailFadeStep(this.readFade(light, channel), 1, delta));
          next.push(light);
        }else{
          this.writeFade(light, channel, retailFadeStep(this.readFade(light, channel), 0, delta));
          if(this.readFade(light, channel) > 0){
            next.push(light);
          }
        }
        continue;
      }
      // Dropped from master registration: remove immediately (ControlLightsFade).
      if(!registered.has(light.uuid)){
        continue;
      }
      this.writeFade(light, channel, retailFadeStep(this.readFade(light, channel), 0, delta));
      if(this.readFade(light, channel) > 0){
        next.push(light);
      }
    }

    shown.clear();
    for(let i = 0; i < next.length; i++){
      shown.add(next[i].uuid);
    }
    for(let i = 0; i < desiredLights.length && i < maxLights; i++){
      if(next.length >= maxLights){ break; }
      const light = desiredLights[i];
      if(shown.has(light.uuid)){ continue; }
      this.writeFade(light, channel, retailFadeInit(!!light.isFading));
      this.writeFade(light, channel, retailFadeStep(this.readFade(light, channel), 1, delta));
      next.push(light);
      shown.add(light.uuid);
    }

    this.prepareAndSort(next);
    return next;
  }

  /** EnableLights → ControlLightsFade on the room/global pool. */
  reclaimLights(delta = 0, desiredLights: OdysseyLight3D[] = []){
    const next = this.controlLightsFade(
      this.boundLights,
      desiredLights,
      delta,
      RetailLightFadeChannel.Primary,
      this._boundNextScratch,
      this.lightsShown
    );
    this._boundNextScratch = this.boundLights;
    this.boundLights = next;
  }

  /**
   * EnableLightsDynamicOnly: fade the `n_dynamic_type == 1` subset of
   * the prioritized illumination list into exclusive_dynamic_lights. This is the
   * pool RenderStaticGeometry binds for lightmapped geometry.
   */
  reclaimExclusiveDynamicLights(delta = 0, prioritizedLights: OdysseyLight3D[] = []){
    const desired = retailSelectDynamicOnlyLights(prioritizedLights, this._dynamicOnlyScratch);
    const next = this.controlLightsFade(
      this.exclusiveDynamicLights,
      desired,
      delta,
      RetailLightFadeChannel.Secondary,
      this._exclusiveNextScratch,
      this._exclusiveShownScratch
    );
    this._exclusiveNextScratch = this.exclusiveDynamicLights;
    this.exclusiveDynamicLights = next;
  }

  /**
   * Populate all packed GLSL buffers after selection. Buffer object and Vector4
   * identities remain stable so material uniform references can be retained.
   */
  syncUniformBuffers(){
    this.fillGlobalBuffers();

    const ambient = this.getAmbientLights();
    const dynamic = this._dynamicScratch;
    dynamic.length = 0;
    for(let i = 0, il = this.boundLights.length; i < il; i++){
      const light = this.boundLights[i];
      if(!light.isAmbient){ dynamic.push(light); }
    }
    this.appendUnique(dynamic, ambient);
    this.fillUniformSet(this.dynamicLights, dynamic);

    // Bump materials: single prioritized dynamic light (fade×color; VP-aligned).
    // Prefer the bump selection still present in the bound/fading pool.
    const bumpBound = this._bumpBoundScratch;
    bumpBound.length = 0;
    for(let i = 0, il = this.bumpLights.length; i < il; i++){
      const light = this.bumpLights[i];
      if(this.boundLights.indexOf(light) >= 0){
        bumpBound.push(light);
      }
    }
    this.fillUniformSet(this.bumpMapLights, bumpBound);

    // Lightmapped surfaces: the bake supplies static (type 0) and area lighting,
    // so only the exclusive_dynamic_lights pool overlays it, faded on the
    // secondary channel (ControlLightsFade arg4 = 1).
    this.fillUniformSet(
      this.lightmapLights,
      this.exclusiveDynamicLights,
      RetailLightFadeChannel.Secondary
    );

    if(this.globalLights.cacheID !== this._prevGlobalCacheID ||
      this.bumpMapLights.cacheID !== this._prevBumpCacheID ||
      this.dynamicLights.cacheID !== this._prevDynamicCacheID ||
      this.lightmapLights.cacheID !== this._prevLightmapCacheID){
      this.selectionEpoch++;
      this._prevGlobalCacheID = this.globalLights.cacheID;
      this._prevBumpCacheID = this.bumpMapLights.cacheID;
      this._prevDynamicCacheID = this.dynamicLights.cacheID;
      this._prevLightmapCacheID = this.lightmapLights.cacheID;
    }
  }

  /** exclusive_dynamic_lights packed for USE_LIGHTMAP materials. */
  getLightmapLightSet(): IOdysseyLightUniformSlot {
    return this.lightmapLights;
  }

  /** Return the stable uniform set used by room/global materials. */
  getGlobalLightSet(): IOdysseyLightUniformSlot {
    return this.globalLights;
  }

  /** PrioritizeIllumination bump_map_lights packed for USE_BUMPMAP materials. */
  getBumpMapLightSet(): IOdysseyLightUniformSlot {
    return this.bumpMapLights;
  }

  /**
   * Copy the top prioritized room lights into the global packed buffers.
   * boundLights is the scene's fading pool (up to MAXLIGHTS == 8); each model's
   * shader only consumes the top MAX_LIGHTS_PER_MODEL (retail allowed_lights = 3,
   * SetUpVertexProgramLightShaderConstants), so fillUniformSet caps here.
   */
  fillGlobalBuffers(){
    this.fillUniformSet(this.globalLights, this.boundLights);
  }

  /**
   * Retail GetNearestLights eligibility with arg4 == 0:
   * (dynamic || affectDynamic) and radius > 0. No color-black / visibility gate.
   */
  isNearestLightEligible(light: OdysseyLight3D): boolean {
    return !!light &&
      (light.isDynamic || light.affectDynamic) &&
      light.getRadius() > 0;
  }

  /**
   * Retail GetNearestLights: walk registration order, first 3 sphere overlaps.
   * Shader color packing uses authored rgb only (no fade / no multiplier)
   * VP-aligned; see packLightsForObject.
   * Returns a reused scratch array — copy if you need to retain across calls.
   */
  getLightsForObject(
    position: THREE.Vector3,
    radius = LightManager.RETAIL_GOB_LIGHT_RADIUS
  ): OdysseyLight3D[] {
    const objectRadius = Math.max(0, radius);
    const nearest = this._nearestScratch;
    nearest.length = 0;
    for(let i = 0, il = this.lights.length; i < il; i++){
      if(nearest.length >= LightManager.MAX_LIGHTS_PER_MODEL){ break; }
      const light = this.lights[i];
      if(!this.isNearestLightEligible(light)){ continue; }
      const lightRadius = light.getRadius();
      if(light.worldPosition.distanceTo(position) <= objectRadius + lightRadius){
        nearest.push(light);
      }
    }
    return nearest;
  }

  /**
   * Numeric fingerprint of GetNearestLights result at `position` (ids + poses +
   * multipliers). Fills `_nearestScratch`; follow with `packLastNearestLights`
   * to avoid a second walk.
   */
  fingerprintNearestLights(
    position: THREE.Vector3,
    radius = LightManager.RETAIL_GOB_LIGHT_RADIUS
  ): number {
    const nearest = this.getLightsForObject(position, radius);
    let h = nearest.length | 0;
    for(let i = 0; i < nearest.length; i++){
      const light = nearest[i];
      h = Math.imul(h ^ (light.registrationOrder | 0), 16777619);
      h = Math.imul(h ^ (Math.round(light.worldPosition.x * 1000) | 0), 16777619);
      h = Math.imul(h ^ (Math.round(light.worldPosition.y * 1000) | 0), 16777619);
      h = Math.imul(h ^ (Math.round(light.worldPosition.z * 1000) | 0), 16777619);
      h = Math.imul(h ^ (Math.round(light.multiplier * 1000) | 0), 16777619);
      h = Math.imul(h ^ light.color.getHex(), 16777619);
      h = Math.imul(h ^ (light.isAmbient ? 1 : 0), 16777619);
    }
    return h | 0;
  }

  /** Numeric area ambient/sun/headlight fingerprint for binder model skips. */
  getAreaFingerprint(): number {
    let h = this.ambientColor.getHex();
    h = Math.imul(h ^ this.sunAmbientColor.getHex(), 16777619);
    h = Math.imul(h ^ this.sunColor.getHex(), 16777619);
    h = Math.imul(h ^ (Math.round(this.sunDirection.x * 1000) | 0), 16777619);
    h = Math.imul(h ^ (Math.round(this.sunDirection.y * 1000) | 0), 16777619);
    h = Math.imul(h ^ (Math.round(this.sunDirection.z * 1000) | 0), 16777619);
    if(this.headLightEnabled){
      h = Math.imul(h ^ 1, 16777619);
      h = Math.imul(h ^ this.headLightAmbient.getHex(), 16777619);
      h = Math.imul(h ^ this.headLightDiffuse.getHex(), 16777619);
    }
    return h | 0;
  }

  /** Pack GetNearestLights for one object (authored color; VP-aligned). */
  packLightsForObject(
    position: THREE.Vector3,
    radius = LightManager.RETAIL_GOB_LIGHT_RADIUS
  ): IOdysseyLightUniformSlot {
    const nearest = this.getLightsForObject(position, radius);
    this.fillUniformSet(this.objectLights, nearest, RetailLightFadeChannel.None);
    return this.objectLights;
  }

  /** Pack the last `getLightsForObject` / `fingerprintNearestLights` result. */
  packLastNearestLights(): IOdysseyLightUniformSlot {
    this.fillUniformSet(this.objectLights, this._nearestScratch, RetailLightFadeChannel.None);
    return this.objectLights;
  }

  private getAmbientLights(): OdysseyLight3D[] {
    const ambient = this._ambientScratch;
    ambient.length = 0;
    for(let i = 0, il = this.lights.length; i < il; i++){
      const light = this.lights[i];
      if(this.isPrioritizeEligible(light) && light.isAmbient && light.illuminationScore <= 1){
        ambient.push(light);
      }
    }
    this.prepareAndSort(ambient);
    if(ambient.length > LightManager.MAXLIGHTS){
      ambient.length = LightManager.MAXLIGHTS;
    }
    return ambient;
  }

  private appendUnique(destination: OdysseyLight3D[], additions: OdysseyLight3D[]){
    const seen = this._appendSeenScratch;
    seen.clear();
    for(let i = 0; i < destination.length; i++){
      seen.add(destination[i].uuid);
    }
    for(let i = 0; i < additions.length; i++){
      if(destination.length >= LightManager.MAXLIGHTS){ break; }
      const light = additions[i];
      if(!seen.has(light.uuid)){
        destination.push(light);
        seen.add(light.uuid);
      }
    }
  }

  /**
   * @param channel fade field applied to the packed color (retail arg4);
   * `None` is nearest/gob: authored color only (VP-aligned).
   * @param maxCount per-model shader light cap. Defaults to MAX_LIGHTS_PER_MODEL
   * minus one when the camera headlight is enabled.
   */
  private fillUniformSet(
    set: IOdysseyLightUniformSlot,
    lights: OdysseyLight3D[],
    channel = RetailLightFadeChannel.Primary,
    maxCount = retailModelLightSlots(LightManager.MAX_LIGHTS_PER_MODEL, this.headLightEnabled)
  ){
    const count = Math.min(lights.length, maxCount, MAX_ODYSSEY_LIGHTS);
    let changed = set.count !== count;
    const color = this._fillColor;
    for(let i = 0; i < MAX_ODYSSEY_LIGHTS; i++){
      const position = set.odysseyLightPos[i];
      const targetColor = set.odysseyLightColor[i];
      if(i < count){
        const light = lights[i];
        if(channel === RetailLightFadeChannel.Secondary){
          light.getDynamicOnlyColor(color);
        }else if(channel === RetailLightFadeChannel.Primary){
          light.getEffectiveColor(color);
        }else{
          light.getIntensityColor(color);
        }
        const attenuation = retailQuadraticAttenuation(light.getRadius());
        if(position.x !== light.worldPosition.x || position.y !== light.worldPosition.y ||
          position.z !== light.worldPosition.z || position.w !== attenuation ||
          targetColor.x !== color.r || targetColor.y !== color.g || targetColor.z !== color.b ||
          targetColor.w !== (light.isAmbient ? 1 : 0)){
          changed = true;
        }
        position.set(light.worldPosition.x, light.worldPosition.y, light.worldPosition.z, attenuation);
        targetColor.set(color.r, color.g, color.b, light.isAmbient ? 1 : 0);
      }else{
        if(position.lengthSq() !== 0 || targetColor.lengthSq() !== 0){ changed = true; }
        position.set(0, 0, 0, 0);
        targetColor.set(0, 0, 0, 0);
      }
    }
    set.count = count;
    if(changed){ set.cacheID++; }
  }

  /**
   * PrioritizeShadow: non-ambient + raw color gate from render_lights (boundLights),
   * sorted via lightcmp. Retail GetShadowLights modes 0/1 do not check PartLight.shadow
   * (MDL shadow flag); radius, illuminationScore <= 1, and mode filters run in getShadowLights.
   */
  prioritizeShadow(): OdysseyLight3D[] {
    const candidates = this._shadowCandidateScratch;
    candidates.length = 0;
    for(let i = 0, il = this.boundLights.length; i < il; i++){
      const light = this.boundLights[i];
      if(light.isAmbient){
        continue;
      }
      if(!isRetailShadowColorVisible(light.color.r, light.color.g, light.color.b)){
        continue;
      }
      candidates.push(light);
    }
    this.prepareAndSort(candidates);
    return candidates;
  }

  /**
   * GetShadowLights for the requested mode.
   * Mode 0/1 retain fading histories; mode 2 picks one distant/static light.
   */
  getShadowLights(mode: RetailShadowLightMode, delta = 0): OdysseyLight3D[] {
    if(mode === RetailShadowLightMode.DistantStatic){
      this.distantShadowLight = retailSelectDistantStaticShadowLight(this.lights);
      return this.distantShadowLight ? [this.distantShadowLight] : [];
    }

    const prioritized = this.prioritizeShadow();
    const dynamicOnly = mode === RetailShadowLightMode.SingleDynamic;
    const desired = this._shadowDesiredScratch;
    desired.length = 0;
    for(let i = 0; i < prioritized.length; i++){
      const light = prioritized[i];
      if(light.illuminationScore > 1){ continue; }
      if(dynamicOnly && (light.dynamicType | 0) === 0){ continue; }
      // ARE SunShadows/MoonShadows does not suppress module-authored MDL key lights
      // (e.g. m02ac auroralight01 r=800). Illumination scoring already prefers those
      // over nearby lamps; gating them forced streaky local-lamp maps outdoors.
      desired.push(light);
      if(dynamicOnly || desired.length >= LightManager.MAXSHADOWLIGHTS){ break; }
    }

    const previous = mode === RetailShadowLightMode.SingleDynamic
      ? this.staticMeshShadowLights
      : this.shadowLights;
    const desiredSet = this._shadowDesiredSetScratch;
    desiredSet.clear();
    for(let i = 0; i < desired.length; i++){
      desiredSet.add(desired[i].uuid);
    }
    const next = this._shadowNextScratch;
    next.length = 0;

    for(let i = 0; i < previous.length; i++){
      const light = previous[i];
      if(desiredSet.has(light.uuid)){ continue; }
      light.shadowFadeFactor = retailShadowFadeStep(light.shadowFadeFactor || 0, 0, delta);
      if(light.shadowFadeFactor > 0){ next.push(light); }
    }
    for(let i = 0; i < desired.length; i++){
      const light = desired[i];
      light.shadowFadeFactor = retailShadowFadeStep(light.shadowFadeFactor || 0, 1, delta);
      next.push(light);
    }
    const cap = dynamicOnly ? 1 : LightManager.MAXSHADOWLIGHTS;
    if(next.length > cap){ next.length = cap; }
    if(mode === RetailShadowLightMode.SingleDynamic){
      this.staticMeshShadowLights = next.slice();
    }else{
      this.shadowLights = next.slice();
    }
    return mode === RetailShadowLightMode.SingleDynamic
      ? this.staticMeshShadowLights
      : this.shadowLights;
  }

  /**
   * Retail PrioritizeShadow + GetShadowLights(mode=0).
   * Also refreshes mode 1 / mode 2 lists for callers that need them.
   */
  updateShadowLightSelection(delta = 0){
    this.getShadowLights(RetailShadowLightMode.Multi, delta);
    this.getShadowLights(RetailShadowLightMode.SingleDynamic, delta);
    this.getShadowLights(RetailShadowLightMode.DistantStatic, delta);
  }

  /**
   * Legacy helper retained for callers that still track per-parent counts.
   * PrioritizeIllumination does not apply a per-parent cap; GetNearestLights
   * uses MAX_LIGHTS_PER_MODEL as a hard list length instead.
   */
  canShowLight(light: OdysseyLight3D){
    if(!light || !this.isPrioritizeEligible(light)){
      return false;
    }
    const parentUUID = light.parentUUID || light.uuid;
    const count = (this.modelLightCounter[parentUUID] || 0) + 1;
    this.modelLightCounter[parentUUID] = count;
    return count <= LightManager.MAX_LIGHTS_PER_MODEL;
  }

  toggleLightHelpers(){
    if(this.context?.group?.light_helpers){
      this.context.group.light_helpers.visible = !this.context.group.light_helpers.visible;
    }
  }

  setLightHelpersVisible(on = false){
    if(this.context?.group?.light_helpers){
      this.context.group.light_helpers.visible = !!on;
    }
  }

  /**
   * Plain-object snapshot for debugging menu / area lighting.
   * Safe to `JSON.stringify` — no THREE object cycles.
   */
  dumpState(): ILightManagerDebugDump {
    const dumpLight = (light: OdysseyLight3D): ILightDebugDump => {
      const effective = light.getEffectiveColor();
      const intensity = light.getIntensityColor();
      return {
        name: light.name || '',
        uuid: light.uuid,
        parentUUID: light.parentUUID || '',
        parentName: (light.parent as THREE.Object3D | null)?.name || '',
        modelVisible: !!light.odysseyModel?.visible,
        registrationOrder: light.registrationOrder,
        worldPosition: vec3Tuple(light.worldPosition),
        localPosition: vec3Tuple(light.position),
        color: colorTuple(light.color),
        effectiveColor: colorTuple(effective),
        intensityColor: colorTuple(intensity),
        radius: light.getRadius(),
        shadowRadius: light.getShadowRadius(),
        multiplier: light.multiplier,
        fadeFactor: light.fadeFactor,
        dynamicOnlyFadeFactor: light.dynamicOnlyFadeFactor,
        shadowFadeFactor: light.shadowFadeFactor,
        priority: light.priority,
        authoredPriority: light.authoredPriority,
        dynamicType: light.dynamicType,
        isAmbient: !!light.isAmbient,
        isDynamic: !!light.isDynamic,
        affectDynamic: !!light.affectDynamic,
        castShadow: !!light.castShadow,
        isFading: light.isFading | 0,
        illuminationScore: Number.isFinite(light.illuminationScore)
          ? light.illuminationScore
          : null,
        cameraDistance: light.cameraDistance,
        prioritizeEligible: this.isPrioritizeEligible(light),
        nearestEligible: this.isNearestLightEligible(light),
      };
    };

    const dumpSlot = (set: IOdysseyLightUniformSlot): ILightUniformSlotDebugDump => ({
      count: set.count,
      cacheID: set.cacheID,
      lights: Array.from({ length: set.count }, (_, i) => ({
        pos: vec4Tuple(set.odysseyLightPos[i]),
        color: vec4Tuple(set.odysseyLightColor[i]),
      })),
    });

    const byUuid = (list: OdysseyLight3D[]) => list.map((light) => light.uuid);

    return {
      limits: {
        MAXLIGHTS: LightManager.MAXLIGHTS,
        MAXSHADOWLIGHTS: LightManager.MAXSHADOWLIGHTS,
        MAX_LIGHTS_PER_MODEL: LightManager.MAX_LIGHTS_PER_MODEL,
        RETAIL_GOB_LIGHT_RADIUS: LightManager.RETAIL_GOB_LIGHT_RADIUS,
        MAX_ODYSSEY_LIGHTS,
      },
      focusPosition: vec3Tuple(this.focusPosition),
      ambientColor: colorTuple(this.ambientColor),
      sunAmbientColor: colorTuple(this.sunAmbientColor),
      sunColor: colorTuple(this.sunColor),
      sunDirection: vec3Tuple(this.sunDirection),
      headLight: {
        enabled: this.headLightEnabled,
        ambient: colorTuple(this.headLightAmbient),
        diffuse: colorTuple(this.headLightDiffuse),
      },
      softShadowsEnabled: this.softShadowsEnabled,
      lightsShown: [...this.lightsShown],
      modelLightCounter: { ...this.modelLightCounter },
      lights: this.lights.map(dumpLight),
      selectedLightUuids: byUuid(this.selectedLights),
      boundLightUuids: byUuid(this.boundLights),
      bumpLightUuids: byUuid(this.bumpLights),
      exclusiveDynamicLightUuids: byUuid(this.exclusiveDynamicLights),
      shadowLightUuids: byUuid(this.shadowLights),
      staticMeshShadowLightUuids: byUuid(this.staticMeshShadowLights),
      distantShadowLightUuid: this.distantShadowLight?.uuid ?? null,
      uniformSets: {
        global: dumpSlot(this.globalLights),
        dynamic: dumpSlot(this.dynamicLights),
        bump: dumpSlot(this.bumpMapLights),
        lightmap: dumpSlot(this.lightmapLights),
        object: dumpSlot(this.objectLights),
      },
    };
  }

  /** JSON string of {@link dumpState}. Pretty-printed by default. */
  dumpStateJSON(pretty = true): string {
    return JSON.stringify(this.dumpState(), null, pretty ? 2 : undefined);
  }
}

function vec3Tuple(v: THREE.Vector3): [number, number, number] {
  return [v.x, v.y, v.z];
}

function colorTuple(c: THREE.Color): [number, number, number] {
  return [c.r, c.g, c.b];
}

function vec4Tuple(v: THREE.Vector4): [number, number, number, number] {
  return [v.x, v.y, v.z, v.w];
}

export interface ILightDebugDump {
  name: string;
  uuid: string;
  parentUUID: string;
  parentName: string;
  modelVisible: boolean;
  registrationOrder: number;
  worldPosition: [number, number, number];
  localPosition: [number, number, number];
  color: [number, number, number];
  effectiveColor: [number, number, number];
  intensityColor: [number, number, number];
  radius: number;
  shadowRadius: number;
  multiplier: number;
  fadeFactor: number;
  dynamicOnlyFadeFactor: number;
  shadowFadeFactor: number;
  priority: number;
  authoredPriority: number;
  dynamicType: number;
  isAmbient: boolean;
  isDynamic: boolean;
  affectDynamic: boolean;
  castShadow: boolean;
  isFading: number;
  illuminationScore: number | null;
  cameraDistance: number;
  prioritizeEligible: boolean;
  nearestEligible: boolean;
}

export interface ILightUniformSlotDebugDump {
  count: number;
  cacheID: number;
  lights: Array<{
    pos: [number, number, number, number];
    color: [number, number, number, number];
  }>;
}

export interface ILightManagerDebugDump {
  limits: {
    MAXLIGHTS: number;
    MAXSHADOWLIGHTS: number;
    MAX_LIGHTS_PER_MODEL: number;
    RETAIL_GOB_LIGHT_RADIUS: number;
    MAX_ODYSSEY_LIGHTS: number;
  };
  focusPosition: [number, number, number];
  ambientColor: [number, number, number];
  sunAmbientColor: [number, number, number];
  sunColor: [number, number, number];
  sunDirection: [number, number, number];
  headLight: {
    enabled: boolean;
    ambient: [number, number, number];
    diffuse: [number, number, number];
  };
  softShadowsEnabled: boolean;
  lightsShown: string[];
  modelLightCounter: Record<string, number>;
  lights: ILightDebugDump[];
  selectedLightUuids: string[];
  boundLightUuids: string[];
  bumpLightUuids: string[];
  exclusiveDynamicLightUuids: string[];
  shadowLightUuids: string[];
  staticMeshShadowLightUuids: string[];
  distantShadowLightUuid: string | null;
  uniformSets: {
    global: ILightUniformSlotDebugDump;
    dynamic: ILightUniformSlotDebugDump;
    bump: ILightUniformSlotDebugDump;
    lightmap: ILightUniformSlotDebugDump;
    object: ILightUniformSlotDebugDump;
  };
}
