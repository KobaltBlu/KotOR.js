import * as THREE from 'three';

import type { LightManager } from '@/managers/LightManager';
import { LightManager as LightManagerClass } from '@/managers/LightManager';
import type { OdysseyLight3D } from '@/three/odyssey';
import { GameState } from '@/GameState';
import {
  isRetailShadowColorVisible,
  retailShadowEffectiveRadius,
  retailShadowLightPosition,
  retailShadowProjectionStrength,
  retailSoftShadowLightElevationOk,
} from '@/utility/retailLighting';
import {
  aimShadowProxyAtFocus,
  buildAngledSpotShadowCameraParams,
  buildOrthoShadowCameraParams,
  configureSpotShadowProxyForFloorContact,
  isDistantShadowLightRadius,
  ODYSSEY_SHADOW_MAP_LIGHT_BIAS,
  ODYSSEY_SHADOW_MIN_HALF_EXTENT,
  placeDirectionalShadowProxyAlongLight,
} from '@/utility/odysseyShadowMap';
import { MAX_ODYSSEY_SHADOW_MAPS } from '@/shaders/chunks/OdysseyShadow';

export type OdysseyPrimaryShadowLightType = 'spot' | 'directional';

export interface IOdysseyShadowSlotState {
  light: OdysseyLight3D | undefined;
  uuid: string | null;
  type: OdysseyPrimaryShadowLightType | null;
  strength: number;
  influenceRadius: number;
  lightWorld: THREE.Vector3;
  active: boolean;
}

export interface IOdysseyShadowDiagnostics {
  activeLightUuid: string | null;
  activeLightUuids: string[];
  lightType: OdysseyPrimaryShadowLightType | null;
  mapResolution: number;
  updateReason: string;
  renderTimeMs: number;
  casterDrawCount: number;
  activeLightCount: number;
  cameraBounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    near: number;
    far: number;
  } | null;
}

// Directional lights cover up to an 80-unit-wide focus region. 2048 keeps
// their 3x3 PCF footprint from becoming visibly blocky or overly broad.
const DEFAULT_MAP_RES_SOFT = 2048;
const DEFAULT_MAP_RES_HARD = 512;
const SHADOW_MAP_NORMAL_BIAS = 0.005;

interface IShadowProxySlot {
  spot: THREE.SpotLight;
  directional: THREE.DirectionalLight;
  state: IOdysseyShadowSlotState;
  lastMatrixElements: Float32Array;
}

/**
 * Retail-aligned shadow maps.
 *
 * Soft Shadows ON → one proxy (RenderShadows / soft stencil disk path).
 * Soft Shadows OFF → up to `maxShadowLights` (DoGobShadows multi-light).
 */
export class OdysseyShadowManager {
  private lightManager: LightManager | undefined;
  private scene: THREE.Scene | THREE.Object3D | undefined;

  activeLightCount = 0;
  frameEpoch = 0;

  /** First active Odyssey light (compat / diagnostics primary). */
  activeLight: OdysseyLight3D | undefined;
  activeLightUuid: string | null = null;
  activeLightType: OdysseyPrimaryShadowLightType | null = null;

  /** Compat: first slot strength / influence / light world. */
  shadowStrength = 0;
  influenceRadius = 0;
  lightWorld = new THREE.Vector3();

  mapResolution = DEFAULT_MAP_RES_SOFT;
  softShadowMaps = true;
  lastUpdateReason = 'none';
  lastRenderTimeMs = 0;
  lastCasterDrawCount = 0;

  readonly diagnostics: IOdysseyShadowDiagnostics = {
    activeLightUuid: null,
    activeLightUuids: [],
    lightType: null,
    mapResolution: DEFAULT_MAP_RES_SOFT,
    updateReason: 'none',
    renderTimeMs: 0,
    casterDrawCount: 0,
    activeLightCount: 0,
    cameraBounds: null,
  };

  private slots: IShadowProxySlot[] = [];
  private _lastStateHash = 0;
  private _needsShadowMapRender = false;
  private _focus = new THREE.Vector3();
  private _proxyPos = new THREE.Vector3();
  private _scratchSelected: OdysseyLight3D[] = [];
  private _scratchSoftCandidates: OdysseyLight3D[] = [];
  private _scratchToFocus = new THREE.Vector3();

  init(lightManager: LightManager, scene?: THREE.Scene | THREE.Object3D){
    this.lightManager = lightManager;
    this.ensureSlots(this.maxShadowMaps);
    if(scene){
      this.setScene(scene);
    }
  }

  /**
   * Concurrent maps: Soft Shadows uses one disk/light (retail RenderShadows);
   * hard mode uses videoquality NumShadowCastingLights / DoGobShadows.
   */
  get maxShadowMaps(): number {
    if(this.softShadowMaps){
      return 1;
    }
    const fromQuality = this.lightManager
      ? LightManagerClass.MAXSHADOWLIGHTS
      : MAX_ODYSSEY_SHADOW_MAPS;
    return Math.max(1, Math.min(MAX_ODYSSEY_SHADOW_MAPS, fromQuality | 0));
  }

  /** Sync map resolution / soft flag from LightManager INI Soft Shadows. */
  syncQualityFromLightManager(){
    const soft = !!this.lightManager?.softShadowsEnabled;
    this.useQualityPreset(soft);
  }

  setScene(scene: THREE.Scene | THREE.Object3D){
    this.detachProxies();
    this.scene = scene;
    this.attachProxies();
  }

  setMapResolution(resolution: number, soft = true){
    this.mapResolution = Math.max(256, resolution | 0);
    this.softShadowMaps = soft;
    this.configureProxyMapSize(this.mapResolution);
    this._needsShadowMapRender = true;
  }

  useQualityPreset(softShadowsEnabled: boolean){
    const soft = !!softShadowsEnabled;
    const nextRes = soft ? DEFAULT_MAP_RES_SOFT : DEFAULT_MAP_RES_HARD;
    if(this.softShadowMaps !== soft || this.mapResolution !== nextRes){
      this.frameEpoch++;
    }
    this.setMapResolution(nextRes, soft);
  }

  private ensureSlots(count: number){
    while(this.slots.length < count){
      const index = this.slots.length;
      const spot = new THREE.SpotLight(0xffffff, 0);
      spot.name = `OdysseyShadowSpot_${index}`;
      spot.castShadow = false;
      spot.visible = false;
      spot.frustumCulled = false;

      const directional = new THREE.DirectionalLight(0xffffff, 0);
      directional.name = `OdysseyShadowDir_${index}`;
      directional.castShadow = false;
      directional.visible = false;
      directional.frustumCulled = false;

      this.slots.push({
        spot,
        directional,
        state: {
          light: undefined,
          uuid: null,
          type: null,
          strength: 0,
          influenceRadius: 0,
          lightWorld: new THREE.Vector3(),
          active: false,
        },
        lastMatrixElements: new Float32Array(16),
      });
    }
  }

  private configureProxyMapSize(size: number){
    for(let i = 0; i < this.slots.length; i++){
      const slot = this.slots[i];
      for(const proxy of [slot.spot, slot.directional]){
        proxy.shadow.mapSize.set(size, size);
        proxy.shadow.needsUpdate = true;
      }
    }
  }

  private attachProxies(){
    if(!this.scene){ return; }
    this.ensureSlots(this.maxShadowMaps);
    for(let i = 0; i < this.slots.length; i++){
      const slot = this.slots[i];
      for(const proxy of [slot.spot, slot.directional]){
        if(!proxy.parent){
          this.scene.add(proxy);
        }
        if(!proxy.target.parent){
          this.scene.add(proxy.target);
        }
      }
    }
  }

  private detachProxies(){
    for(let i = 0; i < this.slots.length; i++){
      this.clearSlot(i);
      const slot = this.slots[i];
      for(const proxy of [slot.spot, slot.directional]){
        proxy.target.removeFromParent();
        proxy.removeFromParent();
      }
    }
  }

  private clearSlot(index: number){
    const slot = this.slots[index];
    if(!slot){ return; }
    slot.spot.visible = false;
    slot.spot.castShadow = false;
    slot.directional.visible = false;
    slot.directional.castShadow = false;
    slot.state.light = undefined;
    slot.state.uuid = null;
    slot.state.type = null;
    slot.state.strength = 0;
    slot.state.influenceRadius = 0;
    slot.state.lightWorld.set(0, 0, 0);
    slot.state.active = false;
  }

  /** Shadow camera for slot 0 (Forge debug overlay). */
  getShadowCamera(): THREE.Camera | null {
    const proxy = this.getActiveProxy(0);
    return proxy?.shadow?.camera ?? null;
  }

  private getActiveProxy(index: number): THREE.SpotLight | THREE.DirectionalLight | undefined {
    const slot = this.slots[index];
    if(!slot?.state.active || !slot.state.type){ return undefined; }
    return slot.state.type === 'spot' ? slot.spot : slot.directional;
  }

  /** Slot 0 map texture (compat). */
  getShadowMapTexture(): THREE.Texture | null {
    return this.getShadowMapTextureAt(0);
  }

  getShadowMapTextureAt(index: number): THREE.Texture | null {
    const proxy = this.getActiveProxy(index);
    const target = proxy?.shadow?.map ?? proxy?.shadow?.mapPass;
    return target?.texture ?? null;
  }

  /** Slot 0 shadow matrix (compat). */
  getShadowMatrix(out = new THREE.Matrix4()): THREE.Matrix4 {
    return this.getShadowMatrixAt(0, out);
  }

  getShadowMatrixAt(index: number, out = new THREE.Matrix4()): THREE.Matrix4 {
    const proxy = this.getActiveProxy(index);
    if(proxy?.shadow?.matrix){
      return out.copy(proxy.shadow.matrix);
    }
    return out.identity();
  }

  getSlotState(index: number): IOdysseyShadowSlotState | undefined {
    return this.slots[index]?.state;
  }

  /**
   * Soft Shadows: one elevated lightcmp-best bound light (RenderShadows).
   * Hard: GetShadowLights(mode=0) fading set, capped at maxShadowLights.
   * Falls back to mode-1/2 when mode-0 is empty (hard only).
   */
  private selectShadowLights(): OdysseyLight3D[] {
    const out = this._scratchSelected;
    out.length = 0;
    if(!this.lightManager){ return out; }

    if(this.softShadowMaps){
      return this.selectSoftShadowLight(out);
    }

    const max = this.maxShadowMaps;
    const seen = new Set<string>();
    const push = (light: OdysseyLight3D | undefined) => {
      if(!light || out.length >= max || seen.has(light.uuid)){ return; }
      const strength = retailShadowProjectionStrength(
        GameState.shadowAlpha,
        light.shadowFadeFactor || 0
      );
      if(!(strength > 0)){ return; }
      seen.add(light.uuid);
      out.push(light);
    };

    const mode0 = this.lightManager.shadowLights;
    for(let i = 0; i < mode0.length; i++){
      push(mode0[i]);
    }

    // Mode 1 / 2 fallbacks when mode 0 produced nothing (or fill remaining slots).
    if(!out.length){
      push(this.lightManager.staticMeshShadowLights[0]);
    }
    if(!out.length){
      push(this.lightManager.distantShadowLight);
    }

    return out;
  }

  /**
   * Retail RenderShadows Soft Shadows path: elevation gate, then the most
   * overhead elevated bound light (soft disk is horizontal at focus Z).
   * lightcmp alone prefers lower MDL priority and would keep wall sconces
   * (e.g. auroralight40) over ceiling lamps (auroralight47). Empty when none qualify.
   */
  private selectSoftShadowLight(out: OdysseyLight3D[]): OdysseyLight3D[] {
    const lm = this.lightManager;
    if(!lm){ return out; }
    if(!(GameState.shadowAlpha > 0)){ return out; }

    const focusZ = this._focus.z;
    const candidates = this._scratchSoftCandidates;
    candidates.length = 0;

    const bound = lm.boundLights;
    for(let i = 0; i < bound.length; i++){
      const light = bound[i];
      if(light.isAmbient){ continue; }
      if(!isRetailShadowColorVisible(light.color.r, light.color.g, light.color.b)){
        continue;
      }
      if(light.illuminationScore > 1){ continue; }
      if(!retailSoftShadowLightElevationOk(light.worldPosition.z, focusZ)){
        continue;
      }
      candidates.push(light);
    }

    if(!candidates.length){ return out; }

    const toFocus = this._scratchToFocus;
    const focus = this._focus;
    const elevAngleSq = (light: OdysseyLight3D) => {
      // Smaller = more overhead. Use 1 - cos^2 toward -Z without acos.
      toFocus.set(
        focus.x - light.worldPosition.x,
        focus.y - light.worldPosition.y,
        focus.z - light.worldPosition.z
      );
      const lenSq = toFocus.lengthSq();
      if(!(lenSq > 1e-8)){ return 0; }
      const dz = toFocus.z;
      // horiz^2 / len^2 = 1 - (dz/len)^2 — lower when more vertical.
      return 1 - (dz * dz) / lenSq;
    };

    candidates.sort((a, b) => {
      const ea = elevAngleSq(a);
      const eb = elevAngleSq(b);
      if(ea !== eb){ return ea - eb; }
      return lm.sortLights(a, b);
    });

    const best = candidates[0];
    // Soft path does not wait on GetShadowLights fade history.
    if(!(best.shadowFadeFactor > 0)){
      best.shadowFadeFactor = 1;
    }
    const strength = retailShadowProjectionStrength(
      GameState.shadowAlpha,
      best.shadowFadeFactor || 0
    );
    if(strength > 0){
      out.push(best);
    }
    return out;
  }

  private computeStateHash(lights: OdysseyLight3D[]): number {
    let h = lights.length | 0;
    h = Math.imul(h ^ this.mapResolution, 16777619);
    h = Math.imul(h ^ Math.round(this._focus.x * 1000), 16777619);
    h = Math.imul(h ^ Math.round(this._focus.y * 1000), 16777619);
    h = Math.imul(h ^ Math.round(this._focus.z * 1000), 16777619);
    for(let i = 0; i < lights.length; i++){
      const light = lights[i];
      const strength = retailShadowProjectionStrength(
        GameState.shadowAlpha,
        light.shadowFadeFactor || 0
      );
      h = Math.imul(h ^ light.uuid.charCodeAt(0), 16777619);
      h = Math.imul(h ^ Math.round(strength * 10000), 16777619);
      h = Math.imul(h ^ Math.round(light.worldPosition.x * 1000), 16777619);
      h = Math.imul(h ^ Math.round(light.worldPosition.y * 1000), 16777619);
      h = Math.imul(h ^ Math.round(light.worldPosition.z * 1000), 16777619);
    }
    return h | 0;
  }

  update(_camera?: THREE.Camera, focus?: THREE.Vector3){
    this.activeLightCount = 0;
    this.activeLight = undefined;
    this.activeLightUuid = null;
    this.activeLightType = null;
    this.shadowStrength = 0;
    this.influenceRadius = 0;
    this.lastUpdateReason = 'disabled';

    if(!this.lightManager || !GameState.areShadowsEnabled()){
      this.deactivateProxies('shadows-disabled');
      return;
    }

    if(!(GameState.shadowAlpha > 0)){
      this.deactivateProxies('shadow-alpha-zero');
      return;
    }

    this.ensureSlots(this.maxShadowMaps);
    this.attachProxies();

    if(focus){
      this._focus.copy(focus);
    }else{
      this._focus.copy(this.lightManager.focusPosition);
    }

    // Soft Shadows may flip between 1 and multi-light mid-session.
    if(this.lightManager){
      const soft = !!this.lightManager.softShadowsEnabled;
      if(soft !== this.softShadowMaps){
        this.useQualityPreset(soft);
      }
    }

    const lights = this.selectShadowLights();
    if(!lights.length){
      this.deactivateProxies('no-primary-light');
      return;
    }

    const stateHash = this.computeStateHash(lights);
    const hashChanged = stateHash !== this._lastStateHash;
    if(hashChanged){
      this._lastStateHash = stateHash;
      this.frameEpoch++;
      this._needsShadowMapRender = true;
      this.lastUpdateReason = 'state-change';
    }else{
      this.lastUpdateReason = 'unchanged';
    }

    const max = this.maxShadowMaps;
    for(let i = 0; i < this.slots.length; i++){
      if(i >= max || i >= lights.length){
        this.clearSlot(i);
        continue;
      }
      this.syncSlot(i, lights[i]);
    }

    this.activeLightCount = Math.min(lights.length, max);
    this.activeLight = lights[0];
    this.activeLightUuid = lights[0].uuid;
    this.activeLightType = this.slots[0]?.state.type ?? null;
    this.shadowStrength = this.slots[0]?.state.strength ?? 0;
    this.influenceRadius = this.slots[0]?.state.influenceRadius ?? 0;
    if(this.slots[0]){
      this.lightWorld.copy(this.slots[0].state.lightWorld);
    }

    this.refreshDiagnostics();
  }

  private deactivateProxies(reason: string){
    if(this._lastStateHash !== 0){
      this._lastStateHash = 0;
      this.frameEpoch++;
    }
    for(let i = 0; i < this.slots.length; i++){
      this.clearSlot(i);
    }
    this.activeLightCount = 0;
    this.activeLight = undefined;
    this.activeLightUuid = null;
    this.activeLightType = null;
    this.shadowStrength = 0;
    this.influenceRadius = 0;
    this._needsShadowMapRender = false;
    this.lastUpdateReason = reason;
    this.refreshDiagnostics();
  }

  private syncSlot(index: number, light: OdysseyLight3D){
    const slot = this.slots[index];
    const strength = retailShadowProjectionStrength(
      GameState.shadowAlpha,
      light.shadowFadeFactor || 0
    );
    const radius = light.getRadius();
    const lp = retailShadowLightPosition({
      x: light.worldPosition.x,
      y: light.worldPosition.y,
      z: light.worldPosition.z,
      radius,
      shadowRadius: light.shadowRadius || 0,
      verticalDisplacement: light.verticalDisplacement || 0,
    });
    const influenceR = retailShadowEffectiveRadius(radius, light.shadowRadius || 0);
    const type: OdysseyPrimaryShadowLightType = isDistantShadowLightRadius(radius)
      ? 'directional'
      : 'spot';

    slot.spot.visible = type === 'spot';
    slot.spot.castShadow = type === 'spot';
    slot.directional.visible = type === 'directional';
    slot.directional.castShadow = type === 'directional';

    const active = type === 'spot' ? slot.spot : slot.directional;
    active.shadow.bias = ODYSSEY_SHADOW_MAP_LIGHT_BIAS;
    active.shadow.normalBias = SHADOW_MAP_NORMAL_BIAS;
    active.shadow.mapSize.set(this.mapResolution, this.mapResolution);

    this._proxyPos.set(lp.x, lp.y, lp.z);

    if(type === 'spot'){
      configureSpotShadowProxyForFloorContact(this._proxyPos, this._focus, influenceR, slot.spot);
      const coverage = Math.min(influenceR, ODYSSEY_SHADOW_MIN_HALF_EXTENT * 1.5);
      const spotParams = buildAngledSpotShadowCameraParams(
        slot.spot.position,
        this._focus,
        Math.max(coverage, ODYSSEY_SHADOW_MIN_HALF_EXTENT)
      );
      const halfAngleRad = THREE.MathUtils.degToRad(Math.min(spotParams.fovDeg * 0.5, 89));
      slot.spot.angle = halfAngleRad;
      slot.spot.penumbra = this.softShadowMaps ? 0.25 : 0;
      slot.spot.distance = spotParams.far;
      slot.spot.shadow.camera.fov = spotParams.fovDeg;
      slot.spot.shadow.camera.near = spotParams.near;
      slot.spot.shadow.camera.far = spotParams.far;
      slot.spot.shadow.camera.updateProjectionMatrix();
      slot.state.lightWorld.copy(slot.spot.position);
    }else{
      const ortho = buildOrthoShadowCameraParams(influenceR, this._proxyPos, this._focus);
      const cam = slot.directional.shadow.camera as THREE.OrthographicCamera;
      cam.left = -ortho.halfExtent;
      cam.right = ortho.halfExtent;
      cam.top = ortho.halfExtent;
      cam.bottom = -ortho.halfExtent;
      cam.near = ortho.near;
      cam.far = ortho.far;
      placeDirectionalShadowProxyAlongLight(
        this._proxyPos,
        this._focus,
        ortho.halfExtent,
        this._proxyPos
      );
      aimShadowProxyAtFocus(this._proxyPos, this._focus, slot.directional);
      cam.updateProjectionMatrix();
      slot.state.lightWorld.copy(slot.directional.position);
    }

    slot.state.light = light;
    slot.state.uuid = light.uuid;
    slot.state.type = type;
    slot.state.strength = strength;
    slot.state.influenceRadius = influenceR;
    slot.state.active = true;
    this._needsShadowMapRender = true;
  }

  /**
   * Mark all active proxy maps dirty for the next `renderer.render()` call.
   */
  markShadowMapForRender(renderer: THREE.WebGLRenderer): boolean {
    if(!this.activeLightCount){
      return false;
    }

    let any = false;
    for(let i = 0; i < this.activeLightCount; i++){
      const proxy = this.getActiveProxy(i);
      if(!proxy?.castShadow){ continue; }
      proxy.shadow.needsUpdate = true;
      if(!proxy.shadow.map){
        proxy.shadow.mapSize.set(this.mapResolution, this.mapResolution);
      }
      any = true;
    }
    if(!any){ return false; }

    renderer.shadowMap.needsUpdate = true;
    this.lastUpdateReason = 'pending-render';
    this.refreshDiagnostics();
    return true;
  }

  /** @deprecated Use markShadowMapForRender */
  renderShadowMap(
    renderer: THREE.WebGLRenderer,
    _scene?: THREE.Scene | THREE.Object3D,
    _camera?: THREE.Camera
  ): boolean {
    return this.markShadowMapForRender(renderer);
  }

  noteShadowMapRendered(): void {
    let matrixChanged = false;
    for(let i = 0; i < this.activeLightCount; i++){
      const proxy = this.getActiveProxy(i);
      const slot = this.slots[i];
      if(!proxy?.shadow?.map || !slot){ continue; }
      const matrix = proxy.shadow.matrix.elements;
      for(let e = 0; e < 16; e++){
        if(slot.lastMatrixElements[e] !== matrix[e]){
          matrixChanged = true;
          slot.lastMatrixElements.set(matrix);
          break;
        }
      }
    }
    if(matrixChanged){
      this.frameEpoch++;
    }
    this._needsShadowMapRender = false;
    this.lastUpdateReason = 'render';
    this.refreshDiagnostics();
  }

  hasAnimatedCasters(scene: THREE.Scene | THREE.Object3D): boolean {
    let found = false;
    scene.traverse((obj) => {
      if(found){ return; }
      const mesh = obj as THREE.Mesh;
      if(!mesh.isMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh){ return; }
      if(!mesh.visible || !mesh.castShadow){ return; }
      if((mesh as THREE.SkinnedMesh).isSkinnedMesh){
        found = true;
        return;
      }
      if(mesh.userData.odysseyAttachedEquipmentCaster){
        found = true;
      }
    });
    return found;
  }

  private refreshDiagnostics(){
    const proxy = this.getActiveProxy(0);
    const cam = proxy?.shadow?.camera;
    const uuids: string[] = [];
    for(let i = 0; i < this.activeLightCount; i++){
      const uuid = this.slots[i]?.state.uuid;
      if(uuid){ uuids.push(uuid); }
    }
    this.diagnostics.activeLightUuid = this.activeLightUuid;
    this.diagnostics.activeLightUuids = uuids;
    this.diagnostics.lightType = this.activeLightType;
    this.diagnostics.mapResolution = this.mapResolution;
    this.diagnostics.updateReason = this.lastUpdateReason;
    this.diagnostics.renderTimeMs = this.lastRenderTimeMs;
    this.diagnostics.casterDrawCount = this.lastCasterDrawCount;
    this.diagnostics.activeLightCount = this.activeLightCount;
    if(cam){
      this.diagnostics.cameraBounds = {
        left: (cam as THREE.OrthographicCamera).left ?? 0,
        right: (cam as THREE.OrthographicCamera).right ?? 0,
        top: (cam as THREE.OrthographicCamera).top ?? 0,
        bottom: (cam as THREE.OrthographicCamera).bottom ?? 0,
        near: cam.near,
        far: cam.far,
      };
    }else{
      this.diagnostics.cameraBounds = null;
    }
  }

  dispose(){
    this.detachProxies();
    for(let i = 0; i < this.slots.length; i++){
      const slot = this.slots[i];
      slot.spot.shadow.map?.dispose();
      slot.directional.shadow.map?.dispose();
    }
    this.slots.length = 0;
    this.lightManager = undefined;
    this.scene = undefined;
  }
}
