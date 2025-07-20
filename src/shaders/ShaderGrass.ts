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
    this.name = 'grass';
    this.uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib["common"],
      {
        map: { value: null },
        lightMap: { value: null },
        time: { value: 0 },
        ambientColor: { value: new THREE.Color() },
        windPower: { value: 0 },
        playerPosition: { value: new THREE.Vector3() },
        alphaTest: { value: 1 }
      }
    ]);
    this.vertex = `
    #include <common>
    #include <uv_pars_vertex>
    #include <logdepthbuf_pars_vertex>

    //instanceID
    attribute float instanceID;
    varying float vInstanceID;

    //time
    uniform float time;

    //wind
    uniform float windPower;
    attribute float constraint;

    //grassUV
    attribute vec4 grassUV;
    uniform vec4 probability;

    attribute float quadIdx;
    varying vec4 vSpriteSheet;

    // Deterministic random from instanceID
    float rand01(float x) {
      return fract(sin(x * 12345.6789) * 98765.4321);
    }

    float pickQuadrant(float instanceID) {
      float r = rand01(instanceID);

      float t0 = probability.x;
      float t1 = t0 + probability.y;
      float t2 = t1 + probability.z;
      // float t3 = t2 + probability.w;  // should be 1.0

      if (r < t0) return 0.0;       // LL
      else if (r < t1) return 1.0;  // LR
      else if (r < t2) return 2.0;  // UL
      else return 3.0;              // UR
    }

    void main() {
      //instanceID
      vInstanceID = instanceID;

      //uv (THREE.js)
      #include <uv_vertex>

      float uvFrameIndex = pickQuadrant((vInstanceID * 3.0) + quadIdx);

      //BEGIN: SpriteSheet Calculations
      float framesX = 2.0;
      float framesY = 2.0;
      float totalFrames = 4.0;

      float column = floor(mod( uvFrameIndex, framesX ));
      float row = floor( (uvFrameIndex - column) / framesX );
      float columnNorm = column / framesX;
      float rowNorm = row / framesY;

      vSpriteSheet.x = columnNorm;
      vSpriteSheet.y = rowNorm;
      vSpriteSheet.z = (1.0 / framesX);
      vSpriteSheet.w = (1.0 / framesY);
      //END: SpriteSheet Calculations

      //begin_vertex (THREE.js)
      #include <begin_vertex>

      mat3 rotationComponent = mat3(instanceMatrix);

      //wind logic
      float wind = constraint * windPower * ( cos(time + vInstanceID) * 0.1 );
      vec3 windOffset = rotationComponent * vec3(cos(wind), sin(wind), 0.0);
      transformed.xyz += windOffset;

      //project_vertex (THREE.js)
      #include <project_vertex>

      //logdepthbuf_vertex (THREE.js)
      #include <logdepthbuf_vertex>

      //worldpos_vertex (THREE.js)
      #include <worldpos_vertex>
    }`;

    this.fragment = `
    uniform vec3 diffuse;
    uniform float opacity;
    uniform float alphaTest;
    #include <common>
    #include <uv_pars_fragment>
    #include <map_pars_fragment>
    #include <fog_pars_fragment>
    #include <logdepthbuf_pars_fragment>
    varying float vInstanceID;
    varying vec4 vSpriteSheet;
    void main() {
      vec2 uvTransform = vec2(
        vSpriteSheet.x + (vSpriteSheet.z * vUv.x), 
        vSpriteSheet.y + (vSpriteSheet.w * vUv.y)
      );
      vec4 texelColor = texture2D( map, uvTransform );
      if (texelColor[3] < alphaTest) {
        discard;
      }

      //logdepthbuf_fragment (THREE.js)
      #include <logdepthbuf_fragment>

      //output fragment color
      gl_FragColor = vec4( texelColor.rgb, texelColor.a );
    }`;
  }

}

// ShaderGrass.Init();
