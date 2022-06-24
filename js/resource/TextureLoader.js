/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The TextureLoader class.
 */

class TextureLoader {
  constructor(){

  }

  static Load(name, onLoad = null, noCache = false){
    name = name.toLowerCase();
    //console.log('texture-load', name);
    if(TextureLoader.textures.has(name) || TextureLoader.guiTextures.has(name) && !noCache){
      //console.log('fetch-', TextureLoader.textures.get(name), name, onLoad, noCache);
      if(onLoad != null)
        onLoad(TextureLoader.textures.has(name) ? TextureLoader.textures.get(name) : TextureLoader.guiTextures.has(name) ? TextureLoader.guiTextures.get(name) : undefined);

    }else{

      TextureLoader.LoadOverride(name, (texture) => {
        //console.log('override', name, texture);
        if(texture != null){
          texture.anisotropy = TextureLoader.Anisotropy;
          if(onLoad != null)
            onLoad(texture);

        }else{

          TextureLoader.tpcLoader.fetch(name, (texture) => {
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
              TextureLoader.tgaLoader.load(name, (tga) => {

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

      }, noCache);

    }

  }

  static LoadOverride(name, onLoad = null, onError = null, noCache = false){

    let dir = path.join(app_profile.directory, 'Override');

    if(Game.Flags.EnableOverride){

      fs.exists(path.join(dir, name+'.tpc'), (tpc_exists) => {
        if (tpc_exists) {

          TextureLoader.tpcLoader.fetch_override(name, (texture) => {
            if(texture != null){
              texture.anisotropy = TextureLoader.Anisotropy;
              //console.log('fetch', texture);
              texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    
              if(!noCache)
                TextureLoader.textures.set(name, texture);
    
              if(onLoad != null)
                onLoad(texture);
            }else{
              onLoad(null);
            }
          });
          
        }else{

          fs.exists(path.join(dir, name+'.tga'), (tga_exists) => {
            if (tga_exists) {
              TextureLoader.tgaLoader.load_override(name, (tga) => {
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
              onLoad(null);
            }
          });

        }
      });

    }else{
      //Skip the override check and pass back a null value
      onLoad(null);
    }

  }

  static LoadLocal(name, onLoad = null, onError = null, noCache = false){

    let dir = name;

    fs.exists(path.join(dir, name), (tga_exists) => {
      if (tga_exists) {
        TextureLoader.tgaLoader.load_local(name, (tga) => {
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
        onLoad(null);
      }
    });

  }

  static LoadLightmap(name, onLoad = null, noCache = false){
    name = name.toLowerCase();
    if(TextureLoader.lightmaps.hasOwnProperty(name) && !noCache){
      //console.log('fetch-', TextureLoader.textures[name]);
      if(onLoad != null)
        onLoad(TextureLoader.lightmaps[name]);

    }else{

      if(GameKey == 'TSL'){
        TextureLoader.tpcLoader.fetch(name, (lightmap) => {
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
        TextureLoader.tgaLoader.load(name, (lightmap) => {
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

  static enQueue(name, material, type = TextureLoader.Type.TEXTURE, onLoad = null, fallback){

    if(typeof name == 'string'){
      name = name.toLowerCase();
      let obj = { name: name, material: material, type: type, fallback: fallback, onLoad: onLoad };
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
        let obj = { name: texName, material: material, type: type, fallback: fallback, onLoad: onLoad };
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

  static enQueueParticle(name, partGroup, onLoad = null){
    name = name.toLowerCase();
    TextureLoader.queue.push({ name: name, partGroup: partGroup, type: TextureLoader.Type.PARTICLE, onLoad: onLoad });
  }

  static LoadQueue(onLoad = null, onProgress = null){

    
    let loop = new AsyncLoop({
      array: TextureLoader.queue.slice(0),
      onLoop: (tex, asyncLoop, index, count) => {

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

  static UpdateMaterial(tex){
    
    switch(tex.type){
      case TextureLoader.Type.TEXTURE:
        TextureLoader.Load(tex.name, (texture = null) => {
          if(texture != null && tex.material instanceof THREE.Material){

            if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
              //console.log('THREE.RawShaderMaterial', tex);
              tex.material.uniforms.map.value = texture;
              tex.material.map = texture;
              tex.material.uniformsNeedUpdate = true;
              tex.material.needsUpdate = true; //This is required for cached textures. If not models will not update with a cached texture
            }else{
              tex.material.map = texture;
              tex.material.needsUpdate = true; //This is required for cached textures. If not models will not update with a cached texture
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
                if(texture.txi.blending != TXI.BLENDING.PUNCHTHROUGH){
                  tex.material.transparent = true;
                }
                
                if(texture.txi.blending == TXI.BLENDING.ADDITIVE){
                  //tex.material.alphaTest = 0;
                }

                if( (texture.header.alphaTest && texture.header.format != PixelFormat.DXT5) || texture.txi.blending == TXI.BLENDING.PUNCHTHROUGH){
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
            TextureLoader.Load(tex.fallback, (texture = null) => {
              if(texture != null && tex.material instanceof THREE.Material){

                if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
                  //console.log('THREE.RawShaderMaterial', tex);
                  tex.material.uniforms.map.value = texture;
                  tex.material.map = texture;
                  tex.material.uniformsNeedUpdate = true;
                  tex.material.needsUpdate = true; //This is required for cached textures. If not models will not update with a cached texture
                }else{
                  tex.material.map = texture;
                  tex.material.needsUpdate = true; //This is required for cached textures. If not models will not update with a cached texture
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
                    if(texture.txi.blending != TXI.BLENDING.PUNCHTHROUGH){
                      tex.material.transparent = true;
                    }
                    if(texture.txi.blending == TXI.BLENDING.ADDITIVE){
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
      case TextureLoader.Type.LIGHTMAP:
        TextureLoader.LoadLightmap(tex.name, (lightmap = null) => {
          if(lightmap != null){
            if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
              tex.material.uniforms.lightMap.value = lightmap;
              tex.material.lightMap = lightmap;
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
              tex.material.lightMap = lightmap;
              tex.material.defines = tex.material.defines || {};
              if(tex.material.defines.hasOwnProperty('IGNORE_LIGHTING')){
                delete tex.material.defines.IGNORE_LIGHTING;
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
            tex.onLoad(texture, tex)
        }, TextureLoader.CACHE);
      break;
      case TextureLoader.Type.PARTICLE:
        TextureLoader.Load(tex.name, (texture = null) => {
          if(texture != null){
            if(tex.partGroup instanceof THREE.AuroraEmitter){
              tex.partGroup.material.uniforms.map.value = texture;
              tex.partGroup.material.map = texture;
              tex.partGroup.material.depthWrite = false;
              tex.partGroup.material.needsUpdate = true;

              //AnimatedTextures.push( new AnimatedTexture(texture, 1/tex.partGroup.node.GridX, 1/tex.partGroup.node.GridY, 16) );

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

  static ParseTXI(texture, tex){
    //console.log('ParseTXI', texture.txi);
    if(!texture.txi)
      return;
      
    try{

      //ENVMAP
      if(texture.txi.envMapTexture != null){

        TextureLoader.Load(texture.txi.envMapTexture, (envmap) => {
          
          if(envmap != null){

            envmap.wrapS = envmap.wrapT = THREE.RepeatWrapping;

            if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
              tex.material.uniforms.envMap.value = envmap;
              tex.material.envMap = envmap;
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
              tex.material.envMap = envmap;
            }

            //tex.material.alphaMap = texture;
            
            //if(tex.material.opacity == 1)
              //tex.material.transparent = false;

            tex.material.side = THREE.FrontSide;
            if(texture.txi.waterAlpha == null){
              tex.material.combine = THREE.AddOperation;
              tex.material.reflectivity = 1;
            }
            tex.material.needsUpdate = true;

            if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
              if(tex.material.defines.hasOwnProperty('HOLOGRAM')){
                //tex.material.alphaTest = 1;
                tex.material.combine = THREE.AddOperation;
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
        TextureLoader.Load(texture.txi.bumpMapTexture, (bumpMap) => {
          
          if(bumpMap != null){
            bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

            bumpMap.material = tex.material;

            if(bumpMap.bumpMapType == 'NORMAL'){

              if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
                tex.material.uniforms.normalMap.value = bumpMap;
                tex.material.defines.USE_NORMALMAP = '';
                tex.material.uniformsNeedUpdate = true;
                tex.material.vertexTangents = true;
                tex.material.normalMapType = THREE.TangentSpaceNormalMap;
                tex.material.defines['TANGENTSPACE_NORMALMAP'] = '';
              }else{
                tex.material.normalMap = bumpMap;
                tex.material.normalMapType = THREE.ObjectSpaceNormalMap;
                tex.material.defines['OBJECTSPACE_NORMALMAP'] = '';
              }

              tex.material.transparent = false;

            }else{

              if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
                tex.material.uniforms.bumpMap.value = bumpMap;
                tex.material.defines.USE_BUMPMAP = '';
                tex.material.uniformsNeedUpdate = true;
              }else{
                tex.material.bumpMap = bumpMap;
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
              tex.material.combine = THREE.MixOperation;
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
              //AnimatedTextures.push( waterAnim );

            }

          }

          try{
            if(bumpMap.txi.isAnimated){
              //console.log('animated', numx, numy, numx * numy, fps);
              //tex.material.material.needsUpdate = true
              //AnimatedTextures.push( new AnimatedTexture(bumpMap, bumpMap.txi.numx, bumpMap.txi.numy, bumpMap.txi.fps) );
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
        case TXI.BLENDING.ADDITIVE:
          tex.material.transparent = true;
          tex.material.blending = THREE['AdditiveBlending'];
          //tex.material.alphaTest = 0;//0.5;
          //tex.material.side = THREE.DoubleSide; //DoubleSide is causing issues with windows in TSL and elsewhere
        break;
        case TXI.BLENDING.PUNCHTHROUGH:
          tex.material.transparent = false;
          tex.material.blending = THREE['NormalBlending'];
          //tex.material.alphaTest = texture.header.alphaTest || Game.AlphaTest;//0.5;
        break;
      }

      if(texture.txi.isAnimated){
        //console.log('animated', numx, numy, numx * numy, fps);
        AnimatedTextures.push( new AnimatedTexture(texture, texture.txi.numx, texture.txi.numy, texture.txi.fps) );
      }

      //tex.material.transparent = true;

    }catch(e){
      console.error('TextureLoader.parseTXI', e);
    }

  }


}

TextureLoader.tpcLoader = new THREE.TPCLoader();
TextureLoader.tgaLoader = new THREE.TGALoader();
TextureLoader.textures = new Map();
TextureLoader.guiTextures = new Map();
TextureLoader.lightmaps = {};
TextureLoader.particles = {};
TextureLoader.queue = [];
TextureLoader.Anisotropy = 8;
TextureLoader.TextureQuality = 2;

TextureLoader.onAnisotropyChanged = () => {
  TextureLoader.textures.forEach( tex => {
    tex.anisotropy = TextureLoader.Anisotropy;
    tex.needsUpdate = true;
  });
};

TextureLoader.Type = {
  TEXTURE: 0,
  LIGHTMAP: 1,
  PARTICLE: 2
};

TextureLoader.CACHE = false; //Should be false but it's causing isses if textures are cached
TextureLoader.NOCACHE = true;

module.exports = TextureLoader;
