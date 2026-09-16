import * as THREE from "three";
import { OdysseyLight3D } from "@/three/odyssey";
import { OdysseyLightHelper } from "@/three/odyssey/OdysseyLightHelper";
import {
  OdysseyShadowHelperRole,
  OdysseyShadowLightHelper,
} from "@/three/odyssey/OdysseyShadowLightHelper";
import type { ModuleObject } from "@/module/ModuleObject";
import { TwoDAManager } from "@/managers/TwoDAManager";
import { MAX_ODYSSEY_LIGHTS } from "@/shaders/chunks/OdysseyLighting";
import { EngineDebugType } from "@/enums/engine/EngineDebugType";
import {
  compareOdysseyLights,
  odysseyDynamicRank,
  odysseyEffectivePriority,
  odysseyFadeInit,
  odysseyFadeStep,
  odysseyIlluminationScore,
  odysseyQuadraticAttenuation,
  odysseyShadowFadeStep,
  isOdysseyShadowColorVisible,
  odysseySelectIlluminationBump,
  odysseySelectPrioritizeBump,
  odysseySelectDistantStaticShadowLight,
  odysseySelectDynamicOnlyLights,
  odysseyModelLightSlots,
  odysseyVideoQualityRowIndex,
  ODYSSEY_GOB_LIGHT_RADIUS as ODYSSEY_GOB_LIGHT_RADIUS_CONST,
  ODYSSEY_MAX_LIGHTS_PER_MODEL,
  OdysseyLightFadeChannel,
  OdysseyShadowLightMode,
  type IOdysseyLightSortKey,
} from "@/utility/odysseyLighting";

/**
 * Fixed-size, shader-ready light buffers. Positions are world-space in the
 * manager; OdysseyLightingBinder transforms xyz to view-space on upload.
 * `w` holds 's quadratic attenuation coefficient. Colors use `w` as the
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
 * Dynamic lighting engine-aligned K1 LightManager / light node selection,
 * fade, ambient flag, and quadratic attenuation. Shader RGB follows the VP
 * path (fade×color / color; no light node.multiplier). This manager deliberately
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
   * Per-model light cap: hard-sets VertexProgram allowed_lights = 3
   * (VertexProgram ctor). Each model's shader receives at most the
   * top 3 of the scene's prioritized lights (SetUpVertexProgramLightShaderConstants
   *), and nearest light selection likewise packs GL_LIGHT0..2.
   */
  static MAX_LIGHTS_PER_MODEL = ODYSSEY_MAX_LIGHTS_PER_MODEL;
  /**
   * Object query radius passed to nearest light selection from RenderOnlyGobs
   * (hardcoded 2.0).
   */
  static ODYSSEY_GOB_LIGHT_RADIUS = ODYSSEY_GOB_LIGHT_RADIUS_CONST;

  modelLightCounter: Record<string, number> = {};
  lights: OdysseyLight3D[] = [];
  /**
   * render_lights: light fade pass output (bound/fading pool).
   * shadow prioritize / bump prioritize scan this list.
   */
  boundLights: OdysseyLight3D[] = [];
  /** Current top-N light-selection result, before fading retention. */
  selectedLights: OdysseyLight3D[] = [];
  /**
   * bump_map_lights from illumination prioritize (default) or bump prioritize.
   */
  bumpLights: OdysseyLight3D[] = [];
  /**
   * exclusive_dynamic_lights: the fading pool built by
   * dynamic-only lights from the `n_dynamic_type == 1` subset of
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
  /** Scratch buffer for per-object nearest light selection packing. */
  objectLights: IOdysseyLightUniformSlot = createLightUniformSet();

  /** shadow light selection(mode=0) multi-light set for gob / stencil disks. */
  shadowLights: OdysseyLight3D[] = [];
  /** shadow light selection(mode=1) single dynamic light for static mesh shadows. */
  staticMeshShadowLights: OdysseyLight3D[] = [];
  /** shadow light selection(mode=2) distant/static light. */
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

  /**
   * LightManager.lens_flare_lights — rebuilt by CollectLightsForGivenRoom
   * equivalent (current + linked rooms, flarecolorshifts.count > 0).
   */
  lensFlareLights: OdysseyLight3D[] = [];

  focusPosition = new THREE.Vector3();
  context: any;
  /** Next registration ordinal for light sort pointer-order approximation. */
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

  /** Reused scratch for illumination prioritize candidates. */
  private _candidateScratch: OdysseyLight3D[] = [];
  /** Double-buffer for light fade pass next bound set. */
  private _boundNextScratch: OdysseyLight3D[] = [];
  /** Double-buffer for the exclusive_dynamic_lights fade pool. */
  private _exclusiveNextScratch: OdysseyLight3D[] = [];
  /** Reused dynamic-only lights desired set (n_dynamic_type == 1). */
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
  /** Reused nearest light selection result (valid until next nearest query). */
  private _nearestScratch: OdysseyLight3D[] = [];
  private _poseScratch = new THREE.Vector3();
  private _prevGlobalCacheID = -1;
  private _prevBumpCacheID = -1;
  private _prevDynamicCacheID = -1;
  private _prevLightmapCacheID = -1;

  /** Per-light debug gizmos keyed by light uuid. */
  private lightHelpers = new Map<string, OdysseyLightHelper>();
  /** Scratch set of bound light uuids for helper styling / filter. */
  private _boundHelperSet = new Set<string>();
  /** Active shadow-caster gizmos keyed by light uuid. */
  private shadowHelpers = new Map<string, OdysseyShadowLightHelper>();
  /** Scratch role bitmask per uuid while rebuilding shadow helpers. */
  private _shadowRoleScratch = new Map<string, number>();
  /** Scratch light lookup while rebuilding shadow helpers. */
  private _shadowLightScratch = new Map<string, OdysseyLight3D>();
  /** Scratch list of shadow-helper uuids to dispose. */
  private _shadowHelperDisposeScratch: string[] = [];

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
    const rowIndex = odysseyVideoQualityRowIndex(count, textureQuality, videoQuality);
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
    this.disposeAllLightHelpers();
    this.disposeAllShadowHelpers();
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
      this.ensureLightHelper(light);
    }
  }

  removeLight(light: OdysseyLight3D){
    const index = this.lights.indexOf(light);
    if(index >= 0){
      this.lights.splice(index, 1);
      this.lightsPoseEpoch++;
    }
    this.disposeLightHelper(light);
    this.disposeShadowHelper(light);
    this.boundLights = this.boundLights.filter((entry) => entry !== light);
    this.selectedLights = this.selectedLights.filter((entry) => entry !== light);
    this.bumpLights = this.bumpLights.filter((entry) => entry !== light);
    this.exclusiveDynamicLights = this.exclusiveDynamicLights.filter((entry) => entry !== light);
    this.shadowLights = this.shadowLights.filter((entry) => entry !== light);
    this.staticMeshShadowLights = this.staticMeshShadowLights.filter((entry) => entry !== light);
    this.lensFlareLights = this.lensFlareLights.filter((entry) => entry !== light);
    if(this.distantShadowLight === light){ this.distantShadowLight = undefined; }
    this.syncUniformBuffers();
  }

  /**
   * Score lights relative to a focus position (Scene.focus_position), then
   * run illumination prioritize / light fade pass / shadow selection.
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
      light.illuminationScore = odysseyIlluminationScore(
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
    this.rebuildLensFlareLights(this.resolveCollectLightsRoom(target));
    this.updateLightHelpers();
    this.updateShadowHelpers();
  }

  /**
   * Resolve the room used for CollectLightsForGivenRoom scoping.
   * Prefer a ModuleObject target's room, else the controlled player's room.
   */
  private resolveCollectLightsRoom(
    target: THREE.Camera|ModuleObject|{ position: THREE.Vector3 }
  ): { room?: any; areaRooms?: any[] } {
    const asModule = target as ModuleObject;
    if(asModule?.room){
      return { room: asModule.room };
    }
    const player = this.context?.getCurrentPlayer?.()
      ?? this.context?.PartyManager?.party?.[0]
      ?? this.context?.PartyManager?.Player;
    if(player?.room){
      return { room: player.room };
    }
    const area = this.context?.module?.area;
    return { areaRooms: area?.rooms };
  }

  /**
   * CollectLightsForGivenRoom — lens_flare_lights from current room + linked
   * rooms (or all rooms when no current room). Gate: flarecolorshifts.length > 0.
   */
  rebuildLensFlareLights(scope?: { room?: any; areaRooms?: any[] }){
    this.lensFlareLights.length = 0;

    const roomSet = new Set<any>();
    const currentRoom = scope?.room;
    if(currentRoom){
      roomSet.add(currentRoom);
      const linked = currentRoom.linkedRoomsArray;
      if(linked?.length){
        for(let i = 0, il = linked.length; i < il; i++){
          roomSet.add(linked[i]);
        }
      }
    }

    const filterByRoom = roomSet.size > 0;

    for(let i = 0, il = this.lights.length; i < il; i++){
      const light = this.lights[i];
      if(!light?.flareColorShifts?.length){
        continue;
      }

      if(!filterByRoom){
        this.lensFlareLights.push(light);
        continue;
      }

      if(this.lightBelongsToRoomSet(light, roomSet)){
        this.lensFlareLights.push(light);
      }
    }
  }

  private lightBelongsToRoomSet(light: OdysseyLight3D, roomSet: Set<any>): boolean {
    const model = light.odysseyModel as any;
    const moduleObject = model?.userData?.moduleObject ?? model?.moduleObject;
    if(moduleObject && roomSet.has(moduleObject)){
      return true;
    }
    if(moduleObject?.room && roomSet.has(moduleObject.room)){
      return true;
    }
    // Walk parents for a room moduleObject (light under room model hierarchy).
    let obj: THREE.Object3D | null = light;
    while(obj){
      const mo = (obj as any).userData?.moduleObject;
      if(mo && roomSet.has(mo)){
        return true;
      }
      obj = obj.parent;
    }
    return false;
  }

  /** GetLensFlareLights — returns the collected flare light list. */
  getLensFlareLights(): OdysseyLight3D[] {
    return this.lensFlareLights;
  }

  private ensureLightHelper(light: OdysseyLight3D){
    if(this.lightHelpers.has(light.uuid)){
      return;
    }
    const group = this.context?.group?.light_helpers as THREE.Group | undefined;
    if(!group){
      return;
    }
    const helper = new OdysseyLightHelper(light);
    this.lightHelpers.set(light.uuid, helper);
    group.add(helper);
  }

  private disposeLightHelper(light: OdysseyLight3D){
    const helper = this.lightHelpers.get(light.uuid);
    if(!helper){
      return;
    }
    this.lightHelpers.delete(light.uuid);
    helper.dispose();
  }

  private disposeAllLightHelpers(){
    for(const helper of this.lightHelpers.values()){
      helper.dispose();
    }
    this.lightHelpers.clear();
  }

  /**
   * Sync OdysseyLightHelper gizmos for every registered light.
   * Respects group visibility and optional bound-only debug filter.
   */
  private updateLightHelpers(){
    const group = this.context?.group?.light_helpers as THREE.Group | undefined;
    if(!group){
      return;
    }

    // Attach helpers for lights registered before the group existed.
    for(let i = 0, il = this.lights.length; i < il; i++){
      this.ensureLightHelper(this.lights[i]);
    }

    if(!group.visible){
      return;
    }

    this._boundHelperSet.clear();
    for(let i = 0, il = this.boundLights.length; i < il; i++){
      this._boundHelperSet.add(this.boundLights[i].uuid);
    }

    const boundOnly = !!this.context?.debug?.[EngineDebugType.LIGHT_HELPERS_BOUND_ONLY];

    for(let i = 0, il = this.lights.length; i < il; i++){
      const light = this.lights[i];
      const helper = this.lightHelpers.get(light.uuid);
      if(!helper){
        continue;
      }
      const bound = this._boundHelperSet.has(light.uuid);
      helper.visible = !boundOnly || bound;
      if(helper.visible){
        helper.update(bound);
      }
    }
  }

  private ensureShadowHelper(light: OdysseyLight3D){
    if(this.shadowHelpers.has(light.uuid)){
      return this.shadowHelpers.get(light.uuid)!;
    }
    const group = this.context?.group?.shadow_lights as THREE.Group | undefined;
    if(!group){
      return undefined;
    }
    const helper = new OdysseyShadowLightHelper(light);
    this.shadowHelpers.set(light.uuid, helper);
    group.add(helper);
    return helper;
  }

  private disposeShadowHelper(light: OdysseyLight3D){
    const helper = this.shadowHelpers.get(light.uuid);
    if(!helper){
      return;
    }
    this.shadowHelpers.delete(light.uuid);
    helper.dispose();
  }

  private disposeAllShadowHelpers(){
    for(const helper of this.shadowHelpers.values()){
      helper.dispose();
    }
    this.shadowHelpers.clear();
  }

  /**
   * Gizmos for lights currently in shadow light selection pools (multi / static / distant).
   * Populates `context.group.shadow_lights` when that debug layer is available.
   */
  private updateShadowHelpers(){
    const group = this.context?.group?.shadow_lights as THREE.Group | undefined;
    if(!group){
      return;
    }

    this._shadowRoleScratch.clear();
    this._shadowLightScratch.clear();
    const addRole = (light: OdysseyLight3D | undefined, role: number) => {
      if(!light){ return; }
      this._shadowLightScratch.set(light.uuid, light);
      const prev = this._shadowRoleScratch.get(light.uuid) || 0;
      this._shadowRoleScratch.set(light.uuid, prev | role);
    };

    for(let i = 0, il = this.shadowLights.length; i < il; i++){
      addRole(this.shadowLights[i], OdysseyShadowHelperRole.Multi);
    }
    for(let i = 0, il = this.staticMeshShadowLights.length; i < il; i++){
      addRole(this.staticMeshShadowLights[i], OdysseyShadowHelperRole.StaticMesh);
    }
    addRole(this.distantShadowLight, OdysseyShadowHelperRole.Distant);

    this._shadowHelperDisposeScratch.length = 0;
    for(const uuid of this.shadowHelpers.keys()){
      if(!this._shadowRoleScratch.has(uuid)){
        this._shadowHelperDisposeScratch.push(uuid);
      }
    }
    for(let i = 0; i < this._shadowHelperDisposeScratch.length; i++){
      const helper = this.shadowHelpers.get(this._shadowHelperDisposeScratch[i]);
      if(helper){
        this.shadowHelpers.delete(this._shadowHelperDisposeScratch[i]);
        helper.dispose();
      }
    }

    if(!group.visible){
      return;
    }

    for(const [uuid, roles] of this._shadowRoleScratch){
      const light = this._shadowLightScratch.get(uuid);
      if(!light){
        continue;
      }
      const helper = this.ensureShadowHelper(light);
      if(helper){
        helper.visible = true;
        helper.update(roles, this.focusPosition);
      }
    }
  }

  /**
   * PrioritizeLights membership follows VIS / gameplay visibility, not room
   * mesh draw cull. `applyRoomRenderFrustumCull` toggles `model.visible` for
   * draw only; `userData.visActive` stays true for VIS-linked rooms.
   * PrioritizeLights scores render_lights without a camera frustum gate on
   * the parent mesh — tying eligibility to `visible` dropped elevated suns
   * (and soft shadow primaries) when looking away from their room AABB.
   */
  isPrioritizeModelVisible(model: THREE.Object3D | undefined | null): boolean {
    if(!model){ return false; }
    if(model.userData?.visActive !== undefined){
      return !!model.userData.visActive;
    }
    return !!model.visible;
  }

  /**
   * illumination prioritize eligibility for the room/global render set:
   * radius != 0 and color not black. Score <= 1 is applied by the caller.
   * Unlike nearest light selection, static lights (no dynamic/affectDynamic) are included.
   */
  isPrioritizeEligible(light: OdysseyLight3D): boolean {
    return !!light &&
      this.isPrioritizeModelVisible(light.odysseyModel) &&
      light.getRadius() > 0 &&
      !light.isColorBlack();
  }

  /** @deprecated Use isPrioritizeEligible / isNearestLightEligible. */
  isEligibleLight(light: OdysseyLight3D): boolean {
    return this.isNearestLightEligible(light) &&
      this.isPrioritizeModelVisible(light.odysseyModel) &&
      !light.isColorBlack();
  }

  buildSortKey(light: OdysseyLight3D): IOdysseyLightSortKey {
    const key = light.sortKey;
    key.priority = odysseyEffectivePriority(light.priority, light.authoredPriority);
    key.dynamicRank = odysseyDynamicRank(light.dynamicType ?? (light.isDynamic ? 1 : 0));
    key.illuminationScore = light.illuminationScore;
    key.colorIsBlack = light.isColorBlack();
    key.registrationOrder = light.registrationOrder;
    key.uuid = light.uuid;
    return key;
  }

  /** Sort in place using light sort. buildSortKey mutates per-light scratch (no alloc). */
  private prepareAndSort(lights: OdysseyLight3D[]){
    lights.sort(this.sortLights);
  }

  sortLights = (a: OdysseyLight3D, b: OdysseyLight3D) => {
    return compareOdysseyLights(this.buildSortKey(a), this.buildSortKey(b));
  };

  /**
   * PrioritizeLights + illumination prioritize (arg1=false): score lights,
   * keep those with score <= 1, sort via light sort. Cap at MAXLIGHTS for the
   * desired fade set (light fade pass). No per-parent limit — that is a
   * nearest light selection / GL_LIGHT0..2 concern only.
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
    // dynamic-only lights scans the full prioritized list, not the capped
    // room selection, so pass the sorted candidates.
    this.reclaimExclusiveDynamicLights(delta, candidates);
    this.syncUniformBuffers();
  }

  /**
   * illumination prioritize bump_map_lights: scan the first 3 sorted
   * illumination lights; keep the first non-ambient with n_dynamic_type != 0.
   */
  updateBumpLightSelection(sortedCandidates: OdysseyLight3D[] = this.selectedLights){
    this.bumpLights = odysseySelectIlluminationBump(sortedCandidates);
  }

  /**
   * Standalone bump prioritize: non-ambient dynamic lights from the
   * render/fade pool, light sort-sorted, capped at 1. Used when selects
   * the independent bump path instead of the illumination-inline scan.
   */
  prioritizeBump(){
    this.bumpLights = odysseySelectPrioritizeBump(this.boundLights, this.sortLights);
    this.fillUniformSet(this.bumpMapLights, this.bumpLights);
  }

  /** Read the fade field light fade pass selects for `channel`. */
  private readFade(light: OdysseyLight3D, channel: OdysseyLightFadeChannel): number {
    return channel === OdysseyLightFadeChannel.Secondary
      ? light.dynamicOnlyFadeFactor
      : light.fadeFactor;
  }

  private writeFade(light: OdysseyLight3D, channel: OdysseyLightFadeChannel, value: number){
    if(channel === OdysseyLightFadeChannel.Secondary){
      light.dynamicOnlyFadeFactor = value;
    }else{
      light.fadeFactor = value;
    }
  }

  /**
   * light fade pass: keep the bound render-light pool, fade with
   * ±deltaT, and apply fadingLightFlag only as the initial fade (0 vs 1).
   * Lights leaving the desired set always fade out — not only when isFading.
   *
   * `channel` selects the light node fade field (arg4), so the room
   * pool and the static-geometry pool fade independently.
   */
  private controlLightsFade(
    boundPool: OdysseyLight3D[],
    desiredLights: OdysseyLight3D[],
    delta: number,
    channel: OdysseyLightFadeChannel,
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
          this.writeFade(light, channel, odysseyFadeStep(this.readFade(light, channel), 1, delta));
          next.push(light);
        }else{
          this.writeFade(light, channel, odysseyFadeStep(this.readFade(light, channel), 0, delta));
          if(this.readFade(light, channel) > 0){
            next.push(light);
          }
        }
        continue;
      }
      // Dropped from master registration: remove immediately (light fade pass).
      if(!registered.has(light.uuid)){
        continue;
      }
      this.writeFade(light, channel, odysseyFadeStep(this.readFade(light, channel), 0, delta));
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
      this.writeFade(light, channel, odysseyFadeInit(!!light.isFading));
      this.writeFade(light, channel, odysseyFadeStep(this.readFade(light, channel), 1, delta));
      next.push(light);
      shown.add(light.uuid);
    }

    this.prepareAndSort(next);
    return next;
  }

  /** EnableLights → light fade pass on the room/global pool. */
  reclaimLights(delta = 0, desiredLights: OdysseyLight3D[] = []){
    const next = this.controlLightsFade(
      this.boundLights,
      desiredLights,
      delta,
      OdysseyLightFadeChannel.Primary,
      this._boundNextScratch,
      this.lightsShown
    );
    this._boundNextScratch = this.boundLights;
    this.boundLights = next;
  }

  /**
   * dynamic-only lights: fade the `n_dynamic_type == 1` subset of
   * the prioritized illumination list into exclusive_dynamic_lights. This is the
   * pool RenderStaticGeometry binds for lightmapped geometry.
   */
  reclaimExclusiveDynamicLights(delta = 0, prioritizedLights: OdysseyLight3D[] = []){
    const desired = odysseySelectDynamicOnlyLights(prioritizedLights, this._dynamicOnlyScratch);
    const next = this.controlLightsFade(
      this.exclusiveDynamicLights,
      desired,
      delta,
      OdysseyLightFadeChannel.Secondary,
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
    // secondary channel (light fade pass arg4 = 1).
    this.fillUniformSet(
      this.lightmapLights,
      this.exclusiveDynamicLights,
      OdysseyLightFadeChannel.Secondary
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

  /** illumination prioritize bump_map_lights packed for USE_BUMPMAP materials. */
  getBumpMapLightSet(): IOdysseyLightUniformSlot {
    return this.bumpMapLights;
  }

  /**
   * Copy the top prioritized room lights into the global packed buffers.
   * boundLights is the scene's fading pool (up to MAXLIGHTS == 8); each model's
   * shader only consumes the top MAX_LIGHTS_PER_MODEL (allowed_lights = 3,
   * SetUpVertexProgramLightShaderConstants), so fillUniformSet caps here.
   */
  fillGlobalBuffers(){
    this.fillUniformSet(this.globalLights, this.boundLights);
  }

  /**
   * nearest light selection eligibility with arg4 == 0:
   * (dynamic || affectDynamic) and radius > 0. No color-black / visibility gate.
   */
  isNearestLightEligible(light: OdysseyLight3D): boolean {
    return !!light &&
      (light.isDynamic || light.affectDynamic) &&
      light.getRadius() > 0;
  }

  /**
   * nearest light selection: walk registration order, first 3 sphere overlaps.
   * Shader color packing uses authored rgb only (no fade / no multiplier)
   * VP-aligned; see packLightsForObject.
   * Returns a reused scratch array — copy if you need to retain across calls.
   */
  getLightsForObject(
    position: THREE.Vector3,
    radius = LightManager.ODYSSEY_GOB_LIGHT_RADIUS
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
   * Numeric fingerprint of nearest light selection result at `position` (ids + poses +
   * multipliers). Fills `_nearestScratch`; follow with `packLastNearestLights`
   * to avoid a second walk.
   */
  fingerprintNearestLights(
    position: THREE.Vector3,
    radius = LightManager.ODYSSEY_GOB_LIGHT_RADIUS
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

  /** Pack nearest light selection for one object (authored color; VP-aligned). */
  packLightsForObject(
    position: THREE.Vector3,
    radius = LightManager.ODYSSEY_GOB_LIGHT_RADIUS
  ): IOdysseyLightUniformSlot {
    const nearest = this.getLightsForObject(position, radius);
    this.fillUniformSet(this.objectLights, nearest, OdysseyLightFadeChannel.None);
    return this.objectLights;
  }

  /** Pack the last `getLightsForObject` / `fingerprintNearestLights` result. */
  packLastNearestLights(): IOdysseyLightUniformSlot {
    this.fillUniformSet(this.objectLights, this._nearestScratch, OdysseyLightFadeChannel.None);
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
   * @param channel fade field applied to the packed color (arg4);
   * `None` is nearest/gob: authored color only (VP-aligned).
   * @param maxCount per-model shader light cap. Defaults to MAX_LIGHTS_PER_MODEL
   * minus one when the camera headlight is enabled.
   */
  private fillUniformSet(
    set: IOdysseyLightUniformSlot,
    lights: OdysseyLight3D[],
    channel = OdysseyLightFadeChannel.Primary,
    maxCount = odysseyModelLightSlots(LightManager.MAX_LIGHTS_PER_MODEL, this.headLightEnabled)
  ){
    const count = Math.min(lights.length, maxCount, MAX_ODYSSEY_LIGHTS);
    let changed = set.count !== count;
    const color = this._fillColor;
    for(let i = 0; i < MAX_ODYSSEY_LIGHTS; i++){
      const position = set.odysseyLightPos[i];
      const targetColor = set.odysseyLightColor[i];
      if(i < count){
        const light = lights[i];
        if(channel === OdysseyLightFadeChannel.Secondary){
          light.getDynamicOnlyColor(color);
        }else if(channel === OdysseyLightFadeChannel.Primary){
          light.getEffectiveColor(color);
        }else{
          light.getIntensityColor(color);
        }
        const attenuation = odysseyQuadraticAttenuation(light.getRadius());
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
   * shadow prioritize: non-ambient + raw color gate from render_lights (boundLights),
   * sorted via light sort. shadow light selection modes 0/1 do not check light node.shadow
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
      if(!isOdysseyShadowColorVisible(light.color.r, light.color.g, light.color.b)){
        continue;
      }
      candidates.push(light);
    }
    this.prepareAndSort(candidates);
    return candidates;
  }

  /**
   * shadow light selection for the requested mode.
   * Mode 0/1 walk boundLights with illum/dynamic filters, sticky hysteresis for
   * residents that still qualify, and fade retention up to steadyCap+1 so an
   * outgoing caster can crossfade with an incoming one under shadow maps.
   * Mode 2 picks one distant/static light.
   */
  getShadowLights(mode: OdysseyShadowLightMode, delta = 0): OdysseyLight3D[] {
    if(mode === OdysseyShadowLightMode.DistantStatic){
      this.distantShadowLight = odysseySelectDistantStaticShadowLight(this.lights);
      return this.distantShadowLight ? [this.distantShadowLight] : [];
    }

    const dynamicOnly = mode === OdysseyShadowLightMode.SingleDynamic;
    const steadyCap = dynamicOnly ? 1 : LightManager.MAXSHADOWLIGHTS;
    // Transient residency: one extra slot while fade-out × fade-in overlap.
    const residencyCap = steadyCap + 1;
    const previous = mode === OdysseyShadowLightMode.SingleDynamic
      ? this.staticMeshShadowLights
      : this.shadowLights;

    const desired = this._shadowDesiredScratch;
    desired.length = 0;
    const desiredSet = this._shadowDesiredSetScratch;
    desiredSet.clear();

    const stillQualifies = (light: OdysseyLight3D) => {
      if(light.illuminationScore > 1){ return false; }
      if(dynamicOnly && (light.dynamicType | 0) === 0){ return false; }
      return true;
    };

    // Sticky hysteresis: keep previous residents that still qualify before
    // admitting newly higher-ranked bound lights (reduces top-N thrash).
    for(let i = 0; i < previous.length; i++){
      const light = previous[i];
      if(desired.length >= steadyCap){ break; }
      if(!stillQualifies(light)){ continue; }
      if(desiredSet.has(light.uuid)){ continue; }
      // Only sticky if still present in the bound render list.
      let inBound = false;
      for(let b = 0, bl = this.boundLights.length; b < bl; b++){
        if(this.boundLights[b] === light){ inBound = true; break; }
      }
      if(!inBound){ continue; }
      desired.push(light);
      desiredSet.add(light.uuid);
    }

    // walk fills remaining desired slots from bound order.
    for(let i = 0, il = this.boundLights.length; i < il; i++){
      if(desired.length >= steadyCap){ break; }
      const light = this.boundLights[i];
      if(!stillQualifies(light)){ continue; }
      if(desiredSet.has(light.uuid)){ continue; }
      desired.push(light);
      desiredSet.add(light.uuid);
    }

    const next = this._shadowNextScratch;
    next.length = 0;

    // Fading-out residents first (prepends), then desired.
    for(let i = 0; i < previous.length; i++){
      const light = previous[i];
      if(desiredSet.has(light.uuid)){ continue; }
      light.shadowFadeFactor = odysseyShadowFadeStep(light.shadowFadeFactor || 0, 0, delta);
      if(light.shadowFadeFactor > 0){ next.push(light); }
    }
    for(let i = 0; i < desired.length; i++){
      const light = desired[i];
      light.shadowFadeFactor = odysseyShadowFadeStep(light.shadowFadeFactor || 0, 1, delta);
      next.push(light);
    }

    // Cap at residencyCap, preferring desired over fading-out when trimming.
    if(next.length > residencyCap){
      const fadingCount = next.length - desired.length;
      const keepFading = Math.max(0, residencyCap - desired.length);
      if(fadingCount > keepFading){
        const trimmed: OdysseyLight3D[] = [];
        for(let i = 0; i < keepFading; i++){
          trimmed.push(next[i]);
        }
        for(let i = fadingCount; i < next.length; i++){
          trimmed.push(next[i]);
        }
        next.length = 0;
        for(let i = 0; i < trimmed.length; i++){
          next.push(trimmed[i]);
        }
      }else{
        next.length = residencyCap;
      }
    }

    if(mode === OdysseyShadowLightMode.SingleDynamic){
      this.staticMeshShadowLights = next.slice();
    }else{
      this.shadowLights = next.slice();
    }
    return mode === OdysseyShadowLightMode.SingleDynamic
      ? this.staticMeshShadowLights
      : this.shadowLights;
  }

  /**
   * shadow prioritize + shadow light selection(mode=0).
   * Also refreshes mode 1 / mode 2 lists for callers that need them.
   */
  updateShadowLightSelection(delta = 0){
    this.getShadowLights(OdysseyShadowLightMode.Multi, delta);
    this.getShadowLights(OdysseyShadowLightMode.SingleDynamic, delta);
    this.getShadowLights(OdysseyShadowLightMode.DistantStatic, delta);
  }

  /**
   * Legacy helper retained for callers that still track per-parent counts.
   * illumination prioritize does not apply a per-parent cap; nearest light selection
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
        ODYSSEY_GOB_LIGHT_RADIUS: LightManager.ODYSSEY_GOB_LIGHT_RADIUS,
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
    ODYSSEY_GOB_LIGHT_RADIUS: number;
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
