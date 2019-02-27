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
    if(TextureLoader.textures.has(name) && !noCache){
      //console.log('fetch-', TextureLoader.textures.get(name), name, onLoad, noCache);
      if(onLoad != null)
        onLoad(TextureLoader.textures.get(name) ? TextureLoader.textures.get(name) : undefined);

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

              if(!noCache)
                TextureLoader.textures.set(name, texture);

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

    let dir = path.join(Config.options.Games[GameKey].Location, 'Override');

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

  static enQueue(name, material, type = TextureLoader.Type.TEXTURE, onLoad = null){
    name = name.toLowerCase();
    let obj = { name: name, material: material, type: type, onLoad: onLoad };
    TextureLoader.queue.push(obj);
    //console.log('enQueue', name, obj);

    /* 
    let _item = TextureLoader.queue.find( (item) => {
      item.name === name;
    });

    if(_item){
      
    }else{
      TextureLoader.queue.push({ name: name, materials: [{ material: material, type: type }] });
    }
    */
  }

  static enQueueParticle(name, partGroup, onLoad = null){
    name = name.toLowerCase();
    TextureLoader.queue.push({ name: name, partGroup: partGroup, type: TextureLoader.Type.PARTICLE, onLoad: onLoad });
  }

  static LoadQueue(onLoad = null, onProgress = null){

    
    let loop = new AsyncLoop({
      array: TextureLoader.queue.slice(0),
      onLoop: (tex, asyncLoop) => {

        if(onProgress != null)
          onProgress(tex.name);

        //console.log('loadTex', tex.name);

        switch(tex.type){
          case TextureLoader.Type.TEXTURE:
            TextureLoader.Load(tex.name, (texture = null) => {
              if(texture != null && tex.material instanceof THREE.Material){

                if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
                  //console.log('THREE.RawShaderMaterial', tex);
                  tex.material.uniforms.map.value = texture;
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
                  if(texture.header.alphaTest != 1){
                    tex.material.transparent = true;
                  }
                }

                //tex.material.needsUpdate = true;
              }

              if(typeof tex.onLoad == 'function')
                tex.onLoad(texture, tex)

              asyncLoop._Loop();
            }, TextureLoader.CACHE);
          break;
          case TextureLoader.Type.LIGHTMAP:
            TextureLoader.LoadLightmap(tex.name, (lightmap = null) => {
              if(lightmap != null){
                if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
                  tex.material.uniforms.lightMap.value = lightmap;
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
              }

              if(typeof tex.onLoad == 'function')
                tex.onLoad(texture, tex)

              asyncLoop._Loop();
            }, TextureLoader.CACHE);
          break;
          case TextureLoader.Type.PARTICLE:
            TextureLoader.Load(tex.name, (texture = null) => {
              if(texture != null){
                tex.partGroup.material.uniforms.texture.value = texture;
                tex.partGroup.material.depthWrite = false;
                tex.partGroup.material.needsUpdate = true;
              }

              if(typeof tex.onLoad == 'function')
                tex.onLoad(texture, tex)

              asyncLoop._Loop();
            }, TextureLoader.CACHE);
          break;
        }

      }
    });
    loop.Begin(() => {

      //let queue = TextureLoader.queue.slice(0);
      TextureLoader.queue = [];

      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  static ParseTXI(texture, tex){
    //console.log('ParseTXI', texture.txi);
    try{
      if(texture.txi.envMapTexture != null){
        //console.log('envmaptexture', texture.txi.envMapTexture);
        //if(texture.txi.envMapTexture.indexOf('cm_m02') == -1){
          TextureLoader.Load(texture.txi.envMapTexture, (envmap) => {
            //console.log('envmap loaded', texture.txi.envMapTexture, envmap);
            if(envmap != null){

              //console.log('envmap', envmap)
              envmap.wrapS = envmap.wrapT = THREE.RepeatWrapping;

              if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
                tex.material.uniforms.envMap.value = envmap;
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
              
              if(tex.material.opacity == 1)
                tex.material.transparent = false;

              tex.material.side = THREE.FrontSide;
              if(texture.txi.waterAlpha == null){
                tex.material.combine = THREE.AddOperation;
                tex.material.reflectivity = 1;
              }
              tex.material.needsUpdate = true;

              //tex.material.map.flipY = true;
            }else{
              console.error('Envmap missing');
            }
          }, TextureLoader.NOCACHE);
        //}else{
        //  tex.material.transparent = false;
        //}
      }

      if(texture.txi.bumpMapTexture != null){
        TextureLoader.Load(texture.txi.bumpMapTexture, (bumpMap) => {
          //console.log('bumpMap loaded', texture.txi.bumpMapTexture);
          if(bumpMap != null){
            bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

            bumpMap.material = tex.material;

            //tex.material.map = bumpMap;
            if(bumpMap.bumpMapType == 'NORMAL'){

              if(tex.material instanceof THREE.RawShaderMaterial || tex.material instanceof THREE.ShaderMaterial){
                tex.material.uniforms.normalMap.value = bumpMap;
                tex.material.defines.USE_NORMALMAP = '';
                tex.material.uniformsNeedUpdate = true;
              }else{
                tex.material.normalMap = bumpMap;
              }

              tex.material.normalMapType = THREE.ObjectSpaceNormalMap;
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
              tex.material.uniforms.bumpScale.value = bumpMap.txi.bumpMapScaling * 0.1;
              tex.material.uniforms.displacementMap.value = tex.material.uniforms.bumpMap.value;
              tex.material.uniforms.displacementScale.value = tex.material.uniforms.bumpScale.value;
              tex.material.uniforms.reflectivity.value = 1;
              tex.material.transparent = true;
              tex.material.premultipliedAlpha = true;
              tex.material.needsUpdate = true;

              tex.material.uniforms.waterAlpha.value = texture.txi.waterAlpha;
              tex.material.uniforms.waterTransform.value = bumpMap.matrix;

              let waterAnim = new AnimatedTexture(bumpMap, bumpMap.txi.numx, bumpMap.txi.numy, bumpMap.txi.fps, true);
              //console.log('water', waterAnim, tex);
              AnimatedTextures.push( waterAnim );

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

      if(texture.txi.decal){
        tex.material.side = THREE.DoubleSide;
        //tex.material.depthWrite = false;
      }

      switch(texture.txi.blending){
        case TXI.BLENDING.ADDITIVE:
          tex.material.transparent = true;
          tex.material.blending = THREE['AdditiveBlending'];
          tex.material.alphaTest = Game.AlphaTest;//0.5;
          tex.material.side = THREE.DoubleSide;
        break;
        case TXI.BLENDING.PUNCHTHROUGH:
          tex.material.transparent = true;
          tex.material.blending = THREE['NormalBlending'];
          tex.material.alphaTest = Game.AlphaTest;//0.5;
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
TextureLoader.lightmaps = {};
TextureLoader.particles = {};
TextureLoader.queue = [];
TextureLoader.Anisotropy = 8;

TextureLoader.Type = {
  TEXTURE: 0,
  LIGHTMAP: 1,
  PARTICLE: 2
};

TextureLoader.CACHE = false; //Should be false but it's causing isses if textures are cached
TextureLoader.NOCACHE = true;

module.exports = TextureLoader;
