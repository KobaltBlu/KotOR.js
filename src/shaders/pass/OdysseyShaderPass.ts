
import * as THREE from "three";
import { Pass, FullScreenQuad } from "three/examples/jsm/postprocessing/Pass";
import { OdysseyShader } from "./OdysseyShader";

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

	}

	render( renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget, deltaTime: number /*, maskActive */ ) {

		this.uniforms[ 'tDiffuse' ].value = readBuffer.texture;
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

		}

	}

	dispose() {

		this.material.dispose();

		this.fsQuad.dispose();

	}

	setOdysseyVideoEffect(effect: any = undefined){
		let enabled = false;
		if(effect){
      if(parseInt(effect.enablesaturation)){
        this.uniforms.saturation.value = parseFloat(typeof effect.saturation != 'undefined' ? effect.saturation : effect.saturation_pc);
        this.uniforms.modulation.value.set(
          parseFloat(typeof effect.modulationred != 'undefined' ? effect.modulationred : effect.modulationred_pc),
          parseFloat(typeof effect.modulationgreen != 'undefined' ? effect.modulationgreen : effect.modulationgreen_pc),
          parseFloat(typeof effect.modulationblue != 'undefined' ? effect.modulationblue : effect.modulationblue_pc)
        );
        this.uniforms.bmodulate.value = true;
				enabled = true;
      }else{
        this.uniforms.bmodulate.value = false;
        this.uniforms.saturation.value = 1;
        this.uniforms.modulation.value.set(1, 1, 1);
      }

      if(parseInt(effect.enablescannoise)){
				this.uniforms.bscanlines.value = true;
        this.uniforms.grayscale.value = true;
        this.uniforms.sCount.value = (Math.floor(Math.random() * 256) + 250)*0.5;
				enabled = true;
      }else{
				this.uniforms.bscanlines.value = false;
        this.uniforms.grayscale.value = false;
      }
		}else{
			//saturation/modulation pass
			this.uniforms.bmodulate.value = false;

			//film pass
			this.uniforms.bscanlines.value = false;
			this.uniforms.grayscale.value = false;
		}
		this.enabled = enabled;
	}

}
