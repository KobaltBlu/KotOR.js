import * as THREE from 'three';

import type { LightManager } from '@/managers/LightManager';
import type { OdysseyLight3D } from '@/three/odyssey';
import { GameState } from '@/GameState';
import {
  retailShadowEffectiveRadius,
  retailShadowLightPosition,
  retailShadowProjectionStrength,
  retailStencilShadowOpacity,
} from '@/utility/retailLighting';
import {
  aimShadowProxyAtFocus,
  buildAngledSpotShadowCameraParams,
  buildOrthoShadowCameraParams,
  configureSpotShadowProxyForFloorContact,
  copyVec3ToScratch,
  isDistantShadowLightRadius,
  ODYSSEY_SHADOW_MAP_LIGHT_BIAS,
  ODYSSEY_SHADOW_MIN_HALF_EXTENT,
  snapOrthographicShadowCameraToTexels,
} from '@/utility/odysseyShadowMap';

export type OdysseyPrimaryShadowLightType = 'spot' | 'directional';

export interface IOdysseyShadowDiagnostics {
  activeLightUuid: string | null;
  lightType: OdysseyPrimaryShadowLightType | null;
  mapResolution: number;
  updateReason: string;
  renderTimeMs: number;
  casterDrawCount: number;
  cameraBounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    near: number;
    far: number;
  } | null;
}

const DEFAULT_MAP_RES_SOFT = 1024;
const DEFAULT_MAP_RES_HARD = 512;
const SHADOW_MAP_NORMAL_BIAS = 0.02;

/**
 * Primary retail-selected shadow map — one proxy Three.js light generates depth
 * for skinned/rigid casters; OdysseyShader samples it with PCF.
 */
export class OdysseyShadowManager {
  private lightManager: LightManager | undefined;
  private scene: THREE.Scene | THREE.Object3D | undefined;

  activeLightCount = 0;
  frameEpoch = 0;

  /** Active Odyssey light driving the primary map (if any). */
  activeLight: OdysseyLight3D | undefined;
  activeLightUuid: string | null = null;
  activeLightType: OdysseyPrimaryShadowLightType | null = null;

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
    lightType: null,
    mapResolution: DEFAULT_MAP_RES_SOFT,
    updateReason: 'none',
    renderTimeMs: 0,
    casterDrawCount: 0,
    cameraBounds: null,
  };

  private spotProxy: THREE.SpotLight | undefined;
  private directionalProxy: THREE.DirectionalLight | undefined;
  private retainedLightUuid: string | null = null;

  private _scratchLights: OdysseyLight3D[] = [];
  private _lastStateHash = 0;
  private _needsShadowMapRender = false;
  private _focus = new THREE.Vector3();
  private _lastMatrixElements = new Float32Array(16);

  init(lightManager: LightManager, scene?: THREE.Scene | THREE.Object3D){
    this.lightManager = lightManager;
    if(scene){
      this.setScene(scene);
    }
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
    this.setMapResolution(
      softShadowsEnabled ? DEFAULT_MAP_RES_SOFT : DEFAULT_MAP_RES_HARD,
      softShadowsEnabled
    );
  }

  private ensureSpotProxy(): THREE.SpotLight {
    if(!this.spotProxy){
      const light = new THREE.SpotLight(0xffffff, 0);
      light.name = 'OdysseyPrimarySpotShadow';
      light.castShadow = true;
      light.frustumCulled = false;
      this.spotProxy = light;
    }
    return this.spotProxy;
  }

  private ensureDirectionalProxy(): THREE.DirectionalLight {
    if(!this.directionalProxy){
      const light = new THREE.DirectionalLight(0xffffff, 0);
      light.name = 'OdysseyPrimaryDirectionalShadow';
      light.castShadow = true;
      light.frustumCulled = false;
      this.directionalProxy = light;
    }
    return this.directionalProxy;
  }

  private configureProxyMapSize(size: number){
    for(const proxy of [this.spotProxy, this.directionalProxy]){
      if(!proxy){ continue; }
      proxy.shadow.mapSize.set(size, size);
      proxy.shadow.needsUpdate = true;
    }
  }

  private attachProxies(){
    if(!this.scene){ return; }
    for(const proxy of [this.spotProxy, this.directionalProxy]){
      if(!proxy){ continue; }
      if(!proxy.parent){
        this.scene.add(proxy);
      }
      if(!proxy.target.parent){
        this.scene.add(proxy.target);
      }
    }
  }

  private detachProxies(){
    for(const proxy of [this.spotProxy, this.directionalProxy]){
      if(!proxy){ continue; }
      proxy.target.removeFromParent();
      proxy.removeFromParent();
      proxy.visible = false;
      proxy.castShadow = false;
    }
  }

  /** Shadow camera used for the active proxy (for debug overlays). */
  getShadowCamera(): THREE.Camera | null {
    const proxy = this.getActiveProxy();
    return proxy?.shadow?.camera ?? null;
  }

  private getActiveProxy(): THREE.SpotLight | THREE.DirectionalLight | undefined {
    if(this.activeLightType === 'spot'){ return this.spotProxy; }
    if(this.activeLightType === 'directional'){ return this.directionalProxy; }
    return undefined;
  }

  /** Proxy shadow map texture after renderShadowMap(). */
  getShadowMapTexture(): THREE.Texture | null {
    const proxy = this.getActiveProxy();
    const target = proxy?.shadow?.map ?? proxy?.shadow?.mapPass;
    return target?.texture ?? null;
  }

  /** World → shadow clip matrix from Three after shadow pass. */
  getShadowMatrix(out = new THREE.Matrix4()): THREE.Matrix4 {
    const proxy = this.getActiveProxy();
    if(proxy?.shadow?.matrix){
      return out.copy(proxy.shadow.matrix);
    }
    return out.identity();
  }

  private selectPrimaryLight(): OdysseyLight3D | undefined {
    if(!this.lightManager){ return undefined; }

    const combined = this._scratchLights;
    combined.length = 0;

    const staticLight = this.lightManager.staticMeshShadowLights[0];
    if(GameState.areaShadowsEnabled){
      if(staticLight){
        combined.push(staticLight);
      }else if(this.lightManager.distantShadowLight){
        combined.push(this.lightManager.distantShadowLight);
      }
    }else if(staticLight){
      combined.push(staticLight);
    }

    if(!combined.length){
      const shadowLights = this.lightManager.shadowLights;
      let best: OdysseyLight3D | undefined;
      let bestStrength = -1;
      let bestDistSq = Infinity;
      const focus = this._focus;
      for(let i = 0; i < shadowLights.length; i++){
        const light = shadowLights[i];
        const strength = retailShadowProjectionStrength(
          GameState.shadowAlpha,
          light.shadowFadeFactor || 0
        );
        const dx = light.worldPosition.x - focus.x;
        const dy = light.worldPosition.y - focus.y;
        const dz = light.worldPosition.z - focus.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if(
          strength > bestStrength ||
          (strength === bestStrength && distSq < bestDistSq)
        ){
          bestStrength = strength;
          bestDistSq = distSq;
          best = light;
        }
      }
      if(best){
        combined.push(best);
      }
    }

    const candidate = combined[0];
    if(!candidate){
      this.retainedLightUuid = null;
      return undefined;
    }

    if(this.retainedLightUuid && candidate.uuid !== this.retainedLightUuid){
      const retained = combined.find((entry) => entry.uuid === this.retainedLightUuid);
      if(retained){
        const fade = retailShadowProjectionStrength(
          GameState.shadowAlpha,
          retained.shadowFadeFactor || 0
        );
        if(fade > 0){
          return retained;
        }
      }
    }

    this.retainedLightUuid = candidate.uuid;
    return candidate;
  }

  private computeStateHash(
    light: OdysseyLight3D,
    strength: number,
    lp: { x: number; y: number; z: number },
    influenceR: number,
    focus: THREE.Vector3
  ): number {
    let h = 0;
    h = Math.imul(h ^ light.uuid.charCodeAt(0), 16777619);
    h = Math.imul(h ^ Math.round(strength * 10000), 16777619);
    h = Math.imul(h ^ Math.round(lp.x * 1000), 16777619);
    h = Math.imul(h ^ Math.round(lp.y * 1000), 16777619);
    h = Math.imul(h ^ Math.round(lp.z * 1000), 16777619);
    h = Math.imul(h ^ Math.round(influenceR * 1000), 16777619);
    h = Math.imul(h ^ Math.round(focus.x * 1000), 16777619);
    h = Math.imul(h ^ Math.round(focus.y * 1000), 16777619);
    h = Math.imul(h ^ Math.round(focus.z * 1000), 16777619);
    h = Math.imul(h ^ this.mapResolution, 16777619);
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

    const strengthBase = GameState.shadowAlpha;
    if(!(strengthBase > 0)){
      this.deactivateProxies('shadow-alpha-zero');
      return;
    }

    this.attachProxies();

    if(focus){
      this._focus.copy(focus);
    }else{
      this._focus.copy(this.lightManager.focusPosition);
    }

    const light = this.selectPrimaryLight();
    if(!light){
      this.deactivateProxies('no-primary-light');
      return;
    }

    const strength = retailShadowProjectionStrength(strengthBase, light.shadowFadeFactor || 0);
    if(!(strength > 0)){
      this.deactivateProxies('fade-zero');
      return;
    }

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

    const distant = isDistantShadowLightRadius(radius);
    const nextType: OdysseyPrimaryShadowLightType = distant ? 'directional' : 'spot';
    const prevLightType = this.activeLightType;
    const stateHash = this.computeStateHash(light, strength, lp, influenceR, this._focus);
    const typeChanged = prevLightType !== null && prevLightType !== nextType;
    const hashChanged = stateHash !== this._lastStateHash;

    if(hashChanged || typeChanged){
      this._lastStateHash = stateHash;
      this.frameEpoch++;
      this._needsShadowMapRender = true;
      this.lastUpdateReason = typeChanged ? 'light-type-change' : 'state-change';
    }else{
      this.lastUpdateReason = 'unchanged';
    }

    this.activeLight = light;
    this.activeLightUuid = light.uuid;
    this.activeLightType = nextType;
    this.activeLightCount = 1;
    this.shadowStrength = strength;
    this.influenceRadius = influenceR;

    this.syncProxyLight(nextType, lp, influenceR, radius);

    // Match the depth-pass proxy (elevated source XY) so lightDir and influence
    // cull agree with the map that was rendered.
    const proxy = this.getActiveProxy();
    if(proxy){
      this.lightWorld.copy(proxy.position);
    }else{
      this.lightWorld.set(lp.x, lp.y, lp.z);
    }

    this.refreshDiagnostics();
  }

  private deactivateProxies(reason: string){
    if(this._lastStateHash !== 0){
      this._lastStateHash = 0;
      this.frameEpoch++;
    }
    this.detachProxies();
    this._needsShadowMapRender = false;
    this.lastUpdateReason = reason;
    this.refreshDiagnostics();
  }

  private syncProxyLight(
    type: OdysseyPrimaryShadowLightType,
    lp: { x: number; y: number; z: number },
    influenceR: number,
    radius: number
  ){
    const sourceLight = copyVec3ToScratch(lp.x, lp.y, lp.z);
    const spot = this.ensureSpotProxy();
    const dir = this.ensureDirectionalProxy();

    spot.visible = type === 'spot';
    spot.castShadow = type === 'spot';
    dir.visible = type === 'directional';
    dir.castShadow = type === 'directional';

    const active = type === 'spot' ? spot : dir;
    active.shadow.bias = ODYSSEY_SHADOW_MAP_LIGHT_BIAS;
    active.shadow.normalBias = SHADOW_MAP_NORMAL_BIAS;
    this.configureProxyMapSize(this.mapResolution);

    if(type === 'spot'){
      configureSpotShadowProxyForFloorContact(sourceLight, this._focus, influenceR, spot);
      const coverage = Math.min(influenceR, ODYSSEY_SHADOW_MIN_HALF_EXTENT * 1.5);
      const spotParams = buildAngledSpotShadowCameraParams(
        spot.position,
        this._focus,
        Math.max(coverage, ODYSSEY_SHADOW_MIN_HALF_EXTENT)
      );
      const halfAngleRad = THREE.MathUtils.degToRad(Math.min(spotParams.fovDeg * 0.5, 89));
      spot.angle = halfAngleRad;
      spot.penumbra = this.softShadowMaps ? 0.25 : 0;
      spot.distance = spotParams.far;
      spot.shadow.camera.fov = spotParams.fovDeg;
      spot.shadow.camera.near = spotParams.near;
      spot.shadow.camera.far = spotParams.far;
      spot.shadow.camera.updateProjectionMatrix();
    }else{
      const ortho = buildOrthoShadowCameraParams(influenceR);
      const cam = dir.shadow.camera as THREE.OrthographicCamera;
      cam.left = -ortho.halfExtent;
      cam.right = ortho.halfExtent;
      cam.top = ortho.halfExtent;
      cam.bottom = -ortho.halfExtent;
      cam.near = ortho.near;
      cam.far = ortho.far;
      aimShadowProxyAtFocus(sourceLight, this._focus, dir);
      snapOrthographicShadowCameraToTexels(cam, this._focus, this.mapResolution);
      cam.updateProjectionMatrix();
    }

    void radius;
    this._needsShadowMapRender = true;
  }

  /**
   * Mark the primary shadow map dirty for the next `renderer.render()` call.
   *
   * Three r149 must run WebGLShadowMap inside WebGLRenderer.render() so
   * `currentRenderState` exists; calling shadowMap.render() directly crashes
   * with "Cannot read properties of null (reading 'state')".
   */
  markShadowMapForRender(renderer: THREE.WebGLRenderer): boolean {
    const proxy = this.getActiveProxy();
    if(!proxy || !this.activeLightCount || !proxy.castShadow){
      return false;
    }

    proxy.shadow.needsUpdate = true;
    if(!proxy.shadow.map){
      this.configureProxyMapSize(this.mapResolution);
    }

    // Consumed by the next renderer.render() (depth prepass or color pass).
    renderer.shadowMap.needsUpdate = true;
    this.lastUpdateReason = 'pending-render';
    this.refreshDiagnostics();
    return true;
  }

  /** @deprecated Use markShadowMapForRender — kept for call-site compatibility. */
  renderShadowMap(
    renderer: THREE.WebGLRenderer,
    _scene?: THREE.Scene | THREE.Object3D,
    _camera?: THREE.Camera
  ): boolean {
    return this.markShadowMapForRender(renderer);
  }

  /** Call after the frame's shadow pass to refresh matrix epoch / diagnostics. */
  noteShadowMapRendered(): void {
    const proxy = this.getActiveProxy();
    if(!proxy?.shadow?.map){
      return;
    }

    const matrix = proxy.shadow.matrix.elements;
    let matrixChanged = false;
    for(let i = 0; i < 16; i++){
      if(this._lastMatrixElements[i] !== matrix[i]){
        matrixChanged = true;
        break;
      }
    }
    if(matrixChanged){
      this._lastMatrixElements.set(matrix);
      this.frameEpoch++;
    }

    this._needsShadowMapRender = false;
    this.lastUpdateReason = 'render';
    this.refreshDiagnostics();
  }

  /** Animated/skinned or attached weapon casters — refresh map every frame. */
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
    const proxy = this.getActiveProxy();
    const cam = proxy?.shadow?.camera;
    this.diagnostics.activeLightUuid = this.activeLightUuid;
    this.diagnostics.lightType = this.activeLightType;
    this.diagnostics.mapResolution = this.mapResolution;
    this.diagnostics.updateReason = this.lastUpdateReason;
    this.diagnostics.renderTimeMs = this.lastRenderTimeMs;
    this.diagnostics.casterDrawCount = this.lastCasterDrawCount;
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
    this.spotProxy?.shadow?.map?.dispose();
    this.directionalProxy?.shadow?.map?.dispose();
    this.spotProxy = undefined;
    this.directionalProxy = undefined;
    this.scene = undefined;
    this.lightManager = undefined;
  }

  /** Exposed for tests — strength without fade factor. */
  static shadowStrengthForLight(shadowAlpha: number, shadowFadeFactor: number): number {
    return retailShadowProjectionStrength(shadowAlpha, shadowFadeFactor);
  }

  /** Exposed for tests. */
  static baseShadowOpacity(shadowAlpha: number): number {
    return retailStencilShadowOpacity(shadowAlpha);
  }
}
