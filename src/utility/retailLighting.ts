/**
 * Retail Odyssey lighting math (K1 LightManager / PartLight).
 *
 * Attenuation from SetUpVertexProgramLightShaderConstants @ 004a50d0 /
 * SetLightGL @ 004a2a00:
 *   r = max(radius, 0.1)
 *   quadratic = 4.5 / (r²)
 *   atten = 1 / (1 + quadratic * d²)
 *
 * Sort / fade aligned with lightcmp @ 004a28c0 and ControlLightsFade @ 004a4580.
 */

/** Minimum radius used by SetLightGL @ 004a2a00 when computing quadratic atten. */
export const RETAIL_LIGHT_ATTEN_MIN_RADIUS = 0.1;

/**
 * KotOR.js default TXI envmap combine — master / retail `environmentMapDest != 0`
 * at `RenderEnvironmentMapped` @ 0046ff70 (`GL_ONE_MINUS_DST_ALPHA`, `GL_ONE`):
 *   final = litDiffuse + envColor * (1 - diffuseTexAlpha)
 *
 * Diffuse texture alpha is the mask (before material opacity). Dark cubemaps like
 * CM_Baremetal only contribute sparse highlights; LERP (dest==0) would replace
 * armor albedo with near-black and crush chrome. Water still uses MIX.
 *
 * Sampling uses view-space reflect + DoEnvMapTransform camera rotation
 * (`envMapRotation`), with ENV_WORLDPOS defined for Three envmap/worldpos
 * varyings. Shader edits require a full page reload (materials snapshot GLSL
 * at create; HMR does not recompile live materials).
 */
export function retailEnvmapAdd(
  litDiffuseRgb: [number, number, number],
  envRgb: [number, number, number],
  diffuseTexAlpha: number
): [number, number, number] {
  const a = Math.min(1, Math.max(0, diffuseTexAlpha));
  const inv = 1 - a;
  return [
    litDiffuseRgb[0] + envRgb[0] * inv,
    litDiffuseRgb[1] + envRgb[1] * inv,
    litDiffuseRgb[2] + envRgb[2] * inv,
  ];
}

/**
 * Retail dest==0 multipass albedo (not KotOR.js default — dark cubes crush chrome):
 *   albedo = mix(envColor, diffuseColor, diffuseTexAlpha)
 */
export function retailEnvmapAlbedo(
  envRgb: [number, number, number],
  diffuseRgb: [number, number, number],
  diffuseTexAlpha: number
): [number, number, number] {
  const a = Math.min(1, Math.max(0, diffuseTexAlpha));
  const inv = 1 - a;
  return [
    envRgb[0] * inv + diffuseRgb[0] * a,
    envRgb[1] * inv + diffuseRgb[1] * a,
    envRgb[2] * inv + diffuseRgb[2] * a,
  ];
}

/**
 * Apply irradiance to blended albedo (FFP GL_MODULATE / dest==0 second factor).
 */
export function retailEnvmapLitColor(
  irradiance: [number, number, number],
  albedo: [number, number, number]
): [number, number, number] {
  return [
    irradiance[0] * albedo[0],
    irradiance[1] * albedo[1],
    irradiance[2] * albedo[2],
  ];
}

/** Retail quadratic attenuation coefficient for a light radius. */
export function retailQuadraticAttenuation(radius: number): number {
  if(!(radius > 0)){
    return 0;
  }
  // SetLightGL: r = max(radius, 0.1); quadratic = 9 / (r² + r²) === 4.5 / r²
  const r = Math.max(radius, RETAIL_LIGHT_ATTEN_MIN_RADIUS);
  const r2 = r * r;
  return 9.0 / (r2 + r2);
}

/**
 * Retail point-light distance attenuation.
 * constant=1, linear=0, quadratic=4.5/r²
 */
export function retailPointAttenuation(distance: number, radius: number): number {
  if(!(radius > 0)){
    return 0;
  }
  const q = retailQuadraticAttenuation(radius);
  return 1 / (1 + q * distance * distance);
}

/**
 * Horizontal (XY) distance / radius score used by PrioritizeLights @ 004a2f30.
 * Lower is better; values > 1 are typically excluded from illumination list.
 */
export function retailIlluminationScore(
  lightX: number,
  lightY: number,
  focusX: number,
  focusY: number,
  radius: number
): number {
  if(!(radius > 0)){
    return Number.POSITIVE_INFINITY;
  }
  const dx = lightX - focusX;
  const dy = lightY - focusY;
  return Math.sqrt(dx * dx + dy * dy) / radius;
}

/**
 * Retail ControlLightsFade (`004a4580`) initial fade when a light is first
 * added to the bound list: fadingLightFlag (max_tree != 0) starts at 0,
 * otherwise 1. Ongoing updates always use `retailFadeStep`.
 */
export function retailFadeInit(fadingLight: boolean): number {
  return fadingLight ? 0 : 1;
}

/**
 * Retail ControlLightsFade continuous fade: always ±deltaT toward target,
 * clamped to [0, 1]. fadingLightFlag only affects the initial value via
 * `retailFadeInit` — in/out while bound always uses this rate.
 */
export function retailFadeStep(current: number, target: number, delta: number): number {
  const dt = Math.max(0, delta);
  if(target > current){
    return Math.min(1, current + dt);
  }
  if(target < current){
    return Math.max(0, current - dt);
  }
  return current;
}

/**
 * Advance retail shadow-light fade (GetShadowLights @ 004a4b10).
 * FLOAT_007a1948 = 0.3 → fade-in Δt/0.3, fade-out 2·Δt/0.3.
 */
export function retailShadowFadeStep(
  current: number,
  target: number,
  delta: number
): number {
  const step = delta / 0.3;
  if(target > current){
    return Math.min(1, current + step);
  }
  if(target < current){
    return Math.max(0, current - step - step);
  }
  return current;
}

export interface IRetailLightSortKey {
  priority: number;
  /**
   * Retail n_dynamic_type preference (lightcmp @ 004a28c0):
   * type 1 > type 2 > type 0. Stored as sort rank so higher values win.
   */
  dynamicRank: number;
  illuminationScore: number;
  colorIsBlack: boolean;
  /**
   * Monotonic registration ordinal. Prefer this over uuid for a stable
   * approximation of retail PartLight pointer-order tie-breaking.
   */
  registrationOrder?: number;
  /** @deprecated Prefer registrationOrder; kept for older call sites/tests. */
  uuid?: string;
}

/**
 * lightcmp @ 004a28c0: prefer non-black, lower numeric priority, higher
 * dynamicRank, lower illumination score, then registration-order / uuid
 * tie-break (retail uses PartLight pointer address).
 * LightPriority.LOWEST=1 sorts before HIGHEST=5.
 * Returns < 0 if a should sort before b (more preferred).
 */
export function compareRetailLights(a: IRetailLightSortKey, b: IRetailLightSortKey): number {
  if(a.colorIsBlack !== b.colorIsBlack){
    return a.colorIsBlack ? 1 : -1;
  }
  if(a.colorIsBlack){
    return 0;
  }
  if(a.priority !== b.priority){
    return a.priority - b.priority;
  }
  if(a.dynamicRank !== b.dynamicRank){
    return b.dynamicRank - a.dynamicRank;
  }
  if(a.illuminationScore !== b.illuminationScore){
    return a.illuminationScore - b.illuminationScore;
  }
  if(a.registrationOrder !== undefined && b.registrationOrder !== undefined &&
    a.registrationOrder !== b.registrationOrder){
    return a.registrationOrder - b.registrationOrder;
  }
  if(a.uuid !== undefined && b.uuid !== undefined && a.uuid !== b.uuid){
    return a.uuid < b.uuid ? -1 : 1;
  }
  return 0;
}

/**
 * Rank for lightcmp n_dynamic_type preference (higher sorts first).
 * Retail: type 1 > type 2 > type 0. affectDynamic is a separate eligibility flag
 * (GetNearestLights) and does not change lightcmp ranking.
 */
export function retailDynamicRank(dynamicType: number, _affectDynamic?: boolean): number {
  const type = dynamicType | 0;
  if(type === 1){
    return 2;
  }
  if(type === 2){
    return 1;
  }
  // Legacy boolean call sites: treat truthy dynamic as type 1.
  if(type !== 0 && type !== 1 && type !== 2 && !!dynamicType){
    return 2;
  }
  return 0;
}

/** @deprecated Prefer retailDynamicRank(dynamicType). */
export function retailDynamicRankFromFlags(isDynamic: boolean, affectDynamic: boolean): number {
  if(isDynamic){
    return retailDynamicRank(1);
  }
  // affectDynamic alone does not raise lightcmp rank (n_dynamic_type stays 0).
  void affectDynamic;
  return 0;
}

/**
 * Retail RenderStencilShadowsForThisLight disk radius @ 00450730.
 * Uses shadowRadius when > 0, else light radius. If radius > 50, disk is
 * centered on focus with radius 50; otherwise radius is shortened by Δz to focus.
 */
export function retailStencilShadowDisk(
  lightX: number,
  lightY: number,
  lightZ: number,
  radius: number,
  shadowRadius: number,
  focusX: number,
  focusY: number,
  focusZ: number
): { x: number; y: number; z: number; radius: number } {
  let r = shadowRadius > 0 ? shadowRadius : radius;
  if(!(r > 0)){
    return { x: focusX, y: focusY, z: focusZ, radius: 0 };
  }
  if(r > 50){
    return { x: focusX, y: focusY, z: focusZ, radius: 50 };
  }
  const dz = Math.abs(lightZ - focusZ);
  let diskR = r * r - dz * dz;
  if(diskR < 0){
    diskR = 0;
  }
  return {
    x: lightX,
    y: lightY,
    z: focusZ,
    radius: Math.sqrt(diskR),
  };
}

/** Retail stencil disk opacity: shadowAlpha * 0.5 (alpha channel of dark disk). */
export function retailStencilShadowOpacity(shadowAlpha: number): number {
  return Math.max(0, Math.min(1, shadowAlpha * 0.5));
}

export function isRetailLightColorBlack(r: number, g: number, b: number): boolean {
  return r === 0 && g === 0 && b === 0;
}

/**
 * Retail PrioritizeShadow @ 004a3e30 color gate:
 * keep light if any raw PartLight.color channel > 0.1 (not fade×color).
 */
export function isRetailShadowColorVisible(r: number, g: number, b: number): boolean {
  return r > 0.1 || g > 0.1 || b > 0.1;
}

/**
 * Effective lightcmp priority: PartLight.priority, or authored MDL lightpriority
 * when runtime priority is 0 (retail fallback to MdlNode+0x90).
 */
export function retailEffectivePriority(priority: number, authoredPriority = 0): number {
  return (priority | 0) !== 0 ? (priority | 0) : (authoredPriority | 0);
}

/** Retail scene GL light budget (GL_LIGHT0..7). */
export const RETAIL_MAX_SCENE_LIGHTS = 8;
/** Retail VertexProgram allowed_lights hard-cap @ 004a27d0. */
export const RETAIL_MAX_LIGHTS_PER_MODEL = 3;
/** Retail stencil fan segments in RenderStencilShadowsForThisLight @ 00450730. */
export const RETAIL_STENCIL_SHADOW_SEGMENTS = 10;
/** GetNearestLights / RenderOnlyGobs object query radius @ 00450d60. */
export const RETAIL_GOB_LIGHT_RADIUS = 2;
/** Distant/static GetShadowLights(mode=2) radius threshold. */
export const RETAIL_DISTANT_SHADOW_RADIUS = 1000;

/**
 * Retail GetShadowLights @ 004a4b10 mode argument:
 * 0 = multi-light gob / dynamic projections (DoGobShadows / DoDynamicMeshProjections)
 * 1 = single dynamic light for static mesh shadows (DoStaticMeshShadows)
 * 2 = one distant/static light from the full lights list
 */
export enum RetailShadowLightMode {
  Multi = 0,
  SingleDynamic = 1,
  DistantStatic = 2,
}

/**
 * ControlLightsFade @ 004a4580 param_4 selects which PartLight fade field the
 * pool advances, and GetNearestLights @ 004a3770 uses no fade at all.
 */
export enum RetailLightFadeChannel {
  /**
   * GetNearestLights / gob packing for Odyssey GLSL: authored color only
   * (SetUpVertexProgramLightShaderConstants omits PartLight.multiplier;
   * FFP SetLightGL still uses multiplier × color).
   */
  None = 0,
  /** param_4 = 0 → field10_0x78. Room / global pool; shader RGB = fade × color. */
  Primary = 1,
  /** param_4 = 1 → field11_0x7c. Static-geometry pool; shader RGB = secondaryFade × color. */
  Secondary = 2,
}

/**
 * EnableLightsDynamicOnly @ 004a4480 eligibility. Retail compares
 * `num_dynamic_types == 1` exactly, so baked static lights (type 0) and
 * gob-only lights (type 2) are excluded from the static-geometry overlay.
 */
export function isRetailDynamicOnlyLight<T extends { dynamicType?: number }>(light: T): boolean {
  return (light?.dynamicType | 0) === 1;
}

/**
 * EnableLightsDynamicOnly @ 004a4480: filter the prioritized illumination list
 * down to the `n_dynamic_type == 1` lights that light static geometry.
 * Order is preserved — the caller already lightcmp-sorted the input.
 */
export function retailSelectDynamicOnlyLights<T extends { dynamicType?: number }>(
  prioritizedLights: T[],
  out: T[] = []
): T[] {
  out.length = 0;
  for(let i = 0; i < prioritizedLights.length; i++){
    const light = prioritizedLights[i];
    if(isRetailDynamicOnlyLight(light)){
      out.push(light);
    }
  }
  return out;
}

/**
 * PrioritizeBump @ 004a3ee0: collect non-ambient dynamic lights from the
 * render/fade pool, lightcmp-sort, keep at most one.
 */
export function retailSelectPrioritizeBump<T extends {
  isAmbient?: boolean;
  dynamicType?: number;
}>(
  renderLights: T[],
  compare: (a: T, b: T) => number
): T[] {
  const candidates = renderLights.filter((light) =>
    !light.isAmbient && (light.dynamicType | 0) !== 0
  );
  candidates.sort(compare);
  return candidates.slice(0, 1);
}

/**
 * PrioritizeIllumination bump_map_lights @ 004a3cf0: scan the first 3 sorted
 * illumination lights; keep the first non-ambient with n_dynamic_type != 0.
 */
export function retailSelectIlluminationBump<T extends {
  isAmbient?: boolean;
  dynamicType?: number;
}>(sortedIlluminationLights: T[]): T[] {
  const limit = Math.min(3, sortedIlluminationLights.length);
  for(let i = 0; i < limit; i++){
    const light = sortedIlluminationLights[i];
    if(!light.isAmbient && (light.dynamicType | 0) !== 0){
      return [light];
    }
  }
  return [];
}

/**
 * GetShadowLights(mode=2) eligibility: shadow, not ambient-only, and either
 * radius >= 1000 or n_dynamic_type == 0. Lowest effective priority wins.
 */
export function retailSelectDistantStaticShadowLight<T extends {
  castShadow?: boolean;
  isAmbient?: boolean;
  dynamicType?: number;
  radius?: number;
  priority?: number;
  authoredPriority?: number;
}>(lights: T[]): T | undefined {
  let best: T | undefined;
  let bestPriority = Number.POSITIVE_INFINITY;
  for(const light of lights){
    if(!light.castShadow || light.isAmbient){ continue; }
    const radius = light.radius ?? 0;
    const dynamicType = light.dynamicType | 0;
    if(!(radius >= RETAIL_DISTANT_SHADOW_RADIUS || dynamicType === 0)){ continue; }
    const priority = retailEffectivePriority(light.priority ?? 0, light.authoredPriority ?? 0);
    if(priority < bestPriority){
      best = light;
      bestPriority = priority;
    }
  }
  return best;
}

/**
 * When headLightEnabled, SetUpVertexProgramLightShaderConstants @ 004a50d0
 * reserves one of the model's allowed_lights slots (allowedLights -= 1).
 */
export function retailModelLightSlots(
  allowedLights = RETAIL_MAX_LIGHTS_PER_MODEL,
  headLightEnabled = false
): number {
  const allowed = Math.max(0, allowedLights | 0);
  if(headLightEnabled && allowed > 0){
    return allowed - 1;
  }
  return allowed;
}

/**
 * Map active graphics quality to a videoquality.2da row index.
 * Prefer explicit Video Quality; otherwise Texture Quality (INI).
 */
export function retailVideoQualityRowIndex(
  rowCount: number,
  textureQuality?: number,
  videoQuality?: number
): number {
  const count = Math.max(0, rowCount | 0);
  if(count <= 0){ return 0; }
  const preferred = Number.isFinite(videoQuality as number)
    ? Math.floor(videoQuality as number)
    : (Number.isFinite(textureQuality as number) ? Math.floor(textureQuality as number) : count - 1);
  return Math.max(0, Math.min(count - 1, preferred));
}
