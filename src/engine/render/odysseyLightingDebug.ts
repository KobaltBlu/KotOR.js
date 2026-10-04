/**
 * Mutable runtime lighting / shadow knobs for cheat-console experimentation.
 * Defaults match the production constants in OdysseyShadow / OdysseyShadowManager.
 * (Numeric literals are duplicated here to avoid a circular import with OdysseyShadow.)
 */

import {
  ODYSSEY_SHADOW_MAP_DEPTH_BIAS,
  ODYSSEY_SHADOW_MAP_LIGHT_BIAS,
} from '@engine/render/odysseyShadowMap';
import { ODYSSEY_SHADOW_MIN_VERTEX_COLOR } from '@engine/render/odysseyLighting';

export interface IOdysseyLightingDebugValues {
  /** Multiplier on opacity for local lamps. */
  strengthScaleLocal: number;
  /** Multiplier on opacity for area/sun lights. */
  strengthScaleDistant: number;
  /** Soft ON: local UV tap spacing (texels). */
  softTexelSpreadLocal: number;
  /** Soft ON: distant UV tap spacing (texels). */
  softTexelSpreadDistant: number;
  /** Soft ON: local depth compare half-width. */
  softDepthWidthLocal: number;
  /** Soft ON: distant depth compare half-width. */
  softDepthWidthDistant: number;
  /** Hard/soft radial fade start fraction of influence. */
  influenceFadeStart: number;
  /** Soft mode radial fade start fraction. */
  influenceFadeStartSoft: number;
  /** Hard map UV border fade width. */
  mapEdgeFade: number;
  /** Soft map UV border fade width. */
  mapEdgeFadeSoft: number;
  /** Floor-receiver bias scale under lightmaps. */
  floorBiasScale: number;
  /** Min worldNormal.z for floor bias path. */
  contactNormalZ: number;
  /** Packed NDC constant bias (shader compare). */
  constantBias: number;
  /** Slope-scale bias coefficient. */
  slopeBias: number;
  /** Three.js LightShadow.bias for depth pass. */
  lightBias: number;
  /** ProjectDynamicShadow darkness floor (0.25). */
  minVertexColor: number;
  /** Soft sticky: challenger hold time (seconds). */
  softStickyHoldSec: number;
  /** Soft sticky: score margin to start hold. */
  softStickyScoreMargin: number;
  /** Soft sticky: score margin for instant swap. */
  softStickyInstantMargin: number;
}

export type OdysseyLightingDebugKey = keyof IOdysseyLightingDebugValues;

export const ODYSSEY_LIGHTING_DEBUG_DEFAULTS: Readonly<IOdysseyLightingDebugValues> = Object.freeze({
  strengthScaleLocal: 0.50,
  strengthScaleDistant: 1.35,
  softTexelSpreadLocal: 3.0,
  softTexelSpreadDistant: 0.65,
  softDepthWidthLocal: 0.012,
  softDepthWidthDistant: 0.003,
  influenceFadeStart: 0.65,
  influenceFadeStartSoft: 0.45,
  mapEdgeFade: 0.05,
  mapEdgeFadeSoft: 0.12,
  floorBiasScale: 0.15,
  contactNormalZ: 0.5,
  constantBias: ODYSSEY_SHADOW_MAP_DEPTH_BIAS,
  slopeBias: 0.001,
  lightBias: ODYSSEY_SHADOW_MAP_LIGHT_BIAS,
  minVertexColor: ODYSSEY_SHADOW_MIN_VERTEX_COLOR,
  softStickyHoldSec: 0.3,
  softStickyScoreMargin: 0.08,
  softStickyInstantMargin: 0.25,
});

/** Keys shown in the cheat console Lighting panel (stable order). */
export const ODYSSEY_LIGHTING_DEBUG_KEYS: readonly OdysseyLightingDebugKey[] = Object.freeze([
  'strengthScaleLocal',
  'strengthScaleDistant',
  'softTexelSpreadLocal',
  'softTexelSpreadDistant',
  'softDepthWidthLocal',
  'softDepthWidthDistant',
  'influenceFadeStart',
  'influenceFadeStartSoft',
  'mapEdgeFade',
  'mapEdgeFadeSoft',
  'floorBiasScale',
  'contactNormalZ',
  'constantBias',
  'slopeBias',
  'lightBias',
  'minVertexColor',
  'softStickyHoldSec',
  'softStickyScoreMargin',
  'softStickyInstantMargin',
]);

class OdysseyLightingDebugClass {
  readonly values: IOdysseyLightingDebugValues = { ...ODYSSEY_LIGHTING_DEBUG_DEFAULTS };

  /** Bumped on every mutation — binder uses this to invalidate early-outs. */
  revision = 0;

  get(key: OdysseyLightingDebugKey): number {
    return this.values[key];
  }

  set(key: OdysseyLightingDebugKey, value: number): boolean {
    if(!(key in this.values)){ return false; }
    if(!Number.isFinite(value)){ return false; }
    this.values[key] = value;
    this.revision++;
    return true;
  }

  reset(key?: OdysseyLightingDebugKey): void {
    if(key){
      if(!(key in ODYSSEY_LIGHTING_DEBUG_DEFAULTS)){ return; }
      this.values[key] = ODYSSEY_LIGHTING_DEBUG_DEFAULTS[key];
    }else{
      Object.assign(this.values, ODYSSEY_LIGHTING_DEBUG_DEFAULTS);
    }
    this.revision++;
  }

  /** Snapshot for dump / lightget with no args. */
  dump(): Record<string, number> {
    const out: Record<string, number> = {};
    for(let i = 0; i < ODYSSEY_LIGHTING_DEBUG_KEYS.length; i++){
      const k = ODYSSEY_LIGHTING_DEBUG_KEYS[i];
      out[k] = this.values[k];
    }
    return out;
  }

  isKey(raw: string): raw is OdysseyLightingDebugKey {
    return Object.prototype.hasOwnProperty.call(this.values, raw);
  }

  /**
   * Resolve a key case-insensitively (cheat console lowercases the whole command).
   */
  resolveKey(raw: string | undefined): OdysseyLightingDebugKey | null {
    if(raw == null || raw === ''){ return null; }
    if(this.isKey(raw)){ return raw; }
    const lower = raw.toLowerCase();
    for(let i = 0; i < ODYSSEY_LIGHTING_DEBUG_KEYS.length; i++){
      const k = ODYSSEY_LIGHTING_DEBUG_KEYS[i];
      if(k.toLowerCase() === lower){ return k; }
    }
    return null;
  }
}

/** Process-wide lighting debug knobs (cheat console / live tuning). */
export const OdysseyLightingDebug = new OdysseyLightingDebugClass();
