import * as THREE from "three";

import {shadertoy_perlin} from "@engine/render/shaders/chunks/ShaderToyPerlin";
THREE.ShaderChunk.shadertoy_perlin = shadertoy_perlin;

import { Shader } from "@engine/render/shaders/Shader";
import { ShaderOdysseyEmitter } from "@engine/render/shaders/ShaderOdysseyEmitter";
import { ShaderAuroraGUI } from "@engine/render/shaders/ShaderAuroraGUI";
import { ShaderOdysseyModel } from "@engine/render/shaders/ShaderOdysseyModel";
import { ShaderGrass } from "@engine/render/shaders/ShaderGrass";
import { ShaderGUIVoid } from "@engine/render/shaders/ShaderGUIVoid";
import { ShaderGUIBackground } from "@engine/render/shaders/ShaderGUIBackground";
import { ShaderFogOfWar } from "@engine/render/shaders/ShaderFogOfWar";


/**
 * ShaderManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ShaderManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ShaderManager {

  static Shaders: Map<string, Shader> = new Map();

  static AddShader(shader: Shader){
    THREE.ShaderLib[shader.name] = {
      fragmentShader: shader.getFragment(),
      vertexShader: shader.getVertex(),
      uniforms: THREE.UniformsUtils.merge(shader.getUniforms())
    };
    ShaderManager.Shaders.set(shader.name, shader);
  }

  static Init(){
    
  }

}

ShaderManager.AddShader(new ShaderGrass());
ShaderManager.AddShader(new ShaderOdysseyModel());
ShaderManager.AddShader(new ShaderOdysseyEmitter());
ShaderManager.AddShader(new ShaderAuroraGUI());
ShaderManager.AddShader(new ShaderGUIVoid());
ShaderManager.AddShader(new ShaderGUIBackground());
ShaderManager.AddShader(new ShaderFogOfWar());
