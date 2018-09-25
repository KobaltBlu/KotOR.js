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
    if(TextureLoader.textures.hasOwnProperty(name) && !noCache){
      //console.log('fetch-', TextureLoader.textures[name]);
      if(onLoad != null)
        onLoad(TextureLoader.textures[name] ? TextureLoader.textures[name] : null);

    }else{

      TextureLoader.LoadOverride(name, (texture) => {
        
        if(texture != null){

          if(onLoad != null)
            onLoad(texture);

        }else{

          TextureLoader.tpcLoader.fetch(name, (texture) => {
            if(texture != null){
              //console.log('fetch', texture);
              texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

              if(!noCache)
                TextureLoader.textures[name] = texture;

              if(onLoad != null)
                onLoad(texture);
            }else{
              console.log('tga', name)
              TextureLoader.tgaLoader.load(name, (tga) => {

                if(tga != null){
                  tga.wrapS = tga.wrapT = THREE.RepeatWrapping;

                  if(!noCache)
                    TextureLoader.textures[name] = tga;
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
              //console.log('fetch', texture);
              texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    
              if(!noCache)
                TextureLoader.textures[name] = texture;
    
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
                
                if(tga != null){
                  tga.wrapS = tga.wrapT = THREE.RepeatWrapping;

                  if(!noCache)
                    TextureLoader.textures[name] = tga;
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
          
          if(tga != null){
            tga.wrapS = tga.wrapT = THREE.RepeatWrapping;

            if(!noCache)
              TextureLoader.textures[name] = tga;
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
          if(lightmap != null)
            lightmap.wrapS = lightmap.wrapT = THREE.RepeatWrapping;
  
          TextureLoader.lightmaps[name] = lightmap;
          if(onLoad != null)
            onLoad(TextureLoader.lightmaps[name]);
        });
      }else{
        TextureLoader.tgaLoader.load(name, (lightmap) => {
          //console.log('fetch', texture);
          if(lightmap != null)
            lightmap.wrapS = lightmap.wrapT = THREE.RepeatWrapping;
  
          TextureLoader.lightmaps[name] = lightmap;
          if(onLoad != null)
            onLoad(TextureLoader.lightmaps[name]);
        });
      }      
    }
  }

  static enQueue(name, material, type = TextureLoader.Type.TEXTURE, onLoad = null){
    name = name.toLowerCase();
    TextureLoader.queue.push({ name: name, material: material, type: type, onLoad: onLoad });

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

    /*if(Game.Mode == -1){
      if(onLoad != null)
        onLoad();
      return;
    }*/

    let queue = TextureLoader.queue.slice(0);
    if(queue.length){
      let i = 0;

      // Call this after each texture's onLoad callback is fired to continue and load the
      // next texture. If we have reached the end of the Queue then call the main
      // onLoad() event
      let loadTexStep = function(){
        i++
        if(i != queue.length){
          loadTex();
        }else{
          if(onLoad != null)
            onLoad();
        }
      }

      let loadTex = () => {
        let tex = queue[i];
        if(onProgress != null)
          onProgress(tex.name);

        switch(tex.type){
          case TextureLoader.Type.TEXTURE:
            TextureLoader.Load(tex.name, (texture = null) => {
              if(texture != null && tex.material instanceof THREE.Material){
                tex.material.map = texture;
                tex.material.needsUpdate = true; //This is required for cached textures. If not models will not update with a cached texture

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
                    //tex.material.alphaTest = 1 - texture.header.alphaTest;
                    tex.material.transparent = true;
                  }
                }

                //tex.material.needsUpdate = true;
              }

              if(typeof tex.onLoad == 'function')
                tex.onLoad(texture)

              loadTexStep();
            }, TextureLoader.CACHE);
          break;
          case TextureLoader.Type.LIGHTMAP:
            TextureLoader.LoadLightmap(tex.name, (lightmap = null) => {
              if(lightmap != null){
                tex.material.lightMap = lightmap;
                //tex.material.needsUpdate = true;
              }

              if(typeof tex.onLoad == 'function')
                tex.onLoad(texture)

              loadTexStep();
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
                tex.onLoad(texture)

              loadTexStep();
            }, TextureLoader.CACHE);
          break;
        }
      }
      loadTex();

    }else{
      if(onLoad != null)
        onLoad();
    }

    TextureLoader.queue = [];
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
              tex.material.envMap = envmap;
              //tex.material.alphaMap = texture;
              tex.material.transparent = false;
              tex.material.side = THREE.FrontSide;
              tex.material.reflectivity = 0.5;
              //if(tex.material.map instanceof THREE.Texture)
              //  tex.material.specularMap = tex.material.map;
              //tex.material.specular.set(0xFFFFFF);
              tex.material.map.flipY = true;
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
              //tex.material.bumpMap = bumpMap;
              //tex.material.bumpScale = bumpMap.txi.bumpMapScaling;
            }else{
              tex.material.bumpMap = bumpMap;
              tex.material.bumpScale = bumpMap.txi.bumpMapScaling;
            }

            if(texture.txi.waterAlpha != null){
              //texture.premultiplyAlpha = false;
              //tex.material.normalMap = null;
              //tex.material.alphaMap = texture;
              tex.material.bumpMap = null;
              //tex.material.bumpScale = bumpMap.txi.bumpMapScaling;
              //tex.material.map = null;//texture.clone();
              //tex.material.map.format = THREE.RGBAFormat;
              //tex.material.map.premultiplyAlpha = true;
              tex.material.transparent = true;
              tex.material.premultipliedAlpha = true;
              tex.material.needsUpdate = false;
              //AnimatedTextures.push( new AnimatedTexture(tex.material.map, bumpMap.txi.numx, bumpMap.txi.numy, bumpMap.txi.numx * bumpMap.txi.numy, bumpMap.txi.fps) );
              //AnimatedTextures.push( new AnimatedTexture(bumpMap, bumpMap.txi.numx, bumpMap.txi.numy, bumpMap.txi.numx * bumpMap.txi.numy, bumpMap.txi.fps) );
            }

          }

          try{
            if(bumpMap.txi.isAnimated){
              //console.log('animated', numx, numy, numx * numy, fps);
              //tex.material.material.needsUpdate = true
              //AnimatedTextures.push( new AnimatedTexture(bumpMap, bumpMap.txi.numx, bumpMap.txi.numy, bumpMap.txi.numx * bumpMap.txi.numy, bumpMap.txi.fps) );
            }
          }catch(e){}

          //TextureLoader.ParseTXI(bumpMap, tex);
        }, TextureLoader.CACHE);
      }

      if(texture.txi.decal){
        tex.material.side = THREE.DoubleSide;
        //tex.material.depthWrite = false;
      }

      switch(texture.txi.blending){
        case TXI.BLENDING.ADDITIVE:
          tex.material.transparent = true;
          tex.material.blending = THREE['AdditiveBlending'];
          tex.material.alphaTest = 0.5;
          tex.material.side = THREE.DoubleSide;
        break;
        case TXI.BLENDING.PUNCHTHROUGH:
          tex.material.transparent = true;
          tex.material.blending = THREE['NormalBlending'];
          tex.material.alphaTest = 0.5;
        break;
      }

      if(texture.txi.waterAlpha != null){
        //tex.material.opacity = texture.txi.waterAlpha;
        //tex.material.transparent = true;
      }

      if(texture.txi.isAnimated){
        //console.log('animated', numx, numy, numx * numy, fps);
        //AnimatedTextures.push( new AnimatedTexture(texture, texture.txi.numx, texture.txi.numy, texture.txi.numx * texture.txi.numy, texture.txi.fps) );
      }

      //tex.material.transparent = true;

    }catch(e){
      console.error('TextureLoader.parseTXI', e);
    }

  }


}

TextureLoader.tpcLoader = new THREE.TPCLoader();
TextureLoader.tgaLoader = new THREE.TGALoader();
TextureLoader.textures = {};
TextureLoader.lightmaps = {};
TextureLoader.particles = {};
TextureLoader.queue = [];

TextureLoader.Type = {
  TEXTURE: 0,
  LIGHTMAP: 1,
  PARTICLE: 2
}

TextureLoader.CACHE = false; //Should be false but it's causing isses if textures are cached
TextureLoader.NOCACHE = true;

module.exports = TextureLoader;
