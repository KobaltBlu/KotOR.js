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
        alphaTest: { value: 1 },
        // Fade distance uniforms
        fadeStartDistance: { value: 50.0 }, // Distance where fade starts
        fadeEndDistance: { value: 100.0 },  // Distance where grass becomes invisible
        useDistanceFade: { value: true }    // Toggle for distance fade
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
    
    attribute vec2 lightmapUV;
    varying vec2 vLightmapUV;

    // Camera distance fade
    uniform float fadeStartDistance;
    uniform float fadeEndDistance;
    uniform bool useDistanceFade;
    varying float vDistanceFade;

    // Trample effect
    uniform vec3 playerPosition;
    uniform float trampleRadius;
    uniform float trampleStrength;
    varying float vTrampleEffect;
    
    // Multi-entity trample using position texture
    uniform sampler2D positionMap;
    uniform vec2 positionMapSize;
    uniform int maxEntities;

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

    void calculateMultiEntityTrample(vec3 worldPosition, out float totalTrampleEffect) {
      totalTrampleEffect = 0.0;
      
      // Sample all entities from the position texture (using constant loop bound)
      for (int i = 0; i < 64; i++) {
        // Convert index to texture coordinates (avoiding modulo operator)
        float x = float(i) - float(int(positionMapSize.x)) * floor(float(i) / positionMapSize.x);
        float y = floor(float(i) / positionMapSize.x);
        vec2 texCoord = vec2(x / positionMapSize.x, y / positionMapSize.y);
        
        // Sample entity data
        vec4 entityData = texture2D(positionMap, texCoord);
        vec3 entityPosition = entityData.xyz;
        float isActive = entityData.w;
        
        // Skip inactive entities
        if (isActive < 0.5) continue;
        
        // Calculate distance to this entity
        float distanceToEntity = distance(worldPosition, entityPosition);
        
        if (distanceToEntity <= trampleRadius) {
          // Calculate trample strength based on distance
          float trampleFactor = 1.0 - (distanceToEntity / trampleRadius);
          totalTrampleEffect += trampleFactor * trampleStrength;
        }
      }
      
      // Clamp total effect
      totalTrampleEffect = min(totalTrampleEffect, 2.0);
    }

    void main() {
      //instanceID
      vInstanceID = instanceID;
      
      vLightmapUV = lightmapUV;

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

      // Calculate world position for both distance fade and trample effects
      vec4 worldPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        worldPosition = instanceMatrix * worldPosition;
      #endif
      worldPosition = modelMatrix * worldPosition;

      // Calculate distance fade effect (still using player position for camera distance)
      float distanceFromPlayer = distance(worldPosition.xyz, playerPosition);
      if (useDistanceFade) {
        // Calculate fade factor (1.0 = fully visible, 0.0 = invisible)
        if (distanceFromPlayer <= fadeStartDistance) {
          vDistanceFade = 1.0;
        } else if (distanceFromPlayer >= fadeEndDistance) {
          vDistanceFade = 0.0;
        } else {
          // Linear interpolation between fadeStartDistance and fadeEndDistance
          vDistanceFade = 1.0 - ((distanceFromPlayer - fadeStartDistance) / (fadeEndDistance - fadeStartDistance));
        }
      } else {
        vDistanceFade = 1.0;
      }
      
      // Calculate multi-entity trample effect
      calculateMultiEntityTrample(worldPosition.xyz, vTrampleEffect);

      // Apply trample effect - bend grass away from all affecting entities
      if (vTrampleEffect > 0.0 && constraint > 0.0) {
        // Calculate average direction from all affecting entities
        vec3 averageDirection = vec3(0.0);
        float directionWeight = 0.0;
        
        for (int i = 0; i < 64; i++) {
          // Convert index to texture coordinates (avoiding modulo operator)
          float x = float(i) - float(int(positionMapSize.x)) * floor(float(i) / positionMapSize.x);
          float y = floor(float(i) / positionMapSize.x);
          vec2 texCoord = vec2(x / positionMapSize.x, y / positionMapSize.y);
          
          vec4 entityData = texture2D(positionMap, texCoord);
          vec3 entityPosition = entityData.xyz;
          float isActive = entityData.w;
          
          if (isActive < 0.5) continue;
          
          float distanceToEntity = distance(worldPosition.xyz, entityPosition);
          if (distanceToEntity <= trampleRadius) {
            vec3 directionFromEntity = normalize(worldPosition.xyz - entityPosition);
            float weight = 1.0 - (distanceToEntity / trampleRadius);
            averageDirection += directionFromEntity * weight;
            directionWeight += weight;
          }
        }
        
        if (directionWeight > 0.0) {
          averageDirection = normalize(averageDirection / directionWeight);
          vec3 trampleOffset = rotationComponent * averageDirection * vTrampleEffect * 0.5;
          transformed.xyz += trampleOffset;
        }
      }

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
    varying float vDistanceFade;
    varying float vTrampleEffect;
    #ifdef USE_LIGHTMAP
      uniform sampler2D lightMap;
      varying vec2 vLightmapUV;
    #endif
    void main() {
      vec2 uvTransform = vec2(
        vSpriteSheet.x + (vSpriteSheet.z * vUv.x), 
        vSpriteSheet.y + (vSpriteSheet.w * vUv.y)
      );
      vec4 texelColor = texture2D( map, uvTransform );
      vec4 lightmapColor = vec4(1.0, 1.0, 1.0, 1.0);

      #ifdef USE_LIGHTMAP
        lightmapColor = texture2D( lightMap, vLightmapUV );
      #endif

      texelColor.rgb *= lightmapColor.rgb;

      // Apply distance fade to alpha
      texelColor.a *= vDistanceFade;

      // Apply trample effect to alpha (make trampled grass slightly more transparent)
      if (vTrampleEffect > 0.0) {
        texelColor.a *= (1.0 - vTrampleEffect * 0.3);
      }

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
