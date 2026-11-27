import * as THREE from "three";
import { ODYSSEY_AREA_WIND_DIRECTION } from "@engine/render/three/odyssey/windPowerContext";
import type { OdysseyModel3D } from "@engine/render/three/odyssey/OdysseyModel3D";
import { OdysseyUniformBuffers } from "@engine/render/three/odyssey/OdysseyUniformBuffers";

const WIND_GRID_SIZE = 16;
const WIND_GRID_CELLS = WIND_GRID_SIZE * WIND_GRID_SIZE;
const MAX_POINT_SOURCES = 16;
const NOISE_PERIOD = 2.0;
const DEG2RAD = Math.PI / 180;

export interface PointSourceWind {
  position: THREE.Vector3;
  radius: number;
  time: number;
  strength: number;
}

/**
 * Per-scene Odyssey wind simulation: global vector, 16×16 turbulence grids,
 * and point-source gusts. Feeds dangly/grass shaders via DataTexture + uniform arrays.
 */
export class WindManager {
  static MAX_POINT_SOURCES = MAX_POINT_SOURCES;
  static WIND_GRID_SIZE = WIND_GRID_SIZE;

  context: any;

  windLevel = 0;
  globalWind = new THREE.Vector3();
  windDelta = new THREE.Vector3();
  windMaxDeviation = new THREE.Vector2();

  noiseField0 = new Float32Array(WIND_GRID_CELLS);
  noiseField1 = new Float32Array(WIND_GRID_CELLS);
  currentNoiseField: Float32Array;
  nextNoiseField: Float32Array;

  noiseTimer = 0;
  noisePeriod = NOISE_PERIOD;
  noiseAlpha = 0;

  pointSourceWinds: PointSourceWind[] = [];

  windNoiseMap: THREE.DataTexture;
  private noiseTextureData: Float32Array;

  windPointSources: THREE.Vector4[] = [];
  windPointStrengths: THREE.Vector2[] = [];

  /** Shared uniform value objects — materials hold references to these. */
  readonly uniformValues = {
    windNoiseAlpha: { value: 0 },
    windPointSourceCount: { value: 0 },
    windGrassDt: { value: 0 },
    windDanglyElapsed: { value: 0.025 },
    danglyWindLevel: { value: 0 },
  };

  windCacheID = 0;

  private _scratchPos = new THREE.Vector3();
  private _scratchWind = new THREE.Vector3();

  constructor() {
    this.currentNoiseField = this.noiseField0;
    this.nextNoiseField = this.noiseField1;

    this.noiseTextureData = new Float32Array(WIND_GRID_CELLS * 4);
    this.windNoiseMap = new THREE.DataTexture(
      this.noiseTextureData as unknown as BufferSource,
      WIND_GRID_SIZE,
      WIND_GRID_SIZE,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.windNoiseMap.magFilter = THREE.LinearFilter;
    this.windNoiseMap.minFilter = THREE.LinearFilter;
    this.windNoiseMap.wrapS = THREE.ClampToEdgeWrapping;
    this.windNoiseMap.wrapT = THREE.ClampToEdgeWrapping;
    this.windNoiseMap.needsUpdate = true;

    for (let i = 0; i < MAX_POINT_SOURCES; i++) {
      this.windPointSources.push(new THREE.Vector4());
      this.windPointStrengths.push(new THREE.Vector2());
    }

    this.fillNoiseField(this.noiseField0);
    this.fillNoiseField(this.noiseField1);
    this.uploadNoiseTexture();
  }

  init(context: any): void {
    this.context = context;
    this.clear();
  }

  clear(): void {
    this.windLevel = 0;
    this.globalWind.set(0, 0, 0);
    this.windDelta.set(0, 0, 0);
    this.windMaxDeviation.set(0, 0);
    this.noiseTimer = 0;
    this.noiseAlpha = 0;
    this.pointSourceWinds.length = 0;
    this.uniformValues.windPointSourceCount.value = 0;
    this.uniformValues.windGrassDt.value = 0;
    this.uniformValues.windNoiseAlpha.value = 0;
    this.uniformValues.danglyWindLevel.value = 0;
    this.fillNoiseField(this.noiseField0);
    this.fillNoiseField(this.noiseField1);
    this.uploadNoiseTexture();
    this.windCacheID++;
  }

  /** Nested block refinement on a 16×16 turbulence grid. */
  fillNoiseField(grid: Float32Array): void {
    grid.fill(0);

    let step = WIND_GRID_SIZE;
    while (step >= 1) {
      const denom = 500 / (WIND_GRID_SIZE / step);
      for (let y0 = 0; y0 < WIND_GRID_SIZE; y0 += step) {
        for (let x0 = 0; x0 < WIND_GRID_SIZE; x0 += step) {
          const amount = (Math.floor(Math.random() * denom)) * 0.001;
          for (let y = y0; y < y0 + step && y < WIND_GRID_SIZE; y++) {
            for (let x = x0; x < x0 + step && x < WIND_GRID_SIZE; x++) {
              grid[y * WIND_GRID_SIZE + x] += amount;
            }
          }
        }
      }
      step = Math.floor(step / 2);
    }
  }

  applyWindLevel(level: number): void {
    const dir = ODYSSEY_AREA_WIND_DIRECTION.clone().normalize();
    let scale = 0;
    let freqDeg = 0;
    let magDeg = 0;

    switch (level) {
      case 0:
        scale = 0;
        freqDeg = 0;
        magDeg = 0;
        break;
      case 1:
        scale = 1.0;
        freqDeg = 100;
        magDeg = 3;
        break;
      case 2:
        scale = 2.0;
        freqDeg = 150;
        magDeg = 5;
        break;
      default:
        return;
    }

    this.windLevel = level;
    this.globalWind.copy(dir).multiplyScalar(scale);
    this.windMaxDeviation.set(freqDeg * DEG2RAD, magDeg * DEG2RAD);
    this.uniformValues.danglyWindLevel.value = level;
    this.windCacheID++;
  }

  addPointSourceWind(
    position: THREE.Vector3,
    radius: number,
    time: number,
    strength: number
  ): void {
    if (radius <= 0 || time <= 0) return;

    this.pointSourceWinds.push({
      position: position.clone(),
      radius,
      time,
      strength,
    });
  }

  update(delta: number): void {
    this.updateTimer(delta);
    this.packPointSources();
    this.uploadNoiseTexture();
    this.packWindUbo();
  }

  private packWindUbo(): void {
    const renderer = (this.context as { renderer?: THREE.WebGLRenderer } | null)?.renderer;
    if(!OdysseyUniformBuffers.isEnabled(renderer ?? null)) return;
    OdysseyUniformBuffers.packWind({
      global: this.globalWind,
      delta: this.windDelta,
      maxDeviation: this.windMaxDeviation,
      noiseAlpha: this.noiseAlpha,
      pointCount: this.uniformValues.windPointSourceCount.value,
      sources: this.windPointSources,
      strengths: this.windPointStrengths,
    });
  }

  private updateTimer(elapsed: number): void {
    this.noiseTimer += elapsed;
    if (this.noiseTimer > this.noisePeriod) {
      const tmp = this.currentNoiseField;
      this.currentNoiseField = this.nextNoiseField;
      this.nextNoiseField = tmp;
      this.fillNoiseField(this.nextNoiseField);
      this.noiseTimer = 0;
      this.windCacheID++;
    }

    this.noiseAlpha = this.noiseTimer / this.noisePeriod;
    this.uniformValues.windNoiseAlpha.value = this.noiseAlpha;
    this.uniformValues.windGrassDt.value = Math.min(elapsed, 0.1);
    const danglyElapsed = Math.max(0.0125, Math.min(elapsed, 0.035));
    this.uniformValues.windDanglyElapsed.value = danglyElapsed;

    this.windDelta.x = elapsed * this.globalWind.x;
    this.windDelta.y = elapsed * this.globalWind.y;
    this.windDelta.z = elapsed * this.globalWind.z;

    for (let i = this.pointSourceWinds.length - 1; i >= 0; i--) {
      this.pointSourceWinds[i].time -= elapsed;
      if (this.pointSourceWinds[i].time < 0) {
        this.pointSourceWinds.splice(i, 1);
      }
    }
  }

  private uploadNoiseTexture(): void {
    const data = this.noiseTextureData;
    for (let i = 0; i < WIND_GRID_CELLS; i++) {
      const offset = i * 4;
      data[offset] = this.currentNoiseField[i];
      data[offset + 1] = this.nextNoiseField[i];
      data[offset + 2] = 0;
      data[offset + 3] = 0;
    }
    this.windNoiseMap.needsUpdate = true;
  }

  private packPointSources(): void {
    const count = Math.min(this.pointSourceWinds.length, MAX_POINT_SOURCES);
    this.uniformValues.windPointSourceCount.value = count;

    for (let i = 0; i < MAX_POINT_SOURCES; i++) {
      if (i < count) {
        const src = this.pointSourceWinds[i];
        this.windPointSources[i].set(
          src.position.x,
          src.position.y,
          src.position.z,
          src.radius
        );
        this.windPointStrengths[i].set(src.strength, 1.0);
      } else {
        this.windPointSources[i].set(0, 0, 0, 0);
        this.windPointStrengths[i].set(0, 0);
      }
    }
  }

  private noiseIndex(coord: number): number {
    const i = Math.floor(coord);
    return Math.abs(i * 4) % WIND_GRID_SIZE;
  }

  private sampleBlendedNoise(x: number, y: number): number {
    const ix = this.noiseIndex(x);
    const iy = this.noiseIndex(y);
    const idx = iy * WIND_GRID_SIZE + ix;
    const current = this.currentNoiseField[idx];
    const next = this.nextNoiseField[idx];
    return current + (next - current) * this.noiseAlpha;
  }

  private applyDeviation(base: THREE.Vector3, worldX: number, worldY: number, noise: number): THREE.Vector3 {
    let horizontalDev = 0;
    if (this.windMaxDeviation.x !== 0) {
      horizontalDev = ((noise * 2) * this.windMaxDeviation.x - this.windMaxDeviation.x) * 0.5;
    }

    let verticalDev = 0;
    if (this.windMaxDeviation.y !== 0) {
      const noiseV = this.sampleBlendedNoise(worldY, worldX);
      verticalDev = ((noiseV * 2) * this.windMaxDeviation.y - this.windMaxDeviation.y) * 0.5;
    }

    return this.rotateVectorByTrigLookup(base, horizontalDev, verticalDev);
  }

  private rotateVectorByTrigLookup(v: THREE.Vector3, horizontalDev: number, verticalDev: number): THREE.Vector3 {
    const step = Math.PI / 16;
    const hIdx = Math.round(horizontalDev / step) & 31;
    const vIdx = Math.round(verticalDev / step) & 31;
    const hc = Math.cos(hIdx * step);
    const hs = Math.sin(hIdx * step);
    const vc = Math.cos(vIdx * step);
    const vs = Math.sin(vIdx * step);

    const qw = vc * hc;
    const qx = vc * hs;
    const qy = vs * hc;
    const qz = -vs * hs;

    const u = new THREE.Vector3(qx, qy, qz);
    const result = new THREE.Vector3();
    const dotUV = u.dot(v);
    const dotUU = u.dot(u);
    result.copy(u).multiplyScalar(2 * dotUV);
    result.addScaledVector(v, qw * qw - dotUU);
    result.add(new THREE.Vector3().crossVectors(u, v).multiplyScalar(2 * qw));
    return result;
  }

  pointSourceWindVector(position: THREE.Vector3): THREE.Vector3 {
    const result = new THREE.Vector3();
    for (const src of this.pointSourceWinds) {
      const delta = this._scratchPos.copy(position).sub(src.position);
      const d = Math.max(Math.abs(delta.x), Math.abs(delta.y), Math.abs(delta.z));
      if (d < src.radius) {
        const len = delta.length();
        if (len > 1e-8) {
          const falloff = ((src.radius - d) / src.radius) * src.strength;
          result.addScaledVector(delta, falloff / len);
        }
      }
    }
    return result;
  }

  getGlobalWindNoPoint(position: THREE.Vector3, scale: number): THREE.Vector3 {
    if (this.globalWind.lengthSq() < 1e-12) {
      return new THREE.Vector3();
    }

    const noise = this.sampleBlendedNoise(position.x, position.y);
    this._scratchWind.copy(this.globalWind).multiplyScalar(scale * noise);
    return this.applyDeviation(this._scratchWind, position.x, position.y, noise);
  }

  /** Cap sampled wind magnitude when |globalWind| > 5. */
  getGlobalWindCapScale(): number {
    const mag = this.globalWind.length();
    return mag > 5.0 ? 5.0 / mag : 1.0;
  }

  getGlobalWind(position: THREE.Vector3, scale: number): THREE.Vector3 {
    const noise = this.sampleBlendedNoise(position.x, position.y);
    this._scratchWind.copy(this.globalWind).multiplyScalar(scale * noise);
    this._scratchWind.add(this.pointSourceWindVector(position));

    if (this._scratchWind.lengthSq() < 1e-12 && this.globalWind.lengthSq() < 1e-12) {
      return new THREE.Vector3();
    }

    return this.applyDeviation(this._scratchWind, position.x, position.y, noise);
  }

  getGlobalPointWind(position: THREE.Vector3, _scale?: number): THREE.Vector3 {
    return this.pointSourceWindVector(position);
  }

  /** Bind shared wind uniform value objects onto a dangly or grass material. */
  static bindWindUniforms(uniforms: Record<string, THREE.IUniform>, material?: THREE.ShaderMaterial): void {
    const wm = WindManager._instance;
    if (!wm || !uniforms) return;

    const renderer = (wm.context as { renderer?: THREE.WebGLRenderer } | null)?.renderer;
    const useUbo = OdysseyUniformBuffers.isEnabled(renderer ?? null);
    if (useUbo && material) {
      OdysseyUniformBuffers.applyWebGL2Defines(material, { wind: true });
      OdysseyUniformBuffers.ensureMaterialHooks(material);
    }

    uniforms.windNoiseMap = { value: wm.windNoiseMap };
    // Time / level knobs stay as shared uniform refs (declared outside wind UBO).
    uniforms.windGrassDt = wm.uniformValues.windGrassDt;
    uniforms.windDanglyElapsed = wm.uniformValues.windDanglyElapsed;
    uniforms.danglyWindLevel = wm.uniformValues.danglyWindLevel;

    if (useUbo) {
      // Block members are not registered on the material — GPU reads the UBO.
      return;
    }

    uniforms.windNoiseAlpha = wm.uniformValues.windNoiseAlpha;
    uniforms.windGlobal = { value: wm.globalWind };
    uniforms.windMaxDeviation = { value: wm.windMaxDeviation };
    uniforms.windDelta = { value: wm.windDelta };
    uniforms.windPointSourceCount = wm.uniformValues.windPointSourceCount;
    uniforms.windPointSources = { value: wm.windPointSources };
    uniforms.windPointStrengths = { value: wm.windPointStrengths };
  }

  /** Bind wind uniforms on all dangly materials on a model if not yet cached. */
  static bindModelWindUniforms(model: OdysseyModel3D, cacheID: number): void {
    for (let j = 0, jl = model.materials.length; j < jl; j++) {
      const material = model.materials[j];
      if (!(material instanceof THREE.ShaderMaterial)) continue;
      if (!material.defines?.DANGLY) continue;
      if (material.userData.windCacheID === cacheID) continue;
      WindManager.bindWindUniforms(material.uniforms, material);
      material.userData.windCacheID = cacheID;
      material.uniformsNeedUpdate = true;
    }

    if (model.mergedDanglyMesh) {
      const mm = model.mergedDanglyMesh.material;
      const materials = Array.isArray(mm) ? mm : [mm];
      for (let m = 0; m < materials.length; m++) {
        const material = materials[m];
        if (!(material instanceof THREE.ShaderMaterial)) continue;
        if (material.userData.windCacheID === cacheID) continue;
        WindManager.bindWindUniforms(material.uniforms, material);
        material.userData.windCacheID = cacheID;
        material.uniformsNeedUpdate = true;
        if (!material.defines?.DANGLY) {
          material.defines = material.defines || {};
          material.defines.DANGLY = '';
          material.needsUpdate = true;
        }
      }
    }
  }

  private static _instance: WindManager | null = null;

  /** Called from GameState when the manager instance is created. */
  static setInstance(manager: WindManager): void {
    WindManager._instance = manager;
  }
}
