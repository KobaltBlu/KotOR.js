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
    'saturation': { value: 1.0 },
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
    varying vec2 vUv;
    uniform float saturation;
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

      //modulation effect
      if(bmodulate){
        vec3 lumaWeights = vec3(.25,.50,.25);
        vec3 grey = vec3( dot( lumaWeights, cResult.rgb ) );
        cResult.rgb = modulation * ( grey + saturation * (cResult.rgb - grey) );
      }

      gl_FragColor = vec4( cResult, cTextureScreen.a );
    }`
};
