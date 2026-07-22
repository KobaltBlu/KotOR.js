import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { IAreaDirtLayer } from "@/interface/area/IAreaDirtProperties";
import { TextureLoader } from "@/loaders";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { TXIPROCEDURETYPE } from "@/enums/graphics/txi/TXIPROCEDURETYPE";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { GameState } from "@/GameState";

const DIRTY_RESREFS = ['dirtytex', 'dirtytex2', 'dirtytex3'] as const;

/**
 * Scene dirtytex / dirtytex2 / dirtytex3 slots (retail DAT_00a14d34[0..2]).
 * Loads the three resrefs and optionally regenerates pixels from ARE Dirty*
 * when TXI proceduretype is dirty / dirty2 / dirty3.
 */
export class DirtyTextureManager {
  static textures: (THREE.Texture | null)[] = [null, null, null];

  static getTexture(index: number): THREE.Texture | null {
    const i = Math.max(0, Math.min(2, index | 0));
    return this.textures[i] ?? null;
  }

  static dispose(): void {
    for(let i = 0; i < 3; i++){
      const tex = this.textures[i];
      if(tex){
        tex.dispose();
        this.textures[i] = null;
      }
    }
  }

  /**
   * Load Scene dirty textures for the current area (TSL only).
   * Call once per area load after ARE Dirty* fields are available.
   */
  static async loadForArea(area: ModuleArea): Promise<void> {
    if(GameState.GameKey != GameEngineType.TSL){
      return;
    }
    this.dispose();
    await Promise.all(DIRTY_RESREFS.map(async (resRef, index) => {
      try {
        const tex: OdysseyTexture | undefined = await TextureLoader.Load(resRef);
        if(!tex){
          this.textures[index] = null;
          return;
        }
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;

        const layer = area.dirt?.layers?.[index];
        const procedure = tex.txi?.procedureType;
        const isDirtyProcedure =
          procedure === TXIPROCEDURETYPE.DIRTY ||
          procedure === TXIPROCEDURETYPE.DIRTY2 ||
          procedure === TXIPROCEDURETYPE.DIRTY3;

        if(isDirtyProcedure && layer && layer.size > 0){
          const generated = this.generateProceduralDirt(layer);
          if(generated){
            generated.name = resRef;
            generated.wrapS = THREE.RepeatWrapping;
            generated.wrapT = THREE.RepeatWrapping;
            tex.dispose();
            this.textures[index] = generated;
            return;
          }
        }
        this.textures[index] = tex;
      }catch(e){
        console.warn(`DirtyTextureManager: failed to load ${resRef}`, e);
        this.textures[index] = null;
      }
    }));
  }

  /**
   * Port of DirtyTextureController::Init — fills size×size RGBA from ARE params.
   * formula==1 → perlin-style noise; else random. Channels scaled by ARGB maxima.
   */
  static generateProceduralDirt(layer: IAreaDirtLayer): THREE.DataTexture | null {
    const size = Math.max(1, Math.min(512, layer.size | 0));
    if(size <= 0){
      return null;
    }

    const argb = layer.argb >>> 0;
    const aMax = (argb >>> 24) & 0xff;
    const rMax = (argb >>> 16) & 0xff;
    const gMax = (argb >>> 8) & 0xff;
    const bMax = argb & 0xff;

    const data = new Uint8Array(size * size * 4);
    const usePerlin = layer.formula === 1;

    let perlinA: Uint8Array | null = null;
    let perlinB: Uint8Array | null = null;
    let perlinC: Uint8Array | null = null;
    if(usePerlin){
      const peak = Math.max(rMax, gMax, bMax, aMax, 1);
      perlinA = this.makePerlinTexture(size, peak);
      perlinB = this.makePerlinTexture(size, peak);
      perlinC = this.makePerlinTexture(size, peak);
    }

    for(let y = 0; y < size; y++){
      for(let x = 0; x < size; x++){
        const i = (y * size + x) * 4;
        let noise: number;
        if(usePerlin && perlinA && perlinB && perlinC){
          const idx = y * size + x;
          noise = perlinA[idx] + perlinB[idx] + perlinC[idx];
        }else{
          noise = (Math.random() * 256) | 0;
        }

        data[i]     = rMax ? (noise % rMax) : 0;
        data[i + 1] = gMax ? (noise % gMax) : 0;
        data[i + 2] = bMax ? (noise % bMax) : 0;
        data[i + 3] = aMax ? (noise % aMax) : 0;
      }
    }

    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.needsUpdate = true;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  /** Simple value-noise field used as MakePerlinTexture stand-in. */
  static makePerlinTexture(size: number, peak: number): Uint8Array {
    const out = new Uint8Array(size * size);
    const grid = Math.max(2, Math.min(16, (size / 8) | 0));
    const corners: number[] = [];
    for(let i = 0; i <= grid * grid; i++){
      corners.push(Math.random() * peak);
    }
    for(let y = 0; y < size; y++){
      for(let x = 0; x < size; x++){
        const fx = (x / size) * grid;
        const fy = (y / size) * grid;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(grid, x0 + 1);
        const y1 = Math.min(grid, y0 + 1);
        const tx = fx - x0;
        const ty = fy - y0;
        const c00 = corners[y0 * (grid + 1) + x0] ?? 0;
        const c10 = corners[y0 * (grid + 1) + x1] ?? 0;
        const c01 = corners[y1 * (grid + 1) + x0] ?? 0;
        const c11 = corners[y1 * (grid + 1) + x1] ?? 0;
        const a = c00 * (1 - tx) + c10 * tx;
        const b = c01 * (1 - tx) + c11 * tx;
        out[y * size + x] = Math.max(0, Math.min(255, (a * (1 - ty) + b * ty) | 0));
      }
    }
    return out;
  }
}
