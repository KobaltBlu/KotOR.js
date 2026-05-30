import * as THREE from "three";
import { TXIBlending } from "@/enums/graphics/txi/TXIBlending";
import { TXIPROCEDURETYPE } from "@/enums/graphics/txi/TXIPROCEDURETYPE";
import { OdysseyTexture } from "@/three/odyssey/OdysseyTexture";

export type OdysseyTextureResolver = (resRef: string, noCache?: boolean) => Promise<OdysseyTexture>;

export interface ApplyTXIOptions {
  resolveTexture: OdysseyTextureResolver;
  noCache?: boolean;
  managedTextures?: Set<OdysseyTexture>;
}

export class OdysseyMaterialBuilder {
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
      lights: true,
      fog: false,
      transparent: false,
    });

    material.defines = material.defines || {};
    material.defines.AURORA = "";
    material.defines.USE_UV = "";
    material.defines.USE_MAP = "";
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
    material.defines = material.defines || {};
    delete material.defines.CYCLE_MAP;
    delete material.defines.CYCLE_BUMP;
    delete material.defines.WATER;
    delete material.defines.RANDOM;
    delete material.defines.RINGTEXDISTORT;
    delete material.defines.USE_ENVMAP;
    delete material.defines.ENVMAP_TYPE_CUBE;
    delete material.defines.ENVMAP_MODE_REFLECTION;
    delete material.defines.ENVMAP_BLENDING_ADD;
    delete material.defines.ENVMAP_BLENDING_MIX;

    if(material.uniforms.animationVectorMap){
      material.uniforms.animationVectorMap.value.set(0, 0, 0, 0);
    }
    if(material.uniforms.animationVectorBump){
      material.uniforms.animationVectorBump.value.set(0, 0, 0, 0);
    }
    if(material.uniforms.envMap){
      material.uniforms.envMap.value = null;
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

    let hasAnimatedBumpCycle = false;

    if(!!texture.txi.envMapTexture){
      const envmap: OdysseyTexture = await options.resolveTexture(texture.txi.envMapTexture, options.noCache ?? true);
      if(!!envmap){
        registerManagedTexture(envmap);
        envmap.wrapS = envmap.wrapT = THREE.RepeatWrapping;

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
          material.defines.ENVMAP_BLENDING_ADD = "";
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
        console.error(`Envmap missing: ${texture.txi.envMapTexture}`);
      }
    }

    if(!!texture.txi.bumpMapTexture){
      const bumpMap: OdysseyTexture = await options.resolveTexture(texture.txi.bumpMapTexture, options.noCache ?? false);
      if(!!bumpMap){
        registerManagedTexture(bumpMap);
        bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

        if(material instanceof THREE.RawShaderMaterial || material instanceof THREE.ShaderMaterial){
          if(bumpMap.txi.procedureType){
            switch(bumpMap.txi.procedureType){
              case TXIPROCEDURETYPE.CYCLE:
                hasAnimatedBumpCycle = true;
                material.defines.CYCLE_BUMP = "";
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

          if(material.uniforms.animationVectorBump){
            if(bumpMap.txi.numx){
              material.uniforms.animationVectorBump.value.x = bumpMap.txi.numx;
              bumpMap.repeat.x = 1 / material.uniforms.animationVectorBump.value.x;
              bumpMap.updateMatrix();
            }
            if(bumpMap.txi.numy){
              material.uniforms.animationVectorBump.value.y = bumpMap.txi.numy;
              bumpMap.repeat.y = 1 / material.uniforms.animationVectorBump.value.y;
              bumpMap.updateMatrix();
            }
            if(bumpMap.txi.numx && bumpMap.txi.numy){
              material.uniforms.animationVectorBump.value.z = bumpMap.txi.numx * bumpMap.txi.numy;
            }
            if(bumpMap.txi.fps){
              material.uniforms.animationVectorBump.value.w = bumpMap.txi.fps;
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
          material.defines.USE_DISPLACEMENTMAP = "";
          material.defines.ENVMAP_BLENDING_MIX = "";
          delete material.defines.USE_NORMALMAP;
          delete material.defines.ENVMAP_BLENDING_ADD;
          (material as any).combine = THREE.MixOperation;

          if(material.uniforms.bumpMap?.value){
            material.uniforms.bumpMap.value.minFilter = THREE.LinearFilter;
            material.uniforms.bumpMap.value.magFilter = THREE.LinearFilter;
            material.uniforms.bumpMap.value.generateMipmaps = false;
          }

          material.uniforms.bumpScale.value = bumpMap.txi.bumpMapScaling * 0.1;
          material.uniforms.reflectivity.value = 1;
          material.transparent = false;
          material.premultipliedAlpha = false;
          material.needsUpdate = true;
          material.blending = THREE.AdditiveBlending;
          material.uniforms.waterAlpha.value = texture.txi.waterAlpha;

          material.uniforms.animationVectorBump.value.x = bumpMap.txi.numx;
          material.uniforms.animationVectorBump.value.y = bumpMap.txi.numy;
          material.uniforms.animationVectorBump.value.z = bumpMap.txi.numx * bumpMap.txi.numy;
          material.uniforms.animationVectorBump.value.w = bumpMap.txi.fps;
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
      }

      if(texture.txi.procedureType){
        switch(texture.txi.procedureType){
          case TXIPROCEDURETYPE.CYCLE:
            if(!hasAnimatedBumpCycle){
              material.defines.CYCLE_MAP = "";
            }else if(material.defines.hasOwnProperty("CYCLE_MAP")){
              delete material.defines.CYCLE_MAP;
            }
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

      if(material.uniforms.animationVectorMap){
        if(texture.txi.numx){
          material.uniforms.animationVectorMap.value.x = texture.txi.numx;
          texture.repeat.x = 1 / material.uniforms.animationVectorMap.value.x;
          texture.updateMatrix();
        }
        if(texture.txi.numy){
          material.uniforms.animationVectorMap.value.y = texture.txi.numy;
          texture.repeat.y = 1 / material.uniforms.animationVectorMap.value.y;
          texture.updateMatrix();
        }
        if(texture.txi.numx && texture.txi.numy){
          material.uniforms.animationVectorMap.value.z = texture.txi.numx * texture.txi.numy;
        }
        if(texture.txi.fps){
          material.uniforms.animationVectorMap.value.w = texture.txi.fps;
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
