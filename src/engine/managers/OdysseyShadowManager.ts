import * as THREE from 'three';

import type { LightManager } from '@engine/managers/LightManager';
import { LightManager as LightManagerClass } from '@engine/managers/LightManager';
import type { OdysseyLight3D } from '@engine/render/three/odyssey';
import { RenderPerfStats } from '@engine/render/RenderPerfStats';
import { GameState } from '@engine/runtime/GameState';
import {
  isOdysseyShadowColorVisible,
  odysseyShadowDistantFactor,
  odysseyShadowEffectiveRadius,
  odysseyShadowFadeStep,
  odysseyShadowLightPosition,
  odysseyShadowProjectionStrength,
  odysseySoftShadowLightElevationOk,
  ODYSSEY_MAX_SHADOW_DISTANCE,
} from '@engine/render/odysseyLighting';
import {
  aimShadowProxyAtFocus,
  buildAngledSpotShadowCameraParams,
  buildOrthoShadowCameraParams,
  configureSpotShadowProxyForFloorContact,
  isDistantShadowLightRadius,
  ODYSSEY_SHADOW_MIN_HALF_EXTENT,
  placeDirectionalShadowProxyAlongLight,
} from '@engine/render/odysseyShadowMap';
import { OdysseyLightingDebug } from '@engine/render/odysseyLightingDebug';
import {
  MAX_ODYSSEY_SHADOW_MAPS,
  odysseyShadowAdaptiveStrength,
} from '@engine/render/shaders/chunks/OdysseyShadow';

export type OdysseyPrimaryShadowLightType = 'spot' | 'directional';

export interface IOdysseyShadowSlotState {
  light: OdysseyLight3D | undefined;
  uuid: string | null;
  type: OdysseyPrimaryShadowLightType | null;
  strength: number;
  influenceRadius: number;
  /** 0 = local lamp, 1 = area/sun — drives adaptive PCF / strength. */
  distantFactor: number;
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

// Soft and hard both use 2048 — hard used to drop to 512, which made sun
// ortho maps (~±16 half-extent) only ~11 texels tall per character.
const DEFAULT_MAP_RES_SOFT = 2048;
const DEFAULT_MAP_RES_HARD = 2048;
const SHADOW_MAP_NORMAL_BIAS = 0.005;

/** Soft sticky: challenger must lead by this overhead score for hold duration. */
export const SOFT_SHADOW_STICKY_SCORE_MARGIN = 0.08;
/** Soft sticky: larger lead switches immediately without hold. */
export const SOFT_SHADOW_STICKY_INSTANT_MARGIN = 0.25;
/** Soft sticky: seconds a challenger must lead before swap. */
export const SOFT_SHADOW_STICKY_HOLD_SEC = 0.3;

interface IShadowProxySlot {
  spot: THREE.SpotLight;
  directional: THREE.DirectionalLight;
  state: IOdysseyShadowSlotState;
  lastMatrixElements: Float32Array;
}

/**
 * engine-aligned shadow maps.
 *
 * Soft Shadows ON → steady 1 map (RenderShadows), up to 2 while crossfading.
 * Soft Shadows OFF → steady NumShadowCastingLights, +1 transient for fade.
 * Slots are owned by light UUID so map identity does not teleport on re-rank.
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
  /** True when materials need a scene-wide shadow uniform refresh. */
  private _uniformsRefreshNeeded = false;
  private _focus = new THREE.Vector3();
  /** Slot-0 frustum gizmo parented under LightManager context.group.shadow_lights. */
  private shadowFrustumHelper: THREE.CameraHelper | null = null;
  private _proxyPos = new THREE.Vector3();
  private _scratchSelected: OdysseyLight3D[] = [];
  private _scratchSoftCandidates: OdysseyLight3D[] = [];
  private _scratchToFocus = new THREE.Vector3();
  private _scratchSoftNext: OdysseyLight3D[] = [];

  /** Soft sticky winner UUID (desired set size 1). */
  private _softStickyUuid: string | null = null;
  private _softChallengerUuid: string | null = null;
  private _softChallengerHold = 0;
  /** Soft residency including fade-out (up to 2). */
  private _softResidents: OdysseyLight3D[] = [];

  /** Combined projection opacity with adaptive local/distant scale (tests / diagnostics). */
  static shadowStrengthForLight(
    shadowAlpha: number,
    shadowFadeFactor: number,
    radius = 8
  ): number {
    const base = odysseyShadowProjectionStrength(shadowAlpha, shadowFadeFactor);
    return odysseyShadowAdaptiveStrength(base, odysseyShadowDistantFactor(radius));
  }

  init(lightManager: LightManager, scene?: THREE.Scene | THREE.Object3D){
    this.lightManager = lightManager;
    this.ensureSlots(this.maxShadowMaps);
    if(scene){
      this.setScene(scene);
    }
  }

  /**
   * Steady-state concurrent maps (Soft=1 / hard=NumShadowCastingLights).
   */
  get steadyMaxShadowMaps(): number {
    if(this.softShadowMaps){
      return 1;
    }
    const fromQuality = this.lightManager
      ? LightManagerClass.MAXSHADOWLIGHTS
      : 3;
    // Leave at least one of MAX_ODYSSEY_SHADOW_MAPS for transient crossfade.
    return Math.max(1, Math.min(MAX_ODYSSEY_SHADOW_MAPS - 1, fromQuality | 0));
  }

  /**
   * Pool / residency capacity including one transient crossfade slot.
   * Soft: 2. Hard: steady+1 (capped at MAX_ODYSSEY_SHADOW_MAPS).
   */
  get maxShadowMaps(): number {
    return Math.min(MAX_ODYSSEY_SHADOW_MAPS, this.steadyMaxShadowMaps + 1);
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
    if(this.softShadowMaps !== soft){
      this.resetSoftStickyState();
    }
    this.softShadowMaps = soft;
    this.configureProxyMapSize(this.mapResolution);
    this._needsShadowMapRender = true;
    this._uniformsRefreshNeeded = true;
  }

  useQualityPreset(softShadowsEnabled: boolean){
    const soft = !!softShadowsEnabled;
    const nextRes = soft ? DEFAULT_MAP_RES_SOFT : DEFAULT_MAP_RES_HARD;
    if(this.softShadowMaps !== soft || this.mapResolution !== nextRes){
      this.bumpFrameEpoch();
    }
    this.setMapResolution(nextRes, soft);
  }

  private resetSoftStickyState(){
    this._softStickyUuid = null;
    this._softChallengerUuid = null;
    this._softChallengerHold = 0;
    this._softResidents.length = 0;
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
          distantFactor: 0,
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
    const wasActive = slot.state.active;
    slot.spot.visible = false;
    slot.spot.castShadow = false;
    slot.directional.visible = false;
    slot.directional.castShadow = false;
    slot.state.light = undefined;
    slot.state.uuid = null;
    slot.state.type = null;
    slot.state.strength = 0;
    slot.state.influenceRadius = 0;
    slot.state.distantFactor = 0;
    slot.state.lightWorld.set(0, 0, 0);
    slot.state.active = false;
    if(wasActive){
      this._needsShadowMapRender = true;
      this._uniformsRefreshNeeded = true;
    }
  }

  private bumpFrameEpoch(){
    this.frameEpoch++;
    this._uniformsRefreshNeeded = true;
  }

  /** True when shadow maps should be redrawn this frame (tests / diagnostics). */
  get needsShadowMapRender(): boolean {
    return this._needsShadowMapRender;
  }

  /**
   * Returns and clears whether receivers need a scene-wide shadow uniform refresh.
   */
  consumeUniformsRefreshNeeded(): boolean {
    const needed = this._uniformsRefreshNeeded;
    this._uniformsRefreshNeeded = false;
    return needed;
  }

  /** Mark that shadow uniforms must be rebound (epoch / map / gating change). */
  markUniformsRefreshNeeded(){
    this._uniformsRefreshNeeded = true;
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
   * Soft Shadows: sticky elevated light + fade residency (up to 2).
   * Hard: shadow light selection(mode=0) fading set (steady+1), then mode-1/2 fallback.
   */
  private selectShadowLights(delta = 0): OdysseyLight3D[] {
    const out = this._scratchSelected;
    out.length = 0;
    if(!this.lightManager){ return out; }

    if(this.softShadowMaps){
      return this.selectSoftShadowLight(out, delta);
    }

    const max = this.maxShadowMaps;
    const seen = new Set<string>();
    const push = (light: OdysseyLight3D | undefined) => {
      if(!light || out.length >= max || seen.has(light.uuid)){ return; }
      const strength = odysseyShadowProjectionStrength(
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

    if(!out.length){
      push(this.lightManager.staticMeshShadowLights[0]);
    }
    if(!out.length){
      push(this.lightManager.distantShadowLight);
    }

    return out;
  }

  private softElevAngleSq(light: OdysseyLight3D): number {
    const toFocus = this._scratchToFocus;
    const focus = this._focus;
    toFocus.set(
      focus.x - light.worldPosition.x,
      focus.y - light.worldPosition.y,
      focus.z - light.worldPosition.z
    );
    const lenSq = toFocus.lengthSq();
    if(!(lenSq > 1e-8)){ return 0; }
    const dz = toFocus.z;
    return 1 - (dz * dz) / lenSq;
  }

  private softCandidateOk(light: OdysseyLight3D, focusZ: number): boolean {
    if(light.isAmbient){ return false; }
    if(!isOdysseyShadowColorVisible(light.color.r, light.color.g, light.color.b)){
      return false;
    }
    if(light.illuminationScore > 1){ return false; }
    return odysseySoftShadowLightElevationOk(light.worldPosition.z, focusZ);
  }

  /**
   * RenderShadows Soft Shadows path with sticky winner + fade crossfade.
   * Elevation gate, then most-overhead elevated bound light; stick until a
   * challenger leads by margin for hold time (or large instant margin).
   */
  private selectSoftShadowLight(out: OdysseyLight3D[], delta = 0): OdysseyLight3D[] {
    const lm = this.lightManager;
    if(!lm){ return out; }
    if(!(GameState.shadowAlpha > 0)){
      this.resetSoftStickyState();
      return out;
    }

    const focusZ = this._focus.z;
    const candidates = this._scratchSoftCandidates;
    candidates.length = 0;

    const bound = lm.boundLights;
    for(let i = 0; i < bound.length; i++){
      const light = bound[i];
      if(this.softCandidateOk(light, focusZ)){
        candidates.push(light);
      }
    }

    candidates.sort((a, b) => {
      const ea = this.softElevAngleSq(a);
      const eb = this.softElevAngleSq(b);
      if(ea !== eb){ return ea - eb; }
      return lm.sortLights(a, b);
    });

    const best = candidates[0];
    let sticky = this._softStickyUuid
      ? candidates.find((l) => l.uuid === this._softStickyUuid)
      : undefined;

    if(!sticky){
      // Sticky lost eligibility — adopt best immediately (or clear).
      this._softStickyUuid = best?.uuid ?? null;
      this._softChallengerUuid = null;
      this._softChallengerHold = 0;
      sticky = best;
    }else if(best && best.uuid !== sticky.uuid){
      const stickyScore = this.softElevAngleSq(sticky);
      const bestScore = this.softElevAngleSq(best);
      const lead = stickyScore - bestScore; // positive when best is more overhead
      const stickyInstant = OdysseyLightingDebug.values.softStickyInstantMargin;
      const stickyMargin = OdysseyLightingDebug.values.softStickyScoreMargin;
      const stickyHold = OdysseyLightingDebug.values.softStickyHoldSec;
      if(lead >= stickyInstant){
        this._softStickyUuid = best.uuid;
        this._softChallengerUuid = null;
        this._softChallengerHold = 0;
        sticky = best;
      }else if(lead >= stickyMargin){
        if(this._softChallengerUuid === best.uuid){
          this._softChallengerHold += Math.max(0, delta);
        }else{
          this._softChallengerUuid = best.uuid;
          this._softChallengerHold = Math.max(0, delta);
        }
        if(this._softChallengerHold >= stickyHold){
          this._softStickyUuid = best.uuid;
          this._softChallengerUuid = null;
          this._softChallengerHold = 0;
          sticky = best;
        }
      }else{
        this._softChallengerUuid = null;
        this._softChallengerHold = 0;
      }
    }else{
      this._softChallengerUuid = null;
      this._softChallengerHold = 0;
    }

    const desired: OdysseyLight3D[] = sticky ? [sticky] : [];
    const desiredSet = new Set<string>();
    for(let i = 0; i < desired.length; i++){
      desiredSet.add(desired[i].uuid);
    }

    const next = this._scratchSoftNext;
    next.length = 0;
    for(let i = 0; i < this._softResidents.length; i++){
      const light = this._softResidents[i];
      if(desiredSet.has(light.uuid)){ continue; }
      light.shadowFadeFactor = odysseyShadowFadeStep(light.shadowFadeFactor || 0, 0, delta);
      if(light.shadowFadeFactor > 0){ next.push(light); }
    }
    for(let i = 0; i < desired.length; i++){
      const light = desired[i];
      light.shadowFadeFactor = odysseyShadowFadeStep(light.shadowFadeFactor || 0, 1, delta);
      next.push(light);
    }

    const transitionCap = this.maxShadowMaps; // soft: 2
    if(next.length > transitionCap){
      const fadingCount = next.length - desired.length;
      const keepFading = Math.max(0, transitionCap - desired.length);
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
        next.length = transitionCap;
      }
    }

    this._softResidents = next.slice();
    for(let i = 0; i < next.length; i++){
      const light = next[i];
      const strength = odysseyShadowProjectionStrength(
        GameState.shadowAlpha,
        light.shadowFadeFactor || 0
      );
      if(strength > 0){
        out.push(light);
      }
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
      const strength = odysseyShadowProjectionStrength(
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

  /**
   * Assign / refresh proxy slots by light UUID. Never rebinds an occupied slot
   * to a different UUID; packs active slots contiguous for the shader.
   */
  private syncSlotsByUuid(lights: OdysseyLight3D[]){
    const max = this.maxShadowMaps;
    this.ensureSlots(max);

    const desiredByUuid = new Map<string, OdysseyLight3D>();
    for(let i = 0; i < lights.length; i++){
      desiredByUuid.set(lights[i].uuid, lights[i]);
    }

    const stillOwned = new Set<string>();
    for(let i = 0; i < this.slots.length; i++){
      const slot = this.slots[i];
      const uuid = slot.state.uuid;
      if(!uuid){ continue; }
      const light = desiredByUuid.get(uuid);
      if(light){
        this.syncSlot(i, light);
        stillOwned.add(uuid);
      }else{
        this.clearSlot(i);
      }
    }

    for(let i = 0; i < lights.length; i++){
      const light = lights[i];
      if(stillOwned.has(light.uuid)){ continue; }
      let free = -1;
      for(let s = 0; s < this.slots.length && s < max; s++){
        if(!this.slots[s].state.uuid){
          free = s;
          break;
        }
      }
      if(free < 0){ break; }
      this.syncSlot(free, light);
      stillOwned.add(light.uuid);
    }

    // Pack active slots to the front so shader lightCount thresholds work.
    const active: IShadowProxySlot[] = [];
    const inactive: IShadowProxySlot[] = [];
    for(let i = 0; i < this.slots.length; i++){
      if(this.slots[i].state.active){
        active.push(this.slots[i]);
      }else{
        inactive.push(this.slots[i]);
      }
    }
    // Preserve desired light order among actives for stable primary diagnostics.
    active.sort((a, b) => {
      const ai = lights.findIndex((l) => l.uuid === a.state.uuid);
      const bi = lights.findIndex((l) => l.uuid === b.state.uuid);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    });
    this.slots.length = 0;
    for(let i = 0; i < active.length; i++){ this.slots.push(active[i]); }
    for(let i = 0; i < inactive.length; i++){ this.slots.push(inactive[i]); }

    this.activeLightCount = active.length;
  }

  update(_camera?: THREE.Camera, focus?: THREE.Vector3, delta = 0){
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

    if(this.lightManager){
      const soft = !!this.lightManager.softShadowsEnabled;
      if(soft !== this.softShadowMaps){
        this.useQualityPreset(soft);
      }
    }

    const lights = this.selectShadowLights(delta);
    if(!lights.length){
      this.deactivateProxies('no-primary-light');
      return;
    }

    const stateHash = this.computeStateHash(lights);
    const hashChanged = stateHash !== this._lastStateHash;
    if(hashChanged){
      this._lastStateHash = stateHash;
      this.bumpFrameEpoch();
      this._needsShadowMapRender = true;
      this.lastUpdateReason = 'state-change';
    }else{
      this.lastUpdateReason = 'unchanged';
    }

    this.syncSlotsByUuid(lights);

    this.activeLight = lights[0];
    this.activeLightUuid = lights[0].uuid;
    this.activeLightType = this.slots[0]?.state.type ?? null;
    this.shadowStrength = this.slots[0]?.state.strength ?? 0;
    this.influenceRadius = this.slots[0]?.state.influenceRadius ?? 0;
    if(this.slots[0]){
      this.lightWorld.copy(this.slots[0].state.lightWorld);
    }

    this.dirtyIfNearbyAnimatedCasters();

    this.refreshDiagnostics();
    this.updateShadowFrustumHelper();
  }

  private deactivateProxies(reason: string){
    if(this._lastStateHash !== 0){
      this._lastStateHash = 0;
      this.bumpFrameEpoch();
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
    this.resetSoftStickyState();
    this.refreshDiagnostics();
    this.updateShadowFrustumHelper();
  }

  /**
   * Sync CameraHelper for the active shadow projector into the game
   * `shadow_lights` debug group (when that layer is visible).
   */
  private updateShadowFrustumHelper(){
    const group = this.lightManager?.context?.group?.shadow_lights as THREE.Group | undefined;
    const cam = this.getShadowCamera();
    const show = !!group?.visible && !!cam && this.activeLightCount > 0;

    if(!show){
      if(this.shadowFrustumHelper){
        this.shadowFrustumHelper.visible = false;
      }
      return;
    }

    if(!this.shadowFrustumHelper || this.shadowFrustumHelper.camera !== cam){
      if(this.shadowFrustumHelper){
        this.shadowFrustumHelper.removeFromParent();
        this.shadowFrustumHelper.dispose();
        this.shadowFrustumHelper = null;
      }
      this.shadowFrustumHelper = new THREE.CameraHelper(cam!);
      this.shadowFrustumHelper.name = 'OdysseyShadowFrustumHelper';
      group!.add(this.shadowFrustumHelper);
    }else if(this.shadowFrustumHelper.parent !== group){
      group!.add(this.shadowFrustumHelper);
    }

    this.shadowFrustumHelper.visible = true;
    this.shadowFrustumHelper.update();
  }

  private syncSlot(index: number, light: OdysseyLight3D){
    const slot = this.slots[index];
    const radius = light.getRadius();
    const influenceR = odysseyShadowEffectiveRadius(radius, light.shadowRadius || 0);
    const distantFactor = odysseyShadowDistantFactor(influenceR);
    const baseStrength = odysseyShadowProjectionStrength(
      GameState.shadowAlpha,
      light.shadowFadeFactor || 0
    );
    const strength = odysseyShadowAdaptiveStrength(baseStrength, distantFactor);
    const lp = odysseyShadowLightPosition({
      x: light.worldPosition.x,
      y: light.worldPosition.y,
      z: light.worldPosition.z,
      radius,
      shadowRadius: light.shadowRadius || 0,
      verticalDisplacement: light.verticalDisplacement || 0,
    });
    const type: OdysseyPrimaryShadowLightType = isDistantShadowLightRadius(radius)
      ? 'directional'
      : 'spot';

    const prevUuid = slot.state.uuid;
    const prevType = slot.state.type;
    const prevStrength = slot.state.strength;
    const prevInfluence = slot.state.influenceRadius;
    const prevDistant = slot.state.distantFactor;
    const prevLwX = slot.state.lightWorld.x;
    const prevLwY = slot.state.lightWorld.y;
    const prevLwZ = slot.state.lightWorld.z;
    const prevProxy = prevType === 'spot' ? slot.spot : prevType === 'directional' ? slot.directional : undefined;
    const prevPx = prevProxy?.position.x ?? 0;
    const prevPy = prevProxy?.position.y ?? 0;
    const prevPz = prevProxy?.position.z ?? 0;
    const prevSpotAngle = slot.spot.angle;
    const prevSpotDist = slot.spot.distance;
    const prevSpotFov = slot.spot.shadow.camera.fov;
    const prevSpotNear = slot.spot.shadow.camera.near;
    const prevSpotFar = slot.spot.shadow.camera.far;
    const prevOrtho = slot.directional.shadow.camera as THREE.OrthographicCamera;
    const prevLeft = prevOrtho.left;
    const prevRight = prevOrtho.right;
    const prevNear = prevOrtho.near;
    const prevFar = prevOrtho.far;

    slot.spot.visible = type === 'spot';
    slot.spot.castShadow = type === 'spot';
    slot.directional.visible = type === 'directional';
    slot.directional.castShadow = type === 'directional';

    const active = type === 'spot' ? slot.spot : slot.directional;
    active.shadow.bias = OdysseyLightingDebug.values.lightBias;
    active.shadow.normalBias = SHADOW_MAP_NORMAL_BIAS;
    active.shadow.mapSize.set(this.mapResolution, this.mapResolution);

    this._proxyPos.set(lp.x, lp.y, lp.z);

    if(type === 'spot'){
      configureSpotShadowProxyForFloorContact(this._proxyPos, this._focus, influenceR, slot.spot);
      // Cover the light's influence around focus, clamped to focus-shadow
      // distance — not MIN_HALF*1.5 (~7.5), which made map-edge fade track camera zoom.
      const coverage = Math.min(
        Math.max(influenceR, ODYSSEY_SHADOW_MIN_HALF_EXTENT),
        ODYSSEY_MAX_SHADOW_DISTANCE
      );
      const spotParams = buildAngledSpotShadowCameraParams(
        slot.spot.position,
        this._focus,
        coverage
      );
      const halfAngleRad = THREE.MathUtils.degToRad(Math.min(spotParams.fovDeg * 0.5, 89));
      slot.spot.angle = halfAngleRad;
      slot.spot.penumbra = this.softShadowMaps ? 0.25 : 0;
      slot.spot.distance = spotParams.far;
      slot.spot.shadow.camera.fov = spotParams.fovDeg;
      slot.spot.shadow.camera.near = spotParams.near;
      slot.spot.shadow.camera.far = spotParams.far;
      slot.spot.shadow.camera.updateProjectionMatrix();
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
    }

    // Radial fade must use the authored light, not the focus-proximate map proxy —
    // otherwise XY distance tracks the player/camera focus and feels like zoom fade.
    slot.state.lightWorld.set(lp.x, lp.y, lp.z);

    slot.state.light = light;
    slot.state.uuid = light.uuid;
    slot.state.type = type;
    slot.state.strength = strength;
    slot.state.influenceRadius = influenceR;
    slot.state.distantFactor = distantFactor;
    slot.state.active = true;

    const eps = 1e-4;
    const changed =
      prevUuid !== light.uuid ||
      prevType !== type ||
      Math.abs(prevStrength - strength) > eps ||
      Math.abs(prevInfluence - influenceR) > eps ||
      Math.abs(prevDistant - distantFactor) > eps ||
      Math.abs(prevLwX - lp.x) > eps ||
      Math.abs(prevLwY - lp.y) > eps ||
      Math.abs(prevLwZ - lp.z) > eps ||
      Math.abs(prevPx - active.position.x) > eps ||
      Math.abs(prevPy - active.position.y) > eps ||
      Math.abs(prevPz - active.position.z) > eps ||
      (type === 'spot' && (
        Math.abs(prevSpotAngle - slot.spot.angle) > eps ||
        Math.abs(prevSpotDist - slot.spot.distance) > eps ||
        Math.abs(prevSpotFov - slot.spot.shadow.camera.fov) > eps ||
        Math.abs(prevSpotNear - slot.spot.shadow.camera.near) > eps ||
        Math.abs(prevSpotFar - slot.spot.shadow.camera.far) > eps
      )) ||
      (type === 'directional' && (
        Math.abs(prevLeft - (active.shadow.camera as THREE.OrthographicCamera).left) > eps ||
        Math.abs(prevRight - (active.shadow.camera as THREE.OrthographicCamera).right) > eps ||
        Math.abs(prevNear - (active.shadow.camera as THREE.OrthographicCamera).near) > eps ||
        Math.abs(prevFar - (active.shadow.camera as THREE.OrthographicCamera).far) > eps
      ));

    if(changed){
      this._needsShadowMapRender = true;
      this._uniformsRefreshNeeded = true;
    }
  }

  /**
   * Dirty maps when a visible creature is animating near the shadow focus.
   * Avoids full scene.traverse; equipment casters move with the creature.
   */
  private dirtyIfNearbyAnimatedCasters(){
    if(this._needsShadowMapRender || this.activeLightCount <= 0){ return; }

    let maxR = this.influenceRadius;
    for(let i = 0; i < this.activeLightCount; i++){
      const ir = this.slots[i]?.state.influenceRadius ?? 0;
      if(ir > maxR){ maxR = ir; }
    }
    if(maxR <= 0){ maxR = ODYSSEY_MAX_SHADOW_DISTANCE; }
    const r2 = maxR * maxR;
    const fx = this._focus.x;
    const fy = this._focus.y;
    const fz = this._focus.z;

    const nearAnimated = (obj: {
      position?: THREE.Vector3;
      model?: { visible?: boolean; animateFrame?: boolean; posedThisFrame?: boolean };
    } | undefined): boolean => {
      // Require an actual pose change this frame so held animateFrame poses
      // (paused / unchanged) do not force shadow map rebuilds.
      if(
        !obj?.model?.visible ||
        !obj.model.animateFrame ||
        !obj.model.posedThisFrame ||
        !obj.position
      ){
        return false;
      }
      const dx = obj.position.x - fx;
      const dy = obj.position.y - fy;
      const dz = obj.position.z - fz;
      return (dx * dx + dy * dy + dz * dz) <= r2;
    };

    const party = GameState.PartyManager?.party;
    if(party){
      for(let i = 0; i < party.length; i++){
        if(nearAnimated(party[i])){
          this._needsShadowMapRender = true;
          this.lastUpdateReason = 'animated-caster';
          RenderPerfStats.noteShadowAnimatedCaster();
          return;
        }
      }
    }

    const creatures = GameState.module?.area?.creatures;
    if(creatures){
      for(let i = 0; i < creatures.length; i++){
        if(nearAnimated(creatures[i])){
          this._needsShadowMapRender = true;
          this.lastUpdateReason = 'animated-caster';
          RenderPerfStats.noteShadowAnimatedCaster();
          return;
        }
      }
    }
  }

  /**
   * Mark all active proxy maps dirty for the next `renderer.render` call.
   * No-ops when `_needsShadowMapRender` is false (static light/focus/casters).
   */
  markShadowMapForRender(renderer: THREE.WebGLRenderer): boolean {
    if(!this.activeLightCount || !this._needsShadowMapRender){
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
    this._uniformsRefreshNeeded = true;
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
      this.bumpFrameEpoch();
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
    this.resetSoftStickyState();
  }
}
