import * as THREE from "three";
import { TXIBlending } from "@core/enums/graphics/txi/TXIBlending";
import { TXIPROCEDURETYPE } from "@core/enums/graphics/txi/TXIPROCEDURETYPE";
import { TextureType } from "@core/enums/loaders/TextureType";
import { OdysseyModelControllerType } from "@core/enums/odyssey/OdysseyModelControllerType";
import { OdysseyModelNodeType } from "@core/enums/odyssey/OdysseyModelNodeType";
import { OdysseyModelMDXFlag } from "@core/enums/odyssey/OdysseyModelMDXFlag";
import { OdysseyTexture } from "@engine/render/three/odyssey/OdysseyTexture";
import { TextureLoader } from "@engine/loaders";
import { DirtyTextureManager } from "@engine/managers/DirtyTextureManager";
import { WindManager } from "@engine/managers/WindManager";
import { TextureAnimationManager } from "@engine/managers/TextureAnimationManager";
import { IOdysseyModelLoaderOptions } from "@engine/interface/odyssey/IOdysseyModelLoaderOptions";
import { type OdysseyModelNodeMesh } from "@engine/odyssey/OdysseyModelNodeMesh";
import { type OdysseyModelNodeDangly } from "@engine/odyssey/OdysseyModelNodeDangly";
import {
  createEmptyOdysseyLightPosArray,
  createEmptyOdysseyLightColorArray,
  syncOdysseyMapTransforms,
} from "@engine/render/shaders/chunks/OdysseyLighting";
import { enableOdysseyMaterialShadowReceive } from "@engine/render/shaders/chunks/OdysseyShadow";
import { installEnvMapRotationHook } from "@engine/render/envMapRotation";
import { nodeMaterialCacheShareable } from "@engine/render/three/odyssey/nodeMaterialCacheShareable";
import type { OdysseyModel3D } from "@engine/render/three/odyssey/OdysseyModel3D";

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
   * Current area DefaultEnvMap resref. envmap assign resolves
   * the envmap resref "DEFAULT" to the module area's DefaultEnvMap before binding.
   * Set by Area (game) / ForgeArea (forge) when an area is loaded.
   */
  static defaultEnvMap: string = '';

  /**
   * Resolve an envmap resref like envmap assign:
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
      syncOdysseyMapTransforms(uniforms, 'map', map);
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
    if(map){
      material.defines.USE_MAP = "";
    }
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
    // TXI envmap — RenderEnvironmentMapped checks the gob envmap first.
    const envMapResRef = OdysseyMaterialBuilder.resolveEnvMapResRef(
      (material.userData?.envMapOverride as string) || texture.txi.envMapTexture
    );

    if(!!envMapResRef){
      const envmap: OdysseyTexture = await options.resolveTexture(envMapResRef, options.noCache ?? true);
      if(!!envmap){
        registerManagedTexture(envmap);
        if((envmap as any).header?.isCubemap || (envmap as any).isCubeTexture){
          // CreateCubeTexture — GL_CLAMP_TO_EDGE on S/T/R.
          envmap.wrapS = envmap.wrapT = THREE.ClampToEdgeWrapping;
        }else{
          envmap.wrapS = envmap.wrapT = THREE.RepeatWrapping;
        }

        if(material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial){
          if(material.uniforms.envMap){
            material.uniforms.envMap.value = envmap;
          }
          envmap.updateMatrix();
          if(material.uniforms.map?.value){
            material.uniforms.map.value.updateMatrix();
          }
          material.defines.USE_ENVMAP = "";
          material.defines.ENVMAP_TYPE_CUBE = "";
          material.defines.ENVMAP_MODE_REFLECTION = "";
          // Per-fragment env sampling — same effect master got from #define PHONG
          // (Three envmap chunks set ENV_WORLDPOS for worldpos/envmap varyings).
          material.defines.ENV_WORLDPOS = "";
          // Default TXI envmaps use ADD (master / environmentMapDest!=0 @
          // : glBlendFunc(ONE_MINUS_DST_ALPHA, ONE) → litDiffuse + env*(1-a)).
          // dest==0 LERP replaces albedo with the cubemap and crushes dark maps
          // like CM_Baremetal; ADD keeps armor color and layers sparse highlights.
          material.defines.ENVMAP_BLENDING_ADD = "";
          // Envmapped meshes are lit in RenderFlat — clear IGNORE so the binder
          // packs nearest lights (same pattern as lightmaps in TextureLoader).
          delete material.defines.IGNORE_LIGHTING;
          if(material.uniforms.envMapAlpha){
            // TXI envmapalpha — one-pass writes this to output alpha; multipass
            // does not scale the RGB blend. Kept for alpha / gob scaling callers.
            material.uniforms.envMapAlpha.value = texture.txi.envMapAlpha ?? 1;
          }
          // TPC faces are uploaded in GL order (CreateCubeTexture). Do not apply
          // Three's CubeTextureLoader X-flip (would mirror / look color-inverted).
          if(material.uniforms.flipEnvMap){
            material.uniforms.flipEnvMap.value = 1;
          }
          if(material.uniforms.reflectivity){
            material.uniforms.reflectivity.value = 1;
          }
          // Hidden rooms are not bound until visible; track the camera from the first draw.
          installEnvMapRotationHook(material);
          material.uniformsNeedUpdate = true;
        }

        material.side = THREE.FrontSide;
        if(texture.txi.waterAlpha == null){
          if(material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshPhongMaterial){
            material.combine = THREE.AddOperation;
            material.reflectivity = 1;
          }
        }
        const shaderMaterial = material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial
          ? material
          : undefined;
        const opacity = shaderMaterial?.uniforms.opacity?.value ?? material.opacity;
        if(!texture.txi.decal && opacity >= 1 && !shaderMaterial?.defines?.hasOwnProperty("HOLOGRAM")){
          material.transparent = false;
        }
        material.needsUpdate = true;

        if(shaderMaterial){
          if(shaderMaterial.defines.hasOwnProperty("HOLOGRAM")){
            material.blending = THREE.NormalBlending;
            material.transparent = true;
            shaderMaterial.uniformsNeedUpdate = true;
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
                // swaps the bound texture — no CYCLE_BUMP UV offset
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
            syncOdysseyMapTransforms(material.uniforms, 'normalMap', bumpMap);
            material.defines.USE_NORMALMAP = "";
            material.uniformsNeedUpdate = true;
            material.defines.TANGENTSPACE_NORMALMAP = "";
            delete material.defines.USE_BUMPMAP;
            delete material.defines.OBJECTSPACE_NORMALMAP;
            if(bumpMap.txi.procedureType === TXIPROCEDURETYPE.CYCLE){
              TextureAnimationManager.register(bumpMap, material, 'normalMap');
            }
          }else if(
            material instanceof THREE.MeshStandardMaterial ||
            material instanceof THREE.MeshPhongMaterial
          ){
            material.normalMap = bumpMap;
            material.normalMapType = THREE.ObjectSpaceNormalMap;
          }
          material.transparent = false;
        }else{
          if(material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial){
            material.uniforms.bumpMap.value = bumpMap;
            syncOdysseyMapTransforms(material.uniforms, 'bumpMap', bumpMap);
            material.defines.USE_BUMPMAP = "";
            // Height bumps must not leave TANGENTSPACE_NORMALMAP — Three's
            // normal_fragment_maps samples normalMap under that define alone.
            delete material.defines.USE_NORMALMAP;
            delete material.defines.TANGENTSPACE_NORMALMAP;
            delete material.defines.OBJECTSPACE_NORMALMAP;
            material.uniformsNeedUpdate = true;
            if(bumpMap.txi.procedureType === TXIPROCEDURETYPE.CYCLE){
              TextureAnimationManager.register(bumpMap, material, 'bumpMap');
            }
            if(material.uniforms?.bumpScale){
              material.uniforms.bumpScale.value = bumpMap.txi.bumpMapScaling;
            }
          }else if(material instanceof THREE.MeshPhongMaterial){
            material.bumpMap = bumpMap;
          }
        }

        if(texture.txi.waterAlpha != null && (material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial)){
          material.defines = material.defines || {};
          material.defines.WATER = "";
          // uses height→normal bump lighting only (ConvertHeightFieldAndLoadNormalMapTexture
          //) — no vertex displacement.
          delete material.defines.USE_DISPLACEMENTMAP;
          material.defines.ENVMAP_BLENDING_MIX = "";
          // Drop the full normal-map path; leave USE_BUMPMAP for height→normal.
          // TANGENTSPACE_NORMALMAP without USE_NORMALMAP leaves normalMap undeclared.
          delete material.defines.USE_NORMALMAP;
          delete material.defines.TANGENTSPACE_NORMALMAP;
          delete material.defines.OBJECTSPACE_NORMALMAP;
          delete material.defines.ENVMAP_BLENDING_ADD;
          delete material.defines.ENVMAP_BLENDING_LERP;

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
      if(material.uniforms.map?.value){
        material.name = material.uniforms.map.value.name;
        material.defines.USE_MAP = "";
        syncOdysseyMapTransforms(material.uniforms, 'map', material.uniforms.map.value);
        material.uniformsNeedUpdate = true;
        // Recompile so HOLOGRAM / map_pars pick up USE_MAP (needsUpdate may have
        // already been set earlier in TextureLoader before this define existed).
        material.needsUpdate = true;
      }

      if(texture.txi.procedureType){
        switch(texture.txi.procedureType){
          case TXIPROCEDURETYPE.CYCLE:
            // CycleTIDTextureController — swap bound map texture, do not remesh UVs
            TextureAnimationManager.register(texture, material, 'map');
            break;
          case TXIPROCEDURETYPE.RANDOM:
            material.defines.RANDOM = "";
            break;
          case TXIPROCEDURETYPE.RINGTEXDISTORT:
            material.defines.RINGTEXDISTORT = "";
            break;
          case TXIPROCEDURETYPE.WATER:
            // Real water sets WATER via waterAlpha / bump-water path above.
            // Diffuse proceduretype water alone (force-distort FX) must not.
            break;
        }
      }
    }

    // Decals and non-additive water get DoubleSide. Additive proceduretype-water
    // (plc_frcdist01 force cages) must stay FrontSide — DualSide coplanar shells
    // depth-fight with the outer additive layer.
    const additiveBlending = texture.txi.blending === TXIBlending.ADDITIVE;
    if(texture.txi.decal || (texture.txi.procedureType == TXIPROCEDURETYPE.WATER && !additiveBlending)){
      material.side = THREE.DoubleSide;
      material.depthWrite = false;
      material.transparent = true;
      (material as any).defines = (material as any).defines || {};
      (material as any).defines.IGNORE_LIGHTING = "";
    }

    switch(texture.txi.blending){
      case TXIBlending.ADDITIVE:
        // Sabers, force-shield shells, and alpha/transparencyHint FX stay in the
        // transparent list so they draw after opaque body / TXI decals.
        // Other additive FX stay opaque.
        {
          const defines = (material as any).defines;
          const shieldOrSaber = !!(defines && ('SABER' in defines || 'FORCE_SHIELD' in defines));
          const alphaFx = !!(material.userData && material.userData.odysseyAlphaFx);
          material.transparent = shieldOrSaber || alphaFx;
        }
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

  static nodeMaterialCacheId(
    odysseyNode: OdysseyModelNodeMesh,
    options?: IOdysseyModelLoaderOptions,
    odysseyModel?: OdysseyModel3D,
  ): string {
    let tMap1 = (odysseyNode.textureMap1 || '') + '';
    if(options?.textureVar && options.textureVar.indexOf('****') === -1){
      tMap1 = options.textureVar;
    }
    const tMap2 = (odysseyNode.textureMap2 || '') + '';
    const tMap3 = (odysseyNode.textureMap3 || '') + '';
    const tMap4 = (odysseyNode.textureMap4 || '') + '';
    const hasLm = !!(odysseyNode.hasLightmap && tMap2.length);
    const fog = odysseyModel?.affectedByFog ? 1 : 0;
    const sr = (options?.receiveShadow || options?.mergeStatic) ? 1 : 0;
    const lit = options?.lighting ? 1 : 0;
    const st = options?.static ? 1 : 0;
    const cs = options?.castShadow === false ? 0 : (options?.castShadow ? 1 : 0);
    const hol = options?.isHologram ? 1 : 0;
    const fs = options?.isForceShield ? 1 : 0;
    const tc = options?.useTweakColor ? 1 : 0;
    const tcv = options?.useTweakColor ? (options.tweakColor | 0) : 0;
    const emo = options?.envMapOverride || 'NONE';
    const fsh = odysseyNode.flagShadow ? 1 : 0;
    const tan = (
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT1) ||
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT2) ||
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT3) ||
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT4)
    ) ? 1 : 0;
    const bg = odysseyNode.backgroundGeometry ? 1 : 0;
    const fr = odysseyNode.flagRender ? 1 : 0;
    const th = odysseyNode.transparencyHint ? 1 : 0;
    let si = 'NONE';
    if(odysseyNode.controllers.has(OdysseyModelControllerType.SelfIllumColor)){
      const selfIllumColor = odysseyNode.controllers.get(OdysseyModelControllerType.SelfIllumColor);
      const frame = selfIllumColor?.data?.[0];
      if(frame){
        si = `${frame.x},${frame.y},${frame.z}`;
      }
    }
    let alpha = '1';
    if(odysseyNode.controllers.has(OdysseyModelControllerType.Alpha)){
      const a = odysseyNode.controllers.get(OdysseyModelControllerType.Alpha)?.data?.[0]?.value;
      if(typeof a === 'number'){ alpha = String(a); }
    }
    const auv = odysseyNode.nAnimateUV
      ? `1,${odysseyNode.fUVDirectionX},${odysseyNode.fUVDirectionY},${odysseyNode.fUVJitter},${odysseyNode.fUVJitterSpeed}`
      : '0';
    const dan = ((odysseyNode.nodeType & OdysseyModelNodeType.Dangly) === OdysseyModelNodeType.Dangly)
      ? `1,${(odysseyNode as OdysseyModelNodeDangly).danglyDisplacement},${(odysseyNode as OdysseyModelNodeDangly).danglyTightness},${(odysseyNode as OdysseyModelNodeDangly).danglyPeriod}`
      : '0';
    const bm = odysseyNode.beaming ? 1 : 0;
    const dirt = odysseyNode.dirtEnabled
      ? `1,${odysseyNode.dirtTexture ?? 1},${odysseyNode.dirtCoordSpace ?? 1}`
      : '0';
    const diff = (!tMap1 || tMap1 === 'toolcolors')
      ? `${odysseyNode.diffuse.r},${odysseyNode.diffuse.g},${odysseyNode.diffuse.b}`
      : 'NONE';
    const hh = (options?.isHologram && odysseyNode.hideInHolograms) ? 1 : 0;
    const uv = (
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV1) ||
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV2) ||
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV3) ||
      (odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV4) ||
      ((odysseyNode.nodeType & OdysseyModelNodeType.Saber) === OdysseyModelNodeType.Saber)
    ) ? 1 : 0;
    const skin = ((odysseyNode.nodeType & OdysseyModelNodeType.Skin) === OdysseyModelNodeType.Skin) ? 1 : 0;

    return [
      `T1:${tMap1 || 'NONE'}`, `T2:${tMap2 || 'NONE'}`, `LM:${hasLm ? 1 : 0}`,
      `T3:${tMap3 || 'NONE'}`, `T4:${tMap4 || 'NONE'}`,
      `FOG:${fog}`, `SR:${sr}`, `LIT:${lit}`, `ST:${st}`, `CS:${cs}`,
      `HOL:${hol}`, `FS:${fs}`, `TC:${tc}`, `TCV:${tcv}`, `EMO:${emo}`,
      `FSH:${fsh}`, `TAN:${tan}`, `BG:${bg}`, `FR:${fr}`, `TH:${th}`,
      `SI:${si}`, `A:${alpha}`, `AUV:${auv}`, `DAN:${dan}`, `BM:${bm}`,
      `DIRT:${dirt}`, `D:${diff}`, `HH:${hh}`, `UV:${uv}`, `SKIN:${skin}`,
    ].join('|');
  }

  /**
   * Materials with per-instance animated state must not share.
   * Anim-dummy leaves without lightmaps may share (same T1/defines) so hangar
   * ships and props stop minting one ShaderMaterial per mesh.
   */
  static nodeMaterialCacheShareable(
    odysseyNode: OdysseyModelNodeMesh,
    options?: IOdysseyModelLoaderOptions,
    uniqueMaterialNodeNames?: Set<string>,
  ): boolean {
    return nodeMaterialCacheShareable(odysseyNode, options, uniqueMaterialNodeNames);
  }

  /** Build MDL mesh material (TXI pipeline via TextureLoader → applyTXIToMaterial). */
  static buildNodeMaterial(
    odysseyModel: OdysseyModel3D,
    parentNode: THREE.Object3D,
    odysseyNode: OdysseyModelNodeMesh,
    options: IOdysseyModelLoaderOptions,
  ): THREE.Material {
    let tMap1 = odysseyNode.textureMap1+'';
    let tMap2 = odysseyNode.textureMap2+'';
    let fallbackTexture = null;

    if(options.textureVar != '' && options.textureVar.indexOf('****') == -1){
      fallbackTexture = tMap1;
      tMap1 = options.textureVar;
    }

    if(tMap1 || tMap2){
      //odysseyNode.Diffuse.r = odysseyNode.Diffuse.g = odysseyNode.Diffuse.b = 0.8;
    }
    let material: THREE.Material;
    if((odysseyNode.nodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB){
      material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        fog: false,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });
    }else{
      const cacheId = OdysseyMaterialBuilder.nodeMaterialCacheId(odysseyNode, options, odysseyModel);
      const canShare = OdysseyMaterialBuilder.nodeMaterialCacheShareable(
        odysseyNode,
        options,
        odysseyModel.materialUniqueAnimatedNodeNames,
      );
      // Share across placeables/doors/rooms — mergeStatic is no longer required.
      // SelfIllum/Alpha animated nodes never share (per-mesh uniform mutation).
      if(canShare && odysseyModel.cachedMaterials.has(cacheId)){
        return odysseyModel.cachedMaterials.get(cacheId)!;
      }

      material = new THREE.ShaderMaterial({
        fragmentShader: THREE.ShaderLib.odyssey.fragmentShader,
        vertexShader: THREE.ShaderLib.odyssey.vertexShader,
        uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.odyssey.uniforms),
        side: THREE.FrontSide,
        lights: false,
        fog: odysseyModel.affectedByFog,
      });
      material.userData.odysseyMaterialCacheId = cacheId;

      if(material instanceof THREE.ShaderMaterial){
        // Detach Vector4 light slots aliased by UniformsUtils.clone(ShaderLib).
        if(material.uniforms.odysseyLightPos){
          material.uniforms.odysseyLightPos.value = createEmptyOdysseyLightPosArray();
          material.userData.odysseyLightPosOwned = true;
        }
        if(material.uniforms.odysseyLightColor){
          material.uniforms.odysseyLightColor.value = createEmptyOdysseyLightColorArray();
          material.userData.odysseyLightColorOwned = true;
        }
        material.uniforms.shininess.value = 0.0000001;
        material.extensions.derivatives = true;
        //material.extensions.fragDepth = true;
        if(options.useTweakColor){
          material.uniforms.diffuse.value = new THREE.Color( odysseyNode.diffuse.r, odysseyNode.diffuse.g, odysseyNode.diffuse.b );
          material.uniforms.tweakColor.value.setRGB((options.tweakColor & 255)/255, ((options.tweakColor >> 8) & 255)/255, ((options.tweakColor >> 16) & 255)/255);
          material.defines.USE_TWEAK_COLOR = '';
        }else{
          material.uniforms.tweakColor.value.setRGB(1, 1, 1);
          material.uniforms.diffuse.value = new THREE.Color( 1, 1, 1 );//odysseyNode.Diffuse.r, odysseyNode.Diffuse.g, odysseyNode.Diffuse.b );
        }
        material.uniforms.time.value = options?.context?.time || 0;
        material.defines = material.defines || {};
        material.defines.AURORA = "";
        material.defines.MAX_ODYSSEY_LIGHTS = "8";

        if(options.isForceShield){
          material.defines.FORCE_SHIELD = "";
          material.defines.IGNORE_LIGHTING = "";
        }

        if(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV1 ||
          odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV2 ||
          odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV3 ||
          odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.UV4 ||
          ((odysseyNode.nodeType & OdysseyModelNodeType.Saber) == OdysseyModelNodeType.Saber)
          ){
          material.defines.USE_UV = "";
        }

        if(odysseyNode.controllers.has(OdysseyModelControllerType.SelfIllumColor)){
          let selfIllumColor = odysseyNode.controllers.get(OdysseyModelControllerType.SelfIllumColor);
          const frame = selfIllumColor.data[0];
          if(frame){
            material.defines.SELFILLUMCOLOR = "";
            material.uniforms.selfIllumColor.value.setRGB(frame.x, frame.y, frame.z);
          }
        }

        // SetBeaming — beaming meshes use beamingProjectionAlpha as blend alpha.
        if(odysseyNode.beaming){
          material.userData.beaming = true;
          material.defines = material.defines || {};
          material.defines.USE_ODYSSEY_BEAMING = '';
          material.transparent = true;
          material.blending = THREE.AdditiveBlending;
          material.depthWrite = false;
          if(material.uniforms.opacity){
            material.uniforms.opacity.value = 0;
          }
          material.visible = false;
        }
      }

      if(!odysseyNode.flagRender && !((odysseyNode.nodeType & OdysseyModelNodeType.AABB) == OdysseyModelNodeType.AABB)){
        material.visible = false;
      }

      // envmap assign — object-level envmap from appearance.2da
      // ENVMAP / baseitems partEnvMap, applied to all parts and overriding the TXI envmap.
      if(options.envMapOverride){
        material.userData.envMapOverride = options.envMapOverride;
      }

      odysseyModel.materials.push(material);

      if(odysseyNode.hasLightmap && tMap2.length){
        material.userData.lightmap = tMap2;
        material.userData.odysseyAuthoredLightmap = true;
        TextureLoader.enQueue(tMap2, material, TextureType.LIGHTMAP);
      }

      if(options.receiveShadow || options.mergeStatic){
        enableOdysseyMaterialShadowReceive(material);
      }

      if((!(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT1) &&
        !(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT2) &&
        !(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT3) &&
        !(odysseyNode.MDXDataBitmap & OdysseyModelMDXFlag.TANGENT4) &&
        !odysseyNode.flagShadow && !options.castShadow) || odysseyNode.backgroundGeometry || options.static){
          if(!options.lighting){
            material.defines.IGNORE_LIGHTING = "";
          }
      }

      if((odysseyNode.nodeType & OdysseyModelNodeType.Saber) == OdysseyModelNodeType.Saber){
        material.defines.IGNORE_LIGHTING = "";
        material.defines.SABER = "";
        // enableLightsaberBlurAdd — additive, no depth write, double-sided.
        material.transparent = true;
        material.blending = THREE.AdditiveBlending;
        material.depthWrite = false;
        material.side = THREE.DoubleSide;
      }

      if(options.isHologram){
        material.defines.HOLOGRAM = "";
        material.transparent = true;
        if(odysseyNode.hideInHolograms){
          material.visible = false;
        }
      }

      // TSL dirt overlay — Draw case 0x10.
      if(odysseyNode.dirtEnabled && material instanceof THREE.ShaderMaterial){
        const slot = Math.max(0, Math.min(2, ((odysseyNode.dirtTexture ?? 1) | 0) - 1));
        const dirtMap = DirtyTextureManager.getTexture(slot);
        if(dirtMap){
          material.defines.USE_DIRT = "";
          if(material.uniforms.dirtMap){
            material.uniforms.dirtMap.value = dirtMap;
          }else{
            material.uniforms.dirtMap = { value: dirtMap };
          }
          if(material.uniforms.dirtWorldspace){
            material.uniforms.dirtWorldspace.value = (odysseyNode.dirtCoordSpace ?? 1) !== 0 ? 1 : 0;
          }else{
            material.uniforms.dirtWorldspace = { value: (odysseyNode.dirtCoordSpace ?? 1) !== 0 ? 1 : 0 };
          }
          if(material.uniforms.dirtScale){
            material.uniforms.dirtScale.value = 0.1;
          }else{
            material.uniforms.dirtScale = { value: 0.1 };
          }
          material.needsUpdate = true;
        }
      }

      if(material instanceof THREE.ShaderMaterial){
        //Set dangly uniforms
        if((odysseyNode.nodeType & OdysseyModelNodeType.Dangly) == OdysseyModelNodeType.Dangly && odysseyNode) {
          const node: OdysseyModelNodeDangly = odysseyNode as any;
          material.uniforms.danglyDisplacement.value = node.danglyDisplacement;
          material.uniforms.danglyTightness.value = node.danglyTightness;
          material.uniforms.danglyPeriod.value = node.danglyPeriod;
          WindManager.bindWindUniforms(material.uniforms, material);
          material.defines.DANGLY = '';
          material.needsUpdate = true;
        }

        //Set animated uv uniforms — ProceduralAnimateHierarchy
        if(odysseyNode.nAnimateUV){
          material.uniforms.animatedUV.value.set(odysseyNode.fUVDirectionX, odysseyNode.fUVDirectionY, odysseyNode.fUVJitter, odysseyNode.fUVJitterSpeed);
          if(material.uniforms.animatedUVState){
            material.uniforms.animatedUVState.value.set(0, 0, 0, 0);
          }
          material.defines.ANIMATED_UV = '';
        }
      }

      let hasAlphaController = false;
      odysseyNode.controllers.forEach( (controller) => {
        if(controller.type === OdysseyModelControllerType.Alpha){
          hasAlphaController = true;
        }
      });
      // Additive TXI re-affirms transparent via this flag (force-cage shells, etc.).
      if(odysseyNode.transparencyHint || hasAlphaController){
        material.userData.odysseyAlphaFx = true;
      }

      if(odysseyNode.transparencyHint){
        material.transparent = true;
      }

      odysseyNode.controllers.forEach( (controller) => {
        switch(controller.type){
          case OdysseyModelControllerType.Alpha:

            if(material instanceof THREE.ShaderMaterial){
              material.uniforms.opacity.value = controller.data[0].value;
            }else{
              material.opacity = controller.data[0].value;
            }

            if(controller.data[0].value < 1){
              material.transparent = true;
            }else if(!odysseyNode.transparencyHint){
              material.transparent = false;
            }
          break;
        }
      });

      if(!!tMap1 && tMap1 != 'toolcolors'){
        material.userData.map = tMap1;
        TextureLoader.enQueue(tMap1, material, TextureType.TEXTURE, undefined, fallbackTexture);
      }else{
        if(material instanceof THREE.ShaderMaterial){
          material.uniforms.diffuse.value.copy(odysseyNode.diffuse);
        }
      }

      material.needsUpdate = true;
      if(canShare){
        odysseyModel.cachedMaterials.set(cacheId, material);
      }
      material.addEventListener('txi', (event: any) => {
        const mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> = (parentNode as any).mesh;
        if(mesh && mesh.material.blending == THREE.AdditiveBlending){
          // transparencyHint outer shells draw after inner (hint false → 2, true → 3).
          mesh.renderOrder = odysseyNode.transparencyHint ? 3 : 2;
        }
      });
    }
    return material;
  }
}
