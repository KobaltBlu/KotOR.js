import * as THREE from "three";

import {shadertoy_perlin} from "../shaders/chunks/ShaderToyPerlin";
THREE.ShaderChunk.shadertoy_perlin = shadertoy_perlin;

import { Shader } from "../shaders/Shader";
import { ShaderOdysseyEmitter } from "../shaders/ShaderOdysseyEmitter";
import { ShaderAuroraGUI } from "../shaders/ShaderAuroraGUI";
import { ShaderOdysseyModel } from "../shaders/ShaderOdysseyModel";
import { ShaderGrass } from "../shaders/ShaderGrass";
import { ShaderGUIVoid } from "../shaders/ShaderGUIVoid";
import { ShaderGUIBackground } from "../shaders/ShaderGUIBackground";
import { ShaderFogOfWar } from "../shaders/ShaderFogOfWar";


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
