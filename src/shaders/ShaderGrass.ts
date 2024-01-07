import * as THREE from "three";
import { Shader } from "./Shader";

/**
 * ShaderGrass class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ShaderGrass.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ShaderGrass extends Shader {

  constructor(){
    super();
    this.name = 'grass'
    this.vertex = `
    //precision highp float; //Already defined in shader code
    //uniform mat4 modelViewMatrix; //Already defined in shader code
    //uniform mat4 projectionMatrix; //Already defined in shader code
    uniform float time;
    uniform float windPower;
    uniform vec3 playerPosition;
    uniform float alphaTest;
    //attribute vec3 position; //Already defined in shader code
    attribute vec4 offset;
    //attribute vec4 orientation;
    attribute float constraint;
    attribute vec4 grassUV;
    attribute vec2 lmUV;
    attribute float quadIdx;
    varying vec2 vUv;
    varying vec2 vlmUv;
    varying float dist;
    varying float distCulled;
    varying vec4 vSpriteSheet;

    ${THREE.ShaderChunk['fog_pars_vertex']}

    // http://www.geeks3d.com/20141201/how-to-rotate-a-vertex-by-a-quaternion-in-glsl/
    vec3 applyQuaternionToVector( vec4 q, vec3 v ){
      return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
    }

    mat4 rotationZ( in float angle ) {
      return mat4(	cos(angle),		-sin(angle),	0,	0,
               sin(angle),		cos(angle),		0,	0,
                  0,				0,		1,	0,
                  0,				0,		0,	1);
    }

    void main() {

      float uvFrameIndex = grassUV.x;
      //vVi = texIndex;

      if(quadIdx == 0.0){
        uvFrameIndex = grassUV.x;
      }else if(quadIdx == 1.0){
        uvFrameIndex = grassUV.y;
      }else if(quadIdx == 2.0){
        uvFrameIndex = grassUV.z;
      }else{
        uvFrameIndex = grassUV.w;
      }

      //BEGIN: SpriteSheet Calculations
      float framesX = 2.0;
      float framesY = 2.0;
      float totalFrames = 4.0;
      float frameNumber = uvFrameIndex;

      float column = floor(mod( frameNumber, framesX ));
      float row = floor( (frameNumber - column) / framesX );
      float columnNorm = column / framesX;
      float rowNorm = row / framesY;

      vSpriteSheet.x = columnNorm;
      vSpriteSheet.y = rowNorm;
      vSpriteSheet.z = (1.0 / framesX);
      vSpriteSheet.w = (1.0 / framesY);
      //END: SpriteSheet Calculations

      //Pass the uv value to the fragment shader
      vUv = uv;
      vlmUv = lmUV;

      float wind = constraint * windPower * ( cos(time) * 0.1 );
        
      vec3 vPosition = (vec4(position, 1.0) * rotationZ(offset.w)).xyz;
      vec3 newPos = offset.xyz + vPosition - vec3(0.5, 0.5, 0.0);

      vec3 windOffset = vec3(cos(wind), sin(wind), 0.0);

      dist = distance(vec2(playerPosition), vec2(offset.xy));
      float radius = 1.0;

      vec3 trample = vec3(0.0, 0.0, 0.0);

      if(constraint == 1.0){
        
        if(dist < radius){
          vec3 collisionVector = playerPosition - offset.xyz;
          float strength = dist/radius;
          trample.x = collisionVector.x * (1.0 - strength);
          trample.y = collisionVector.y * (1.0 - strength);
          trample.z = -strength;
        }

      }

      distCulled = 1.0;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos + windOffset, 1.0);
    }`;

    this.fragment = `
    precision highp float;
    uniform sampler2D map;
    uniform sampler2D lightMap;
    uniform vec3 ambientColor;
    uniform float alphaTest;
    varying vec2 vUv;
    varying vec2 vlmUv;
    varying float dist;
    varying float distCulled;
    varying vec4 vSpriteSheet;

    ${THREE.ShaderChunk[ "common" ]}
    ${THREE.ShaderChunk[ "fog_pars_fragment" ]}

    void main() {
      
      vec2 uvTransform = vec2(
        vSpriteSheet.x + (vSpriteSheet.z * vUv.x), 
        vSpriteSheet.y + (vSpriteSheet.w * vUv.y)
      );

      vec4 textureColor = texture2D(map, uvTransform);
      vec4 lightmapColor = texture2D( lightMap, vlmUv );

      if (textureColor[3] < alphaTest) {
        discard;
      } else {
        #ifdef USE_LIGHTMAP
          gl_FragColor = lightmapColor * textureColor;
        #else
          gl_FragColor = textureColor;
        #endif
        gl_FragColor.a = distCulled;
        /*${THREE.ShaderChunk[ "fog_fragment" ]}*/
      }

    }`;
  }

}

// ShaderGrass.Init();
