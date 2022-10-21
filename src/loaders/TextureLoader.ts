/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from 'three';
import * as path from "path";
import { GameState } from '../GameState';
import { ApplicationProfile } from '../utility/ApplicationProfile';
import { AsyncLoop } from '../utility/AsyncLoop';
import { PixelFormat } from '../enums/graphics/tpc/PixelFormat';
import { AnimatedTexture } from '../AnimatedTexture';
import { TextureType } from '../enums/loaders/TextureType';
import { TextureLoaderQueuedRef } from '../interface/loaders/TextureLoaderQueuedRef';
import { TXIBlending } from '../enums/graphics/txi/TXIBlending';
import { OdysseyTexture } from '../resource/OdysseyTexture';
import { TPCLoader } from './TPCLoader';
import { TGALoader } from './TGALoader';
import { OdysseyEmitter3D } from '../three/odyssey';
import { GameFileSystem } from '../utility/GameFileSystem';

/* @file
 * The TextureLoader class.
 */

export class TextureLoader {

  static tpcLoader = new TPCLoader();
  static tgaLoader = new TGALoader();
  static textures = new Map();
  static guiTextures = new Map();
  static lightmaps: any = {};
  static particles: any = {};
  static queue: TextureLoaderQueuedRef[] = [];
  static Anisotropy = 8;
  static TextureQuality = 2;
  
  static onAnisotropyChanged = () => {
    TextureLoader.textures.forEach( tex => {
      tex.anisotropy = TextureLoader.Anisotropy;
      tex.needsUpdate = true;
    });
  };
  
  static CACHE = false; //Should be false but it's causing isses if textures are cached
  static NOCACHE = true;

  static Load(name: string, onLoad?: Function, noCache: boolean = false){
    name = name.toLowerCase();
    //console.log('texture-load', name);
    if(TextureLoader.textures.has(name) || TextureLoader.guiTextures.has(name) && !noCache){
      //console.log('fetch-', TextureLoader.textures.get(name), name, onLoad, noCache);
      if(onLoad != null)
        onLoad(TextureLoader.textures.has(name) ? TextureLoader.textures.get(name) : TextureLoader.guiTextures.has(name) ? TextureLoader.guiTextures.get(name) : undefined);

    }else{

      TextureLoader.LoadOverride(name, (texture: OdysseyTexture) => {
        //console.log('override', name, texture);
        if(texture != null){
          texture.anisotropy = TextureLoader.Anisotropy;
          if(onLoad != null)
            onLoad(texture);

        }else{

          TextureLoader.tpcLoader.fetch(name, (texture: OdysseyTexture) => {
            //console.log('tpc', name, texture);
            if(texture != null){
              texture.anisotropy = TextureLoader.Anisotropy;
              //console.log('fetch', texture);
              texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

              if(!noCache){
                if(texture.pack === 0){
                  TextureLoader.guiTextures.set(name, texture);
                }else{
                  TextureLoader.textures.set(name, texture);
                }
              }

              if(onLoad != null)
                onLoad(texture);
            }else{
              //console.log('tga', name)
              TextureLoader.tgaLoader.load(name, (tga: OdysseyTexture) => {

                if(tga != null){
                  tga.anisotropy = TextureLoader.Anisotropy;
                  tga.wrapS = tga.wrapT = THREE.RepeatWrapping;

                  if(!noCache)
                    TextureLoader.textures.set(name, tga);
                }

                if(onLoad != null)
                  onLoad(tga);

              });

            }
          });

        }

      }, undefined, noCache);

    }

  }

  static LoadOverride(name: string, onLoad?: Function, onError?: Function, noCache: boolean = false){

    let dir = 'Override';

    if(GameState.Flags.EnableOverride){

      GameFileSystem.exists(path.join(dir, name+'.tpc')).then( (tpc_exists) => {
        if (tpc_exists) {

          TextureLoader.tpcLoader.fetch_override(name, (texture: OdysseyTexture) => {
            if(texture != null){
              texture.anisotropy = TextureLoader.Anisotropy;
              //console.log('fetch', texture);
              texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    
              if(!noCache)
                TextureLoader.textures.set(name, texture);
    
              if(typeof onLoad === 'function')
                onLoad(texture);
            }else{
              if(typeof onLoad === 'function')
                onLoad(null);
            }
          });
          
        }else{

          GameFileSystem.exists(path.join(dir, name+'.tga')).then( (tga_exists) => {
            if (tga_exists) {
              TextureLoader.tgaLoader.load_override(name, (tga: OdysseyTexture) => {
                tga.anisotropy = TextureLoader.Anisotropy;
                
                if(tga != null){
                  tga.wrapS = tga.wrapT = THREE.RepeatWrapping;

                  if(!noCache)
                    TextureLoader.textures.set(name, tga);;
                }

                if(onLoad != null)
                  onLoad(tga);

              });
            }else{
              if(typeof onLoad === 'function')
                onLoad(null);
            }
          });

        }
      });

    }else{
      //Skip the override check and pass back a null value
      if(typeof onLoad === 'function')
        onLoad(null);
    }

  }

  static LoadLocal(name: string, onLoad?: Function, onError?: Function, noCache: boolean = false){

    let dir = name;

    GameFileSystem.exists(path.join(dir, name)).then( (tga_exists) => {
      if (tga_exists) {
        TextureLoader.tgaLoader.load_local(name, (tga: OdysseyTexture) => {
          tga.anisotropy = TextureLoader.Anisotropy;
          
          if(tga != null){
            tga.wrapS = tga.wrapT = THREE.RepeatWrapping;

            if(!noCache)
              TextureLoader.textures.set(name, tga);
          }

          if(onLoad != null)
            onLoad(tga);

        });
      }else{
        if(typeof onLoad === 'function')
          onLoad(null);
      }
    });

  }

  static LoadLightmap(name: string, onLoad?: Function, noCache: boolean = false){
    name = name.toLowerCase();
    if(TextureLoader.lightmaps.hasOwnProperty(name) && !noCache){
      //console.log('fetch-', TextureLoader.textures[name]);
      if(onLoad != null)
        onLoad(TextureLoader.lightmaps[name]);

    }else{

      if(GameState.GameKey == 'TSL'){
        TextureLoader.tpcLoader.fetch(name, (lightmap: OdysseyTexture) => {
          //console.log('fetch', texture);
          if(lightmap != null){
            lightmap.wrapS = lightmap.wrapT = THREE.RepeatWrapping;
            lightmap.anisotropy = TextureLoader.Anisotropy;
          }
  
          TextureLoader.lightmaps[name] = lightmap;
          if(onLoad != null)
            onLoad(TextureLoader.lightmaps[name]);
        });
      }else{
        TextureLoader.tgaLoader.load(name, (lightmap: OdysseyTexture) => {
          //console.log('fetch', texture);
          if(lightmap != null){
            lightmap.wrapS = lightmap.wrapT = THREE.RepeatWrapping;
            lightmap.anisotropy = TextureLoader.Anisotropy;
          }
  
          TextureLoader.lightmaps[name] = lightmap;
          if(onLoad != null)
            onLoad(TextureLoader.lightmaps[name]);
        });
      }      
    }
  }

  static enQueue(name: string|string[], material: THREE.Material, type = TextureType.TEXTURE, onLoad?: Function, fallback?: string){

    if(typeof name == 'string'){
      name = name.toLowerCase();
      let obj = { name: name, material: material, type: type, fallback: fallback, onLoad: onLoad } as TextureLoaderQueuedRef;
      if(TextureLoader.textures.has(name)){
        setTimeout(() => {
          TextureLoader.UpdateMaterial(obj);
          if(typeof onLoad == 'function')
            onLoad(TextureLoader.textures.get(name), obj)
        }, 0);
      }else{
        TextureLoader.queue.push(obj);
      }
    }else if(Array.isArray(name)){
      for(let i = 0, len = name.length; i < len; i++){
        let texName = name[i].toLowerCase();
        let obj = { name: texName, material: material, type: type, fallback: fallback, onLoad: onLoad } as TextureLoaderQueuedRef;
        if(TextureLoader.textures.has(texName)){
          TextureLoader.UpdateMaterial(obj);
          if(typeof onLoad == 'function')
            onLoad(TextureLoader.textures.get(texName), obj)
        }else{
          TextureLoader.queue.push(obj);
        }
      }
    }
  }

  static enQueueParticle(name: string, partGroup: any, onLoad?: Function){
    name = name.toLowerCase();
    TextureLoader.queue.push({ name: name, partGroup: partGroup, type: TextureType.PARTICLE, onLoad: onLoad });
  }

  static LoadQueue(onLoad?: Function, onProgress?: Function){

    
    let loop = new AsyncLoop({
      array: TextureLoader.queue.slice(0),
      onLoop: (tex: TextureLoaderQueuedRef, asyncLoop: AsyncLoop, index: number, count: number) => {

        if(typeof onProgress == 'function'){
          onProgress(tex.name, index, count);
        }

        //console.log('loadTex', tex.name);

        TextureLoader.UpdateMaterial(tex);
        asyncLoop.next();

      }
    });
    loop.iterate(() => {

      //let queue = TextureLoader.queue.slice(0);
      TextureLoader.queue = [];

      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  static UpdateMaterial(tex: TextureLoaderQueuedRef){
    
    switch(tex.type){
      case TextureType.TEXTURE:
        TextureLoader.Load(tex.name, (texture: OdysseyTexture) => {
          if(texture != null && tex.material instanceof THREE.Material){

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

            TextureLoader.ParseTXI(texture, tex);

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
                  tex.material.alphaTest = texture.header.alphaTest;
                  tex.material.transparent = false;
                }

                //if(!texture.txi.blending)
                //  tex.material.alphaTest = texture.header.alphaTest;
              }
            }

            //tex.material.needsUpdate = true;
            if(typeof tex.onLoad == 'function')
              tex.onLoad(texture, tex)
          }else if(texture == null && tex.fallback != null){
            TextureLoader.Load(tex.fallback, (texture: OdysseyTexture) => {
              if(texture != null && tex.material instanceof THREE.Material){

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

                TextureLoader.ParseTXI(texture, tex);

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
                    //tex.material.alphaTest = texture.header.alphaTest;
                  }
                }

                //tex.material.needsUpdate = true;
              }

              if(typeof tex.onLoad == 'function')
                tex.onLoad(texture, tex)
            }, TextureLoader.CACHE);
          }else{
            if(typeof tex.onLoad == 'function')
              tex.onLoad(texture, tex)
          }
        }, TextureLoader.CACHE);
      break;
      case TextureType.LIGHTMAP:
        TextureLoader.LoadLightmap(tex.name, (lightmap: THREE.Texture) => {
          if(lightmap != null){
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
        }, TextureLoader.CACHE);
      break;
      case TextureType.PARTICLE:
        TextureLoader.Load(tex.name, (texture: OdysseyTexture) => {
          if(texture != null){
            if(tex.partGroup instanceof OdysseyEmitter3D){
              tex.partGroup.material.uniforms.map.value = texture;
              (tex.partGroup.material as any).map = texture;
              tex.partGroup.material.depthWrite = false;
              tex.partGroup.material.needsUpdate = true;

              //GameState.AnimatedTextures.push( new AnimatedTexture(texture, 1/tex.partGroup.node.GridX, 1/tex.partGroup.node.GridY, 16) );

            }else{
              tex.partGroup.material.uniforms.texture.value = texture;
              tex.partGroup.material.map = texture;
              tex.partGroup.material.depthWrite = false;
              tex.partGroup.material.needsUpdate = true;
            }
          }

          if(typeof tex.onLoad == 'function')
            tex.onLoad(texture, tex)
        }, TextureLoader.CACHE);
      break;
    }
  }

  static ParseTXI(texture: OdysseyTexture, tex: TextureLoaderQueuedRef){
    //console.log('ParseTXI', texture.txi);
    if(!texture.txi)
      return;
      
    try{

      //ENVMAP
      if(texture.txi.envMapTexture != null){

        TextureLoader.Load(texture.txi.envMapTexture, (envmap: OdysseyTexture) => {
          
          if(envmap != null){

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
            console.error('Envmap missing');
          }

        }, TextureLoader.NOCACHE);

      }

      //BUMPMAP
      if(texture.txi.bumpMapTexture != null){
        TextureLoader.Load(texture.txi.bumpMapTexture, (bumpMap: OdysseyTexture) => {
          
          if(bumpMap != null){
            bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

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
              tex.material.uniforms.waterTransform.value = bumpMap.matrix;

              tex.material.uniforms.waterAnimation.value.x = bumpMap.txi.numx;
              tex.material.uniforms.waterAnimation.value.y = bumpMap.txi.numy;
              tex.material.uniforms.waterAnimation.value.z = bumpMap.txi.numx * bumpMap.txi.numy;
              tex.material.uniforms.waterAnimation.value.w = bumpMap.txi.fps;

              //let waterAnim = new AnimatedTexture(bumpMap, bumpMap.txi.numx, bumpMap.txi.numy, bumpMap.txi.fps, true);
              //GameState.AnimatedTextures.push( waterAnim );

            }

          }

          try{
            if(bumpMap.txi.isAnimated){
              //console.log('animated', numx, numy, numx * numy, fps);
              //tex.material.material.needsUpdate = true
              //GameState.AnimatedTextures.push( new AnimatedTexture(bumpMap, bumpMap.txi.numx, bumpMap.txi.numy, bumpMap.txi.fps) );
            }
          }catch(e){}

          //TextureLoader.ParseTXI(bumpMap, tex);
        }, TextureLoader.CACHE);
      }

      if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
        if(tex.material.uniforms.map.value){
          tex.material.name += tex.material.uniforms.map.value.name
          tex.material.defines.USE_MAP = '';
          tex.material.uniforms.uvTransform.value = tex.material.uniforms.map.value.matrix;
          tex.material.uniforms.map.value.updateMatrix();
          tex.material.uniformsNeedUpdate = true;
        }
      }

      //DECAL
      if(texture.txi.decal || texture.txi.procedureType == 2){
        tex.material.side = THREE.DoubleSide;
        tex.material.depthWrite = false;
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

      if(texture.txi.isAnimated){
        //console.log('animated', numx, numy, numx * numy, fps);
        GameState.AnimatedTextures.push( new AnimatedTexture(texture, texture.txi.numx, texture.txi.numy, texture.txi.fps) );
      }

      //tex.material.transparent = true;

    }catch(e){
      console.error('TextureLoader.parseTXI', e);
    }

  }


}
