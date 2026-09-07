import * as THREE from "three";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { TXIPROCEDURETYPE } from "@/enums/graphics/txi/TXIPROCEDURETYPE";

export type TextureAnimUniformName = 'map' | 'normalMap' | 'bumpMap' | 'displacementMap';

interface TextureAnimSubscriber {
  material: THREE.ShaderMaterial | THREE.RawShaderMaterial;
  uniformName: TextureAnimUniformName;
}

interface TextureAnimEntry {
  /** gl_textures — one GPU texture per cycle frame. */
  frames: THREE.Texture[];
  /** CycleTIDTextureController special_field (fps). */
  fps: number;
  /** Current frame index — IncrementTIDIndex. */
  index: number;
  /** Accumulated delta since last advance. */
  accumulator: number;
  subscribers: TextureAnimSubscriber[];
}

/**
 * TextureAnimationManager — TXI proceduretype cycle playback.
 *
 * Ports CycleTIDTextureController Control and
 * texture IncrementTIDIndex.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file TextureAnimationManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TextureAnimationManager {
  private static entries: TextureAnimEntry[] = [];

  /**
   * Register a cycle-animated texture with a material uniform.
   * keeps controller state on the texture; we key by the frame array.
   */
  static register(
    texture: OdysseyTexture,
    material: THREE.Material,
    uniformName: TextureAnimUniformName
  ): void {
    if(!(material instanceof THREE.ShaderMaterial || material instanceof THREE.RawShaderMaterial)){
      return;
    }
    if(!texture?.txi || texture.txi.procedureType !== TXIPROCEDURETYPE.CYCLE){
      return;
    }

    const frames = (texture.cycleFrames?.length > 1)
      ? texture.cycleFrames
      : [texture];
    if(frames.length < 2){
      return;
    }

    const fps = (texture.txi.fps > 0) ? texture.txi.fps : 1;
    let entry = this.entries.find((e) => e.frames === frames || e.frames[0] === frames[0]);
    if(!entry){
      entry = {
        frames,
        fps,
        index: 0,
        accumulator: 0,
        subscribers: [],
      };
      this.entries.push(entry);
    }else{
      entry.fps = fps;
    }

    // Avoid duplicate subscribers for the same material+uniform
    const existing = entry.subscribers.find(
      (s) => s.material === material && s.uniformName === uniformName
    );
    if(!existing){
      entry.subscribers.push({ material, uniformName });
    }

    // Bind current frame immediately (IncrementTIDIndex equivalent)
    this.applyFrame(entry);
  }

  /** Remove all subscribers for a material (e.g. TXI reset / dispose). */
  static unregisterMaterial(material: THREE.Material): void {
    for(let i = this.entries.length - 1; i >= 0; i--){
      const entry = this.entries[i];
      entry.subscribers = entry.subscribers.filter((s) => s.material !== material);
      if(entry.subscribers.length === 0){
        this.entries.splice(i, 1);
      }
    }
  }

  /**
   * CycleTIDTextureController Control:
   * accum += deltaT;
   * if (accum > 1/fps) { accum = 0; index = (index+1) % (numY*numX); IncrementTIDIndex(index); }
   */
  static update(delta: number): void {
    if(delta <= 0 || this.entries.length === 0) return;

    for(let i = 0; i < this.entries.length; i++){
      const entry = this.entries[i];
      if(entry.subscribers.length === 0) continue;

      entry.accumulator += delta;
      const period = 1 / entry.fps;
      if(entry.accumulator > period){
        entry.accumulator = 0;
        entry.index = (entry.index + 1) % entry.frames.length;
        this.applyFrame(entry);
      }
    }
  }

  /** IncrementTIDIndex — current_tid = gl_textures[index]. */
  private static applyFrame(entry: TextureAnimEntry): void {
    const frame = entry.frames[entry.index];
    if(!frame) return;

    for(let i = 0; i < entry.subscribers.length; i++){
      const sub = entry.subscribers[i];
      const uniform = sub.material.uniforms?.[sub.uniformName];
      if(uniform){
        uniform.value = frame;
        // Keep uvTransform bound to the active frame's matrix (offset/repeat/wrap)
        if(sub.uniformName === 'map' && sub.material.uniforms.uvTransform){
          frame.updateMatrix();
          sub.material.uniforms.uvTransform.value = frame.matrix;
        }
        sub.material.uniformsNeedUpdate = true;
      }
      // Keep material.map / etc. in sync for THREE bookkeeping
      if(sub.uniformName === 'map'){
        (sub.material as any).map = frame;
      }else if(sub.uniformName === 'normalMap'){
        (sub.material as any).normalMap = frame;
      }else if(sub.uniformName === 'bumpMap'){
        (sub.material as any).bumpMap = frame;
      }else if(sub.uniformName === 'displacementMap'){
        (sub.material as any).displacementMap = frame;
      }
    }
  }

  static dispose(): void {
    this.entries.length = 0;
  }
}
