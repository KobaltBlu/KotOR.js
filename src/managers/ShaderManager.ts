import * as THREE from "three";
import { Shader } from "../shaders/Shader";
import { ShaderOdysseyEmitter } from "../shaders/ShaderOdysseyEmitter";
import { ShaderAuroraGUI } from "../shaders/ShaderAuroraGUI";
import { ShaderOdysseyModel } from "../shaders/ShaderOdysseyModel";
import { ShaderGrass } from "../shaders/ShaderGrass";

export class ShaderManager {

  static Shaders: Map<string, Shader> = new Map();

  static AddShader(shader: Shader){
    THREE.ShaderLib[shader.name] = {
      fragmentShader: shader.getFragment(),
      vertexShader: shader.getVertex(),
      uniforms: {},//THREE.UniformsUtils.merge(shader.getUniforms())
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
