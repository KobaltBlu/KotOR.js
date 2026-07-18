import * as THREE from "three";
import { Shader } from "@/shaders/Shader";

/**
 * ShaderOdysseyEmitter class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ShaderOdysseyEmitter.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ShaderOdysseyEmitter extends Shader {

  constructor(){
    super();
    this.name = 'odyssey-emitter';

    this.uniforms = [
      THREE.ShaderLib.basic.uniforms,
      { map: { value: null } },
      { tDepth: { value: null } },
      { textureAnimation: { value: new THREE.Vector4(1, 1, 1, 1) } },
      { frameRange: { value: new THREE.Vector2(0, 0) } },
      { colorStart: { value: new THREE.Color(1, 1, 1) } },
      { colorMid: { value: new THREE.Color(1, 1, 1) } },
      { colorEnd: { value: new THREE.Color(1, 1, 1) } },
      { opacity: { value: new THREE.Vector3(1, 1, 1) } },
      { scale: { value: new THREE.Vector3(1, 1, 1) } },
      { scaleY: { value: new THREE.Vector3(0, 0, 0) } },
      { mass: { value: new THREE.Vector3(0, 0, 0) } },
      { matrix: { value: new THREE.Matrix4() } },
      { rotate: { value: 0 } },
      { drag: { value: 0 } },
      { velocity: { value: 0 } },
      { randVelocity: { value: 0 } },
      { time: { value: 0.0 } },
      { fps: { value: 0.0 } },
      { maxAge: { value: 1.0 } },
      { blurLength: { value: 0.0 } },
      { tintColor: { value: new THREE.Color(1, 1, 1) } },
      { deadSpace: { value: 0.0 } },
      { resolution: { value: new THREE.Vector2(1, 1) } },
      { softFactor: { value: 10.0 } },
      { parentAlpha: { value: 1.0 } },
      // Retail RenderStandard: percentStart==255 → start↔end; else three-key breakpoints
      { lifePercents: { value: new THREE.Vector3(255, 0.5, 1) } },
    ];

    this.vertex = `
    uniform float time;
    uniform vec4 textureAnimation;
    uniform vec2 frameRange;
    uniform float maxAge;
    uniform float rotate;
    uniform float drag;
    uniform float fps;
    uniform vec3 opacity;
    uniform vec3 scale;
    uniform vec3 scaleY;
    uniform vec3 mass;
    uniform vec3 colorStart;
    uniform vec3 colorMid;
    uniform vec3 colorEnd;
    uniform mat4 matrix;
    // x=percentStart (255 = two-key), y=percentMid, z=percentEnd — RenderStandard @ 0048f000
    uniform vec3 lifePercents;
    #ifdef Motion_Blur
      uniform float blurLength;
      attribute vec3 prevOffset;
    #endif

    #ifdef DEADSPACE
      uniform float deadSpace;
    #endif

    #ifdef POINTS

    #else
      attribute vec3 offset;
    #endif

    attribute vec4 velocity;
    attribute vec4 props;
    attribute float ids;
    varying vec4 vSpriteSheet;
    varying vec3 colorMixed;
    varying float alpha;
    varying vec2 vUv;

    ${THREE.ShaderChunk[ "common" ]}
    ${THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ]}

    // http://www.geeks3d.com/20141201/how-to-rotate-a-vertex-by-a-quaternion-in-glsl/
    vec3 applyQuaternionToVector( vec4 q, vec3 v ){
      return v + 2.0 * cross( q.xyz, cross( q.xyz, v ) + q.w * v );
    }
    
    //Begin From THREE.SPE
    float when_gt(float x, float y) {
        return max(sign(x - y), 0.0);
    }

    float when_lt(float x, float y) {
        return min( max(1.0 - sign(x - y), 0.0), 1.0 );
    }

    float when_eq( float x, float y ) {
        return 1.0 - abs( sign( x - y ) );
    }

    float when_ge(float x, float y) {
      return 1.0 - when_lt(x, y);
    }

    float when_le(float x, float y) {
      return 1.0 - when_gt(x, y);
    }

    // Branch-avoiding logical operators
    // (to be used with above comparison fns)
    float and(float a, float b) {
      return a * b;
    }

    float or(float a, float b) {
      return min(a + b, 1.0);
    }

    float getFloatOverLifetime( in float positionInTime, in vec3 attr ) {
      // Retail: field37_0xdc == 255 → lerp start→end over full life (skip mid)
      if(lifePercents.x >= 254.5){
        return mix(attr.x, attr.z, clamp(positionInTime, 0.0, 1.0));
      }

      float t = clamp(positionInTime, 0.0, 1.0);
      float ps = lifePercents.x;
      float pm = lifePercents.y;
      float pe = lifePercents.z;

      if(t >= pe){
        return attr.z;
      }
      if(t < pm){
        if(t < ps){
          return attr.x;
        }
        float denom = pm - ps;
        float u = denom > 1e-6 ? (t - ps) / denom : 1.0;
        return mix(attr.x, attr.y, clamp(u, 0.0, 1.0));
      }
      float denom = pe - pm;
      float u = denom > 1e-6 ? (t - pm) / denom : 1.0;
      return mix(attr.y, attr.z, clamp(u, 0.0, 1.0));
    }
    
    vec3 getColorOverLifetime( in float positionInTime, in vec3 color1, in vec3 color2, in vec3 color3 ) {
      vec3 value = vec3( 0.0 );
      value.x = getFloatOverLifetime( positionInTime, vec3( color1.x, color2.x, color3.x ) );
      value.y = getFloatOverLifetime( positionInTime, vec3( color1.y, color2.y, color3.y ) );
      value.z = getFloatOverLifetime( positionInTime, vec3( color1.z, color2.z, color3.z ) );
      return value;
    }
    //End From THREE.SPE

    //https://gist.github.com/onedayitwillmake/3288507
    mat4 rotationX( in float angle ) {
      return mat4(	1.0,		0,			0,			0,
              0, 	cos(angle),	-sin(angle),		0,
              0, 	sin(angle),	 cos(angle),		0,
              0, 			0,			  0, 		1);
    }

    mat4 rotationY( in float angle ) {
      return mat4(	cos(angle),		0,		sin(angle),	0,
                   0,		1.0,			 0,	0,
              -sin(angle),	0,		cos(angle),	0,
                  0, 		0,				0,	1);
    }

    mat4 rotationZ( in float angle ) {
      return mat4(	cos(angle),		-sin(angle),	0,	0,
               sin(angle),		cos(angle),		0,	0,
                  0,				0,		1,	0,
                  0,				0,		0,	1);
    }

    void main() {

      highp float age = props.x;
      highp float maxAge = props.y;
      float alive = props.z;
      
      highp float positionInTime = age / maxAge;
      if(maxAge == -1.0){
        positionInTime = age / 1.0;
      }

      vec3 force = vec3(0.0);
      #ifndef CPU_PHYSICS
      // Legacy SPE approximation (billboards). World-space Fountain uses CPU MoveFunc instead.
      vec3 vel   = vec3(velocity.xyz) * age;
      vec3 accel = mass;

      force += vel;
      force *= 1.0 - (positionInTime * 0.5) * drag;
      force += accel * (age*5.0);
      #endif

      //SpriteSheet Calculations
      float framesX = textureAnimation.x;
      float framesY = textureAnimation.y;
      float loopCount = textureAnimation.w;
      float totalFrames = textureAnimation.z;
      // Retail frameStart/frameEnd (PartEmitter +0x70/+0x6c): animate within [start, end].
      float startF = frameRange.x;
      float endF = frameRange.y;
      float span = max(endF - startF, 0.0) + 1.0;

      #ifdef FPS
        float deltaMax = (1.0 / max(fps, 0.001)) * span;
        float fTime = mod(time, deltaMax) / max(deltaMax, 1e-6);
        float frameNumber = startF + mod( fTime * span, span );
      #else
        float frameNumber = startF + mod( positionInTime * span, span );
      #endif
      
      #ifdef Aligned_to_Particle_Dir
       frameNumber = startF + mod( ids * span, span );
      #endif

      #ifdef RANDOM_PLAYBACK
        // ids holds birth frame from Fountain Update RANDOM (bit 5) @ birth
        frameNumber = mod( ids + (frameNumber - startF), span ) + startF;
      #endif

      // Clamp frame when loop is disabled (Single update emitters)
      if(loopCount < 1.0 && frameNumber > endF) {
        frameNumber = endF;
      }

      float column = floor(mod( frameNumber, framesX ));
      float row = floor( (frameNumber - column) / framesX );

      float columnNorm = column / framesX;
      float rowNorm = row / framesY;

      vSpriteSheet.x = 1.0 / framesX;
      vSpriteSheet.y = 1.0 / framesY;
      vSpriteSheet.z = columnNorm;
      vSpriteSheet.w = rowNorm;

      //Pass the uv value to the fragment shader
      vUv = uv;

      //Get the color value to send to the fragment shader
      colorMixed = getColorOverLifetime(positionInTime, colorStart, colorMid, colorEnd);

      //Get the alpha value to send to the fragment shader
      alpha = getFloatOverLifetime( positionInTime, vec3( opacity.x, opacity.y, opacity.z ) ) * alive;

      #ifdef DEADSPACE
        vec3 viewDir = normalize(-vec3(modelViewMatrix[3].xyz));
        vec3 particleDir = normalize(velocity.xyz + vec3(0.0001));
        float angleToCam = acos(clamp(dot(viewDir, particleDir), -1.0, 1.0));
        if(angleToCam < deadSpace) {
          alpha = 0.0;
        }
      #endif

      if(maxAge == -1.0){
        positionInTime = 1.0;
      }

      //Get the current scale of the particle
      float scaleF = getFloatOverLifetime( positionInTime, vec3( scale.x, scale.y, scale.z ) );
      float scaleFY = scaleF;
      // Non-square particle sizing when Y scale values are provided
      if(scaleY.x > 0.0 || scaleY.y > 0.0 || scaleY.z > 0.0) {
        scaleFY = getFloatOverLifetime( positionInTime, vec3( scaleY.x, scaleY.y, scaleY.z ) );
      }

      #ifdef POINTS

        //Override the modelViewMatrix so we can ignore preset rotation's (That way the plane will lay flat on the ground)
        mat4 worldZMatrix = viewMatrix * mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);

        //Points mode renders particles always facing the camera
        #ifdef CPU_PHYSICS
          // position attribute holds world-space particle centers
          vec3 newPos = position;
          vec4 mvPos = viewMatrix * vec4( newPos, 1.0);
          gl_PointSize = (scaleF*2000.0) / length( mvPos.xyz );
          gl_Position = projectionMatrix * mvPos;
        #else
          vec3 newPos = position + force;
          vec4 mvPos = worldZMatrix * vec4( newPos, 1.0);
          gl_PointSize = (scaleF*2000.0) / length( mvPos.xyz );
          gl_Position = projectionMatrix * worldZMatrix * (vec4(newPos, 1.0));
        #endif
      #else
        #ifdef LINKED
          #ifdef LIGHTNING
            //Override the modelViewMatrix so we can ignore preset rotation's (That way the plane will lay flat on the ground)
            mat4 worldZMatrix = viewMatrix * mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, vec4(0.0, 0.0, 0.0, 1.0));
            gl_Position = projectionMatrix * worldZMatrix * vec4(position, 1.0);
          #else
            // Linked ribbon: full world-space L/R in position; offset buffer unused — do not add scaleF here
            mat4 worldZMatrix = viewMatrix * mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, vec4(0.0, 0.0, 0.0, 1.0));
            gl_Position = projectionMatrix * worldZMatrix * vec4(position, 1.0);
          #endif
        #else
          #ifdef Motion_Blur
            // Retail RenderMotionBlurred @ 00490820:
            // halfW = size (after size*0.5 doubled); alongPad = sizeY*0.25 (or size*0.25).
            // Quad spans head↔tail, then extends ±alongPad past each end.
            vec3 head = offset;
            vec3 tail = prevOffset;
            vec3 motion = head - tail;
            float motionLen = length(motion);
            vec3 along = motionLen > 1e-5 ? motion / motionLen : vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
            vec3 toCam = normalize(cameraPosition - head);
            vec3 side = cross(along, toCam);
            float sideLen = length(side);
            if(sideLen < 1e-5){
              side = cross(along, vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
              sideLen = length(side);
            }
            side = side / max(sideLen, 1e-5);
            float halfW = scaleF;
            float alongPad = (scaleFY > 0.0 ? scaleFY : scaleF) * 0.25;
            // PlaneGeometry position.x/y ∈ [-0.5, 0.5]
            vec3 worldPos = mix(tail, head, position.y + 0.5)
              + side * (position.x * halfW * 2.0)
              + along * (position.y * alongPad * 2.0);
            gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
          #else
          //Render particles as plane geometry so we can control it's rotation
          #ifdef Aligned_to_Particle_Dir
            #ifdef CPU_PHYSICS
              // World-space center; splat uses velocity.xyz as surface normal
              if(props.w > 0.5){
                vec3 n = normalize(velocity.xyz + vec3(1e-6));
                vec3 helper = abs(n.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
                vec3 t = normalize(cross(helper, n));
                vec3 b = cross(n, t);
                vec3 worldPos = offset + t * (position.x * scaleF) + b * (position.y * scaleF);
                gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
              }else{
                vec4 vertex = vec4( position * scaleF, 1.0 ) * matrix;
                vec3 worldPos = offset + vertex.xyz;
                gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
              }
            #else
              vec4 vertex = vec4( position, 1.0 ) * matrix;
              vec3 newPos = offset + (vertex.xyz * scaleF);
              gl_Position = projectionMatrix * modelViewMatrix * ( vec4(newPos, 1.0));
            #endif
          #else
            // Apply non-square scaling to quad vertices
            vec3 scaledPos = vec3(position.x * scaleF, position.y * scaleFY, position.z);

            #ifdef CPU_PHYSICS
              // Retail: particle offset is world-space; billboard in view without emitter model matrix.
              // Splatted (props.w): plane lies on hit surface — normal in velocity.xyz (RenderStandard).
              if(props.w > 0.5){
                vec3 n = normalize(velocity.xyz + vec3(1e-6));
                vec3 helper = abs(n.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
                vec3 t = normalize(cross(helper, n));
                vec3 b = cross(n, t);
                vec3 worldPos = offset + t * scaledPos.x + b * scaledPos.y;
                gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
              }else{
              #ifdef Billboard_to_World_Z
                vec3 worldPos = offset + scaledPos;
                mat4 worldZMatrix = viewMatrix * mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);
                vec4 mvCenter = viewMatrix * vec4(offset, 1.0);
                worldZMatrix[3][0] = mvCenter.x;
                worldZMatrix[3][1] = mvCenter.y;
                worldZMatrix[3][2] = mvCenter.z;
                gl_Position = projectionMatrix * worldZMatrix * ( vec4(scaledPos, 1.0) * rotationZ(rotate * age) );
              #else
                #ifdef Aligned_to_World_Z
                  mat4 worldZMatrix = viewMatrix * mat4(1.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0);
                  vec4 mvCenter = viewMatrix * vec4(offset, 1.0);
                  worldZMatrix[3][0] = mvCenter.x;
                  worldZMatrix[3][1] = mvCenter.y;
                  worldZMatrix[3][2] = mvCenter.z;
                  gl_Position = projectionMatrix * worldZMatrix * ( vec4(scaledPos, 1.0) * rotationZ(rotate * age) );
                #else
                  // Billboard_to_Local_Z / default: camera-facing at world offset
                  vec4 mvPos = viewMatrix * vec4(offset, 1.0);
                  vec4 local = vec4(scaledPos, 1.0) * rotationZ(rotate * age);
                  mvPos.xy += local.xy;
                  gl_Position = projectionMatrix * mvPos;
                #endif
              #endif
              }
            #else
            vec3 newPos = (offset) + scaledPos + force;

            #ifdef Billboard_to_World_Z
              //Override the modelViewMatrix so we can ignore preset rotation's (That way the plane will lay flat on the ground)
              mat4 worldZMatrix = viewMatrix * mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);

              //Copy over the positions from the previous modelViewMatrix
              worldZMatrix[3][0] = modelViewMatrix[3][0];
              worldZMatrix[3][1] = modelViewMatrix[3][1];
              worldZMatrix[3][2] = modelViewMatrix[3][2];

              // ParticleRot: angular velocity (rad/s in uniform). Match chunk emitters: angle = rate * age.
              gl_Position = projectionMatrix * worldZMatrix * ( vec4(newPos, 1.0) * rotationZ(rotate * age) );
            #else
              #ifdef Aligned_to_World_Z
                // Perpendicular to ground: rotate 90 degrees around X from world Z alignment
                mat4 worldZMatrix = viewMatrix * mat4(1.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0);
                worldZMatrix[3][0] = modelViewMatrix[3][0];
                worldZMatrix[3][1] = modelViewMatrix[3][1];
                worldZMatrix[3][2] = modelViewMatrix[3][2];
                gl_Position = projectionMatrix * worldZMatrix * ( vec4(newPos, 1.0) * rotationZ(rotate * age) );
              #else
                //Default: Billboard_to_Local_Z and other modes inherit rotation from modelMatrix
                gl_Position = projectionMatrix * modelViewMatrix * ( vec4(newPos, 1.0) * rotationZ(rotate * age) );
              #endif
            #endif
            #endif
          #endif
          #endif
        #endif
      #endif

      ${THREE.ShaderChunk[ "logdepthbuf_vertex" ]}

    }
  `;

    this.fragment = `
    precision highp float;
    uniform sampler2D map;
    uniform float parentAlpha;

    #ifdef TINTED
      uniform vec3 tintColor;
    #endif

    #ifdef DEPTH_TEXTURE
      uniform sampler2D tDepth;
      uniform vec2 resolution;
      uniform float softFactor;
    #endif

    varying vec4 vSpriteSheet;
    varying vec3 colorMixed;
    varying float alpha;
    varying vec2 vUv;

    ${THREE.ShaderChunk[ "logdepthbuf_pars_fragment" ]}

    void main() {

      vec2 uvTransform;

      #ifdef POINTS
        vec2 vUv_points = vec2( gl_PointCoord.x, gl_PointCoord.y );
        uvTransform = vec2( (vUv_points.x * vSpriteSheet.x + vSpriteSheet.z), 
          1.0 - (vUv_points.y * vSpriteSheet.y + vSpriteSheet.w)
        );
      #else
        uvTransform = vec2( (vUv.x * vSpriteSheet.x + vSpriteSheet.z), 
          1.0 - (vUv.y * vSpriteSheet.y + vSpriteSheet.w)
        );
      #endif

      vec4 textureColor = texture2D(map, uvTransform);
      float finalAlpha = textureColor.w * alpha * parentAlpha;

      #ifdef DEPTH_TEXTURE
        float sceneDepth = texture2D(tDepth, gl_FragCoord.xy / resolution).r;
        // Match logarithmicDepthBuffer encoding written into DepthTexture
        float particleDepth = gl_FragCoord.z;
        #if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
          particleDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
        #endif
        float fade = clamp((sceneDepth - particleDepth) * softFactor, 0.0, 1.0);
        finalAlpha *= fade;
      #endif

      vec3 finalColor = colorMixed * textureColor.xyz;

      #ifdef TINTED
        finalColor *= tintColor;
      #endif

      gl_FragColor = vec4( finalColor, finalAlpha);

      ${THREE.ShaderChunk[ "logdepthbuf_fragment" ]}

    }
  `;

  }

}
