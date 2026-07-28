import * as THREE from "three";
import { TXIBlending } from "@/enums/graphics/txi/TXIBlending";
import { TXIPROCEDURETYPE } from "@/enums/graphics/txi/TXIPROCEDURETYPE";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";
import { TextureAnimationManager } from "@/managers/TextureAnimationManager";

function applyWrapToCycleFrames(texture: OdysseyTexture): void {
  const frames = texture?.cycleFrames;
  if(!frames || frames.length < 2) return;
  for(let i = 0; i < frames.length; i++){
    const frame = frames[i];
    if(!frame || frame === texture) continue;
    frame.wrapS = texture.wrapS;
    frame.wrapT = texture.wrapT;
    frame.needsUpdate = true;
  }
}

export type OdysseyTextureResolver = (resRef: string, noCache?: boolean) => Promise<OdysseyTexture>;

export interface ApplyTXIOptions {
  resolveTexture: OdysseyTextureResolver;
  noCache?: boolean;
  managedTextures?: Set<OdysseyTexture>;
}

export class OdysseyMaterialBuilder {
  /**
   * Current area DefaultEnvMap resref. Retail CSWCObject::SetEnvMap @ 0063cb70 resolves
   * the envmap resref "DEFAULT" to the module area's DefaultEnvMap before binding.
   * Set by ModuleArea (game) / ForgeArea (forge) when an area is loaded.
   */
  static defaultEnvMap: string = '';

  /**
   * Resolve an envmap resref like retail CSWCObject::SetEnvMap @ 0063cb70:
   * "DEFAULT" maps to the current area's DefaultEnvMap; an empty result means skip binding.
   */
  static resolveEnvMapResRef(resRef: string): string {
    if(!resRef){ return ''; }
    if(resRef.trim().toUpperCase() === 'DEFAULT'){
      return OdysseyMaterialBuilder.defaultEnvMap || '';
    }
    return resRef;
  }

  static createOdysseyMaterial(map?: THREE.Texture): THREE.ShaderMaterial {
    const uniforms = THREE.UniformsUtils.clone((THREE.ShaderLib as any).odyssey.uniforms);
    uniforms.map.value = map ?? null;
    if(map){
      map.updateMatrix();
      uniforms.uvTransform.value = map.matrix;
    }
    uniforms.time.value = 0;
    uniforms.opacity.value = 1.0;
    uniforms.diffuse.value = new THREE.Color(1, 1, 1);
    uniforms.tweakColor.value = new THREE.Color(1, 1, 1);

    const material = new THREE.ShaderMaterial({
      fragmentShader: (THREE.ShaderLib as any).odyssey.fragmentShader,
      vertexShader: (THREE.ShaderLib as any).odyssey.vertexShader,
      uniforms,
      side: THREE.DoubleSide,
      lights: false,
      fog: false,
      transparent: false,
    });

    material.defines = material.defines || {};
    material.defines.AURORA = "";
    material.defines.USE_UV = "";
    material.defines.USE_MAP = "";
    material.defines.MAX_ODYSSEY_LIGHTS = "8";
    return material;
  }

  static disposeManagedTextures(managedTextures?: Set<OdysseyTexture>): void {
    if(!managedTextures) return;
    managedTextures.forEach((tex) => tex?.dispose?.());
    managedTextures.clear();
  }

  static resetMaterialTXIState(material: THREE.Material): void {
    if(!(material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial)){
      return;
    }
    TextureAnimationManager.unregisterMaterial(material);

    material.defines = material.defines || {};
    delete material.defines.CYCLE_MAP;
    delete material.defines.CYCLE_BUMP;
    delete material.defines.WATER;
    delete material.defines.USE_DISPLACEMENTMAP;
    delete material.defines.RANDOM;
    delete material.defines.RINGTEXDISTORT;
    delete material.defines.USE_ENVMAP;
    delete material.defines.ENVMAP_TYPE_CUBE;
    delete material.defines.ENVMAP_MODE_REFLECTION;
    delete material.defines.ENVMAP_BLENDING_ADD;
    delete material.defines.ENVMAP_BLENDING_MIX;
    delete material.defines.ENVMAP_BLENDING_LERP;
    delete material.defines.ENV_WORLDPOS;

    if(material.uniforms.envMap){
      material.uniforms.envMap.value = null;
    }
    if(material.uniforms.envMapAlpha){
      material.uniforms.envMapAlpha.value = 1;
    }
    if(material.uniforms.waterAlpha){
      material.uniforms.waterAlpha.value = 1;
    }

    material.blending = THREE.NormalBlending;
    material.transparent = false;
    material.alphaTest = 0;
    material.uniformsNeedUpdate = true;
    material.needsUpdate = true;
  }

  static async applyTXIToMaterial(texture: OdysseyTexture, material: THREE.Material, options: ApplyTXIOptions): Promise<void> {
    if(!texture?.txi) return;
    const registerManagedTexture = (tex?: OdysseyTexture) => {
      if(tex && options.managedTextures){
        options.managedTextures.add(tex);
      }
    };

    // Object-level envmap override (appearance.2da ENVMAP / baseitems partEnvMap) wins over the
    // TXI envmap — retail RenderEnvironmentMapped @ 0046ff70 checks the gob envmap first.
    const envMapResRef = OdysseyMaterialBuilder.resolveEnvMapResRef(
      (material.userData?.envMapOverride as string) || texture.txi.envMapTexture
    );

    if(!!envMapResRef){
      const envmap: OdysseyTexture = await options.resolveTexture(envMapResRef, options.noCache ?? true);
      if(!!envmap){
        registerManagedTexture(envmap);
        if((envmap as any).header?.isCubemap){
          // Retail GLRender::CreateCubeTexture @ 00424000 — GL_CLAMP_TO_EDGE on S/T/R.
          envmap.wrapS = envmap.wrapT = THREE.ClampToEdgeWrapping;
        }else{
          envmap.wrapS = envmap.wrapT = THREE.RepeatWrapping;
        }

        if(material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial){
          material.uniforms.envMap.value = envmap;
          (material as any).envMap = envmap;
          envmap.updateMatrix();
          if(material.uniforms.map.value){
            material.uniforms.map.value.updateMatrix();
          }
          material.defines.USE_ENVMAP = "";
          material.defines.ENVMAP_TYPE_CUBE = "";
          material.defines.ENVMAP_MODE_REFLECTION = "";
          // Per-fragment env sampling — same effect master got from #define PHONG
          // (Three envmap chunks set ENV_WORLDPOS for worldpos/envmap varyings).
          material.defines.ENV_WORLDPOS = "";
          // Default TXI envmaps use ADD (master / retail environmentMapDest!=0 @
          // 0046ff70: glBlendFunc(ONE_MINUS_DST_ALPHA, ONE) → litDiffuse + env*(1-a)).
          // dest==0 LERP replaces albedo with the cubemap and crushes dark maps
          // like CM_Baremetal; ADD keeps armor color and layers sparse highlights.
          material.defines.ENVMAP_BLENDING_ADD = "";
          // Envmapped meshes are lit in retail RenderFlat — clear IGNORE so the binder
          // packs nearest lights (same pattern as lightmaps in TextureLoader).
          delete material.defines.IGNORE_LIGHTING;
          if(material.uniforms.envMapAlpha){
            // TXI envmapalpha — retail one-pass writes this to output alpha; multipass
            // does not scale the RGB blend. Kept for alpha / gob scaling callers.
            material.uniforms.envMapAlpha.value = texture.txi.envMapAlpha ?? 1;
          }
          // TPC faces are uploaded in GL order (retail CreateCubeTexture). Do not apply
          // Three's CubeTextureLoader X-flip (would mirror / look color-inverted).
          if(material.uniforms.flipEnvMap){
            material.uniforms.flipEnvMap.value = 1;
          }
          material.uniformsNeedUpdate = true;
        }else{
          (material as any).envMap = envmap;
        }

        material.side = THREE.FrontSide;
        if(texture.txi.waterAlpha == null){
          (material as any).combine = THREE.AddOperation;
          (material as any).reflectivity = 1;
        }
        material.needsUpdate = true;

        if(material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial){
          if(material.defines.hasOwnProperty("HOLOGRAM")){
            (material as any).combine = THREE.AddOperation;
            material.blending = THREE.NormalBlending;
            material.transparent = true;
            material.uniformsNeedUpdate = true;
          }
        }
      }else{
        console.error(`Envmap missing: ${envMapResRef}`);
      }
    }

    if(!!texture.txi.bumpMapTexture){
      const bumpMap: OdysseyTexture = await options.resolveTexture(texture.txi.bumpMapTexture, options.noCache ?? false);
      if(!!bumpMap){
        registerManagedTexture(bumpMap);
        bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
        applyWrapToCycleFrames(bumpMap);

        if(material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial){
          if(bumpMap.txi.procedureType){
            switch(bumpMap.txi.procedureType){
              case TXIPROCEDURETYPE.CYCLE:
                // Retail swaps the bound texture — no CYCLE_BUMP UV offset
                break;
              case TXIPROCEDURETYPE.RANDOM:
                material.defines.RANDOM = "";
                break;
              case TXIPROCEDURETYPE.RINGTEXDISTORT:
                material.defines.RINGTEXDISTORT = "";
                break;
              case TXIPROCEDURETYPE.WATER:
                material.defines.WATER = "";
                break;
            }
          }
        }

        (bumpMap as any).material = material;

        if(bumpMap.bumpMapType === "NORMAL"){
          if(material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial){
            material.uniforms.normalMap.value = bumpMap;
            material.defines.USE_NORMALMAP = "";
            material.uniformsNeedUpdate = true;
            (material as any).vertexTangents = true;
            (material as any).normalMapType = THREE.TangentSpaceNormalMap;
            material.defines.TANGENTSPACE_NORMALMAP = "";
            if(bumpMap.txi.procedureType === TXIPROCEDURETYPE.CYCLE){
              TextureAnimationManager.register(bumpMap, material, 'normalMap');
            }
          }else{
            (material as any).normalMap = bumpMap;
            (material as any).normalMapType = THREE.ObjectSpaceNormalMap;
            (material as any).defines.OBJECTSPACE_NORMALMAP = "";
          }
          material.transparent = false;
        }else{
          if(material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial){
            material.uniforms.bumpMap.value = bumpMap;
            material.defines.USE_BUMPMAP = "";
            material.uniformsNeedUpdate = true;
            if(bumpMap.txi.procedureType === TXIPROCEDURETYPE.CYCLE){
              TextureAnimationManager.register(bumpMap, material, 'bumpMap');
            }
          }else{
            (material as any).bumpMap = bumpMap;
          }
          if((material as any).uniforms?.bumpScale){
            (material as any).uniforms.bumpScale.value = bumpMap.txi.bumpMapScaling;
          }
        }

        if(texture.txi.waterAlpha != null && (material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial)){
          material.defines = material.defines || {};
          material.defines.WATER = "";
          // Retail uses height→normal bump lighting only (ConvertHeightFieldAndLoadNormalMapTexture
          // @ 004260a0) — no vertex displacement.
          delete material.defines.USE_DISPLACEMENTMAP;
          material.defines.ENVMAP_BLENDING_MIX = "";
          delete material.defines.USE_NORMALMAP;
          delete material.defines.ENVMAP_BLENDING_ADD;
          delete material.defines.ENVMAP_BLENDING_LERP;
          (material as any).combine = THREE.MixOperation;

          if(material.uniforms.bumpMap?.value){
            material.uniforms.bumpMap.value.minFilter = THREE.LinearFilter;
            material.uniforms.bumpMap.value.magFilter = THREE.LinearFilter;
            material.uniforms.bumpMap.value.generateMipmaps = false;
          }
          if(material.uniforms.displacementMap){
            material.uniforms.displacementMap.value = null;
          }

          material.uniforms.bumpScale.value = bumpMap.txi.bumpMapScaling * 0.1;
          material.uniforms.reflectivity.value = 1;
          material.transparent = false;
          material.premultipliedAlpha = false;
          material.needsUpdate = true;
          material.blending = THREE.AdditiveBlending;
          material.uniforms.waterAlpha.value = texture.txi.waterAlpha;

          if(bumpMap.txi.procedureType === TXIPROCEDURETYPE.CYCLE){
            TextureAnimationManager.register(bumpMap, material, 'bumpMap');
          }
        }
      }
    }

    if(material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial){
      if(material.uniforms.map.value){
        material.name = material.uniforms.map.value.name;
        material.defines.USE_MAP = "";
        material.uniforms.uvTransform.value = material.uniforms.map.value.matrix;
        material.uniforms.map.value.updateMatrix();
        material.uniformsNeedUpdate = true;
        // Recompile so HOLOGRAM / map_pars pick up USE_MAP (needsUpdate may have
        // already been set earlier in TextureLoader before this define existed).
        material.needsUpdate = true;
      }

      if(texture.txi.procedureType){
        switch(texture.txi.procedureType){
          case TXIPROCEDURETYPE.CYCLE:
            // Retail CycleTIDTextureController — swap bound map texture, do not remesh UVs
            TextureAnimationManager.register(texture, material, 'map');
            break;
          case TXIPROCEDURETYPE.RANDOM:
            material.defines.RANDOM = "";
            break;
          case TXIPROCEDURETYPE.RINGTEXDISTORT:
            material.defines.RINGTEXDISTORT = "";
            break;
          case TXIPROCEDURETYPE.WATER:
            material.defines.WATER = "";
            break;
        }
      }
    }

    if(texture.txi.decal || texture.txi.procedureType == 2){
      material.side = THREE.DoubleSide;
      material.depthWrite = false;
      material.transparent = true;
      (material as any).defines = (material as any).defines || {};
      (material as any).defines.IGNORE_LIGHTING = "";
    }

    switch(texture.txi.blending){
      case TXIBlending.ADDITIVE:
        material.transparent = false;
        material.blending = THREE.AdditiveBlending;
        material.depthWrite = false;
        break;
      case TXIBlending.PUNCHTHROUGH:
        material.transparent = false;
        material.blending = THREE.NormalBlending;
        break;
    }

    material.dispatchEvent({
      type: "txi",
      txi: texture.txi,
    });
  }
}
