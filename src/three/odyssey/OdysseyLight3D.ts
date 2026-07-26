import { OdysseyObject3D } from "@/three/odyssey/OdysseyObject3D";
import * as THREE from "three";
import type { OdysseyModelNodeLight } from "@/odyssey";

/**
 * OdysseyLight3D class.
 * 
 * THREE.js representation of an OdysseyLight
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyLight3D.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyLight3D extends OdysseyObject3D {

  worldPosition: THREE.Vector3 = new THREE.Vector3();
  sphere: THREE.Sphere = new THREE.Sphere();
  isAnimated: boolean = false;
  parentUUID: string;
  /** Runtime PartLight.priority (may be cleared independently of MDL). */
  priority: number = 0;
  /** Authored MDL lightpriority; lightcmp fallback when priority is 0. */
  authoredPriority: number = 0;

  isAmbient: boolean = false;
  isDynamic: boolean = false;
  affectDynamic: boolean = false;
  /**
   * Retail PartLight n_dynamic_type (MDL dynamic flag). lightcmp prefers 1 > 2 > 0.
   * Separate from affectDynamic.
   */
  dynamicType: number = 0;
  isFading: number = 0;

  genFlare: boolean = false;

  intensity: number = 0;
  maxIntensity: number = 1;
  /** Retail fade factor 0–1 (ControlLightsFade field10_0x78). */
  fadeFactor: number = 1;
  /**
   * Retail secondary fade 0–1 (ControlLightsFade field11_0x7c). Advanced only
   * while the light is in the static-geometry pool (EnableLightsDynamicOnly).
   */
  dynamicOnlyFadeFactor: number = 0;
  /** Retail shadow fade 0–1 (GetShadowLights field29_0x90). */
  shadowFadeFactor: number = 0;

  color: THREE.Color = new THREE.Color(1, 1, 1);
  multiplier: number = 0;
  radius: number = 0;
  shadowRadius: number = 0;
  verticalDisplacement: number = 0;

  cameraDistance: number = 0;
  /** PrioritizeLights score: horizontalDist / radius. */
  illuminationScore: number = Number.POSITIVE_INFINITY;
  /**
   * Monotonic registration ordinal assigned by LightManager.addLight.
   * Used as the lightcmp tie-break (retail uses PartLight pointer order).
   */
  registrationOrder: number = -1;
  /**
   * Scratch sort key filled by LightManager before lightcmp sorts.
   * Reused across frames so compare callbacks do not allocate.
   */
  sortKey: {
    priority: number;
    dynamicRank: number;
    illuminationScore: number;
    colorIsBlack: boolean;
    registrationOrder: number;
    uuid: string;
  } = {
    priority: 0,
    dynamicRank: 0,
    illuminationScore: 0,
    colorIsBlack: false,
    registrationOrder: -1,
    uuid: '',
  };

  constructor(node: OdysseyModelNodeLight){
    super(node);
    this.type = 'OdysseyLight';
  }

  /** Authored light multiplier (retail PartLight field15_0x8c). */
  getIntensity(){
    return this.multiplier;
  }

  getRadius(){
    return this.radius;
  }

  getShadowRadius(){
    return this.shadowRadius > 0 ? this.shadowRadius : this.radius;
  }

  /**
   * VP-aligned room/global RGB: fade × color.
   * SetUpVertexProgramLightShaderConstants @ 004a50d0 (param_2 == 0) never
   * multiplies PartLight.multiplier (field15_0x8c). FFP ControlLightsFade →
   * SetLightGL does fade × color × multiplier; Odyssey GLSL follows the VP path.
   */
  getEffectiveColor(out: THREE.Color = new THREE.Color()): THREE.Color {
    return out.copy(this.color).multiplyScalar(this.fadeFactor);
  }

  /**
   * VP-aligned nearest/gob RGB: authored color only (no fade, no multiplier).
   * Used when packing GetNearestLights results into Odyssey shader uniforms.
   * FFP GetNearestLights → SetLightGL uses multiplier × color; VP upload does not.
   */
  getIntensityColor(out: THREE.Color = new THREE.Color()): THREE.Color {
    return out.copy(this.color);
  }

  /**
   * VP-aligned static-geometry pool RGB: secondary fade × color
   * (SetUpVertexProgramLightShaderConstants with param_2 != 0 uses fade 1 and
   * still omits multiplier; we keep the secondary fade channel from
   * EnableLightsDynamicOnly / ControlLightsFade param_4 = 1).
   */
  getDynamicOnlyColor(out: THREE.Color = new THREE.Color()): THREE.Color {
    return out.copy(this.color).multiplyScalar(this.dynamicOnlyFadeFactor);
  }

  isColorBlack(): boolean {
    return this.color.r === 0 && this.color.g === 0 && this.color.b === 0;
  }

  isOnScreen( frustum: THREE.Frustum ){
    if(!frustum) return true;

    if(!this.odysseyModel.visible)
      return false;

    this.sphere.center.copy(this.worldPosition);
    this.sphere.radius = this.getRadius();
    return frustum.intersectsSphere(this.sphere);
  }

}
