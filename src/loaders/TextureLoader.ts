import * as THREE from 'three';
import * as path from "path";
import { AsyncLoop } from '../utility/AsyncLoop';
import { PixelFormat } from '../enums/graphics/tpc/PixelFormat';
import { TextureType } from '../enums/loaders/TextureType';
import { ITextureLoaderQueuedRef } from '../interface/loaders/ITextureLoaderQueuedRef';
import { TXIBlending } from '../enums/graphics/txi/TXIBlending';
import { TPCLoader } from './TPCLoader';
import { TGALoader } from './TGALoader';
import { OdysseyTexture } from '../three/odyssey/OdysseyTexture';
import { GameFileSystem } from '../utility/GameFileSystem';
import { TXIPROCEDURETYPE } from '../enums/graphics/txi/TXIPROCEDURETYPE';
import { GameEngineType } from '../enums/engine';
import { ResourceLoader } from './ResourceLoader';

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
    if(TextureLoader.textures.has(resRef) || TextureLoader.guiTextures.has(resRef) && !noCache){
      return (TextureLoader.textures.has(resRef) ? TextureLoader.textures.get(resRef) : TextureLoader.guiTextures.has(resRef) ? TextureLoader.guiTextures.get(resRef) : undefined)
    }

    const tga = await TextureLoader.tgaLoader.fetch(resRef);
    if(!!tga){
      tga.anisotropy = TextureLoader.Anisotropy;
      tga.wrapS = tga.wrapT = THREE.RepeatWrapping;

      if(!noCache) TextureLoader.textures.set(resRef, tga);
      return tga;
    }
    
    const texture = await TextureLoader.tpcLoader.fetch(resRef);
    if(!!texture){
      texture.anisotropy = TextureLoader.Anisotropy;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

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

  static enQueue(name: string|string[], material: THREE.Material, type = TextureType.TEXTURE, onLoad?: Function, fallback?: string){
    if(typeof name == 'string' && name.length){
      name = name.toLowerCase();
      const obj = { name: name, material: material, type: type, fallback: fallback, onLoad: onLoad } as ITextureLoaderQueuedRef;
      if(TextureLoader.textures.has(name)){
        TextureLoader.UpdateMaterial(obj);
        if(typeof onLoad == 'function')
          onLoad(TextureLoader.textures.get(name), obj)
      }else{
        TextureLoader.queue.push(obj);
      }
    }else if(Array.isArray(name)){
      for(let i = 0, len = name.length; i < len; i++){
        const texName = name[i].toLowerCase();
        const obj = { name: texName, material: material, type: type, fallback: fallback, onLoad: onLoad } as ITextureLoaderQueuedRef;
        if(TextureLoader.textures.has(texName)){
          TextureLoader.UpdateMaterial(obj);
          if(typeof onLoad == 'function')
            onLoad(TextureLoader.textures.get(texName), obj)
        }else{
          TextureLoader.queue.push(obj);
        }
      }
    }else{
      console.warn('unhandled enQueue', name);
      console.log('enQueue', name, material, type);
    }
  }

  static enQueueParticle(name: string, partGroup: any, onLoad?: Function){
    name = name.toLowerCase();
    TextureLoader.queue.push({ name: name, partGroup: partGroup, type: TextureType.PARTICLE, onLoad: onLoad });
  }

  static LoadQueue(onLoad?: Function, onProgress?: onProgressCallback){
    let queue = TextureLoader.queue.slice(0);
    TextureLoader.queue = [];
    let loop = new AsyncLoop({
      array: queue,
      onLoop: async (tex: ITextureLoaderQueuedRef, asyncLoop: AsyncLoop, index: number, count: number) => {
        await TextureLoader.UpdateMaterial(tex);
        if(typeof onProgress == 'function'){
          onProgress(tex, index, count);
        }
        asyncLoop.next();
      }
    });
    loop.iterate(() => {
      if(typeof onLoad === 'function')
        onLoad();
    });
  }

  static async UpdateMaterial(tex: ITextureLoaderQueuedRef){
    switch(tex.type){
      case TextureType.TEXTURE:
        let texture: OdysseyTexture = await TextureLoader.Load(tex.name, TextureLoader.CACHE);
        if(!!texture && tex.material instanceof THREE.Material){

          if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
            //console.log('THREE.RawShaderMaterial', tex);
            tex.material.uniforms.map.value = texture;
            (tex.material as any).map = texture;
            tex.material.uniformsNeedUpdate = true;
            tex.material.needsUpdate = true; //This is required for cached textures. If not models will not update with a cached texture
          }else{
            (tex.material as any).map = texture;
            (tex.material as any).needsUpdate = true; //This is required for cached textures. If not models will not update with a cached texture
          }

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
            if(texture.header.alphaTest != 1 && texture.txi.envMapTexture == null){
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
              //  tex.material.alphaTest = texture.header.alphaTest;
            }
          }

          //tex.material.needsUpdate = true;
          if(typeof tex.onLoad == 'function')
            tex.onLoad(texture, tex)
        }else if(!texture && !!tex.fallback){
          let fallback: OdysseyTexture = await TextureLoader.Load(tex.fallback, TextureLoader.CACHE);
          if(!!fallback && tex.material instanceof THREE.Material){

            if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
              //console.log('THREE.RawShaderMaterial', tex);
              tex.material.uniforms.map.value = fallback;
              (tex.material as any).map = fallback;
              tex.material.uniformsNeedUpdate = true;
              tex.material.needsUpdate = true; //This is required for cached textures. If not models will not update with a cached texture
            }else{
              (tex.material as any).map = fallback;
              (tex.material as any).needsUpdate = true; //This is required for cached textures. If not models will not update with a cached texture
            }

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
              if(fallback.header.alphaTest != 1 && fallback.txi.envMapTexture == null){
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
            (tex.material as any).lightMap = lightmap;
            lightmap.updateMatrix();
            if(tex.material.uniforms.map.value){
              tex.material.uniforms.map.value.updateMatrix();
            }
            tex.material.defines.USE_LIGHTMAP = '';
            tex.material.defines.USE_ENVMAP = '';
            tex.material.defines.ENVMAP_TYPE_CUBE = '';
            delete tex.material.defines.IGNORE_LIGHTING;
            tex.material.defines.AURORA = "";
            tex.material.uniformsNeedUpdate = true;
          }else{
            (tex.material as any).lightMap = lightmap;
            (tex.material as any).defines = (tex.material as any).defines || {};
            if((tex.material as any).defines.hasOwnProperty('IGNORE_LIGHTING')){
              delete (tex.material as any).defines.IGNORE_LIGHTING;
            }
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
            (tex.partGroup.material as any).map = particle_texture;
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
    //console.log('ParseTXI', texture.txi);
    if(!texture.txi) return;

    return new Promise<void>( async (resolve, reject) => {
      try{
        //ENVMAP
        if(!!texture.txi.envMapTexture){
          let envmap: OdysseyTexture = await TextureLoader.Load(texture.txi.envMapTexture, TextureLoader.NOCACHE);
          if(!!envmap){
            envmap.wrapS = envmap.wrapT = THREE.RepeatWrapping;

            if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
              tex.material.uniforms.envMap.value = envmap;
              (tex.material as any).envMap = envmap;
              envmap.updateMatrix();
              if(tex.material.uniforms.map.value){
                tex.material.uniforms.map.value.updateMatrix();
              }
              tex.material.defines.USE_ENVMAP = '';
              tex.material.defines.ENVMAP_TYPE_CUBE = '';
              tex.material.defines.ENVMAP_MODE_REFLECTION = '';
              tex.material.defines.ENVMAP_BLENDING_ADD = '';
              tex.material.uniformsNeedUpdate = true;
            }else{
              (tex.material as any).envMap = envmap;
            }

            //tex.material.alphaMap = texture;
            
            //if(tex.material.opacity == 1)
              //tex.material.transparent = false;

            tex.material.side = THREE.FrontSide;
            if(texture.txi.waterAlpha == null){
              (tex.material as any).combine = THREE.AddOperation;
              (tex.material as any).reflectivity = 1;
            }
            tex.material.needsUpdate = true;

            if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
              if(tex.material.defines.hasOwnProperty('HOLOGRAM')){
                //tex.material.alphaTest = 1;
                (tex.material as any).combine = THREE.AddOperation;
                tex.material.blending = THREE['NormalBlending'];
                tex.material.transparent = true;
                tex.material.uniformsNeedUpdate = true;
              }
            }

            //tex.material.map.flipY = true;
          }else{
            console.error(`Envmap missing: ${texture.txi.envMapTexture}`);
          }
        }

        //BUMPMAP
        if(!!texture.txi.bumpMapTexture){
          let bumpMap: OdysseyTexture = await TextureLoader.Load(texture.txi.bumpMapTexture, TextureLoader.CACHE);
          if(!!bumpMap){
            bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
            
            if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
              if(bumpMap.txi.procedureType){
                switch(bumpMap.txi.procedureType){
                  case TXIPROCEDURETYPE.CYCLE:
                    tex.material.defines.CYCLE = '';
                  break;
                  case TXIPROCEDURETYPE.RANDOM:
                    tex.material.defines.RANDOM = '';
                  break;
                  case TXIPROCEDURETYPE.RINGTEXDISTORT:
                    tex.material.defines.RINGTEXDISTORT = '';
                  break;
                  case TXIPROCEDURETYPE.WATER:
                    tex.material.defines.WATER = '';
                  break;
                }
              }

              if(tex.material.uniforms.animationVector){
                if(bumpMap.txi.numx){
                  tex.material.uniforms.animationVector.value.x = bumpMap.txi.numx;
                  bumpMap.repeat.x = 1 / tex.material.uniforms.animationVector.value.x;
                  bumpMap.updateMatrix();
                }

                if(bumpMap.txi.numy){
                  tex.material.uniforms.animationVector.value.y = bumpMap.txi.numy;
                  bumpMap.repeat.y = 1 / tex.material.uniforms.animationVector.value.y;
                  bumpMap.updateMatrix();
                }

                if(bumpMap.txi.numx && bumpMap.txi.numy){
                  tex.material.uniforms.animationVector.value.z = bumpMap.txi.numx * bumpMap.txi.numy;
                }

                if(bumpMap.txi.fps){
                  tex.material.uniforms.animationVector.value.w = bumpMap.txi.fps;
                }
              }
            }

            (bumpMap as any).material = tex.material;

            if(bumpMap.bumpMapType == 'NORMAL'){

              if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
                tex.material.uniforms.normalMap.value = bumpMap;
                tex.material.defines.USE_NORMALMAP = '';
                tex.material.uniformsNeedUpdate = true;
                (tex.material as any).vertexTangents = true;
                (tex.material as any).normalMapType = THREE.TangentSpaceNormalMap;
                tex.material.defines['TANGENTSPACE_NORMALMAP'] = '';
              }else{
                (tex.material as any).normalMap = bumpMap;
                (tex.material as any).normalMapType = THREE.ObjectSpaceNormalMap;
                (tex.material as any).defines['OBJECTSPACE_NORMALMAP'] = '';
              }

              tex.material.transparent = false;

            }else{

              if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
                tex.material.uniforms.bumpMap.value = bumpMap;
                tex.material.defines.USE_BUMPMAP = '';
                tex.material.uniformsNeedUpdate = true;
              }else{
                (tex.material as any).bumpMap = bumpMap;
              }
              tex.material.uniforms.bumpScale.value = bumpMap.txi.bumpMapScaling;

            }

            if(texture.txi.waterAlpha != null){
              tex.material.defines = tex.material.defines || {};
              tex.material.defines.WATER = "";
              tex.material.defines.USE_DISPLACEMENTMAP = "";
              tex.material.defines.ENVMAP_BLENDING_MIX = ''
              delete tex.material.defines.USE_NORMALMAP;
              delete tex.material.defines.ENVMAP_BLENDING_ADD;
              (tex.material as any).combine = THREE.MixOperation;
              //tex.material.bumpMap.flipY = false;

              tex.material.uniforms.bumpMap.value.minFilter = THREE.LinearFilter;
              tex.material.uniforms.bumpMap.value.magFilter = THREE.LinearFilter;
              tex.material.uniforms.bumpMap.value.generateMipmaps = false;

              tex.material.uniforms.bumpScale.value = bumpMap.txi.bumpMapScaling * 0.1;
              //tex.material.uniforms.displacementMap.value = tex.material.uniforms.bumpMap.value;
              //tex.material.uniforms.displacementScale.value = tex.material.uniforms.bumpScale.value;
              tex.material.uniforms.reflectivity.value = 1;
              tex.material.transparent = true;
              tex.material.premultipliedAlpha = false;
              tex.material.needsUpdate = true;

              tex.material.blending = THREE.AdditiveBlending;

              tex.material.uniforms.waterAlpha.value = texture.txi.waterAlpha;
              // tex.material.uniforms.waterTransform.value = bumpMap.matrix;

              tex.material.uniforms.animationVector.value.x = bumpMap.txi.numx;
              tex.material.uniforms.animationVector.value.y = bumpMap.txi.numy;
              tex.material.uniforms.animationVector.value.z = bumpMap.txi.numx * bumpMap.txi.numy;
              tex.material.uniforms.animationVector.value.w = bumpMap.txi.fps;
            }

          }
        }

        if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
          if(tex.material.uniforms.map.value){
            tex.material.name += tex.material.uniforms.map.value.name
            tex.material.defines.USE_MAP = '';
            tex.material.uniforms.uvTransform.value = tex.material.uniforms.map.value.matrix;
            tex.material.uniforms.map.value.updateMatrix();
            tex.material.uniformsNeedUpdate = true;
          }

          if(texture.txi.procedureType){
            switch(texture.txi.procedureType){
              case TXIPROCEDURETYPE.CYCLE:
                tex.material.defines.CYCLE = '';
              break;
              case TXIPROCEDURETYPE.RANDOM:
                tex.material.defines.RANDOM = '';
              break;
              case TXIPROCEDURETYPE.RINGTEXDISTORT:
                tex.material.defines.RINGTEXDISTORT = '';
              break;
              case TXIPROCEDURETYPE.WATER:
                tex.material.defines.WATER = '';
              break;
            }
          }
    
          if(tex.material.uniforms.animationVector){
            if(texture.txi.numx){
              tex.material.uniforms.animationVector.value.x = texture.txi.numx;
              texture.repeat.x = 1 / tex.material.uniforms.animationVector.value.x;
              texture.updateMatrix();
            }
      
            if(texture.txi.numy){
              tex.material.uniforms.animationVector.value.y = texture.txi.numy;
              texture.repeat.y = 1 / tex.material.uniforms.animationVector.value.y;
              texture.updateMatrix();
            }
      
            if(texture.txi.numx && texture.txi.numy){
              tex.material.uniforms.animationVector.value.z = texture.txi.numx * texture.txi.numy;
            }
      
            if(texture.txi.fps){
              tex.material.uniforms.animationVector.value.w = texture.txi.fps;
            }
          }
        }

        //DECAL
        if(texture.txi.decal || texture.txi.procedureType == 2){
          tex.material.side = THREE.DoubleSide;
          tex.material.depthWrite = false;
          tex.material.transparent = true;
          //For Saber Blades
          tex.material.defines.IGNORE_LIGHTING = '';
        }

        //BLENDING
        switch(texture.txi.blending){
          case TXIBlending.ADDITIVE:
            tex.material.transparent = true;
            tex.material.blending = THREE['AdditiveBlending'];
            //tex.material.alphaTest = 0;//0.5;
            //tex.material.side = THREE.DoubleSide; //DoubleSide is causing issues with windows in TSL and elsewhere
          break;
          case TXIBlending.PUNCHTHROUGH:
            tex.material.transparent = false;
            tex.material.blending = THREE['NormalBlending'];
            //tex.material.alphaTest = texture.header.alphaTest || GameState.AlphaTest;//0.5;
          break;
        }

        //tex.material.transparent = true;
        resolve();
      }catch(e){
        console.error('TextureLoader.parseTXI', e);
        resolve();
      }
    });
  }


}

TGALoader.TextureLoader = TextureLoader;
