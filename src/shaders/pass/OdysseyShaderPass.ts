
import * as THREE from "three";
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass";
import { OdysseyShader } from "@/shaders/pass/OdysseyShader";

//Extend the default THREE.FilmPass shader pass

/**
 * OdysseyShaderPass class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file OdysseyShaderPass.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class OdysseyShaderPass extends Pass {

  uniforms: { [uniform: string]: THREE.IUniform<any>; };
  material: THREE.ShaderMaterial;
  fsQuad: FullScreenQuad;
  historyRenderTarget: THREE.WebGLRenderTarget;
  historyCopyMaterial: THREE.ShaderMaterial;
  historyCopyQuad: FullScreenQuad;
  historyReady: boolean;

	constructor() {

		super();

		const shader = OdysseyShader;

		this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

		this.material = new THREE.ShaderMaterial( {
			uniforms: this.uniforms,
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader
		} );

		this.fsQuad = new FullScreenQuad( this.material );
		this.historyRenderTarget = new THREE.WebGLRenderTarget( 1, 1, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			depthBuffer: false,
			stencilBuffer: false,
		} );
		this.historyRenderTarget.texture.generateMipmaps = false;
		this.historyCopyMaterial = new THREE.ShaderMaterial( {
			uniforms: {
				tDiffuse: { value: null },
			},
			vertexShader: /* glsl */ `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}
			`,
			fragmentShader: /* glsl */ `
				uniform sampler2D tDiffuse;
				varying vec2 vUv;
				void main() {
					gl_FragColor = texture2D( tDiffuse, vUv );
				}
			`,
		} );
		this.historyCopyQuad = new FullScreenQuad( this.historyCopyMaterial );
		this.historyReady = false;

	}

	ensureHistoryTargetSize( width: number, height: number ) {
		const safeWidth = Math.max( 1, width | 0 );
		const safeHeight = Math.max( 1, height | 0 );
		if ( this.historyRenderTarget.width !== safeWidth || this.historyRenderTarget.height !== safeHeight ) {
			this.historyRenderTarget.setSize( safeWidth, safeHeight );
			this.historyReady = false;
		}
	}

	resetHistory() {
		this.historyReady = false;
	}

	render( renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number /*, maskActive */ ) {

		this.ensureHistoryTargetSize( readBuffer.width || 1, readBuffer.height || 1 );

		this.uniforms[ 'tDiffuse' ].value = readBuffer.texture;
		this.uniforms[ 'tPreviousFrame' ].value = this.historyReady ? this.historyRenderTarget.texture : readBuffer.texture;
		this.uniforms[ 'resolution' ].value.set( readBuffer.width || 1, readBuffer.height || 1 );
		this.uniforms[ 'time' ].value += deltaTime;
		this.fsQuad.material = this.material;

		if ( this.renderToScreen ) {

			renderer.setRenderTarget( null );
			this.fsQuad.render( renderer );

		} else {

			renderer.setRenderTarget( writeBuffer );
			// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
			if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
			this.fsQuad.render( renderer );

			this.historyCopyMaterial.uniforms[ 'tDiffuse' ].value = writeBuffer.texture;
			renderer.setRenderTarget( this.historyRenderTarget );
			renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
			this.historyCopyQuad.render( renderer );
			this.historyReady = true;

		}

	}

	dispose() {

		this.material.dispose();
		this.historyCopyMaterial.dispose();
		this.historyRenderTarget.dispose();

		this.fsQuad.dispose();
		this.historyCopyQuad.dispose();

	}
}
