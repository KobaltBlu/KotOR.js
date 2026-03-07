import * as THREE from "three";
import { Shader } from "./Shader";

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
      { mass: { value: new THREE.Vector3(0, 0, 0) } },
      { matrix: { value: new THREE.Matrix4() } },
      { rotate: { value: 0 } },
      { drag: { value: 0 } },
      { velocity: { value: 0 } },
      { randVelocity: { value: 0 } },
      { time: { value: 0.0 } },
      { fps: { value: 0.0 } },
      { maxAge: { value: 1.0 } }
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
    uniform vec3 mass;
    uniform vec3 colorStart;
    uniform vec3 colorMid;
    uniform vec3 colorEnd;
    uniform mat4 matrix;

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
      float fIndex = 0.0;
      float shouldApplyValue = 0.0;

      // This might look a little odd, but it's faster in the testing I've done than using branches.
      // Uses basic maths to avoid branching.
      //
      // Take a look at the branch-avoidance functions defined above,
      // and be sure to check out The Orange Duck site where I got this
      // from (link above).

      // Fix for static emitters (age is always zero).
      value += attr[ 0 ] * when_eq( deltaAge, 0.0 );
  
      for( int i = 0; i < 3 - 1; ++i ) {
        fIndex = float( i );
        shouldApplyValue = and( when_gt( deltaAge, fIndex ), when_le( deltaAge, fIndex + 1.0 ) );
        value += shouldApplyValue * mix( attr[ i ], attr[ i + 1 ], deltaAge - fIndex );
      }
  
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
      //Math.floor((this.currentDisplayTime * this.numberOfTiles) % this.numberOfTiles)
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

      //Get the color value to send to the fagment shader
      colorMixed = getColorOverLifetime(positionInTime, colorStart, colorMid, colorEnd);

      //Get the alpha value to send to the fragment shader
      alpha = getFloatOverLifetime( positionInTime, vec3( opacity.x, opacity.y, opacity.z ) ) * alive;
      if(maxAge == -1.0){
        positionInTime = 1.0;
      }

      //Get the current scale of the particle
      float scaleF = getFloatOverLifetime( positionInTime, vec3( scale.x, scale.y, scale.z ) );

      #ifdef POINTS

        //Override the modelViewMatrix so we can ignore preset rotation's (That way the plane will lay flat on the ground)
        mat4 worldZMatrix = viewMatrix * mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);

        //Points mode renders particles always facing the camera
        vec3 newPos = position + force;
        vec4 mvPos = worldZMatrix * vec4( newPos, 1.0);

        //Copy over the positions from the previous modelViewMatrix
        //worldZMatrix[3][0] = modelViewMatrix[3][0] -  newPos.x;
        //worldZMatrix[3][1] = modelViewMatrix[3][1] -  newPos.y;
        //worldZMatrix[3][2] = modelViewMatrix[3][2] -  newPos.z;

        gl_PointSize = (scaleF*2000.0) / length( mvPos.xyz );
        gl_Position = projectionMatrix * worldZMatrix * (vec4(newPos, 1.0));// * rotationZ(rotate * positionInTime) );
      #else
        #ifdef LINKED
          #ifdef LIGHTNING
            //Override the modelViewMatrix so we can ignore preset rotation's (That way the plane will lay flat on the ground)
            mat4 worldZMatrix = viewMatrix * mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, vec4(0.0, 0.0, 0.0, 1.0));

            //Copy over the positions from the previous modelViewMatrix
            //worldZMatrix[3][0] = viewMatrix[3][0] + position.x;
            //worldZMatrix[3][1] = viewMatrix[3][1] + position.y;
            //worldZMatrix[3][2] = viewMatrix[3][2] + position.z;
            gl_Position = projectionMatrix * worldZMatrix * vec4(position, 1.0);
          #else
            //Override the modelViewMatrix so we can ignore preset rotation's (That way the plane will lay flat on the ground)
            mat4 worldZMatrix = viewMatrix * mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, vec4(0.0, 0.0, 0.0, 1.0));

            //Copy over the positions from the previous modelViewMatrix
            //worldZMatrix[3][0] = viewMatrix[3][0] + position.x;
            //worldZMatrix[3][1] = viewMatrix[3][1] + position.y;
            //worldZMatrix[3][2] = viewMatrix[3][2] + position.z;
            gl_Position = projectionMatrix * worldZMatrix * vec4(position + (offset * scaleF), 1.0);
          #endif
        #else
          //Render particles as plane geometry so we can control it's rotation
          #ifdef Aligned_to_Particle_Dir
            vec4 vertex = vec4( position, 1.0 ) * matrix;
            vec3 newPos = offset + (vertex.xyz * scaleF);
            gl_Position = projectionMatrix * modelViewMatrix * ( vec4(newPos, 1.0));
          #else
            vec3 newPos = (offset) + (position * scaleF) + force;
            #ifdef Billboard_to_World_Z
              //Override the modelViewMatrix so we can ignore preset rotation's (That way the plane will lay flat on the ground)
              mat4 worldZMatrix = viewMatrix * mat4(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0);

              //Copy over the positions from the previous modelViewMatrix
              worldZMatrix[3][0] = modelViewMatrix[3][0];
              worldZMatrix[3][1] = modelViewMatrix[3][1];
              worldZMatrix[3][2] = modelViewMatrix[3][2];

              gl_Position = projectionMatrix * worldZMatrix * ( vec4(newPos, 1.0) * rotationZ(rotate * positionInTime) );
            #else
              //Nothing needs to change here as the plane will inherit it's rotation from the modelMatrix
              gl_Position = projectionMatrix * modelViewMatrix * ( vec4(newPos, 1.0) * rotationZ(rotate * positionInTime) );
            #endif
          #endif
        #endif
      #endif

    }
  `;

    this.fragment = `
    precision highp float;
    uniform sampler2D map;
    varying vec4 vSpriteSheet;
    varying vec3 colorMixed;
    varying float alpha;
    varying vec2 vUv;

    void main() {

      //float framesX = vSpriteSheet.x;
      //float framesY = vSpriteSheet.y;
      //float columnNorm = vSpriteSheet.z;
      //float rowNorm = vSpriteSheet.w;

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
      gl_FragColor = vec4( colorMixed * textureColor.xyz, textureColor.w * alpha);

    }
  `;

  }

}