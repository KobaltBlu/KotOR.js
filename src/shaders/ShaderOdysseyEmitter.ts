import * as THREE from 'three';
import { Shader } from '@/shaders/Shader';

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
  constructor() {
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
    #ifdef Motion_Blur
      uniform float blurLength;
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

    ${THREE.ShaderChunk['common']}
    ${THREE.ShaderChunk['logdepthbuf_pars_vertex']}

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
      highp float value = 0.0;
      float deltaAge = mod(positionInTime * ( 3.0 - 1.0 ), 1.0);

      // Fix for static emitters (age is always zero).
      value += attr.x * when_eq( deltaAge, 0.0 );

      // Unrolled loop (was i=0..1) to avoid dynamic vec3 indexing
      // which triggers ANGLE/DirectX "potentially uninitialized variable" warnings.
      // i = 0: interpolate attr.x -> attr.y
      float shouldApply0 = and( when_gt( deltaAge, 0.0 ), when_le( deltaAge, 1.0 ) );
      value += shouldApply0 * mix( attr.x, attr.y, deltaAge );
      // i = 1: interpolate attr.y -> attr.z
      float shouldApply1 = and( when_gt( deltaAge, 1.0 ), when_le( deltaAge, 2.0 ) );
      value += shouldApply1 * mix( attr.y, attr.z, deltaAge - 1.0 );

      return value;
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
      vec3 vel   = vec3(velocity.xyz) * age;
      vec3 accel = mass;

      force += vel;
      force *= 1.0 - (positionInTime * 0.5) * drag;
      force += accel * (age*5.0);

      //SpriteSheet Calculations
      float framesX = textureAnimation.x;
      float framesY = textureAnimation.y;
      float loopCount = textureAnimation.w;
      float totalFrames = textureAnimation.z;

      #ifdef FPS
        float deltaMax = (1.0 / fps) * totalFrames;
        float fTime = mod(time, deltaMax) / deltaMax;
        float frameNumber = mod( fTime * totalFrames, totalFrames );
      #else
        float frameNumber = mod( positionInTime * totalFrames, totalFrames );
      #endif
      
      #ifdef Aligned_to_Particle_Dir
       frameNumber = mod( ids * totalFrames, totalFrames );
      #endif

      #ifdef RANDOM_PLAYBACK
        frameNumber = mod( frameNumber + ids * 7.31, totalFrames );
      #endif

      // Clamp frame when loop is disabled (Single update emitters)
      if(loopCount < 1.0 && frameNumber > totalFrames - 1.0) {
        frameNumber = totalFrames - 1.0;
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
        vec3 newPos = position + force;
        vec4 mvPos = worldZMatrix * vec4( newPos, 1.0);

        gl_PointSize = (scaleF*2000.0) / length( mvPos.xyz );
        gl_Position = projectionMatrix * worldZMatrix * (vec4(newPos, 1.0));
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
          //Render particles as plane geometry so we can control it's rotation
          #ifdef Aligned_to_Particle_Dir
            vec4 vertex = vec4( position, 1.0 ) * matrix;
            vec3 newPos = offset + (vertex.xyz * scaleF);
            gl_Position = projectionMatrix * modelViewMatrix * ( vec4(newPos, 1.0));
          #else
            // Apply non-square scaling to quad vertices
            vec3 scaledPos = vec3(position.x * scaleF, position.y * scaleFY, position.z);
            vec3 newPos = (offset) + scaledPos + force;

            #ifdef Motion_Blur
              // Stretch quad along velocity direction
              vec3 velDir = normalize(velocity.xyz + vec3(0.0001));
              float stretch = length(velocity.xyz) * blurLength;
              newPos += velDir * (dot(scaledPos, velDir) * stretch);
            #endif

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

      ${THREE.ShaderChunk['logdepthbuf_vertex']}

    }
  `;

    this.fragment = `
    precision highp float;
    uniform sampler2D map;

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

    ${THREE.ShaderChunk['logdepthbuf_pars_fragment']}

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
      float finalAlpha = textureColor.w * alpha;

      #ifdef DEPTH_TEXTURE
        float sceneDepth = texture2D(tDepth, gl_FragCoord.xy / resolution).r;
        float particleDepth = gl_FragCoord.z;
        float fade = clamp((sceneDepth - particleDepth) * softFactor, 0.0, 1.0);
        finalAlpha *= fade;
      #endif

      vec3 finalColor = colorMixed * textureColor.xyz;

      #ifdef TINTED
        finalColor *= tintColor;
      #endif

      gl_FragColor = vec4( finalColor, finalAlpha);

      ${THREE.ShaderChunk['logdepthbuf_fragment']}

    }
  `;
  }
}
