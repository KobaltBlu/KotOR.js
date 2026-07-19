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
  /** Retail fade factor 0–1 (ControlLightsFade). */
  fadeFactor: number = 1;
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

  /** Effective RGB after fade × multiplier (ControlLightsFade → SetLightGL). */
  getEffectiveColor(out: THREE.Color = new THREE.Color()): THREE.Color {
    const scale = this.fadeFactor * this.getIntensity();
    return out.copy(this.color).multiplyScalar(scale);
  }

  /** Multiplier × color only (GetNearestLights → SetLightGL; no fade). */
  getIntensityColor(out: THREE.Color = new THREE.Color()): THREE.Color {
    return out.copy(this.color).multiplyScalar(this.getIntensity());
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
