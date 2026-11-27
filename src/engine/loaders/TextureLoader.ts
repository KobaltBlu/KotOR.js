import * as THREE from 'three';
import * as path from "path";
import { PixelFormat } from "@core/enums/graphics/tpc/PixelFormat";
import { TextureType } from "@core/enums/loaders/TextureType";
import { ITextureLoaderQueuedRef } from "@engine/interface/loaders/ITextureLoaderQueuedRef";
import { TXIBlending } from "@core/enums/graphics/txi/TXIBlending";
import { TPCLoader } from "@engine/loaders/TPCLoader";
import { TGALoader } from "@engine/loaders/TGALoader";
import { OdysseyTexture } from "@engine/render/three/odyssey/OdysseyTexture";
import { OdysseyMaterialBuilder } from "@engine/render/three/odyssey/OdysseyMaterialBuilder";
import { syncOdysseyMapTransforms, enableOdysseyLightmapDefines } from "@engine/render/shaders/chunks/OdysseyLighting";
import { GameFileSystem } from "@core/filesystem/GameFileSystem";
import { GameEngineType } from "@core/enums/engine";

type onProgressCallback = (ref: ITextureLoaderQueuedRef, index: number, total: number) => void;

/**
 * TextureLoader class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TextureLoader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TextureLoader {

  static tpcLoader = new TPCLoader();
  static tgaLoader = new TGALoader();
  static textures = new Map();
  static guiTextures = new Map();
  static lightmaps: any = {};
  static particles: any = {};
  static queue: ITextureLoaderQueuedRef[] = [];
  static Anisotropy = 8;
  static loadInflight: Map<string, Promise<OdysseyTexture>> = new Map();
  static pendingSubscribers: Map<string, ITextureLoaderQueuedRef[]> = new Map();

  static GameKey: GameEngineType;
  
  static onAnisotropyChanged = () => {
    TextureLoader.textures.forEach( tex => {
      tex.anisotropy = TextureLoader.Anisotropy;
      tex.needsUpdate = true;
    });
  };
  
  static CACHE = false; //Should be false but it's causing isses if textures are cached
  static NOCACHE = true;

  static async Load(resRef: string, noCache: boolean = false): Promise<OdysseyTexture> {
    resRef = resRef.toLowerCase();
    if(!noCache && (TextureLoader.textures.has(resRef) || TextureLoader.guiTextures.has(resRef))){
      return TextureLoader.textures.get(resRef) ?? TextureLoader.guiTextures.get(resRef);
    }
    if(TextureLoader.loadInflight.has(resRef)){
      return TextureLoader.loadInflight.get(resRef);
    }
    const loadPromise = TextureLoader._load(resRef, noCache).finally(() => {
      TextureLoader.loadInflight.delete(resRef);
    });
    TextureLoader.loadInflight.set(resRef, loadPromise);
    return loadPromise;
  }

  private static async _load(resRef: string, noCache: boolean): Promise<OdysseyTexture> {
    const tga = await TextureLoader.tgaLoader.fetch(resRef);
    if(!!tga){
      tga.anisotropy = TextureLoader.Anisotropy;
      tga.wrapS = tga.wrapT = THREE.RepeatWrapping;
      TextureLoader.applySamplerStateToCycleFrames(tga);
      if(!noCache) TextureLoader.textures.set(resRef, tga);
      return tga;
    }

    const texture = await TextureLoader.tpcLoader.fetch(resRef);
    if(!!texture){
      texture.anisotropy = TextureLoader.Anisotropy;
      // Cubemaps keep GL_CLAMP_TO_EDGE set by TPCObject (CreateCubeTexture).
      if(!(texture as any).header?.isCubemap && !(texture as any).isCubeTexture){
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
      TextureLoader.applySamplerStateToCycleFrames(texture);
      if(!noCache){
        if(texture.pack === 0){
          TextureLoader.guiTextures.set(resRef, texture);
        }else{
          TextureLoader.textures.set(resRef, texture);
        }
      }
      return texture;
    }

    return undefined;
  }

  /**
   * CreateTexture applies wrap/filter to every cycle frame GL tid.
   * TextureLoader only configures the returned texture (frame 0); copy that sampler
   * state onto the rest of cycleFrames so animateuv scroll tiles correctly.
   */
  static applySamplerStateToCycleFrames(texture: OdysseyTexture): void {
    const frames = texture?.cycleFrames;
    if(!frames || frames.length < 2) return;
    for(let i = 0; i < frames.length; i++){
      const frame = frames[i];
      if(!frame || frame === texture) continue;
      frame.wrapS = texture.wrapS;
      frame.wrapT = texture.wrapT;
      frame.minFilter = texture.minFilter;
      frame.magFilter = texture.magFilter;
      frame.anisotropy = texture.anisotropy;
      frame.needsUpdate = true;
    }
  }

  static async LoadLocal(resRef: string, noCache: boolean = false): Promise<OdysseyTexture> {

    let dir = resRef;
    const tga_exists = await GameFileSystem.exists(path.join(dir, resRef));
    if(!tga_exists){ return undefined; }

    const tga = await TextureLoader.tgaLoader.fetchLocal(resRef);
    if(!tga){ return undefined; }

    tga.anisotropy = TextureLoader.Anisotropy;
    tga.wrapS = tga.wrapT = THREE.RepeatWrapping;

    if(!noCache)
      TextureLoader.textures.set(resRef, tga);

    return tga;
  }

  static async LoadLightmap(resRef: string, noCache: boolean = false){
    resRef = resRef.toLowerCase();
    if(TextureLoader.lightmaps.hasOwnProperty(resRef) && !noCache){
      return TextureLoader.lightmaps[resRef];
    }
    
    if(TextureLoader.GameKey == GameEngineType.TSL){
      const lightmap = await TextureLoader.tpcLoader.fetch(resRef);
      if(!lightmap){ return undefined; }

      lightmap.wrapS = lightmap.wrapT = THREE.RepeatWrapping;
      lightmap.anisotropy = TextureLoader.Anisotropy;

      TextureLoader.lightmaps[resRef] = lightmap;
      return TextureLoader.lightmaps[resRef];
    }else{
      const lightmap = await TextureLoader.tgaLoader.fetch(resRef);
      if(!lightmap){ return undefined; }

      lightmap.wrapS = lightmap.wrapT = THREE.RepeatWrapping;
      lightmap.anisotropy = TextureLoader.Anisotropy;

      TextureLoader.lightmaps[resRef] = lightmap;
      return TextureLoader.lightmaps[resRef];
    }
  }

  static enQueue(name: string|string[], material: THREE.Material, type = TextureType.TEXTURE, onLoad?: Function, fallback?: string, uniformName?: string){
    if(typeof name == 'string' && name.length){
      name = name.toLowerCase();
      const obj = { name: name, material: material, type: type, fallback: fallback, onLoad: onLoad, uniformName: uniformName } as ITextureLoaderQueuedRef;
      const cached = TextureLoader.textures.get(name) ?? TextureLoader.guiTextures.get(name);
      if(cached){
        // onLoad runs from UpdateMaterial after assignMaterialTexture (material.map / GUI_SORT).
        // Calling onLoad here raced ahead of that bind and caused opaque GUI text for a few frames.
        void TextureLoader.UpdateMaterial(obj);
      }else if(type === TextureType.TEXTURE && TextureLoader.pendingSubscribers.has(name)){
        TextureLoader.pendingSubscribers.get(name).push(obj);
      }else{
        if(type === TextureType.TEXTURE)
          TextureLoader.pendingSubscribers.set(name, [obj]);
        TextureLoader.queue.push(obj);
      }
    }else if(Array.isArray(name)){
      for(let i = 0, len = name.length; i < len; i++){
        const texName = name[i].toLowerCase();
        const obj = { name: texName, material: material, type: type, fallback: fallback, onLoad: onLoad, uniformName: uniformName } as ITextureLoaderQueuedRef;
        const cached = TextureLoader.textures.get(texName) ?? TextureLoader.guiTextures.get(texName);
        if(cached){
          void TextureLoader.UpdateMaterial(obj);
        }else if(type === TextureType.TEXTURE && TextureLoader.pendingSubscribers.has(texName)){
          TextureLoader.pendingSubscribers.get(texName).push(obj);
        }else{
          if(type === TextureType.TEXTURE)
            TextureLoader.pendingSubscribers.set(texName, [obj]);
          TextureLoader.queue.push(obj);
        }
      }
    }else{
      console.warn('unhandled enQueue', name);
      console.log('enQueue', name, material, type);
    }
  }

  /** Assign a texture to either `map` or a named chrome uniform on a ShaderMaterial. */
  static assignMaterialTexture(material: THREE.Material, texture: THREE.Texture | null, uniformName?: string){
    if(!(material instanceof THREE.Material)) return;
    const slot = uniformName && uniformName.length ? uniformName : 'map';
    if(material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial){
      if(material.uniforms?.[slot]){
        material.uniforms[slot].value = texture;
      }
      if(slot === 'map'){
        material.defines = material.defines || {};
        if(texture instanceof THREE.Texture){
          material.defines.USE_MAP = '';
          syncOdysseyMapTransforms(material.uniforms, 'map', texture);
        }else{
          delete material.defines.USE_MAP;
        }
      }else if(texture instanceof THREE.Texture){
        syncOdysseyMapTransforms(material.uniforms, slot, texture);
      }
      const hasKey = 'has' + slot.charAt(0).toUpperCase() + slot.slice(1);
      if(material.uniforms?.[hasKey]){
        material.uniforms[hasKey].value = texture instanceof THREE.Texture ? 1 : 0;
      }
      material.uniformsNeedUpdate = true;
      material.needsUpdate = true;
    }else if(
      material instanceof THREE.MeshBasicMaterial ||
      material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshPhongMaterial ||
      material instanceof THREE.MeshLambertMaterial ||
      material instanceof THREE.SpriteMaterial
    ){
      material.map = texture;
      material.needsUpdate = true;
    }
  }

  static enQueueParticle(name: string, partGroup: any, onLoad?: Function){
    name = name.toLowerCase();
    TextureLoader.queue.push({ name: name, partGroup: partGroup, type: TextureType.PARTICLE, onLoad: onLoad });
  }

  static async LoadQueue(onProgress?: onProgressCallback){
    const queue = TextureLoader.queue.slice(0);
    const subscriberMap = TextureLoader.pendingSubscribers;
    TextureLoader.queue = [];
    TextureLoader.pendingSubscribers = new Map();

    const promises = queue.map(async (primaryTex) => {
      await TextureLoader.UpdateMaterial(primaryTex);
      const allSubs = subscriberMap.get(primaryTex.name);
      if(allSubs && allSubs.length > 1){
        await Promise.all(allSubs.slice(1).map(sub => TextureLoader.UpdateMaterial(sub)));
      }
    });
    await Promise.all(promises);
    for(let i = 0; i < queue.length; i++){
      if(typeof onProgress == 'function'){
        onProgress(queue[i], i, promises.length);
      }
    }
  }

  static async UpdateMaterial(tex: ITextureLoaderQueuedRef){
    switch(tex.type){
      case TextureType.TEXTURE:
        let texture: OdysseyTexture = await TextureLoader.Load(tex.name, TextureLoader.CACHE);
        if(!!texture && tex.material instanceof THREE.Material){

          TextureLoader.assignMaterialTexture(tex.material, texture, tex.uniformName);

          /*
            //Obsolete now that the alpha value was discovered in the TPC Header
            //This was causing all DTX5 textures to enable transparency even if they were opaque
            //This lead to bad issues with auto sorting objects in the renderer because opaque and
            //objects with transparency need to be on separate layers when rendering to keep everything
            //blending smoothly. I'm leaving the commented code below just because :/
          
            if(texture.format == THREE.RGBA_S3TC_DXT5_Format){
              tex.material.transparent = true;
            }
          */

          await TextureLoader.ParseTXI(texture, tex);

          //Check to see if alpha value is set in the TPC Header
          //I think this has to do with alphaTesting... Not sure...
          if(typeof texture.header === 'object'){
            // An object-level envmap override consumes texture alpha as the reflection
            // mask (RenderEnvironmentMapped), the same as a TXI envmap.
            if(texture.header.alphaTest != 1 && texture.txi.envMapTexture == null && !tex.material.userData?.envMapOverride){
              if(texture.txi.blending != TXIBlending.PUNCHTHROUGH){
                tex.material.transparent = true;
              }
              
              if(texture.txi.blending == TXIBlending.ADDITIVE){
                //tex.material.alphaTest = 0;
              }

              if( (texture.header.alphaTest && texture.header.format != PixelFormat.DXT5) || texture.txi.blending == TXIBlending.PUNCHTHROUGH){
                if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
                  tex.material.alphaTest = texture.header.alphaTest;
                  if(tex.material.uniforms?.alphaTest){
                    tex.material.uniforms.alphaTest.value = texture.header.alphaTest;
                  }
                }
                tex.material.transparent = false;
              }

              //if(!texture.txi.blending)
              // tex.material.alphaTest = texture.header.alphaTest;
            }
          }

          if(tex.material && tex.material.defines?.hasOwnProperty('GUI_SORT')){
            tex.material.depthTest = false;
            tex.material.depthWrite = false;
            tex.material.transparent = true;
          }

          //tex.material.needsUpdate = true;
          if(typeof tex.onLoad == 'function')
            tex.onLoad(texture, tex)
        }else if(!texture && !!tex.fallback){
          let fallback: OdysseyTexture = await TextureLoader.Load(tex.fallback, TextureLoader.CACHE);
          if(!!fallback && tex.material instanceof THREE.Material){

            TextureLoader.assignMaterialTexture(tex.material, fallback, tex.uniformName);

            /*
              //Obsolete now that the alpha value was discovered in the TPC Header
              //This was causing all DTX5 textures to enable transparency even if they were opaque
              //This lead to bad issues with auto sorting objects in the renderer because opaque and
              //objects with transparency need to be on separate layers when rendering to keep everything
              //blending smoothly. I'm leaving the commented code below just because :/
            
              if(fallback.format == THREE.RGBA_S3TC_DXT5_Format){
                tex.material.transparent = true;
              }
            */

            await TextureLoader.ParseTXI(fallback, tex);

            //Check to see if alpha value is set in the TPC Header
            //I think this has to do with alphaTesting... Not sure...
            if(typeof fallback.header === 'object'){
              if(fallback.header.alphaTest != 1 && fallback.txi.envMapTexture == null && !tex.material.userData?.envMapOverride){
                if(fallback.txi.blending != TXIBlending.PUNCHTHROUGH){
                  tex.material.transparent = true;
                }
                if(fallback.txi.blending == TXIBlending.ADDITIVE){
                  //tex.material.alphaTest = 0;
                }
                //tex.material.alphaTest = fallback.header.alphaTest;
              }
            }

            //tex.material.needsUpdate = true;
          }

          if(typeof tex.onLoad == 'function')
            tex.onLoad(texture, tex)
        }else{
          if(typeof tex.onLoad == 'function')
            tex.onLoad(texture, tex)
        }
      break;
      case TextureType.LIGHTMAP:
        let lightmap: OdysseyTexture = await TextureLoader.LoadLightmap(tex.name, TextureLoader.CACHE);
        if(!!lightmap){
          if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
            tex.material.uniforms.lightMap.value = lightmap;
            syncOdysseyMapTransforms(tex.material.uniforms, 'lightMap', lightmap);
            if(tex.material.uniforms.map.value){
              syncOdysseyMapTransforms(tex.material.uniforms, 'map', tex.material.uniforms.map.value);
            }
            enableOdysseyLightmapDefines(tex.material, true);
            // Do not enable USE_ENVMAP here — lightmaps are independent of cubemaps,
            // and a null envMap with reflectivity=1 can corrupt shading.
            delete tex.material.defines.IGNORE_LIGHTING;
            tex.material.defines.AURORA = "";
            tex.material.uniformsNeedUpdate = true;
          }else if(
            tex.material instanceof THREE.MeshBasicMaterial ||
            tex.material instanceof THREE.MeshStandardMaterial ||
            tex.material instanceof THREE.MeshPhongMaterial ||
            tex.material instanceof THREE.MeshLambertMaterial
          ){
            tex.material.lightMap = lightmap;
          }
          
          tex.material.needsUpdate = true;
        }else{
          if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
            delete tex.material.defines.IGNORE_LIGHTING;
            tex.material.uniformsNeedUpdate = true;
          }
        }

        if(typeof tex.onLoad == 'function')
          tex.onLoad(lightmap, tex)
      break;
      case TextureType.PARTICLE:
        let particle_texture = await TextureLoader.Load(tex.name, TextureLoader.CACHE);
        if(!!particle_texture){
          if(tex.partGroup?.type == 'OdysseyEmitter'){
            tex.partGroup.material.uniforms.map.value = particle_texture;
            tex.partGroup.material.defines = tex.partGroup.material.defines || {};
            tex.partGroup.material.defines.USE_MAP = '';
            tex.partGroup.material.depthWrite = false;
            tex.partGroup.material.needsUpdate = true;
          }else{
            tex.partGroup.material.uniforms.texture.value = particle_texture;
            tex.partGroup.material.map = particle_texture;
            tex.partGroup.material.depthWrite = false;
            tex.partGroup.material.needsUpdate = true;
          }
        }

        if(typeof tex.onLoad == 'function')
          tex.onLoad(texture, tex)
      break;
      default:
        console.warn('TextureLoader.UpdateMaterial: Unhandled Texture Type', tex);
      break;
    }
  }

  static ParseTXI(texture: OdysseyTexture, tex: ITextureLoaderQueuedRef){
    if(!texture.txi || !tex.material) return Promise.resolve();

    return OdysseyMaterialBuilder.applyTXIToMaterial(
      texture,
      tex.material,
      {
        resolveTexture: (resRef: string, noCache?: boolean) => TextureLoader.Load(resRef, !!noCache),
      },
    ).catch((e) => {
      console.error("TextureLoader.parseTXI", e);
    });
  }


}

TGALoader.TextureLoader = TextureLoader;
