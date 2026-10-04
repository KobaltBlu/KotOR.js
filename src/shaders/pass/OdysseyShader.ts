import * as THREE from 'three';

interface OdysseyShader {
  uniforms: { [uniform: string]: THREE.IUniform<any>; },
  vertexShader: string;
  fragmentShader: string;
}

export const OdysseyShader: OdysseyShader = {
  uniforms: {
    //Saturation/Modulation
    'tDiffuse': { value: null },
    'tPreviousFrame': { value: null },
    'resolution': new THREE.Uniform( new THREE.Vector2(1, 1) ),
    'saturation': { value: 1.0 },
    'blurStrength': { value: 0.0 },
    'blurDirection': new THREE.Uniform( new THREE.Vector2(0, 0) ),
    'modulation': new THREE.Uniform( new THREE.Vector3(1, 1, 1) ),

    //FilmPass
		'time': { value: 0.0 },
		'nIntensity': { value: 1 },
		'sIntensity': { value: 0.325 },
		'sCount': { value: 512 },

    //booleans
		'grayscale': { value: 1 },
		'bscanlines': { value: 0 },
		'bmodulate': { value: 0 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,

  fragmentShader: /* glsl */ `
    #include <common>

    uniform sampler2D tDiffuse;
    uniform sampler2D tPreviousFrame;
    varying vec2 vUv;
    uniform vec2 resolution;
    uniform float saturation;
    uniform float blurStrength;
    uniform vec2 blurDirection;
    uniform vec3 modulation;

		// control parameter
		uniform float time;
		uniform bool grayscale;
		uniform bool bscanlines;
		uniform bool bmodulate;

		// noise effect intensity value (0 = no effect, 1 = full effect)
		uniform float nIntensity;

		// scanlines effect intensity value (0 = no effect, 1 = full effect)
		uniform float sIntensity;

		// scanlines effect count value (0 = no effect, 4096 = full effect)
		uniform float sCount;

		void main() {
      // sample the source
      vec4 cTextureScreen = texture2D( tDiffuse, vUv );
      vec3 cResult = vec3(cTextureScreen.rgb);

      if( bscanlines ){
        // make some noise
        float dx = rand( vUv + time );

        // add noise
        cResult = cTextureScreen.rgb + cTextureScreen.rgb * clamp( 0.1 + dx, 0.0, 1.0 );

        // get us a sine and cosine
        vec2 sc = vec2( sin( vUv.y * sCount ), cos( vUv.y * sCount ) );

        // add scanlines
        cResult += cTextureScreen.rgb * vec3( sc.x, sc.y, sc.x ) * sIntensity;

        // interpolate between source and result by intensity
        cResult = cTextureScreen.rgb + clamp( nIntensity, 0.0,1.0 ) * ( cResult - cTextureScreen.rgb );

        // convert to grayscale if desired
        if( grayscale ) {
          cResult = vec3( cResult.r * 0.3 + cResult.g * 0.59 + cResult.b * 0.11 );
        }
      }

      float blurAmount = clamp( blurStrength, 0.0, 1.0 );
      if( blurAmount > 0.0 ){
        vec2 centeredUv = ( vUv - vec2( 0.5 ) ) * 2.0;
        float edgeDistance = length( centeredUv );
        float edgeMask = smoothstep( 0.18, 0.95, edgeDistance );
        float edgeBoost = min( edgeMask * 2.0, 1.0 );

        vec3 previousFrame = texture2D( tPreviousFrame, vUv ).rgb;
        float historyMix = blurAmount * 0.45 * edgeBoost;
        cResult = mix( cResult, previousFrame, historyMix );

        vec2 smearDir = blurDirection * blurAmount * ( 0.4 + edgeBoost * 0.6 );
        if( dot( smearDir, smearDir ) > 0.0 ){
          vec3 smeared = cResult * 0.34;
          smeared += texture2D( tDiffuse, vUv + smearDir * 0.5 ).rgb * 0.22;
          smeared += texture2D( tDiffuse, vUv + smearDir * 1.0 ).rgb * 0.18;
          smeared += texture2D( tDiffuse, vUv + smearDir * 1.5 ).rgb * 0.14;
          smeared += texture2D( tDiffuse, vUv - smearDir * 0.5 ).rgb * 0.07;
          smeared += texture2D( tDiffuse, vUv - smearDir * 1.0 ).rgb * 0.05;
          cResult = mix( cResult, smeared, clamp( blurAmount * 0.95 * edgeBoost, 0.0, 1.0 ) );
        }
      }

      //modulation effect
      if(bmodulate){
        vec3 lumaWeights = vec3(.25,.50,.25);
        vec3 grey = vec3( dot( lumaWeights, cResult.rgb ) );
        cResult.rgb = modulation * ( grey + saturation * (cResult.rgb - grey) );
      }

      gl_FragColor = vec4( cResult, cTextureScreen.a );
    }`
};
