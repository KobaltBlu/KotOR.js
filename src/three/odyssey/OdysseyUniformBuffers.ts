/**
 * WebGL2 uniform buffer objects for shared Odyssey frame state.
 *
 * Binding points (fixed):
 *   0 — OdysseyLighting (active light-set buffer)
 *   1 — OdysseyShadow
 *   2 — OdysseyWind
 *
 * std140 packing is explicit (vec3 → 16-byte stride, mat4 → 64).
 * No-ops on WebGL1; callers keep the classic uniform path.
 */

import * as THREE from "three";
import { MAX_ODYSSEY_LIGHTS } from "@/shaders/chunks/OdysseyLighting";
import { MAX_ODYSSEY_SHADOW_MAPS } from "@/shaders/chunks/OdysseyShadow";

export const ODYSSEY_UBO_BINDING_LIGHTING = 0;
export const ODYSSEY_UBO_BINDING_SHADOW = 1;
export const ODYSSEY_UBO_BINDING_WIND = 2;

export type OdysseyLightUboSetId = "global" | "bump" | "lightmap";

const WIND_MAX_POINT_SOURCES = 16;

/** std140: see packLighting / packShadow / packWind comments for field order. */
const LIGHTING_UBO_FLOATS =
  4 * 4 + // ambient, sunAmbient, sun, sunDir as vec3+pad
  4 + // numLights, headEnabled, pad, pad
  2 * 4 + // head ambient/diffuse vec3+pad
  MAX_ODYSSEY_LIGHTS * 4 * 2; // pos[8] + color[8]

const SHADOW_UBO_FLOATS =
  MAX_ODYSSEY_SHADOW_MAPS * 16 + // mat4[4]
  MAX_ODYSSEY_SHADOW_MAPS * 4 + // lightWorld vec4[4]
  4 * 4 + // strength/influence/active/distant as vec4 each
  5 * 4; // 20 scalar floats

const WIND_UBO_FLOATS =
  2 * 4 + // global, delta as vec3+pad
  4 + // maxDeviation.xy, noiseAlpha, pointCount
  WIND_MAX_POINT_SOURCES * 4 + // sources vec4[16]
  WIND_MAX_POINT_SOURCES * 4; // strengths vec2 with std140 stride 16
  // grassDt / danglyElapsed / danglyWindLevel stay as regular uniforms (declared in grass/model shaders)

export class OdysseyUbo {
  data: Float32Array;
  private buffer: WebGLBuffer | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private dirty = true;
  private byteCapacity = 0;

  constructor(floatCount: number) {
    this.data = new Float32Array(floatCount);
    this.byteCapacity = this.data.byteLength;
  }

  ensure(gl: WebGL2RenderingContext): void {
    if (this.gl === gl && this.buffer) return;
    this.dispose();
    this.gl = gl;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, this.byteCapacity, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    this.dirty = true;
  }

  /** Grow backing store if the linked uniform block is larger than our pack. Returns true if resized. */
  ensureByteSize(gl: WebGL2RenderingContext, byteSize: number): boolean {
    this.ensure(gl);
    if (byteSize <= this.byteCapacity) return false;
    const nextFloats = Math.ceil(byteSize / 4);
    const next = new Float32Array(nextFloats);
    next.set(this.data);
    this.data = next;
    this.byteCapacity = next.byteLength;
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, this.byteCapacity, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    this.dirty = true;
    return true;
  }

  markDirty(): void {
    this.dirty = true;
  }

  upload(): void {
    if (!this.gl || !this.buffer || !this.dirty) return;
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.buffer);
    this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 0, this.data);
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
    this.dirty = false;
  }

  bind(bindingPoint: number): void {
    if (!this.gl || !this.buffer) return;
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, bindingPoint, this.buffer);
  }

  dispose(): void {
    if (this.gl && this.buffer) {
      this.gl.deleteBuffer(this.buffer);
    }
    this.buffer = null;
    this.gl = null;
  }
}

function writeVec3(out: Float32Array, offset: number, x: number, y: number, z: number): number {
  out[offset] = x;
  out[offset + 1] = y;
  out[offset + 2] = z;
  out[offset + 3] = 0;
  return offset + 4;
}

function writeVec4(out: Float32Array, offset: number, x: number, y: number, z: number, w: number): number {
  out[offset] = x;
  out[offset + 1] = y;
  out[offset + 2] = z;
  out[offset + 3] = w;
  return offset + 4;
}

function writeMat4(out: Float32Array, offset: number, m: THREE.Matrix4): number {
  out.set(m.elements, offset);
  return offset + 16;
}

/**
 * Shared Odyssey UBO registry.
 */
export class OdysseyUniformBuffers {
  static readonly lightingGlobal = new OdysseyUbo(LIGHTING_UBO_FLOATS);
  static readonly lightingBump = new OdysseyUbo(LIGHTING_UBO_FLOATS);
  static readonly lightingLightmap = new OdysseyUbo(LIGHTING_UBO_FLOATS);
  static readonly shadow = new OdysseyUbo(SHADOW_UBO_FLOATS);
  static readonly wind = new OdysseyUbo(WIND_UBO_FLOATS);

  private static activeLighting: OdysseyUbo = OdysseyUniformBuffers.lightingGlobal;
  private static activeLightingId: OdysseyLightUboSetId = "global";
  private static enabled = false;
  private static gl: WebGL2RenderingContext | null = null;
  /** Programs that already had uniformBlockBinding applied. */
  private static boundPrograms = new WeakSet<WebGLProgram>();

  static isEnabled(renderer?: THREE.WebGLRenderer | null): boolean {
    if (!renderer) return this.enabled;
    return !!renderer.capabilities?.isWebGL2;
  }

  static getLightingUbo(id: OdysseyLightUboSetId): OdysseyUbo {
    if (id === "bump") return this.lightingBump;
    if (id === "lightmap") return this.lightingLightmap;
    return this.lightingGlobal;
  }

  static packLighting(
    ubo: OdysseyUbo,
    args: {
      ambient: THREE.Color;
      sunAmbient: THREE.Color;
      sun: THREE.Color;
      sunDir: THREE.Vector3;
      numLights: number;
      headEnabled: boolean;
      headAmbient: THREE.Color;
      headDiffuse: THREE.Color;
      lightPos: THREE.Vector4[];
      lightColor: THREE.Vector4[];
    }
  ): void {
    const d = ubo.data;
    let o = 0;
    o = writeVec3(d, o, args.ambient.r, args.ambient.g, args.ambient.b);
    o = writeVec3(d, o, args.sunAmbient.r, args.sunAmbient.g, args.sunAmbient.b);
    o = writeVec3(d, o, args.sun.r, args.sun.g, args.sun.b);
    o = writeVec3(d, o, args.sunDir.x, args.sunDir.y, args.sunDir.z);
    // int numLights, int headEnabled — std140 as two ints in a vec4 slot
    d[o] = args.numLights;
    d[o + 1] = args.headEnabled ? 1 : 0;
    d[o + 2] = 0;
    d[o + 3] = 0;
    o += 4;
    o = writeVec3(d, o, args.headAmbient.r, args.headAmbient.g, args.headAmbient.b);
    o = writeVec3(d, o, args.headDiffuse.r, args.headDiffuse.g, args.headDiffuse.b);
    for (let i = 0; i < MAX_ODYSSEY_LIGHTS; i++) {
      const p = args.lightPos[i] ?? { x: 0, y: 0, z: 0, w: 0 };
      o = writeVec4(d, o, p.x, p.y, p.z, p.w);
    }
    for (let i = 0; i < MAX_ODYSSEY_LIGHTS; i++) {
      const c = args.lightColor[i] ?? { x: 0, y: 0, z: 0, w: 0 };
      o = writeVec4(d, o, c.x, c.y, c.z, c.w);
    }
    ubo.markDirty();
  }

  static packShadow(args: {
    matrices: THREE.Matrix4[];
    lightWorlds: THREE.Vector3[];
    strengths: number[];
    influences: number[];
    actives: number[];
    distantFactors: number[];
    mapSizeX: number;
    mapSizeY: number;
    beamingAlpha: number;
    mapActive: number;
    lightCount: number;
    soft: number;
    constantBias: number;
    slopeBias: number;
    softTexelLocal: number;
    softTexelDistant: number;
    softDepthLocal: number;
    softDepthDistant: number;
    fadeStart: number;
    fadeStartSoft: number;
    edgeFade: number;
    edgeFadeSoft: number;
    floorBiasScale: number;
    contactNormalZ: number;
    minVertexColor: number;
  }): void {
    const d = this.shadow.data;
    let o = 0;
    for (let i = 0; i < MAX_ODYSSEY_SHADOW_MAPS; i++) {
      o = writeMat4(d, o, args.matrices[i] ?? new THREE.Matrix4());
    }
    for (let i = 0; i < MAX_ODYSSEY_SHADOW_MAPS; i++) {
      const w = args.lightWorlds[i] ?? { x: 0, y: 0, z: 0 };
      o = writeVec3(d, o, w.x, w.y, w.z);
    }
    // std140 float[N] has 16-byte stride — pack as vec4 instead.
    o = writeVec4(
      d, o,
      args.strengths[0] ?? 0, args.strengths[1] ?? 0,
      args.strengths[2] ?? 0, args.strengths[3] ?? 0
    );
    o = writeVec4(
      d, o,
      args.influences[0] ?? 0, args.influences[1] ?? 0,
      args.influences[2] ?? 0, args.influences[3] ?? 0
    );
    o = writeVec4(
      d, o,
      args.actives[0] ?? 0, args.actives[1] ?? 0,
      args.actives[2] ?? 0, args.actives[3] ?? 0
    );
    o = writeVec4(
      d, o,
      args.distantFactors[0] ?? 0, args.distantFactors[1] ?? 0,
      args.distantFactors[2] ?? 0, args.distantFactors[3] ?? 0
    );
    // Tight float run (20): mapSize.xy + knobs + pad — must match GLSL block order.
    const scalars = [
      args.mapSizeX,
      args.mapSizeY,
      args.beamingAlpha,
      args.mapActive,
      args.lightCount,
      args.soft,
      args.constantBias,
      args.slopeBias,
      args.softTexelLocal,
      args.softTexelDistant,
      args.softDepthLocal,
      args.softDepthDistant,
      args.fadeStart,
      args.fadeStartSoft,
      args.edgeFade,
      args.edgeFadeSoft,
      args.floorBiasScale,
      args.contactNormalZ,
      args.minVertexColor,
      0,
    ];
    for (let i = 0; i < scalars.length; i++) d[o++] = scalars[i];
    this.shadow.markDirty();
  }

  static packWind(args: {
    global: THREE.Vector3;
    delta: THREE.Vector3;
    maxDeviation: THREE.Vector2;
    noiseAlpha: number;
    pointCount: number;
    sources: THREE.Vector4[];
    strengths: THREE.Vector2[];
  }): void {
    const d = this.wind.data;
    let o = 0;
    o = writeVec3(d, o, args.global.x, args.global.y, args.global.z);
    o = writeVec3(d, o, args.delta.x, args.delta.y, args.delta.z);
    d[o++] = args.maxDeviation.x;
    d[o++] = args.maxDeviation.y;
    d[o++] = args.noiseAlpha;
    d[o++] = args.pointCount;
    for (let i = 0; i < WIND_MAX_POINT_SOURCES; i++) {
      const s = args.sources[i] ?? { x: 0, y: 0, z: 0, w: 0 };
      o = writeVec4(d, o, s.x, s.y, s.z, s.w);
    }
    // std140: vec2 array has 16-byte stride
    for (let i = 0; i < WIND_MAX_POINT_SOURCES; i++) {
      const s = args.strengths[i] ?? { x: 0, y: 0 };
      d[o++] = s.x;
      d[o++] = s.y;
      d[o++] = 0;
      d[o++] = 0;
    }
    this.wind.markDirty();
  }

  static bindLightingSet(id: OdysseyLightUboSetId): void {
    this.activeLightingId = id;
    this.activeLighting = this.getLightingUbo(id);
    if (this.enabled) {
      this.activeLighting.bind(ODYSSEY_UBO_BINDING_LIGHTING);
    }
  }

  static getActiveLightingSetId(): OdysseyLightUboSetId {
    return this.activeLightingId;
  }

  /**
   * Ensure GL buffers exist, upload dirty UBOs, bind bases.
   * Call once per frame before world draws.
   */
  static beginFrame(renderer: THREE.WebGLRenderer): void {
    this.enabled = !!renderer.capabilities?.isWebGL2;
    if (!this.enabled) return;

    const gl = renderer.getContext() as WebGL2RenderingContext;
    this.gl = gl;

    this.lightingGlobal.ensure(gl);
    this.lightingBump.ensure(gl);
    this.lightingLightmap.ensure(gl);
    this.shadow.ensure(gl);
    this.wind.ensure(gl);

    this.lightingGlobal.upload();
    this.lightingBump.upload();
    this.lightingLightmap.upload();
    this.shadow.upload();
    this.wind.upload();

    this.activeLighting.bind(ODYSSEY_UBO_BINDING_LIGHTING);
    this.shadow.bind(ODYSSEY_UBO_BINDING_SHADOW);
    this.wind.bind(ODYSSEY_UBO_BINDING_WIND);
  }

  /**
   * Resolve the compiled WebGLProgram from Three r149 material properties.
   * r149 keeps it on `currentProgram` (and a `programs` Map), not `program`.
   */
  static resolveMaterialProgram(props: {
    program?: { program?: WebGLProgram } | null;
    currentProgram?: { program?: WebGLProgram } | null;
    programs?: Map<unknown, { program?: WebGLProgram }> | null;
  } | null | undefined): WebGLProgram | undefined {
    if (!props) return undefined;
    const fromCurrent = props.currentProgram?.program;
    if (fromCurrent) return fromCurrent;
    const fromLegacy = props.program?.program;
    if (fromLegacy) return fromLegacy;
    const map = props.programs;
    if (map && typeof map.forEach === "function") {
      let found: WebGLProgram | undefined;
      map.forEach((entry) => {
        if (!found && entry?.program) found = entry.program;
      });
      return found;
    }
    return undefined;
  }

  /**
   * After a WebGLProgram links, map uniform blocks to fixed binding points.
   * Safe to call repeatedly; uses WeakSet to skip repeats.
   * Also grows UBO backing stores to match the driver's std140 block size.
   */
  static bindProgramBlocks(program: WebGLProgram | null | undefined): void {
    if (!this.enabled || !this.gl || !program) return;
    if (this.boundPrograms.has(program)) return;
    const gl = this.gl;
    let grewLighting = false;
    let grewShadow = false;
    let grewWind = false;
    const bindBlock = (
      name: string,
      point: number,
      grow?: OdysseyUbo | OdysseyUbo[],
      onGrew?: () => void
    ) => {
      const idx = gl.getUniformBlockIndex(program, name);
      if (idx === gl.INVALID_INDEX || idx === 0xffffffff) return;
      gl.uniformBlockBinding(program, idx, point);
      const size = gl.getActiveUniformBlockParameter(
        program,
        idx,
        gl.UNIFORM_BLOCK_DATA_SIZE
      ) as number;
      if (typeof size === "number" && size > 0 && grow) {
        const list = Array.isArray(grow) ? grow : [grow];
        for (let i = 0; i < list.length; i++) {
          if (list[i].ensureByteSize(gl, size)) onGrew?.();
        }
      }
    };
    bindBlock(
      "OdysseyLighting",
      ODYSSEY_UBO_BINDING_LIGHTING,
      [this.lightingGlobal, this.lightingBump, this.lightingLightmap],
      () => {
        grewLighting = true;
      }
    );
    bindBlock("OdysseyShadow", ODYSSEY_UBO_BINDING_SHADOW, this.shadow, () => {
      grewShadow = true;
    });
    bindBlock("OdysseyWind", ODYSSEY_UBO_BINDING_WIND, this.wind, () => {
      grewWind = true;
    });
    // After bufferData resize, re-bind bases and upload so the draw sees the new size/content.
    if (grewLighting) {
      this.lightingGlobal.upload();
      this.lightingBump.upload();
      this.lightingLightmap.upload();
      this.activeLighting.bind(ODYSSEY_UBO_BINDING_LIGHTING);
    }
    if (grewShadow) {
      this.shadow.upload();
      this.shadow.bind(ODYSSEY_UBO_BINDING_SHADOW);
    }
    if (grewWind) {
      this.wind.upload();
      this.wind.bind(ODYSSEY_UBO_BINDING_WIND);
    }
    this.boundPrograms.add(program);
  }

  /** Hook material onBeforeRender to keep lighting set + program block binds fresh. */
  static ensureMaterialHooks(material: THREE.ShaderMaterial, lightSetId?: OdysseyLightUboSetId): void {
    if (lightSetId) {
      material.userData.odysseyLightUboSet = lightSetId;
    }
    if (material.userData.odysseyUboBeforeRenderHook) return;
    material.userData.odysseyUboBeforeRenderHook = true;
    const previous = material.onBeforeRender;
    material.onBeforeRender = function onOdysseyUboBeforeRender(renderer, scene, camera, geometry, object, group) {
      if (typeof previous === "function") {
        previous.call(this, renderer, scene, camera, geometry, object, group);
      }
      if (!OdysseyUniformBuffers.isEnabled(renderer)) return;
      const mat = this as THREE.ShaderMaterial;
      const setId = (mat.userData.odysseyLightUboSet as OdysseyLightUboSetId) || "global";
      OdysseyUniformBuffers.bindLightingSet(setId);
      const props = (renderer as any).properties?.get?.(mat);
      const program = OdysseyUniformBuffers.resolveMaterialProgram(props);
      OdysseyUniformBuffers.bindProgramBlocks(program);
    };
  }

  static applyWebGL2Defines(material: THREE.ShaderMaterial, opts: {
    light?: boolean;
    shadow?: boolean;
    wind?: boolean;
  }): void {
    material.defines = material.defines || {};
    let changed = false;
    if (opts.light && !("USE_ODYSSEY_LIGHT_UBO" in material.defines)) {
      material.defines.USE_ODYSSEY_LIGHT_UBO = "";
      changed = true;
    }
    if (opts.shadow && !("USE_ODYSSEY_SHADOW_UBO" in material.defines)) {
      material.defines.USE_ODYSSEY_SHADOW_UBO = "";
      changed = true;
    }
    if (opts.wind && !("USE_ODYSSEY_WIND_UBO" in material.defines)) {
      material.defines.USE_ODYSSEY_WIND_UBO = "";
      changed = true;
    }
    if (changed) material.needsUpdate = true;
  }

  static dispose(): void {
    this.lightingGlobal.dispose();
    this.lightingBump.dispose();
    this.lightingLightmap.dispose();
    this.shadow.dispose();
    this.wind.dispose();
    this.gl = null;
    this.enabled = false;
  }

  /** Exported for unit tests. */
  static getLayoutFloatCounts() {
    return {
      lighting: LIGHTING_UBO_FLOATS,
      shadow: SHADOW_UBO_FLOATS,
      wind: WIND_UBO_FLOATS,
    };
  }
}
