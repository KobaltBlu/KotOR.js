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
  /** Runtime light node.priority (may be cleared independently of MDL). */
  priority: number = 0;
  /** Authored MDL lightpriority; light sort fallback when priority is 0. */
  authoredPriority: number = 0;

  isAmbient: boolean = false;
  isDynamic: boolean = false;
  affectDynamic: boolean = false;
  /**
   * light node n_dynamic_type (MDL dynamic flag). light sort prefers 1 > 2 > 0.
   * Separate from affectDynamic.
   */
  dynamicType: number = 0;
  isFading: number = 0;

  /**
   * Authored MDL generateflare flag. CollectLightsForGivenRoom /
   * lens flare render do not gate on this — selection uses flarecolorshifts.
   */
  genFlare: boolean = false;
  /** MDL shadow flag — used for shadow light selection mode 2 (distant/static) only. */
  castShadow: boolean = false;

  /** MDL flareradius — distance cull + size/color falloff (not light radius). */
  flareRadius: number = 0;
  flareSizes: number[] = [];
  flarePositions: number[] = [];
  flareColorShifts: THREE.Color[] = [];
  /** Loaded flare textures (parallel to flareTextures resrefs / sizes). */
  flareTextures: (THREE.Texture | null)[] = [];
  /**
   * light node+0x88 occlusion fade 0–1 (lens flare render hit-check).
   * Independent of light fade pass fadeFactor.
   */
  flareOcclusionFade: number = 0;

  intensity: number = 0;
  maxIntensity: number = 1;
  /** fade factor 0–1 (light fade pass). */
  fadeFactor: number = 1;
  /**
   * secondary fade 0–1 (light fade pass). Advanced only
   * while the light is in the static-geometry pool (dynamic-only lights).
   */
  dynamicOnlyFadeFactor: number = 0;
  /** shadow fade 0–1 (shadow light selection). */
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
   * Used as the light sort tie-break (uses light node pointer order).
   */
  registrationOrder: number = -1;
  /**
   * Scratch sort key filled by LightManager before light sort sorts.
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
    (this as any).type = 'OdysseyLight';
  }

  /** Authored light multiplier (light node). */
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
   * SetUpVertexProgramLightShaderConstants (non-dynamic path) never
   * multiplies light node.multiplier. FFP light fade pass →
   * light upload does fade × color × multiplier; Odyssey GLSL follows the VP path.
   */
  getEffectiveColor(out: THREE.Color = new THREE.Color()): THREE.Color {
    return out.copy(this.color).multiplyScalar(this.fadeFactor);
  }

  /**
   * VP-aligned nearest/gob RGB: authored color only (no fade, no multiplier).
   * Used when packing nearest light selection results into Odyssey shader uniforms.
   * FFP nearest light selection → light upload uses multiplier × color; VP upload does not.
   */
  getIntensityColor(out: THREE.Color = new THREE.Color()): THREE.Color {
    return out.copy(this.color);
  }

  /**
   * VP-aligned static-geometry pool RGB: secondary fade × color
   * (SetUpVertexProgramLightShaderConstants with dynamic path uses fade 1 and
   * still omits multiplier; we keep the secondary fade channel from
   * dynamic-only lights / light fade pass dynamic-only = 1).
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
